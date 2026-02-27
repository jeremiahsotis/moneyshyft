import type { Knex } from 'knex';
import {
  type CommitmentStatus,
  describeCommitmentState,
  evaluateCommitmentTransition,
  isCommitmentStatus,
} from '../domain/commitmentLifecycle';
import type { CommitmentRepository } from '../infrastructure/commitmentRepository';
import { InMemoryCommitmentRepository, KnexCommitmentRepository } from '../infrastructure/commitmentRepository';

type RefusalType = 'business' | 'client' | 'security';

type ServiceRefusalResult = {
  ok: false;
  code:
    | 'ROUTE_COMMITMENT_SOURCE_TYPE_REQUIRED'
    | 'ROUTE_COMMITMENT_SOURCE_ID_REQUIRED'
    | 'ROUTE_COMMITMENT_CREATE_INVALID_INITIAL_STATUS'
    | 'ROUTE_COMMITMENT_REASON_REQUIRED'
    | 'ROUTE_COMMITMENT_INVALID_STATUS'
    | 'ROUTE_COMMITMENT_NOT_FOUND'
    | 'ROUTE_COMMITMENT_INVALID_TRANSITION'
    | 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED'
    | 'ROUTE_COMMITMENT_POLICY_EXCEPTION_FORBIDDEN'
    | 'ROUTE_COMMITMENT_PERSISTENCE_UNAVAILABLE';
  message: string;
  refusalType: RefusalType;
  httpStatus: number;
  data?: Record<string, unknown>;
};

type CreateCommitmentSuccess = {
  ok: true;
  code: 'ROUTE_COMMITMENT_CREATED';
  message: string;
  httpStatus: 201;
  data: {
    commitment: Awaited<ReturnType<CommitmentRepository['createCommitment']>>;
    state: ReturnType<typeof describeCommitmentState>;
  };
};

type ResolveCommitmentSuccess = {
  ok: true;
  code: 'ROUTE_COMMITMENT_RESOLVED';
  message: string;
  httpStatus: 200;
  data: {
    commitment: NonNullable<Awaited<ReturnType<CommitmentRepository['getCommitmentById']>>>;
    state: ReturnType<typeof describeCommitmentState>;
  };
};

type TransitionCommitmentSuccess = {
  ok: true;
  code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED';
  message: string;
  httpStatus: 200;
  data: {
    commitment: NonNullable<Awaited<ReturnType<CommitmentRepository['getCommitmentById']>>>;
    transition: NonNullable<Extract<Awaited<ReturnType<CommitmentRepository['transitionCommitment']>>, { ok: true }>>['transitionAudit'];
    state: ReturnType<typeof describeCommitmentState>;
  };
};

export type CreateCommitmentResult = CreateCommitmentSuccess | ServiceRefusalResult;
export type ResolveCommitmentResult = ResolveCommitmentSuccess | ServiceRefusalResult;
export type TransitionCommitmentResult = TransitionCommitmentSuccess | ServiceRefusalResult;

export type CreateCommitmentCommand = {
  tenantId: string;
  actorId: string | null;
  sourceType: string;
  sourceId: string;
  orgUnitId?: string | null;
  externalRef?: string | null;
  initialStatus?: CommitmentStatus;
  dbClient?: Knex | Knex.Transaction;
};

export type ResolveCommitmentCommand = {
  tenantId: string;
  commitmentId: string;
  dbClient?: Knex | Knex.Transaction;
};

export type TransitionCommitmentCommand = {
  tenantId: string;
  commitmentId: string;
  actorId: string | null;
  nextStatus: CommitmentStatus;
  reason: string;
  policyExceptionCode?: string | null;
  allowPolicyException?: boolean;
  dbClient?: Knex | Knex.Transaction;
};

const normalizeNonEmptyString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toRefusal = (
  code: ServiceRefusalResult['code'],
  message: string,
  refusalType: RefusalType = 'business',
  httpStatus = 200,
  data?: Record<string, unknown>,
): ServiceRefusalResult => ({
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

  const candidate = error as { code?: string };
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

export class CommitmentService {
  constructor(private readonly repository: CommitmentRepository = new InMemoryCommitmentRepository()) {}

  supportsExternalTransaction(): boolean {
    return this.repository instanceof KnexCommitmentRepository;
  }

  async createCommitment(input: CreateCommitmentCommand): Promise<CreateCommitmentResult> {
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
      }, input.dbClient);

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

  async resolveCommitment(input: ResolveCommitmentCommand): Promise<ResolveCommitmentResult> {
    try {
      const commitment = await this.repository.getCommitmentById(
        input.tenantId,
        input.commitmentId,
        input.dbClient,
      );
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

  async transitionCommitment(input: TransitionCommitmentCommand): Promise<TransitionCommitmentResult> {
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
      const existing = await this.repository.getCommitmentById(
        input.tenantId,
        input.commitmentId,
        input.dbClient,
      );
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
      }, input.dbClient);

      if (!persisted.ok) {
        if (persisted.reason === 'COMMITMENT_NOT_FOUND') {
          return toRefusal(
            'ROUTE_COMMITMENT_NOT_FOUND',
            'Commitment not found for active tenant.',
          );
        }

        const current = await this.repository.getCommitmentById(
          input.tenantId,
          input.commitmentId,
          input.dbClient,
        );
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
