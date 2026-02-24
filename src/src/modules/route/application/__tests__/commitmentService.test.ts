import { CommitmentService } from '../commitmentService';
import { InMemoryCommitmentRepository } from '../../infrastructure/commitmentRepository';

describe('route commitment service', () => {
  let service: CommitmentService;

  beforeEach(() => {
    service = new CommitmentService(new InMemoryCommitmentRepository());
  });

  it('creates commitments in scheduled state with explicit next actions', async () => {
    const result = await service.createCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      sourceType: 'route_request',
      sourceId: 'request-1',
      orgUnitId: 'org-1',
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_CREATED',
      data: {
        commitment: {
          tenantId: 'tenant-1',
          status: 'scheduled',
        },
        state: {
          status: 'scheduled',
          isTerminal: false,
          availableTransitions: ['in_progress', 'canceled', 'refused'],
        },
      },
    });
  });

  it('persists transition audit details on valid transitions', async () => {
    const created = await service.createCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      sourceType: 'route_request',
      sourceId: 'request-2',
    });
    if (!created.ok) {
      throw new Error('Expected commitment create to succeed');
    }

    const transitioned = await service.transitionCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-2',
      commitmentId: created.data.commitment.commitmentId,
      nextStatus: 'in_progress',
      reason: 'Assigned to driver queue',
    });

    expect(transitioned).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
      data: {
        commitment: {
          status: 'in_progress',
        },
        transition: {
          actorId: 'user-2',
          reason: 'Assigned to driver queue',
          previousStatus: 'scheduled',
          newStatus: 'in_progress',
        },
      },
    });
  });

  it('returns refusal envelope details for invalid transitions', async () => {
    const created = await service.createCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      sourceType: 'route_request',
      sourceId: 'request-3',
    });
    if (!created.ok) {
      throw new Error('Expected commitment create to succeed');
    }

    const refused = await service.transitionCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-2',
      commitmentId: created.data.commitment.commitmentId,
      nextStatus: 'completed',
      reason: 'Attempt to skip execution state',
    });

    expect(refused).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_INVALID_TRANSITION',
      httpStatus: 200,
      refusalType: 'business',
      data: {
        currentStatus: 'scheduled',
        attemptedStatus: 'completed',
        allowedTransitions: ['in_progress', 'canceled', 'refused'],
      },
    });
  });

  it('deterministically blocks state changes after terminal status', async () => {
    const created = await service.createCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      sourceType: 'route_request',
      sourceId: 'request-4',
    });
    if (!created.ok) {
      throw new Error('Expected commitment create to succeed');
    }

    const first = await service.transitionCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-2',
      commitmentId: created.data.commitment.commitmentId,
      nextStatus: 'in_progress',
      reason: 'Dispatch started',
    });
    if (!first.ok) {
      throw new Error('Expected transition to in_progress to succeed');
    }

    const second = await service.transitionCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-2',
      commitmentId: created.data.commitment.commitmentId,
      nextStatus: 'completed',
      reason: 'Proof recorded',
    });
    if (!second.ok) {
      throw new Error('Expected transition to completed to succeed');
    }

    const locked = await service.transitionCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-3',
      commitmentId: created.data.commitment.commitmentId,
      nextStatus: 'canceled',
      reason: 'Late correction attempt',
    });

    expect(locked).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED',
      httpStatus: 200,
      refusalType: 'business',
      data: {
        currentStatus: 'completed',
        attemptedStatus: 'canceled',
        isTerminal: true,
      },
    });
  });

  it('requires explicit reason for every transition', async () => {
    const created = await service.createCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-1',
      sourceType: 'route_request',
      sourceId: 'request-5',
    });
    if (!created.ok) {
      throw new Error('Expected commitment create to succeed');
    }

    const missingReason = await service.transitionCommitment({
      tenantId: 'tenant-1',
      actorId: 'user-2',
      commitmentId: created.data.commitment.commitmentId,
      nextStatus: 'in_progress',
      reason: '',
    });

    expect(missingReason).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_REASON_REQUIRED',
      refusalType: 'business',
      httpStatus: 200,
    });
  });
});
