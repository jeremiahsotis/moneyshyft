import type { Knex } from 'knex';
import {
  evaluateSharedIntakePolicy,
  normalizeRouteScheduleMode,
  RouteIntakeChannel,
  RouteIntakePayload,
  RouteScheduleMode,
} from '../domain/intakePolicy';
import { CommitmentService } from './commitmentService';
import {
  IntakeRequestRepository,
  KnexIntakeRequestRepository,
  ListUnresolvedIntakeInput,
  RouteIntakeRecord,
} from '../infrastructure/intakeRequestRepository';
import type { RouteRequestLifecycleStatus } from '../domain/requestLifecycle';
import routeDb from '../../../config/knex';

const CHANNEL_RESPONSE_CODES = {
  donor: {
    accepted: 'MONEYSHYFT_DONOR_INTAKE_ACCEPTED',
    refused: 'MONEYSHYFT_DONOR_INTAKE_REFUSED',
    linked: 'MONEYSHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
  },
  cashier: {
    accepted: 'MONEYSHYFT_CASHIER_INTAKE_ACCEPTED',
    refused: 'MONEYSHYFT_CASHIER_INTAKE_REFUSED',
    linked: 'MONEYSHYFT_CASHIER_INTAKE_COMMITMENT_LINKED',
  },
} as const;

type IntakeRefusalType = 'business' | 'client' | 'security';

type IntakeSuccess<TData> = {
  ok: true;
  code: string;
  message: string;
  httpStatus: number;
  data: TData;
};

type IntakeRefusal = {
  ok: false;
  code: string;
  message: string;
  refusalType: IntakeRefusalType;
  httpStatus: number;
  data?: unknown;
};

export type SubmitIntakeInput = {
  tenantId: string;
  orgUnitId: string;
  actorId: string | null;
  channel: RouteIntakeChannel;
  payload: RouteIntakePayload;
};

export type ResolveIntakeInput = {
  tenantId: string;
  orgUnitId: string;
  requestId: string;
  channel: RouteIntakeChannel;
};

export type ListUnresolvedRequestsInput = {
  tenantId: string;
  orgUnitId: string | null;
  staleMinutes?: number;
};

export type SubmitIntakeResult =
  | IntakeSuccess<{
    requestId: string;
    commitmentId: string;
    status: 'Accepted';
    scheduleMode: RouteScheduleMode;
    availableSlots: string[];
  }>
  | IntakeRefusal;

export type ResolveIntakeResult =
  | IntakeSuccess<{
    requestId: string;
    commitmentId: string | null;
    status: 'Accepted' | 'Refused';
    requestLifecycleStatus: RouteRequestLifecycleStatus;
    commitmentLifecycleStatus: string | null;
    refusal: RouteIntakeRecord['refusal'];
    scheduleMode: RouteScheduleMode;
  }>
  | IntakeRefusal;

export type ListUnresolvedRequestsResult = IntakeSuccess<{
  generatedAtUtc: string;
  staleThresholdMinutes: number;
  guardrailStatus: 'clear' | 'action_required';
  items: Array<{
    requestId: string;
    channel: RouteIntakeChannel;
    status: RouteIntakeRecord['status'];
    requestLifecycleStatus: RouteRequestLifecycleStatus;
    commitmentId: string | null;
    issueCode: 'MONEYSHYFT_REQUEST_TERMINAL_STATE_MISSING';
    issueSummary: string;
    stale: boolean;
    updatedAtUtc: string;
    reconciliationActions: string[];
  }>;
}>;

const normalizeNonEmpty = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const refusal = (
  code: string,
  message: string,
  refusalType: IntakeRefusalType = 'business',
  httpStatus = 200,
  data?: unknown,
): IntakeRefusal => ({
  ok: false,
  code,
  message,
  refusalType,
  httpStatus,
  data,
});

const mapDetailCode = (channel: RouteIntakeChannel, record: RouteIntakeRecord): string => {
  if (record.status === 'Accepted') {
    return CHANNEL_RESPONSE_CODES[channel].linked;
  }

  return CHANNEL_RESPONSE_CODES[channel].refused;
};

const LINKAGE_CANCELLED_REASON_CODE = 'MONEYSHYFT_INTAKE_LINKAGE_CANCELLED';

type LinkageCancellationInput = {
  tenantId: string;
  orgUnitId: string;
  actorId: string | null;
  channel: RouteIntakeChannel;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  scheduleMode: RouteScheduleMode;
  notes: string;
  responseCode: string;
  linkageErrorCode: string;
  linkageErrorMessage: string;
  dbClient?: Knex | Knex.Transaction;
};

type TransactionExecutor = <T>(
  handler: (trx: Knex.Transaction) => Promise<T>,
) => Promise<T>;

export class IntakeService {
  constructor(
    private readonly commitmentService: CommitmentService,
    private readonly requestRepository: IntakeRequestRepository = new KnexIntakeRequestRepository(),
    private readonly transactionExecutor: TransactionExecutor = async (handler) => routeDb.transaction(handler),
  ) {}

  private supportsAtomicLinkageTransaction(): boolean {
    return this.requestRepository instanceof KnexIntakeRequestRepository
      && this.commitmentService.supportsExternalTransaction();
  }

  private async createLinkageCancellationRefusal(
    input: LinkageCancellationInput,
  ): Promise<IntakeRefusal> {
    const commitmentRefusalRecord = await this.requestRepository.createRefused({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      channel: input.channel,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      scheduleMode: input.scheduleMode,
      notes: input.notes,
      refusal: {
        reasonCode: LINKAGE_CANCELLED_REASON_CODE,
        message: 'Commitment linkage could not be completed and intake was cancelled.',
        alternatives: [
          'Retry commitment linkage once persistence is available',
          'Escalate unresolved intake for operator reconciliation',
        ],
        nextSteps: `Linkage failure [${input.linkageErrorCode}]: ${input.linkageErrorMessage}`,
      },
      createdByUserId: input.actorId,
    }, input.dbClient);

    return refusal(
      input.responseCode,
      'Intake was cancelled because commitment linkage could not be completed.',
      'business',
      200,
      {
        requestId: commitmentRefusalRecord.requestId,
        status: commitmentRefusalRecord.status,
        alternatives: commitmentRefusalRecord.refusal?.alternatives || [],
        nextSteps: commitmentRefusalRecord.refusal?.nextSteps || null,
        reasonCode: commitmentRefusalRecord.refusal?.reasonCode || LINKAGE_CANCELLED_REASON_CODE,
        linkageErrorCode: input.linkageErrorCode,
      },
    );
  }

  async submitIntake(input: SubmitIntakeInput): Promise<SubmitIntakeResult> {
    const policyDecision = evaluateSharedIntakePolicy(input.payload);
    const responseCodes = CHANNEL_RESPONSE_CODES[input.channel];

    if (!policyDecision.ok) {
      const refusedRecord = await this.requestRepository.createRefused({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        channel: input.channel,
        requestedAtUtc: normalizeNonEmpty(input.payload.requestedAtUtc),
        requestedWindowStartUtc: normalizeNonEmpty(input.payload.requestedWindowStartUtc),
        requestedWindowEndUtc: normalizeNonEmpty(input.payload.requestedWindowEndUtc),
        scheduleMode: normalizeRouteScheduleMode(input.payload.scheduleMode),
        notes: normalizeNonEmpty(input.payload.notes),
        refusal: policyDecision.refusal,
        createdByUserId: input.actorId,
      });

      return refusal(
        responseCodes.refused,
        policyDecision.refusal.message,
        'business',
        200,
        {
          requestId: refusedRecord.requestId,
          status: refusedRecord.status,
          alternatives: policyDecision.refusal.alternatives,
          nextSteps: policyDecision.refusal.nextSteps,
          reasonCode: policyDecision.refusal.reasonCode,
        },
      );
    }

    const persistWithLinkage = async (
      dbClient?: Knex | Knex.Transaction,
    ): Promise<SubmitIntakeResult> => {
      const commitmentResult = await this.commitmentService.createCommitment({
        tenantId: input.tenantId,
        actorId: input.actorId,
        sourceType: 'route_intake_request',
        sourceId: `${input.channel}:${policyDecision.normalized.requestedAtUtc}`,
        orgUnitId: input.orgUnitId,
        externalRef: input.channel,
        dbClient,
      });

      if (!commitmentResult.ok) {
        return this.createLinkageCancellationRefusal({
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId,
          actorId: input.actorId,
          channel: input.channel,
          requestedAtUtc: policyDecision.normalized.requestedAtUtc,
          requestedWindowStartUtc: policyDecision.normalized.requestedWindowStartUtc,
          requestedWindowEndUtc: policyDecision.normalized.requestedWindowEndUtc,
          scheduleMode: policyDecision.normalized.scheduleMode,
          notes: policyDecision.normalized.notes,
          responseCode: responseCodes.refused,
          linkageErrorCode: commitmentResult.code,
          linkageErrorMessage: commitmentResult.message,
          dbClient,
        });
      }

      const acceptedRecord = await this.requestRepository.createAccepted({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        channel: input.channel,
        requestedAtUtc: policyDecision.normalized.requestedAtUtc,
        requestedWindowStartUtc: policyDecision.normalized.requestedWindowStartUtc,
        requestedWindowEndUtc: policyDecision.normalized.requestedWindowEndUtc,
        scheduleMode: policyDecision.normalized.scheduleMode,
        notes: policyDecision.normalized.notes,
        commitmentId: commitmentResult.data.commitment.commitmentId,
        createdByUserId: input.actorId,
      }, dbClient);

      return {
        ok: true,
        code: responseCodes.accepted,
        message: 'Intake accepted and commitment linked.',
        httpStatus: 200,
        data: {
          requestId: acceptedRecord.requestId,
          commitmentId: acceptedRecord.commitmentId || '',
          status: 'Accepted',
          scheduleMode: acceptedRecord.scheduleMode,
          availableSlots: policyDecision.availableSlots,
        },
      };
    };

    if (this.supportsAtomicLinkageTransaction()) {
      return this.transactionExecutor(async (trx) => persistWithLinkage(trx));
    }

    return persistWithLinkage();
  }

  async resolveIntake(input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    const record = await this.requestRepository.getById(input.tenantId, input.orgUnitId, input.requestId);
    if (!record || record.channel !== input.channel) {
      return refusal(
        'MONEYSHYFT_INTAKE_REQUEST_NOT_FOUND',
        'Intake request not found for active tenant.',
        'business',
        200,
      );
    }

    let commitmentLifecycleStatus: string | null = null;
    if (record.commitmentId) {
      const linkedCommitment = await this.commitmentService.resolveCommitment({
        tenantId: input.tenantId,
        commitmentId: record.commitmentId,
      });

      if (linkedCommitment.ok) {
        commitmentLifecycleStatus = linkedCommitment.data.commitment.status;
      }
    }

    return {
      ok: true,
      code: mapDetailCode(input.channel, record),
      message: record.status === 'Accepted'
        ? 'Intake request resolved with linked commitment.'
        : 'Intake request resolved with refusal outcome.',
      httpStatus: 200,
      data: {
        requestId: record.requestId,
        commitmentId: record.commitmentId,
        status: record.status,
        requestLifecycleStatus: record.requestLifecycleStatus,
        commitmentLifecycleStatus,
        refusal: record.refusal,
        scheduleMode: record.scheduleMode,
      },
    };
  }

  async listUnresolvedRequests(input: ListUnresolvedRequestsInput): Promise<ListUnresolvedRequestsResult> {
    const staleThresholdMinutes = Number.isInteger(input.staleMinutes) && (input.staleMinutes as number) > 0
      ? Math.min(input.staleMinutes as number, 24 * 60)
      : 30;
    const generatedAtUtc = new Date().toISOString();
    const staleBeforeUtc = new Date(
      new Date(generatedAtUtc).getTime() - (staleThresholdMinutes * 60 * 1000),
    ).toISOString();

    const queryInput: ListUnresolvedIntakeInput = {
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
    };

    const unresolvedRecords = await this.requestRepository.listUnresolved(queryInput);
    const staleBeforeMillis = new Date(staleBeforeUtc).getTime();

    const items = unresolvedRecords.map((record) => {
      const updatedAtMillis = new Date(record.updatedAtUtc).getTime();
      const stale = Number.isNaN(updatedAtMillis) ? true : updatedAtMillis <= staleBeforeMillis;

      return {
        requestId: record.requestId,
        channel: record.channel,
        status: record.status,
        requestLifecycleStatus: record.requestLifecycleStatus,
        commitmentId: record.commitmentId,
        issueCode: 'MONEYSHYFT_REQUEST_TERMINAL_STATE_MISSING' as const,
        issueSummary: 'Request has not reached a valid terminal lifecycle state.',
        stale,
        updatedAtUtc: record.updatedAtUtc,
        reconciliationActions: [
          'Link request to a valid commitment or record explicit cancellation/refusal.',
          'Reprocess intake if linkage prerequisites were missing at submission time.',
        ],
      };
    });

    return {
      ok: true,
      code: 'MONEYSHYFT_INTAKE_RECONCILIATION_QUEUE',
      message: 'Reconciliation queue generated for unresolved intake requests.',
      httpStatus: 200,
      data: {
        generatedAtUtc,
        staleThresholdMinutes,
        guardrailStatus: items.length > 0 ? 'action_required' : 'clear',
        items,
      },
    };
  }
}
