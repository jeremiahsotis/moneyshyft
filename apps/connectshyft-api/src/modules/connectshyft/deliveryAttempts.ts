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

export type DeliveryAttempt = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  personId: string;
  callId: string | null;
  channel: 'sms' | 'voice';
  providerEventId: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  failureCode: string | null;
  failureMessage: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export interface ListPersonDeliveryAttemptsInput {
  tenantId: string;
  orgUnitId: string;
  personId: string;
}

export interface RebindDeliveryAttemptPersonInput {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
}

export interface ConnectShyftDeliveryAttemptService {
  createAttempt(input: CreateDeliveryAttemptInput): Promise<void>;
  listPersonAttempts(input: ListPersonDeliveryAttemptsInput): Promise<DeliveryAttempt[]>;
  rebindPersonAttempts(input: RebindDeliveryAttemptPersonInput): Promise<void>;
}

class InMemoryConnectShyftDeliveryAttemptStore implements ConnectShyftDeliveryAttemptService {
  private readonly records = new Map<string, DeliveryAttempt>();

  async createAttempt(input: CreateDeliveryAttemptInput): Promise<void> {
    const nowIsoUtc = new Date().toISOString();
    const attempt: DeliveryAttempt = {
      id: randomUUID(),
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      personId: input.personId,
      callId: input.callId ?? null,
      channel: input.channel,
      providerEventId: input.providerEventId ?? null,
      status: input.status,
      failureCode: input.failureCode ?? null,
      failureMessage: input.failureMessage ?? null,
      createdAtUtc: nowIsoUtc,
      updatedAtUtc: nowIsoUtc,
    };

    this.records.set(attempt.id, attempt);
  }

  async listPersonAttempts(input: ListPersonDeliveryAttemptsInput): Promise<DeliveryAttempt[]> {
    return [...this.records.values()]
      .filter((attempt) => (
        attempt.tenantId === input.tenantId
        && attempt.orgUnitId === input.orgUnitId
        && attempt.personId === input.personId
      ))
      .sort((left, right) => (
        new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime()
      ) || right.id.localeCompare(left.id));
  }

  async rebindPersonAttempts(input: RebindDeliveryAttemptPersonInput): Promise<void> {
    this.records.forEach((attempt, attemptId) => {
      if (
        attempt.tenantId !== input.tenantId
        || attempt.orgUnitId !== input.orgUnitId
        || attempt.personId !== input.provisionalPersonId
      ) {
        return;
      }

      this.records.set(attemptId, {
        ...attempt,
        personId: input.canonicalPersonId,
      });
    });
  }

  reset(): void {
    this.records.clear();
  }
}

export class KnexConnectShyftDeliveryAttemptStore implements ConnectShyftDeliveryAttemptService {
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

  async listPersonAttempts(input: ListPersonDeliveryAttemptsInput): Promise<DeliveryAttempt[]> {
    const rows = await this.knexClient
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table(DELIVERY_ATTEMPTS_TABLE)
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        person_id: input.personId,
      })
      .orderBy('created_at_utc', 'desc')
      .orderBy('id', 'desc')
      .select<Array<{
        id: string;
        tenant_id: string;
        org_unit_id: string;
        thread_id: string;
        person_id: string;
        call_id: string | null;
        channel: 'sms' | 'voice';
        provider_event_id: string | null;
        status: 'pending' | 'succeeded' | 'failed' | 'canceled';
        failure_code: string | null;
        failure_message: string | null;
        created_at_utc: string | Date;
        updated_at_utc: string | Date;
      }>>();

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      orgUnitId: row.org_unit_id,
      threadId: row.thread_id,
      personId: row.person_id,
      callId: row.call_id,
      channel: row.channel,
      providerEventId: row.provider_event_id,
      status: row.status,
      failureCode: row.failure_code,
      failureMessage: row.failure_message,
      createdAtUtc: row.created_at_utc instanceof Date
        ? row.created_at_utc.toISOString()
        : row.created_at_utc,
      updatedAtUtc: row.updated_at_utc instanceof Date
        ? row.updated_at_utc.toISOString()
        : row.updated_at_utc,
    }));
  }

  async rebindPersonAttempts(input: RebindDeliveryAttemptPersonInput): Promise<void> {
    await this.knexClient
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table(DELIVERY_ATTEMPTS_TABLE)
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        person_id: input.provisionalPersonId,
      })
      .update({
        person_id: input.canonicalPersonId,
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

  async listPersonAttempts(input: ListPersonDeliveryAttemptsInput): Promise<DeliveryAttempt[]> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftDeliveryAttemptStore.listPersonAttempts(input);
    }

    try {
      return await knexConnectShyftDeliveryAttemptStore.listPersonAttempts(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async rebindPersonAttempts(input: RebindDeliveryAttemptPersonInput): Promise<void> {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryConnectShyftDeliveryAttemptStore.rebindPersonAttempts(input);
      return;
    }

    try {
      await knexConnectShyftDeliveryAttemptStore.rebindPersonAttempts(input);
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

export const resetConnectShyftDeliveryAttemptStateForTests = (): void => {
  inMemoryConnectShyftDeliveryAttemptStore.reset();
};
