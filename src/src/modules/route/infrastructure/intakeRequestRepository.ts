import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import type { RouteIntakeChannel, RouteScheduleMode } from '../domain/intakePolicy';
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

export interface IntakeRequestRepository {
  createAccepted(input: CreateAcceptedIntakeInput): Promise<RouteIntakeRecord>;
  createRefused(input: CreateRefusedIntakeInput): Promise<RouteIntakeRecord>;
  getById(tenantId: string, orgUnitId: string, requestId: string): Promise<RouteIntakeRecord | null>;
}

export class InMemoryIntakeRequestRepository implements IntakeRequestRepository {
  private readonly requestsById = new Map<string, RouteIntakeRecord>();

  async createAccepted(input: CreateAcceptedIntakeInput): Promise<RouteIntakeRecord> {
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
      commitmentId: input.commitmentId,
      refusal: null,
      createdByUserId: input.createdByUserId,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.requestsById.set(requestId, record);

    return { ...record };
  }

  async createRefused(input: CreateRefusedIntakeInput): Promise<RouteIntakeRecord> {
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
      commitmentId: null,
      refusal: input.refusal,
      createdByUserId: input.createdByUserId,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.requestsById.set(requestId, record);

    return { ...record };
  }

  async getById(tenantId: string, orgUnitId: string, requestId: string): Promise<RouteIntakeRecord | null> {
    const record = this.requestsById.get(requestId);
    if (!record || record.tenantId !== tenantId || record.orgUnitId !== orgUnitId) {
      return null;
    }

    return { ...record };
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

const mapRecord = (row: Record<string, unknown>): RouteIntakeRecord => ({
  requestId: String(row.id),
  tenantId: String(row.tenant_id),
  orgUnitId: String(row.org_unit_id),
  channel: String(row.channel) as RouteIntakeChannel,
  requestedAtUtc: toIsoUtc(row.requested_at_utc),
  requestedWindowStartUtc: toIsoUtc(row.requested_window_start_utc),
  requestedWindowEndUtc: toIsoUtc(row.requested_window_end_utc),
  scheduleMode: String(row.schedule_mode) as RouteScheduleMode,
  notes: row.notes ? String(row.notes) : '',
  status: String(row.status) as RouteIntakeStatus,
  commitmentId: row.commitment_id ? String(row.commitment_id) : null,
  refusal: normalizeRefusal(row),
  createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
  createdAtUtc: toIsoUtc(row.created_at_utc),
  updatedAtUtc: toIsoUtc(row.updated_at_utc),
});

export class KnexIntakeRequestRepository implements IntakeRequestRepository {
  constructor(private readonly knexClient: Knex = knex) {}

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

  async createAccepted(input: CreateAcceptedIntakeInput): Promise<RouteIntakeRecord> {
    const [inserted] = await this.knexClient
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
        commitment_id: input.commitmentId,
        refusal_reason_code: null,
        refusal_message: null,
        refusal_alternatives: null,
        refusal_next_steps: null,
        created_by_user_id: input.createdByUserId,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning(this.returningColumns());

    return mapRecord(inserted as Record<string, unknown>);
  }

  async createRefused(input: CreateRefusedIntakeInput): Promise<RouteIntakeRecord> {
    const [inserted] = await this.knexClient
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
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning(this.returningColumns());

    return mapRecord(inserted as Record<string, unknown>);
  }

  async getById(tenantId: string, orgUnitId: string, requestId: string): Promise<RouteIntakeRecord | null> {
    const row = await this.knexClient
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
}
