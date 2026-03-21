import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../config/knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const AMBIGUITY_EVENTS_TABLE = 'cs_identity_ambiguity_events';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

export type ConnectShyftIdentityAmbiguityReasonCode =
  | 'IDENTITY_MATCH_AMBIGUOUS'
  | 'PEOPLECORE_LEGACY_DISAGREEMENT'
  | 'PEOPLECORE_MULTI_CURRENT_LINKS';

export type ConnectShyftIdentityAmbiguityStatus = 'pending' | 'reviewed';

export type ConnectShyftIdentityAmbiguityEvent = {
  id: string;
  tenantId: string;
  orgUnitId: string | null;
  sourceContext: string;
  sourceContextId: string | null;
  normalizedContactPoint: string;
  contactPointType: 'phone';
  candidateNeighborIds: string[];
  candidateCount: number;
  ambiguityReasonCode: ConnectShyftIdentityAmbiguityReasonCode;
  status: ConnectShyftIdentityAmbiguityStatus;
  requestedByUserId: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateIdentityAmbiguityEventInput = {
  id?: string;
  tenantId: string;
  orgUnitId?: string | null;
  sourceContext: string;
  sourceContextId?: string | null;
  normalizedContactPoint: string;
  contactPointType?: 'phone';
  candidateNeighborIds: string[];
  candidateCount?: number;
  ambiguityReasonCode: ConnectShyftIdentityAmbiguityReasonCode;
  status?: ConnectShyftIdentityAmbiguityStatus;
  requestedByUserId?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type ListIdentityAmbiguityEventsInput = {
  tenantId: string;
  orgUnitId?: string | null;
  status?: ConnectShyftIdentityAmbiguityStatus | null;
  normalizedContactPoint?: string | null;
  sourceContext?: string | null;
  limit?: number;
  cursor?: string | null;
};

export type ListIdentityAmbiguityEventsResult = {
  events: ConnectShyftIdentityAmbiguityEvent[];
  nextCursor: string | null;
};

export type MarkIdentityAmbiguityEventReviewedInput = {
  tenantId: string;
  ambiguityEventId: string;
  reviewedAtUtc?: string;
};

type DbIdentityAmbiguityEventRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string | null;
  source_context: string;
  source_context_id: string | null;
  normalized_contact_point: string;
  contact_point_type: 'phone';
  candidate_neighbor_ids: unknown;
  candidate_count: number;
  ambiguity_reason_code: ConnectShyftIdentityAmbiguityReasonCode;
  status: ConnectShyftIdentityAmbiguityStatus;
  requested_by_user_id: string | null;
  correlation_id: string | null;
  idempotency_key: string | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type IdentityAmbiguityEventCursor = {
  createdAtUtc: string;
  id: string;
};

export interface ConnectShyftIdentityAmbiguityEventStore {
  createEvent(
    input: CreateIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent>;
  listEvents(
    input: ListIdentityAmbiguityEventsInput,
  ): Promise<ListIdentityAmbiguityEventsResult>;
  markReviewed(
    input: MarkIdentityAmbiguityEventReviewedInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null>;
}

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeContactPointType = (value: unknown): 'phone' => {
  return value === 'phone' ? 'phone' : 'phone';
};

const normalizeStatus = (value: unknown): ConnectShyftIdentityAmbiguityStatus => {
  return value === 'reviewed' ? 'reviewed' : 'pending';
};

const normalizeLimit = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_LIST_LIMIT;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(normalized, MAX_LIST_LIMIT);
};

const toIsoUtc = (value?: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return new Date().toISOString();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const cloneEvent = (
  event: ConnectShyftIdentityAmbiguityEvent,
): ConnectShyftIdentityAmbiguityEvent => ({
  ...event,
  candidateNeighborIds: [...event.candidateNeighborIds],
});

const compareEventsNewestFirst = (
  left: ConnectShyftIdentityAmbiguityEvent,
  right: ConnectShyftIdentityAmbiguityEvent,
): number => {
  const createdAtDelta = new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime();
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return right.id.localeCompare(left.id);
};

const encodeCursor = (cursor: IdentityAmbiguityEventCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');

const decodeCursor = (value: string | null | undefined): IdentityAmbiguityEventCursor | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as {
      createdAtUtc?: unknown;
      id?: unknown;
    };
    const createdAtUtc = normalizeOptionalString(decoded.createdAtUtc);
    const id = normalizeOptionalString(decoded.id);
    if (!createdAtUtc || !id) {
      return null;
    }

    return {
      createdAtUtc,
      id,
    };
  } catch (_error) {
    return null;
  }
};

const isAfterCursor = (
  event: ConnectShyftIdentityAmbiguityEvent,
  cursor: IdentityAmbiguityEventCursor | null,
): boolean => {
  if (!cursor) {
    return true;
  }

  if (event.createdAtUtc < cursor.createdAtUtc) {
    return true;
  }

  if (event.createdAtUtc > cursor.createdAtUtc) {
    return false;
  }

  return event.id.localeCompare(cursor.id) < 0;
};

const isUuid = (value: string | null | undefined): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

const shouldUseInMemoryStore = (input: {
  tenantId: string;
  orgUnitId?: string | null;
  ambiguityEventId?: string | null;
}): boolean => {
  const orgUnitId = normalizeOptionalString(input.orgUnitId);
  const ambiguityEventId = normalizeOptionalString(input.ambiguityEventId);

  return !isUuid(input.tenantId)
    || Boolean(orgUnitId && !isUuid(orgUnitId))
    || Boolean(ambiguityEventId && !isUuid(ambiguityEventId));
};

const parseCandidateNeighborIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeOptionalString(entry))
      .filter((entry): entry is string => !!entry);
  }

  if (typeof value === 'string') {
    try {
      return parseCandidateNeighborIds(JSON.parse(value));
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const mapDbRowToEvent = (
  row: DbIdentityAmbiguityEventRow,
): ConnectShyftIdentityAmbiguityEvent => ({
  id: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  sourceContext: row.source_context,
  sourceContextId: row.source_context_id,
  normalizedContactPoint: row.normalized_contact_point,
  contactPointType: row.contact_point_type,
  candidateNeighborIds: parseCandidateNeighborIds(row.candidate_neighbor_ids),
  candidateCount: row.candidate_count,
  ambiguityReasonCode: row.ambiguity_reason_code,
  status: row.status,
  requestedByUserId: row.requested_by_user_id,
  correlationId: row.correlation_id,
  idempotencyKey: row.idempotency_key,
  createdAtUtc: row.created_at_utc instanceof Date
    ? row.created_at_utc.toISOString()
    : String(row.created_at_utc),
  updatedAtUtc: row.updated_at_utc instanceof Date
    ? row.updated_at_utc.toISOString()
    : String(row.updated_at_utc),
});

const buildStoredEvent = (
  input: CreateIdentityAmbiguityEventInput,
): ConnectShyftIdentityAmbiguityEvent => {
  const createdAtUtc = input.createdAtUtc ? toIsoUtc(input.createdAtUtc) : new Date().toISOString();
  const updatedAtUtc = input.updatedAtUtc ? toIsoUtc(input.updatedAtUtc) : createdAtUtc;
  const candidateNeighborIds = [...input.candidateNeighborIds];

  return {
    id: normalizeOptionalString(input.id) || randomUUID(),
    tenantId: input.tenantId,
    orgUnitId: normalizeOptionalString(input.orgUnitId),
    sourceContext: normalizeString(input.sourceContext),
    sourceContextId: normalizeOptionalString(input.sourceContextId),
    normalizedContactPoint: normalizeString(input.normalizedContactPoint),
    contactPointType: normalizeContactPointType(input.contactPointType),
    candidateNeighborIds,
    candidateCount: candidateNeighborIds.length,
    ambiguityReasonCode: input.ambiguityReasonCode,
    status: normalizeStatus(input.status),
    requestedByUserId: normalizeOptionalString(input.requestedByUserId),
    correlationId: normalizeOptionalString(input.correlationId),
    idempotencyKey: normalizeOptionalString(input.idempotencyKey),
    createdAtUtc,
    updatedAtUtc,
  };
};

export class InMemoryConnectShyftIdentityAmbiguityEventStore
implements ConnectShyftIdentityAmbiguityEventStore {
  private eventsById = new Map<string, ConnectShyftIdentityAmbiguityEvent>();

  async createEvent(
    input: CreateIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent> {
    const event = buildStoredEvent(input);
    this.eventsById.set(event.id, event);
    return cloneEvent(event);
  }

  async listEvents(
    input: ListIdentityAmbiguityEventsInput,
  ): Promise<ListIdentityAmbiguityEventsResult> {
    const orgUnitId = normalizeOptionalString(input.orgUnitId);
    const status = normalizeOptionalString(input.status);
    const normalizedContactPoint = normalizeOptionalString(input.normalizedContactPoint);
    const sourceContext = normalizeOptionalString(input.sourceContext);
    const cursor = decodeCursor(input.cursor);
    const limit = normalizeLimit(input.limit);

    const filtered = Array.from(this.eventsById.values())
      .filter((event) => event.tenantId === input.tenantId)
      .filter((event) => !orgUnitId || event.orgUnitId === orgUnitId)
      .filter((event) => !status || event.status === status)
      .filter((event) => !normalizedContactPoint || event.normalizedContactPoint === normalizedContactPoint)
      .filter((event) => !sourceContext || event.sourceContext === sourceContext)
      .filter((event) => isAfterCursor(event, cursor))
      .sort(compareEventsNewestFirst);

    const page = filtered.slice(0, limit + 1);
    const hasMore = page.length > limit;
    const events = page.slice(0, limit).map((event) => cloneEvent(event));
    const lastEvent = events[events.length - 1];

    return {
      events,
      nextCursor: hasMore && lastEvent
        ? encodeCursor({
          createdAtUtc: lastEvent.createdAtUtc,
          id: lastEvent.id,
        })
        : null,
    };
  }

  async markReviewed(
    input: MarkIdentityAmbiguityEventReviewedInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    const existing = this.eventsById.get(input.ambiguityEventId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return null;
    }

    if (existing.status === 'reviewed') {
      return cloneEvent(existing);
    }

    const updated: ConnectShyftIdentityAmbiguityEvent = {
      ...existing,
      status: 'reviewed',
      updatedAtUtc: input.reviewedAtUtc ? toIsoUtc(input.reviewedAtUtc) : new Date().toISOString(),
    };
    this.eventsById.set(updated.id, updated);
    return cloneEvent(updated);
  }

  reset(): void {
    this.eventsById.clear();
  }
}

export class KnexConnectShyftIdentityAmbiguityEventStore
implements ConnectShyftIdentityAmbiguityEventStore {
  constructor(private readonly resolveDb: () => Knex) {}

  private table() {
    return this.resolveDb()
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table<DbIdentityAmbiguityEventRow>(AMBIGUITY_EVENTS_TABLE);
  }

  async createEvent(
    input: CreateIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent> {
    const event = buildStoredEvent(input);

    const insertedRows = await this.table()
      .insert({
        id: event.id,
        tenant_id: event.tenantId,
        org_unit_id: event.orgUnitId,
        source_context: event.sourceContext,
        source_context_id: event.sourceContextId,
        normalized_contact_point: event.normalizedContactPoint,
        contact_point_type: event.contactPointType,
        candidate_neighbor_ids: event.candidateNeighborIds,
        candidate_count: event.candidateCount,
        ambiguity_reason_code: event.ambiguityReasonCode,
        status: event.status,
        requested_by_user_id: event.requestedByUserId,
        correlation_id: event.correlationId,
        idempotency_key: event.idempotencyKey,
        created_at_utc: event.createdAtUtc,
        updated_at_utc: event.updatedAtUtc,
      })
      .returning('*');

    const inserted = insertedRows[0];
    return inserted ? mapDbRowToEvent(inserted) : event;
  }

  async listEvents(
    input: ListIdentityAmbiguityEventsInput,
  ): Promise<ListIdentityAmbiguityEventsResult> {
    const orgUnitId = normalizeOptionalString(input.orgUnitId);
    const status = normalizeOptionalString(input.status);
    const normalizedContactPoint = normalizeOptionalString(input.normalizedContactPoint);
    const sourceContext = normalizeOptionalString(input.sourceContext);
    const cursor = decodeCursor(input.cursor);
    const limit = normalizeLimit(input.limit);

    const query = this.table()
      .where({
        tenant_id: input.tenantId,
      })
      .orderBy('created_at_utc', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1);

    if (orgUnitId) {
      query.andWhere('org_unit_id', orgUnitId);
    }
    if (status) {
      query.andWhere('status', status);
    }
    if (normalizedContactPoint) {
      query.andWhere('normalized_contact_point', normalizedContactPoint);
    }
    if (sourceContext) {
      query.andWhere('source_context', sourceContext);
    }
    if (cursor) {
      query.andWhere((builder) => {
        builder
          .where('created_at_utc', '<', cursor.createdAtUtc)
          .orWhere((nestedBuilder) => {
            nestedBuilder
              .where('created_at_utc', '=', cursor.createdAtUtc)
              .andWhere('id', '<', cursor.id);
          });
      });
    }

    const rows = await query.select('*');
    const mapped = rows.map((row) => mapDbRowToEvent(row));
    const hasMore = mapped.length > limit;
    const events = mapped.slice(0, limit);
    const lastEvent = events[events.length - 1];

    return {
      events,
      nextCursor: hasMore && lastEvent
        ? encodeCursor({
          createdAtUtc: lastEvent.createdAtUtc,
          id: lastEvent.id,
        })
        : null,
    };
  }

  async markReviewed(
    input: MarkIdentityAmbiguityEventReviewedInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    const existing = await this.table()
      .where({
        tenant_id: input.tenantId,
        id: input.ambiguityEventId,
      })
      .first();

    if (!existing) {
      return null;
    }

    if (existing.status === 'reviewed') {
      return mapDbRowToEvent(existing);
    }

    const updatedRows = await this.table()
      .where({
        tenant_id: input.tenantId,
        id: input.ambiguityEventId,
      })
      .update({
        status: 'reviewed',
        updated_at_utc: input.reviewedAtUtc ? toIsoUtc(input.reviewedAtUtc) : new Date().toISOString(),
      })
      .returning('*');

    const updated = updatedRows[0];
    return updated ? mapDbRowToEvent(updated) : mapDbRowToEvent(existing);
  }
}

export class AsyncConnectShyftIdentityAmbiguityEventService {
  constructor(
    private readonly primaryStore: ConnectShyftIdentityAmbiguityEventStore,
    private readonly fallbackStore: ConnectShyftIdentityAmbiguityEventStore | null = null,
  ) {}

  private resolveStore(input: {
    tenantId: string;
    orgUnitId?: string | null;
    ambiguityEventId?: string | null;
  }): ConnectShyftIdentityAmbiguityEventStore {
    if (this.fallbackStore && shouldUseInMemoryStore(input)) {
      return this.fallbackStore;
    }

    return this.primaryStore;
  }

  async createIdentityAmbiguityEvent(
    input: CreateIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent> {
    return this.resolveStore({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
    }).createEvent(input);
  }

  async listIdentityAmbiguityEvents(
    input: ListIdentityAmbiguityEventsInput,
  ): Promise<ListIdentityAmbiguityEventsResult> {
    return this.resolveStore({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
    }).listEvents(input);
  }

  async markIdentityAmbiguityEventReviewed(
    input: MarkIdentityAmbiguityEventReviewedInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    return this.resolveStore({
      tenantId: input.tenantId,
      ambiguityEventId: input.ambiguityEventId,
    }).markReviewed(input);
  }
}

const inMemoryConnectShyftIdentityAmbiguityEventStore =
  new InMemoryConnectShyftIdentityAmbiguityEventStore();
const knexConnectShyftIdentityAmbiguityEventStore =
  new KnexConnectShyftIdentityAmbiguityEventStore(() => db);
const defaultConnectShyftIdentityAmbiguityEventService =
  new AsyncConnectShyftIdentityAmbiguityEventService(
    knexConnectShyftIdentityAmbiguityEventStore,
    inMemoryConnectShyftIdentityAmbiguityEventStore,
  );

export const createIdentityAmbiguityEvent = (
  input: CreateIdentityAmbiguityEventInput,
): Promise<ConnectShyftIdentityAmbiguityEvent> =>
  defaultConnectShyftIdentityAmbiguityEventService.createIdentityAmbiguityEvent(input);

export const listIdentityAmbiguityEvents = (
  input: ListIdentityAmbiguityEventsInput,
): Promise<ListIdentityAmbiguityEventsResult> =>
  defaultConnectShyftIdentityAmbiguityEventService.listIdentityAmbiguityEvents(input);

export const markIdentityAmbiguityEventReviewed = (
  input: MarkIdentityAmbiguityEventReviewedInput,
): Promise<ConnectShyftIdentityAmbiguityEvent | null> =>
  defaultConnectShyftIdentityAmbiguityEventService.markIdentityAmbiguityEventReviewed(input);

export const resetIdentityAmbiguityEventsForTests = (): void => {
  inMemoryConnectShyftIdentityAmbiguityEventStore.reset();
};
