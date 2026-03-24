import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';
import {
  ConnectShyftPersistenceUnavailableError,
  isConnectShyftPersistenceErrorCause,
} from './calls';
import {
  BridgeSessionState,
  normalizeConnectShyftBridgeSessionState,
} from './bridgeSessions';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const VOICEMAILS_TABLE = 'cs_voicemails';

export interface CreateVoicemailInput {
  tenantId: string;
  orgUnitId: string;
  callId: string;
  threadId: string;
  personId: string;
  artifactId: string;
  recordingUrl: string | null;
  recordingStatus: 'pending' | 'completed' | 'failed';
  occurredAtUtc: string;
  transcriptionJson?: unknown;
}

export interface ListCallVoicemailsInput {
  tenantId: string;
  callId: string;
}

export interface RebindVoicemailPersonInput {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
}

export type Voicemail = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  callId: string;
  threadId: string;
  personId: string;
  artifactId: string;
  recordingUrl: string | null;
  recordingStatus: 'pending' | 'completed' | 'failed';
  occurredAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  transcriptionJson: unknown | null;
};

export interface ConnectShyftVoicemailService {
  createVoicemail(input: CreateVoicemailInput): Promise<Voicemail>;
  listCallVoicemails(input: ListCallVoicemailsInput): Promise<Voicemail[]>;
  rebindPersonVoicemails(input: RebindVoicemailPersonInput): Promise<void>;
}

type DbVoicemailRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  call_id: string;
  thread_id: string;
  person_id: string;
  artifact_id: string;
  recording_url?: string | null;
  transcription_json?: unknown;
  recording_status: 'pending' | 'completed' | 'failed';
  occurred_at_utc: string | Date;
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

const mapVoicemailRow = (row: DbVoicemailRow): Voicemail => ({
  id: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  callId: row.call_id,
  threadId: row.thread_id,
  personId: row.person_id,
  artifactId: row.artifact_id,
  recordingUrl: normalizeString(row.recording_url) || null,
  recordingStatus: row.recording_status,
  occurredAtUtc: toIsoUtc(row.occurred_at_utc) || new Date().toISOString(),
  createdAtUtc: toIsoUtc(row.created_at_utc) || new Date().toISOString(),
  updatedAtUtc: toIsoUtc(row.updated_at_utc) || new Date().toISOString(),
  transcriptionJson: row.transcription_json ?? null,
});

export const canAttachConnectShyftVoicemailToBridgeSession = (
  bridgeSessionStatus: string | null | undefined,
): boolean => {
  const normalizedState = normalizeConnectShyftBridgeSessionState(bridgeSessionStatus)

  return normalizedState === BridgeSessionState.NEIGHBOR_DIALING
    || normalizedState === BridgeSessionState.VOICEMAIL
}

export const canEnterConnectShyftVoicemailFromBridgeSession = (
  bridgeSessionStatus: string | null | undefined,
): boolean => (
  normalizeConnectShyftBridgeSessionState(bridgeSessionStatus) === BridgeSessionState.NEIGHBOR_DIALING
)

class InMemoryConnectShyftVoicemailStore implements ConnectShyftVoicemailService {
  private readonly records = new Map<string, Voicemail>();
  private readonly recordIdByArtifactKey = new Map<string, string>();

  async createVoicemail(input: CreateVoicemailInput): Promise<Voicemail> {
    const artifactKey = `${input.tenantId}|${input.artifactId}`;
    const existingId = this.recordIdByArtifactKey.get(artifactKey);
    if (existingId) {
      const existing = this.records.get(existingId);
      if (existing) {
        return existing;
      }
    }

    const nowIsoUtc = new Date().toISOString();
    const voicemail: Voicemail = {
      id: randomUUID(),
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      callId: input.callId,
      threadId: input.threadId,
      personId: input.personId,
      artifactId: input.artifactId,
      recordingUrl: input.recordingUrl,
      recordingStatus: input.recordingStatus,
      occurredAtUtc: input.occurredAtUtc,
      createdAtUtc: nowIsoUtc,
      updatedAtUtc: nowIsoUtc,
      transcriptionJson: input.transcriptionJson ?? null,
    };

    this.records.set(voicemail.id, voicemail);
    this.recordIdByArtifactKey.set(artifactKey, voicemail.id);
    return voicemail;
  }

  async listCallVoicemails(input: ListCallVoicemailsInput): Promise<Voicemail[]> {
    return [...this.records.values()]
      .filter((voicemail) => (
        voicemail.tenantId === input.tenantId
        && voicemail.callId === input.callId
      ))
      .sort((left, right) => (
        new Date(right.occurredAtUtc).getTime() - new Date(left.occurredAtUtc).getTime()
      ) || right.id.localeCompare(left.id));
  }

  async rebindPersonVoicemails(input: RebindVoicemailPersonInput): Promise<void> {
    this.records.forEach((voicemail, voicemailId) => {
      if (
        voicemail.tenantId !== input.tenantId
        || voicemail.orgUnitId !== input.orgUnitId
        || voicemail.personId !== input.provisionalPersonId
      ) {
        return;
      }

      this.records.set(voicemailId, {
        ...voicemail,
        personId: input.canonicalPersonId,
      });
    });
  }

  reset(): void {
    this.records.clear();
    this.recordIdByArtifactKey.clear();
  }
}

export class KnexConnectShyftVoicemailStore implements ConnectShyftVoicemailService {
  constructor(private readonly knexClient: Knex = db) {}

  private table() {
    return this.knexClient.withSchema(CONNECTSHYFT_SCHEMA).table(VOICEMAILS_TABLE);
  }

  async createVoicemail(input: CreateVoicemailInput): Promise<Voicemail> {
    const existing = await this.table()
      .where({
        tenant_id: input.tenantId,
        artifact_id: input.artifactId,
      })
      .first<DbVoicemailRow>();
    if (existing) {
      return mapVoicemailRow(existing);
    }

    const voicemailId = randomUUID();
    const nowIsoUtc = new Date().toISOString();
    await this.table().insert({
      id: voicemailId,
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId,
      call_id: input.callId,
      thread_id: input.threadId,
      person_id: input.personId,
      artifact_id: input.artifactId,
      recording_url: input.recordingUrl,
      transcription_json: input.transcriptionJson ?? null,
      recording_status: input.recordingStatus,
      occurred_at_utc: input.occurredAtUtc,
      created_at_utc: nowIsoUtc,
      updated_at_utc: nowIsoUtc,
    }).onConflict(['tenant_id', 'artifact_id']).ignore();

    const row = await this.table()
      .where({
        tenant_id: input.tenantId,
        artifact_id: input.artifactId,
      })
      .first<DbVoicemailRow>();

    if (!row) {
      throw new Error(`Failed to load ConnectShyft voicemail for artifact ${input.artifactId}.`);
    }

    return mapVoicemailRow(row);
  }

  async listCallVoicemails(input: ListCallVoicemailsInput): Promise<Voicemail[]> {
    const rows = await this.table()
      .where({
        tenant_id: input.tenantId,
        call_id: input.callId,
      })
      .orderBy('occurred_at_utc', 'desc')
      .orderBy('id', 'desc')
      .select<DbVoicemailRow[]>();

    return rows.map(mapVoicemailRow);
  }

  async rebindPersonVoicemails(input: RebindVoicemailPersonInput): Promise<void> {
    await this.table()
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

const inMemoryConnectShyftVoicemailStore = new InMemoryConnectShyftVoicemailStore();
const knexConnectShyftVoicemailStore = new KnexConnectShyftVoicemailStore();

class AsyncConnectShyftVoicemailService implements ConnectShyftVoicemailService {
  async createVoicemail(input: CreateVoicemailInput): Promise<Voicemail> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftVoicemailStore.createVoicemail(input);
    }

    try {
      return await knexConnectShyftVoicemailStore.createVoicemail(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async listCallVoicemails(input: ListCallVoicemailsInput): Promise<Voicemail[]> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftVoicemailStore.listCallVoicemails(input);
    }

    try {
      return await knexConnectShyftVoicemailStore.listCallVoicemails(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async rebindPersonVoicemails(input: RebindVoicemailPersonInput): Promise<void> {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryConnectShyftVoicemailStore.rebindPersonVoicemails(input);
      return;
    }

    try {
      await knexConnectShyftVoicemailStore.rebindPersonVoicemails(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }
}

export const connectShyftVoicemailServiceAsync: ConnectShyftVoicemailService =
  new AsyncConnectShyftVoicemailService();

export const resetConnectShyftVoicemailStateForTests = (): void => {
  inMemoryConnectShyftVoicemailStore.reset();
};
