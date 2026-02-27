import {
  CommitmentService,
  CreateCommitmentCommand,
  CreateCommitmentResult,
} from '../commitmentService';
import { IntakeService } from '../intakeService';
import { InMemoryCommitmentRepository } from '../../infrastructure/commitmentRepository';
import {
  CreateAcceptedIntakeInput,
  CreateRefusedIntakeInput,
  InMemoryIntakeRequestRepository,
  KnexIntakeRequestRepository,
  ListUnresolvedIntakeInput,
} from '../../infrastructure/intakeRequestRepository';
import { RouteIntakePayload } from '../../domain/intakePolicy';
import type { RouteIntakeRecord } from '../../infrastructure/intakeRequestRepository';

const basePayload = (): RouteIntakePayload => ({
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  requestedAtUtc: '2026-02-26T14:00:00.000Z',
  requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
  requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
  channel: 'route-intake-test',
  notes: 'policy parity check',
  forceRefusal: false,
  scheduleMode: 'delivery',
});

class CommitmentAlwaysFailsService extends CommitmentService {
  async createCommitment(_input: CreateCommitmentCommand): Promise<CreateCommitmentResult> {
    return {
      ok: false,
      code: 'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE',
      message: 'Commitment persistence is unavailable. Retry after route schema migration.',
      refusalType: 'business',
      httpStatus: 200,
    };
  }
}

class TransactionAwareCommitmentService extends CommitmentService {
  readonly createCalls: CreateCommitmentCommand[] = [];

  override supportsExternalTransaction(): boolean {
    return true;
  }

  async createCommitment(input: CreateCommitmentCommand): Promise<CreateCommitmentResult> {
    this.createCalls.push(input);

    return {
      ok: true,
      code: 'ROUTE_COMMITMENT_CREATED',
      message: 'Commitment created',
      httpStatus: 201,
      data: {
        commitment: {
          commitmentId: 'commitment-atomic-1',
          tenantId: 'tenant-1',
          orgUnitId: 'org-1',
          sourceType: 'route_intake_request',
          sourceId: 'cashier:2026-02-26T14:00:00.000Z',
          externalRef: 'cashier',
          status: 'scheduled',
          createdByUserId: 'user-1',
          updatedByUserId: 'user-1',
          terminalAtUtc: null,
          terminalReason: null,
          createdAtUtc: '2026-02-26T14:00:00.000Z',
          updatedAtUtc: '2026-02-26T14:00:00.000Z',
        },
        state: {
          status: 'scheduled',
          label: 'Scheduled',
          terminal: false,
        } as never,
      },
    };
  }
}

class RecordingKnexIntakeRequestRepository extends KnexIntakeRequestRepository {
  readonly createAcceptedCalls: Array<{
    input: CreateAcceptedIntakeInput;
    dbClient?: unknown;
  }> = [];

  constructor() {
    super({
      withSchema: jest.fn(),
      fn: {
        now: () => new Date('2026-02-26T14:00:00.000Z'),
      },
    } as never);
  }

  override async createAccepted(
    input: CreateAcceptedIntakeInput,
    dbClient?: unknown,
  ): Promise<RouteIntakeRecord> {
    this.createAcceptedCalls.push({ input, dbClient });

    return {
      requestId: 'request-atomic-1',
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      channel: input.channel,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      scheduleMode: input.scheduleMode,
      notes: input.notes,
      status: 'Accepted',
      requestLifecycleStatus: 'committed',
      commitmentId: input.commitmentId,
      refusal: null,
      createdByUserId: input.createdByUserId,
      createdAtUtc: '2026-02-26T14:00:00.000Z',
      updatedAtUtc: '2026-02-26T14:00:00.000Z',
    };
  }

  override async createRefused(
    input: CreateRefusedIntakeInput,
    _dbClient?: unknown,
  ): Promise<RouteIntakeRecord> {
    return {
      requestId: 'request-refused-1',
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      channel: input.channel,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      scheduleMode: input.scheduleMode,
      notes: input.notes,
      status: 'Refused',
      requestLifecycleStatus: 'refused',
      commitmentId: null,
      refusal: input.refusal,
      createdByUserId: input.createdByUserId,
      createdAtUtc: '2026-02-26T14:00:00.000Z',
      updatedAtUtc: '2026-02-26T14:00:00.000Z',
    };
  }

  override async getById(
    _tenantId: string,
    _orgUnitId: string,
    _requestId: string,
    _dbClient?: unknown,
  ): Promise<RouteIntakeRecord | null> {
    return null;
  }

  override async listUnresolved(
    _input: ListUnresolvedIntakeInput,
    _dbClient?: unknown,
  ): Promise<RouteIntakeRecord[]> {
    return [];
  }
}

const unresolvedRecord = (): RouteIntakeRecord => ({
  requestId: 'request-unresolved-1',
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  channel: 'cashier',
  requestedAtUtc: '2026-02-26T14:00:00.000Z',
  requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
  requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
  scheduleMode: 'pickup',
  notes: 'unresolved linkage',
  status: 'Accepted',
  requestLifecycleStatus: 'pending',
  commitmentId: null,
  refusal: null,
  createdByUserId: 'user-ops-1',
  createdAtUtc: '2026-02-20T14:00:00.000Z',
  updatedAtUtc: '2026-02-20T14:00:00.000Z',
});

const thirtyMinutesAgoUtc = (): string => new Date(Date.now() - 30 * 60 * 1000).toISOString();

describe('route intake service', () => {
  it('accepts cashier intake and links to commitment', async () => {
    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    const requestRepository = new InMemoryIntakeRequestRepository();
    const service = new IntakeService(commitmentService, requestRepository);

    const result = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-1',
      channel: 'cashier',
      payload: basePayload(),
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_CASHIER_INTAKE_ACCEPTED',
      data: {
        requestId: expect.any(String),
        commitmentId: expect.any(String),
        status: 'Accepted',
      },
    });

    if (!result.ok) {
      throw new Error('Expected accepted intake result');
    }

    const resolved = await service.resolveIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      requestId: result.data.requestId,
      channel: 'cashier',
    });

    expect(resolved).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_CASHIER_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId: result.data.requestId,
        commitmentId: result.data.commitmentId,
        status: 'Accepted',
      },
    });
  });

  it('returns refusal alternatives for constrained scheduling', async () => {
    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    const service = new IntakeService(commitmentService, new InMemoryIntakeRequestRepository());

    const result = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-1',
      channel: 'cashier',
      payload: {
        ...basePayload(),
        requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
        requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
        forceRefusal: true,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ROUTESHYFT_CASHIER_INTAKE_REFUSED',
      refusalType: 'business',
      data: {
        alternatives: expect.any(Array),
        nextSteps: expect.any(String),
      },
    });
  });

  it('applies identical policy outcomes for donor and cashier channels', async () => {
    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    const service = new IntakeService(commitmentService, new InMemoryIntakeRequestRepository());

    const donorResult = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-1',
      channel: 'donor',
      payload: basePayload(),
    });

    const cashierResult = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-2',
      channel: 'cashier',
      payload: basePayload(),
    });

    expect(donorResult.ok).toBe(cashierResult.ok);

    if (donorResult.ok && cashierResult.ok) {
      expect(donorResult.data.status).toBe('Accepted');
      expect(cashierResult.data.status).toBe('Accepted');
      expect(Array.isArray(donorResult.data.availableSlots)).toBe(true);
      expect(Array.isArray(cashierResult.data.availableSlots)).toBe(true);
    }
  });

  it('persists refusal outcome when commitment linkage fails', async () => {
    const commitmentService = new CommitmentAlwaysFailsService(new InMemoryCommitmentRepository());
    const service = new IntakeService(commitmentService, new InMemoryIntakeRequestRepository());

    const result = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-9',
      channel: 'cashier',
      payload: basePayload(),
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ROUTESHYFT_CASHIER_INTAKE_REFUSED',
      data: {
        requestId: expect.any(String),
        reasonCode: 'ROUTESHYFT_INTAKE_LINKAGE_CANCELLED',
        linkageErrorCode: 'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE',
      },
    });

    if (result.ok) {
      throw new Error('Expected commitment linkage failure to return refusal');
    }

    const requestId = (result.data as { requestId: string }).requestId;

    const resolved = await service.resolveIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      requestId,
      channel: 'cashier',
    });

    expect(resolved).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_CASHIER_INTAKE_REFUSED',
      data: {
        requestId,
        commitmentId: null,
        status: 'Refused',
        requestLifecycleStatus: 'cancelled',
      },
    });
  });

  it('persists pickup schedule mode for refused intake when scheduleMode is omitted', async () => {
    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    const service = new IntakeService(commitmentService, new InMemoryIntakeRequestRepository());

    const result = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-4',
      channel: 'cashier',
      payload: {
        ...basePayload(),
        scheduleMode: null,
        forceRefusal: true,
      },
    });

    if (result.ok) {
      throw new Error('Expected refusal for forced refusal case');
    }

    const resolved = await service.resolveIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      requestId: String((result.data as { requestId?: string }).requestId),
      channel: 'cashier',
    });

    expect(resolved).toMatchObject({
      ok: true,
      data: {
        status: 'Refused',
        scheduleMode: 'pickup',
      },
    });
  });

  it('keeps request lifecycle terminal while linked commitment transitions independently', async () => {
    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    const requestRepository = new InMemoryIntakeRequestRepository();
    const service = new IntakeService(commitmentService, requestRepository);

    const created = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-1',
      channel: 'cashier',
      payload: basePayload(),
    });

    if (!created.ok) {
      throw new Error('Expected accepted intake result');
    }

    await commitmentService.transitionCommitment({
      tenantId: 'tenant-1',
      commitmentId: created.data.commitmentId,
      actorId: 'user-2',
      nextStatus: 'in_progress',
      reason: 'Dispatching linked commitment',
    });

    const resolved = await service.resolveIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      requestId: created.data.requestId,
      channel: 'cashier',
    });

    expect(resolved).toMatchObject({
      ok: true,
      data: {
        requestId: created.data.requestId,
        requestLifecycleStatus: 'committed',
        commitmentLifecycleStatus: 'in_progress',
      },
    });
  });

  it('returns reconciliation actions for unresolved stale request states', async () => {
    const repository = {
      createAccepted: jest.fn(),
      createRefused: jest.fn(),
      getById: jest.fn(),
      listUnresolved: jest.fn(async () => [unresolvedRecord()]),
    };

    const service = new IntakeService(
      new CommitmentService(new InMemoryCommitmentRepository()),
      repository as never,
    );

    const result = await service.listUnresolvedRequests({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      staleMinutes: 60,
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_INTAKE_RECONCILIATION_QUEUE',
      data: {
        staleThresholdMinutes: 60,
        guardrailStatus: 'action_required',
        items: [
          expect.objectContaining({
            requestId: 'request-unresolved-1',
            requestLifecycleStatus: 'pending',
            issueCode: 'ROUTESHYFT_REQUEST_TERMINAL_STATE_MISSING',
            reconciliationActions: expect.any(Array),
            stale: true,
          }),
        ],
      },
    });
  });

  it('includes non-stale unresolved requests while preserving stale classification', async () => {
    const repository = {
      createAccepted: jest.fn(),
      createRefused: jest.fn(),
      getById: jest.fn(),
      listUnresolved: jest.fn(async () => ([
        unresolvedRecord(),
        {
          ...unresolvedRecord(),
          requestId: 'request-unresolved-fresh-1',
          updatedAtUtc: thirtyMinutesAgoUtc(),
        },
      ])),
    };

    const service = new IntakeService(
      new CommitmentService(new InMemoryCommitmentRepository()),
      repository as never,
    );

    const result = await service.listUnresolvedRequests({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      staleMinutes: 60,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        guardrailStatus: 'action_required',
      },
    });

    expect(result.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        requestId: 'request-unresolved-1',
        stale: true,
      }),
      expect.objectContaining({
        requestId: 'request-unresolved-fresh-1',
        stale: false,
      }),
    ]));
  });

  it('runs commitment and request linkage writes inside a shared transaction for knex-backed repositories', async () => {
    const commitmentService = new TransactionAwareCommitmentService(new InMemoryCommitmentRepository());
    const requestRepository = new RecordingKnexIntakeRequestRepository();
    const transactionCalls: unknown[] = [];
    const fakeTrx = { tag: 'trx-atomic-linkage' };
    const service = new IntakeService(
      commitmentService,
      requestRepository,
      async (handler) => {
        transactionCalls.push('called');
        return handler(fakeTrx as never);
      },
    );

    const result = await service.submitIntake({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      actorId: 'user-1',
      channel: 'cashier',
      payload: basePayload(),
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_CASHIER_INTAKE_ACCEPTED',
    });
    expect(transactionCalls).toHaveLength(1);
    expect(commitmentService.createCalls).toHaveLength(1);
    expect(commitmentService.createCalls[0]?.dbClient).toBe(fakeTrx);
    expect(requestRepository.createAcceptedCalls).toHaveLength(1);
    expect(requestRepository.createAcceptedCalls[0]?.dbClient).toBe(fakeTrx);
  });
});
