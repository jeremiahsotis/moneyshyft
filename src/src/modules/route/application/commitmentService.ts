import {
  CommitmentStatus,
  describeCommitmentState,
  evaluateCommitmentTransition,
  isCommitmentStatus,
} from '../domain/commitmentLifecycle';
import {
  CommitmentRecord,
  CommitmentRepository,
  InMemoryCommitmentRepository,
} from '../infrastructure/commitmentRepository';

type RefusalType = 'business' | 'client' | 'security';

export type CommitmentServiceSuccess<TData> = {
  ok: true;
  code: string;
  message: string;
  httpStatus: number;
  data: TData;
};

export type CommitmentServiceRefusal = {
  ok: false;
  code: string;
  message: string;
  refusalType: RefusalType;
  httpStatus: number;
  data?: unknown;
};

export type CreateCommitmentInput = {
  tenantId: string;
  actorId: string | null;
  sourceType: string;
  sourceId: string;
  orgUnitId?: string | null;
  externalRef?: string | null;
  initialStatus?: CommitmentStatus;
};

export type ResolveCommitmentInput = {
  tenantId: string;
  commitmentId: string;
};

export type TransitionCommitmentInput = {
  tenantId: string;
  commitmentId: string;
  actorId: string | null;
  nextStatus: CommitmentStatus;
  reason: string;
  policyExceptionCode?: string | null;
  allowPolicyException?: boolean;
};

export type CreateCommitmentResult =
  | CommitmentServiceSuccess<{ commitment: CommitmentRecord; state: ReturnType<typeof describeCommitmentState> }>
  | CommitmentServiceRefusal;

export type ResolveCommitmentResult =
  | CommitmentServiceSuccess<{ commitment: CommitmentRecord; state: ReturnType<typeof describeCommitmentState> }>
  | CommitmentServiceRefusal;

export type TransitionCommitmentResult =
  | CommitmentServiceSuccess<{
    commitment: CommitmentRecord;
    transition: {
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
    state: ReturnType<typeof describeCommitmentState>;
  }>
  | CommitmentServiceRefusal;

const normalizeNonEmptyString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toRefusal = (
  code: string,
  message: string,
  refusalType: RefusalType = 'business',
  httpStatus = 200,
  data?: unknown,
): CommitmentServiceRefusal => ({
  ok: false,
  code,
  message,
  refusalType,
  httpStatus,
  data,
});

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown };

  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

export class CommitmentService {
  constructor(private readonly repository: CommitmentRepository = new InMemoryCommitmentRepository()) {}

  async createCommitment(input: CreateCommitmentInput): Promise<CreateCommitmentResult> {
    const sourceType = normalizeNonEmptyString(input.sourceType);
    if (!sourceType) {
      return toRefusal(
        'ROUTE_COMMITMENT_SOURCE_TYPE_REQUIRED',
        'sourceType is required to create a commitment.',
        'business',
        200,
      );
    }

    const sourceId = normalizeNonEmptyString(input.sourceId);
    if (!sourceId) {
      return toRefusal(
        'ROUTE_COMMITMENT_SOURCE_ID_REQUIRED',
        'sourceId is required to create a commitment.',
        'business',
        200,
      );
    }

    const initialStatus = input.initialStatus || 'scheduled';
    if (initialStatus !== 'scheduled') {
      return toRefusal(
        'ROUTE_COMMITMENT_CREATE_INVALID_INITIAL_STATUS',
        'New commitments must start in scheduled state.',
        'business',
        200,
        {
          allowedInitialStatus: ['scheduled'],
        },
      );
    }

    try {
      const commitment = await this.repository.createCommitment({
        tenantId: input.tenantId,
        orgUnitId: normalizeNonEmptyString(input.orgUnitId || null) || null,
        sourceType,
        sourceId,
        externalRef: normalizeNonEmptyString(input.externalRef || null) || null,
        actorId: normalizeNonEmptyString(input.actorId || null) || null,
        initialStatus,
      });

      return {
        ok: true,
        code: 'ROUTE_COMMITMENT_CREATED',
        message: 'Commitment created',
        httpStatus: 201,
        data: {
          commitment,
          state: describeCommitmentState(commitment.status),
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return toRefusal(
        'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE',
        'Commitment persistence is unavailable. Retry after route schema migration.',
      );
    }
  }

  async resolveCommitment(input: ResolveCommitmentInput): Promise<ResolveCommitmentResult> {
    try {
      const commitment = await this.repository.getCommitmentById(input.tenantId, input.commitmentId);
      if (!commitment) {
        return toRefusal(
          'ROUTE_COMMITMENT_NOT_FOUND',
          'Commitment not found for active tenant.',
        );
      }

      return {
        ok: true,
        code: 'ROUTE_COMMITMENT_RESOLVED',
        message: 'Commitment resolved',
        httpStatus: 200,
        data: {
          commitment,
          state: describeCommitmentState(commitment.status),
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return toRefusal(
        'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE',
        'Commitment persistence is unavailable. Retry after route schema migration.',
      );
    }
  }

  async transitionCommitment(input: TransitionCommitmentInput): Promise<TransitionCommitmentResult> {
    const reason = normalizeNonEmptyString(input.reason);
    if (!reason) {
      return toRefusal(
        'ROUTE_COMMITMENT_REASON_REQUIRED',
        'Transition reason is required.',
        'business',
        200,
      );
    }

    if (!isCommitmentStatus(input.nextStatus)) {
      return toRefusal(
        'ROUTE_COMMITMENT_INVALID_STATUS',
        'nextStatus must be one of scheduled, in_progress, completed, canceled, or refused.',
        'client',
        400,
      );
    }

    const policyExceptionCode = normalizeNonEmptyString(input.policyExceptionCode || null) || null;
    if (policyExceptionCode && !input.allowPolicyException) {
      return toRefusal(
        'ROUTE_COMMITMENT_POLICY_EXCEPTION_FORBIDDEN',
        'Policy exception transitions require elevated authorization.',
        'business',
        200,
        {
          attemptedPolicyExceptionCode: policyExceptionCode,
        },
      );
    }

    try {
      const existing = await this.repository.getCommitmentById(input.tenantId, input.commitmentId);
      if (!existing) {
        return toRefusal(
          'ROUTE_COMMITMENT_NOT_FOUND',
          'Commitment not found for active tenant.',
        );
      }

      const transitionDecision = evaluateCommitmentTransition({
        currentStatus: existing.status,
        nextStatus: input.nextStatus,
        policyExceptionCode,
      });

      if (!transitionDecision.ok) {
        return toRefusal(
          transitionDecision.code,
          transitionDecision.message,
          'business',
          200,
          {
            ...transitionDecision.data,
            state: describeCommitmentState(existing.status),
          },
        );
      }

      const persisted = await this.repository.transitionCommitment({
        tenantId: input.tenantId,
        commitmentId: input.commitmentId,
        actorId: normalizeNonEmptyString(input.actorId || null) || null,
        reason,
        previousStatus: existing.status,
        newStatus: transitionDecision.data.newStatus,
        policyExceptionCode,
      });

      if (!persisted.ok) {
        if (persisted.reason === 'COMMITMENT_NOT_FOUND') {
          return toRefusal(
            'ROUTE_COMMITMENT_NOT_FOUND',
            'Commitment not found for active tenant.',
          );
        }

        const current = await this.repository.getCommitmentById(input.tenantId, input.commitmentId);
        if (!current) {
          return toRefusal(
            'ROUTE_COMMITMENT_NOT_FOUND',
            'Commitment not found for active tenant.',
          );
        }

        return toRefusal(
          'ROUTE_COMMITMENT_INVALID_TRANSITION',
          'Commitment state changed concurrently. Retry with current state.',
          'business',
          200,
          {
            currentStatus: current.status,
            attemptedStatus: input.nextStatus,
            state: describeCommitmentState(current.status),
          },
        );
      }

      return {
        ok: true,
        code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
        message: 'Commitment transition applied',
        httpStatus: 200,
        data: {
          commitment: persisted.commitment,
          transition: persisted.transitionAudit,
          state: describeCommitmentState(persisted.commitment.status),
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return toRefusal(
        'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE',
        'Commitment persistence is unavailable. Retry after route schema migration.',
      );
    }
  }
}
