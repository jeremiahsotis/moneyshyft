import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';
import {
  ConnectShyftPersistenceUnavailableError,
  isConnectShyftPersistenceErrorCause,
} from './calls';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const PROVIDER_EVENTS_TABLE = 'cs_provider_events';

export interface RecordProviderEventInput {
  tenantId: string;
  provider: string;
  eventType: string;
  eventJson: unknown;
  callId?: string | null;
  bridgeSessionId?: string | null;
  providerCallId?: string | null;
  occurredAtUtc: string;
}

export interface ConnectShyftProviderEventService {
  recordEvent(input: RecordProviderEventInput): Promise<void>;
}

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const buildProviderEventDedupeKey = (input: RecordProviderEventInput): string => (
  [
    input.tenantId,
    normalizeString(input.provider).toLowerCase(),
    normalizeString(input.providerCallId).toLowerCase(),
    normalizeString(input.eventType).toLowerCase(),
    normalizeString(input.occurredAtUtc),
  ].join('|')
);

class InMemoryConnectShyftProviderEventStore implements ConnectShyftProviderEventService {
  private readonly dedupeKeys = new Set<string>();

  async recordEvent(input: RecordProviderEventInput): Promise<void> {
    this.dedupeKeys.add(buildProviderEventDedupeKey(input));
  }

  reset(): void {
    this.dedupeKeys.clear();
  }
}

class KnexConnectShyftProviderEventStore implements ConnectShyftProviderEventService {
  constructor(private readonly knexClient: Knex = db) {}

  private table() {
    return this.knexClient.withSchema(CONNECTSHYFT_SCHEMA).table(PROVIDER_EVENTS_TABLE);
  }

  async recordEvent(input: RecordProviderEventInput): Promise<void> {
    await this.table()
      .insert({
        id: randomUUID(),
        tenant_id: input.tenantId,
        provider: normalizeString(input.provider).toLowerCase(),
        event_type: input.eventType,
        event_json: input.eventJson ?? {},
        call_id: input.callId ?? null,
        bridge_session_id: input.bridgeSessionId ?? null,
        provider_call_id: input.providerCallId ?? null,
        occurred_at_utc: input.occurredAtUtc,
        received_at_utc: new Date().toISOString(),
      })
      .onConflict(['tenant_id', 'provider', 'provider_call_id', 'event_type', 'occurred_at_utc'])
      .ignore();
  }
}

const inMemoryConnectShyftProviderEventStore = new InMemoryConnectShyftProviderEventStore();
const knexConnectShyftProviderEventStore = new KnexConnectShyftProviderEventStore();

class AsyncConnectShyftProviderEventService implements ConnectShyftProviderEventService {
  async recordEvent(input: RecordProviderEventInput): Promise<void> {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryConnectShyftProviderEventStore.recordEvent(input);
      return;
    }

    try {
      await knexConnectShyftProviderEventStore.recordEvent(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }
}

export const connectShyftProviderEventServiceAsync: ConnectShyftProviderEventService =
  new AsyncConnectShyftProviderEventService();

export const resetConnectShyftProviderEventStateForTests = (): void => {
  inMemoryConnectShyftProviderEventStore.reset();
};
