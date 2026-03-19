import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import { executePlatformMutation } from '../../platform/mutations/executePlatformMutation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONNECTSHYFT_CANONICAL_EVENT_NAME = 'connectshyft.canonical.event_recorded';
const MAX_LIST_LIMIT = 200;
const DEFAULT_LIST_LIMIT = 50;
const MAX_IN_MEMORY_EVENT_RECORDS = 1000;

export type ConnectShyftCanonicalAggregateType = 'Thread';

export type ConnectShyftCanonicalEventRecord = {
  eventId: string;
  aggregateId: string;
  aggregateType: ConnectShyftCanonicalAggregateType;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAtUtc: string;
};

type ConnectShyftStoredCanonicalEvent = {
  tenantId: string;
  orgUnitId: string | null;
  record: ConnectShyftCanonicalEventRecord;
};

export type ConnectShyftCanonicalEventInput = {
  tenantId: string;
  orgUnitId: string | null;
  aggregateId: string;
  aggregateType: ConnectShyftCanonicalAggregateType;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAtUtc?: string;
  actorUserId?: string | null;
};

export type ConnectShyftCanonicalEventListFilters = {
  tenantId: string;
  orgUnitId?: string | null;
  aggregateId?: string | null;
  aggregateType?: string | null;
  eventType?: string | null;
  limit?: number;
  window?: 'oldest' | 'most_recent';
};

const CONNECTSHYFT_PROVIDER_SPECIFIC_KEYS = new Set([
  'providerLegId',
  'providerMessageId',
  'providerPayload',
  'providerName',
  'providerKey',
  'providerEventId',
  'providerNumber',
  'providerNumberE164',
]);

const inMemoryCanonicalEvents: ConnectShyftStoredCanonicalEvent[] = [];

const recordInMemoryFallbackEvent = (event: ConnectShyftStoredCanonicalEvent): void => {
  inMemoryCanonicalEvents.push(event);
  if (inMemoryCanonicalEvents.length > MAX_IN_MEMORY_EVENT_RECORDS) {
    const overflow = inMemoryCanonicalEvents.length - MAX_IN_MEMORY_EVENT_RECORDS;
    inMemoryCanonicalEvents.splice(0, overflow);
  }
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
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

const normalizeWindow = (value: unknown): 'oldest' | 'most_recent' => {
  return value === 'most_recent' ? 'most_recent' : 'oldest';
};

const sortCanonicalEvents = (
  entries: readonly ConnectShyftCanonicalEventRecord[],
): ConnectShyftCanonicalEventRecord[] => {
  return [...entries].sort((left, right) => {
    const occurredAtDelta = (
      new Date(left.occurredAtUtc).getTime()
      - new Date(right.occurredAtUtc).getTime()
    );
    if (occurredAtDelta !== 0) {
      return occurredAtDelta;
    }

    return left.eventId.localeCompare(right.eventId);
  });
};

const sanitizePayloadValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePayloadValue(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
    if (
      CONNECTSHYFT_PROVIDER_SPECIFIC_KEYS.has(key)
      || key.toLowerCase().startsWith('provider')
    ) {
      return;
    }

    sanitized[key] = sanitizePayloadValue(entryValue);
  });

  return sanitized;
};

export const sanitizeConnectShyftCanonicalPayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  return sanitizePayloadValue(payload) as Record<string, unknown>;
};

const isUuid = (value: string | null | undefined): value is string => {
  return typeof value === 'string' && UUID_PATTERN.test(value);
};

const toStoredRecord = (
  input: ConnectShyftCanonicalEventInput,
): ConnectShyftStoredCanonicalEvent => {
  const occurredAtUtc = normalizeString(input.occurredAtUtc) || new Date().toISOString();
  return {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    record: {
      eventId: randomUUID(),
      aggregateId: input.aggregateId,
      aggregateType: input.aggregateType,
      eventType: input.eventType,
      payload: sanitizeConnectShyftCanonicalPayload(input.payload),
      occurredAtUtc,
    },
  };
};

const shouldUseDb = (
  input: ConnectShyftCanonicalEventInput | ConnectShyftCanonicalEventListFilters,
  db?: Knex,
): boolean => {
  const aggregateIdCandidate = normalizeString(input.aggregateId);
  return Boolean(
    db
    && isUuid(input.tenantId)
    && (!aggregateIdCandidate || isUuid(aggregateIdCandidate)),
  );
};

const listInMemory = (
  filters: ConnectShyftCanonicalEventListFilters,
): ConnectShyftCanonicalEventRecord[] => {
  const aggregateId = normalizeString(filters.aggregateId);
  const aggregateType = normalizeString(filters.aggregateType);
  const eventType = normalizeString(filters.eventType);
  const orgUnitId = normalizeString(filters.orgUnitId);
  const limit = normalizeLimit(filters.limit);
  const window = normalizeWindow(filters.window);

  const filtered = inMemoryCanonicalEvents.filter((entry) => {
    if (entry.tenantId !== filters.tenantId) {
      return false;
    }

    if (orgUnitId && entry.orgUnitId !== orgUnitId) {
      return false;
    }

    if (aggregateId && entry.record.aggregateId !== aggregateId) {
      return false;
    }

    if (aggregateType && entry.record.aggregateType !== aggregateType) {
      return false;
    }

    if (eventType && entry.record.eventType !== eventType) {
      return false;
    }

    return true;
  });

  const sorted = sortCanonicalEvents(filtered.map((entry) => entry.record));
  return window === 'most_recent'
    ? sorted.slice(-limit)
    : sorted.slice(0, limit);
};

const listFromDb = async (
  db: Knex,
  filters: ConnectShyftCanonicalEventListFilters,
): Promise<ConnectShyftCanonicalEventRecord[]> => {
  const limit = normalizeLimit(filters.limit);
  const window = normalizeWindow(filters.window);
  const orderDirection = window === 'most_recent' ? 'desc' : 'asc';
  const query = db
    .withSchema('platform')
    .table('events')
    .where({
      tenant_id: filters.tenantId,
      event_name: CONNECTSHYFT_CANONICAL_EVENT_NAME,
    })
    .orderBy('occurred_at_utc', orderDirection)
    .orderBy('id', orderDirection)
    .limit(limit)
    .select([
      'id',
      'payload',
      'occurred_at_utc',
    ]);

  const aggregateId = normalizeString(filters.aggregateId);
  const aggregateType = normalizeString(filters.aggregateType);
  const eventType = normalizeString(filters.eventType);
  const orgUnitId = normalizeString(filters.orgUnitId);

  if (aggregateId) {
    query.andWhereRaw(`payload ->> 'aggregateId' = ?`, [aggregateId]);
  }
  if (aggregateType) {
    query.andWhereRaw(`payload ->> 'aggregateType' = ?`, [aggregateType]);
  }
  if (eventType) {
    query.andWhereRaw(`payload ->> 'eventType' = ?`, [eventType]);
  }
  if (orgUnitId) {
    query.andWhereRaw(`payload ->> 'orgUnitId' = ?`, [orgUnitId]);
  }

  const rows = await query;
  const mapped = rows
    .map((row: Record<string, unknown>) => {
      const payload = (row.payload && typeof row.payload === 'object')
        ? row.payload as Record<string, unknown>
        : null;
      const eventId = normalizeString(payload?.eventId) || normalizeString(row.id);
      const mappedAggregateId = normalizeString(payload?.aggregateId);
      const mappedEventType = normalizeString(payload?.eventType);
      const mappedAggregateType = normalizeString(payload?.aggregateType) || 'Thread';
      const occurredAtUtc = normalizeString(payload?.occurredAtUtc)
        || (row.occurred_at_utc instanceof Date
          ? row.occurred_at_utc.toISOString()
          : normalizeString(row.occurred_at_utc))
        || new Date().toISOString();
      const mappedPayload = (
        payload?.payload && typeof payload.payload === 'object'
      )
        ? payload.payload as Record<string, unknown>
        : {};

      if (!eventId || !mappedAggregateId || !mappedEventType) {
        return null;
      }

      return {
        eventId,
        aggregateId: mappedAggregateId,
        aggregateType: mappedAggregateType as ConnectShyftCanonicalAggregateType,
        eventType: mappedEventType,
        payload: sanitizeConnectShyftCanonicalPayload(mappedPayload),
        occurredAtUtc,
      };
    })
    .filter((row): row is ConnectShyftCanonicalEventRecord => row !== null);

  const sorted = sortCanonicalEvents(mapped);
  return window === 'most_recent'
    ? sorted.slice(-limit)
    : sorted.slice(0, limit);
};

export const recordConnectShyftCanonicalEvent = async (
  input: ConnectShyftCanonicalEventInput & {
    db?: Knex;
  },
): Promise<ConnectShyftCanonicalEventRecord> => {
  const stored = toStoredRecord(input);

  if (!shouldUseDb(input, input.db)) {
    recordInMemoryFallbackEvent(stored);
    return stored.record;
  }

  await executePlatformMutation({
    mutation: async () => stored.record,
    event: {
      tenantId: input.tenantId,
      actorId: isUuid(input.actorUserId || '') ? input.actorUserId : null,
      eventName: CONNECTSHYFT_CANONICAL_EVENT_NAME,
      entityType: 'connectshyft.thread',
      entityId: input.aggregateId,
      payload: {
        ...stored.record,
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
      },
      occurredAtUtc: stored.record.occurredAtUtc,
    },
  }, input.db);

  return stored.record;
};

export const listConnectShyftCanonicalEvents = async (
  filters: ConnectShyftCanonicalEventListFilters & {
    db?: Knex;
  },
): Promise<ConnectShyftCanonicalEventRecord[]> => {
  if (shouldUseDb(filters, filters.db)) {
    try {
      return await listFromDb(filters.db as Knex, filters);
    } catch (_error) {
      return listInMemory(filters);
    }
  }

  return listInMemory(filters);
};

export const resetConnectShyftCanonicalEventsForTests = (): void => {
  inMemoryCanonicalEvents.length = 0;
};
