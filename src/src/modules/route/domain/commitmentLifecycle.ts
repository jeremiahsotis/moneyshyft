export const COMMITMENT_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'canceled',
  'refused',
] as const;

export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const TERMINAL_COMMITMENT_STATUSES = new Set<CommitmentStatus>([
  'completed',
  'canceled',
  'refused',
]);

type TransitionMatrix = Record<CommitmentStatus, readonly CommitmentStatus[]>;

const STANDARD_TRANSITION_MATRIX: TransitionMatrix = {
  scheduled: ['in_progress', 'canceled', 'refused'],
  in_progress: ['completed', 'canceled', 'refused'],
  completed: [],
  canceled: [],
  refused: [],
};

const POLICY_EXCEPTION_TERMINAL_TARGETS: readonly CommitmentStatus[] = ['canceled', 'refused'];

export type CommitmentStateDescriptor = {
  status: CommitmentStatus;
  isTerminal: boolean;
  availableTransitions: readonly CommitmentStatus[];
  allowedWithPolicyExceptionTransitions: readonly CommitmentStatus[];
};

export type CommitmentTransitionAllowed = {
  ok: true;
  data: {
    previousStatus: CommitmentStatus;
    newStatus: CommitmentStatus;
    isTerminal: boolean;
    policyExceptionApplied: boolean;
  };
};

export type CommitmentTransitionRefused = {
  ok: false;
  code: 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED' | 'ROUTE_COMMITMENT_INVALID_TRANSITION';
  message: string;
  data: {
    currentStatus: CommitmentStatus;
    attemptedStatus: CommitmentStatus;
    isTerminal: boolean;
    allowedTransitions: readonly CommitmentStatus[];
    allowedWithPolicyExceptionTransitions: readonly CommitmentStatus[];
  };
};

export type CommitmentTransitionDecision = CommitmentTransitionAllowed | CommitmentTransitionRefused;

const buildStateDescriptor = (status: CommitmentStatus): CommitmentStateDescriptor => {
  const isTerminal = TERMINAL_COMMITMENT_STATUSES.has(status);

  return {
    status,
    isTerminal,
    availableTransitions: STANDARD_TRANSITION_MATRIX[status],
    allowedWithPolicyExceptionTransitions: isTerminal
      ? POLICY_EXCEPTION_TERMINAL_TARGETS
      : [],
  };
};

export const describeCommitmentState = (status: CommitmentStatus): CommitmentStateDescriptor => {
  return buildStateDescriptor(status);
};

export const isCommitmentStatus = (value: unknown): value is CommitmentStatus => {
  if (typeof value !== 'string') {
    return false;
  }

  return COMMITMENT_STATUSES.includes(value as CommitmentStatus);
};

export const isTerminalCommitmentStatus = (status: CommitmentStatus): boolean => {
  return TERMINAL_COMMITMENT_STATUSES.has(status);
};

export const listAllowedCommitmentTransitions = (
  currentStatus: CommitmentStatus,
  policyExceptionCode?: string | null,
): readonly CommitmentStatus[] => {
  if (isTerminalCommitmentStatus(currentStatus) && typeof policyExceptionCode === 'string' && policyExceptionCode.trim() !== '') {
    return POLICY_EXCEPTION_TERMINAL_TARGETS;
  }

  return STANDARD_TRANSITION_MATRIX[currentStatus];
};

export const evaluateCommitmentTransition = (input: {
  currentStatus: CommitmentStatus;
  nextStatus: CommitmentStatus;
  policyExceptionCode?: string | null;
}): CommitmentTransitionDecision => {
  const currentState = buildStateDescriptor(input.currentStatus);
  const policyExceptionCode = typeof input.policyExceptionCode === 'string'
    ? input.policyExceptionCode.trim()
    : '';
  const hasPolicyException = policyExceptionCode.length > 0;

  if (currentState.isTerminal && !hasPolicyException) {
    return {
      ok: false,
      code: 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED',
      message: 'Commitment is in a terminal state and cannot transition without policy exception.',
      data: {
        currentStatus: input.currentStatus,
        attemptedStatus: input.nextStatus,
        isTerminal: true,
        allowedTransitions: currentState.availableTransitions,
        allowedWithPolicyExceptionTransitions: currentState.allowedWithPolicyExceptionTransitions,
      },
    };
  }

  const allowedTransitions = listAllowedCommitmentTransitions(input.currentStatus, policyExceptionCode);
  if (!allowedTransitions.includes(input.nextStatus)) {
    return {
      ok: false,
      code: 'ROUTE_COMMITMENT_INVALID_TRANSITION',
      message: 'Requested commitment transition is not allowed from current state.',
      data: {
        currentStatus: input.currentStatus,
        attemptedStatus: input.nextStatus,
        isTerminal: currentState.isTerminal,
        allowedTransitions: currentState.availableTransitions,
        allowedWithPolicyExceptionTransitions: currentState.allowedWithPolicyExceptionTransitions,
      },
    };
  }

  return {
    ok: true,
    data: {
      previousStatus: input.currentStatus,
      newStatus: input.nextStatus,
      isTerminal: isTerminalCommitmentStatus(input.nextStatus),
      policyExceptionApplied: currentState.isTerminal && hasPolicyException,
    },
  };
};
