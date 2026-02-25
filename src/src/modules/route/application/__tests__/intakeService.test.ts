import { CommitmentService } from '../commitmentService';
import { IntakeService } from '../intakeService';
import { InMemoryCommitmentRepository } from '../../infrastructure/commitmentRepository';
import { InMemoryIntakeRequestRepository } from '../../infrastructure/intakeRequestRepository';
import { RouteIntakePayload } from '../../domain/intakePolicy';

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
  async createCommitment() {
    return {
      ok: false as const,
      code: 'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE',
      message: 'Commitment persistence is unavailable. Retry after route schema migration.',
      refusalType: 'business' as const,
      httpStatus: 200,
    };
  }
}

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
        reasonCode: 'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE',
      },
    });

    if (result.ok) {
      throw new Error('Expected commitment linkage failure to return refusal');
    }

    const requestId = (result.data as { requestId: string }).requestId;

    const resolved = await service.resolveIntake({
      tenantId: 'tenant-1',
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
      },
    });
  });
});
