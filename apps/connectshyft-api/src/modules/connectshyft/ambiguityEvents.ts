import { randomUUID } from 'node:crypto';
import type {
  ConnectShyftIdentityAmbiguityEvent,
  ConnectShyftIdentityAmbiguityConsumptionOutcome,
  ConnectShyftIdentityAmbiguityReasonCode,
  ConnectShyftIdentityAmbiguityStatus,
  ConnectShyftResolverOutcomeAudit,
} from '@shyft/contracts';
import {
  isConnectShyftIdentityAmbiguityStatus,
  isConnectShyftIdentityAmbiguityTerminalStatus,
} from '@shyft/contracts';
import type { Knex } from 'knex';
import db from '../../config/knex';

export type {
  ConnectShyftIdentityAmbiguityEvent,
  ConnectShyftIdentityAmbiguityReasonCode,
} from '@shyft/contracts';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const AMBIGUITY_EVENTS_TABLE = 'cs_identity_ambiguity_events';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

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
  resolverReviewId?: string | null;
  resolverConsumedByUserId?: string | null;
  resolverConsumedAtUtc?: string | null;
  resolverOutcome?: ConnectShyftResolverOutcomeAudit | null;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type ListIdentityAmbiguityEventsInput = {
  tenantId: string;
  orgUnitId?: string | null;
  status?: ConnectShyftIdentityAmbiguityStatus | null;
  normalizedContactPoint?: string | null;
  sourceContext?: string | null;
  sourceContextId?: string | null;
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

export type GetIdentityAmbiguityEventInput = {
  tenantId: string;
  ambiguityEventId: string;
};

export type ConsumeAmbiguityEventsForResolverOutcomeInput = {
  tenantId: string;
  resolverReviewId: string;
  triggerSourceId?: string | null;
  ambiguityEventId?: string | null;
  outcome: ConnectShyftIdentityAmbiguityConsumptionOutcome;
  consumedByUserId: string;
  consumedAtUtc?: string;
  resolverOutcome: ConnectShyftResolverOutcomeAudit;
};

export type ConsumeIdentityAmbiguityEventInput = {
  tenantId: string;
  ambiguityEventId: string;
  outcome: ConnectShyftIdentityAmbiguityConsumptionOutcome;
  resolverReviewId: string;
  consumedByUserId: string;
  consumedAtUtc?: string;
  resolverOutcome: ConnectShyftResolverOutcomeAudit;
};

export type AmbiguityConsumptionResult = {
  events: ConnectShyftIdentityAmbiguityEvent[];
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
  resolver_review_id: string | null;
  resolver_consumed_by_user_id: string | null;
  resolver_consumed_at_utc: string | Date | null;
  resolver_outcome: ConnectShyftResolverOutcomeAudit | null;
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
  getEvent(
    input: GetIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null>;
  markReviewed(
    input: MarkIdentityAmbiguityEventReviewedInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null>;
  consumeEvent(
    input: ConsumeIdentityAmbiguityEventInput,
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
  return isConnectShyftIdentityAmbiguityStatus(value) ? value : 'pending';
};

const normalizeResolverOutcome = (
  value: unknown,
): ConnectShyftResolverOutcomeAudit | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const reviewId = normalizeOptionalString(candidate.reviewId);
  const action = normalizeOptionalString(candidate.action);
  const reviewStatus = normalizeOptionalString(candidate.reviewStatus);
  const actorUserId = normalizeOptionalString(candidate.actorUserId);
  const occurredAtUtc = normalizeOptionalString(candidate.occurredAtUtc);
  if (!reviewId || !action || !reviewStatus || !actorUserId || !occurredAtUtc) {
    return null;
  }

  return {
    reviewId,
    action: action as ConnectShyftResolverOutcomeAudit['action'],
    reviewStatus: reviewStatus as ConnectShyftResolverOutcomeAudit['reviewStatus'],
    actorUserId,
    occurredAtUtc,
    reason: normalizeOptionalString(candidate.reason),
    notes: normalizeOptionalString(candidate.notes),
    personId: normalizeOptionalString(candidate.personId),
    sourcePersonId: normalizeOptionalString(candidate.sourcePersonId),
    targetPersonId: normalizeOptionalString(candidate.targetPersonId),
    contactPointId: normalizeOptionalString(candidate.contactPointId),
  };
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
  resolverOutcome: event.resolverOutcome
    ? { ...event.resolverOutcome }
    : null,
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
  resolverReviewId: normalizeOptionalString(row.resolver_review_id),
  resolverConsumedByUserId: normalizeOptionalString(row.resolver_consumed_by_user_id),
  resolverConsumedAtUtc: row.resolver_consumed_at_utc instanceof Date
    ? row.resolver_consumed_at_utc.toISOString()
    : normalizeOptionalString(row.resolver_consumed_at_utc),
  resolverOutcome: normalizeResolverOutcome(row.resolver_outcome),
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
    resolverReviewId: normalizeOptionalString(input.resolverReviewId),
    resolverConsumedByUserId: normalizeOptionalString(input.resolverConsumedByUserId),
    resolverConsumedAtUtc: input.resolverConsumedAtUtc
      ? toIsoUtc(input.resolverConsumedAtUtc)
      : null,
    resolverOutcome: normalizeResolverOutcome(input.resolverOutcome),
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
    const sourceContextId = normalizeOptionalString(input.sourceContextId);
    const cursor = decodeCursor(input.cursor);
    const limit = normalizeLimit(input.limit);

    const filtered = Array.from(this.eventsById.values())
      .filter((event) => event.tenantId === input.tenantId)
      .filter((event) => !orgUnitId || event.orgUnitId === orgUnitId)
      .filter((event) => !status || event.status === status)
      .filter((event) => !normalizedContactPoint || event.normalizedContactPoint === normalizedContactPoint)
      .filter((event) => !sourceContext || event.sourceContext === sourceContext)
      .filter((event) => !sourceContextId || event.sourceContextId === sourceContextId)
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

  async getEvent(
    input: GetIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    const existing = this.eventsById.get(input.ambiguityEventId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return null;
    }

    return cloneEvent(existing);
  }

  async markReviewed(
    input: MarkIdentityAmbiguityEventReviewedInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    const existing = this.eventsById.get(input.ambiguityEventId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return null;
    }

    if (existing.status !== 'pending') {
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

  async consumeEvent(
    input: ConsumeIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    const existing = this.eventsById.get(input.ambiguityEventId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return null;
    }

    const consumedAtUtc = input.consumedAtUtc
      ? toIsoUtc(input.consumedAtUtc)
      : new Date().toISOString();
    const normalizedOutcome = normalizeResolverOutcome(input.resolverOutcome);
    if (!normalizedOutcome) {
      return cloneEvent(existing);
    }

    if (existing.status === input.outcome) {
      if (existing.resolverReviewId === input.resolverReviewId) {
        return cloneEvent(existing);
      }

      return cloneEvent(existing);
    }

    if (
      isConnectShyftIdentityAmbiguityTerminalStatus(existing.status)
      && existing.status !== 'reviewed'
    ) {
      return cloneEvent(existing);
    }

    const updated: ConnectShyftIdentityAmbiguityEvent = {
      ...existing,
      status: input.outcome,
      resolverReviewId: input.resolverReviewId,
      resolverConsumedByUserId: input.consumedByUserId,
      resolverConsumedAtUtc: consumedAtUtc,
      resolverOutcome: normalizedOutcome,
      updatedAtUtc: consumedAtUtc,
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
        resolver_review_id: event.resolverReviewId,
        resolver_consumed_by_user_id: event.resolverConsumedByUserId,
        resolver_consumed_at_utc: event.resolverConsumedAtUtc,
        resolver_outcome: event.resolverOutcome,
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
    const sourceContextId = normalizeOptionalString(input.sourceContextId);
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
    if (sourceContextId) {
      query.andWhere('source_context_id', sourceContextId);
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

  async getEvent(
    input: GetIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    const existing = await this.table()
      .where({
        tenant_id: input.tenantId,
        id: input.ambiguityEventId,
      })
      .first();

    return existing ? mapDbRowToEvent(existing) : null;
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

    if (existing.status !== 'pending') {
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

  async consumeEvent(
    input: ConsumeIdentityAmbiguityEventInput,
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

    if (existing.status === input.outcome && existing.resolver_review_id === input.resolverReviewId) {
      return mapDbRowToEvent(existing);
    }

    if (
      isConnectShyftIdentityAmbiguityTerminalStatus(existing.status)
      && existing.status !== 'reviewed'
    ) {
      return mapDbRowToEvent(existing);
    }

    const consumedAtUtc = input.consumedAtUtc
      ? toIsoUtc(input.consumedAtUtc)
      : new Date().toISOString();
    const normalizedOutcome = normalizeResolverOutcome(input.resolverOutcome);

    const updatedRows = await this.table()
      .where({
        tenant_id: input.tenantId,
        id: input.ambiguityEventId,
      })
      .update({
        status: input.outcome,
        resolver_review_id: input.resolverReviewId,
        resolver_consumed_by_user_id: input.consumedByUserId,
        resolver_consumed_at_utc: consumedAtUtc,
        resolver_outcome: normalizedOutcome,
        updated_at_utc: consumedAtUtc,
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

  async getIdentityAmbiguityEvent(
    input: GetIdentityAmbiguityEventInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    return this.resolveStore({
      tenantId: input.tenantId,
      ambiguityEventId: input.ambiguityEventId,
    }).getEvent(input);
  }

  async markIdentityAmbiguityEventReviewed(
    input: MarkIdentityAmbiguityEventReviewedInput,
  ): Promise<ConnectShyftIdentityAmbiguityEvent | null> {
    return this.resolveStore({
      tenantId: input.tenantId,
      ambiguityEventId: input.ambiguityEventId,
    }).markReviewed(input);
  }

  async consumeAmbiguityEventsForResolverOutcome(
    input: ConsumeAmbiguityEventsForResolverOutcomeInput,
  ): Promise<AmbiguityConsumptionResult> {
    const store = this.resolveStore({
      tenantId: input.tenantId,
      ambiguityEventId: input.ambiguityEventId,
    });
    const consumedEvents = new Map<string, ConnectShyftIdentityAmbiguityEvent>();

    if (input.triggerSourceId) {
      const linked = await store.listEvents({
        tenantId: input.tenantId,
        sourceContextId: input.triggerSourceId,
        limit: MAX_LIST_LIMIT,
      });

      linked.events
        .filter((event) => event.status === 'pending' || event.resolverReviewId === input.resolverReviewId)
        .forEach((event) => {
          consumedEvents.set(event.id, event);
        });
    }

    if (input.ambiguityEventId) {
      const explicit = await store.getEvent({
        tenantId: input.tenantId,
        ambiguityEventId: input.ambiguityEventId,
      });
      if (explicit) {
        consumedEvents.set(explicit.id, explicit);
      }
    }

    const events = await Promise.all(
      Array.from(consumedEvents.values()).map(async (event) => store.consumeEvent({
        tenantId: input.tenantId,
        ambiguityEventId: event.id,
        outcome: input.outcome,
        resolverReviewId: input.resolverReviewId,
        consumedByUserId: input.consumedByUserId,
        consumedAtUtc: input.consumedAtUtc,
        resolverOutcome: input.resolverOutcome,
      })),
    );

    return {
      events: events.filter((event): event is ConnectShyftIdentityAmbiguityEvent => Boolean(event)),
    };
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

export const getIdentityAmbiguityEvent = (
  input: GetIdentityAmbiguityEventInput,
): Promise<ConnectShyftIdentityAmbiguityEvent | null> =>
  defaultConnectShyftIdentityAmbiguityEventService.getIdentityAmbiguityEvent(input);

export const consumeAmbiguityEventsForResolverOutcome = (
  input: ConsumeAmbiguityEventsForResolverOutcomeInput,
): Promise<AmbiguityConsumptionResult> =>
  defaultConnectShyftIdentityAmbiguityEventService.consumeAmbiguityEventsForResolverOutcome(input);

export const resetIdentityAmbiguityEventsForTests = (): void => {
  inMemoryConnectShyftIdentityAmbiguityEventStore.reset();
};
