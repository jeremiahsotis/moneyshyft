import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import knex from '../../../config/knex';
import {
  CommitmentStatus,
  isTerminalCommitmentStatus,
} from '../domain/commitmentLifecycle';

const toIsoUtc = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  return String(value);
};

export type CommitmentRecord = {
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

export type CommitmentTransitionAuditRecord = {
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

export type CreateCommitmentInput = {
  tenantId: string;
  orgUnitId: string | null;
  sourceType: string;
  sourceId: string;
  externalRef: string | null;
  actorId: string | null;
  initialStatus: CommitmentStatus;
};

export type TransitionCommitmentInput = {
  tenantId: string;
  commitmentId: string;
  actorId: string | null;
  reason: string;
  previousStatus: CommitmentStatus;
  newStatus: CommitmentStatus;
  policyExceptionCode: string | null;
};

export type TransitionCommitmentResult =
  | {
    ok: true;
    commitment: CommitmentRecord;
    transitionAudit: CommitmentTransitionAuditRecord;
  }
  | {
    ok: false;
    reason: 'COMMITMENT_NOT_FOUND' | 'STATUS_MISMATCH';
  };

export interface CommitmentRepository {
  createCommitment(input: CreateCommitmentInput): Promise<CommitmentRecord>;
  getCommitmentById(tenantId: string, commitmentId: string): Promise<CommitmentRecord | null>;
  transitionCommitment(input: TransitionCommitmentInput): Promise<TransitionCommitmentResult>;
}

const mapCommitmentRow = (row: Record<string, unknown>): CommitmentRecord => ({
  commitmentId: String(row.id),
  tenantId: String(row.tenant_id),
  orgUnitId: row.org_unit_id === null ? null : String(row.org_unit_id),
  sourceType: String(row.source_type),
  sourceId: String(row.source_id),
  externalRef: row.external_ref === null ? null : String(row.external_ref),
  status: String(row.status) as CommitmentStatus,
  createdByUserId: row.created_by_user_id === null ? null : String(row.created_by_user_id),
  updatedByUserId: row.updated_by_user_id === null ? null : String(row.updated_by_user_id),
  terminalAtUtc: toIsoUtc(row.terminal_at_utc),
  terminalReason: row.terminal_reason === null ? null : String(row.terminal_reason),
  createdAtUtc: toIsoUtc(row.created_at_utc) || '',
  updatedAtUtc: toIsoUtc(row.updated_at_utc) || '',
});

const mapTransitionAuditRow = (row: Record<string, unknown>): CommitmentTransitionAuditRecord => ({
  transitionAuditId: String(row.id),
  tenantId: String(row.tenant_id),
  commitmentId: String(row.commitment_id),
  actorId: row.actor_id === null ? null : String(row.actor_id),
  reason: String(row.reason),
  previousStatus: String(row.previous_status) as CommitmentStatus,
  newStatus: String(row.new_status) as CommitmentStatus,
  policyExceptionCode: row.policy_exception_code === null ? null : String(row.policy_exception_code),
  occurredAtUtc: toIsoUtc(row.occurred_at_utc) || '',
});

export class InMemoryCommitmentRepository implements CommitmentRepository {
  private readonly commitmentsById = new Map<string, CommitmentRecord>();
  private readonly transitionAuditsByCommitmentId = new Map<string, CommitmentTransitionAuditRecord[]>();

  async createCommitment(input: CreateCommitmentInput): Promise<CommitmentRecord> {
    const now = new Date().toISOString();
    const commitmentId = randomUUID();

    const commitment: CommitmentRecord = {
      commitmentId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      externalRef: input.externalRef,
      status: input.initialStatus,
      createdByUserId: input.actorId,
      updatedByUserId: input.actorId,
      terminalAtUtc: isTerminalCommitmentStatus(input.initialStatus) ? now : null,
      terminalReason: null,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.commitmentsById.set(commitmentId, commitment);
    this.transitionAuditsByCommitmentId.set(commitmentId, []);

    return { ...commitment };
  }

  async getCommitmentById(tenantId: string, commitmentId: string): Promise<CommitmentRecord | null> {
    const commitment = this.commitmentsById.get(commitmentId);
    if (!commitment || commitment.tenantId !== tenantId) {
      return null;
    }

    return { ...commitment };
  }

  async transitionCommitment(input: TransitionCommitmentInput): Promise<TransitionCommitmentResult> {
    const existing = this.commitmentsById.get(input.commitmentId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return {
        ok: false,
        reason: 'COMMITMENT_NOT_FOUND',
      };
    }

    if (existing.status !== input.previousStatus) {
      return {
        ok: false,
        reason: 'STATUS_MISMATCH',
      };
    }

    const now = new Date().toISOString();
    const updated: CommitmentRecord = {
      ...existing,
      status: input.newStatus,
      updatedByUserId: input.actorId,
      updatedAtUtc: now,
      terminalAtUtc: isTerminalCommitmentStatus(input.newStatus) ? now : null,
      terminalReason: isTerminalCommitmentStatus(input.newStatus) ? input.reason : null,
    };

    const transitionAudit: CommitmentTransitionAuditRecord = {
      transitionAuditId: randomUUID(),
      tenantId: input.tenantId,
      commitmentId: input.commitmentId,
      actorId: input.actorId,
      reason: input.reason,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      policyExceptionCode: input.policyExceptionCode,
      occurredAtUtc: now,
    };

    this.commitmentsById.set(input.commitmentId, updated);
    const audits = this.transitionAuditsByCommitmentId.get(input.commitmentId) || [];
    this.transitionAuditsByCommitmentId.set(input.commitmentId, [...audits, transitionAudit]);

    return {
      ok: true,
      commitment: { ...updated },
      transitionAudit: { ...transitionAudit },
    };
  }
}

export class KnexCommitmentRepository implements CommitmentRepository {
  constructor(private readonly knexClient: Knex = knex) {}

  private commitmentReturningColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'source_type',
      'source_id',
      'external_ref',
      'status',
      'created_by_user_id',
      'updated_by_user_id',
      'terminal_at_utc',
      'terminal_reason',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private transitionAuditReturningColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'commitment_id',
      'actor_id',
      'reason',
      'previous_status',
      'new_status',
      'policy_exception_code',
      'occurred_at_utc',
    ];
  }

  async createCommitment(input: CreateCommitmentInput): Promise<CommitmentRecord> {
    const [inserted] = await this.knexClient
      .withSchema('route')
      .table('commitments')
      .insert({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        external_ref: input.externalRef,
        status: input.initialStatus,
        created_by_user_id: input.actorId,
        updated_by_user_id: input.actorId,
        terminal_at_utc: isTerminalCommitmentStatus(input.initialStatus) ? this.knexClient.fn.now() : null,
        terminal_reason: null,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning(this.commitmentReturningColumns());

    return mapCommitmentRow(inserted as Record<string, unknown>);
  }

  async getCommitmentById(tenantId: string, commitmentId: string): Promise<CommitmentRecord | null> {
    const row = await this.knexClient
      .withSchema('route')
      .table('commitments')
      .where({
        tenant_id: tenantId,
        id: commitmentId,
      })
      .first(this.commitmentReturningColumns());

    if (!row) {
      return null;
    }

    return mapCommitmentRow(row as Record<string, unknown>);
  }

  async transitionCommitment(input: TransitionCommitmentInput): Promise<TransitionCommitmentResult> {
    return this.knexClient.transaction(async (trx) => {
      const [updatedRow] = await trx
        .withSchema('route')
        .table('commitments')
        .where({
          id: input.commitmentId,
          tenant_id: input.tenantId,
          status: input.previousStatus,
        })
        .update({
          status: input.newStatus,
          updated_by_user_id: input.actorId,
          updated_at_utc: trx.fn.now(),
          terminal_at_utc: isTerminalCommitmentStatus(input.newStatus) ? trx.fn.now() : null,
          terminal_reason: isTerminalCommitmentStatus(input.newStatus) ? input.reason : null,
        })
        .returning(this.commitmentReturningColumns());

      if (!updatedRow) {
        const existing = await trx
          .withSchema('route')
          .table('commitments')
          .where({
            id: input.commitmentId,
            tenant_id: input.tenantId,
          })
          .first('id');

        if (!existing) {
          return {
            ok: false,
            reason: 'COMMITMENT_NOT_FOUND' as const,
          };
        }

        return {
          ok: false,
          reason: 'STATUS_MISMATCH' as const,
        };
      }

      const [auditRow] = await trx
        .withSchema('route')
        .table('commitment_transition_audit')
        .insert({
          tenant_id: input.tenantId,
          commitment_id: input.commitmentId,
          actor_id: input.actorId,
          reason: input.reason,
          previous_status: input.previousStatus,
          new_status: input.newStatus,
          policy_exception_code: input.policyExceptionCode,
          occurred_at_utc: trx.fn.now(),
        })
        .returning(this.transitionAuditReturningColumns());

      return {
        ok: true,
        commitment: mapCommitmentRow(updatedRow as Record<string, unknown>),
        transitionAudit: mapTransitionAuditRow(auditRow as Record<string, unknown>),
      };
    });
  }
}
