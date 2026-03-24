import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const CALLS_TABLE = 'cs_calls';

export type CallStatus =
  | 'operator_dialing'
  | 'operator_answered'
  | 'neighbor_dialing'
  | 'neighbor_answered'
  | 'bridged'
  | 'voicemail'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'expired';

export type Call = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  personId: string;
  bridgeSessionId: string | null;
  status: CallStatus;
  failureCode: string | null;
  failureMessage: string | null;
  startedAtUtc: string;
  operatorAnsweredAtUtc: string | null;
  neighborAnsweredAtUtc: string | null;
  bridgedAtUtc: string | null;
  endedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export interface CreateCallInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  personId: string;
  idempotencyKey?: string;
}

export interface UpdateCallStatusInput {
  callId: string;
  tenantId: string;
  status: CallStatus;
  bridgeSessionId?: string | null;
  startedAtUtc?: string;
  operatorAnsweredAtUtc?: string;
  neighborAnsweredAtUtc?: string;
  bridgedAtUtc?: string;
  endedAtUtc?: string;
  failureCode?: string | null;
  failureMessage?: string | null;
}

export interface ListThreadCallsInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
}

export interface ListPersonCallsInput {
  tenantId: string;
  orgUnitId: string;
  personId: string;
}

export interface ConnectShyftCallService {
  createCall(input: CreateCallInput): Promise<Call>;
  updateCallStatus(input: UpdateCallStatusInput): Promise<void>;
  listThreadCalls(input: ListThreadCallsInput): Promise<Call[]>;
  listPersonCalls(input: ListPersonCallsInput): Promise<Call[]>;
  getCallById(callId: string, tenantId: string): Promise<Call | null>;
}

type DbCallRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  thread_id: string;
  person_id: string;
  bridge_session_id?: string | null;
  status: string;
  failure_code?: string | null;
  failure_message?: string | null;
  started_at_utc: string | Date;
  operator_answered_at_utc?: string | Date | null;
  neighbor_answered_at_utc?: string | Date | null;
  bridged_at_utc?: string | Date | null;
  ended_at_utc?: string | Date | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toIsoUtc = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  return normalized;
};

export const isConnectShyftPersistenceErrorCause = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  const normalizedCode = typeof candidate.code === 'string'
    ? candidate.code.toUpperCase()
    : '';

  return normalizedCode === '42P01'
    || normalizedCode === '3F000'
    || normalizedCode === '42703'
    || normalizedCode === '28000'
    || normalizedCode === '28P01'
    || normalizedCode.startsWith('08')
    || normalizedCode === 'ECONNREFUSED'
    || normalizedCode === 'ENOTFOUND'
    || normalizedCode === 'ETIMEDOUT';
};

const mapCallRow = (row: DbCallRow): Call => ({
  id: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  threadId: row.thread_id,
  personId: row.person_id,
  bridgeSessionId: normalizeString(row.bridge_session_id) || null,
  status: row.status as CallStatus,
  failureCode: normalizeString(row.failure_code) || null,
  failureMessage: normalizeString(row.failure_message) || null,
  startedAtUtc: toIsoUtc(row.started_at_utc) || new Date().toISOString(),
  operatorAnsweredAtUtc: toIsoUtc(row.operator_answered_at_utc),
  neighborAnsweredAtUtc: toIsoUtc(row.neighbor_answered_at_utc),
  bridgedAtUtc: toIsoUtc(row.bridged_at_utc),
  endedAtUtc: toIsoUtc(row.ended_at_utc),
  createdAtUtc: toIsoUtc(row.created_at_utc) || new Date().toISOString(),
  updatedAtUtc: toIsoUtc(row.updated_at_utc) || new Date().toISOString(),
});

export class ConnectShyftPersistenceUnavailableError extends Error {
  readonly code = 'CONNECTSHYFT_PERSISTENCE_UNAVAILABLE';

  constructor(cause?: unknown) {
    super('ConnectShyft persistence is unavailable.');
    this.name = 'ConnectShyftPersistenceUnavailableError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

class InMemoryConnectShyftCallStore implements ConnectShyftCallService {
  private readonly records = new Map<string, Call>();

  async createCall(input: CreateCallInput): Promise<Call> {
    const nowIsoUtc = new Date().toISOString();
    const call: Call = {
      id: randomUUID(),
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      personId: input.personId,
      bridgeSessionId: null,
      status: 'operator_dialing',
      failureCode: null,
      failureMessage: null,
      startedAtUtc: nowIsoUtc,
      operatorAnsweredAtUtc: null,
      neighborAnsweredAtUtc: null,
      bridgedAtUtc: null,
      endedAtUtc: null,
      createdAtUtc: nowIsoUtc,
      updatedAtUtc: nowIsoUtc,
    };

    this.records.set(call.id, call);
    return call;
  }

  async updateCallStatus(input: UpdateCallStatusInput): Promise<void> {
    const existing = this.records.get(input.callId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return;
    }

    this.records.set(input.callId, {
      ...existing,
      status: input.status,
      bridgeSessionId: input.bridgeSessionId === undefined
        ? existing.bridgeSessionId
        : input.bridgeSessionId,
      startedAtUtc: input.startedAtUtc || existing.startedAtUtc,
      operatorAnsweredAtUtc: input.operatorAnsweredAtUtc ?? existing.operatorAnsweredAtUtc,
      neighborAnsweredAtUtc: input.neighborAnsweredAtUtc ?? existing.neighborAnsweredAtUtc,
      bridgedAtUtc: input.bridgedAtUtc ?? existing.bridgedAtUtc,
      endedAtUtc: input.endedAtUtc ?? existing.endedAtUtc,
      failureCode: input.failureCode === undefined ? existing.failureCode : input.failureCode,
      failureMessage: input.failureMessage === undefined
        ? existing.failureMessage
        : input.failureMessage,
      updatedAtUtc: new Date().toISOString(),
    });
  }

  async listThreadCalls(input: ListThreadCallsInput): Promise<Call[]> {
    return [...this.records.values()]
      .filter((call) => (
        call.tenantId === input.tenantId
        && call.orgUnitId === input.orgUnitId
        && call.threadId === input.threadId
      ))
      .sort((left, right) => (
        new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime()
      ) || right.id.localeCompare(left.id));
  }

  async listPersonCalls(input: ListPersonCallsInput): Promise<Call[]> {
    return [...this.records.values()]
      .filter((call) => (
        call.tenantId === input.tenantId
        && call.orgUnitId === input.orgUnitId
        && call.personId === input.personId
      ))
      .sort((left, right) => (
        new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime()
      ) || right.id.localeCompare(left.id));
  }

  async getCallById(callId: string, tenantId: string): Promise<Call | null> {
    const record = this.records.get(callId);
    if (!record || record.tenantId !== tenantId) {
      return null;
    }

    return record;
  }

  reset(): void {
    this.records.clear();
  }
}

class KnexConnectShyftCallStore implements ConnectShyftCallService {
  constructor(private readonly knexClient: Knex = db) {}

  private table() {
    return this.knexClient.withSchema(CONNECTSHYFT_SCHEMA).table(CALLS_TABLE);
  }

  async createCall(input: CreateCallInput): Promise<Call> {
    const callId = randomUUID();
    const nowIsoUtc = new Date().toISOString();
    await this.table().insert({
      id: callId,
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId,
      thread_id: input.threadId,
      person_id: input.personId,
      bridge_session_id: null,
      status: 'operator_dialing',
      failure_code: null,
      failure_message: null,
      started_at_utc: nowIsoUtc,
      operator_answered_at_utc: null,
      neighbor_answered_at_utc: null,
      bridged_at_utc: null,
      ended_at_utc: null,
      created_at_utc: nowIsoUtc,
      updated_at_utc: nowIsoUtc,
    });

    const row = await this.table()
      .where({ id: callId, tenant_id: input.tenantId })
      .first<DbCallRow>();

    if (!row) {
      throw new Error(`Failed to load ConnectShyft call ${callId} after insert.`);
    }

    return mapCallRow(row);
  }

  async updateCallStatus(input: UpdateCallStatusInput): Promise<void> {
    const patch: Record<string, string | null> = {
      status: input.status,
      updated_at_utc: new Date().toISOString(),
    };

    if (input.bridgeSessionId !== undefined) {
      patch.bridge_session_id = input.bridgeSessionId;
    }
    if (input.startedAtUtc !== undefined) {
      patch.started_at_utc = input.startedAtUtc;
    }
    if (input.operatorAnsweredAtUtc !== undefined) {
      patch.operator_answered_at_utc = input.operatorAnsweredAtUtc;
    }
    if (input.neighborAnsweredAtUtc !== undefined) {
      patch.neighbor_answered_at_utc = input.neighborAnsweredAtUtc;
    }
    if (input.bridgedAtUtc !== undefined) {
      patch.bridged_at_utc = input.bridgedAtUtc;
    }
    if (input.endedAtUtc !== undefined) {
      patch.ended_at_utc = input.endedAtUtc;
    }
    if (input.failureCode !== undefined) {
      patch.failure_code = input.failureCode;
    }
    if (input.failureMessage !== undefined) {
      patch.failure_message = input.failureMessage;
    }

    await this.table()
      .where({
        id: input.callId,
        tenant_id: input.tenantId,
      })
      .update(patch);
  }

  async listThreadCalls(input: ListThreadCallsInput): Promise<Call[]> {
    const rows = await this.table()
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        thread_id: input.threadId,
      })
      .orderBy('created_at_utc', 'desc')
      .orderBy('id', 'desc')
      .select<DbCallRow[]>();

    return rows.map(mapCallRow);
  }

  async listPersonCalls(input: ListPersonCallsInput): Promise<Call[]> {
    const rows = await this.table()
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        person_id: input.personId,
      })
      .orderBy('created_at_utc', 'desc')
      .orderBy('id', 'desc')
      .select<DbCallRow[]>();

    return rows.map(mapCallRow);
  }

  async getCallById(callId: string, tenantId: string): Promise<Call | null> {
    const row = await this.table()
      .where({
        id: callId,
        tenant_id: tenantId,
      })
      .first<DbCallRow>();

    return row ? mapCallRow(row) : null;
  }
}

const inMemoryConnectShyftCallStore = new InMemoryConnectShyftCallStore();
const knexConnectShyftCallStore = new KnexConnectShyftCallStore();

class AsyncConnectShyftCallService implements ConnectShyftCallService {
  async createCall(input: CreateCallInput): Promise<Call> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftCallStore.createCall(input);
    }

    try {
      return await knexConnectShyftCallStore.createCall(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async updateCallStatus(input: UpdateCallStatusInput): Promise<void> {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryConnectShyftCallStore.updateCallStatus(input);
      return;
    }

    try {
      await knexConnectShyftCallStore.updateCallStatus(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async listThreadCalls(input: ListThreadCallsInput): Promise<Call[]> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftCallStore.listThreadCalls(input);
    }

    try {
      return await knexConnectShyftCallStore.listThreadCalls(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async listPersonCalls(input: ListPersonCallsInput): Promise<Call[]> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftCallStore.listPersonCalls(input);
    }

    try {
      return await knexConnectShyftCallStore.listPersonCalls(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async getCallById(callId: string, tenantId: string): Promise<Call | null> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftCallStore.getCallById(callId, tenantId);
    }

    try {
      return await knexConnectShyftCallStore.getCallById(callId, tenantId);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }
}

export const connectShyftCallServiceAsync: ConnectShyftCallService = new AsyncConnectShyftCallService();

export const resetConnectShyftCallStateForTests = (): void => {
  inMemoryConnectShyftCallStore.reset();
};
