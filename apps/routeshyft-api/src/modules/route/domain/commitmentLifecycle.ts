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

const STANDARD_TRANSITION_MATRIX: Record<CommitmentStatus, CommitmentStatus[]> = {
  scheduled: ['in_progress', 'canceled', 'refused'],
  in_progress: ['completed', 'canceled', 'refused'],
  completed: [],
  canceled: [],
  refused: [],
};

const POLICY_EXCEPTION_TERMINAL_TARGETS: CommitmentStatus[] = ['canceled', 'refused'];

export type RouteCommitment = {
  commitmentId: string;
  tenantId: string;
  orgUnitId: string | null;
  sourceType: string;
  sourceId: string;
  externalRef: string | null;
  status: CommitmentStatus;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  terminalAtUtc: string | null;
  terminalReason: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CommitmentTransitionAudit = {
  transitionAuditId: string;
  tenantId: string;
  commitmentId: string;
  actorId: string | null;
  reason: string;
  previousStatus: CommitmentStatus;
  newStatus: CommitmentStatus;
  policyExceptionCode: string | null;
  occurredAtUtc: string;
};

export type CommitmentStateDescriptor = {
  status: CommitmentStatus;
  isTerminal: boolean;
  availableTransitions: CommitmentStatus[];
  allowedWithPolicyExceptionTransitions: CommitmentStatus[];
};

export type CommitmentTransitionAccepted = {
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
  code:
    | 'ROUTE_COMMITMENT_INVALID_TRANSITION'
    | 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED';
  message: string;
  data: {
    currentStatus: CommitmentStatus;
    attemptedStatus: CommitmentStatus;
    isTerminal: boolean;
    allowedTransitions: CommitmentStatus[];
    allowedWithPolicyExceptionTransitions: CommitmentStatus[];
  };
};

export type CommitmentTransitionEvaluation =
  | CommitmentTransitionAccepted
  | CommitmentTransitionRefused;

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

export const describeCommitmentState = (status: CommitmentStatus): CommitmentStateDescriptor =>
  buildStateDescriptor(status);

export const isCommitmentStatus = (value: unknown): value is CommitmentStatus => {
  if (typeof value !== 'string') {
    return false;
  }

  return (COMMITMENT_STATUSES as readonly string[]).includes(value);
};

export const isTerminalCommitmentStatus = (status: CommitmentStatus): boolean =>
  TERMINAL_COMMITMENT_STATUSES.has(status);

export const listAllowedCommitmentTransitions = (
  currentStatus: CommitmentStatus,
  policyExceptionCode?: string | null,
): CommitmentStatus[] => {
  if (isTerminalCommitmentStatus(currentStatus) && policyExceptionCode) {
    return POLICY_EXCEPTION_TERMINAL_TARGETS;
  }

  return STANDARD_TRANSITION_MATRIX[currentStatus];
};

export const evaluateCommitmentTransition = (input: {
  currentStatus: CommitmentStatus;
  nextStatus: CommitmentStatus;
  policyExceptionCode?: string | null;
}): CommitmentTransitionEvaluation => {
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
