import { randomUUID } from 'node:crypto';
import {
  normalizePhone,
  type PhoneSource,
  type PhoneUsageType,
  type PhoneValidationStatus,
} from '../../../../../domains/communication';
import { CAPABILITIES, hasCapability } from '../../platform/rbac/capabilities';
import db from '../../config/knex';
import {
  AsyncInProcessConnectShyftIdentityBoundaryAdapter,
  InProcessConnectShyftIdentityBoundaryAdapter,
  type ConnectShyftIdentityBoundaryAdapter,
  type ConnectShyftIdentityBoundaryContactPoint,
  type ConnectShyftIdentityBoundaryDecision as ConnectShyftIdentityMatchDecision,
  type ConnectShyftIdentityBoundaryNeighbor,
  type ConnectShyftIdentityBoundaryManualResolutionContext as ConnectShyftIdentityManualResolutionContext,
  type ConnectShyftIdentityBoundaryReplay,
  type ConnectShyftIdentityBoundaryResult as ConnectShyftIdentityMatchResult,
} from './identityBoundary';
import { resolveConnectShyftPhoneNormalizationContext } from './phoneIdentityContext';
import { appendConnectShyftCommunicationAuditEntry } from './communicationAuditLog';

type QueryBuilderLike = {
  withSchema(schema: string): QueryBuilderLike;
  table(tableName: string): QueryBuilderLike;
  join(tableName: string, leftColumn: string, operator: string, rightColumn: string): QueryBuilderLike;
  where(condition: Record<string, unknown>): QueryBuilderLike;
  whereNot(column: string, value: unknown): QueryBuilderLike;
  whereIn(column: string, values: string[]): QueryBuilderLike;
  orderBy(column: string, direction: 'asc' | 'desc'): QueryBuilderLike;
  insert(value: Record<string, unknown> | Array<Record<string, unknown>>): QueryBuilderLike;
  update(value: Record<string, unknown>): QueryBuilderLike;
  delete(): Promise<number>;
  first<T>(columns: string[]): Promise<T>;
  select<T>(columns: string[]): Promise<T>;
  returning<T>(columns: string[]): Promise<T>;
};

type KnexTransactionLike = QueryBuilderLike & {
  fn: {
    now(): unknown;
  };
};

type KnexLike = QueryBuilderLike & {
  fn: {
    now(): unknown;
  };
  transaction<T>(handler: (trx: KnexTransactionLike) => Promise<T>): Promise<T>;
};

export const CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_PHRASE = 'IRREVERSIBLE MERGE';
const CONNECTSHYFT_INBOUND_NEIGHBOR_AUDIT_OPERATION_NAME = 'connectshyft.inbound.neighbor_created';
const CONNECTSHYFT_PHONE_DUPLICATE_INDEX = 'connectshyft_cs_neighbor_phones_current_unique_e164_uq';
const CONNECTSHYFT_PHONE_DUPLICATE_MESSAGE = 'That phone number is already assigned to another current neighbor.';

export type ConnectShyftNeighborPhoneInput = {
  label: string;
  value: string;
  isShared?: boolean;
  verificationStatus?: 'verified' | 'unverified';
};

type NormalizedConnectShyftNeighborPhoneInput = {
  label: string;
  value: string;
  rawInput: string;
  normalizedE164: string;
  displayNational: string;
  countryCode: string;
  nationalNumber: string;
  extension?: string;
  validationStatus: PhoneValidationStatus;
  usageType: PhoneUsageType;
  source: PhoneSource;
  sortOrder: number;
  isPrimary: boolean;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
  isActive: boolean;
};

export type ConnectShyftNeighborPhone = {
  phoneId: string;
  label: string;
  value: string;
  rawInput: string | null;
  displayNational: string | null;
  countryCode: string | null;
  nationalNumber: string | null;
  extension?: string | null;
  validationStatus: PhoneValidationStatus;
  usageType: PhoneUsageType;
  source: PhoneSource;
  sortOrder: number;
  isPrimary: boolean;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ConnectShyftTextingPreference = 'UNKNOWN' | 'YES' | 'NO';

export type ConnectShyftNeighbor = {
  neighborId: string;
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  prefersTexting: ConnectShyftTextingPreference;
  isDeleted: boolean;
  deletedAtUtc: string | null;
  deletedByUserId: string | null;
  phones: ConnectShyftNeighborPhone[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

type NeighborActorContext = {
  actorRoles: Array<string | null | undefined>;
};

export type ConnectShyftCreateNeighborCommand = NeighborActorContext & {
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  prefersTexting?: ConnectShyftTextingPreference;
  phones: ConnectShyftNeighborPhoneInput[];
  neighborId?: string;
};

export type ConnectShyftResolveNeighborCommand = NeighborActorContext & {
  tenantId: string;
  neighborId: string;
  includeDeleted?: boolean;
};

export type ConnectShyftListNeighborsCommand = NeighborActorContext & {
  tenantId: string;
};

export type ConnectShyftUpdateNeighborCommand = NeighborActorContext & {
  tenantId: string;
  neighborId: string;
  firstName: string;
  lastName: string;
  prefersTexting?: ConnectShyftTextingPreference;
  phones: ConnectShyftNeighborPhoneInput[];
  relationshipValidated?: boolean;
};

export type ConnectShyftSoftDeleteNeighborCommand = NeighborActorContext & {
  tenantId: string;
  neighborId: string;
  actorUserId: string;
  irreversibleConfirmation: boolean;
};

export type ConnectShyftNeighborMergeConfirmation = {
  acknowledged: boolean;
  phrase: string;
};

export type ConnectShyftMergeNeighborCommand = NeighborActorContext & {
  tenantId: string;
  orgUnitId: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
  irreversibleConfirmation: ConnectShyftNeighborMergeConfirmation;
  reason?: string;
};

export type ConnectShyftIdentityMatchCommand = NeighborActorContext & {
  tenantId: string;
  contactPoint: ConnectShyftIdentityBoundaryContactPoint;
  excludeNeighborId?: string;
  idempotencyKey?: string;
};

export type ConnectShyftCreateInboundNeighborCommand = {
  tenantId: string;
  orgUnitId: string;
  phone: string;
};

export type ConnectShyftApplyInboundSmsTextingPreferenceCommand = {
  tenantId: string;
  neighborId: string;
};

export type {
  ConnectShyftIdentityMatchDecision,
  ConnectShyftIdentityManualResolutionContext,
  ConnectShyftIdentityMatchResult,
};

type NeighborFieldError = {
  field: 'phones';
  reason: 'REQUIRED' | 'INVALID_FORMAT' | 'duplicate_phone';
  message: string;
};

type NeighborRefusalData = {
  reason?: 'duplicate_phone';
  fieldErrors?: NeighborFieldError[];
  identityMatch?: ConnectShyftIdentityMatchDecision;
  manualResolution?: ConnectShyftIdentityManualResolutionContext;
  idempotency?: ConnectShyftIdentityBoundaryReplay;
};

type NeighborPersistenceResult =
  | {
    ok: true;
    neighbor: ConnectShyftNeighbor;
  }
  | {
    ok: false;
    reason: 'DUPLICATE_PHONE' | 'NEIGHBOR_ID_CONFLICT' | 'NEIGHBOR_NOT_FOUND';
  };

type NeighborMergePersistenceResult =
  | {
    ok: true;
    neighbor: ConnectShyftNeighbor;
    merge: {
      sourceNeighborId: string;
      survivorNeighborId: string;
      irreversibleConfirmed: true;
    };
  }
  | {
    ok: false;
    reason: 'NEIGHBOR_NOT_FOUND' | 'MERGE_INVALID';
  };

type NeighborSoftDeletePersistenceResult =
  | {
    ok: true;
    neighbor: ConnectShyftNeighbor;
    alreadyDeleted: boolean;
  }
  | {
    ok: false;
    reason: 'NEIGHBOR_NOT_FOUND';
  };

type NeighborRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_UPDATE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_DELETE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_DELETE_CONFIRMATION_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT'
    | 'CONNECTSHYFT_PHONE_DUPLICATE'
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT'
    | 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND'
    | 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_MERGE_INVALID'
    | 'CONNECTSHYFT_IDENTITY_MATCH_FORBIDDEN'
    | 'IDENTITY_MATCH_AMBIGUOUS'
    | 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH'
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE'
    | 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE';
  message: string;
  data?: NeighborRefusalData;
};

export type ConnectShyftCreateNeighborResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_CREATED';
    httpStatus: 201;
    data: {
      neighbor: ConnectShyftNeighbor;
    };
  }
  | NeighborRefusalResult;

export type ConnectShyftResolveNeighborResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED';
    httpStatus: 200;
    data: {
      neighbor: ConnectShyftNeighbor;
    };
  }
  | NeighborRefusalResult;

export type ConnectShyftListNeighborsResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED';
    httpStatus: 200;
    data: {
      neighbors: ConnectShyftNeighbor[];
    };
  }
  | NeighborRefusalResult;

export type ConnectShyftUpdateNeighborResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_UPDATED';
    httpStatus: 200;
    data: {
      neighbor: ConnectShyftNeighbor;
    };
  }
  | NeighborRefusalResult;

export type ConnectShyftSoftDeleteNeighborResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED';
    httpStatus: 200;
    data: {
      neighbor: ConnectShyftNeighbor;
      alreadyDeleted: boolean;
    };
  }
  | NeighborRefusalResult;

export type ConnectShyftMergeNeighborResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_MERGED';
    httpStatus: 200;
    data: {
      neighbor: ConnectShyftNeighbor;
      merge: {
        sourceNeighborId: string;
        survivorNeighborId: string;
        irreversibleConfirmed: true;
      };
    };
  }
  | NeighborRefusalResult;

const buildTenantOrgUnitKey = (tenantId: string, orgUnitId: string): string =>
  `${tenantId}::${orgUnitId}`;

const nowIsoUtc = (): string => new Date().toISOString();

const normalizeNonEmptyString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizePhoneLabel = (value: unknown): string => {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return 'mobile';
  }

  return normalized;
};

const normalizeVerificationStatus = (
  value: unknown,
): 'verified' | 'unverified' => {
  if (value === 'verified') {
    return 'verified';
  }

  return 'unverified';
};

const buildPhoneRequiredRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
  message: 'Provide at least one phone to create or update a neighbor.',
  data: {
    fieldErrors: [
      {
        field: 'phones',
        reason: 'REQUIRED',
        message: 'Provide at least one phone to create or update a neighbor.',
      },
    ],
  },
});

const buildPhoneInvalidFormatRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
  message: 'Provide a valid phone number (for example, 2605550199).',
  data: {
    fieldErrors: [
      {
        field: 'phones',
        reason: 'INVALID_FORMAT',
        message: 'Provide a valid phone number (for example, 2605550199).',
      },
    ],
  },
});

const buildDuplicatePhoneRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_PHONE_DUPLICATE',
  message: CONNECTSHYFT_PHONE_DUPLICATE_MESSAGE,
  data: {
    reason: 'duplicate_phone',
    fieldErrors: [
      {
        field: 'phones',
        reason: 'duplicate_phone',
        message: CONNECTSHYFT_PHONE_DUPLICATE_MESSAGE,
      },
    ],
  },
});

const buildCreateCapabilityRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN',
  message: 'Neighbor creation requires an authorized ConnectShyft role.',
});

const buildReadCapabilityRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN',
  message: 'Neighbor profile access requires an authorized ConnectShyft role.',
});

const buildUpdateCapabilityRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_UPDATE_FORBIDDEN',
  message: 'Neighbor profile updates require an authorized ConnectShyft role.',
});

const buildDeleteCapabilityRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_DELETE_FORBIDDEN',
  message: 'Neighbor soft delete requires a tenant-privileged ConnectShyft admin role.',
});

const buildDeleteConfirmationRequiredRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_DELETE_CONFIRMATION_REQUIRED',
  message: 'Neighbor soft delete requires explicit irreversible confirmation.',
});

const buildMergeCapabilityRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN',
  message: 'Neighbor merge requires an authorized role.',
});

const buildMergeConfirmationRequiredRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED',
  message: 'Neighbor merge requires explicit irreversible confirmation.',
});

const buildMergeInvalidRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_MERGE_INVALID',
  message: 'Neighbor merge request is invalid.',
});

const buildRelationshipRequiredRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED',
  message: 'This edit requires an active thread relationship or tenant-privileged role.',
});

const buildNeighborIdConflictRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT',
  message: 'Unable to create neighbor right now. Please retry.',
});

const buildNeighborNotFoundRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
  message: 'Neighbor profile not found for this tenant.',
});

const buildCreatePersistenceUnavailableRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE',
  message: 'Neighbor persistence is temporarily unavailable. Please retry.',
});

const buildPersistenceUnavailableRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
  message: 'Neighbor persistence is temporarily unavailable. Please retry.',
});

const buildIdentityPersistenceUnavailableRefusal = (): ConnectShyftIdentityMatchResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
  message: 'Neighbor persistence is temporarily unavailable. Please retry.',
});

const normalizePhones = (
  phones: ConnectShyftNeighborPhoneInput[],
): { ok: true; phones: NormalizedConnectShyftNeighborPhoneInput[] } | NeighborRefusalResult => {
  if (!Array.isArray(phones) || phones.length === 0) {
    return buildPhoneRequiredRefusal();
  }

  const context = resolveConnectShyftPhoneNormalizationContext('user_entered');
  const normalizedPhones: NormalizedConnectShyftNeighborPhoneInput[] = [];
  for (let index = 0; index < phones.length; index += 1) {
    const phone = phones[index];
    const resolvedPhone = normalizePhone(normalizeNonEmptyString(phone?.value), context);
    if (!resolvedPhone.ok) {
      return buildPhoneInvalidFormatRefusal();
    }

    normalizedPhones.push({
      label: normalizePhoneLabel(phone?.label),
      value: resolvedPhone.phone.normalizedE164,
      rawInput: resolvedPhone.phone.rawInput,
      normalizedE164: resolvedPhone.phone.normalizedE164,
      displayNational: resolvedPhone.phone.displayNational,
      countryCode: resolvedPhone.phone.countryCode,
      nationalNumber: resolvedPhone.phone.nationalNumber,
      extension: resolvedPhone.phone.extension,
      validationStatus: resolvedPhone.phone.validationStatus,
      usageType: resolvedPhone.phone.usageType,
      source: resolvedPhone.phone.source,
      sortOrder: index,
      isPrimary: index === 0,
      isShared: phone?.isShared === true,
      verificationStatus: normalizeVerificationStatus(phone?.verificationStatus),
      isActive: true,
    });
  }

  return {
    ok: true,
    phones: normalizedPhones,
  };
};

const listDistinctCandidateNormalizedPhones = (
  phones: NormalizedConnectShyftNeighborPhoneInput[],
): string[] => Array.from(new Set(phones.map((phone) => phone.normalizedE164)));

const hasDuplicateCandidateNormalizedPhones = (
  phones: NormalizedConnectShyftNeighborPhoneInput[],
): boolean => listDistinctCandidateNormalizedPhones(phones).length !== phones.length;

type NeighborPhoneConflictLookupInput = {
  tenantId: string;
  normalizedE164Values: string[];
  excludeNeighborId?: string | null;
};

type NeighborPhoneConflict = {
  normalizedE164: string;
  neighborIds: string[];
};

const hasPhoneConflicts = (conflicts: NeighborPhoneConflict[]): boolean =>
  conflicts.some((conflict) => conflict.neighborIds.length > 0);

const isDuplicatePhoneConstraintViolation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; constraint?: string };
  return candidate.code === '23505' && candidate.constraint === CONNECTSHYFT_PHONE_DUPLICATE_INDEX;
};

const hasNeighborManageCapability = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED)
    || hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_EDIT_ALL)
    || hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE);
};

const hasTenantPrivilegedNeighborCapability = (
  actorRoles: Array<string | null | undefined>,
): boolean => hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_EDIT_ALL);

const hasNeighborReadCapability = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasNeighborManageCapability(actorRoles)
    || hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_VIEW)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_VIEW_ALL)
    || hasCapability(actorRoles, CAPABILITIES.TENANT_READ_ALL);
};

const hasNeighborMergeCapability = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_MERGE);
};

const hasValidMergeConfirmation = (
  confirmation: ConnectShyftNeighborMergeConfirmation | null | undefined,
): boolean => {
  return confirmation?.acknowledged === true
    && confirmation.phrase === CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_PHRASE;
};

type DbNeighborRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  first_name: string;
  last_name: string;
  prefers_texting?: string | null;
  is_deleted?: boolean | null;
  deleted_at_utc?: string | Date | null;
  deleted_by_user_id?: string | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbNeighborPhoneRow = {
  id: string;
  neighbor_id: string;
  tenant_id: string;
  label: string;
  value_e164: string;
  raw_input?: string | null;
  normalized_e164?: string | null;
  display_national?: string | null;
  country_code?: string | null;
  national_number?: string | null;
  extension?: string | null;
  validation_status?: PhoneValidationStatus | null;
  usage_type?: PhoneUsageType | null;
  source?: PhoneSource | null;
  sort_order: number;
  is_primary: boolean;
  is_shared?: boolean | null;
  verification_status?: string | null;
  is_active?: boolean | null;
  uniqueness_enforcement_state?: string | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

const toIsoUtc = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  return value;
};

const normalizeTextingPreference = (value: unknown): ConnectShyftTextingPreference => {
  if (value === 'YES' || value === 'NO' || value === 'UNKNOWN') {
    return value;
  }

  return 'UNKNOWN';
};

const normalizePhoneValidationStatus = (value: unknown): PhoneValidationStatus => {
  if (value === 'valid' || value === 'invalid' || value === 'needs_review') {
    return value;
  }

  return 'valid';
};

const normalizePhoneUsageType = (value: unknown): PhoneUsageType => {
  if (value === 'mobile' || value === 'landline' || value === 'unknown') {
    return value;
  }

  return 'unknown';
};

const normalizePhoneSource = (value: unknown): PhoneSource => {
  if (value === 'user_entered' || value === 'imported' || value === 'system_generated') {
    return value;
  }

  return 'user_entered';
};

const resolveStoredPhoneValue = (phoneRow: DbNeighborPhoneRow): string =>
  normalizeNonEmptyString(phoneRow.normalized_e164 || phoneRow.value_e164);

const sortPhones = (phoneRows: DbNeighborPhoneRow[]): DbNeighborPhoneRow[] => {
  return phoneRows
    .slice()
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }

      return a.id.localeCompare(b.id);
    });
};

const mergePhoneRows = (
  survivorPhoneRows: DbNeighborPhoneRow[],
  sourcePhoneRows: DbNeighborPhoneRow[],
): NormalizedConnectShyftNeighborPhoneInput[] => {
  const merged: NormalizedConnectShyftNeighborPhoneInput[] = [];
  const seen = new Set<string>();

  [...sortPhones(survivorPhoneRows), ...sortPhones(sourcePhoneRows)].forEach((phone) => {
    const label = normalizePhoneLabel(phone.label);
    const value = resolveStoredPhoneValue(phone);
    if (!value) {
      return;
    }

    const dedupeKey = value;
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);

    merged.push({
      label,
      value,
      rawInput: normalizeNonEmptyString(phone.raw_input || value),
      normalizedE164: value,
      displayNational: normalizeNonEmptyString(phone.display_national || value),
      countryCode: normalizeNonEmptyString(phone.country_code),
      nationalNumber: normalizeNonEmptyString(phone.national_number),
      extension: normalizeNonEmptyString(phone.extension) || undefined,
      validationStatus: normalizePhoneValidationStatus(phone.validation_status),
      usageType: normalizePhoneUsageType(phone.usage_type),
      source: normalizePhoneSource(phone.source),
      sortOrder: merged.length,
      isPrimary: merged.length === 0,
      isShared: phone.is_shared === true,
      verificationStatus: normalizeVerificationStatus(phone.verification_status),
      isActive: phone.is_active !== false,
    });
  });

  return merged.map((phone, index) => ({
    ...phone,
    sortOrder: index,
    isPrimary: index === 0,
  }));
};

const sortNeighbors = (neighbors: ConnectShyftNeighbor[]): ConnectShyftNeighbor[] => {
  return neighbors
    .slice()
    .sort((a, b) => {
      if (a.lastName < b.lastName) {
        return -1;
      }
      if (a.lastName > b.lastName) {
        return 1;
      }
      if (a.firstName < b.firstName) {
        return -1;
      }
      if (a.firstName > b.firstName) {
        return 1;
      }
      return a.neighborId.localeCompare(b.neighborId);
    });
};

const cloneNeighbor = (neighbor: ConnectShyftNeighbor): ConnectShyftNeighbor => ({
  ...neighbor,
  phones: neighbor.phones.map((phone) => ({ ...phone })),
});

const mapRowsToNeighbor = (
  neighborRow: DbNeighborRow,
  phoneRows: DbNeighborPhoneRow[],
): ConnectShyftNeighbor => ({
  neighborId: neighborRow.id,
  tenantId: neighborRow.tenant_id,
  orgUnitId: neighborRow.org_unit_id,
  firstName: neighborRow.first_name,
  lastName: neighborRow.last_name,
  prefersTexting: normalizeTextingPreference(neighborRow.prefers_texting),
  isDeleted: neighborRow.is_deleted === true,
  deletedAtUtc: neighborRow.deleted_at_utc ? toIsoUtc(neighborRow.deleted_at_utc) : null,
  deletedByUserId: normalizeNonEmptyString(neighborRow.deleted_by_user_id) || null,
  phones: sortPhones(phoneRows).map((phoneRow) => ({
    phoneId: phoneRow.id,
    label: phoneRow.label,
    value: resolveStoredPhoneValue(phoneRow),
    rawInput: phoneRow.raw_input || null,
    displayNational: phoneRow.display_national || null,
    countryCode: phoneRow.country_code || null,
    nationalNumber: phoneRow.national_number || null,
    extension: phoneRow.extension || null,
    validationStatus: normalizePhoneValidationStatus(phoneRow.validation_status),
    usageType: normalizePhoneUsageType(phoneRow.usage_type),
    source: normalizePhoneSource(phoneRow.source),
    sortOrder: phoneRow.sort_order,
    isPrimary: phoneRow.is_primary,
    isShared: phoneRow.is_shared === true,
    verificationStatus: normalizeVerificationStatus(phoneRow.verification_status),
    isActive: phoneRow.is_active !== false,
    createdAtUtc: toIsoUtc(phoneRow.created_at_utc),
    updatedAtUtc: toIsoUtc(phoneRow.updated_at_utc),
  })),
  createdAtUtc: toIsoUtc(neighborRow.created_at_utc),
  updatedAtUtc: toIsoUtc(neighborRow.updated_at_utc),
});

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

const isPromiseLike = <T>(value: T | Promise<T>): value is Promise<T> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return typeof (value as { then?: unknown }).then === 'function';
};

type NeighborStoreCreateInput = {
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  prefersTexting?: ConnectShyftTextingPreference;
  phones: NormalizedConnectShyftNeighborPhoneInput[];
  neighborId?: string;
};

type NeighborStoreUpdateInput = {
  tenantId: string;
  neighborId: string;
  firstName: string;
  lastName: string;
  prefersTexting?: ConnectShyftTextingPreference;
  phones: NormalizedConnectShyftNeighborPhoneInput[];
};

type NeighborStoreMergeInput = {
  tenantId: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
};

type NeighborTextingPreferencePromotionResult = {
  status: 'updated' | 'unchanged' | 'not_found';
  neighbor: ConnectShyftNeighbor | null;
};

export class InMemoryConnectShyftNeighborStore {
  private neighborsById = new Map<string, ConnectShyftNeighbor>();

  private neighborIdsByScope = new Map<string, Set<string>>();

  private neighborIdsByTenant = new Map<string, Set<string>>();

  private deletedNeighborIdsByTenant = new Map<string, Set<string>>();

  private isNeighborDeleted(tenantId: string, neighborId: string): boolean {
    const neighbor = this.neighborsById.get(neighborId);
    return (
      this.deletedNeighborIdsByTenant.get(tenantId)?.has(neighborId) === true
      || (neighbor?.tenantId === tenantId && neighbor.isDeleted === true)
    );
  }

  setNeighborDeletedStateForTests(input: {
    tenantId: string;
    neighborId: string;
    isDeleted: boolean;
    deletedAtUtc?: string | null;
    deletedByUserId?: string | null;
  }): void {
    const deletedNeighborIds = this.deletedNeighborIdsByTenant.get(input.tenantId) || new Set<string>();
    const existing = this.neighborsById.get(input.neighborId);
    if (input.isDeleted) {
      deletedNeighborIds.add(input.neighborId);
      this.deletedNeighborIdsByTenant.set(input.tenantId, deletedNeighborIds);
      if (existing && existing.tenantId === input.tenantId) {
        const deletedAtUtc = input.deletedAtUtc || existing.deletedAtUtc || nowIsoUtc();
        this.neighborsById.set(input.neighborId, {
          ...existing,
          isDeleted: true,
          deletedAtUtc,
          deletedByUserId: input.deletedByUserId || existing.deletedByUserId,
          updatedAtUtc: deletedAtUtc,
          phones: existing.phones.map((phone) => ({
            ...phone,
            isActive: false,
            updatedAtUtc: deletedAtUtc,
          })),
        });
      }
      return;
    }

    deletedNeighborIds.delete(input.neighborId);
    if (deletedNeighborIds.size === 0) {
      this.deletedNeighborIdsByTenant.delete(input.tenantId);
    } else {
      this.deletedNeighborIdsByTenant.set(input.tenantId, deletedNeighborIds);
    }
    if (existing && existing.tenantId === input.tenantId) {
      this.neighborsById.set(input.neighborId, {
        ...existing,
        isDeleted: false,
        deletedAtUtc: null,
        deletedByUserId: null,
      });
    }
  }

  createNeighbor(input: NeighborStoreCreateInput): NeighborPersistenceResult {
    const neighborId = input.neighborId || randomUUID();
    if (this.neighborsById.has(neighborId)) {
      return {
        ok: false,
        reason: 'NEIGHBOR_ID_CONFLICT',
      };
    }

    const now = nowIsoUtc();
    const neighbor: ConnectShyftNeighbor = {
      neighborId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      firstName: input.firstName,
      lastName: input.lastName,
      prefersTexting: input.prefersTexting ?? 'YES',
      isDeleted: false,
      deletedAtUtc: null,
      deletedByUserId: null,
      phones: input.phones.map((phone) => ({
        phoneId: randomUUID(),
        label: phone.label,
        value: phone.value,
        rawInput: phone.rawInput,
        displayNational: phone.displayNational,
        countryCode: phone.countryCode,
        nationalNumber: phone.nationalNumber,
        extension: phone.extension || null,
        validationStatus: phone.validationStatus,
        usageType: phone.usageType,
        source: phone.source,
        sortOrder: phone.sortOrder,
        isPrimary: phone.isPrimary,
        isShared: phone.isShared,
        verificationStatus: phone.verificationStatus,
        isActive: phone.isActive,
        createdAtUtc: now,
        updatedAtUtc: now,
      })),
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.neighborsById.set(neighborId, neighbor);

    const scopeKey = buildTenantOrgUnitKey(input.tenantId, input.orgUnitId);
    const scopedIds = this.neighborIdsByScope.get(scopeKey) || new Set<string>();
    scopedIds.add(neighborId);
    this.neighborIdsByScope.set(scopeKey, scopedIds);

    const tenantIds = this.neighborIdsByTenant.get(input.tenantId) || new Set<string>();
    tenantIds.add(neighborId);
    this.neighborIdsByTenant.set(input.tenantId, tenantIds);

    return {
      ok: true,
      neighbor: cloneNeighbor(neighbor),
    };
  }

  updateNeighbor(input: NeighborStoreUpdateInput): NeighborPersistenceResult {
    const existing = this.neighborsById.get(input.neighborId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return {
        ok: false,
        reason: 'NEIGHBOR_NOT_FOUND',
      };
    }

    const now = nowIsoUtc();
    const updated: ConnectShyftNeighbor = {
      ...existing,
      firstName: input.firstName,
      lastName: input.lastName,
      prefersTexting: input.prefersTexting ?? existing.prefersTexting,
      updatedAtUtc: now,
      phones: input.phones.map((phone) => ({
        phoneId: randomUUID(),
        label: phone.label,
        value: phone.value,
        rawInput: phone.rawInput,
        displayNational: phone.displayNational,
        countryCode: phone.countryCode,
        nationalNumber: phone.nationalNumber,
        extension: phone.extension || null,
        validationStatus: phone.validationStatus,
        usageType: phone.usageType,
        source: phone.source,
        sortOrder: phone.sortOrder,
        isPrimary: phone.isPrimary,
        isShared: phone.isShared,
        verificationStatus: phone.verificationStatus,
        isActive: phone.isActive,
        createdAtUtc: now,
        updatedAtUtc: now,
      })),
    };

    this.neighborsById.set(input.neighborId, updated);

    return {
      ok: true,
      neighbor: cloneNeighbor(updated),
    };
  }

  softDeleteNeighbor(input: {
    tenantId: string;
    neighborId: string;
    actorUserId: string;
  }): NeighborSoftDeletePersistenceResult {
    const existing = this.neighborsById.get(input.neighborId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return {
        ok: false,
        reason: 'NEIGHBOR_NOT_FOUND',
      };
    }

    if (this.isNeighborDeleted(input.tenantId, input.neighborId)) {
      return {
        ok: true,
        neighbor: cloneNeighbor(existing),
        alreadyDeleted: true,
      };
    }

    const deletedAtUtc = nowIsoUtc();
    const deletedNeighborIds = this.deletedNeighborIdsByTenant.get(input.tenantId) || new Set<string>();
    deletedNeighborIds.add(input.neighborId);
    this.deletedNeighborIdsByTenant.set(input.tenantId, deletedNeighborIds);

    const deleted: ConnectShyftNeighbor = {
      ...existing,
      isDeleted: true,
      deletedAtUtc,
      deletedByUserId: input.actorUserId,
      updatedAtUtc: deletedAtUtc,
      phones: existing.phones.map((phone) => ({
        ...phone,
        isActive: false,
        updatedAtUtc: deletedAtUtc,
      })),
    };

    this.neighborsById.set(input.neighborId, deleted);

    return {
      ok: true,
      neighbor: cloneNeighbor(deleted),
      alreadyDeleted: false,
    };
  }

  mergeNeighbors(input: NeighborStoreMergeInput): NeighborMergePersistenceResult {
    if (input.sourceNeighborId === input.survivorNeighborId) {
      return {
        ok: false,
        reason: 'MERGE_INVALID',
      };
    }

    const sourceNeighbor = this.neighborsById.get(input.sourceNeighborId);
    const survivorNeighbor = this.neighborsById.get(input.survivorNeighborId);
    if (
      !sourceNeighbor
      || !survivorNeighbor
      || sourceNeighbor.tenantId !== input.tenantId
      || survivorNeighbor.tenantId !== input.tenantId
    ) {
      return {
        ok: false,
        reason: 'NEIGHBOR_NOT_FOUND',
      };
    }

    const mergedPhones = mergePhoneRows(
      survivorNeighbor.phones.map((phone) => ({
        id: phone.phoneId,
        neighbor_id: survivorNeighbor.neighborId,
        tenant_id: survivorNeighbor.tenantId,
        label: phone.label,
        value_e164: phone.value,
        raw_input: phone.rawInput,
        normalized_e164: phone.value,
        display_national: phone.displayNational,
        country_code: phone.countryCode,
        national_number: phone.nationalNumber,
        extension: phone.extension,
        validation_status: phone.validationStatus,
        usage_type: phone.usageType,
        source: phone.source,
        sort_order: phone.sortOrder,
        is_primary: phone.isPrimary,
        is_shared: phone.isShared,
        verification_status: phone.verificationStatus,
        is_active: phone.isActive,
        created_at_utc: phone.createdAtUtc,
        updated_at_utc: phone.updatedAtUtc,
      })),
      sourceNeighbor.phones.map((phone) => ({
        id: phone.phoneId,
        neighbor_id: sourceNeighbor.neighborId,
        tenant_id: sourceNeighbor.tenantId,
        label: phone.label,
        value_e164: phone.value,
        raw_input: phone.rawInput,
        normalized_e164: phone.value,
        display_national: phone.displayNational,
        country_code: phone.countryCode,
        national_number: phone.nationalNumber,
        extension: phone.extension,
        validation_status: phone.validationStatus,
        usage_type: phone.usageType,
        source: phone.source,
        sort_order: phone.sortOrder,
        is_primary: phone.isPrimary,
        is_shared: phone.isShared,
        verification_status: phone.verificationStatus,
        is_active: phone.isActive,
        created_at_utc: phone.createdAtUtc,
        updated_at_utc: phone.updatedAtUtc,
      })),
    );

    const now = nowIsoUtc();
    const mergedNeighbor: ConnectShyftNeighbor = {
      ...survivorNeighbor,
      updatedAtUtc: now,
      phones: mergedPhones.map((phone) => ({
        phoneId: randomUUID(),
        label: phone.label,
        value: phone.value,
        rawInput: phone.rawInput,
        displayNational: phone.displayNational,
        countryCode: phone.countryCode,
        nationalNumber: phone.nationalNumber,
        extension: phone.extension || null,
        validationStatus: phone.validationStatus,
        usageType: phone.usageType,
        source: phone.source,
        sortOrder: phone.sortOrder,
        isPrimary: phone.isPrimary,
        isShared: phone.isShared,
        verificationStatus: phone.verificationStatus,
        isActive: phone.isActive,
        createdAtUtc: now,
        updatedAtUtc: now,
      })),
    };

    this.neighborsById.set(input.survivorNeighborId, mergedNeighbor);
    this.neighborsById.delete(input.sourceNeighborId);

    const sourceScopeKey = buildTenantOrgUnitKey(sourceNeighbor.tenantId, sourceNeighbor.orgUnitId);
    const sourceScopedIds = this.neighborIdsByScope.get(sourceScopeKey);
    sourceScopedIds?.delete(input.sourceNeighborId);
    if (sourceScopedIds && sourceScopedIds.size === 0) {
      this.neighborIdsByScope.delete(sourceScopeKey);
    }

    const tenantIds = this.neighborIdsByTenant.get(input.tenantId);
    tenantIds?.delete(input.sourceNeighborId);

    return {
      ok: true,
      neighbor: cloneNeighbor(mergedNeighbor),
      merge: {
        sourceNeighborId: input.sourceNeighborId,
        survivorNeighborId: input.survivorNeighborId,
        irreversibleConfirmed: true,
      },
    };
  }

  resolveNeighborById(tenantId: string, neighborId: string): ConnectShyftNeighbor | null {
    const neighbor = this.neighborsById.get(neighborId);
    if (!neighbor || neighbor.tenantId !== tenantId) {
      return null;
    }

    return cloneNeighbor(neighbor);
  }

  resolveActiveNeighborById(tenantId: string, neighborId: string): ConnectShyftNeighbor | null {
    if (this.isNeighborDeleted(tenantId, neighborId)) {
      return null;
    }

    return this.resolveNeighborById(tenantId, neighborId);
  }

  findCurrentPhoneConflicts(
    input: NeighborPhoneConflictLookupInput,
  ): NeighborPhoneConflict[] {
    if (input.normalizedE164Values.length === 0) {
      return [];
    }

    const candidateValues = new Set(input.normalizedE164Values);
    const conflictsByPhone = new Map<string, Set<string>>();
    const tenantIds = this.neighborIdsByTenant.get(input.tenantId);
    if (!tenantIds || tenantIds.size === 0) {
      return [];
    }

    tenantIds.forEach((neighborId) => {
      if (input.excludeNeighborId && neighborId === input.excludeNeighborId) {
        return;
      }

      const neighbor = this.neighborsById.get(neighborId);
      if (!neighbor || neighbor.tenantId !== input.tenantId || this.isNeighborDeleted(input.tenantId, neighborId)) {
        return;
      }

      neighbor.phones.forEach((phone) => {
        if (phone.isActive === false || !candidateValues.has(phone.value)) {
          return;
        }

        const current = conflictsByPhone.get(phone.value) || new Set<string>();
        current.add(neighborId);
        conflictsByPhone.set(phone.value, current);
      });
    });

    return Array.from(conflictsByPhone.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([normalizedE164, neighborIds]) => ({
        normalizedE164,
        neighborIds: Array.from(neighborIds).sort(),
      }));
  }

  listByTenant(tenantId: string): ConnectShyftNeighbor[] {
    const tenantIds = this.neighborIdsByTenant.get(tenantId);
    if (!tenantIds || tenantIds.size === 0) {
      return [];
    }

    const neighbors = Array.from(tenantIds)
      .map((neighborId) => this.neighborsById.get(neighborId))
      .filter((neighbor): neighbor is ConnectShyftNeighbor => (
        !!neighbor && !this.isNeighborDeleted(tenantId, neighbor.neighborId)
      ))
      .map(cloneNeighbor);

    return sortNeighbors(neighbors);
  }

  listActiveIdentityBoundaryNeighborsByTenant(
    tenantId: string,
  ): ConnectShyftIdentityBoundaryNeighbor[] {
    const tenantIds = this.neighborIdsByTenant.get(tenantId);
    if (!tenantIds || tenantIds.size === 0) {
      return [];
    }

    const boundaryNeighbors: ConnectShyftIdentityBoundaryNeighbor[] = [];
    tenantIds.forEach((neighborId) => {
      const neighbor = this.neighborsById.get(neighborId);
      if (!neighbor || neighbor.tenantId !== tenantId || this.isNeighborDeleted(tenantId, neighborId)) {
        return;
      }

      const phones = neighbor.phones
        .filter((phone) => phone.isActive !== false)
        .map((phone) => ({
          phoneId: phone.phoneId,
          value: phone.value,
          isShared: phone.isShared === true,
          verificationStatus: normalizeVerificationStatus(phone.verificationStatus),
        }));

      if (phones.length === 0) {
        return;
      }

      boundaryNeighbors.push({
        neighborId: neighbor.neighborId,
        phones,
      });
    });

    return boundaryNeighbors.sort((left, right) => left.neighborId.localeCompare(right.neighborId));
  }

  listIdentityBoundaryNeighborsByPhoneValue(
    tenantId: string,
    phoneValue: string,
  ): ConnectShyftIdentityBoundaryNeighbor[] {
    const tenantIds = this.neighborIdsByTenant.get(tenantId);
    if (!tenantIds || tenantIds.size === 0) {
      return [];
    }

    const boundaryNeighbors: ConnectShyftIdentityBoundaryNeighbor[] = [];
    tenantIds.forEach((neighborId) => {
      const neighbor = this.neighborsById.get(neighborId);
      if (!neighbor || neighbor.tenantId !== tenantId || this.isNeighborDeleted(tenantId, neighborId)) {
        return;
      }

      const phones = neighbor.phones
        .filter((phone) => phone.value === phoneValue)
        .map((phone) => ({
          phoneId: phone.phoneId,
          value: phone.value,
          isShared: phone.isShared === true,
          verificationStatus: normalizeVerificationStatus(phone.verificationStatus),
        }));

      if (phones.length === 0) {
        return;
      }

      boundaryNeighbors.push({
        neighborId: neighbor.neighborId,
        phones,
      });
    });

    return boundaryNeighbors.sort((left, right) => left.neighborId.localeCompare(right.neighborId));
  }

  listActiveIdentityBoundaryNeighborsByPhoneValue(
    tenantId: string,
    phoneValue: string,
  ): ConnectShyftIdentityBoundaryNeighbor[] {
    const tenantIds = this.neighborIdsByTenant.get(tenantId);
    if (!tenantIds || tenantIds.size === 0) {
      return [];
    }

    const boundaryNeighbors: ConnectShyftIdentityBoundaryNeighbor[] = [];
    tenantIds.forEach((neighborId) => {
      const neighbor = this.neighborsById.get(neighborId);
      if (!neighbor || neighbor.tenantId !== tenantId || this.isNeighborDeleted(tenantId, neighborId)) {
        return;
      }

      const phones = neighbor.phones
        .filter((phone) => phone.value === phoneValue && phone.isActive !== false)
        .map((phone) => ({
          phoneId: phone.phoneId,
          value: phone.value,
          isShared: phone.isShared === true,
          verificationStatus: normalizeVerificationStatus(phone.verificationStatus),
        }));

      if (phones.length === 0) {
        return;
      }

      boundaryNeighbors.push({
        neighborId: neighbor.neighborId,
        phones,
      });
    });

    return boundaryNeighbors.sort((left, right) => left.neighborId.localeCompare(right.neighborId));
  }

  promoteUnknownTextingPreference(
    tenantId: string,
    neighborId: string,
  ): NeighborTextingPreferencePromotionResult {
    const existing = this.neighborsById.get(neighborId);
    if (!existing || existing.tenantId !== tenantId) {
      return {
        status: 'not_found',
        neighbor: null,
      };
    }

    if (existing.prefersTexting !== 'UNKNOWN') {
      return {
        status: 'unchanged',
        neighbor: cloneNeighbor(existing),
      };
    }

    const now = nowIsoUtc();
    const updated: ConnectShyftNeighbor = {
      ...existing,
      prefersTexting: 'YES',
      updatedAtUtc: now,
      phones: existing.phones.map((phone) => ({
        ...phone,
      })),
    };

    this.neighborsById.set(neighborId, updated);

    return {
      status: 'updated',
      neighbor: cloneNeighbor(updated),
    };
  }

  listByOrgUnit(tenantId: string, orgUnitId: string): ConnectShyftNeighbor[] {
    const scopeKey = buildTenantOrgUnitKey(tenantId, orgUnitId);
    const scopedIds = this.neighborIdsByScope.get(scopeKey);
    if (!scopedIds || scopedIds.size === 0) {
      return [];
    }

    const neighbors = Array.from(scopedIds)
      .map((neighborId) => this.neighborsById.get(neighborId))
      .filter((neighbor): neighbor is ConnectShyftNeighbor => (
        !!neighbor && !this.isNeighborDeleted(tenantId, neighbor.neighborId)
      ))
      .map(cloneNeighbor);

    return sortNeighbors(neighbors);
  }
}

export class KnexConnectShyftNeighborStore {
  constructor(private readonly knexClient: KnexLike = db as unknown as KnexLike) {}

  private neighborColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'first_name',
      'last_name',
      'prefers_texting',
      'is_deleted',
      'deleted_at_utc',
      'deleted_by_user_id',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private neighborPhoneColumns(): string[] {
    return [
      'id',
      'neighbor_id',
      'tenant_id',
      'label',
      'value_e164',
      'raw_input',
      'normalized_e164',
      'display_national',
      'country_code',
      'national_number',
      'extension',
      'validation_status',
      'usage_type',
      'source',
      'sort_order',
      'is_primary',
      'is_shared',
      'verification_status',
      'is_active',
      'uniqueness_enforcement_state',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  async findCurrentPhoneConflicts(
    input: NeighborPhoneConflictLookupInput,
  ): Promise<NeighborPhoneConflict[]> {
    if (input.normalizedE164Values.length === 0) {
      return [];
    }

    const rows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .join('cs_neighbors', 'cs_neighbors.id', '=', 'cs_neighbor_phones.neighbor_id')
      .where({
        'cs_neighbor_phones.tenant_id': input.tenantId,
        'cs_neighbors.tenant_id': input.tenantId,
        'cs_neighbor_phones.is_active': true,
        'cs_neighbors.is_deleted': false,
      })
      .whereIn('cs_neighbor_phones.normalized_e164', input.normalizedE164Values)
      .orderBy('cs_neighbor_phones.normalized_e164', 'asc')
      .orderBy('cs_neighbor_phones.neighbor_id', 'asc')
      .select<Array<{ normalized_e164: string; neighbor_id: string }>>([
        'cs_neighbor_phones.normalized_e164',
        'cs_neighbor_phones.neighbor_id',
      ]);

    const conflictsByPhone = new Map<string, Set<string>>();
    rows.forEach((row) => {
      if (input.excludeNeighborId && row.neighbor_id === input.excludeNeighborId) {
        return;
      }

      const current = conflictsByPhone.get(row.normalized_e164) || new Set<string>();
      current.add(row.neighbor_id);
      conflictsByPhone.set(row.normalized_e164, current);
    });

    return Array.from(conflictsByPhone.entries()).map(([normalizedE164, neighborIds]) => ({
      normalizedE164,
      neighborIds: Array.from(neighborIds).sort(),
    }));
  }

  async createNeighbor(input: NeighborStoreCreateInput): Promise<NeighborPersistenceResult> {
    const neighborId = input.neighborId || randomUUID();

    try {
      return await this.knexClient.transaction(async (trx) => {
        const [neighborRow] = await trx
          .withSchema('connectshyft')
          .table('cs_neighbors')
          .insert({
            id: neighborId,
            tenant_id: input.tenantId,
            org_unit_id: input.orgUnitId,
            first_name: input.firstName,
            last_name: input.lastName,
            prefers_texting: input.prefersTexting ?? 'YES',
            created_at_utc: trx.fn.now(),
            updated_at_utc: trx.fn.now(),
          })
          .returning<DbNeighborRow[]>(this.neighborColumns());

        if (!neighborRow) {
          return {
            ok: false,
            reason: 'NEIGHBOR_ID_CONFLICT',
          } as NeighborPersistenceResult;
        }

        const phoneRows = input.phones.map((phone) => ({
          id: randomUUID(),
          neighbor_id: neighborId,
          tenant_id: input.tenantId,
          label: phone.label,
          value_e164: phone.value,
          raw_input: phone.rawInput,
          normalized_e164: phone.normalizedE164,
          display_national: phone.displayNational,
          country_code: phone.countryCode,
          national_number: phone.nationalNumber,
          extension: phone.extension || null,
          validation_status: phone.validationStatus,
          usage_type: phone.usageType,
          source: phone.source,
          sort_order: phone.sortOrder,
          is_primary: phone.isPrimary,
          is_shared: phone.isShared,
          verification_status: phone.verificationStatus,
          is_active: phone.isActive,
          uniqueness_enforcement_state: 'ENFORCED',
          created_at_utc: trx.fn.now(),
          updated_at_utc: trx.fn.now(),
        }));

        const insertedPhones = await trx
          .withSchema('connectshyft')
          .table('cs_neighbor_phones')
          .insert(phoneRows)
          .returning<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

        return {
          ok: true,
          neighbor: mapRowsToNeighbor(neighborRow, insertedPhones),
        } as NeighborPersistenceResult;
      });
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return {
          ok: false,
          reason: 'DUPLICATE_PHONE',
        };
      }

      if (error && typeof error === 'object') {
        const pg = error as { code?: string };
        if (pg.code === '23505') {
          return {
            ok: false,
            reason: 'NEIGHBOR_ID_CONFLICT',
          };
        }
      }

      throw error;
    }
  }

  async resolveNeighborById(tenantId: string, neighborId: string): Promise<ConnectShyftNeighbor | null> {
    const neighborRow = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: tenantId,
        id: neighborId,
      })
      .first<DbNeighborRow>(this.neighborColumns());

    if (!neighborRow) {
      return null;
    }

    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
        neighbor_id: neighborId,
      })
      .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

    return mapRowsToNeighbor(neighborRow, phoneRows);
  }

  async softDeleteNeighbor(input: {
    tenantId: string;
    neighborId: string;
    actorUserId: string;
  }): Promise<NeighborSoftDeletePersistenceResult> {
    return this.knexClient.transaction(async (trx) => {
      const existingNeighbor = await trx
        .withSchema('connectshyft')
        .table('cs_neighbors')
        .where({
          tenant_id: input.tenantId,
          id: input.neighborId,
        })
        .first<DbNeighborRow>(this.neighborColumns());

      if (!existingNeighbor) {
        return {
          ok: false,
          reason: 'NEIGHBOR_NOT_FOUND',
        } as NeighborSoftDeletePersistenceResult;
      }

      const existingPhoneRows = await trx
        .withSchema('connectshyft')
        .table('cs_neighbor_phones')
        .where({
          tenant_id: input.tenantId,
          neighbor_id: input.neighborId,
        })
        .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

      if (existingNeighbor.is_deleted === true) {
        return {
          ok: true,
          neighbor: mapRowsToNeighbor(existingNeighbor, existingPhoneRows),
          alreadyDeleted: true,
        } as NeighborSoftDeletePersistenceResult;
      }

      const [deletedNeighbor] = await trx
        .withSchema('connectshyft')
        .table('cs_neighbors')
        .where({
          tenant_id: input.tenantId,
          id: input.neighborId,
          is_deleted: false,
        })
        .update({
          is_deleted: true,
          deleted_at_utc: trx.fn.now(),
          deleted_by_user_id: input.actorUserId,
          updated_at_utc: trx.fn.now(),
        })
        .returning<DbNeighborRow[]>(this.neighborColumns());

      if (!deletedNeighbor) {
        const currentNeighbor = await trx
          .withSchema('connectshyft')
          .table('cs_neighbors')
          .where({
            tenant_id: input.tenantId,
            id: input.neighborId,
          })
          .first<DbNeighborRow>(this.neighborColumns());

        if (!currentNeighbor) {
          return {
            ok: false,
            reason: 'NEIGHBOR_NOT_FOUND',
          } as NeighborSoftDeletePersistenceResult;
        }

        const currentPhoneRows = await trx
          .withSchema('connectshyft')
          .table('cs_neighbor_phones')
          .where({
            tenant_id: input.tenantId,
            neighbor_id: input.neighborId,
          })
          .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

        return {
          ok: true,
          neighbor: mapRowsToNeighbor(currentNeighbor, currentPhoneRows),
          alreadyDeleted: currentNeighbor.is_deleted === true,
        } as NeighborSoftDeletePersistenceResult;
      }

      const updatedPhoneRows = await trx
        .withSchema('connectshyft')
        .table('cs_neighbor_phones')
        .where({
          tenant_id: input.tenantId,
          neighbor_id: input.neighborId,
        })
        .update({
          is_active: false,
          updated_at_utc: trx.fn.now(),
        })
        .returning<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

      return {
        ok: true,
        neighbor: mapRowsToNeighbor(
          deletedNeighbor,
          updatedPhoneRows.length > 0 ? updatedPhoneRows : existingPhoneRows,
        ),
        alreadyDeleted: false,
      } as NeighborSoftDeletePersistenceResult;
    });
  }

  async listByTenant(tenantId: string): Promise<ConnectShyftNeighbor[]> {
    const neighborRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: tenantId,
        is_deleted: false,
      })
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')
      .orderBy('id', 'asc')
      .select<DbNeighborRow[]>(this.neighborColumns());

    if (neighborRows.length === 0) {
      return [];
    }

    const neighborIds = neighborRows.map((row) => row.id);
    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
      })
      .whereIn('neighbor_id', neighborIds)
      .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

    const phonesByNeighborId = new Map<string, DbNeighborPhoneRow[]>();
    phoneRows.forEach((row) => {
      const current = phonesByNeighborId.get(row.neighbor_id) || [];
      current.push(row);
      phonesByNeighborId.set(row.neighbor_id, current);
    });

    return neighborRows.map((neighborRow) =>
      mapRowsToNeighbor(neighborRow, phonesByNeighborId.get(neighborRow.id) || []));
  }

  async resolveActiveNeighborById(
    tenantId: string,
    neighborId: string,
  ): Promise<ConnectShyftNeighbor | null> {
    const neighborRow = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: tenantId,
        id: neighborId,
        is_deleted: false,
      })
      .first<DbNeighborRow>(this.neighborColumns());

    if (!neighborRow) {
      return null;
    }

    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
        neighbor_id: neighborId,
      })
      .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

    return mapRowsToNeighbor(neighborRow, phoneRows);
  }

  async listActiveIdentityBoundaryNeighborsByTenant(
    tenantId: string,
  ): Promise<ConnectShyftIdentityBoundaryNeighbor[]> {
    const activeNeighbors = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: tenantId,
        is_deleted: false,
      })
      .orderBy('id', 'asc')
      .select<DbNeighborRow[]>(['id']);

    if (activeNeighbors.length === 0) {
      return [];
    }

    const neighborIds = activeNeighbors.map((row) => row.id);
    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
      })
      .whereIn('neighbor_id', neighborIds)
      .orderBy('neighbor_id', 'asc')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc')
      .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

    const phonesByNeighborId = new Map<string, ConnectShyftIdentityBoundaryNeighbor['phones']>();
    phoneRows.forEach((row) => {
      if (row.is_active === false) {
        return;
      }
      const current = phonesByNeighborId.get(row.neighbor_id) || [];
      current.push({
        phoneId: row.id,
        value: resolveStoredPhoneValue(row),
        isShared: row.is_shared === true,
        verificationStatus: normalizeVerificationStatus(row.verification_status),
      });
      phonesByNeighborId.set(row.neighbor_id, current);
    });

    return neighborIds
      .map((resolvedNeighborId) => ({
        neighborId: resolvedNeighborId,
        phones: phonesByNeighborId.get(resolvedNeighborId) || [],
      }))
      .filter((neighbor) => neighbor.phones.length > 0);
  }

  async listIdentityBoundaryNeighborsByPhoneValue(
    tenantId: string,
    phoneValue: string,
  ): Promise<ConnectShyftIdentityBoundaryNeighbor[]> {
    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
        normalized_e164: phoneValue,
      })
      .orderBy('neighbor_id', 'asc')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc')
      .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

    if (phoneRows.length === 0) {
      return [];
    }

    const phonesByNeighborId = new Map<string, Array<{
      phoneId: string;
      value: string;
      isShared: boolean;
      verificationStatus: 'verified' | 'unverified';
    }>>();

    phoneRows.forEach((row) => {
      const existing = phonesByNeighborId.get(row.neighbor_id) || [];
      existing.push({
        phoneId: row.id,
        value: resolveStoredPhoneValue(row),
        isShared: row.is_shared === true,
        verificationStatus: normalizeVerificationStatus(row.verification_status),
      });
      phonesByNeighborId.set(row.neighbor_id, existing);
    });

    return Array.from(phonesByNeighborId.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([neighborId, phones]) => ({
        neighborId,
        phones,
      }));
  }

  async listActiveIdentityBoundaryNeighborsByPhoneValue(
    tenantId: string,
    phoneValue: string,
  ): Promise<ConnectShyftIdentityBoundaryNeighbor[]> {
    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
        normalized_e164: phoneValue,
        is_active: true,
      })
      .orderBy('neighbor_id', 'asc')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc')
      .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

    if (phoneRows.length === 0) {
      return [];
    }

    const neighborIds = Array.from(new Set(phoneRows.map((row) => row.neighbor_id)));
    const activeNeighbors = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: tenantId,
        is_deleted: false,
      })
      .whereIn('id', neighborIds)
      .select<DbNeighborRow[]>(['id']);
    const activeNeighborIds = new Set(activeNeighbors.map((row) => row.id));

    const phonesByNeighborId = new Map<string, Array<{
      phoneId: string;
      value: string;
      isShared: boolean;
      verificationStatus: 'verified' | 'unverified';
    }>>();

    phoneRows.forEach((row) => {
      if (!activeNeighborIds.has(row.neighbor_id)) {
        return;
      }

      const current = phonesByNeighborId.get(row.neighbor_id) || [];
      current.push({
        phoneId: row.id,
        value: resolveStoredPhoneValue(row),
        isShared: row.is_shared === true,
        verificationStatus: normalizeVerificationStatus(row.verification_status),
      });
      phonesByNeighborId.set(row.neighbor_id, current);
    });

    return Array.from(phonesByNeighborId.entries())
      .sort(([leftNeighborId], [rightNeighborId]) => leftNeighborId.localeCompare(rightNeighborId))
      .map(([neighborId, phones]) => ({
        neighborId,
        phones,
      }));
  }

  async promoteUnknownTextingPreference(
    tenantId: string,
    neighborId: string,
  ): Promise<NeighborTextingPreferencePromotionResult> {
    const existing = await this.resolveActiveNeighborById(tenantId, neighborId);
    if (!existing) {
      return {
        status: 'not_found',
        neighbor: null,
      };
    }

    if (existing.prefersTexting !== 'UNKNOWN') {
      return {
        status: 'unchanged',
        neighbor: existing,
      };
    }

    const [neighborRow] = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: tenantId,
        id: neighborId,
        is_deleted: false,
        prefers_texting: 'UNKNOWN',
      })
      .update({
        prefers_texting: 'YES',
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbNeighborRow[]>(this.neighborColumns());

    if (!neighborRow) {
      return {
        status: 'unchanged',
        neighbor: await this.resolveActiveNeighborById(tenantId, neighborId),
      };
    }

    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
        neighbor_id: neighborId,
      })
      .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

    return {
      status: 'updated',
      neighbor: mapRowsToNeighbor(neighborRow, phoneRows),
    };
  }

  async updateNeighbor(input: NeighborStoreUpdateInput): Promise<NeighborPersistenceResult> {
    try {
      return await this.knexClient.transaction(async (trx) => {
        const updatePayload: Record<string, unknown> = {
          first_name: input.firstName,
          last_name: input.lastName,
          updated_at_utc: trx.fn.now(),
        };
        if (input.prefersTexting !== undefined) {
          updatePayload.prefers_texting = input.prefersTexting;
        }

        const [neighborRow] = await trx
          .withSchema('connectshyft')
          .table('cs_neighbors')
          .where({
            tenant_id: input.tenantId,
            id: input.neighborId,
          })
          .update(updatePayload)
          .returning<DbNeighborRow[]>([
            'id',
            'tenant_id',
            'org_unit_id',
            'first_name',
            'last_name',
            'prefers_texting',
            'created_at_utc',
            'updated_at_utc',
          ]);

        if (!neighborRow) {
          return {
            ok: false,
            reason: 'NEIGHBOR_NOT_FOUND',
          } as NeighborPersistenceResult;
        }

        await trx
          .withSchema('connectshyft')
          .table('cs_neighbor_phones')
          .where({
            tenant_id: input.tenantId,
            neighbor_id: input.neighborId,
          })
          .delete();

        const phoneRows = input.phones.map((phone) => ({
          id: randomUUID(),
          neighbor_id: input.neighborId,
          tenant_id: input.tenantId,
          label: phone.label,
          value_e164: phone.value,
          raw_input: phone.rawInput,
          normalized_e164: phone.normalizedE164,
          display_national: phone.displayNational,
          country_code: phone.countryCode,
          national_number: phone.nationalNumber,
          extension: phone.extension || null,
          validation_status: phone.validationStatus,
          usage_type: phone.usageType,
          source: phone.source,
          sort_order: phone.sortOrder,
          is_primary: phone.isPrimary,
          is_shared: phone.isShared,
          verification_status: phone.verificationStatus,
          is_active: phone.isActive,
          uniqueness_enforcement_state: 'ENFORCED',
          created_at_utc: trx.fn.now(),
          updated_at_utc: trx.fn.now(),
        }));

        const insertedPhones = await trx
          .withSchema('connectshyft')
          .table('cs_neighbor_phones')
          .insert(phoneRows)
          .returning<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

        return {
          ok: true,
          neighbor: mapRowsToNeighbor(neighborRow, insertedPhones),
        } as NeighborPersistenceResult;
      });
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return {
          ok: false,
          reason: 'DUPLICATE_PHONE',
        };
      }

      throw error;
    }
  }

  async mergeNeighbors(input: NeighborStoreMergeInput): Promise<NeighborMergePersistenceResult> {
    if (input.sourceNeighborId === input.survivorNeighborId) {
      return {
        ok: false,
        reason: 'MERGE_INVALID',
      };
    }

    return this.knexClient.transaction(async (trx) => {
      const neighborRows = await trx
        .withSchema('connectshyft')
        .table('cs_neighbors')
        .where({
          tenant_id: input.tenantId,
        })
        .whereIn('id', [input.sourceNeighborId, input.survivorNeighborId])
        .select<DbNeighborRow[]>([
          'id',
          'tenant_id',
          'org_unit_id',
          'first_name',
          'last_name',
          'created_at_utc',
          'updated_at_utc',
        ]);

      const sourceRow = neighborRows.find((row) => row.id === input.sourceNeighborId);
      const survivorRow = neighborRows.find((row) => row.id === input.survivorNeighborId);

      if (!sourceRow || !survivorRow) {
        return {
          ok: false,
          reason: 'NEIGHBOR_NOT_FOUND',
        } as NeighborMergePersistenceResult;
      }

      const phoneRows = await trx
        .withSchema('connectshyft')
        .table('cs_neighbor_phones')
        .where({
          tenant_id: input.tenantId,
        })
        .whereIn('neighbor_id', [input.sourceNeighborId, input.survivorNeighborId])
        .select<DbNeighborPhoneRow[]>(this.neighborPhoneColumns());

      const mergedPhones = mergePhoneRows(
        phoneRows.filter((row) => row.neighbor_id === input.survivorNeighborId),
        phoneRows.filter((row) => row.neighbor_id === input.sourceNeighborId),
      );

      await trx
        .withSchema('connectshyft')
        .table('cs_threads')
        .where({
          tenant_id: input.tenantId,
          neighbor_id: input.sourceNeighborId,
        })
        .update({
          neighbor_id: input.survivorNeighborId,
          updated_at_utc: trx.fn.now(),
        });

      await trx
        .withSchema('connectshyft')
        .table('cs_neighbor_phones')
        .where({
          tenant_id: input.tenantId,
          neighbor_id: input.survivorNeighborId,
        })
        .delete();

      await trx
        .withSchema('connectshyft')
        .table('cs_neighbor_phones')
        .where({
          tenant_id: input.tenantId,
          neighbor_id: input.sourceNeighborId,
        })
        .delete();

      const insertedPhones = mergedPhones.length > 0
        ? await trx
          .withSchema('connectshyft')
          .table('cs_neighbor_phones')
          .insert(
            mergedPhones.map((phone) => ({
              id: randomUUID(),
              neighbor_id: input.survivorNeighborId,
              tenant_id: input.tenantId,
              label: phone.label,
              value_e164: phone.value,
              raw_input: phone.rawInput,
              normalized_e164: phone.normalizedE164,
              display_national: phone.displayNational,
              country_code: phone.countryCode,
              national_number: phone.nationalNumber,
              extension: phone.extension || null,
              validation_status: phone.validationStatus,
              usage_type: phone.usageType,
              source: phone.source,
              sort_order: phone.sortOrder,
              is_primary: phone.isPrimary,
              is_shared: phone.isShared,
              verification_status: phone.verificationStatus,
              is_active: phone.isActive,
              created_at_utc: trx.fn.now(),
              updated_at_utc: trx.fn.now(),
            })),
          )
          .returning<DbNeighborPhoneRow[]>(this.neighborPhoneColumns())
        : [];

      await trx
        .withSchema('connectshyft')
        .table('cs_neighbors')
        .where({
          tenant_id: input.tenantId,
          id: input.sourceNeighborId,
        })
        .delete();

      const [updatedSurvivor] = await trx
        .withSchema('connectshyft')
        .table('cs_neighbors')
        .where({
          tenant_id: input.tenantId,
          id: input.survivorNeighborId,
        })
        .update({
          updated_at_utc: trx.fn.now(),
        })
        .returning<DbNeighborRow[]>(this.neighborColumns());

      if (!updatedSurvivor) {
        return {
          ok: false,
          reason: 'NEIGHBOR_NOT_FOUND',
        } as NeighborMergePersistenceResult;
      }

      return {
        ok: true,
        neighbor: mapRowsToNeighbor(updatedSurvivor, insertedPhones),
        merge: {
          sourceNeighborId: input.sourceNeighborId,
          survivorNeighborId: input.survivorNeighborId,
          irreversibleConfirmed: true,
        },
      } as NeighborMergePersistenceResult;
    });
  }
}

export class ConnectShyftNeighborService {
  private readonly identityBoundary: ConnectShyftIdentityBoundaryAdapter;

  constructor(
    private readonly store: InMemoryConnectShyftNeighborStore = defaultNeighborStore,
    identityBoundary?: ConnectShyftIdentityBoundaryAdapter,
  ) {
      const activeStore = this.store as InMemoryConnectShyftNeighborStore & {
        listActiveIdentityBoundaryNeighborsByTenant?: (
          tenantId: string,
        ) => ConnectShyftIdentityBoundaryNeighbor[];
      listActiveIdentityBoundaryNeighborsByPhoneValue?: (
        tenantId: string,
        normalizedContactPointValue: string,
      ) => ConnectShyftIdentityBoundaryNeighbor[];
    };
    this.identityBoundary = identityBoundary
      || new InProcessConnectShyftIdentityBoundaryAdapter(
        (tenantId) => activeStore.listActiveIdentityBoundaryNeighborsByTenant
          ? activeStore.listActiveIdentityBoundaryNeighborsByTenant(tenantId)
          : this.store.listByTenant(tenantId).map((neighbor) => ({
            neighborId: neighbor.neighborId,
            phones: neighbor.phones
              .filter((phone) => phone.isActive !== false)
              .map((phone) => ({
                phoneId: phone.phoneId,
                value: phone.value,
                isShared: phone.isShared === true,
                verificationStatus: normalizeVerificationStatus(phone.verificationStatus),
              })),
          })),
        (tenantId, normalizedContactPointValue) =>
          activeStore.listActiveIdentityBoundaryNeighborsByPhoneValue
            ? activeStore.listActiveIdentityBoundaryNeighborsByPhoneValue(
              tenantId,
              normalizedContactPointValue,
            )
            : this.store.listIdentityBoundaryNeighborsByPhoneValue(
              tenantId,
              normalizedContactPointValue,
            ),
      );
  }

  private validateDuplicatePhones(
    tenantId: string,
    phones: NormalizedConnectShyftNeighborPhoneInput[],
    excludeNeighborId?: string,
  ): NeighborRefusalResult | null {
    if (hasDuplicateCandidateNormalizedPhones(phones)) {
      return buildDuplicatePhoneRefusal();
    }

    const conflicts = this.store.findCurrentPhoneConflicts({
      tenantId,
      normalizedE164Values: listDistinctCandidateNormalizedPhones(phones),
      excludeNeighborId,
    });

    return hasPhoneConflicts(conflicts) ? buildDuplicatePhoneRefusal() : null;
  }

  createNeighbor(input: ConnectShyftCreateNeighborCommand): ConnectShyftCreateNeighborResult {
    if (!hasNeighborManageCapability(input.actorRoles)) {
      return buildCreateCapabilityRefusal();
    }

    const normalizedPhones = normalizePhones(input.phones);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    const duplicateRefusal = this.validateDuplicatePhones(input.tenantId, normalizedPhones.phones);
    if (duplicateRefusal) {
      return duplicateRefusal;
    }

    const persisted = this.store.createNeighbor({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      firstName: normalizeNonEmptyString(input.firstName),
      lastName: normalizeNonEmptyString(input.lastName),
      prefersTexting: input.prefersTexting ?? 'YES',
      phones: normalizedPhones.phones,
      neighborId: input.neighborId,
    });

    if (!persisted.ok) {
      if (persisted.reason === 'DUPLICATE_PHONE') {
        return buildDuplicatePhoneRefusal();
      }

      return buildNeighborIdConflictRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      httpStatus: 201,
      data: {
        neighbor: persisted.neighbor,
      },
    };
  }

  resolveNeighbor(input: ConnectShyftResolveNeighborCommand): ConnectShyftResolveNeighborResult {
    if (!hasNeighborReadCapability(input.actorRoles)) {
      return buildReadCapabilityRefusal();
    }

    const activeResolveStore = this.store as InMemoryConnectShyftNeighborStore & {
      resolveActiveNeighborById?: (
        tenantId: string,
        neighborId: string,
      ) => ConnectShyftNeighbor | null;
    };
    const neighbor = input.includeDeleted === true
      ? this.store.resolveNeighborById(input.tenantId, input.neighborId)
      : activeResolveStore.resolveActiveNeighborById
        ? activeResolveStore.resolveActiveNeighborById(input.tenantId, input.neighborId)
        : this.store.resolveNeighborById(input.tenantId, input.neighborId);
    if (!neighbor) {
      return buildNeighborNotFoundRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
      httpStatus: 200,
      data: {
        neighbor,
      },
    };
  }

  resolveActiveNeighbor(input: {
    tenantId: string;
    neighborId: string;
  }): ConnectShyftNeighbor | null {
    return this.store.resolveActiveNeighborById(input.tenantId, input.neighborId);
  }

  createNeighborFromInbound(
    input: ConnectShyftCreateInboundNeighborCommand,
  ): ConnectShyftCreateNeighborResult {
    const normalizedPhones = normalizePhones([
      {
        label: 'mobile',
        value: input.phone,
      },
    ]);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    const duplicateRefusal = this.validateDuplicatePhones(input.tenantId, normalizedPhones.phones);
    if (duplicateRefusal) {
      return duplicateRefusal;
    }

    const persisted = this.store.createNeighbor({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      firstName: '',
      lastName: '',
      prefersTexting: 'UNKNOWN',
      phones: normalizedPhones.phones,
    });

    if (!persisted.ok) {
      if (persisted.reason === 'DUPLICATE_PHONE') {
        return buildDuplicatePhoneRefusal();
      }

      return buildNeighborIdConflictRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      httpStatus: 201,
      data: {
        neighbor: persisted.neighbor,
      },
    };
  }

  applyInboundSmsTextingPreference(
    input: ConnectShyftApplyInboundSmsTextingPreferenceCommand,
  ): {
    ok: true;
    updated: boolean;
    neighbor: ConnectShyftNeighbor;
  } | NeighborRefusalResult {
    const promoted = this.store.promoteUnknownTextingPreference(input.tenantId, input.neighborId);
    if (!promoted.neighbor) {
      return buildNeighborNotFoundRefusal();
    }

    return {
      ok: true,
      updated: promoted.status === 'updated',
      neighbor: promoted.neighbor,
    };
  }

  listNeighbors(input: ConnectShyftListNeighborsCommand): ConnectShyftListNeighborsResult {
    if (!hasNeighborReadCapability(input.actorRoles)) {
      return buildReadCapabilityRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED',
      httpStatus: 200,
      data: {
        neighbors: this.store.listByTenant(input.tenantId),
      },
    };
  }

  softDeleteNeighbor(
    input: ConnectShyftSoftDeleteNeighborCommand,
  ): ConnectShyftSoftDeleteNeighborResult {
    if (!hasTenantPrivilegedNeighborCapability(input.actorRoles)) {
      return buildDeleteCapabilityRefusal();
    }
    if (input.irreversibleConfirmation !== true) {
      return buildDeleteConfirmationRequiredRefusal();
    }

    const deleted = this.store.softDeleteNeighbor({
      tenantId: input.tenantId,
      neighborId: input.neighborId,
      actorUserId: input.actorUserId,
    });

    if (!deleted.ok) {
      return buildNeighborNotFoundRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
      httpStatus: 200,
      data: {
        neighbor: deleted.neighbor,
        alreadyDeleted: deleted.alreadyDeleted,
      },
    };
  }

  updateNeighbor(input: ConnectShyftUpdateNeighborCommand): ConnectShyftUpdateNeighborResult {
    if (!hasNeighborManageCapability(input.actorRoles)) {
      return buildUpdateCapabilityRefusal();
    }
    if (!hasTenantPrivilegedNeighborCapability(input.actorRoles) && input.relationshipValidated !== true) {
      return buildRelationshipRequiredRefusal();
    }

    const normalizedPhones = normalizePhones(input.phones);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    const duplicateRefusal = this.validateDuplicatePhones(
      input.tenantId,
      normalizedPhones.phones,
      input.neighborId,
    );
    if (duplicateRefusal) {
      return duplicateRefusal;
    }

    const updated = this.store.updateNeighbor({
      tenantId: input.tenantId,
      neighborId: input.neighborId,
      firstName: normalizeNonEmptyString(input.firstName),
      lastName: normalizeNonEmptyString(input.lastName),
      prefersTexting: input.prefersTexting,
      phones: normalizedPhones.phones,
    });

    if (!updated.ok) {
      if (updated.reason === 'DUPLICATE_PHONE') {
        return buildDuplicatePhoneRefusal();
      }

      return buildNeighborNotFoundRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      httpStatus: 200,
      data: {
        neighbor: updated.neighbor,
      },
    };
  }

  evaluateIdentityMatch(input: ConnectShyftIdentityMatchCommand): ConnectShyftIdentityMatchResult {
    const evaluated = this.identityBoundary.evaluateMatch(input);
    if (isPromiseLike(evaluated)) {
      throw new TypeError('ConnectShyftNeighborService requires a synchronous identity boundary adapter.');
    }

    return evaluated;
  }

  mergeNeighbor(input: ConnectShyftMergeNeighborCommand): ConnectShyftMergeNeighborResult {
    if (!hasNeighborMergeCapability(input.actorRoles)) {
      return buildMergeCapabilityRefusal();
    }
    if (!hasValidMergeConfirmation(input.irreversibleConfirmation)) {
      return buildMergeConfirmationRequiredRefusal();
    }
    if (
      normalizeNonEmptyString(input.sourceNeighborId) === ''
      || normalizeNonEmptyString(input.survivorNeighborId) === ''
      || input.sourceNeighborId === input.survivorNeighborId
    ) {
      return buildMergeInvalidRefusal();
    }

    const merged = this.store.mergeNeighbors({
      tenantId: input.tenantId,
      sourceNeighborId: input.sourceNeighborId,
      survivorNeighborId: input.survivorNeighborId,
    });

    if (!merged.ok) {
      if (merged.reason === 'MERGE_INVALID') {
        return buildMergeInvalidRefusal();
      }
      return buildNeighborNotFoundRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
      httpStatus: 200,
      data: {
        neighbor: merged.neighbor,
        merge: merged.merge,
      },
    };
  }
}

const defaultNeighborStore = new InMemoryConnectShyftNeighborStore();
const defaultKnexNeighborStore = new KnexConnectShyftNeighborStore();

export const connectShyftNeighborService = new ConnectShyftNeighborService(defaultNeighborStore);

export class AsyncConnectShyftNeighborService {
  private readonly identityBoundary: ConnectShyftIdentityBoundaryAdapter;

  constructor(
    private readonly store: KnexConnectShyftNeighborStore = defaultKnexNeighborStore,
    identityBoundary?: ConnectShyftIdentityBoundaryAdapter,
  ) {
    const activeStore = this.store as KnexConnectShyftNeighborStore & {
      listActiveIdentityBoundaryNeighborsByTenant?: (
        tenantId: string,
      ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>;
      listActiveIdentityBoundaryNeighborsByPhoneValue?: (
        tenantId: string,
        normalizedContactPointValue: string,
      ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>;
    };
    this.identityBoundary = identityBoundary
      || new AsyncInProcessConnectShyftIdentityBoundaryAdapter(
        async (tenantId) => activeStore.listActiveIdentityBoundaryNeighborsByTenant
          ? activeStore.listActiveIdentityBoundaryNeighborsByTenant(tenantId)
          : (await this.store.listByTenant(tenantId)).map((neighbor) => ({
            neighborId: neighbor.neighborId,
            phones: neighbor.phones
              .filter((phone) => phone.isActive !== false)
              .map((phone) => ({
                phoneId: phone.phoneId,
                value: phone.value,
                isShared: phone.isShared === true,
                verificationStatus: normalizeVerificationStatus(phone.verificationStatus),
              })),
          })),
        async (tenantId, normalizedContactPointValue) =>
          activeStore.listActiveIdentityBoundaryNeighborsByPhoneValue
            ? activeStore.listActiveIdentityBoundaryNeighborsByPhoneValue(
              tenantId,
              normalizedContactPointValue,
            )
            : this.store.listIdentityBoundaryNeighborsByPhoneValue(
              tenantId,
              normalizedContactPointValue,
            ),
      );
  }

  private async validateDuplicatePhones(
    tenantId: string,
    phones: NormalizedConnectShyftNeighborPhoneInput[],
    excludeNeighborId?: string,
  ): Promise<NeighborRefusalResult | null> {
    if (hasDuplicateCandidateNormalizedPhones(phones)) {
      return buildDuplicatePhoneRefusal();
    }

    const duplicateLookupStore = this.store as KnexConnectShyftNeighborStore & {
      findCurrentPhoneConflicts?: (
        input: NeighborPhoneConflictLookupInput,
      ) => Promise<NeighborPhoneConflict[]>;
    };

    if (!duplicateLookupStore.findCurrentPhoneConflicts) {
      return null;
    }

    const conflicts = await duplicateLookupStore.findCurrentPhoneConflicts({
      tenantId,
      normalizedE164Values: listDistinctCandidateNormalizedPhones(phones),
      excludeNeighborId,
    });

    return hasPhoneConflicts(conflicts) ? buildDuplicatePhoneRefusal() : null;
  }

  async createNeighbor(input: ConnectShyftCreateNeighborCommand): Promise<ConnectShyftCreateNeighborResult> {
    if (!hasNeighborManageCapability(input.actorRoles)) {
      return buildCreateCapabilityRefusal();
    }

    const normalizedPhones = normalizePhones(input.phones);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    const duplicateRefusal = await this.validateDuplicatePhones(input.tenantId, normalizedPhones.phones);
    if (duplicateRefusal) {
      return duplicateRefusal;
    }

    try {
      const persisted = await this.store.createNeighbor({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        firstName: normalizeNonEmptyString(input.firstName),
        lastName: normalizeNonEmptyString(input.lastName),
        prefersTexting: input.prefersTexting ?? 'YES',
        phones: normalizedPhones.phones,
        neighborId: input.neighborId,
      });

      if (!persisted.ok) {
        if (persisted.reason === 'DUPLICATE_PHONE') {
          return buildDuplicatePhoneRefusal();
        }

        return buildNeighborIdConflictRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: persisted.neighbor,
        },
      };
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return buildDuplicatePhoneRefusal();
      }

      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildCreatePersistenceUnavailableRefusal();
    }
  }

  async resolveNeighbor(input: ConnectShyftResolveNeighborCommand): Promise<ConnectShyftResolveNeighborResult> {
    if (!hasNeighborReadCapability(input.actorRoles)) {
      return buildReadCapabilityRefusal();
    }

    try {
      const activeResolveStore = this.store as KnexConnectShyftNeighborStore & {
        resolveActiveNeighborById?: (
          tenantId: string,
          neighborId: string,
        ) => Promise<ConnectShyftNeighbor | null>;
      };
      const neighbor = input.includeDeleted === true
        ? await this.store.resolveNeighborById(input.tenantId, input.neighborId)
        : activeResolveStore.resolveActiveNeighborById
          ? await activeResolveStore.resolveActiveNeighborById(input.tenantId, input.neighborId)
          : await this.store.resolveNeighborById(input.tenantId, input.neighborId);
      if (!neighbor) {
        return buildNeighborNotFoundRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
        httpStatus: 200,
        data: {
          neighbor,
        },
      };
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return buildDuplicatePhoneRefusal();
      }

      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async resolveActiveNeighbor(input: {
    tenantId: string;
    neighborId: string;
  }): Promise<ConnectShyftNeighbor | null> {
    return this.store.resolveActiveNeighborById(input.tenantId, input.neighborId);
  }

  async createNeighborFromInbound(
    input: ConnectShyftCreateInboundNeighborCommand,
  ): Promise<ConnectShyftCreateNeighborResult> {
    const normalizedPhones = normalizePhones([
      {
        label: 'mobile',
        value: input.phone,
      },
    ]);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    const duplicateRefusal = await this.validateDuplicatePhones(input.tenantId, normalizedPhones.phones);
    if (duplicateRefusal) {
      return duplicateRefusal;
    }

    try {
      const persisted = await this.store.createNeighbor({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        firstName: '',
        lastName: '',
        prefersTexting: 'UNKNOWN',
        phones: normalizedPhones.phones,
      });

      if (!persisted.ok) {
        if (persisted.reason === 'DUPLICATE_PHONE') {
          return buildDuplicatePhoneRefusal();
        }

        return buildNeighborIdConflictRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: persisted.neighbor,
        },
      };
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return buildDuplicatePhoneRefusal();
      }

      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildCreatePersistenceUnavailableRefusal();
    }
  }

  async applyInboundSmsTextingPreference(
    input: ConnectShyftApplyInboundSmsTextingPreferenceCommand,
  ): Promise<{
    ok: true;
    updated: boolean;
    neighbor: ConnectShyftNeighbor;
  } | NeighborRefusalResult> {
    try {
      const promoted = await this.store.promoteUnknownTextingPreference(input.tenantId, input.neighborId);
      if (!promoted.neighbor) {
        return buildNeighborNotFoundRefusal();
      }

      return {
        ok: true,
        updated: promoted.status === 'updated',
        neighbor: promoted.neighbor,
      };
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return buildDuplicatePhoneRefusal();
      }

      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async listNeighbors(input: ConnectShyftListNeighborsCommand): Promise<ConnectShyftListNeighborsResult> {
    if (!hasNeighborReadCapability(input.actorRoles)) {
      return buildReadCapabilityRefusal();
    }

    try {
      const neighbors = await this.store.listByTenant(input.tenantId);
      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED',
        httpStatus: 200,
        data: {
          neighbors: sortNeighbors(neighbors),
        },
      };
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return buildDuplicatePhoneRefusal();
      }

      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async softDeleteNeighbor(
    input: ConnectShyftSoftDeleteNeighborCommand,
  ): Promise<ConnectShyftSoftDeleteNeighborResult> {
    if (!hasTenantPrivilegedNeighborCapability(input.actorRoles)) {
      return buildDeleteCapabilityRefusal();
    }
    if (input.irreversibleConfirmation !== true) {
      return buildDeleteConfirmationRequiredRefusal();
    }

    try {
      const deleted = await this.store.softDeleteNeighbor({
        tenantId: input.tenantId,
        neighborId: input.neighborId,
        actorUserId: input.actorUserId,
      });

      if (!deleted.ok) {
        return buildNeighborNotFoundRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
        httpStatus: 200,
        data: {
          neighbor: deleted.neighbor,
          alreadyDeleted: deleted.alreadyDeleted,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async updateNeighbor(input: ConnectShyftUpdateNeighborCommand): Promise<ConnectShyftUpdateNeighborResult> {
    if (!hasNeighborManageCapability(input.actorRoles)) {
      return buildUpdateCapabilityRefusal();
    }
    if (!hasTenantPrivilegedNeighborCapability(input.actorRoles) && input.relationshipValidated !== true) {
      return buildRelationshipRequiredRefusal();
    }

    const normalizedPhones = normalizePhones(input.phones);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    const duplicateRefusal = await this.validateDuplicatePhones(
      input.tenantId,
      normalizedPhones.phones,
      input.neighborId,
    );
    if (duplicateRefusal) {
      return duplicateRefusal;
    }

    try {
      const updated = await this.store.updateNeighbor({
        tenantId: input.tenantId,
        neighborId: input.neighborId,
        firstName: normalizeNonEmptyString(input.firstName),
        lastName: normalizeNonEmptyString(input.lastName),
        prefersTexting: input.prefersTexting,
        phones: normalizedPhones.phones,
      });

      if (!updated.ok) {
        if (updated.reason === 'DUPLICATE_PHONE') {
          return buildDuplicatePhoneRefusal();
        }

        return buildNeighborNotFoundRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
        httpStatus: 200,
        data: {
          neighbor: updated.neighbor,
        },
      };
    } catch (error) {
      if (isDuplicatePhoneConstraintViolation(error)) {
        return buildDuplicatePhoneRefusal();
      }

      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async evaluateIdentityMatch(input: ConnectShyftIdentityMatchCommand): Promise<ConnectShyftIdentityMatchResult> {
    try {
      return await this.identityBoundary.evaluateMatch(input);
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildIdentityPersistenceUnavailableRefusal();
    }
  }

  async mergeNeighbor(input: ConnectShyftMergeNeighborCommand): Promise<ConnectShyftMergeNeighborResult> {
    if (!hasNeighborMergeCapability(input.actorRoles)) {
      return buildMergeCapabilityRefusal();
    }
    if (!hasValidMergeConfirmation(input.irreversibleConfirmation)) {
      return buildMergeConfirmationRequiredRefusal();
    }
    if (
      normalizeNonEmptyString(input.sourceNeighborId) === ''
      || normalizeNonEmptyString(input.survivorNeighborId) === ''
      || input.sourceNeighborId === input.survivorNeighborId
    ) {
      return buildMergeInvalidRefusal();
    }

    try {
      const merged = await this.store.mergeNeighbors({
        tenantId: input.tenantId,
        sourceNeighborId: input.sourceNeighborId,
        survivorNeighborId: input.survivorNeighborId,
      });

      if (!merged.ok) {
        if (merged.reason === 'MERGE_INVALID') {
          return buildMergeInvalidRefusal();
        }
        return buildNeighborNotFoundRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
        httpStatus: 200,
        data: {
          neighbor: merged.neighbor,
          merge: merged.merge,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }
}

export const connectShyftNeighborServiceAsync = new AsyncConnectShyftNeighborService();

export const resolveActiveNeighborForInbound = (
  input: ConnectShyftApplyInboundSmsTextingPreferenceCommand,
): Promise<ConnectShyftNeighbor | null> =>
  connectShyftNeighborServiceAsync.resolveActiveNeighbor(input);

export const createNeighborFromInbound = async (input: ConnectShyftCreateInboundNeighborCommand & {
  correlationId: string;
  providerName?: string | null;
  providerReferenceId?: string | null;
  requestFingerprint?: string | null;
}): Promise<ConnectShyftCreateNeighborResult> => {
  const created = await connectShyftNeighborServiceAsync.createNeighborFromInbound(input);
  if (!created.ok) {
    return created;
  }

  await appendConnectShyftCommunicationAuditEntry({
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    actorType: 'system',
    actorId: null,
    operationName: CONNECTSHYFT_INBOUND_NEIGHBOR_AUDIT_OPERATION_NAME,
    targetEntityType: 'neighbor',
    targetEntityId: created.data.neighbor.neighborId,
    channel: 'sms',
    resultState: 'succeeded',
    resultCode: created.code,
    resultMessage: 'Created inbound SMS neighbor from unmatched sender phone.',
    requestFingerprint: input.requestFingerprint ?? null,
    providerName: input.providerName ?? null,
    providerReferenceId: input.providerReferenceId ?? null,
    metadataJson: JSON.stringify({
      orgUnitId: input.orgUnitId,
      phone: created.data.neighbor.phones[0]?.value || input.phone,
      prefersTexting: created.data.neighbor.prefersTexting,
    }),
  });

  return created;
};

export const applyInboundSmsTextingPreference = (
  input: ConnectShyftApplyInboundSmsTextingPreferenceCommand,
): Promise<{
  ok: true;
  updated: boolean;
  neighbor: ConnectShyftNeighbor;
} | NeighborRefusalResult> =>
  connectShyftNeighborServiceAsync.applyInboundSmsTextingPreference(input);
