import type { Knex } from 'knex';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_IDENTIFIER_MAPPINGS_TABLE = 'cs_provider_identifier_mappings';
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts';

export type ConnectShyftProviderIdentifierKind = 'call_leg' | 'message';
export type ConnectShyftProviderCorrelationRefusalReason =
  | 'missing-identifiers'
  | 'not-found'
  | 'ambiguous';

export type ConnectShyftProviderIdentifierMapping = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  identifierKind: ConnectShyftProviderIdentifierKind;
  providerIdentifier: string;
  internalReferenceId: string;
  createdAtUtc: string;
};

export type ConnectShyftProviderCorrelationResolution = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  providerLegId: string | null;
  providerMessageId: string | null;
  internalCallReferenceId: string | null;
  internalMessageReferenceId: string | null;
};

export type ConnectShyftProviderCorrelationLookupResult =
  | {
    ok: true;
    source: 'provider_leg_id' | 'provider_message_id' | 'provider_consensus';
    correlation: ConnectShyftProviderCorrelationResolution;
  }
  | {
    ok: false;
    reason: ConnectShyftProviderCorrelationRefusalReason;
  };

type ConnectShyftProviderIdentifierMappingRecord = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  identifierKind: ConnectShyftProviderIdentifierKind;
  providerIdentifier: string;
  internalReferenceId: string;
  createdAtUtc: string;
};

type ConnectShyftProviderMappingRow = {
  tenant_id?: unknown;
  org_unit_id?: unknown;
  thread_id?: unknown;
  provider_name?: unknown;
  identifier_kind?: unknown;
  provider_identifier?: unknown;
  internal_reference_id?: unknown;
  created_at_utc?: unknown;
};

const inMemoryProviderIdentifierMappings =
  new Map<string, ConnectShyftProviderIdentifierMappingRecord>();
const inMemoryWebhookReceiptKeys = new Set<string>();

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const normalizeProviderName = (value: unknown): string => {
  return normalizeString(value).toLowerCase();
};

const normalizeIdentifierKind = (value: unknown): ConnectShyftProviderIdentifierKind | null => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === 'call_leg') {
    return 'call_leg';
  }
  if (normalized === 'message') {
    return 'message';
  }
  return null;
};

const buildMappingKey = (
  providerName: string,
  identifierKind: ConnectShyftProviderIdentifierKind,
  providerIdentifier: string,
): string => {
  return `${providerName}|${identifierKind}|${providerIdentifier}`;
};

const shouldUseDb = (
  input: {
    tenantId: string;
    threadId: string;
  },
  db?: Knex,
): boolean => {
  return Boolean(
    db
    && UUID_PATTERN.test(input.tenantId)
    && UUID_PATTERN.test(input.threadId),
  );
};

const shouldUseDbForWebhookReceipt = (
  input: {
    tenantId: string;
    threadId: string;
  },
  db?: Knex,
): boolean => {
  return Boolean(
    db
    && UUID_PATTERN.test(input.tenantId)
    && UUID_PATTERN.test(input.threadId),
  );
};

const mapDbRowToRecord = (
  row: ConnectShyftProviderMappingRow | null,
): ConnectShyftProviderIdentifierMappingRecord | null => {
  if (!row) {
    return null;
  }

  const identifierKind = normalizeIdentifierKind(row.identifier_kind);
  if (!identifierKind) {
    return null;
  }

  const providerName = normalizeProviderName(row.provider_name);
  const providerIdentifier = normalizeString(row.provider_identifier);
  const tenantId = normalizeString(row.tenant_id);
  const orgUnitId = normalizeString(row.org_unit_id);
  const threadId = normalizeString(row.thread_id);
  const internalReferenceId = normalizeString(row.internal_reference_id);
  const createdAtUtc = row.created_at_utc instanceof Date
    ? row.created_at_utc.toISOString()
    : normalizeString(row.created_at_utc);

  if (
    !providerName
    || !providerIdentifier
    || !tenantId
    || !orgUnitId
    || !threadId
    || !internalReferenceId
    || !createdAtUtc
  ) {
    return null;
  }

  return {
    tenantId,
    orgUnitId,
    threadId,
    providerName,
    identifierKind,
    providerIdentifier,
    internalReferenceId,
    createdAtUtc,
  };
};

const findInMemoryMapping = (input: {
  providerName: string;
  identifierKind: ConnectShyftProviderIdentifierKind;
  providerIdentifier: string;
}): ConnectShyftProviderIdentifierMappingRecord | null => {
  const key = buildMappingKey(input.providerName, input.identifierKind, input.providerIdentifier);
  return inMemoryProviderIdentifierMappings.get(key) || null;
};

const saveInMemoryMapping = (record: ConnectShyftProviderIdentifierMappingRecord): {
  status: 'created' | 'duplicate';
  mapping: ConnectShyftProviderIdentifierMapping;
} => {
  const key = buildMappingKey(record.providerName, record.identifierKind, record.providerIdentifier);
  const existing = inMemoryProviderIdentifierMappings.get(key);
  if (existing) {
    return {
      status: 'duplicate',
      mapping: { ...existing },
    };
  }

  inMemoryProviderIdentifierMappings.set(key, record);
  return {
    status: 'created',
    mapping: { ...record },
  };
};

const saveDbMapping = async (input: {
  db: Knex;
  record: ConnectShyftProviderIdentifierMappingRecord;
}): Promise<{
  status: 'created' | 'duplicate';
  mapping: ConnectShyftProviderIdentifierMapping;
}> => {
  const insertedRows = await input.db
    .withSchema('connectshyft')
    .table(PROVIDER_IDENTIFIER_MAPPINGS_TABLE)
    .insert({
      tenant_id: input.record.tenantId,
      org_unit_id: input.record.orgUnitId,
      thread_id: input.record.threadId,
      provider_name: input.record.providerName,
      identifier_kind: input.record.identifierKind,
      provider_identifier: input.record.providerIdentifier,
      internal_reference_id: input.record.internalReferenceId,
      created_at_utc: input.record.createdAtUtc,
    })
    .onConflict(['provider_name', 'identifier_kind', 'provider_identifier'])
    .ignore()
    .returning([
      'tenant_id',
      'org_unit_id',
      'thread_id',
      'provider_name',
      'identifier_kind',
      'provider_identifier',
      'internal_reference_id',
      'created_at_utc',
    ]);

  const inserted = mapDbRowToRecord(insertedRows[0] as ConnectShyftProviderMappingRow | undefined || null);
  if (inserted) {
    return {
      status: 'created',
      mapping: { ...inserted },
    };
  }

  const existingRow = await input.db
    .withSchema('connectshyft')
    .table(PROVIDER_IDENTIFIER_MAPPINGS_TABLE)
    .where({
      provider_name: input.record.providerName,
      identifier_kind: input.record.identifierKind,
      provider_identifier: input.record.providerIdentifier,
    })
    .first([
      'tenant_id',
      'org_unit_id',
      'thread_id',
      'provider_name',
      'identifier_kind',
      'provider_identifier',
      'internal_reference_id',
      'created_at_utc',
    ]);

  const existing = mapDbRowToRecord(existingRow as ConnectShyftProviderMappingRow | null);
  if (!existing) {
    return {
      status: 'duplicate',
      mapping: {
        ...input.record,
      },
    };
  }

  return {
    status: 'duplicate',
    mapping: { ...existing },
  };
};

const findDbMapping = async (input: {
  db: Knex;
  providerName: string;
  identifierKind: ConnectShyftProviderIdentifierKind;
  providerIdentifier: string;
}): Promise<ConnectShyftProviderIdentifierMappingRecord | null> => {
  const row = await input.db
    .withSchema('connectshyft')
    .table(PROVIDER_IDENTIFIER_MAPPINGS_TABLE)
    .where({
      provider_name: input.providerName,
      identifier_kind: input.identifierKind,
      provider_identifier: input.providerIdentifier,
    })
    .first([
      'tenant_id',
      'org_unit_id',
      'thread_id',
      'provider_name',
      'identifier_kind',
      'provider_identifier',
      'internal_reference_id',
      'created_at_utc',
    ]);

  return mapDbRowToRecord(row as ConnectShyftProviderMappingRow | null);
};

const toCorrelationResolution = (input: {
  callLegMapping: ConnectShyftProviderIdentifierMappingRecord | null;
  messageMapping: ConnectShyftProviderIdentifierMappingRecord | null;
  source: 'provider_leg_id' | 'provider_message_id' | 'provider_consensus';
}): ConnectShyftProviderCorrelationLookupResult => {
  const resolvedBase = input.callLegMapping || input.messageMapping;
  if (!resolvedBase) {
    return {
      ok: false,
      reason: 'not-found',
    };
  }

  return {
    ok: true,
    source: input.source,
    correlation: {
      tenantId: resolvedBase.tenantId,
      orgUnitId: resolvedBase.orgUnitId,
      threadId: resolvedBase.threadId,
      providerName: resolvedBase.providerName,
      providerLegId: input.callLegMapping?.providerIdentifier || null,
      providerMessageId: input.messageMapping?.providerIdentifier || null,
      internalCallReferenceId: input.callLegMapping?.internalReferenceId || null,
      internalMessageReferenceId: input.messageMapping?.internalReferenceId || null,
    },
  };
};

const mappingsConflict = (
  left: ConnectShyftProviderIdentifierMappingRecord,
  right: ConnectShyftProviderIdentifierMappingRecord,
): boolean => {
  return left.tenantId !== right.tenantId
    || left.orgUnitId !== right.orgUnitId
    || left.threadId !== right.threadId;
};

const buildWebhookDedupeKey = (input: {
  canonicalEventType: string;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerMessageId?: string | null;
}): string | null => {
  const canonicalEventType = normalizeString(input.canonicalEventType).toLowerCase();
  const providerEventId = normalizeString(input.providerEventId || null).toLowerCase();
  const providerLegId = normalizeString(input.providerLegId || null).toLowerCase();
  const providerMessageId = normalizeString(input.providerMessageId || null).toLowerCase();

  if (providerEventId) {
    return `provider-event:${providerEventId}`;
  }
  if (providerLegId && canonicalEventType) {
    return `call-leg:${providerLegId}|event:${canonicalEventType}`;
  }
  if (providerMessageId && canonicalEventType) {
    return `message:${providerMessageId}|event:${canonicalEventType}`;
  }
  return null;
};

export const recordConnectShyftProviderIdentifierMapping = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  identifierKind: ConnectShyftProviderIdentifierKind;
  providerIdentifier: string;
  internalReferenceId: string;
  createdAtUtc?: string;
  db?: Knex;
}): Promise<{
  status: 'created' | 'duplicate' | 'ignored';
  mapping: ConnectShyftProviderIdentifierMapping | null;
}> => {
  const providerName = normalizeProviderName(input.providerName);
  const providerIdentifier = normalizeString(input.providerIdentifier);
  const tenantId = normalizeString(input.tenantId);
  const orgUnitId = normalizeString(input.orgUnitId);
  const threadId = normalizeString(input.threadId);
  const internalReferenceId = normalizeString(input.internalReferenceId);
  const createdAtUtc = normalizeString(input.createdAtUtc) || new Date().toISOString();

  if (
    !providerName
    || !providerIdentifier
    || !tenantId
    || !orgUnitId
    || !threadId
    || !internalReferenceId
  ) {
    return {
      status: 'ignored',
      mapping: null,
    };
  }

  const record: ConnectShyftProviderIdentifierMappingRecord = {
    tenantId,
    orgUnitId,
    threadId,
    providerName,
    identifierKind: input.identifierKind,
    providerIdentifier,
    internalReferenceId,
    createdAtUtc,
  };

  if (!shouldUseDb({ tenantId, threadId }, input.db)) {
    const saved = saveInMemoryMapping(record);
    return {
      status: saved.status,
      mapping: saved.mapping,
    };
  }

  try {
    const saved = await saveDbMapping({
      db: input.db as Knex,
      record,
    });

    return {
      status: saved.status,
      mapping: saved.mapping,
    };
  } catch (_error) {
    const saved = saveInMemoryMapping(record);
    return {
      status: saved.status,
      mapping: saved.mapping,
    };
  }
};

export const resolveConnectShyftProviderCorrelationByIdentifiers = async (input: {
  providerName: string;
  providerLegId?: string | null;
  providerMessageId?: string | null;
  db?: Knex;
}): Promise<ConnectShyftProviderCorrelationLookupResult> => {
  const providerName = normalizeProviderName(input.providerName);
  const providerLegId = normalizeString(input.providerLegId || null);
  const providerMessageId = normalizeString(input.providerMessageId || null);

  if (!providerName || (!providerLegId && !providerMessageId)) {
    return {
      ok: false,
      reason: 'missing-identifiers',
    };
  }

  let callLegMapping: ConnectShyftProviderIdentifierMappingRecord | null = null;
  let messageMapping: ConnectShyftProviderIdentifierMappingRecord | null = null;

  if (providerLegId) {
    callLegMapping = findInMemoryMapping({
      providerName,
      identifierKind: 'call_leg',
      providerIdentifier: providerLegId,
    });
  }

  if (providerMessageId) {
    messageMapping = findInMemoryMapping({
      providerName,
      identifierKind: 'message',
      providerIdentifier: providerMessageId,
    });
  }

  if (input.db && providerLegId && !callLegMapping) {
    try {
      callLegMapping = await findDbMapping({
        db: input.db,
        providerName,
        identifierKind: 'call_leg',
        providerIdentifier: providerLegId,
      });
    } catch (_error) {
      callLegMapping = callLegMapping || null;
    }
  }

  if (input.db && providerMessageId && !messageMapping) {
    try {
      messageMapping = await findDbMapping({
        db: input.db,
        providerName,
        identifierKind: 'message',
        providerIdentifier: providerMessageId,
      });
    } catch (_error) {
      messageMapping = messageMapping || null;
    }
  }

  if (callLegMapping && messageMapping && mappingsConflict(callLegMapping, messageMapping)) {
    return {
      ok: false,
      reason: 'ambiguous',
    };
  }

  if (callLegMapping && messageMapping) {
    return toCorrelationResolution({
      callLegMapping,
      messageMapping,
      source: 'provider_consensus',
    });
  }

  if (callLegMapping) {
    return toCorrelationResolution({
      callLegMapping,
      messageMapping: null,
      source: 'provider_leg_id',
    });
  }

  if (messageMapping) {
    return toCorrelationResolution({
      callLegMapping: null,
      messageMapping,
      source: 'provider_message_id',
    });
  }

  return {
    ok: false,
    reason: 'not-found',
  };
};

export const recordConnectShyftWebhookReceipt = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  canonicalEventType: string;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerMessageId?: string | null;
  db?: Knex;
}): Promise<{
  deterministic: true;
  duplicate: boolean;
  dedupeKey: string | null;
}> => {
  const providerName = normalizeProviderName(input.providerName);
  const tenantId = normalizeString(input.tenantId);
  const orgUnitId = normalizeString(input.orgUnitId);
  const threadId = normalizeString(input.threadId);
  const canonicalEventType = normalizeString(input.canonicalEventType);
  const providerEventId = normalizeString(input.providerEventId || null);
  const providerLegId = normalizeString(input.providerLegId || null);
  const providerMessageId = normalizeString(input.providerMessageId || null);
  const dedupeKey = buildWebhookDedupeKey({
    canonicalEventType,
    providerEventId,
    providerLegId,
    providerMessageId,
  });

  if (!providerName || !dedupeKey || !tenantId || !orgUnitId || !threadId || !canonicalEventType) {
    return {
      deterministic: true,
      duplicate: false,
      dedupeKey,
    };
  }

  const inMemoryReceiptKey = `${providerName}|${dedupeKey}`;
  if (!shouldUseDbForWebhookReceipt({ tenantId, threadId }, input.db)) {
    if (inMemoryWebhookReceiptKeys.has(inMemoryReceiptKey)) {
      return {
        deterministic: true,
        duplicate: true,
        dedupeKey,
      };
    }
    inMemoryWebhookReceiptKeys.add(inMemoryReceiptKey);
    return {
      deterministic: true,
      duplicate: false,
      dedupeKey,
    };
  }

  try {
    const db = input.db as Knex;
    const inserted = await db
      .withSchema('connectshyft')
      .table(WEBHOOK_RECEIPTS_TABLE)
      .insert({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        thread_id: threadId,
        provider_name: providerName,
        provider_event_id: providerEventId || null,
        provider_identifier_kind: providerLegId
          ? 'call_leg'
          : providerMessageId
            ? 'message'
            : null,
        provider_identifier: providerLegId || providerMessageId || null,
        canonical_event_type: canonicalEventType,
        dedupe_key: dedupeKey,
      })
      .onConflict(['provider_name', 'dedupe_key'])
      .ignore()
      .returning(['id']);

    if (inserted.length > 0) {
      return {
        deterministic: true,
        duplicate: false,
        dedupeKey,
      };
    }

    return {
      deterministic: true,
      duplicate: true,
      dedupeKey,
    };
  } catch (_error) {
    if (inMemoryWebhookReceiptKeys.has(inMemoryReceiptKey)) {
      return {
        deterministic: true,
        duplicate: true,
        dedupeKey,
      };
    }
    inMemoryWebhookReceiptKeys.add(inMemoryReceiptKey);
    return {
      deterministic: true,
      duplicate: false,
      dedupeKey,
    };
  }
};

export const resetConnectShyftProviderCorrelationStateForTests = (): void => {
  inMemoryProviderIdentifierMappings.clear();
  inMemoryWebhookReceiptKeys.clear();
};
