import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import { CAPABILITIES, hasCapability } from '../../platform/rbac/capabilities';
import db from '../../config/knex';

const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;
const REMOVABLE_PHONE_CHARS_PATTERN = /[\s().-]/g;
const INVALID_PHONE_CHAR_PATTERN = /[A-Za-z]/;

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
};

type NeighborFieldError = {
  field: 'phones';
  reason: 'REQUIRED' | 'INVALID_FORMAT';
  message: string;
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

type NeighborRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_UPDATE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT'
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT'
    | 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND'
    | 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH'
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE'
    | 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE';
  message: string;
  data?: {
    fieldErrors?: NeighborFieldError[];
  };
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

const buildTenantMismatchRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
  message: 'orgUnit context does not belong to the active tenant',
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
    || hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_EDIT_ALL);
};

const hasNeighborReadCapability = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasNeighborManageCapability(actorRoles)
    || hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_VIEW)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_VIEW_ALL)
    || hasCapability(actorRoles, CAPABILITIES.TENANT_READ_ALL);
};

type DbNeighborRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  first_name: string;
  last_name: string;
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

const resolvePersistenceErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const candidate = error as { code?: string };
  return typeof candidate.code === 'string' ? candidate.code : null;
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

  resolveNeighborById(tenantId: string, neighborId: string): ConnectShyftNeighbor | null {
    const neighbor = this.neighborsById.get(neighborId);
    if (!neighbor || neighbor.tenantId !== tenantId) {
      return null;
    }

    return cloneNeighbor(neighbor);
  }

  findNeighborTenantById(neighborId: string): string | null {
    const neighbor = this.neighborsById.get(neighborId);
    if (!neighbor) {
      return null;
    }

    return neighbor.tenantId;
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
  constructor(private readonly knexClient: Knex = db) {}

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
            created_at_utc: trx.fn.now(),
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

  async findNeighborTenantById(neighborId: string): Promise<string | null> {
    const row = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_neighbors')
      .where({
        id: neighborId,
      })
      .first<{ tenant_id: string }>(['tenant_id']);

    return row?.tenant_id || null;
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
}

export class ConnectShyftNeighborService {
  constructor(
    private readonly store: InMemoryConnectShyftNeighborStore = defaultNeighborStore,
  ) {}

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
      const existingTenantId = this.store.findNeighborTenantById(input.neighborId);
      if (existingTenantId && existingTenantId !== input.tenantId) {
        return buildTenantMismatchRefusal();
      }

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
      const existingTenantId = this.store.findNeighborTenantById(input.neighborId);
      if (existingTenantId && existingTenantId !== input.tenantId) {
        return buildTenantMismatchRefusal();
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
}

const defaultNeighborStore = new InMemoryConnectShyftNeighborStore();
const defaultKnexNeighborStore = new KnexConnectShyftNeighborStore();

export const connectShyftNeighborService = new ConnectShyftNeighborService(defaultNeighborStore);

export class AsyncConnectShyftNeighborService {
  constructor(
    private readonly store: KnexConnectShyftNeighborStore = defaultKnexNeighborStore,
    private readonly fallbackService: ConnectShyftNeighborService = connectShyftNeighborService,
  ) {}

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

      const code = resolvePersistenceErrorCode(error);
      if (code === '42P01' || code === '3F000') {
        return buildCreatePersistenceUnavailableRefusal();
      }

      const fallback = this.fallbackService.createNeighbor(input);
      if (fallback.ok) {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT') {
        return fallback;
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
        const existingTenantId = await this.store.findNeighborTenantById(input.neighborId);
        if (existingTenantId && existingTenantId !== input.tenantId) {
          return buildTenantMismatchRefusal();
        }

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

      const fallback = this.fallbackService.resolveNeighbor(input);
      if (fallback.ok) {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH') {
        return fallback;
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

      const fallback = this.fallbackService.listNeighbors(input);
      if (fallback.ok) {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN') {
        return fallback;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async updateNeighbor(input: ConnectShyftUpdateNeighborCommand): Promise<ConnectShyftUpdateNeighborResult> {
    if (!hasNeighborManageCapability(input.actorRoles)) {
      return buildUpdateCapabilityRefusal();
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
        const existingTenantId = await this.store.findNeighborTenantById(input.neighborId);
        if (existingTenantId && existingTenantId !== input.tenantId) {
          return buildTenantMismatchRefusal();
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
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      const fallback = this.fallbackService.updateNeighbor(input);
      if (fallback.ok) {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_UPDATE_FORBIDDEN') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND') {
        return fallback;
      }

      if (fallback.code === 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH') {
        return fallback;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }
}

export const connectShyftNeighborServiceAsync = new AsyncConnectShyftNeighborService();
