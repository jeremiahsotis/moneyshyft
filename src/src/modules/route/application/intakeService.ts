import {
  evaluateSharedIntakePolicy,
  RouteIntakeChannel,
  RouteIntakePayload,
  RouteScheduleMode,
} from '../domain/intakePolicy';
import { CommitmentService } from './commitmentService';
import {
  InMemoryIntakeRequestRepository,
  IntakeRequestRepository,
  RouteIntakeRecord,
} from '../infrastructure/intakeRequestRepository';

const CHANNEL_RESPONSE_CODES = {
  donor: {
    accepted: 'ROUTESHYFT_DONOR_INTAKE_ACCEPTED',
    refused: 'ROUTESHYFT_DONOR_INTAKE_REFUSED',
    linked: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
  },
  cashier: {
    accepted: 'ROUTESHYFT_CASHIER_INTAKE_ACCEPTED',
    refused: 'ROUTESHYFT_CASHIER_INTAKE_REFUSED',
    linked: 'ROUTESHYFT_CASHIER_INTAKE_COMMITMENT_LINKED',
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
  requestId: string;
  channel: RouteIntakeChannel;
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
    refusal: RouteIntakeRecord['refusal'];
    scheduleMode: RouteScheduleMode;
  }>
  | IntakeRefusal;

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

export class IntakeService {
  constructor(
    private readonly commitmentService: CommitmentService,
    private readonly requestRepository: IntakeRequestRepository = new InMemoryIntakeRequestRepository(),
  ) {}

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
        scheduleMode: 'delivery',
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

    const commitmentResult = await this.commitmentService.createCommitment({
      tenantId: input.tenantId,
      actorId: input.actorId,
      sourceType: 'route_intake_request',
      sourceId: `${input.channel}:${policyDecision.normalized.requestedAtUtc}`,
      orgUnitId: input.orgUnitId,
      externalRef: input.channel,
    });

    if (!commitmentResult.ok) {
      const commitmentRefusalRecord = await this.requestRepository.createRefused({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        channel: input.channel,
        requestedAtUtc: policyDecision.normalized.requestedAtUtc,
        requestedWindowStartUtc: policyDecision.normalized.requestedWindowStartUtc,
        requestedWindowEndUtc: policyDecision.normalized.requestedWindowEndUtc,
        scheduleMode: policyDecision.normalized.scheduleMode,
        notes: policyDecision.normalized.notes,
        refusal: {
          reasonCode: commitmentResult.code,
          message: commitmentResult.message,
          alternatives: [
            'Retry commitment linkage once persistence is available',
            'Switch to refusal path and communicate alternatives',
          ],
          nextSteps: 'Escalate to route operations and retry when linkage dependency recovers.',
        },
        createdByUserId: input.actorId,
      });

      return refusal(
        responseCodes.refused,
        'Intake was refused because commitment linkage could not be completed.',
        'business',
        200,
        {
          requestId: commitmentRefusalRecord.requestId,
          status: commitmentRefusalRecord.status,
          alternatives: commitmentRefusalRecord.refusal?.alternatives || [],
          nextSteps: commitmentRefusalRecord.refusal?.nextSteps || null,
          reasonCode: commitmentRefusalRecord.refusal?.reasonCode || commitmentResult.code,
        },
      );
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
    });

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
  }

  async resolveIntake(input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    const record = await this.requestRepository.getById(input.tenantId, input.requestId);
    if (!record || record.channel !== input.channel) {
      return refusal(
        'ROUTESHYFT_INTAKE_REQUEST_NOT_FOUND',
        'Intake request not found for active tenant.',
        'business',
        200,
      );
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
        refusal: record.refusal,
        scheduleMode: record.scheduleMode,
      },
    };
  }
}
