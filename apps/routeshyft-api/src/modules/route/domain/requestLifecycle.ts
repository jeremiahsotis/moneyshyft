export const REQUEST_LIFECYCLE_STATUSES = [
  'pending',
  'refused',
  'cancelled',
  'committed',
] as const;

export type RouteRequestLifecycleStatus = (typeof REQUEST_LIFECYCLE_STATUSES)[number];

export const REQUEST_TERMINAL_OUTCOMES = [
  'refused',
  'cancelled',
  'committed',
] as const;

export type RouteRequestTerminalOutcome = (typeof REQUEST_TERMINAL_OUTCOMES)[number];

const TERMINAL_REQUEST_STATUS_SET = new Set<RouteRequestLifecycleStatus>(REQUEST_TERMINAL_OUTCOMES);

const STANDARD_TRANSITION_MATRIX: Record<RouteRequestLifecycleStatus, RouteRequestLifecycleStatus[]> = {
  pending: [...REQUEST_TERMINAL_OUTCOMES],
  refused: [],
  cancelled: [],
  committed: [],
};

export type RequestLifecycleTransitionAccepted = {
  ok: true;
  data: {
    previousStatus: RouteRequestLifecycleStatus;
    newStatus: RouteRequestLifecycleStatus;
    isTerminal: boolean;
  };
};

export type RequestLifecycleTransitionRefused = {
  ok: false;
  code: 'ROUTE_REQUEST_INVALID_TRANSITION' | 'ROUTE_REQUEST_TERMINAL_STATE_LOCKED';
  message: string;
  data: {
    currentStatus: RouteRequestLifecycleStatus;
    attemptedStatus: RouteRequestLifecycleStatus;
    isTerminal: boolean;
    allowedTransitions: RouteRequestLifecycleStatus[];
  };
};

export type RequestLifecycleTransitionEvaluation =
  | RequestLifecycleTransitionAccepted
  | RequestLifecycleTransitionRefused;

export const isRequestLifecycleStatus = (value: unknown): value is RouteRequestLifecycleStatus => {
  if (typeof value !== 'string') {
    return false;
  }

  return (REQUEST_LIFECYCLE_STATUSES as readonly string[]).includes(value);
};

export const isTerminalRequestStatus = (status: RouteRequestLifecycleStatus): boolean =>
  TERMINAL_REQUEST_STATUS_SET.has(status);

export const listAllowedRequestLifecycleTransitions = (
  currentStatus: RouteRequestLifecycleStatus,
): RouteRequestLifecycleStatus[] => STANDARD_TRANSITION_MATRIX[currentStatus];

export const evaluateRequestLifecycleTransition = (input: {
  currentStatus: RouteRequestLifecycleStatus;
  nextStatus: RouteRequestLifecycleStatus;
}): RequestLifecycleTransitionEvaluation => {
  const currentIsTerminal = isTerminalRequestStatus(input.currentStatus);
  if (currentIsTerminal) {
    return {
      ok: false,
      code: 'ROUTE_REQUEST_TERMINAL_STATE_LOCKED',
      message: 'Request is already in a terminal state.',
      data: {
        currentStatus: input.currentStatus,
        attemptedStatus: input.nextStatus,
        isTerminal: true,
        allowedTransitions: [],
      },
    };
  }

  const allowedTransitions = listAllowedRequestLifecycleTransitions(input.currentStatus);
  if (!allowedTransitions.includes(input.nextStatus)) {
    return {
      ok: false,
      code: 'ROUTE_REQUEST_INVALID_TRANSITION',
      message: 'Requested request lifecycle transition is not allowed.',
      data: {
        currentStatus: input.currentStatus,
        attemptedStatus: input.nextStatus,
        isTerminal: false,
        allowedTransitions,
      },
    };
  }

  return {
    ok: true,
    data: {
      previousStatus: input.currentStatus,
      newStatus: input.nextStatus,
      isTerminal: isTerminalRequestStatus(input.nextStatus),
    },
  };
};
