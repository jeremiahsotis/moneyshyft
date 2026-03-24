import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';
import {
  ConnectShyftPersistenceUnavailableError,
  isConnectShyftPersistenceErrorCause,
} from './calls';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const DELIVERY_ATTEMPTS_TABLE = 'cs_delivery_attempts';

export interface CreateDeliveryAttemptInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  personId: string;
  callId?: string | null;
  channel: 'sms' | 'voice';
  providerEventId?: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  failureCode?: string | null;
  failureMessage?: string | null;
}

export interface ConnectShyftDeliveryAttemptService {
  createAttempt(input: CreateDeliveryAttemptInput): Promise<void>;
}

class InMemoryConnectShyftDeliveryAttemptStore implements ConnectShyftDeliveryAttemptService {
  async createAttempt(_input: CreateDeliveryAttemptInput): Promise<void> {}
}

class KnexConnectShyftDeliveryAttemptStore implements ConnectShyftDeliveryAttemptService {
  constructor(private readonly knexClient: Knex = db) {}

  async createAttempt(input: CreateDeliveryAttemptInput): Promise<void> {
    await this.knexClient
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table(DELIVERY_ATTEMPTS_TABLE)
      .insert({
        id: randomUUID(),
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        thread_id: input.threadId,
        person_id: input.personId,
        call_id: input.callId ?? null,
        channel: input.channel,
        provider_event_id: input.providerEventId ?? null,
        status: input.status,
        failure_code: input.failureCode ?? null,
        failure_message: input.failureMessage ?? null,
        created_at_utc: new Date().toISOString(),
        updated_at_utc: new Date().toISOString(),
      });
  }
}

const inMemoryConnectShyftDeliveryAttemptStore = new InMemoryConnectShyftDeliveryAttemptStore();
const knexConnectShyftDeliveryAttemptStore = new KnexConnectShyftDeliveryAttemptStore();

class AsyncConnectShyftDeliveryAttemptService implements ConnectShyftDeliveryAttemptService {
  async createAttempt(input: CreateDeliveryAttemptInput): Promise<void> {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryConnectShyftDeliveryAttemptStore.createAttempt(input);
      return;
    }

    try {
      await knexConnectShyftDeliveryAttemptStore.createAttempt(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }
}

export const connectShyftDeliveryAttemptServiceAsync: ConnectShyftDeliveryAttemptService =
  new AsyncConnectShyftDeliveryAttemptService();
