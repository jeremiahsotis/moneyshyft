import type { Knex } from 'knex';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_IDENTIFIER_MAPPINGS_TABLE = 'cs_provider_identifier_mappings';
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts';
const WEBHOOK_RECEIPT_RETENTION_DEFAULT_DAYS = 180;

export type ConnectShyftProviderIdentifierKind = 'call_leg' | 'message';
export type ConnectShyftWebhookReceiptProcessingStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'APPLIED'
  | 'IGNORED_DUPLICATE'
  | 'FAILED_RETRYABLE'
  | 'FAILED_TERMINAL';
export type ConnectShyftWebhookFailureClassification = {
  category: string;
  retryable: boolean;
  httpStatus?: number | null;
  providerCode?: string | null;
};
export type ConnectShyftProviderCorrelationRefusalReason =
  | 'missing-identifiers'
  | 'not-found'
  | 'ambiguous'
  | 'unavailable';
export const CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_POLICY_DAYS = WEBHOOK_RECEIPT_RETENTION_DEFAULT_DAYS;

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
const inMemoryWebhookReceiptStates = new Map<string, {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  sid: string;
  eventType: string;
  dedupeKey: string;
  payloadHash: string | null;
  status: ConnectShyftWebhookReceiptProcessingStatus;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  processedAtUtc: string | null;
  attemptCount: number;
  correlationKeys: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  failureReason: string | null;
  nextRetryAtUtc: string | null;
  lastFailureClassification: ConnectShyftWebhookFailureClassification | null;
}>();

type ConnectShyftWebhookReceiptRow = {
  processing_status?: unknown;
  attempt_count?: unknown;
  thread_id?: unknown;
  dedupe_key?: unknown;
  payload_hash?: unknown;
  processed_at_utc?: unknown;
  first_seen_at_utc?: unknown;
  last_seen_at_utc?: unknown;
  failure_reason?: unknown;
  error_code?: unknown;
  error_message?: unknown;
  next_retry_at_utc?: unknown;
  last_failure_classification?: unknown;
};

type ConnectShyftWebhookReceiptStateRecord = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  sid: string;
  eventType: string;
  dedupeKey: string;
  payloadHash: string | null;
  status: ConnectShyftWebhookReceiptProcessingStatus;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  processedAtUtc: string | null;
  attemptCount: number;
  correlationKeys: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  failureReason: string | null;
  nextRetryAtUtc: string | null;
  lastFailureClassification: ConnectShyftWebhookFailureClassification | null;
};

type ConnectShyftWebhookReceiptBeginResult = {
  deterministic: true;
  alreadyApplied: boolean;
  shouldProcess: boolean;
  previousStatus: ConnectShyftWebhookReceiptProcessingStatus | null;
  dedupeKey: string | null;
  status: ConnectShyftWebhookReceiptProcessingStatus;
  attemptCount: number;
  nextRetryAtUtc?: string | null;
  lastFailureClassification?: ConnectShyftWebhookFailureClassification | null;
  error?: {
    code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE';
    message: string;
  };
};

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

const normalizeWebhookReceiptProcessingStatus = (
  value: unknown,
): ConnectShyftWebhookReceiptProcessingStatus => {
  const normalized = normalizeString(value).toUpperCase();
  if (normalized === 'PROCESSING') {
    return 'PROCESSING';
  }
  if (normalized === 'APPLIED') {
    return 'APPLIED';
  }
  if (normalized === 'IGNORED_DUPLICATE') {
    return 'IGNORED_DUPLICATE';
  }
  if (normalized === 'FAILED_RETRYABLE') {
    return 'FAILED_RETRYABLE';
  }
  if (normalized === 'FAILED_TERMINAL') {
    return 'FAILED_TERMINAL';
  }
  return 'RECEIVED';
};

const normalizeWebhookReceiptSid = (input: {
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerMessageId?: string | null;
  payloadHash?: string | null;
}): string => {
  const payloadHash = normalizeString(input.payloadHash || null).toLowerCase();
  return (
    normalizeString(input.providerEventId || null)
    || normalizeString(input.providerLegId || null)
    || normalizeString(input.providerMessageId || null)
    || (payloadHash ? `payload:${payloadHash}` : '')
  ).toLowerCase();
};

const normalizeWebhookReceiptEventType = (canonicalEventType: string): string => {
  return normalizeString(canonicalEventType).toLowerCase();
};

const buildMappingKey = (
  tenantId: string,
  providerName: string,
  identifierKind: ConnectShyftProviderIdentifierKind,
  providerIdentifier: string,
): string => {
  return `${tenantId}|${providerName}|${identifierKind}|${providerIdentifier}`;
};

const buildMappingLookupKey = (
  providerName: string,
  identifierKind: ConnectShyftProviderIdentifierKind,
  providerIdentifier: string,
): string => {
  return `${providerName}|${identifierKind}|${providerIdentifier}`;
};

const buildInMemoryWebhookReceiptStateKey = (
  tenantId: string,
  providerName: string,
  sid: string,
  eventType: string,
): string => {
  return `${tenantId}|${providerName}|${sid}|${eventType}`;
};

const parseAttemptCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(1, parsed);
    }
  }

  return 1;
};

const normalizeWebhookReceiptFailureClassification = (
  value: unknown,
): ConnectShyftWebhookFailureClassification | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const category = normalizeString(record.category);
  if (!category) {
    return null;
  }

  return {
    category,
    retryable: record.retryable === true,
    httpStatus: typeof record.httpStatus === 'number'
      ? record.httpStatus
      : typeof record.http_status === 'number'
        ? record.http_status
        : null,
    providerCode: normalizeString(record.providerCode ?? record.provider_code) || null,
  };
};

const statusRepresentsProcessedWebhookReceipt = (
  status: ConnectShyftWebhookReceiptProcessingStatus,
): boolean => {
  return status === 'APPLIED' || status === 'IGNORED_DUPLICATE';
};

const toFailureMetadata = (input: {
  status: ConnectShyftWebhookReceiptProcessingStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  failureReason?: string | null;
}): {
  errorCode: string | null;
  errorMessage: string | null;
  failureReason: string | null;
} => {
  if (input.status !== 'FAILED_RETRYABLE' && input.status !== 'FAILED_TERMINAL') {
    return {
      errorCode: null,
      errorMessage: null,
      failureReason: null,
    };
  }

  const errorCode = normalizeString(input.errorCode || input.failureReason || null) || null;
  const errorMessage = normalizeString(input.errorMessage || input.failureReason || null) || null;

  return {
    errorCode,
    errorMessage,
    failureReason: errorCode,
  };
};

const mapWebhookReceiptRowToState = (input: {
  tenantId: string;
  orgUnitId: string;
  providerName: string;
  sid: string;
  eventType: string;
  row: ConnectShyftWebhookReceiptRow | null;
}): ConnectShyftWebhookReceiptStateRecord | null => {
  if (!input.row) {
    return null;
  }

  const firstSeenAtUtc = input.row.first_seen_at_utc instanceof Date
    ? input.row.first_seen_at_utc.toISOString()
    : normalizeString(input.row.first_seen_at_utc);
  const lastSeenAtUtc = input.row.last_seen_at_utc instanceof Date
    ? input.row.last_seen_at_utc.toISOString()
    : normalizeString(input.row.last_seen_at_utc);
  const processedAtUtc = input.row.processed_at_utc instanceof Date
    ? input.row.processed_at_utc.toISOString()
    : normalizeString(input.row.processed_at_utc) || null;

  return {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: normalizeString(input.row.thread_id),
    providerName: input.providerName,
    sid: input.sid,
    eventType: input.eventType,
    dedupeKey: normalizeString(input.row.dedupe_key),
    payloadHash: normalizeString(input.row.payload_hash) || null,
    status: normalizeWebhookReceiptProcessingStatus(input.row.processing_status),
    firstSeenAtUtc: firstSeenAtUtc || new Date().toISOString(),
    lastSeenAtUtc: lastSeenAtUtc || firstSeenAtUtc || new Date().toISOString(),
    processedAtUtc,
    attemptCount: parseAttemptCount(input.row.attempt_count),
    correlationKeys: null,
    errorCode: normalizeString(input.row.error_code || input.row.failure_reason) || null,
    errorMessage: normalizeString(input.row.error_message) || null,
    failureReason: normalizeString(input.row.failure_reason) || null,
    nextRetryAtUtc: normalizeString(input.row.next_retry_at_utc) || null,
    lastFailureClassification: normalizeWebhookReceiptFailureClassification(
      input.row.last_failure_classification,
    ),
  };
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
    && input.tenantId.length > 0,
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

const findInMemoryMappings = (input: {
  tenantId?: string | null;
  providerName: string;
  identifierKind: ConnectShyftProviderIdentifierKind;
  providerIdentifier: string;
}): ConnectShyftProviderIdentifierMappingRecord[] => {
  const tenantId = normalizeString(input.tenantId || null);
  const lookupKey = buildMappingLookupKey(
    input.providerName,
    input.identifierKind,
    input.providerIdentifier,
  );
  const matches: ConnectShyftProviderIdentifierMappingRecord[] = [];
  for (const record of inMemoryProviderIdentifierMappings.values()) {
    if (
      record.providerName === input.providerName
      && record.identifierKind === input.identifierKind
      && record.providerIdentifier === input.providerIdentifier
      && (!tenantId || record.tenantId === tenantId)
      && buildMappingLookupKey(
        record.providerName,
        record.identifierKind,
        record.providerIdentifier,
      ) === lookupKey
    ) {
      matches.push(record);
    }
  }
  return matches;
};

const saveInMemoryMapping = (record: ConnectShyftProviderIdentifierMappingRecord): {
  status: 'created' | 'duplicate';
  mapping: ConnectShyftProviderIdentifierMapping;
} => {
  const key = buildMappingKey(
    record.tenantId,
    record.providerName,
    record.identifierKind,
    record.providerIdentifier,
  );
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
    .onConflict(['tenant_id', 'provider_name', 'identifier_kind', 'provider_identifier'])
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
      tenant_id: input.record.tenantId,
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

const findDbMappings = async (input: {
  db: Knex;
  tenantId?: string | null;
  providerName: string;
  identifierKind: ConnectShyftProviderIdentifierKind;
  providerIdentifier: string;
}): Promise<ConnectShyftProviderIdentifierMappingRecord[]> => {
  const query = input.db
    .withSchema('connectshyft')
    .table(PROVIDER_IDENTIFIER_MAPPINGS_TABLE)
    .where({
      provider_name: input.providerName,
      identifier_kind: input.identifierKind,
      provider_identifier: input.providerIdentifier,
    });

  const tenantId = normalizeString(input.tenantId || null);
  if (tenantId) {
    query.andWhere('tenant_id', tenantId);
  }

  const rows = await query.select([
    'tenant_id',
    'org_unit_id',
    'thread_id',
    'provider_name',
    'identifier_kind',
    'provider_identifier',
    'internal_reference_id',
    'created_at_utc',
  ]);

  return rows
    .map((row) => mapDbRowToRecord(row as ConnectShyftProviderMappingRow))
    .filter((record): record is ConnectShyftProviderIdentifierMappingRecord => record !== null);
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
  payloadHash?: string | null;
}): string | null => {
  const canonicalEventType = normalizeString(input.canonicalEventType).toLowerCase();
  const providerEventId = normalizeString(input.providerEventId || null).toLowerCase();
  const providerLegId = normalizeString(input.providerLegId || null).toLowerCase();
  const providerMessageId = normalizeString(input.providerMessageId || null).toLowerCase();
  const payloadHash = normalizeString(input.payloadHash || null).toLowerCase();

  if (providerEventId) {
    return `provider-event:${providerEventId}`;
  }
  if (providerLegId && canonicalEventType) {
    return `call-leg:${providerLegId}|event:${canonicalEventType}`;
  }
  if (providerMessageId && canonicalEventType) {
    return `message:${providerMessageId}|event:${canonicalEventType}`;
  }
  if (payloadHash && canonicalEventType) {
    return `payload:${payloadHash}|event:${canonicalEventType}`;
  }
  return null;
};

const buildWebhookReceiptIdentity = (input: {
  canonicalEventType: string;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerMessageId?: string | null;
  payloadHash?: string | null;
}): { sid: string; eventType: string } | null => {
  const sid = normalizeWebhookReceiptSid(input);
  const eventType = normalizeWebhookReceiptEventType(input.canonicalEventType);
  if (!sid || !eventType) {
    return null;
  }
  return {
    sid,
    eventType,
  };
};

const normalizeRetentionWindowDays = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return WEBHOOK_RECEIPT_RETENTION_DEFAULT_DAYS;
  }

  return Math.max(1, Math.trunc(value));
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
  status: 'created' | 'duplicate' | 'ignored' | 'error';
  mapping: ConnectShyftProviderIdentifierMapping | null;
  errorCode?: 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE';
  errorMessage?: string;
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
  } catch (error) {
    return {
      status: 'error',
      mapping: null,
      errorCode: 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE',
      errorMessage: error instanceof Error
        ? error.message
        : 'Provider correlation mapping persistence unavailable.',
    };
  }
};

export const recordConnectShyftBridgeLegProviderIdentifierMapping = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  providerIdentifier: string;
  bridgeLegId: string;
  createdAtUtc?: string;
  db?: Knex;
}): Promise<{
  status: 'created' | 'duplicate' | 'ignored' | 'error';
  mapping: ConnectShyftProviderIdentifierMapping | null;
  errorCode?: 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE';
  errorMessage?: string;
}> => {
  return recordConnectShyftProviderIdentifierMapping({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    providerName: input.providerName,
    identifierKind: 'call_leg',
    providerIdentifier: input.providerIdentifier,
    internalReferenceId: input.bridgeLegId,
    createdAtUtc: input.createdAtUtc,
    db: input.db,
  });
};

export const resolveConnectShyftProviderCorrelationByIdentifiers = async (input: {
  providerName: string;
  providerLegId?: string | null;
  providerMessageId?: string | null;
  tenantId?: string | null;
  db?: Knex;
}): Promise<ConnectShyftProviderCorrelationLookupResult> => {
  const providerName = normalizeProviderName(input.providerName);
  const providerLegId = normalizeString(input.providerLegId || null);
  const providerMessageId = normalizeString(input.providerMessageId || null);
  const tenantId = normalizeString(input.tenantId || null);

  if (!providerName || (!providerLegId && !providerMessageId)) {
    return {
      ok: false,
      reason: 'missing-identifiers',
    };
  }

  let callLegMappings: ConnectShyftProviderIdentifierMappingRecord[] = [];
  let messageMappings: ConnectShyftProviderIdentifierMappingRecord[] = [];
  const dbScopeTenantId = tenantId && UUID_PATTERN.test(tenantId)
    ? tenantId
    : null;
  const canQueryDb = Boolean(input.db && (!tenantId || dbScopeTenantId));

  if (providerLegId) {
    callLegMappings = findInMemoryMappings({
      tenantId,
      providerName,
      identifierKind: 'call_leg',
      providerIdentifier: providerLegId,
    });
  }

  if (providerMessageId) {
    messageMappings = findInMemoryMappings({
      tenantId,
      providerName,
      identifierKind: 'message',
      providerIdentifier: providerMessageId,
    });
  }

  if (canQueryDb && providerLegId && callLegMappings.length === 0) {
    try {
      callLegMappings = await findDbMappings({
        db: input.db as Knex,
        tenantId: dbScopeTenantId,
        providerName,
        identifierKind: 'call_leg',
        providerIdentifier: providerLegId,
      });
    } catch (_error) {
      return {
        ok: false,
        reason: 'unavailable',
      };
    }
  }

  if (canQueryDb && providerMessageId && messageMappings.length === 0) {
    try {
      messageMappings = await findDbMappings({
        db: input.db as Knex,
        tenantId: dbScopeTenantId,
        providerName,
        identifierKind: 'message',
        providerIdentifier: providerMessageId,
      });
    } catch (_error) {
      return {
        ok: false,
        reason: 'unavailable',
      };
    }
  }

  const contextKey = (mapping: ConnectShyftProviderIdentifierMappingRecord): string => {
    return `${mapping.tenantId}|${mapping.orgUnitId}|${mapping.threadId}`;
  };

  const dedupeMappingsByContext = (
    mappings: ConnectShyftProviderIdentifierMappingRecord[],
  ): Map<string, ConnectShyftProviderIdentifierMappingRecord> => {
    const deduped = new Map<string, ConnectShyftProviderIdentifierMappingRecord>();
    mappings.forEach((mapping) => {
      const key = contextKey(mapping);
      if (!deduped.has(key)) {
        deduped.set(key, mapping);
      }
    });
    return deduped;
  };

  const callLegByContext = dedupeMappingsByContext(callLegMappings);
  const messageByContext = dedupeMappingsByContext(messageMappings);
  const callLegContextKeys = Array.from(callLegByContext.keys());
  const messageContextKeys = Array.from(messageByContext.keys());
  const hasCallLegInput = Boolean(providerLegId);
  const hasMessageInput = Boolean(providerMessageId);

  if (hasCallLegInput && hasMessageInput) {
    const consensusContexts = callLegContextKeys.filter((key) => messageByContext.has(key));

    if (consensusContexts.length === 1) {
      const consensusKey = consensusContexts[0];
      return toCorrelationResolution({
        callLegMapping: callLegByContext.get(consensusKey) || null,
        messageMapping: messageByContext.get(consensusKey) || null,
        source: 'provider_consensus',
      });
    }

    if (consensusContexts.length > 1) {
      return {
        ok: false,
        reason: 'ambiguous',
      };
    }

    if (callLegByContext.size > 0 && messageByContext.size > 0) {
      const [callLegCandidate] = Array.from(callLegByContext.values());
      const [messageCandidate] = Array.from(messageByContext.values());
      if (callLegCandidate && messageCandidate && mappingsConflict(callLegCandidate, messageCandidate)) {
        return {
          ok: false,
          reason: 'ambiguous',
        };
      }
    }

    if (callLegByContext.size > 1 || messageByContext.size > 1) {
      return {
        ok: false,
        reason: 'ambiguous',
      };
    }

    if (callLegByContext.size === 1 && messageByContext.size === 0) {
      return toCorrelationResolution({
        callLegMapping: Array.from(callLegByContext.values())[0],
        messageMapping: null,
        source: 'provider_leg_id',
      });
    }

    if (messageByContext.size === 1 && callLegByContext.size === 0) {
      return toCorrelationResolution({
        callLegMapping: null,
        messageMapping: Array.from(messageByContext.values())[0],
        source: 'provider_message_id',
      });
    }

    return {
      ok: false,
      reason: 'not-found',
    };
  }

  if (hasCallLegInput) {
    if (callLegByContext.size > 1) {
      return {
        ok: false,
        reason: 'ambiguous',
      };
    }

    if (callLegByContext.size === 1) {
      return toCorrelationResolution({
        callLegMapping: Array.from(callLegByContext.values())[0],
        messageMapping: null,
        source: 'provider_leg_id',
      });
    }
  }

  if (hasMessageInput) {
    if (messageByContext.size > 1) {
      return {
        ok: false,
        reason: 'ambiguous',
      };
    }

    if (messageByContext.size === 1) {
      return toCorrelationResolution({
        callLegMapping: null,
        messageMapping: Array.from(messageByContext.values())[0],
        source: 'provider_message_id',
      });
    }
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
  payloadHash?: string | null;
  db?: Knex;
}): Promise<{
  deterministic: true;
  duplicate: boolean;
  dedupeKey: string | null;
  error?: {
    code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE';
    message: string;
  };
}> => {
  const started = await beginConnectShyftWebhookReceiptProcessing({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    providerName: input.providerName,
    canonicalEventType: input.canonicalEventType,
    providerEventId: input.providerEventId,
    providerLegId: input.providerLegId,
    providerMessageId: input.providerMessageId,
    payloadHash: input.payloadHash,
    db: input.db,
  });

  if (started.error) {
    return {
      deterministic: true,
      duplicate: false,
      dedupeKey: started.dedupeKey,
      error: started.error,
    };
  }

  if (!started.shouldProcess) {
    return {
      deterministic: true,
      duplicate: true,
      dedupeKey: started.dedupeKey,
    };
  }

  const duplicate = started.attemptCount > 1;

  if (!started.dedupeKey) {
    return {
      deterministic: true,
      duplicate,
      dedupeKey: started.dedupeKey,
    };
  }

  const marked = await markConnectShyftWebhookReceiptProcessingResult({
    tenantId: input.tenantId,
    threadId: input.threadId,
    providerName: input.providerName,
    dedupeKey: started.dedupeKey,
    canonicalEventType: input.canonicalEventType,
    providerEventId: input.providerEventId,
    providerLegId: input.providerLegId,
    providerMessageId: input.providerMessageId,
    status: 'APPLIED',
    db: input.db,
  });

  if (marked.error) {
    return {
      deterministic: true,
      duplicate: false,
      dedupeKey: started.dedupeKey,
      error: marked.error,
    };
  }

  return {
    deterministic: true,
    duplicate,
    dedupeKey: started.dedupeKey,
  };
};

export const beginConnectShyftWebhookReceiptProcessing = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  canonicalEventType: string;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerMessageId?: string | null;
  payloadHash?: string | null;
  correlationKeys?: Record<string, unknown> | null;
  db?: Knex;
}): Promise<ConnectShyftWebhookReceiptBeginResult> => {
  const providerName = normalizeProviderName(input.providerName);
  const tenantId = normalizeString(input.tenantId);
  const orgUnitId = normalizeString(input.orgUnitId);
  const threadId = normalizeString(input.threadId);
  const canonicalEventType = normalizeString(input.canonicalEventType);
  const providerEventId = normalizeString(input.providerEventId || null);
  const providerLegId = normalizeString(input.providerLegId || null);
  const providerMessageId = normalizeString(input.providerMessageId || null);
  const payloadHash = normalizeString(input.payloadHash || null).toLowerCase() || null;
  const dedupeKey = buildWebhookDedupeKey({
    canonicalEventType,
    providerEventId,
    providerLegId,
    providerMessageId,
    payloadHash,
  });
  const receiptIdentity = buildWebhookReceiptIdentity({
    canonicalEventType,
    providerEventId,
    providerLegId,
    providerMessageId,
    payloadHash,
  });
  const correlationKeys = (
    input.correlationKeys
    && typeof input.correlationKeys === 'object'
    && !Array.isArray(input.correlationKeys)
  )
    ? input.correlationKeys
    : null;

  if (
    !providerName
    || !dedupeKey
    || !tenantId
    || !orgUnitId
    || !canonicalEventType
    || !receiptIdentity
  ) {
    return {
      deterministic: true,
      alreadyApplied: false,
      shouldProcess: true,
      previousStatus: null,
      dedupeKey,
      status: 'RECEIVED',
      attemptCount: 1,
    };
  }

  const now = new Date().toISOString();
  const inMemoryStateKey = buildInMemoryWebhookReceiptStateKey(
    tenantId,
    providerName,
    receiptIdentity.sid,
    receiptIdentity.eventType,
  );

  if (!shouldUseDbForWebhookReceipt({ tenantId, threadId }, input.db)) {
    const existing = inMemoryWebhookReceiptStates.get(inMemoryStateKey);
    if (!existing) {
      inMemoryWebhookReceiptStates.set(inMemoryStateKey, {
        tenantId,
        orgUnitId,
        threadId: threadId || '',
        providerName,
        sid: receiptIdentity.sid,
        eventType: receiptIdentity.eventType,
        dedupeKey,
        payloadHash,
        status: 'PROCESSING',
        firstSeenAtUtc: now,
        lastSeenAtUtc: now,
        processedAtUtc: null,
        attemptCount: 1,
        correlationKeys,
        errorCode: null,
        errorMessage: null,
        failureReason: null,
        nextRetryAtUtc: null,
        lastFailureClassification: null,
      });
      return {
        deterministic: true,
        alreadyApplied: false,
        shouldProcess: true,
        previousStatus: null,
        dedupeKey,
        status: 'PROCESSING',
        attemptCount: 1,
      };
    }

    const nextAttemptCount = existing.attemptCount + 1;
    const previousStatus = existing.status;
    if (statusRepresentsProcessedWebhookReceipt(previousStatus)) {
      inMemoryWebhookReceiptStates.set(inMemoryStateKey, {
        ...existing,
        orgUnitId,
        threadId: threadId || existing.threadId,
        dedupeKey,
        payloadHash: existing.payloadHash || payloadHash,
        status: 'IGNORED_DUPLICATE',
        lastSeenAtUtc: now,
        processedAtUtc: existing.processedAtUtc || now,
        attemptCount: nextAttemptCount,
        correlationKeys: correlationKeys || existing.correlationKeys,
      });
      return {
        deterministic: true,
        alreadyApplied: true,
        shouldProcess: false,
        previousStatus,
        dedupeKey,
        status: 'IGNORED_DUPLICATE',
        attemptCount: nextAttemptCount,
      };
    }

    if (previousStatus === 'PROCESSING' || previousStatus === 'FAILED_TERMINAL') {
      inMemoryWebhookReceiptStates.set(inMemoryStateKey, {
        ...existing,
        orgUnitId,
        threadId: threadId || existing.threadId,
        dedupeKey,
        payloadHash: existing.payloadHash || payloadHash,
        lastSeenAtUtc: now,
        attemptCount: nextAttemptCount,
        correlationKeys: correlationKeys || existing.correlationKeys,
      });
      return {
        deterministic: true,
        alreadyApplied: false,
        shouldProcess: false,
        previousStatus,
        dedupeKey,
        status: previousStatus,
        attemptCount: nextAttemptCount,
        nextRetryAtUtc: existing.nextRetryAtUtc,
        lastFailureClassification: existing.lastFailureClassification,
      };
    }

    inMemoryWebhookReceiptStates.set(inMemoryStateKey, {
      ...existing,
      orgUnitId,
      threadId: threadId || existing.threadId,
      dedupeKey,
      payloadHash: existing.payloadHash || payloadHash,
      status: 'PROCESSING',
      lastSeenAtUtc: now,
      processedAtUtc: null,
      attemptCount: nextAttemptCount,
      correlationKeys: correlationKeys || existing.correlationKeys,
      errorCode: null,
      errorMessage: null,
      failureReason: null,
      nextRetryAtUtc: null,
      lastFailureClassification: null,
    });

    return {
      deterministic: true,
      alreadyApplied: false,
      shouldProcess: true,
      previousStatus,
      dedupeKey,
      status: 'PROCESSING',
      attemptCount: nextAttemptCount,
      nextRetryAtUtc: existing.nextRetryAtUtc,
      lastFailureClassification: existing.lastFailureClassification,
    };
  }

  try {
    const db = input.db as Knex;
    const scope = {
      tenant_id: tenantId,
      provider_name: providerName,
      sid: receiptIdentity.sid,
      event_type: receiptIdentity.eventType,
    };
    const inserted = await db
      .withSchema('connectshyft')
      .table(WEBHOOK_RECEIPTS_TABLE)
      .insert({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        thread_id: threadId || '',
        provider_name: providerName,
        sid: receiptIdentity.sid,
        event_type: receiptIdentity.eventType,
        provider_event_id: providerEventId || null,
        provider_identifier_kind: providerLegId
          ? 'call_leg'
          : providerMessageId
            ? 'message'
            : null,
        provider_identifier: providerLegId || providerMessageId || null,
        canonical_event_type: canonicalEventType,
        dedupe_key: dedupeKey,
        payload_hash: payloadHash,
        processed_at_utc: null,
        processing_status: 'PROCESSING',
        first_seen_at_utc: now,
        last_seen_at_utc: now,
        attempt_count: 1,
        correlation_keys: correlationKeys,
        error_code: null,
        error_message: null,
        failure_reason: null,
        next_retry_at_utc: null,
        last_failure_classification: null,
      })
      .onConflict(['tenant_id', 'provider_name', 'sid', 'event_type'])
      .ignore()
      .returning(['id']);

    if (inserted.length > 0) {
      return {
        deterministic: true,
        alreadyApplied: false,
        shouldProcess: true,
        previousStatus: null,
        dedupeKey,
        status: 'PROCESSING',
        attemptCount: 1,
      };
    }

    const existing = await db
      .withSchema('connectshyft')
      .table(WEBHOOK_RECEIPTS_TABLE)
      .where(scope)
      .first([
        'processing_status',
        'attempt_count',
        'thread_id',
        'dedupe_key',
        'payload_hash',
        'processed_at_utc',
        'first_seen_at_utc',
        'last_seen_at_utc',
        'failure_reason',
        'error_code',
        'error_message',
        'next_retry_at_utc',
        'last_failure_classification',
      ]);
    const existingState = mapWebhookReceiptRowToState({
      tenantId,
      orgUnitId,
      providerName,
      sid: receiptIdentity.sid,
      eventType: receiptIdentity.eventType,
      row: existing,
    });
    const existingThreadId = normalizeString(existing?.thread_id);

    if (!existingState) {
      return {
        deterministic: true,
        alreadyApplied: false,
        shouldProcess: true,
        previousStatus: null,
        dedupeKey,
        status: 'RECEIVED',
        attemptCount: 1,
      };
    }

    const nextAttemptCount = existingState.attemptCount + 1;

    if (statusRepresentsProcessedWebhookReceipt(existingState.status)) {
      await db
        .withSchema('connectshyft')
        .table(WEBHOOK_RECEIPTS_TABLE)
        .where(scope)
        .update({
          org_unit_id: orgUnitId,
          thread_id: threadId || existingThreadId,
          provider_event_id: providerEventId || null,
          provider_identifier_kind: providerLegId
            ? 'call_leg'
            : providerMessageId
              ? 'message'
              : null,
          provider_identifier: providerLegId || providerMessageId || null,
          canonical_event_type: canonicalEventType,
          dedupe_key: dedupeKey,
          payload_hash: db.raw('COALESCE(payload_hash, ?)', [payloadHash]),
          processing_status: 'IGNORED_DUPLICATE',
          last_seen_at_utc: now,
          processed_at_utc: existingState.processedAtUtc || now,
          attempt_count: nextAttemptCount,
          correlation_keys: correlationKeys || existingState.correlationKeys || null,
        });

      return {
        deterministic: true,
        alreadyApplied: true,
        shouldProcess: false,
        previousStatus: existingState.status,
        dedupeKey,
        status: 'IGNORED_DUPLICATE',
        attemptCount: nextAttemptCount,
      };
    }

    if (existingState.status === 'PROCESSING' || existingState.status === 'FAILED_TERMINAL') {
      await db
        .withSchema('connectshyft')
        .table(WEBHOOK_RECEIPTS_TABLE)
        .where(scope)
        .update({
          org_unit_id: orgUnitId,
          thread_id: threadId || existingThreadId,
          provider_event_id: providerEventId || null,
          provider_identifier_kind: providerLegId
            ? 'call_leg'
            : providerMessageId
              ? 'message'
              : null,
          provider_identifier: providerLegId || providerMessageId || null,
          canonical_event_type: canonicalEventType,
          dedupe_key: dedupeKey,
          payload_hash: db.raw('COALESCE(payload_hash, ?)', [payloadHash]),
          last_seen_at_utc: now,
          attempt_count: nextAttemptCount,
          correlation_keys: correlationKeys || existingState.correlationKeys || null,
        });

      return {
        deterministic: true,
        alreadyApplied: false,
        shouldProcess: false,
        previousStatus: existingState.status,
        dedupeKey,
        status: existingState.status,
        attemptCount: nextAttemptCount,
        nextRetryAtUtc: existingState.nextRetryAtUtc,
        lastFailureClassification: existingState.lastFailureClassification,
      };
    }

    const claimed = await db
      .withSchema('connectshyft')
      .table(WEBHOOK_RECEIPTS_TABLE)
      .where(scope)
      .whereIn('processing_status', ['RECEIVED', 'FAILED_RETRYABLE'])
      .update({
        org_unit_id: orgUnitId,
        thread_id: threadId || existingThreadId,
        provider_event_id: providerEventId || null,
        provider_identifier_kind: providerLegId
          ? 'call_leg'
          : providerMessageId
            ? 'message'
            : null,
        provider_identifier: providerLegId || providerMessageId || null,
        canonical_event_type: canonicalEventType,
        dedupe_key: dedupeKey,
        payload_hash: db.raw('COALESCE(payload_hash, ?)', [payloadHash]),
        processing_status: 'PROCESSING',
        processed_at_utc: null,
        last_seen_at_utc: now,
        attempt_count: nextAttemptCount,
        correlation_keys: correlationKeys || existingState.correlationKeys || null,
        error_code: null,
        error_message: null,
        failure_reason: null,
        next_retry_at_utc: null,
        last_failure_classification: null,
      });

    if (claimed > 0) {
      return {
        deterministic: true,
        alreadyApplied: false,
        shouldProcess: true,
        previousStatus: existingState.status,
        dedupeKey,
        status: 'PROCESSING',
        attemptCount: nextAttemptCount,
        nextRetryAtUtc: existingState.nextRetryAtUtc,
        lastFailureClassification: existingState.lastFailureClassification,
      };
    }

    const latest = await db
      .withSchema('connectshyft')
      .table(WEBHOOK_RECEIPTS_TABLE)
      .where(scope)
      .first([
        'processing_status',
        'attempt_count',
        'thread_id',
        'dedupe_key',
        'payload_hash',
        'processed_at_utc',
        'first_seen_at_utc',
        'last_seen_at_utc',
        'failure_reason',
        'error_code',
        'error_message',
        'next_retry_at_utc',
        'last_failure_classification',
      ]);
    const latestState = mapWebhookReceiptRowToState({
      tenantId,
      orgUnitId,
      providerName,
      sid: receiptIdentity.sid,
      eventType: receiptIdentity.eventType,
      row: latest,
    });

    return {
      deterministic: true,
      alreadyApplied: latestState ? statusRepresentsProcessedWebhookReceipt(latestState.status) : false,
      shouldProcess: false,
      previousStatus: latestState?.status || existingState.status,
      dedupeKey,
      status: latestState?.status || existingState.status,
      attemptCount: latestState?.attemptCount || nextAttemptCount,
      nextRetryAtUtc: latestState?.nextRetryAtUtc || existingState.nextRetryAtUtc,
      lastFailureClassification: latestState?.lastFailureClassification || existingState.lastFailureClassification,
    };
  } catch (error) {
    return {
      deterministic: true,
      alreadyApplied: false,
      shouldProcess: true,
      previousStatus: null,
      dedupeKey,
      status: 'RECEIVED',
      attemptCount: 1,
      error: {
        code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
        message: error instanceof Error
          ? error.message
          : 'Webhook receipt persistence unavailable.',
      },
    };
  }
};

export const markConnectShyftWebhookReceiptProcessingResult = async (input: {
  tenantId: string;
  threadId?: string;
  providerName: string;
  dedupeKey: string | null;
  canonicalEventType?: string | null;
  providerEventId?: string | null;
  providerLegId?: string | null;
  providerMessageId?: string | null;
  status: ConnectShyftWebhookReceiptProcessingStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  failureReason?: string | null;
  nextRetryAtUtc?: string | null;
  lastFailureClassification?: ConnectShyftWebhookFailureClassification | null;
  db?: Knex;
}): Promise<{
  deterministic: true;
  updated: boolean;
  error?: {
    code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE';
    message: string;
  };
}> => {
  const tenantId = normalizeString(input.tenantId);
  const threadId = normalizeString(input.threadId || null);
  const providerName = normalizeProviderName(input.providerName);
  const dedupeKey = normalizeString(input.dedupeKey);
  const canonicalEventType = normalizeString(input.canonicalEventType || null);
  const providerEventId = normalizeString(input.providerEventId || null);
  const providerLegId = normalizeString(input.providerLegId || null);
  const providerMessageId = normalizeString(input.providerMessageId || null);
  const receiptIdentity = buildWebhookReceiptIdentity({
    canonicalEventType,
    providerEventId,
    providerLegId,
    providerMessageId,
  });
  const status = normalizeWebhookReceiptProcessingStatus(input.status);
  const failureMetadata = toFailureMetadata({
    status,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    failureReason: input.failureReason,
  });
  const nextRetryAtUtc = normalizeString(input.nextRetryAtUtc || null) || null;
  const lastFailureClassification = input.lastFailureClassification || null;
  const now = new Date().toISOString();

  if (!tenantId || !providerName || (!dedupeKey && !receiptIdentity)) {
    return {
      deterministic: true,
      updated: false,
    };
  }

  let inMemoryUpdated = false;
  for (const [inMemoryStateKey, existingInMemory] of inMemoryWebhookReceiptStates.entries()) {
    const matchesIdentity = Boolean(
      receiptIdentity
      && existingInMemory.sid === receiptIdentity.sid
      && existingInMemory.eventType === receiptIdentity.eventType,
    );
    const matchesDedupeKey = Boolean(dedupeKey && existingInMemory.dedupeKey === dedupeKey);
    if (
      existingInMemory.tenantId !== tenantId
      || existingInMemory.providerName !== providerName
      || (receiptIdentity ? !matchesIdentity : !matchesDedupeKey)
      || (threadId && existingInMemory.threadId !== threadId)
    ) {
      continue;
    }

    inMemoryWebhookReceiptStates.set(inMemoryStateKey, {
      ...existingInMemory,
      status,
      lastSeenAtUtc: now,
      processedAtUtc: statusRepresentsProcessedWebhookReceipt(status)
        ? existingInMemory.processedAtUtc || now
        : null,
      errorCode: failureMetadata.errorCode,
      errorMessage: failureMetadata.errorMessage,
      failureReason: failureMetadata.failureReason,
      nextRetryAtUtc: status === 'FAILED_RETRYABLE' ? nextRetryAtUtc : null,
      lastFailureClassification: status === 'FAILED_RETRYABLE' || status === 'FAILED_TERMINAL'
        ? lastFailureClassification
        : null,
    });
    inMemoryUpdated = true;
  }
  const shouldUseDbState = threadId
    ? shouldUseDbForWebhookReceipt({ tenantId, threadId }, input.db)
    : Boolean(input.db);
  if (!inMemoryUpdated && !shouldUseDbState) {
    const fallbackSid = receiptIdentity?.sid || dedupeKey;
    const fallbackEventType = receiptIdentity?.eventType || 'unknown';
    const fallbackDedupeKey = dedupeKey || fallbackSid;
    if (!fallbackSid || !fallbackDedupeKey) {
      return {
        deterministic: true,
        updated: false,
      };
    }
    const fallbackStateKey = buildInMemoryWebhookReceiptStateKey(
      tenantId,
      providerName,
      fallbackSid,
      fallbackEventType,
    );
    inMemoryWebhookReceiptStates.set(fallbackStateKey, {
      tenantId,
      orgUnitId: '',
      threadId: threadId || '',
      providerName,
      sid: fallbackSid,
      eventType: fallbackEventType,
      dedupeKey: fallbackDedupeKey,
      payloadHash: null,
      status,
      firstSeenAtUtc: now,
      lastSeenAtUtc: now,
      processedAtUtc: statusRepresentsProcessedWebhookReceipt(status) ? now : null,
      attemptCount: 1,
      correlationKeys: null,
      errorCode: failureMetadata.errorCode,
      errorMessage: failureMetadata.errorMessage,
      failureReason: failureMetadata.failureReason,
      nextRetryAtUtc: status === 'FAILED_RETRYABLE' ? nextRetryAtUtc : null,
      lastFailureClassification: status === 'FAILED_RETRYABLE' || status === 'FAILED_TERMINAL'
        ? lastFailureClassification
        : null,
    });
    inMemoryUpdated = true;
  }
  if (!shouldUseDbState) {
    return {
      deterministic: true,
      updated: inMemoryUpdated,
    };
  }

  try {
    const db = input.db as Knex;
    const updateQuery = db
      .withSchema('connectshyft')
      .table(WEBHOOK_RECEIPTS_TABLE)
      .where({
        tenant_id: tenantId,
        provider_name: providerName,
      });

    if (receiptIdentity) {
      updateQuery.andWhere({
        sid: receiptIdentity.sid,
        event_type: receiptIdentity.eventType,
      });
    } else {
      updateQuery.andWhere({
        dedupe_key: dedupeKey,
      });
    }

    if (threadId) {
      updateQuery.andWhere('thread_id', threadId);
    }

    const updated = await updateQuery
      .update({
        processing_status: status,
        last_seen_at_utc: now,
        processed_at_utc: statusRepresentsProcessedWebhookReceipt(status) ? now : null,
        error_code: failureMetadata.errorCode,
        error_message: failureMetadata.errorMessage,
        failure_reason: failureMetadata.failureReason,
        next_retry_at_utc: status === 'FAILED_RETRYABLE' ? nextRetryAtUtc : null,
        last_failure_classification: status === 'FAILED_RETRYABLE' || status === 'FAILED_TERMINAL'
          ? lastFailureClassification
          : null,
      });

    return {
      deterministic: true,
      updated: inMemoryUpdated || updated > 0,
    };
  } catch (error) {
    return {
      deterministic: true,
      updated: inMemoryUpdated,
      error: {
        code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
        message: error instanceof Error
          ? error.message
          : 'Webhook receipt persistence unavailable.',
      },
    };
  }
};

export const loadConnectShyftWebhookReceiptMetrics = async (input: {
  tenantId: string;
  orgUnitId?: string | null;
  retentionWindowDays?: number;
  asOfUtc?: string;
  db?: Knex;
}): Promise<{
  deterministic: true;
  retentionWindowDays: number;
  totalRows: number;
  oldestRetainedAt: string;
  expiredRowsCandidate: number;
  asOfUtc: string;
  cutoffUtc: string;
  error?: {
    code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE';
    message: string;
  };
}> => {
  const tenantId = normalizeString(input.tenantId);
  const orgUnitId = normalizeString(input.orgUnitId || null) || null;
  const retentionWindowDays = normalizeRetentionWindowDays(input.retentionWindowDays);
  const asOfUtc = normalizeString(input.asOfUtc) || new Date().toISOString();
  const cutoffMs = Date.parse(asOfUtc) - (retentionWindowDays * 24 * 60 * 60 * 1000);
  const cutoffUtc = Number.isFinite(cutoffMs)
    ? new Date(cutoffMs).toISOString()
    : new Date(Date.now() - (retentionWindowDays * 24 * 60 * 60 * 1000)).toISOString();

  const inMemoryReceipts = Array.from(inMemoryWebhookReceiptStates.values()).filter((record) => {
    return record.tenantId === tenantId && (!orgUnitId || record.orgUnitId === orgUnitId);
  });
  const inMemoryOldest = inMemoryReceipts
    .map((record) => normalizeString(record.firstSeenAtUtc))
    .filter((value) => value.length > 0)
    .sort()[0] || null;
  const inMemoryExpired = inMemoryReceipts.filter((record) => {
    const observedAt = normalizeString(record.lastSeenAtUtc) || normalizeString(record.firstSeenAtUtc);
    return observedAt.length > 0 && observedAt < cutoffUtc;
  }).length;

  let dbTotalRows = 0;
  let dbOldestRetainedAt: string | null = null;
  let dbExpiredRows = 0;

  if (input.db) {
    try {
      const db = input.db;
      const scoped = db
        .withSchema('connectshyft')
        .table(WEBHOOK_RECEIPTS_TABLE)
        .where({ tenant_id: tenantId });
      if (orgUnitId) {
        scoped.andWhere({ org_unit_id: orgUnitId });
      }

      const totalRow = await scoped
        .clone()
        .count<{ count?: string | number }>({ count: 'id' })
        .first();
      const oldestRow = await scoped
        .clone()
        .select(db.raw('MIN(COALESCE(first_seen_at_utc, processed_at_utc)) AS oldest_retained_at'))
        .first<{ oldest_retained_at?: unknown }>();
      const expiredRow = await scoped
        .clone()
        .whereRaw('COALESCE(last_seen_at_utc, processed_at_utc) < ?', [cutoffUtc])
        .count<{ count?: string | number }>({ count: 'id' })
        .first();

      dbTotalRows = Number(totalRow?.count || 0);
      dbOldestRetainedAt = normalizeString(oldestRow?.oldest_retained_at) || null;
      dbExpiredRows = Number(expiredRow?.count || 0);
    } catch (error) {
      return {
        deterministic: true,
        retentionWindowDays,
        totalRows: inMemoryReceipts.length,
        oldestRetainedAt: inMemoryOldest || asOfUtc,
        expiredRowsCandidate: inMemoryExpired,
        asOfUtc,
        cutoffUtc,
        error: {
          code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
          message: error instanceof Error
            ? error.message
            : 'Webhook receipt persistence unavailable.',
        },
      };
    }
  }

  const oldestRetainedAt = [inMemoryOldest, dbOldestRetainedAt]
    .filter((value): value is string => Boolean(value))
    .sort()[0] || asOfUtc;

  return {
    deterministic: true,
    retentionWindowDays,
    totalRows: inMemoryReceipts.length + dbTotalRows,
    oldestRetainedAt,
    expiredRowsCandidate: inMemoryExpired + dbExpiredRows,
    asOfUtc,
    cutoffUtc,
  };
};

export const cleanupConnectShyftWebhookReceipts = async (input: {
  tenantId: string;
  orgUnitId?: string | null;
  policyWindowDays?: number;
  dryRun?: boolean;
  asOfUtc?: string;
  db?: Knex;
}): Promise<{
  deterministic: true;
  policyWindowDays: number;
  dryRun: boolean;
  expiredRowsRemoved: number;
  activeWindowProtected: true;
  totalRowsBefore: number;
  totalRowsAfter: number;
  oldestRetainedAt: string;
  executedAtUtc: string;
  cutoffUtc: string;
  error?: {
    code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE';
    message: string;
  };
}> => {
  const tenantId = normalizeString(input.tenantId);
  const orgUnitId = normalizeString(input.orgUnitId || null) || null;
  const policyWindowDays = normalizeRetentionWindowDays(input.policyWindowDays);
  const dryRun = input.dryRun === true;
  const executedAtUtc = normalizeString(input.asOfUtc) || new Date().toISOString();
  const cutoffMs = Date.parse(executedAtUtc) - (policyWindowDays * 24 * 60 * 60 * 1000);
  const cutoffUtc = Number.isFinite(cutoffMs)
    ? new Date(cutoffMs).toISOString()
    : new Date(Date.now() - (policyWindowDays * 24 * 60 * 60 * 1000)).toISOString();

  const scopedInMemoryEntries = Array.from(inMemoryWebhookReceiptStates.entries()).filter(([, record]) => {
    return record.tenantId === tenantId && (!orgUnitId || record.orgUnitId === orgUnitId);
  });
  const inMemoryExpiredEntries = scopedInMemoryEntries.filter(([, record]) => {
    const observedAt = normalizeString(record.lastSeenAtUtc) || normalizeString(record.firstSeenAtUtc);
    return observedAt.length > 0 && observedAt < cutoffUtc;
  });

  const totalRowsBeforeInMemory = scopedInMemoryEntries.length;
  if (!dryRun) {
    inMemoryExpiredEntries.forEach(([inMemoryStateKey]) => {
      inMemoryWebhookReceiptStates.delete(inMemoryStateKey);
    });
  }
  const totalRowsAfterInMemory = dryRun
    ? totalRowsBeforeInMemory
    : totalRowsBeforeInMemory - inMemoryExpiredEntries.length;

  let dbTotalBefore = 0;
  let dbTotalAfter = 0;
  let dbExpiredRemoved = 0;
  let dbOldestRetainedAt: string | null = null;

  if (input.db) {
    try {
      const db = input.db;
      const scoped = db
        .withSchema('connectshyft')
        .table(WEBHOOK_RECEIPTS_TABLE)
        .where({ tenant_id: tenantId });
      if (orgUnitId) {
        scoped.andWhere({ org_unit_id: orgUnitId });
      }

      const totalBeforeRow = await scoped
        .clone()
        .count<{ count?: string | number }>({ count: 'id' })
        .first();
      dbTotalBefore = Number(totalBeforeRow?.count || 0);

      if (dryRun) {
        const expiredRow = await scoped
          .clone()
          .whereRaw('COALESCE(last_seen_at_utc, processed_at_utc) < ?', [cutoffUtc])
          .count<{ count?: string | number }>({ count: 'id' })
          .first();
        dbExpiredRemoved = Number(expiredRow?.count || 0);
        dbTotalAfter = dbTotalBefore;
      } else {
        dbExpiredRemoved = await scoped
          .clone()
          .whereRaw('COALESCE(last_seen_at_utc, processed_at_utc) < ?', [cutoffUtc])
          .delete();
        const totalAfterRow = await scoped
          .clone()
          .count<{ count?: string | number }>({ count: 'id' })
          .first();
        dbTotalAfter = Number(totalAfterRow?.count || 0);
      }

      const oldestRetainedRow = await scoped
        .clone()
        .select(db.raw('MIN(COALESCE(first_seen_at_utc, processed_at_utc))::text AS oldest_retained_at'))
        .first<{ oldest_retained_at?: unknown }>();
      dbOldestRetainedAt = normalizeString(oldestRetainedRow?.oldest_retained_at) || null;
    } catch (error) {
      return {
        deterministic: true,
        policyWindowDays,
        dryRun,
        expiredRowsRemoved: inMemoryExpiredEntries.length,
        activeWindowProtected: true,
        totalRowsBefore: totalRowsBeforeInMemory,
        totalRowsAfter: totalRowsAfterInMemory,
        oldestRetainedAt: executedAtUtc,
        executedAtUtc,
        cutoffUtc,
        error: {
          code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
          message: error instanceof Error
            ? error.message
            : 'Webhook receipt persistence unavailable.',
        },
      };
    }
  }

  const totalRowsBefore = totalRowsBeforeInMemory + dbTotalBefore;
  const totalRowsAfter = totalRowsAfterInMemory + dbTotalAfter;
  const inMemoryOldestRetainedAt = Array.from(inMemoryWebhookReceiptStates.values())
    .filter((record) => record.tenantId === tenantId && (!orgUnitId || record.orgUnitId === orgUnitId))
    .map((record) => normalizeString(record.firstSeenAtUtc))
    .filter((value) => value.length > 0)
    .sort()[0] || null;
  const oldestRetainedAt = [inMemoryOldestRetainedAt, dbOldestRetainedAt]
    .filter((value): value is string => Boolean(value))
    .sort()[0] || executedAtUtc;

  return {
    deterministic: true,
    policyWindowDays,
    dryRun,
    expiredRowsRemoved: inMemoryExpiredEntries.length + dbExpiredRemoved,
    activeWindowProtected: true,
    totalRowsBefore,
    totalRowsAfter,
    oldestRetainedAt,
    executedAtUtc,
    cutoffUtc,
  };
};

export const resetConnectShyftProviderCorrelationStateForTests = (): void => {
  inMemoryProviderIdentifierMappings.clear();
  inMemoryWebhookReceiptStates.clear();
};
