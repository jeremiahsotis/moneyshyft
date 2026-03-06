import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import type { RouteIntakeChannel, RouteScheduleMode } from '../domain/intakePolicy';
import type { RouteRequestLifecycleStatus } from '../domain/requestLifecycle';
import knex from '../../../config/knex';

export type RouteIntakeStatus = 'Accepted' | 'Refused';

export type RouteIntakeOutcome = {
  reasonCode: string;
  message: string;
  alternatives: string[];
  nextSteps: string;
} | null;

export type RouteIntakeRecord = {
  requestId: string;
  tenantId: string;
  orgUnitId: string;
  channel: RouteIntakeChannel;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  scheduleMode: RouteScheduleMode;
  notes: string;
  status: RouteIntakeStatus;
  requestLifecycleStatus: RouteRequestLifecycleStatus;
  commitmentId: string | null;
  refusal: RouteIntakeOutcome;
  createdByUserId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateAcceptedIntakeInput = {
  tenantId: string;
  orgUnitId: string;
  channel: RouteIntakeChannel;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  scheduleMode: RouteScheduleMode;
  notes: string;
  commitmentId: string;
  createdByUserId: string | null;
};

export type CreateRefusedIntakeInput = {
  tenantId: string;
  orgUnitId: string;
  channel: RouteIntakeChannel;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  scheduleMode: RouteScheduleMode;
  notes: string;
  refusal: Exclude<RouteIntakeOutcome, null>;
  createdByUserId: string | null;
};

export type ListUnresolvedIntakeInput = {
  tenantId: string;
  orgUnitId: string | null;
};

export interface IntakeRequestRepository {
  createAccepted(
    input: CreateAcceptedIntakeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord>;
  createRefused(
    input: CreateRefusedIntakeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord>;
  getById(
    tenantId: string,
    orgUnitId: string,
    requestId: string,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord | null>;
  listUnresolved(
    input: ListUnresolvedIntakeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord[]>;
}

const CANCELLATION_REASON_CODES = new Set([
  'MONEYSHYFT_INTAKE_REQUEST_CANCELLED',
  'MONEYSHYFT_INTAKE_LINKAGE_CANCELLED',
]);

const resolveRequestLifecycleStatus = (
  status: RouteIntakeStatus,
  commitmentId: string | null,
  refusal: RouteIntakeOutcome,
): RouteRequestLifecycleStatus => {
  if (status === 'Accepted') {
    return commitmentId ? 'committed' : 'pending';
  }

  if (refusal && CANCELLATION_REASON_CODES.has(refusal.reasonCode)) {
    return 'cancelled';
  }

  return 'refused';
};

export class InMemoryIntakeRequestRepository implements IntakeRequestRepository {
  private readonly requestsById = new Map<string, RouteIntakeRecord>();

  async createAccepted(
    input: CreateAcceptedIntakeInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord> {
    const commitmentId = input.commitmentId.trim();
    if (!commitmentId) {
      throw new Error('ROUTE_REQUEST_COMMITMENT_LINKAGE_REQUIRED');
    }

    const now = new Date().toISOString();
    const requestId = randomUUID();

    const record: RouteIntakeRecord = {
      requestId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      channel: input.channel,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      scheduleMode: input.scheduleMode,
      notes: input.notes,
      status: 'Accepted',
      requestLifecycleStatus: 'committed',
      commitmentId,
      refusal: null,
      createdByUserId: input.createdByUserId,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.requestsById.set(requestId, record);

    return { ...record };
  }

  async createRefused(
    input: CreateRefusedIntakeInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord> {
    const now = new Date().toISOString();
    const requestId = randomUUID();

    const record: RouteIntakeRecord = {
      requestId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      channel: input.channel,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      scheduleMode: input.scheduleMode,
      notes: input.notes,
      status: 'Refused',
      requestLifecycleStatus: CANCELLATION_REASON_CODES.has(input.refusal.reasonCode) ? 'cancelled' : 'refused',
      commitmentId: null,
      refusal: input.refusal,
      createdByUserId: input.createdByUserId,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.requestsById.set(requestId, record);

    return { ...record };
  }

  async getById(
    tenantId: string,
    orgUnitId: string,
    requestId: string,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord | null> {
    const record = this.requestsById.get(requestId);
    if (!record || record.tenantId !== tenantId || record.orgUnitId !== orgUnitId) {
      return null;
    }

    return { ...record };
  }

  async listUnresolved(
    input: ListUnresolvedIntakeInput,
    _dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord[]> {
    return [...this.requestsById.values()]
      .filter((record) => {
        if (record.tenantId !== input.tenantId) {
          return false;
        }

        if (input.orgUnitId && record.orgUnitId !== input.orgUnitId) {
          return false;
        }

        if (record.requestLifecycleStatus !== 'pending') {
          return false;
        }

        return true;
      })
      .map((record) => ({ ...record }));
  }
}

const toIsoUtc = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  return String(value);
};

const normalizeRefusal = (row: Record<string, unknown>): RouteIntakeOutcome => {
  const reasonCode = row.refusal_reason_code;
  if (!reasonCode) {
    return null;
  }

  const alternativesRaw = row.refusal_alternatives;
  let alternatives: string[] = [];
  if (Array.isArray(alternativesRaw)) {
    alternatives = alternativesRaw.map((value) => String(value));
  } else if (typeof alternativesRaw === 'string') {
    try {
      const parsed = JSON.parse(alternativesRaw);
      if (Array.isArray(parsed)) {
        alternatives = parsed.map((value) => String(value));
      }
    } catch {
      alternatives = [];
    }
  }

  return {
    reasonCode: String(reasonCode),
    message: row.refusal_message ? String(row.refusal_message) : '',
    alternatives,
    nextSteps: row.refusal_next_steps ? String(row.refusal_next_steps) : '',
  };
};

const mapRecord = (row: Record<string, unknown>): RouteIntakeRecord => {
  const status = String(row.status) as RouteIntakeStatus;
  const commitmentId = row.commitment_id ? String(row.commitment_id) : null;
  const refusal = normalizeRefusal(row);

  return {
    requestId: String(row.id),
    tenantId: String(row.tenant_id),
    orgUnitId: String(row.org_unit_id),
    channel: String(row.channel) as RouteIntakeChannel,
    requestedAtUtc: toIsoUtc(row.requested_at_utc),
    requestedWindowStartUtc: toIsoUtc(row.requested_window_start_utc),
    requestedWindowEndUtc: toIsoUtc(row.requested_window_end_utc),
    scheduleMode: String(row.schedule_mode) as RouteScheduleMode,
    notes: row.notes ? String(row.notes) : '',
    status,
    commitmentId,
    refusal,
    requestLifecycleStatus: resolveRequestLifecycleStatus(
      status,
      commitmentId,
      refusal,
    ),
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdAtUtc: toIsoUtc(row.created_at_utc),
    updatedAtUtc: toIsoUtc(row.updated_at_utc),
  };
};

export class KnexIntakeRequestRepository implements IntakeRequestRepository {
  constructor(private readonly knexClient: Knex = knex) {}

  private resolveClient(dbClient?: Knex | Knex.Transaction): Knex | Knex.Transaction {
    return dbClient || this.knexClient;
  }

  private returningColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'channel',
      'requested_at_utc',
      'requested_window_start_utc',
      'requested_window_end_utc',
      'schedule_mode',
      'notes',
      'status',
      'commitment_id',
      'refusal_reason_code',
      'refusal_message',
      'refusal_alternatives',
      'refusal_next_steps',
      'created_by_user_id',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  async createAccepted(
    input: CreateAcceptedIntakeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord> {
    const client = this.resolveClient(dbClient);
    const commitmentId = input.commitmentId.trim();
    if (!commitmentId) {
      throw new Error('ROUTE_REQUEST_COMMITMENT_LINKAGE_REQUIRED');
    }

    const [inserted] = await client
      .withSchema('route')
      .table('intake_requests')
      .insert({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        channel: input.channel,
        requested_at_utc: input.requestedAtUtc,
        requested_window_start_utc: input.requestedWindowStartUtc,
        requested_window_end_utc: input.requestedWindowEndUtc,
        schedule_mode: input.scheduleMode,
        notes: input.notes,
        status: 'Accepted',
        commitment_id: commitmentId,
        refusal_reason_code: null,
        refusal_message: null,
        refusal_alternatives: null,
        refusal_next_steps: null,
        created_by_user_id: input.createdByUserId,
        created_at_utc: client.fn.now(),
        updated_at_utc: client.fn.now(),
      })
      .returning(this.returningColumns());

    return mapRecord(inserted as Record<string, unknown>);
  }

  async createRefused(
    input: CreateRefusedIntakeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord> {
    const client = this.resolveClient(dbClient);
    const [inserted] = await client
      .withSchema('route')
      .table('intake_requests')
      .insert({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        channel: input.channel,
        requested_at_utc: input.requestedAtUtc,
        requested_window_start_utc: input.requestedWindowStartUtc,
        requested_window_end_utc: input.requestedWindowEndUtc,
        schedule_mode: input.scheduleMode,
        notes: input.notes,
        status: 'Refused',
        commitment_id: null,
        refusal_reason_code: input.refusal.reasonCode,
        refusal_message: input.refusal.message,
        refusal_alternatives: JSON.stringify(input.refusal.alternatives || []),
        refusal_next_steps: input.refusal.nextSteps,
        created_by_user_id: input.createdByUserId,
        created_at_utc: client.fn.now(),
        updated_at_utc: client.fn.now(),
      })
      .returning(this.returningColumns());

    return mapRecord(inserted as Record<string, unknown>);
  }

  async getById(
    tenantId: string,
    orgUnitId: string,
    requestId: string,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord | null> {
    const client = this.resolveClient(dbClient);
    const row = await client
      .withSchema('route')
      .table('intake_requests')
      .where({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        id: requestId,
      })
      .first(this.returningColumns());

    if (!row) {
      return null;
    }

    return mapRecord(row as Record<string, unknown>);
  }

  async listUnresolved(
    input: ListUnresolvedIntakeInput,
    dbClient?: Knex | Knex.Transaction,
  ): Promise<RouteIntakeRecord[]> {
    const client = this.resolveClient(dbClient);
    const query = client
      .withSchema('route')
      .table('intake_requests')
      .where({
        tenant_id: input.tenantId,
        status: 'Accepted',
      })
      .whereNull('commitment_id');

    if (input.orgUnitId) {
      query.andWhere('org_unit_id', input.orgUnitId);
    }

    const rows = await query
      .orderBy('updated_at_utc', 'asc')
      .select(this.returningColumns());

    return rows.map((row) => mapRecord(row as Record<string, unknown>));
  }
}
