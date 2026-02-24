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
};

type NormalizedConnectShyftNeighborPhoneInput = {
  label: string;
  value: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type ConnectShyftNeighborPhone = {
  phoneId: string;
  label: string;
  value: string;
  sortOrder: number;
  isPrimary: boolean;
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
    reason: 'NEIGHBOR_ID_CONFLICT';
  };

type NeighborRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED'
    | 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT'
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT'
    | 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE';
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

const buildPhoneRequiredRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
  message: 'Provide at least one phone to create a neighbor.',
  data: {
    fieldErrors: [
      {
        field: 'phones',
        reason: 'REQUIRED',
        message: 'Provide at least one phone to create a neighbor.',
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

const buildCapabilityRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN',
  message: 'Neighbor creation requires an authorized ConnectShyft role.',
});

const buildNeighborIdConflictRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT',
  message: 'Unable to create neighbor right now. Please retry.',
});

const buildPersistenceUnavailableRefusal = (): NeighborRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE',
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
    });
  }

  return {
    ok: true,
    phones: normalizedPhones,
  };
};

const hasNeighborCreateCapability = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED)
    || hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_EDIT_ALL);
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

const mapRowsToNeighbor = (
  neighborRow: DbNeighborRow,
  phoneRows: DbNeighborPhoneRow[],
): ConnectShyftNeighbor => ({
  neighborId: neighborRow.id,
  tenantId: neighborRow.tenant_id,
  orgUnitId: neighborRow.org_unit_id,
  firstName: neighborRow.first_name,
  lastName: neighborRow.last_name,
  phones: phoneRows
    .slice()
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.id.localeCompare(b.id);
    })
    .map((phoneRow) => ({
      phoneId: phoneRow.id,
      label: phoneRow.label,
      value: phoneRow.value_e164,
      sortOrder: phoneRow.sort_order,
      isPrimary: phoneRow.is_primary,
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
  return candidate.code === '42P01' || candidate.code === '3F000';
};

export class InMemoryConnectShyftNeighborStore {
  private neighborsById = new Map<string, ConnectShyftNeighbor>();

  private neighborIdsByScope = new Map<string, Set<string>>();

  createNeighbor(input: {
    tenantId: string;
    orgUnitId: string;
    firstName: string;
    lastName: string;
    phones: NormalizedConnectShyftNeighborPhoneInput[];
    neighborId?: string;
  }): NeighborPersistenceResult {
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

    return {
      ok: true,
      neighbor,
    };
  }

  listByOrgUnit(tenantId: string, orgUnitId: string): ConnectShyftNeighbor[] {
    const scopeKey = buildTenantOrgUnitKey(tenantId, orgUnitId);
    const scopedIds = this.neighborIdsByScope.get(scopeKey);
    if (!scopedIds || scopedIds.size === 0) {
      return [];
    }

    return Array.from(scopedIds)
      .map((neighborId) => this.neighborsById.get(neighborId))
      .filter((neighbor): neighbor is ConnectShyftNeighbor => !!neighbor)
      .sort((a, b) => {
        if (a.createdAtUtc < b.createdAtUtc) {
          return -1;
        }
        if (a.createdAtUtc > b.createdAtUtc) {
          return 1;
        }
        return a.neighborId.localeCompare(b.neighborId);
      });
  }
}

export class KnexConnectShyftNeighborStore {
  constructor(private readonly knexClient: Knex = db) {}

  async createNeighbor(input: {
    tenantId: string;
    orgUnitId: string;
    firstName: string;
    lastName: string;
    phones: NormalizedConnectShyftNeighborPhoneInput[];
    neighborId?: string;
  }): Promise<NeighborPersistenceResult> {
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
          created_at_utc: trx.fn.now(),
          updated_at_utc: trx.fn.now(),
        }));

        const insertedPhones = await trx
          .withSchema('connectshyft')
          .table('cs_neighbor_phones')
          .insert(phoneRows)
          .returning<DbNeighborPhoneRow[]>([
            'id',
            'neighbor_id',
            'tenant_id',
            'label',
            'value_e164',
            'sort_order',
            'is_primary',
            'created_at_utc',
            'updated_at_utc',
          ]);

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
}

export class ConnectShyftNeighborService {
  constructor(
    private readonly store: InMemoryConnectShyftNeighborStore = defaultNeighborStore,
  ) {}

  createNeighbor(input: ConnectShyftCreateNeighborCommand): ConnectShyftCreateNeighborResult {
    if (!hasNeighborCreateCapability(input.actorRoles)) {
      return buildCapabilityRefusal();
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
}

const defaultNeighborStore = new InMemoryConnectShyftNeighborStore();
const defaultKnexNeighborStore = new KnexConnectShyftNeighborStore();

export const connectShyftNeighborService = new ConnectShyftNeighborService(defaultNeighborStore);

export class AsyncConnectShyftNeighborService {
  constructor(
    private readonly store: KnexConnectShyftNeighborStore = defaultKnexNeighborStore,
  ) {}

  async createNeighbor(input: ConnectShyftCreateNeighborCommand): Promise<ConnectShyftCreateNeighborResult> {
    if (!hasNeighborCreateCapability(input.actorRoles)) {
      return buildCapabilityRefusal();
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

      return buildPersistenceUnavailableRefusal();
    }
  }
}

export const connectShyftNeighborServiceAsync = new AsyncConnectShyftNeighborService();
