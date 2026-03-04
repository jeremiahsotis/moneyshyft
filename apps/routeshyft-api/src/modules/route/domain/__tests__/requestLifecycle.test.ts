import {
  REQUEST_TERMINAL_OUTCOMES,
  evaluateRequestLifecycleTransition,
  listAllowedRequestLifecycleTransitions,
} from '../requestLifecycle';

describe('route request lifecycle terminal-state policy', () => {
  it('enumerates explicit terminal outcomes', () => {
    expect(REQUEST_TERMINAL_OUTCOMES).toEqual([
      'refused',
      'cancelled',
      'committed',
    ]);
  });

  it('allows pending request to resolve to committed terminal outcome', () => {
    const result = evaluateRequestLifecycleTransition({
      currentStatus: 'pending',
      nextStatus: 'committed',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        previousStatus: 'pending',
        newStatus: 'committed',
        isTerminal: true,
      },
    });
  });

  it('rejects incomplete transition when request is left pending', () => {
    const result = evaluateRequestLifecycleTransition({
      currentStatus: 'pending',
      nextStatus: 'pending',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ROUTE_REQUEST_INVALID_TRANSITION',
      data: {
        currentStatus: 'pending',
        attemptedStatus: 'pending',
        allowedTransitions: ['refused', 'cancelled', 'committed'],
      },
    });
  });

  it('blocks undefined transitions after request reaches terminal outcome', () => {
    const result = evaluateRequestLifecycleTransition({
      currentStatus: 'committed',
      nextStatus: 'cancelled',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ROUTE_REQUEST_TERMINAL_STATE_LOCKED',
      data: {
        currentStatus: 'committed',
        attemptedStatus: 'cancelled',
        isTerminal: true,
        allowedTransitions: [],
      },
    });
  });

  it('exposes no further transitions for terminal statuses', () => {
    expect(listAllowedRequestLifecycleTransitions('refused')).toEqual([]);
    expect(listAllowedRequestLifecycleTransitions('cancelled')).toEqual([]);
    expect(listAllowedRequestLifecycleTransitions('committed')).toEqual([]);
  });
});
