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

export type ConnectShyftVoicemailDirection = 'inbound' | 'outbound';
export type ConnectShyftVoicemailRecordingStatus = 'pending' | 'completed' | 'failed';
export type ConnectShyftVoicemailTranscriptionStatus = 'pending' | 'completed' | 'failed';

export interface CreateVoicemailInput {
  tenantId: string;
  orgUnitId: string;
  callId?: string | null;
  threadId: string;
  personId?: string | null;
  artifactId: string;
  bridgeSessionId?: string | null;
  contactPointId?: string | null;
  direction?: ConnectShyftVoicemailDirection;
  recordingUrl: string | null;
  recordingStatus: ConnectShyftVoicemailRecordingStatus;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerRecordingId?: string | null;
  occurredAtUtc: string;
  transcriptionJson?: unknown;
  transcriptionStatus?: ConnectShyftVoicemailTranscriptionStatus | null;
  transcriptionText?: string | null;
  transcriptionProvider?: string | null;
  transcriptionRequestedAtUtc?: string | null;
  transcriptionCompletedAtUtc?: string | null;
  transcriptionFailedAtUtc?: string | null;
}

export interface UpsertVoicemailArtifactInput {
  tenantId: string;
  orgUnitId: string;
  callId?: string | null;
  threadId?: string | null;
  personId?: string | null;
  artifactId?: string | null;
  bridgeSessionId?: string | null;
  contactPointId?: string | null;
  direction?: ConnectShyftVoicemailDirection | null;
  recordingUrl?: string | null;
  recordingStatus?: ConnectShyftVoicemailRecordingStatus | null;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerRecordingId?: string | null;
  occurredAtUtc?: string | null;
  transcriptionJson?: unknown;
  transcriptionStatus?: ConnectShyftVoicemailTranscriptionStatus | null;
  transcriptionText?: string | null;
  transcriptionProvider?: string | null;
  transcriptionRequestedAtUtc?: string | null;
  transcriptionCompletedAtUtc?: string | null;
  transcriptionFailedAtUtc?: string | null;
}

export interface FindVoicemailArtifactInput {
  tenantId: string;
  artifactId?: string | null;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerRecordingId?: string | null;
  bridgeSessionId?: string | null;
  direction?: ConnectShyftVoicemailDirection | null;
  recordingUrl?: string | null;
}

export interface ListCallVoicemailsInput {
  tenantId: string;
  callId: string;
}

export interface ListThreadVoicemailsInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
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
  callId: string | null;
  threadId: string;
  personId: string | null;
  artifactId: string;
  bridgeSessionId: string | null;
  contactPointId: string | null;
  direction: ConnectShyftVoicemailDirection;
  recordingUrl: string | null;
  recordingStatus: ConnectShyftVoicemailRecordingStatus;
  providerEventId: string | null;
  providerLegId: string | null;
  providerRecordingId: string | null;
  occurredAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  transcriptionStatus: ConnectShyftVoicemailTranscriptionStatus | null;
  transcriptionText: string | null;
  transcriptionProvider: string | null;
  transcriptionRequestedAtUtc: string | null;
  transcriptionCompletedAtUtc: string | null;
  transcriptionFailedAtUtc: string | null;
  transcriptionJson: unknown | null;
};

export interface ConnectShyftVoicemailService {
  createVoicemail(input: CreateVoicemailInput): Promise<Voicemail>;
  upsertVoicemailArtifact(input: UpsertVoicemailArtifactInput): Promise<Voicemail>;
  findVoicemailArtifact(input: FindVoicemailArtifactInput): Promise<Voicemail | null>;
  listCallVoicemails(input: ListCallVoicemailsInput): Promise<Voicemail[]>;
  listThreadVoicemails(input: ListThreadVoicemailsInput): Promise<Voicemail[]>;
  rebindPersonVoicemails(input: RebindVoicemailPersonInput): Promise<void>;
}

export interface HandleVoicemailTranscriptionCallbackInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  voicemailArtifactId: string;
  correlationProviderEventId: string;
  callbackProviderLegId?: string | null;
  occurredAtUtc: string;
  transcriptionStatus: 'completed' | 'failed';
  transcriptionText?: string | null;
  transcriptionProvider?: string | null;
}

export type HandleVoicemailTranscriptionCallbackResult =
  | {
      ok: true;
      callbackStatus: 'completed' | 'failed';
      malformed: boolean;
      voicemail: Voicemail;
    }
  | {
      ok: false;
      reason: 'callback_correlation_scope_invalid' | 'callback_correlation_unresolved';
    };

type DbVoicemailRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  call_id?: string | null;
  thread_id: string;
  person_id?: string | null;
  artifact_id: string;
  bridge_session_id?: string | null;
  contact_point_id?: string | null;
  direction?: string | null;
  recording_url?: string | null;
  recording_status: ConnectShyftVoicemailRecordingStatus;
  provider_event_id?: string | null;
  provider_leg_id?: string | null;
  provider_recording_id?: string | null;
  occurred_at_utc: string | Date;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
  transcription_status?: ConnectShyftVoicemailTranscriptionStatus | null;
  transcription_text?: string | null;
  transcription_provider?: string | null;
  transcription_requested_at_utc?: string | Date | null;
  transcription_completed_at_utc?: string | Date | null;
  transcription_failed_at_utc?: string | Date | null;
  transcription_json?: unknown;
};

type MutableVoicemailArtifact = Omit<Voicemail, 'transcriptionJson'>;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeNullableString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const normalizeDirection = (
  value: unknown,
): ConnectShyftVoicemailDirection | null => {
  return value === 'inbound' || value === 'outbound'
    ? value
    : null;
};

const normalizeRecordingStatus = (
  value: unknown,
): ConnectShyftVoicemailRecordingStatus | null => {
  return value === 'pending' || value === 'completed' || value === 'failed'
    ? value
    : null;
};

const normalizeTranscriptionStatus = (
  value: unknown,
): ConnectShyftVoicemailTranscriptionStatus | null => {
  return value === 'pending' || value === 'completed' || value === 'failed'
    ? value
    : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
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

const resolveLegacyTranscriptionJsonText = (value: unknown): string | null => {
  const record = asRecord(value);
  if (!record) {
    return normalizeNullableString(value);
  }

  return normalizeNullableString(
    record.text
    || record.transcriptText
    || record.transcriptionText
    || record.transcript_text
    || record.transcription_text,
  );
};

const resolveLegacyTranscriptionJsonProvider = (value: unknown): string | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return normalizeNullableString(
    record.provider
    || record.transcriptionProvider
    || record.transcription_provider,
  );
};

const resolveLegacyTranscriptionJsonStatus = (
  value: unknown,
): ConnectShyftVoicemailTranscriptionStatus | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const explicitStatus = normalizeTranscriptionStatus(
    record.status
    || record.transcriptionStatus
    || record.transcription_status,
  );
  if (explicitStatus) {
    return explicitStatus;
  }

  return resolveLegacyTranscriptionJsonText(value)
    ? 'completed'
    : null;
};

const resolveLegacyTranscriptionJsonTimestamp = (
  value: unknown,
  keys: string[],
): string | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const normalized = toIsoUtc(record[key] as string | Date | null | undefined);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const buildLegacyTranscriptionJson = (artifact: {
  transcriptionStatus: ConnectShyftVoicemailTranscriptionStatus | null;
  transcriptionText: string | null;
  transcriptionProvider: string | null;
  transcriptionRequestedAtUtc: string | null;
  transcriptionCompletedAtUtc: string | null;
  transcriptionFailedAtUtc: string | null;
}): Record<string, unknown> | null => {
  if (
    !artifact.transcriptionStatus
    && !artifact.transcriptionText
    && !artifact.transcriptionProvider
    && !artifact.transcriptionRequestedAtUtc
    && !artifact.transcriptionCompletedAtUtc
    && !artifact.transcriptionFailedAtUtc
  ) {
    return null;
  }

  return {
    status: artifact.transcriptionStatus,
    text: artifact.transcriptionText,
    provider: artifact.transcriptionProvider,
    requestedAtUtc: artifact.transcriptionRequestedAtUtc,
    completedAtUtc: artifact.transcriptionCompletedAtUtc,
    failedAtUtc: artifact.transcriptionFailedAtUtc,
  };
};

const resolveEffectiveTranscriptionStatus = (input: {
  recordingStatus: ConnectShyftVoicemailRecordingStatus;
  explicitStatus: ConnectShyftVoicemailTranscriptionStatus | null;
  existingStatus: ConnectShyftVoicemailTranscriptionStatus | null;
  transcriptionText: string | null;
}): ConnectShyftVoicemailTranscriptionStatus | null => {
  if (input.recordingStatus === 'failed') {
    return null;
  }

  if (input.transcriptionText) {
    return 'completed';
  }

  if (input.existingStatus === 'completed') {
    return 'completed';
  }

  if (input.explicitStatus === 'completed') {
    return 'completed';
  }

  if (input.existingStatus === 'failed') {
    return 'failed';
  }

  if (input.explicitStatus === 'failed') {
    return 'failed';
  }

  if (input.explicitStatus === 'pending') {
    return 'pending';
  }

  if (input.existingStatus === 'pending') {
    return 'pending';
  }

  return input.recordingStatus === 'completed' || input.recordingStatus === 'pending'
    ? 'pending'
    : null;
};

const resolveEffectiveRecordingStatus = (input: {
  existingStatus: ConnectShyftVoicemailRecordingStatus | null;
  incomingStatus: ConnectShyftVoicemailRecordingStatus | null;
}): ConnectShyftVoicemailRecordingStatus => {
  if (!input.existingStatus) {
    return input.incomingStatus || 'pending';
  }

  if (!input.incomingStatus) {
    return input.existingStatus;
  }

  if (input.existingStatus === 'completed' || input.existingStatus === 'failed') {
    return input.incomingStatus === 'pending'
      ? input.existingStatus
      : input.existingStatus;
  }

  return input.incomingStatus;
};

const resolveOccurredAtUtc = (existing: string | null, incoming: string | null): string => {
  if (!existing && incoming) {
    return incoming;
  }

  if (!incoming && existing) {
    return existing;
  }

  if (existing && incoming) {
    return new Date(existing).getTime() <= new Date(incoming).getTime()
      ? existing
      : incoming;
  }

  return new Date().toISOString();
};

const resolveArtifactDirection = (input: {
  existingDirection: ConnectShyftVoicemailDirection | null;
  incomingDirection: ConnectShyftVoicemailDirection | null;
}): ConnectShyftVoicemailDirection => {
  return input.existingDirection
    || input.incomingDirection
    || 'outbound';
};

const mapVoicemailRow = (row: DbVoicemailRow): Voicemail => {
  const legacyTranscriptionJson = row.transcription_json ?? null;
  const transcriptionText = normalizeNullableString(row.transcription_text)
    || resolveLegacyTranscriptionJsonText(legacyTranscriptionJson);
  const recordingStatus = normalizeRecordingStatus(row.recording_status) || 'pending';
  const transcriptionStatus = resolveEffectiveTranscriptionStatus({
    recordingStatus,
    explicitStatus: normalizeTranscriptionStatus(row.transcription_status),
    existingStatus: null,
    transcriptionText,
  });
  const artifact: Voicemail = {
    id: row.id,
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    callId: normalizeNullableString(row.call_id),
    threadId: row.thread_id,
    personId: normalizeNullableString(row.person_id),
    artifactId: row.artifact_id,
    bridgeSessionId: normalizeNullableString(row.bridge_session_id),
    contactPointId: normalizeNullableString(row.contact_point_id),
    direction: normalizeDirection(row.direction) || 'outbound',
    recordingUrl: normalizeNullableString(row.recording_url),
    recordingStatus,
    providerEventId: normalizeNullableString(row.provider_event_id),
    providerLegId: normalizeNullableString(row.provider_leg_id),
    providerRecordingId: normalizeNullableString(row.provider_recording_id),
    occurredAtUtc: toIsoUtc(row.occurred_at_utc) || new Date().toISOString(),
    createdAtUtc: toIsoUtc(row.created_at_utc) || new Date().toISOString(),
    updatedAtUtc: toIsoUtc(row.updated_at_utc) || new Date().toISOString(),
    transcriptionStatus,
    transcriptionText,
    transcriptionProvider: normalizeNullableString(row.transcription_provider)
      || resolveLegacyTranscriptionJsonProvider(legacyTranscriptionJson),
    transcriptionRequestedAtUtc: toIsoUtc(row.transcription_requested_at_utc)
      || resolveLegacyTranscriptionJsonTimestamp(legacyTranscriptionJson, [
        'requestedAtUtc',
        'transcriptionRequestedAtUtc',
        'transcription_requested_at_utc',
      ]),
    transcriptionCompletedAtUtc: toIsoUtc(row.transcription_completed_at_utc)
      || resolveLegacyTranscriptionJsonTimestamp(legacyTranscriptionJson, [
        'completedAtUtc',
        'transcriptionCompletedAtUtc',
        'transcription_completed_at_utc',
      ]),
    transcriptionFailedAtUtc: toIsoUtc(row.transcription_failed_at_utc)
      || resolveLegacyTranscriptionJsonTimestamp(legacyTranscriptionJson, [
        'failedAtUtc',
        'transcriptionFailedAtUtc',
        'transcription_failed_at_utc',
      ]),
    transcriptionJson: legacyTranscriptionJson
      || buildLegacyTranscriptionJson({
        transcriptionStatus,
        transcriptionText,
        transcriptionProvider: normalizeNullableString(row.transcription_provider)
          || resolveLegacyTranscriptionJsonProvider(legacyTranscriptionJson),
        transcriptionRequestedAtUtc: toIsoUtc(row.transcription_requested_at_utc)
          || resolveLegacyTranscriptionJsonTimestamp(legacyTranscriptionJson, [
            'requestedAtUtc',
            'transcriptionRequestedAtUtc',
            'transcription_requested_at_utc',
          ]),
        transcriptionCompletedAtUtc: toIsoUtc(row.transcription_completed_at_utc)
          || resolveLegacyTranscriptionJsonTimestamp(legacyTranscriptionJson, [
            'completedAtUtc',
            'transcriptionCompletedAtUtc',
            'transcription_completed_at_utc',
          ]),
        transcriptionFailedAtUtc: toIsoUtc(row.transcription_failed_at_utc)
          || resolveLegacyTranscriptionJsonTimestamp(legacyTranscriptionJson, [
            'failedAtUtc',
            'transcriptionFailedAtUtc',
            'transcription_failed_at_utc',
          ]),
      }),
  };

  return artifact;
};

const buildArtifactForInsert = (input: UpsertVoicemailArtifactInput): MutableVoicemailArtifact => {
  const nowIsoUtc = new Date().toISOString();
  const artifactId = normalizeNullableString(input.artifactId);
  const threadId = normalizeNullableString(input.threadId);
  const direction = normalizeDirection(input.direction);

  if (!artifactId || !threadId || !direction) {
    throw new Error('Voicemail artifact creation requires artifactId, threadId, and direction.');
  }

  const recordingStatus = resolveEffectiveRecordingStatus({
    existingStatus: null,
    incomingStatus: normalizeRecordingStatus(input.recordingStatus),
  });
  const transcriptionText = normalizeNullableString(input.transcriptionText)
    || resolveLegacyTranscriptionJsonText(input.transcriptionJson);
  const transcriptionProvider = normalizeNullableString(input.transcriptionProvider)
    || resolveLegacyTranscriptionJsonProvider(input.transcriptionJson);
  const transcriptionStatus = resolveEffectiveTranscriptionStatus({
    recordingStatus,
    explicitStatus: normalizeTranscriptionStatus(input.transcriptionStatus)
      || resolveLegacyTranscriptionJsonStatus(input.transcriptionJson),
    existingStatus: null,
    transcriptionText,
  });

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    callId: normalizeNullableString(input.callId),
    threadId,
    personId: normalizeNullableString(input.personId),
    artifactId,
    bridgeSessionId: normalizeNullableString(input.bridgeSessionId),
    contactPointId: normalizeNullableString(input.contactPointId),
    direction,
    recordingUrl: normalizeNullableString(input.recordingUrl),
    recordingStatus,
    providerEventId: normalizeNullableString(input.providerEventId),
    providerLegId: normalizeNullableString(input.providerLegId),
    providerRecordingId: normalizeNullableString(input.providerRecordingId),
    occurredAtUtc: resolveOccurredAtUtc(null, toIsoUtc(input.occurredAtUtc)),
    createdAtUtc: nowIsoUtc,
    updatedAtUtc: nowIsoUtc,
    transcriptionStatus,
    transcriptionText,
    transcriptionProvider,
    transcriptionRequestedAtUtc: transcriptionStatus === 'pending'
      ? toIsoUtc(input.transcriptionRequestedAtUtc)
      : toIsoUtc(input.transcriptionRequestedAtUtc),
    transcriptionCompletedAtUtc: transcriptionStatus === 'completed'
      ? toIsoUtc(input.transcriptionCompletedAtUtc) || toIsoUtc(input.occurredAtUtc)
      : toIsoUtc(input.transcriptionCompletedAtUtc),
    transcriptionFailedAtUtc: transcriptionStatus === 'failed'
      ? toIsoUtc(input.transcriptionFailedAtUtc) || toIsoUtc(input.occurredAtUtc)
      : toIsoUtc(input.transcriptionFailedAtUtc),
  };
};

const mergeVoicemailArtifact = (
  existing: Voicemail,
  input: UpsertVoicemailArtifactInput,
): MutableVoicemailArtifact => {
  const nowIsoUtc = new Date().toISOString();
  const recordingStatus = resolveEffectiveRecordingStatus({
    existingStatus: existing.recordingStatus,
    incomingStatus: normalizeRecordingStatus(input.recordingStatus),
  });
  const transcriptionText = normalizeNullableString(input.transcriptionText)
    || resolveLegacyTranscriptionJsonText(input.transcriptionJson)
    || existing.transcriptionText;
  const transcriptionStatus = resolveEffectiveTranscriptionStatus({
    recordingStatus,
    explicitStatus: normalizeTranscriptionStatus(input.transcriptionStatus)
      || resolveLegacyTranscriptionJsonStatus(input.transcriptionJson),
    existingStatus: existing.transcriptionStatus,
    transcriptionText,
  });
  const requestedAtUtc = toIsoUtc(input.transcriptionRequestedAtUtc)
    || resolveLegacyTranscriptionJsonTimestamp(input.transcriptionJson, [
      'requestedAtUtc',
      'transcriptionRequestedAtUtc',
      'transcription_requested_at_utc',
    ])
    || existing.transcriptionRequestedAtUtc;
  const completedAtUtc = transcriptionStatus === 'completed'
    ? (
      toIsoUtc(input.transcriptionCompletedAtUtc)
      || resolveLegacyTranscriptionJsonTimestamp(input.transcriptionJson, [
        'completedAtUtc',
        'transcriptionCompletedAtUtc',
        'transcription_completed_at_utc',
      ])
      || existing.transcriptionCompletedAtUtc
      || toIsoUtc(input.occurredAtUtc)
      || nowIsoUtc
    )
    : existing.transcriptionCompletedAtUtc;
  const failedAtUtc = transcriptionStatus === 'failed'
    ? (
      toIsoUtc(input.transcriptionFailedAtUtc)
      || resolveLegacyTranscriptionJsonTimestamp(input.transcriptionJson, [
        'failedAtUtc',
        'transcriptionFailedAtUtc',
        'transcription_failed_at_utc',
      ])
      || existing.transcriptionFailedAtUtc
      || toIsoUtc(input.occurredAtUtc)
      || nowIsoUtc
    )
    : existing.transcriptionFailedAtUtc;

  return {
    id: existing.id,
    tenantId: existing.tenantId,
    orgUnitId: existing.orgUnitId,
    callId: normalizeNullableString(input.callId) || existing.callId,
    threadId: normalizeNullableString(input.threadId) || existing.threadId,
    personId: normalizeNullableString(input.personId) ?? existing.personId,
    artifactId: existing.artifactId,
    bridgeSessionId: normalizeNullableString(input.bridgeSessionId) || existing.bridgeSessionId,
    contactPointId: normalizeNullableString(input.contactPointId) || existing.contactPointId,
    direction: resolveArtifactDirection({
      existingDirection: existing.direction,
      incomingDirection: normalizeDirection(input.direction),
    }),
    recordingUrl: normalizeNullableString(input.recordingUrl) || existing.recordingUrl,
    recordingStatus,
    providerEventId: normalizeNullableString(input.providerEventId) || existing.providerEventId,
    providerLegId: normalizeNullableString(input.providerLegId) || existing.providerLegId,
    providerRecordingId: normalizeNullableString(input.providerRecordingId) || existing.providerRecordingId,
    occurredAtUtc: resolveOccurredAtUtc(existing.occurredAtUtc, toIsoUtc(input.occurredAtUtc)),
    createdAtUtc: existing.createdAtUtc,
    updatedAtUtc: nowIsoUtc,
    transcriptionStatus,
    transcriptionText,
    transcriptionProvider: normalizeNullableString(input.transcriptionProvider)
      || resolveLegacyTranscriptionJsonProvider(input.transcriptionJson)
      || existing.transcriptionProvider,
    transcriptionRequestedAtUtc: transcriptionStatus === 'pending'
      ? requestedAtUtc
      : requestedAtUtc,
    transcriptionCompletedAtUtc: completedAtUtc,
    transcriptionFailedAtUtc: failedAtUtc,
  };
};

const voicemailArtifactToDbRow = (artifact: MutableVoicemailArtifact) => ({
  id: artifact.id,
  tenant_id: artifact.tenantId,
  org_unit_id: artifact.orgUnitId,
  call_id: artifact.callId,
  thread_id: artifact.threadId,
  person_id: artifact.personId,
  artifact_id: artifact.artifactId,
  bridge_session_id: artifact.bridgeSessionId,
  contact_point_id: artifact.contactPointId,
  direction: artifact.direction,
  recording_url: artifact.recordingUrl,
  recording_status: artifact.recordingStatus,
  provider_event_id: artifact.providerEventId,
  provider_leg_id: artifact.providerLegId,
  provider_recording_id: artifact.providerRecordingId,
  occurred_at_utc: artifact.occurredAtUtc,
  created_at_utc: artifact.createdAtUtc,
  updated_at_utc: artifact.updatedAtUtc,
  transcription_status: artifact.transcriptionStatus,
  transcription_text: artifact.transcriptionText,
  transcription_provider: artifact.transcriptionProvider,
  transcription_requested_at_utc: artifact.transcriptionRequestedAtUtc,
  transcription_completed_at_utc: artifact.transcriptionCompletedAtUtc,
  transcription_failed_at_utc: artifact.transcriptionFailedAtUtc,
  transcription_json: buildLegacyTranscriptionJson(artifact),
});

export const canAttachConnectShyftVoicemailToBridgeSession = (
  bridgeSessionStatus: string | null | undefined,
): boolean => {
  const normalizedState = normalizeConnectShyftBridgeSessionState(bridgeSessionStatus);

  return normalizedState === BridgeSessionState.NEIGHBOR_DIALING
    || normalizedState === BridgeSessionState.VOICEMAIL;
};

export const canEnterConnectShyftVoicemailFromBridgeSession = (
  bridgeSessionStatus: string | null | undefined,
): boolean => (
  normalizeConnectShyftBridgeSessionState(bridgeSessionStatus) === BridgeSessionState.NEIGHBOR_DIALING
);

const correlationMatches = (
  voicemail: Voicemail,
  input: FindVoicemailArtifactInput,
): boolean => {
  const providerRecordingId = normalizeNullableString(input.providerRecordingId);
  if (providerRecordingId) {
    return voicemail.providerRecordingId === providerRecordingId;
  }

  const providerEventId = normalizeNullableString(input.providerEventId);
  if (providerEventId) {
    return voicemail.providerEventId === providerEventId;
  }

  const bridgeSessionId = normalizeNullableString(input.bridgeSessionId);
  const providerLegId = normalizeNullableString(input.providerLegId);
  const direction = normalizeDirection(input.direction);
  if (bridgeSessionId && providerLegId && direction) {
    return voicemail.bridgeSessionId === bridgeSessionId
      && voicemail.providerLegId === providerLegId
      && voicemail.direction === direction;
  }

  const artifactId = normalizeNullableString(input.artifactId);
  if (artifactId) {
    return voicemail.artifactId === artifactId;
  }

  const recordingUrl = normalizeNullableString(input.recordingUrl);
  if (recordingUrl) {
    return voicemail.recordingUrl === recordingUrl;
  }

  return false;
};

class InMemoryConnectShyftVoicemailStore implements ConnectShyftVoicemailService {
  private readonly records = new Map<string, Voicemail>();

  private orderedRecords(): Voicemail[] {
    return [...this.records.values()].sort((left, right) => (
      new Date(right.occurredAtUtc).getTime() - new Date(left.occurredAtUtc).getTime()
    ) || right.id.localeCompare(left.id));
  }

  async createVoicemail(input: CreateVoicemailInput): Promise<Voicemail> {
    return this.upsertVoicemailArtifact({
      ...input,
      direction: input.direction || 'outbound',
      transcriptionStatus: input.transcriptionStatus ?? null,
      transcriptionText: input.transcriptionText ?? null,
      transcriptionProvider: input.transcriptionProvider ?? null,
      transcriptionRequestedAtUtc: input.transcriptionRequestedAtUtc ?? null,
      transcriptionCompletedAtUtc: input.transcriptionCompletedAtUtc ?? null,
      transcriptionFailedAtUtc: input.transcriptionFailedAtUtc ?? null,
    });
  }

  async upsertVoicemailArtifact(input: UpsertVoicemailArtifactInput): Promise<Voicemail> {
    const existing = await this.findVoicemailArtifact({
      tenantId: input.tenantId,
      artifactId: input.artifactId,
      providerRecordingId: input.providerRecordingId,
      providerEventId: input.providerEventId,
      bridgeSessionId: input.bridgeSessionId,
      providerLegId: input.providerLegId,
      direction: input.direction,
      recordingUrl: input.recordingUrl,
    });

    const nextArtifact = existing
      ? mergeVoicemailArtifact(existing, input)
      : buildArtifactForInsert(input);
    const persisted = mapVoicemailRow(voicemailArtifactToDbRow(nextArtifact) as DbVoicemailRow);

    this.records.set(persisted.id, persisted);
    return persisted;
  }

  async findVoicemailArtifact(input: FindVoicemailArtifactInput): Promise<Voicemail | null> {
    const tenantId = normalizeNullableString(input.tenantId);
    if (!tenantId) {
      return null;
    }

    const record = this.orderedRecords().find((voicemail) => (
      voicemail.tenantId === tenantId
      && correlationMatches(voicemail, input)
    ));

    return record || null;
  }

  async listCallVoicemails(input: ListCallVoicemailsInput): Promise<Voicemail[]> {
    return this.orderedRecords().filter((voicemail) => (
      voicemail.tenantId === input.tenantId
      && voicemail.callId === input.callId
    ));
  }

  async listThreadVoicemails(input: ListThreadVoicemailsInput): Promise<Voicemail[]> {
    return this.orderedRecords().filter((voicemail) => (
      voicemail.tenantId === input.tenantId
      && voicemail.orgUnitId === input.orgUnitId
      && voicemail.threadId === input.threadId
    ));
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
  }
}

export class KnexConnectShyftVoicemailStore implements ConnectShyftVoicemailService {
  constructor(private readonly knexClient: Knex = db) {}

  private table() {
    return this.knexClient.withSchema(CONNECTSHYFT_SCHEMA).table(VOICEMAILS_TABLE);
  }

  private async findVoicemailArtifactRow(
    input: FindVoicemailArtifactInput,
  ): Promise<DbVoicemailRow | null> {
    const tenantId = normalizeNullableString(input.tenantId);
    if (!tenantId) {
      return null;
    }

    const providerRecordingId = normalizeNullableString(input.providerRecordingId);
    if (providerRecordingId) {
      const row = await this.table()
        .where({
          tenant_id: tenantId,
          provider_recording_id: providerRecordingId,
        })
        .first<DbVoicemailRow>();
      if (row) {
        return row;
      }
    }

    const providerEventId = normalizeNullableString(input.providerEventId);
    if (providerEventId) {
      const row = await this.table()
        .where({
          tenant_id: tenantId,
          provider_event_id: providerEventId,
        })
        .first<DbVoicemailRow>();
      if (row) {
        return row;
      }
    }

    const bridgeSessionId = normalizeNullableString(input.bridgeSessionId);
    const providerLegId = normalizeNullableString(input.providerLegId);
    const direction = normalizeDirection(input.direction);
    if (bridgeSessionId && providerLegId && direction) {
      const row = await this.table()
        .where({
          tenant_id: tenantId,
          bridge_session_id: bridgeSessionId,
          provider_leg_id: providerLegId,
          direction,
        })
        .first<DbVoicemailRow>();
      if (row) {
        return row;
      }
    }

    const artifactId = normalizeNullableString(input.artifactId);
    if (artifactId) {
      const row = await this.table()
        .where({
          tenant_id: tenantId,
          artifact_id: artifactId,
        })
        .first<DbVoicemailRow>();
      if (row) {
        return row;
      }
    }

    const recordingUrl = normalizeNullableString(input.recordingUrl);
    if (recordingUrl) {
      const row = await this.table()
        .where({
          tenant_id: tenantId,
          recording_url: recordingUrl,
        })
        .orderBy('occurred_at_utc', 'desc')
        .first<DbVoicemailRow>();
      if (row) {
        return row;
      }
    }

    return null;
  }

  async createVoicemail(input: CreateVoicemailInput): Promise<Voicemail> {
    return this.upsertVoicemailArtifact({
      ...input,
      direction: input.direction || 'outbound',
      transcriptionStatus: input.transcriptionStatus ?? null,
      transcriptionText: input.transcriptionText ?? null,
      transcriptionProvider: input.transcriptionProvider ?? null,
      transcriptionRequestedAtUtc: input.transcriptionRequestedAtUtc ?? null,
      transcriptionCompletedAtUtc: input.transcriptionCompletedAtUtc ?? null,
      transcriptionFailedAtUtc: input.transcriptionFailedAtUtc ?? null,
    });
  }

  async upsertVoicemailArtifact(input: UpsertVoicemailArtifactInput): Promise<Voicemail> {
    const existingRow = await this.findVoicemailArtifactRow({
      tenantId: input.tenantId,
      artifactId: input.artifactId,
      providerRecordingId: input.providerRecordingId,
      providerEventId: input.providerEventId,
      bridgeSessionId: input.bridgeSessionId,
      providerLegId: input.providerLegId,
      direction: input.direction,
      recordingUrl: input.recordingUrl,
    });

    if (existingRow) {
      const mergedArtifact = mergeVoicemailArtifact(mapVoicemailRow(existingRow), input);
      await this.table()
        .where({ id: existingRow.id })
        .update(voicemailArtifactToDbRow(mergedArtifact));

      const updatedRow = await this.table()
        .where({ id: existingRow.id })
        .first<DbVoicemailRow>();

      if (!updatedRow) {
        throw new Error(`Failed to reload ConnectShyft voicemail ${existingRow.id} after update.`);
      }

      return mapVoicemailRow(updatedRow);
    }

    const artifact = buildArtifactForInsert(input);
    const rowToInsert = voicemailArtifactToDbRow(artifact);

    try {
      await this.table().insert(rowToInsert);
    } catch (error) {
      const candidate = error as { code?: string };
      if (candidate?.code !== '23505') {
        throw error;
      }
    }

    const insertedRow = await this.findVoicemailArtifactRow({
      tenantId: input.tenantId,
      artifactId: input.artifactId,
      providerRecordingId: input.providerRecordingId,
      providerEventId: input.providerEventId,
      bridgeSessionId: input.bridgeSessionId,
      providerLegId: input.providerLegId,
      direction: input.direction,
      recordingUrl: input.recordingUrl,
    });

    if (!insertedRow) {
      throw new Error(`Failed to load ConnectShyft voicemail artifact after insert for ${input.tenantId}.`);
    }

    return mapVoicemailRow(insertedRow);
  }

  async findVoicemailArtifact(input: FindVoicemailArtifactInput): Promise<Voicemail | null> {
    const row = await this.findVoicemailArtifactRow(input);
    return row ? mapVoicemailRow(row) : null;
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

  async listThreadVoicemails(input: ListThreadVoicemailsInput): Promise<Voicemail[]> {
    const rows = await this.table()
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        thread_id: input.threadId,
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

  async upsertVoicemailArtifact(input: UpsertVoicemailArtifactInput): Promise<Voicemail> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftVoicemailStore.upsertVoicemailArtifact(input);
    }

    try {
      return await knexConnectShyftVoicemailStore.upsertVoicemailArtifact(input);
    } catch (error) {
      if (isConnectShyftPersistenceErrorCause(error)) {
        throw new ConnectShyftPersistenceUnavailableError(error);
      }
      throw error;
    }
  }

  async findVoicemailArtifact(input: FindVoicemailArtifactInput): Promise<Voicemail | null> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftVoicemailStore.findVoicemailArtifact(input);
    }

    try {
      return await knexConnectShyftVoicemailStore.findVoicemailArtifact(input);
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

  async listThreadVoicemails(input: ListThreadVoicemailsInput): Promise<Voicemail[]> {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryConnectShyftVoicemailStore.listThreadVoicemails(input);
    }

    try {
      return await knexConnectShyftVoicemailStore.listThreadVoicemails(input);
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

export const handleVoicemailTranscriptionCallback = async (
  input: HandleVoicemailTranscriptionCallbackInput,
): Promise<HandleVoicemailTranscriptionCallbackResult> => {
  const tenantId = normalizeNullableString(input.tenantId);
  const orgUnitId = normalizeNullableString(input.orgUnitId);
  const threadId = normalizeNullableString(input.threadId);
  const voicemailArtifactId = normalizeNullableString(input.voicemailArtifactId);
  const correlationProviderEventId = normalizeNullableString(input.correlationProviderEventId);
  const callbackProviderLegId = normalizeNullableString(input.callbackProviderLegId);
  const occurredAtUtc = toIsoUtc(input.occurredAtUtc) || new Date().toISOString();
  const transcriptionText = normalizeNullableString(input.transcriptionText);
  const transcriptionProvider = normalizeNullableString(input.transcriptionProvider);

  if (!tenantId || !orgUnitId || !threadId || !voicemailArtifactId || !correlationProviderEventId) {
    return {
      ok: false,
      reason: 'callback_correlation_unresolved',
    };
  }

  const matched = await connectShyftVoicemailServiceAsync.findVoicemailArtifact({
    tenantId,
    artifactId: voicemailArtifactId,
    providerEventId: correlationProviderEventId,
  });
  if (!matched) {
    return {
      ok: false,
      reason: 'callback_correlation_unresolved',
    };
  }

  if (
    matched.orgUnitId !== orgUnitId
    || matched.threadId !== threadId
    || matched.artifactId !== voicemailArtifactId
    || matched.providerEventId !== correlationProviderEventId
    || (
      callbackProviderLegId
      && matched.providerLegId
      && matched.providerLegId !== callbackProviderLegId
    )
  ) {
    return {
      ok: false,
      reason: 'callback_correlation_scope_invalid',
    };
  }

  const malformed = input.transcriptionStatus === 'completed' && !transcriptionText;
  const callbackStatus = malformed ? 'failed' : input.transcriptionStatus;
  const voicemail = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
    tenantId,
    orgUnitId,
    callId: matched.callId,
    threadId: matched.threadId,
    personId: matched.personId,
    artifactId: matched.artifactId,
    bridgeSessionId: matched.bridgeSessionId,
    contactPointId: matched.contactPointId,
    direction: matched.direction,
    providerEventId: matched.providerEventId,
    providerLegId: callbackProviderLegId || matched.providerLegId,
    providerRecordingId: matched.providerRecordingId,
    occurredAtUtc,
    transcriptionStatus: callbackStatus,
    transcriptionText: callbackStatus === 'completed' ? transcriptionText : null,
    transcriptionProvider,
    transcriptionRequestedAtUtc: matched.transcriptionRequestedAtUtc,
    transcriptionCompletedAtUtc: callbackStatus === 'completed' ? occurredAtUtc : null,
    transcriptionFailedAtUtc: callbackStatus === 'failed' ? occurredAtUtc : null,
  });

  return {
    ok: true,
    callbackStatus,
    malformed,
    voicemail,
  };
};

export const resetConnectShyftVoicemailStateForTests = (): void => {
  inMemoryConnectShyftVoicemailStore.reset();
};
