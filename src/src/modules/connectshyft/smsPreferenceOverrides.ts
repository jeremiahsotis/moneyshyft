import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../config/knex';

export type ConnectShyftCanonicalTextingPreference = 'UNKNOWN' | 'YES' | 'NO';

const CONNECTSHYFT_CANONICAL_TEXTING_PREFERENCES = new Set<ConnectShyftCanonicalTextingPreference>([
  'UNKNOWN',
  'YES',
  'NO',
]);

const CONNECTSHYFT_ALLOWED_SMS_OVERRIDE_REASONS = [
  'safety-follow-up',
  'care-plan-exception',
  'documented-consent',
  'critical-service-update',
] as const;

export const CONNECTSHYFT_SMS_OVERRIDE_REASON_OPTIONS: readonly string[] = [
  ...CONNECTSHYFT_ALLOWED_SMS_OVERRIDE_REASONS,
];

export type ConnectShyftSmsOverrideReason =
  (typeof CONNECTSHYFT_ALLOWED_SMS_OVERRIDE_REASONS)[number];

export type ConnectShyftResolvedSmsPreference = {
  prefersTexting: ConnectShyftCanonicalTextingPreference;
  neighborId: string | null;
  source: 'thread-map' | 'neighbor-record' | 'unknown';
};

export type ConnectShyftValidatedSmsOverride = {
  reason: ConnectShyftSmsOverrideReason;
  note: string | null;
};

export type ConnectShyftValidateSmsOverrideInput = {
  prefersTexting: ConnectShyftCanonicalTextingPreference;
  overrideReason: string | null;
  overrideNote: string | null;
};

export type ConnectShyftValidateSmsOverrideResult =
  | {
    ok: true;
    overrideRequired: boolean;
    override: ConnectShyftValidatedSmsOverride | null;
  }
  | {
    ok: false;
    reason: 'required' | 'invalid';
    message: string;
    allowedReasons: readonly string[];
  };

export type ConnectShyftPersistSmsOverrideInput = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  neighborId: string | null;
  actorUserId: string | null;
  preferenceValue: 'NO';
  override: ConnectShyftValidatedSmsOverride;
  messageBody: string;
  messageEventName: string;
};

export type ConnectShyftPersistedSmsOverride = {
  overrideId: string;
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  neighborId: string | null;
  actorUserId: string | null;
  preferenceValue: 'NO';
  overrideReason: ConnectShyftSmsOverrideReason;
  overrideNote: string | null;
  messageBody: string;
  messageEventName: string;
  auditMetadata: Record<string, unknown>;
  createdAtUtc: string;
  durability: 'database' | 'in-memory';
};

const CONNECTSHYFT_SYNTHETIC_THREAD_TEXTING_PREFERENCES: Record<string, ConnectShyftCanonicalTextingPreference> = {
  'thread-c4-unclaimed-pref-no-1004': 'NO',
  'thread-c4-closed-pref-no-1005': 'NO',
  'thread-d4-unclaimed-prefers-no-1004': 'NO',
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const normalizeOptionalUuid = (value: unknown): string | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized || !UUID_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

const nowIsoUtc = (): string => new Date().toISOString();

const normalizePreference = (value: unknown): ConnectShyftCanonicalTextingPreference => {
  const normalized = normalizeString(value).toUpperCase();
  if (CONNECTSHYFT_CANONICAL_TEXTING_PREFERENCES.has(normalized as ConnectShyftCanonicalTextingPreference)) {
    return normalized as ConnectShyftCanonicalTextingPreference;
  }

  return 'UNKNOWN';
};

const normalizeOverrideReason = (value: unknown): ConnectShyftSmsOverrideReason | null => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  return CONNECTSHYFT_ALLOWED_SMS_OVERRIDE_REASONS.includes(
    normalized as ConnectShyftSmsOverrideReason,
  )
    ? (normalized as ConnectShyftSmsOverrideReason)
    : null;
};

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

export const validateConnectShyftSmsOverride = (
  input: ConnectShyftValidateSmsOverrideInput,
): ConnectShyftValidateSmsOverrideResult => {
  const overrideReason = normalizeOptionalString(input.overrideReason);
  const normalizedReason = normalizeOverrideReason(overrideReason);
  const overrideNote = normalizeOptionalString(input.overrideNote);

  if (input.prefersTexting !== 'NO') {
    return {
      ok: true,
      overrideRequired: false,
      override: normalizedReason
        ? {
          reason: normalizedReason,
          note: overrideNote,
        }
        : null,
    };
  }

  if (!overrideReason) {
    return {
      ok: false,
      reason: 'required',
      message: 'Outbound SMS requires an override reason when prefers_texting=NO.',
      allowedReasons: CONNECTSHYFT_SMS_OVERRIDE_REASON_OPTIONS,
    };
  }

  if (!normalizedReason) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Override reason is invalid. Use an approved override reason value.',
      allowedReasons: CONNECTSHYFT_SMS_OVERRIDE_REASON_OPTIONS,
    };
  }

  return {
    ok: true,
    overrideRequired: true,
    override: {
      reason: normalizedReason,
      note: overrideNote,
    },
  };
};

class InMemoryConnectShyftSmsPreferenceOverrideStore {
  private readonly preferencesByThreadId = new Map<string, ConnectShyftCanonicalTextingPreference>(
    Object.entries(CONNECTSHYFT_SYNTHETIC_THREAD_TEXTING_PREFERENCES),
  );

  private readonly overrides: ConnectShyftPersistedSmsOverride[] = [];

  resolvePreference(input: {
    threadId: string;
    neighborId?: string | null;
  }): ConnectShyftResolvedSmsPreference {
    const preference = this.preferencesByThreadId.get(input.threadId) || 'UNKNOWN';
    return {
      prefersTexting: preference,
      neighborId: normalizeOptionalString(input.neighborId),
      source: preference === 'UNKNOWN' ? 'unknown' : 'thread-map',
    };
  }

  persistOverride(input: ConnectShyftPersistSmsOverrideInput): ConnectShyftPersistedSmsOverride {
    const createdAtUtc = nowIsoUtc();
    const overrideId = randomUUID();
    const actorUserId = normalizeOptionalUuid(input.actorUserId);
    const record: ConnectShyftPersistedSmsOverride = {
      overrideId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      neighborId: normalizeOptionalString(input.neighborId),
      actorUserId,
      preferenceValue: 'NO',
      overrideReason: input.override.reason,
      overrideNote: input.override.note,
      messageBody: input.messageBody,
      messageEventName: input.messageEventName,
      auditMetadata: {
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        thread_id: input.threadId,
        neighbor_id: normalizeOptionalString(input.neighborId),
        actor_user_id: actorUserId,
        preference_value: 'NO',
        override_reason: input.override.reason,
        override_note: input.override.note,
        message_event_name: input.messageEventName,
      },
      createdAtUtc,
      durability: 'in-memory',
    };

    this.overrides.push(record);
    return {
      ...record,
      auditMetadata: {
        ...record.auditMetadata,
      },
    };
  }
}

class KnexConnectShyftSmsPreferenceOverrideStore {
  constructor(private readonly knexClient: Knex = db) {}

  async resolvePreference(input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
    neighborId?: string | null;
  }): Promise<ConnectShyftResolvedSmsPreference> {
    let neighborId = normalizeOptionalString(input.neighborId);

    if (!neighborId) {
      const thread = await this.knexClient
        .withSchema('connectshyft')
        .table('cs_threads')
        .where({
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId,
          id: input.threadId,
        })
        .first<{ neighbor_id?: unknown }>('neighbor_id');

      neighborId = normalizeOptionalString(thread?.neighbor_id);
    }

    if (!neighborId) {
      return {
        prefersTexting: 'UNKNOWN',
        neighborId: null,
        source: 'unknown',
      };
    }

    if (!UUID_PATTERN.test(neighborId)) {
      return {
        prefersTexting: 'UNKNOWN',
        neighborId,
        source: 'unknown',
      };
    }

    const neighbor = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: input.tenantId,
        id: neighborId,
      })
      .first<{ prefers_texting?: unknown }>('prefers_texting');

    if (!neighbor) {
      return {
        prefersTexting: 'UNKNOWN',
        neighborId,
        source: 'unknown',
      };
    }

    return {
      prefersTexting: normalizePreference(neighbor.prefers_texting),
      neighborId,
      source: 'neighbor-record',
    };
  }

  async persistOverride(input: ConnectShyftPersistSmsOverrideInput): Promise<ConnectShyftPersistedSmsOverride> {
    const actorUserId = normalizeOptionalUuid(input.actorUserId);
    const auditMetadata: Record<string, unknown> = {
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId,
      thread_id: input.threadId,
      neighbor_id: normalizeOptionalString(input.neighborId),
      actor_user_id: actorUserId,
      preference_value: 'NO',
      override_reason: input.override.reason,
      override_note: input.override.note,
      message_event_name: input.messageEventName,
    };

    const [row] = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_sms_preference_overrides')
      .insert({
        id: randomUUID(),
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        thread_id: input.threadId,
        neighbor_id: normalizeOptionalString(input.neighborId),
        actor_user_id: actorUserId,
        preference_value: 'NO',
        override_reason: input.override.reason,
        override_note: input.override.note,
        message_body: input.messageBody,
        message_event_name: input.messageEventName,
        audit_metadata: auditMetadata,
        created_at_utc: this.knexClient.fn.now(),
      })
      .returning<
      Array<{
        id: string;
        tenant_id: string;
        org_unit_id: string;
        thread_id: string;
        neighbor_id: string | null;
        actor_user_id: string | null;
        preference_value: 'NO';
        override_reason: ConnectShyftSmsOverrideReason;
        override_note: string | null;
        message_body: string;
        message_event_name: string;
        audit_metadata: Record<string, unknown>;
        created_at_utc: string | Date;
      }>
      >([
        'id',
        'tenant_id',
        'org_unit_id',
        'thread_id',
        'neighbor_id',
        'actor_user_id',
        'preference_value',
        'override_reason',
        'override_note',
        'message_body',
        'message_event_name',
        'audit_metadata',
        'created_at_utc',
      ]);

    return {
      overrideId: row.id,
      tenantId: row.tenant_id,
      orgUnitId: row.org_unit_id,
      threadId: row.thread_id,
      neighborId: normalizeOptionalString(row.neighbor_id),
      actorUserId: normalizeOptionalUuid(row.actor_user_id),
      preferenceValue: 'NO',
      overrideReason: row.override_reason,
      overrideNote: normalizeOptionalString(row.override_note),
      messageBody: row.message_body,
      messageEventName: row.message_event_name,
      auditMetadata: row.audit_metadata || auditMetadata,
      createdAtUtc: row.created_at_utc instanceof Date
        ? row.created_at_utc.toISOString()
        : String(row.created_at_utc),
      durability: 'database',
    };
  }
}

export class AsyncConnectShyftSmsPreferenceOverrideService {
  constructor(
    private readonly store: KnexConnectShyftSmsPreferenceOverrideStore = new KnexConnectShyftSmsPreferenceOverrideStore(),
    private readonly fallbackStore: InMemoryConnectShyftSmsPreferenceOverrideStore = new InMemoryConnectShyftSmsPreferenceOverrideStore(),
  ) {}

  async resolvePreference(input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
    neighborId?: string | null;
  }): Promise<ConnectShyftResolvedSmsPreference> {
    const fallback = this.fallbackStore.resolvePreference(input);
    if (fallback.prefersTexting !== 'UNKNOWN') {
      return fallback;
    }

    try {
      return await this.store.resolvePreference(input);
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }
      return fallback;
    }
  }

  validateOverride(
    input: ConnectShyftValidateSmsOverrideInput,
  ): ConnectShyftValidateSmsOverrideResult {
    return validateConnectShyftSmsOverride(input);
  }

  async persistApprovedOverride(
    input: ConnectShyftPersistSmsOverrideInput,
  ): Promise<ConnectShyftPersistedSmsOverride> {
    try {
      return await this.store.persistOverride(input);
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }
      return this.fallbackStore.persistOverride(input);
    }
  }
}

export const connectShyftSmsPreferenceOverrideServiceAsync =
  new AsyncConnectShyftSmsPreferenceOverrideService();
