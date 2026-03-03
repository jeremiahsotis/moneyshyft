import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import { CAPABILITIES, hasCapability } from '../../platform/rbac/capabilities';
import db from '../../config/knex';

const TWILIO_E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export type ConnectShyftNumberMapping = {
  mappingId: string;
  tenantId: string;
  orgUnitId: string;
  twilioNumberE164: string;
  label: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type NumberMappingCreateInput = {
  tenantId: string;
  orgUnitId: string;
  twilioNumberE164: string;
  label: string;
  isActive: boolean;
  mappingId?: string;
};

type NumberMappingUpdateInput = {
  tenantId: string;
  orgUnitId: string;
  mappingId: string;
  twilioNumberE164: string;
  label: string;
  isActive: boolean;
};

type NumberMappingActorContext = {
  actorRoles: Array<string | null | undefined>;
};

export type NumberMappingCreateCommand = NumberMappingCreateInput & NumberMappingActorContext;
export type NumberMappingUpdateCommand = NumberMappingUpdateInput & NumberMappingActorContext;

type NumberMappingPersistenceResult =
  | {
    ok: true;
    mapping: ConnectShyftNumberMapping;
  }
  | {
    ok: false;
    reason: 'DUPLICATE_TENANT_NUMBER' | 'MAPPING_ID_CONFLICT' | 'NOT_FOUND';
  };

export type NumberMappingFieldError = {
  field: 'twilioNumberE164';
  reason: 'INVALID_E164' | 'DUPLICATE_TENANT_NUMBER';
  message: string;
};

type NumberMappingRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN'
    | 'CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164'
    | 'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE'
    | 'CONNECTSHYFT_NUMBER_MAPPING_ID_CONFLICT'
    | 'CONNECTSHYFT_NUMBER_MAPPING_NOT_FOUND'
    | 'CONNECTSHYFT_NUMBER_MAPPING_SCOPE_VIOLATION';
  message: string;
  data?: {
    fieldErrors?: NumberMappingFieldError[];
  };
};

export type NumberMappingSaveResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED' | 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED';
    httpStatus: 200 | 201;
    data: {
      mappingId: string;
      orgUnitId: string;
      twilioNumberE164: string;
      label: string;
      isActive: boolean;
      mappings: ConnectShyftNumberMapping[];
    };
  }
  | NumberMappingRefusalResult;

const normalizeTwilioNumber = (value: string): string => value.trim();

const normalizeLabel = (value: string): string => value.trim();

const buildTenantNumberKey = (tenantId: string, twilioNumberE164: string): string =>
  `${tenantId}::${twilioNumberE164}`;

const buildTenantOrgUnitKey = (tenantId: string, orgUnitId: string): string =>
  `${tenantId}::${orgUnitId}`;

const nowIsoUtc = (): string => new Date().toISOString();

export const isValidTwilioE164 = (value: string): boolean =>
  TWILIO_E164_PATTERN.test(normalizeTwilioNumber(value));

const buildInvalidE164Refusal = (): NumberMappingRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164',
  message: 'Use a valid Twilio E.164 number (for example, +12605550111).',
  data: {
    fieldErrors: [
      {
        field: 'twilioNumberE164',
        reason: 'INVALID_E164',
        message: 'Use a valid Twilio E.164 number (for example, +12605550111).',
      },
    ],
  },
});

const buildDuplicateRefusal = (): NumberMappingRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE',
  message: 'This Twilio number is already mapped in this tenant.',
  data: {
    fieldErrors: [
      {
        field: 'twilioNumberE164',
        reason: 'DUPLICATE_TENANT_NUMBER',
        message: 'This Twilio number is already mapped in this tenant.',
      },
    ],
  },
});

const buildMappingIdConflictRefusal = (): NumberMappingRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NUMBER_MAPPING_ID_CONFLICT',
  message: 'Unable to save number mapping right now. Please retry.',
});

const buildNotFoundRefusal = (): NumberMappingRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NUMBER_MAPPING_NOT_FOUND',
  message: 'Number mapping not found for this tenant and orgUnit.',
});

const buildCapabilityRefusal = (): NumberMappingRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
  message: 'Number mapping management requires an authorized ConnectShyft role.',
});

type DbNumberMappingRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  twilio_number_e164: string;
  label: string;
  is_active: boolean;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const record = error as { code?: string };
  return record.code === '42P01' || record.code === '3F000';
};

const mapDbRowToMapping = (row: DbNumberMappingRow): ConnectShyftNumberMapping => ({
  mappingId: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  twilioNumberE164: row.twilio_number_e164,
  label: row.label,
  isActive: row.is_active,
  createdAtUtc: row.created_at_utc instanceof Date ? row.created_at_utc.toISOString() : String(row.created_at_utc),
  updatedAtUtc: row.updated_at_utc instanceof Date ? row.updated_at_utc.toISOString() : String(row.updated_at_utc),
});

export class InMemoryConnectShyftNumberMappingStore {
  private mappingsById = new Map<string, ConnectShyftNumberMapping>();

  private mappingIdsByTenantOrgUnit = new Map<string, Set<string>>();

  private mappingIdByTenantNumber = new Map<string, string>();

  listByOrgUnit(tenantId: string, orgUnitId: string): ConnectShyftNumberMapping[] {
    const tenantOrgUnitKey = buildTenantOrgUnitKey(tenantId, orgUnitId);
    const mappingIds = this.mappingIdsByTenantOrgUnit.get(tenantOrgUnitKey);
    if (!mappingIds || mappingIds.size === 0) {
      return [];
    }

    return Array.from(mappingIds)
      .map((mappingId) => this.mappingsById.get(mappingId))
      .filter((mapping): mapping is ConnectShyftNumberMapping => !!mapping)
      .sort((a, b) => {
        if (a.twilioNumberE164 < b.twilioNumberE164) {
          return -1;
        }
        if (a.twilioNumberE164 > b.twilioNumberE164) {
          return 1;
        }
        return a.mappingId.localeCompare(b.mappingId);
      });
  }

  findById(tenantId: string, mappingId: string): ConnectShyftNumberMapping | null {
    const mapping = this.mappingsById.get(mappingId);
    if (!mapping || mapping.tenantId !== tenantId) {
      return null;
    }
    return mapping;
  }

  findByTenantNumber(tenantId: string, twilioNumberE164: string): ConnectShyftNumberMapping | null {
    const mappingId = this.mappingIdByTenantNumber.get(
      buildTenantNumberKey(tenantId, twilioNumberE164),
    );
    if (!mappingId) {
      return null;
    }

    const mapping = this.mappingsById.get(mappingId);
    return mapping || null;
  }

  createMapping(input: NumberMappingCreateInput): NumberMappingPersistenceResult {
    const mappingId = input.mappingId || randomUUID();
    const now = nowIsoUtc();
    const tenantNumberKey = buildTenantNumberKey(input.tenantId, input.twilioNumberE164);

    if (this.mappingsById.has(mappingId)) {
      return {
        ok: false,
        reason: 'MAPPING_ID_CONFLICT',
      };
    }

    if (this.mappingIdByTenantNumber.has(tenantNumberKey)) {
      return {
        ok: false,
        reason: 'DUPLICATE_TENANT_NUMBER',
      };
    }

    const mapping: ConnectShyftNumberMapping = {
      mappingId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      twilioNumberE164: input.twilioNumberE164,
      label: input.label,
      isActive: input.isActive,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.mappingsById.set(mappingId, mapping);
    this.mappingIdByTenantNumber.set(tenantNumberKey, mappingId);

    const tenantOrgUnitKey = buildTenantOrgUnitKey(input.tenantId, input.orgUnitId);
    const orgUnitMappings = this.mappingIdsByTenantOrgUnit.get(tenantOrgUnitKey) || new Set<string>();
    orgUnitMappings.add(mappingId);
    this.mappingIdsByTenantOrgUnit.set(tenantOrgUnitKey, orgUnitMappings);

    return {
      ok: true,
      mapping,
    };
  }

  updateMapping(input: NumberMappingUpdateInput): NumberMappingPersistenceResult {
    const existing = this.findById(input.tenantId, input.mappingId);
    if (!existing) {
      return {
        ok: false,
        reason: 'NOT_FOUND',
      };
    }

    const existingTenantNumberKey = buildTenantNumberKey(
      existing.tenantId,
      existing.twilioNumberE164,
    );
    const nextTenantNumberKey = buildTenantNumberKey(input.tenantId, input.twilioNumberE164);

    if (existingTenantNumberKey !== nextTenantNumberKey && this.mappingIdByTenantNumber.has(nextTenantNumberKey)) {
      return {
        ok: false,
        reason: 'DUPLICATE_TENANT_NUMBER',
      };
    }

    this.mappingIdByTenantNumber.delete(existingTenantNumberKey);
    this.mappingIdByTenantNumber.set(nextTenantNumberKey, existing.mappingId);

    const updated: ConnectShyftNumberMapping = {
      ...existing,
      twilioNumberE164: input.twilioNumberE164,
      label: input.label,
      isActive: input.isActive,
      updatedAtUtc: nowIsoUtc(),
    };

    this.mappingsById.set(updated.mappingId, updated);

    return {
      ok: true,
      mapping: updated,
    };
  }
}

export class KnexConnectShyftNumberMappingStore {
  constructor(private readonly knexClient: Knex = db) {}

  async listByOrgUnit(tenantId: string, orgUnitId: string): Promise<ConnectShyftNumberMapping[]> {
    const rows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_number_mappings')
      .where({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
      })
      .orderBy('twilio_number_e164', 'asc')
      .orderBy('id', 'asc')
      .select<DbNumberMappingRow[]>([
        'id',
        'tenant_id',
        'org_unit_id',
        'twilio_number_e164',
        'label',
        'is_active',
        'created_at_utc',
        'updated_at_utc',
      ]);

    return rows.map(mapDbRowToMapping);
  }

  async findById(tenantId: string, mappingId: string): Promise<ConnectShyftNumberMapping | null> {
    const row = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_number_mappings')
      .where({
        id: mappingId,
        tenant_id: tenantId,
      })
      .first<DbNumberMappingRow>([
        'id',
        'tenant_id',
        'org_unit_id',
        'twilio_number_e164',
        'label',
        'is_active',
        'created_at_utc',
        'updated_at_utc',
      ]);

    return row ? mapDbRowToMapping(row) : null;
  }

  async findByTenantNumber(tenantId: string, twilioNumberE164: string): Promise<ConnectShyftNumberMapping | null> {
    const row = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_number_mappings')
      .where({
        tenant_id: tenantId,
        twilio_number_e164: twilioNumberE164,
      })
      .first<DbNumberMappingRow>([
        'id',
        'tenant_id',
        'org_unit_id',
        'twilio_number_e164',
        'label',
        'is_active',
        'created_at_utc',
        'updated_at_utc',
      ]);

    return row ? mapDbRowToMapping(row) : null;
  }

  async createMapping(input: NumberMappingCreateInput): Promise<NumberMappingPersistenceResult> {
    const mappingId = input.mappingId || randomUUID();
    try {
      const [row] = await this.knexClient
        .withSchema('connectshyft')
        .table('cs_number_mappings')
        .insert({
          id: mappingId,
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId,
          twilio_number_e164: input.twilioNumberE164,
          label: input.label,
          is_active: input.isActive,
          created_at_utc: this.knexClient.fn.now(),
          updated_at_utc: this.knexClient.fn.now(),
        })
        .returning<DbNumberMappingRow[]>([
          'id',
          'tenant_id',
          'org_unit_id',
          'twilio_number_e164',
          'label',
          'is_active',
          'created_at_utc',
          'updated_at_utc',
        ]);

      if (!row) {
        return { ok: false, reason: 'MAPPING_ID_CONFLICT' };
      }

      return {
        ok: true,
        mapping: mapDbRowToMapping(row),
      };
    } catch (error) {
      if (error && typeof error === 'object') {
        const pg = error as { code?: string; constraint?: string };
        if (pg.code === '23505' && pg.constraint === 'cs_number_mappings_tenant_number_uq') {
          return { ok: false, reason: 'DUPLICATE_TENANT_NUMBER' };
        }
        if (pg.code === '23505') {
          return { ok: false, reason: 'MAPPING_ID_CONFLICT' };
        }
      }
      throw error;
    }
  }

  async updateMapping(input: NumberMappingUpdateInput): Promise<NumberMappingPersistenceResult> {
    const existing = await this.findById(input.tenantId, input.mappingId);
    if (!existing) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    try {
      const [row] = await this.knexClient
        .withSchema('connectshyft')
        .table('cs_number_mappings')
        .where({
          id: input.mappingId,
          tenant_id: input.tenantId,
        })
        .update({
          twilio_number_e164: input.twilioNumberE164,
          label: input.label,
          is_active: input.isActive,
          updated_at_utc: this.knexClient.fn.now(),
        })
        .returning<DbNumberMappingRow[]>([
          'id',
          'tenant_id',
          'org_unit_id',
          'twilio_number_e164',
          'label',
          'is_active',
          'created_at_utc',
          'updated_at_utc',
        ]);

      if (!row) {
        return { ok: false, reason: 'NOT_FOUND' };
      }

      return {
        ok: true,
        mapping: mapDbRowToMapping(row),
      };
    } catch (error) {
      if (error && typeof error === 'object') {
        const pg = error as { code?: string; constraint?: string };
        if (pg.code === '23505' && pg.constraint === 'cs_number_mappings_tenant_number_uq') {
          return { ok: false, reason: 'DUPLICATE_TENANT_NUMBER' };
        }
      }
      throw error;
    }
  }
}

export class ConnectShyftNumberMappingService {
  constructor(
    private readonly store: InMemoryConnectShyftNumberMappingStore = defaultNumberMappingStore,
  ) {}

  listMappings(tenantId: string, orgUnitId: string): ConnectShyftNumberMapping[] {
    return this.store.listByOrgUnit(tenantId, orgUnitId);
  }

  findMappingByTenantNumber(
    tenantId: string,
    twilioNumberE164: string,
  ): ConnectShyftNumberMapping | null {
    const normalizedNumber = normalizeTwilioNumber(twilioNumberE164);
    if (!isValidTwilioE164(normalizedNumber)) {
      return null;
    }
    return this.store.findByTenantNumber(tenantId, normalizedNumber);
  }

  createMapping(input: NumberMappingCreateCommand): NumberMappingSaveResult {
    if (!hasCapability(input.actorRoles, CAPABILITIES.NUMBER_MAPPING_MANAGE)) {
      return buildCapabilityRefusal();
    }

    const twilioNumberE164 = normalizeTwilioNumber(input.twilioNumberE164);
    if (!isValidTwilioE164(twilioNumberE164)) {
      return buildInvalidE164Refusal();
    }

    if (this.store.findByTenantNumber(input.tenantId, twilioNumberE164)) {
      return buildDuplicateRefusal();
    }

    const persisted = this.store.createMapping({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      twilioNumberE164,
      label: normalizeLabel(input.label),
      isActive: input.isActive,
      mappingId: input.mappingId,
    });
    if (!persisted.ok) {
      if (persisted.reason === 'MAPPING_ID_CONFLICT') {
        return buildMappingIdConflictRefusal();
      }
      return buildDuplicateRefusal();
    }

    const mappings = this.store.listByOrgUnit(input.tenantId, input.orgUnitId);

    return {
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
      httpStatus: 201,
      data: {
        mappingId: persisted.mapping.mappingId,
        orgUnitId: persisted.mapping.orgUnitId,
        twilioNumberE164: persisted.mapping.twilioNumberE164,
        label: persisted.mapping.label,
        isActive: persisted.mapping.isActive,
        mappings,
      },
    };
  }

  updateMapping(input: NumberMappingUpdateCommand): NumberMappingSaveResult {
    if (!hasCapability(input.actorRoles, CAPABILITIES.NUMBER_MAPPING_MANAGE)) {
      return buildCapabilityRefusal();
    }

    const twilioNumberE164 = normalizeTwilioNumber(input.twilioNumberE164);
    if (!isValidTwilioE164(twilioNumberE164)) {
      return buildInvalidE164Refusal();
    }

    const existing = this.store.findById(input.tenantId, input.mappingId);
    if (!existing) {
      return buildNotFoundRefusal();
    }

    if (existing.orgUnitId !== input.orgUnitId) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_SCOPE_VIOLATION',
        message: 'Number mapping updates must stay within the active orgUnit scope.',
      };
    }

    const collidingMapping = this.store.findByTenantNumber(input.tenantId, twilioNumberE164);
    if (collidingMapping && collidingMapping.mappingId !== input.mappingId) {
      return buildDuplicateRefusal();
    }

    const persisted = this.store.updateMapping({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      mappingId: input.mappingId,
      twilioNumberE164,
      label: normalizeLabel(input.label),
      isActive: input.isActive,
    });

    if (!persisted.ok) {
      if (persisted.reason === 'NOT_FOUND') {
        return buildNotFoundRefusal();
      }
      if (persisted.reason === 'MAPPING_ID_CONFLICT') {
        return buildMappingIdConflictRefusal();
      }
      return buildDuplicateRefusal();
    }

    const mappings = this.store.listByOrgUnit(input.tenantId, input.orgUnitId);

    return {
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
      httpStatus: 200,
      data: {
        mappingId: persisted.mapping.mappingId,
        orgUnitId: persisted.mapping.orgUnitId,
        twilioNumberE164: persisted.mapping.twilioNumberE164,
        label: persisted.mapping.label,
        isActive: persisted.mapping.isActive,
        mappings,
      },
    };
  }
}

const defaultNumberMappingStore = new InMemoryConnectShyftNumberMappingStore();
const defaultKnexNumberMappingStore = new KnexConnectShyftNumberMappingStore();

export const connectShyftNumberMappingService = new ConnectShyftNumberMappingService(
  defaultNumberMappingStore,
);

export class AsyncConnectShyftNumberMappingService {
  constructor(
    private readonly store: KnexConnectShyftNumberMappingStore = defaultKnexNumberMappingStore,
    private readonly fallbackService: ConnectShyftNumberMappingService = connectShyftNumberMappingService,
  ) {}

  async listMappings(tenantId: string, orgUnitId: string): Promise<ConnectShyftNumberMapping[]> {
    try {
      return await this.store.listByOrgUnit(tenantId, orgUnitId);
    } catch (error) {
      if (isMissingPersistenceError(error)) {
        return this.fallbackService.listMappings(tenantId, orgUnitId);
      }
      throw error;
    }
  }

  async findMappingByTenantNumber(
    tenantId: string,
    twilioNumberE164: string,
  ): Promise<ConnectShyftNumberMapping | null> {
    const normalizedNumber = normalizeTwilioNumber(twilioNumberE164);
    if (!isValidTwilioE164(normalizedNumber)) {
      return null;
    }

    try {
      return await this.store.findByTenantNumber(tenantId, normalizedNumber);
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }
      return this.fallbackService.findMappingByTenantNumber(tenantId, normalizedNumber);
    }
  }

  async createMapping(input: NumberMappingCreateCommand): Promise<NumberMappingSaveResult> {
    if (!hasCapability(input.actorRoles, CAPABILITIES.NUMBER_MAPPING_MANAGE)) {
      return buildCapabilityRefusal();
    }

    const twilioNumberE164 = normalizeTwilioNumber(input.twilioNumberE164);
    if (!isValidTwilioE164(twilioNumberE164)) {
      return buildInvalidE164Refusal();
    }

    try {
      const duplicate = await this.store.findByTenantNumber(input.tenantId, twilioNumberE164);
      if (duplicate) {
        return buildDuplicateRefusal();
      }

      const persisted = await this.store.createMapping({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        twilioNumberE164,
        label: normalizeLabel(input.label),
        isActive: input.isActive,
        mappingId: input.mappingId,
      });
      if (!persisted.ok) {
        if (persisted.reason === 'MAPPING_ID_CONFLICT') {
          return buildMappingIdConflictRefusal();
        }
        return buildDuplicateRefusal();
      }

      const mappings = await this.store.listByOrgUnit(input.tenantId, input.orgUnitId);
      return {
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
        httpStatus: 201,
        data: {
          mappingId: persisted.mapping.mappingId,
          orgUnitId: persisted.mapping.orgUnitId,
          twilioNumberE164: persisted.mapping.twilioNumberE164,
          label: persisted.mapping.label,
          isActive: persisted.mapping.isActive,
          mappings,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }
      return this.fallbackService.createMapping(input);
    }
  }

  async updateMapping(input: NumberMappingUpdateCommand): Promise<NumberMappingSaveResult> {
    if (!hasCapability(input.actorRoles, CAPABILITIES.NUMBER_MAPPING_MANAGE)) {
      return buildCapabilityRefusal();
    }

    const twilioNumberE164 = normalizeTwilioNumber(input.twilioNumberE164);
    if (!isValidTwilioE164(twilioNumberE164)) {
      return buildInvalidE164Refusal();
    }

    try {
      const existing = await this.store.findById(input.tenantId, input.mappingId);
      if (!existing) {
        return buildNotFoundRefusal();
      }

      if (existing.orgUnitId !== input.orgUnitId) {
        return {
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SCOPE_VIOLATION',
          message: 'Number mapping updates must stay within the active orgUnit scope.',
        };
      }

      const collidingMapping = await this.store.findByTenantNumber(input.tenantId, twilioNumberE164);
      if (collidingMapping && collidingMapping.mappingId !== input.mappingId) {
        return buildDuplicateRefusal();
      }

      const persisted = await this.store.updateMapping({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        mappingId: input.mappingId,
        twilioNumberE164,
        label: normalizeLabel(input.label),
        isActive: input.isActive,
      });

      if (!persisted.ok) {
        if (persisted.reason === 'NOT_FOUND') {
          return buildNotFoundRefusal();
        }
        if (persisted.reason === 'MAPPING_ID_CONFLICT') {
          return buildMappingIdConflictRefusal();
        }
        return buildDuplicateRefusal();
      }

      const mappings = await this.store.listByOrgUnit(input.tenantId, input.orgUnitId);

      return {
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
        httpStatus: 200,
        data: {
          mappingId: persisted.mapping.mappingId,
          orgUnitId: persisted.mapping.orgUnitId,
          twilioNumberE164: persisted.mapping.twilioNumberE164,
          label: persisted.mapping.label,
          isActive: persisted.mapping.isActive,
          mappings,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }
      return this.fallbackService.updateMapping(input);
    }
  }
}

export const connectShyftNumberMappingServiceAsync = new AsyncConnectShyftNumberMappingService();
