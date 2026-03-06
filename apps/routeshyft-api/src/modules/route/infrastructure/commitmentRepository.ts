import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../../config/knex';
import {
  type CommitmentStatus,
  type CommitmentTransitionAudit,
  isTerminalCommitmentStatus,
  type RouteCommitment,
} from '../domain/commitmentLifecycle';

type DbCommitmentRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string | null;
  source_type: string;
  source_id: string;
  external_ref: string | null;
  status: CommitmentStatus;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  terminal_at_utc: string | Date | null;
  terminal_reason: string | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbTransitionAuditRow = {
  id: string;
  tenant_id: string;
  commitment_id: string;
  actor_id: string | null;
  reason: string;
  previous_status: CommitmentStatus;
  new_status: CommitmentStatus;
  policy_exception_code: string | null;
  occurred_at_utc: string | Date;
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

export type PersistCommitmentTransitionInput = {
  tenantId: string;
  commitmentId: string;
  actorId: string | null;
  reason: string;
  previousStatus: CommitmentStatus;
  newStatus: CommitmentStatus;
  policyExceptionCode: string | null;
};

export type ListPendingCommitmentsInput = {
  tenantId: string;
  orgUnitId?: string | null;
  limit?: number;
};

export type FindCommitmentBySourceInput = {
  tenantId: string;
  sourceType: string;
  sourceId: string;
  orgUnitId?: string | null;
};

export type FindCommitmentByExternalRefInput = {
  tenantId: string;
  externalRef: string;
  sourceType?: string | null;
  orgUnitId?: string | null;
};

export type ListCommitmentsBySourceTypeInput = {
  tenantId: string;
  sourceType: string;
  orgUnitId?: string | null;
  limit?: number;
};

export type PersistCommitmentTransitionResult =
  | {
    ok: true;
    commitment: RouteCommitment;
    transitionAudit: CommitmentTransitionAudit;
  }
  | {
    ok: false;
    reason: 'COMMITMENT_NOT_FOUND' | 'STATUS_MISMATCH';
  };

export interface CommitmentRepository {
  createCommitment(
    input: CreateCommitmentInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment>;
  getCommitmentById(
    tenantId: string,
    commitmentId: string,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null>;
  transitionCommitment(
    input: PersistCommitmentTransitionInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<PersistCommitmentTransitionResult>;
  listPendingCommitments(
    input: ListPendingCommitmentsInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment[]>;
  findCommitmentBySource(
    input: FindCommitmentBySourceInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null>;
  findCommitmentByExternalRef(
    input: FindCommitmentByExternalRefInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null>;
  listCommitmentsBySourceType(
    input: ListCommitmentsBySourceTypeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment[]>;
}

const toIsoUtc = (value: string | Date | null): string | null => {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  return value;
};

const mapCommitmentRow = (row: DbCommitmentRow): RouteCommitment => ({
  commitmentId: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  externalRef: row.external_ref,
  status: row.status,
  createdByUserId: row.created_by_user_id,
  updatedByUserId: row.updated_by_user_id,
  terminalAtUtc: toIsoUtc(row.terminal_at_utc),
  terminalReason: row.terminal_reason,
  createdAtUtc: toIsoUtc(row.created_at_utc) || '',
  updatedAtUtc: toIsoUtc(row.updated_at_utc) || '',
});

const mapTransitionAuditRow = (row: DbTransitionAuditRow): CommitmentTransitionAudit => ({
  transitionAuditId: row.id,
  tenantId: row.tenant_id,
  commitmentId: row.commitment_id,
  actorId: row.actor_id,
  reason: row.reason,
  previousStatus: row.previous_status,
  newStatus: row.new_status,
  policyExceptionCode: row.policy_exception_code,
  occurredAtUtc: toIsoUtc(row.occurred_at_utc) || '',
});

export class InMemoryCommitmentRepository implements CommitmentRepository {
  private readonly commitmentsById = new Map<string, RouteCommitment>();

  private readonly transitionAuditsByCommitmentId = new Map<string, CommitmentTransitionAudit[]>();

  async createCommitment(
    input: CreateCommitmentInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment> {
    const now = new Date().toISOString();
    const commitmentId = randomUUID();

    const commitment: RouteCommitment = {
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

  async getCommitmentById(
    tenantId: string,
    commitmentId: string,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null> {
    const commitment = this.commitmentsById.get(commitmentId);
    if (!commitment || commitment.tenantId !== tenantId) {
      return null;
    }

    return { ...commitment };
  }

  async transitionCommitment(
    input: PersistCommitmentTransitionInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<PersistCommitmentTransitionResult> {
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
    const updated: RouteCommitment = {
      ...existing,
      status: input.newStatus,
      updatedByUserId: input.actorId,
      updatedAtUtc: now,
      terminalAtUtc: isTerminalCommitmentStatus(input.newStatus) ? now : null,
      terminalReason: isTerminalCommitmentStatus(input.newStatus) ? input.reason : null,
    };

    const transitionAudit: CommitmentTransitionAudit = {
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
    this.transitionAuditsByCommitmentId.set(input.commitmentId, [
      ...audits,
      transitionAudit,
    ]);

    return {
      ok: true,
      commitment: { ...updated },
      transitionAudit: { ...transitionAudit },
    };
  }

  async listPendingCommitments(
    input: ListPendingCommitmentsInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment[]> {
    const limit = Number.isInteger(input.limit) && (input.limit as number) > 0
      ? Math.min(input.limit as number, 500)
      : 100;

    return [...this.commitmentsById.values()]
      .filter((commitment) => {
        if (commitment.tenantId !== input.tenantId) {
          return false;
        }

        if (input.orgUnitId && commitment.orgUnitId !== input.orgUnitId) {
          return false;
        }

        if (commitment.status !== 'scheduled' && commitment.status !== 'in_progress') {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.updatedAtUtc.localeCompare(left.updatedAtUtc))
      .slice(0, limit)
      .map((commitment) => ({ ...commitment }));
  }

  async findCommitmentBySource(
    input: FindCommitmentBySourceInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null> {
    const resolved = [...this.commitmentsById.values()]
      .find((commitment) => {
        if (commitment.tenantId !== input.tenantId) {
          return false;
        }

        if (input.orgUnitId && commitment.orgUnitId !== input.orgUnitId) {
          return false;
        }

        return commitment.sourceType === input.sourceType
          && commitment.sourceId === input.sourceId;
      });

    return resolved ? { ...resolved } : null;
  }

  async findCommitmentByExternalRef(
    input: FindCommitmentByExternalRefInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null> {
    const resolved = [...this.commitmentsById.values()]
      .find((commitment) => {
        if (commitment.tenantId !== input.tenantId) {
          return false;
        }

        if (input.orgUnitId && commitment.orgUnitId !== input.orgUnitId) {
          return false;
        }

        if (input.sourceType && commitment.sourceType !== input.sourceType) {
          return false;
        }

        return commitment.externalRef === input.externalRef;
      });

    return resolved ? { ...resolved } : null;
  }

  async listCommitmentsBySourceType(
    input: ListCommitmentsBySourceTypeInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment[]> {
    const limit = Number.isInteger(input.limit) && (input.limit as number) > 0
      ? Math.min(input.limit as number, 5000)
      : 1000;

    return [...this.commitmentsById.values()]
      .filter((commitment) => {
        if (commitment.tenantId !== input.tenantId) {
          return false;
        }

        if (input.orgUnitId && commitment.orgUnitId !== input.orgUnitId) {
          return false;
        }

        return commitment.sourceType === input.sourceType;
      })
      .sort((left, right) => right.updatedAtUtc.localeCompare(left.updatedAtUtc))
      .slice(0, limit)
      .map((commitment) => ({ ...commitment }));
  }
}

export class KnexCommitmentRepository implements CommitmentRepository {
  constructor(private readonly knexClient: Knex = db) {}

  private resolveClient(dbClient?: Knex | Knex.Transaction): Knex | Knex.Transaction {
    return dbClient || this.knexClient;
  }

  private isTransactionClient(client: Knex | Knex.Transaction): client is Knex.Transaction {
    return typeof (client as Knex.Transaction).commit === 'function'
      && typeof (client as Knex.Transaction).rollback === 'function';
  }

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

  async createCommitment(
    input: CreateCommitmentInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment> {
    const client = this.resolveClient(dbClient);
    const [inserted] = await client
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
        terminal_at_utc: isTerminalCommitmentStatus(input.initialStatus) ? client.fn.now() : null,
        terminal_reason: null,
        created_at_utc: client.fn.now(),
        updated_at_utc: client.fn.now(),
      })
      .returning<DbCommitmentRow[]>(this.commitmentReturningColumns());

    return mapCommitmentRow(inserted);
  }

  async getCommitmentById(
    tenantId: string,
    commitmentId: string,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null> {
    const client = this.resolveClient(dbClient);
    const row = await client
      .withSchema('route')
      .table('commitments')
      .where({
        tenant_id: tenantId,
        id: commitmentId,
      })
      .first<DbCommitmentRow>(this.commitmentReturningColumns());

    if (!row) {
      return null;
    }

    return mapCommitmentRow(row);
  }

  async transitionCommitment(
    input: PersistCommitmentTransitionInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<PersistCommitmentTransitionResult> {
    const client = this.resolveClient(dbClient);
    const runTransition = async (trx: Knex.Transaction): Promise<PersistCommitmentTransitionResult> => {
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
        .returning<DbCommitmentRow[]>(this.commitmentReturningColumns());

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
            reason: 'COMMITMENT_NOT_FOUND',
          };
        }

        return {
          ok: false,
          reason: 'STATUS_MISMATCH',
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
        .returning<DbTransitionAuditRow[]>(this.transitionAuditReturningColumns());

      return {
        ok: true,
        commitment: mapCommitmentRow(updatedRow),
        transitionAudit: mapTransitionAuditRow(auditRow),
      };
    };

    if (this.isTransactionClient(client)) {
      return runTransition(client);
    }

    return client.transaction(runTransition);
  }

  async listPendingCommitments(
    input: ListPendingCommitmentsInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment[]> {
    const client = this.resolveClient(dbClient);
    const limit = Number.isInteger(input.limit) && (input.limit as number) > 0
      ? Math.min(input.limit as number, 500)
      : 100;

    const query = client
      .withSchema('route')
      .table('commitments')
      .select<DbCommitmentRow[]>(this.commitmentReturningColumns())
      .where({
        tenant_id: input.tenantId,
      })
      .whereIn('status', ['scheduled', 'in_progress'])
      .orderBy('updated_at_utc', 'desc')
      .limit(limit);

    if (input.orgUnitId) {
      query.andWhere({ org_unit_id: input.orgUnitId });
    }

    const rows = await query;
    return rows.map((row) => mapCommitmentRow(row));
  }

  async findCommitmentBySource(
    input: FindCommitmentBySourceInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null> {
    const client = this.resolveClient(dbClient);
    const query = client
      .withSchema('route')
      .table('commitments')
      .select<DbCommitmentRow[]>(this.commitmentReturningColumns())
      .where({
        tenant_id: input.tenantId,
        source_type: input.sourceType,
        source_id: input.sourceId,
      })
      .orderBy('updated_at_utc', 'desc')
      .first();

    if (input.orgUnitId) {
      query.andWhere({ org_unit_id: input.orgUnitId });
    }

    const row = await query;
    return row ? mapCommitmentRow(row) : null;
  }

  async findCommitmentByExternalRef(
    input: FindCommitmentByExternalRefInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment | null> {
    const client = this.resolveClient(dbClient);
    const query = client
      .withSchema('route')
      .table('commitments')
      .select<DbCommitmentRow[]>(this.commitmentReturningColumns())
      .where({
        tenant_id: input.tenantId,
        external_ref: input.externalRef,
      })
      .orderBy('updated_at_utc', 'desc')
      .first();

    if (input.orgUnitId) {
      query.andWhere({ org_unit_id: input.orgUnitId });
    }

    if (input.sourceType) {
      query.andWhere({ source_type: input.sourceType });
    }

    const row = await query;
    return row ? mapCommitmentRow(row) : null;
  }

  async listCommitmentsBySourceType(
    input: ListCommitmentsBySourceTypeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteCommitment[]> {
    const client = this.resolveClient(dbClient);
    const limit = Number.isInteger(input.limit) && (input.limit as number) > 0
      ? Math.min(input.limit as number, 5000)
      : 1000;

    const query = client
      .withSchema('route')
      .table('commitments')
      .select<DbCommitmentRow[]>(this.commitmentReturningColumns())
      .where({
        tenant_id: input.tenantId,
        source_type: input.sourceType,
      })
      .orderBy('updated_at_utc', 'desc')
      .limit(limit);

    if (input.orgUnitId) {
      query.andWhere({ org_unit_id: input.orgUnitId });
    }

    const rows = await query;
    return rows.map((row) => mapCommitmentRow(row));
  }
}
