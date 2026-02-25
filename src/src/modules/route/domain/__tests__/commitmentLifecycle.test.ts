import {
  evaluateCommitmentTransition,
  listAllowedCommitmentTransitions,
  TERMINAL_COMMITMENT_STATUSES,
} from '../commitmentLifecycle';

describe('route commitment lifecycle domain rules', () => {
  it('allows scheduled to in_progress transition', () => {
    const result = evaluateCommitmentTransition({
      currentStatus: 'scheduled',
      nextStatus: 'in_progress',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        previousStatus: 'scheduled',
        newStatus: 'in_progress',
        isTerminal: false,
      },
    });
  });

  it('rejects invalid transitions with actionable next states', () => {
    const result = evaluateCommitmentTransition({
      currentStatus: 'scheduled',
      nextStatus: 'completed',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_INVALID_TRANSITION',
      data: {
        currentStatus: 'scheduled',
        attemptedStatus: 'completed',
        allowedTransitions: ['in_progress', 'canceled', 'refused'],
      },
    });
  });

  it('enforces terminal lock without policy exception', () => {
    const result = evaluateCommitmentTransition({
      currentStatus: 'completed',
      nextStatus: 'canceled',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED',
      data: {
        currentStatus: 'completed',
        attemptedStatus: 'canceled',
        isTerminal: true,
        allowedTransitions: [],
        allowedWithPolicyExceptionTransitions: ['canceled', 'refused'],
      },
    });
  });

  it('allows terminal override when policy exception code is provided', () => {
    const result = evaluateCommitmentTransition({
      currentStatus: 'completed',
      nextStatus: 'canceled',
      policyExceptionCode: 'OPS_OVERRIDE',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        previousStatus: 'completed',
        newStatus: 'canceled',
        policyExceptionApplied: true,
      },
    });
  });

  it('returns no standard transitions for terminal states', () => {
    expect(Array.from(TERMINAL_COMMITMENT_STATUSES.values())).toEqual(
      expect.arrayContaining(['completed', 'canceled', 'refused']),
    );
    expect(listAllowedCommitmentTransitions('completed')).toEqual([]);
    expect(listAllowedCommitmentTransitions('canceled')).toEqual([]);
    expect(listAllowedCommitmentTransitions('refused')).toEqual([]);
  });
});
