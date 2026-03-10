import { randomUUID } from 'node:crypto';
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

type QueryBuilderLike = {
  withSchema(schema: string): QueryBuilderLike;
  table(tableName: string): QueryBuilderLike;
  where(condition: Record<string, unknown>): QueryBuilderLike;
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

const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;
const REMOVABLE_PHONE_CHARS_PATTERN = /[\s().-]/g;
const INVALID_PHONE_CHAR_PATTERN = /[A-Za-z]/;
export const CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_PHRASE = 'IRREVERSIBLE MERGE';

export type ConnectShyftNeighborPhoneInput = {
  label: string;
  value: string;
  isShared?: boolean;
  verificationStatus?: 'verified' | 'unverified';
};

type NormalizedConnectShyftNeighborPhoneInput = {
  label: string;
  value: string;
  sortOrder: number;
  isPrimary: boolean;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
};

export type ConnectShyftNeighborPhone = {
  phoneId: string;
  label: string;
  value: string;
  sortOrder: number;
  isPrimary: boolean;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ConnectShyftNeighbor = {
  neighborId: string;
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  prefersTexting: 'UNKNOWN' | 'YES' | 'NO';
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
  phones: ConnectShyftNeighborPhoneInput[];
  neighborId?: string;
};

export type ConnectShyftResolveNeighborCommand = NeighborActorContext & {
  tenantId: string;
  neighborId: string;
};

export type ConnectShyftListNeighborsCommand = NeighborActorContext & {
  tenantId: string;
};

export type ConnectShyftUpdateNeighborCommand = NeighborActorContext & {
  tenantId: string;
  neighborId: string;
  firstName: string;
  lastName: string;
  phones: ConnectShyftNeighborPhoneInput[];
  relationshipValidated?: boolean;
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

export type {
  ConnectShyftIdentityMatchDecision,
  ConnectShyftIdentityManualResolutionContext,
  ConnectShyftIdentityMatchResult,
};

type NeighborFieldError = {
  field: 'phones';
  reason: 'REQUIRED' | 'INVALID_FORMAT';
  message: string;
};

type NeighborRefusalData = {
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
    reason: 'NEIGHBOR_ID_CONFLICT' | 'NEIGHBOR_NOT_FOUND';
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

type NeighborRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_UPDATE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT'
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

const normalizePhoneValue = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (INVALID_PHONE_CHAR_PATTERN.test(trimmed)) {
    return null;
  }

  const compact = trimmed.replace(REMOVABLE_PHONE_CHARS_PATTERN, '');
  if (!/^\+?\d+$/.test(compact)) {
    return null;
  }

  const normalized = compact.startsWith('+') ? compact : `+${compact}`;
  if (!E164_PHONE_PATTERN.test(normalized)) {
    return null;
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
  message: 'Provide a valid phone value (for example, +12605550199).',
  data: {
    fieldErrors: [
      {
        field: 'phones',
        reason: 'INVALID_FORMAT',
        message: 'Provide a valid phone value (for example, +12605550199).',
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

  const normalizedPhones: NormalizedConnectShyftNeighborPhoneInput[] = [];
  for (let index = 0; index < phones.length; index += 1) {
    const phone = phones[index];
    const normalizedValue = normalizePhoneValue(normalizeNonEmptyString(phone?.value));

    if (!normalizedValue) {
      return buildPhoneInvalidFormatRefusal();
    }

    normalizedPhones.push({
      label: normalizePhoneLabel(phone?.label),
      value: normalizedValue,
      sortOrder: index,
      isPrimary: index === 0,
      isShared: phone?.isShared === true,
      verificationStatus: normalizeVerificationStatus(phone?.verificationStatus),
    });
  }

  return {
    ok: true,
    phones: normalizedPhones,
  };
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
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbNeighborPhoneRow = {
  id: string;
  neighbor_id: string;
  tenant_id: string;
  label: string;
  value_e164: string;
  sort_order: number;
  is_primary: boolean;
  is_shared?: boolean | null;
  verification_status?: string | null;
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

const normalizeTextingPreference = (value: unknown): 'UNKNOWN' | 'YES' | 'NO' => {
  if (value === 'YES' || value === 'NO' || value === 'UNKNOWN') {
    return value;
  }

  return 'UNKNOWN';
};

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
    const value = normalizeNonEmptyString(phone.value_e164);
    if (!value) {
      return;
    }

    const dedupeKey = `${label.toLowerCase()}::${value}`;
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);

    merged.push({
      label,
      value,
      sortOrder: merged.length,
      isPrimary: merged.length === 0,
      isShared: phone.is_shared === true,
      verificationStatus: normalizeVerificationStatus(phone.verification_status),
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
  phones: sortPhones(phoneRows).map((phoneRow) => ({
    phoneId: phoneRow.id,
    label: phoneRow.label,
    value: phoneRow.value_e164,
    sortOrder: phoneRow.sort_order,
    isPrimary: phoneRow.is_primary,
    isShared: phoneRow.is_shared === true,
    verificationStatus: normalizeVerificationStatus(phoneRow.verification_status),
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
  phones: NormalizedConnectShyftNeighborPhoneInput[];
  neighborId?: string;
};

type NeighborStoreUpdateInput = {
  tenantId: string;
  neighborId: string;
  firstName: string;
  lastName: string;
  phones: NormalizedConnectShyftNeighborPhoneInput[];
};

type NeighborStoreMergeInput = {
  tenantId: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
};

export class InMemoryConnectShyftNeighborStore {
  private neighborsById = new Map<string, ConnectShyftNeighbor>();

  private neighborIdsByScope = new Map<string, Set<string>>();

  private neighborIdsByTenant = new Map<string, Set<string>>();

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
      prefersTexting: 'UNKNOWN',
      phones: input.phones.map((phone) => ({
        phoneId: randomUUID(),
        label: phone.label,
        value: phone.value,
        sortOrder: phone.sortOrder,
        isPrimary: phone.isPrimary,
        isShared: phone.isShared,
        verificationStatus: phone.verificationStatus,
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
      updatedAtUtc: now,
      phones: input.phones.map((phone) => ({
        phoneId: randomUUID(),
        label: phone.label,
        value: phone.value,
        sortOrder: phone.sortOrder,
        isPrimary: phone.isPrimary,
        isShared: phone.isShared,
        verificationStatus: phone.verificationStatus,
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
        sort_order: phone.sortOrder,
        is_primary: phone.isPrimary,
        is_shared: phone.isShared,
        verification_status: phone.verificationStatus,
        created_at_utc: phone.createdAtUtc,
        updated_at_utc: phone.updatedAtUtc,
      })),
      sourceNeighbor.phones.map((phone) => ({
        id: phone.phoneId,
        neighbor_id: sourceNeighbor.neighborId,
        tenant_id: sourceNeighbor.tenantId,
        label: phone.label,
        value_e164: phone.value,
        sort_order: phone.sortOrder,
        is_primary: phone.isPrimary,
        is_shared: phone.isShared,
        verification_status: phone.verificationStatus,
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
        sortOrder: phone.sortOrder,
        isPrimary: phone.isPrimary,
        isShared: phone.isShared,
        verificationStatus: phone.verificationStatus,
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

  listByTenant(tenantId: string): ConnectShyftNeighbor[] {
    const tenantIds = this.neighborIdsByTenant.get(tenantId);
    if (!tenantIds || tenantIds.size === 0) {
      return [];
    }

    const neighbors = Array.from(tenantIds)
      .map((neighborId) => this.neighborsById.get(neighborId))
      .filter((neighbor): neighbor is ConnectShyftNeighbor => !!neighbor)
      .map(cloneNeighbor);

    return sortNeighbors(neighbors);
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
      if (!neighbor || neighbor.tenantId !== tenantId) {
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

  listByOrgUnit(tenantId: string, orgUnitId: string): ConnectShyftNeighbor[] {
    const scopeKey = buildTenantOrgUnitKey(tenantId, orgUnitId);
    const scopedIds = this.neighborIdsByScope.get(scopeKey);
    if (!scopedIds || scopedIds.size === 0) {
      return [];
    }

    const neighbors = Array.from(scopedIds)
      .map((neighborId) => this.neighborsById.get(neighborId))
      .filter((neighbor): neighbor is ConnectShyftNeighbor => !!neighbor)
      .map(cloneNeighbor);

    return sortNeighbors(neighbors);
  }
}

export class KnexConnectShyftNeighborStore {
  constructor(private readonly knexClient: KnexLike = db as unknown as KnexLike) {}

  private neighborPhoneColumns(): string[] {
    return [
      'id',
      'neighbor_id',
      'tenant_id',
      'label',
      'value_e164',
      'sort_order',
      'is_primary',
      'is_shared',
      'verification_status',
      'created_at_utc',
      'updated_at_utc',
    ];
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
            prefers_texting: 'UNKNOWN',
            created_at_utc: trx.fn.now(),
            updated_at_utc: trx.fn.now(),
          })
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
            reason: 'NEIGHBOR_ID_CONFLICT',
          } as NeighborPersistenceResult;
        }

        const phoneRows = input.phones.map((phone) => ({
          id: randomUUID(),
          neighbor_id: neighborId,
          tenant_id: input.tenantId,
          label: phone.label,
          value_e164: phone.value,
          sort_order: phone.sortOrder,
          is_primary: phone.isPrimary,
          is_shared: phone.isShared,
          verification_status: phone.verificationStatus,
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
      .first<DbNeighborRow>([
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

  async listByTenant(tenantId: string): Promise<ConnectShyftNeighbor[]> {
    const neighborRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        tenant_id: tenantId,
      })
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')
      .orderBy('id', 'asc')
      .select<DbNeighborRow[]>([
        'id',
        'tenant_id',
        'org_unit_id',
        'first_name',
        'last_name',
        'prefers_texting',
        'created_at_utc',
        'updated_at_utc',
      ]);

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

  async listIdentityBoundaryNeighborsByPhoneValue(
    tenantId: string,
    phoneValue: string,
  ): Promise<ConnectShyftIdentityBoundaryNeighbor[]> {
    const phoneRows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbor_phones')
      .where({
        tenant_id: tenantId,
        value_e164: phoneValue,
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
        value: row.value_e164,
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

  async updateNeighbor(input: NeighborStoreUpdateInput): Promise<NeighborPersistenceResult> {
    try {
      return await this.knexClient.transaction(async (trx) => {
        const [neighborRow] = await trx
          .withSchema('connectshyft')
          .table('cs_neighbors')
          .where({
            tenant_id: input.tenantId,
            id: input.neighborId,
          })
          .update({
            first_name: input.firstName,
            last_name: input.lastName,
            updated_at_utc: trx.fn.now(),
          })
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
          sort_order: phone.sortOrder,
          is_primary: phone.isPrimary,
          is_shared: phone.isShared,
          verification_status: phone.verificationStatus,
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
              sort_order: phone.sortOrder,
              is_primary: phone.isPrimary,
              is_shared: phone.isShared,
              verification_status: phone.verificationStatus,
              created_at_utc: trx.fn.now(),
              updated_at_utc: trx.fn.now(),
            })),
          )
          .returning<DbNeighborPhoneRow[]>(this.neighborPhoneColumns())
        : [];

      await trx
        .withSchema('connectshyft')
        .table('cs_neighbor_phones')
        .where({
          tenant_id: input.tenantId,
          neighbor_id: input.sourceNeighborId,
        })
        .delete();

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
        .returning<DbNeighborRow[]>([
          'id',
          'tenant_id',
          'org_unit_id',
          'first_name',
          'last_name',
          'created_at_utc',
          'updated_at_utc',
        ]);

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
    this.identityBoundary = identityBoundary
      || new InProcessConnectShyftIdentityBoundaryAdapter(
        (tenantId) => this.store.listByTenant(tenantId),
        (tenantId, normalizedContactPointValue) =>
          this.store.listIdentityBoundaryNeighborsByPhoneValue(
            tenantId,
            normalizedContactPointValue,
          ),
      );
  }

  createNeighbor(input: ConnectShyftCreateNeighborCommand): ConnectShyftCreateNeighborResult {
    if (!hasNeighborManageCapability(input.actorRoles)) {
      return buildCreateCapabilityRefusal();
    }

    const normalizedPhones = normalizePhones(input.phones);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    const persisted = this.store.createNeighbor({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      firstName: normalizeNonEmptyString(input.firstName),
      lastName: normalizeNonEmptyString(input.lastName),
      phones: normalizedPhones.phones,
      neighborId: input.neighborId,
    });

    if (!persisted.ok) {
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

    const neighbor = this.store.resolveNeighborById(input.tenantId, input.neighborId);
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

    const updated = this.store.updateNeighbor({
      tenantId: input.tenantId,
      neighborId: input.neighborId,
      firstName: normalizeNonEmptyString(input.firstName),
      lastName: normalizeNonEmptyString(input.lastName),
      phones: normalizedPhones.phones,
    });

    if (!updated.ok) {
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
    this.identityBoundary = identityBoundary
      || new AsyncInProcessConnectShyftIdentityBoundaryAdapter(
        async (tenantId) => this.store.listByTenant(tenantId),
        async (tenantId, normalizedContactPointValue) =>
          this.store.listIdentityBoundaryNeighborsByPhoneValue(
            tenantId,
            normalizedContactPointValue,
          ),
      );
  }

  async createNeighbor(input: ConnectShyftCreateNeighborCommand): Promise<ConnectShyftCreateNeighborResult> {
    if (!hasNeighborManageCapability(input.actorRoles)) {
      return buildCreateCapabilityRefusal();
    }

    const normalizedPhones = normalizePhones(input.phones);
    if (!normalizedPhones.ok) {
      return normalizedPhones;
    }

    try {
      const persisted = await this.store.createNeighbor({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        firstName: normalizeNonEmptyString(input.firstName),
        lastName: normalizeNonEmptyString(input.lastName),
        phones: normalizedPhones.phones,
        neighborId: input.neighborId,
      });

      if (!persisted.ok) {
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
      const neighbor = await this.store.resolveNeighborById(input.tenantId, input.neighborId);
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

    try {
      const updated = await this.store.updateNeighbor({
        tenantId: input.tenantId,
        neighborId: input.neighborId,
        firstName: normalizeNonEmptyString(input.firstName),
        lastName: normalizeNonEmptyString(input.lastName),
        phones: normalizedPhones.phones,
      });

      if (!updated.ok) {
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
