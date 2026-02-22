import { randomUUID } from 'node:crypto';

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

type NumberMappingPersistenceResult =
  | {
    ok: true;
    mapping: ConnectShyftNumberMapping;
  }
  | {
    ok: false;
    reason: 'DUPLICATE_TENANT_NUMBER' | 'NOT_FOUND';
  };

export type NumberMappingFieldError = {
  field: 'twilioNumberE164';
  reason: 'INVALID_E164' | 'DUPLICATE_TENANT_NUMBER';
  message: string;
};

type NumberMappingRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164'
    | 'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE'
    | 'CONNECTSHYFT_NUMBER_MAPPING_SCOPE_VIOLATION';
  message: string;
  data?: {
    fieldErrors?: NumberMappingFieldError[];
  };
};

type NumberMappingSaveResult =
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
        if (a.createdAtUtc < b.createdAtUtc) {
          return -1;
        }
        if (a.createdAtUtc > b.createdAtUtc) {
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

export class ConnectShyftNumberMappingService {
  constructor(
    private readonly store: InMemoryConnectShyftNumberMappingStore = defaultNumberMappingStore,
  ) {}

  listMappings(tenantId: string, orgUnitId: string): ConnectShyftNumberMapping[] {
    return this.store.listByOrgUnit(tenantId, orgUnitId);
  }

  createMapping(input: NumberMappingCreateInput): NumberMappingSaveResult {
    const twilioNumberE164 = normalizeTwilioNumber(input.twilioNumberE164);
    if (!isValidTwilioE164(twilioNumberE164)) {
      return buildInvalidE164Refusal();
    }

    if (this.store.findByTenantNumber(input.tenantId, twilioNumberE164)) {
      return buildDuplicateRefusal();
    }

    const persisted = this.store.createMapping({
      ...input,
      twilioNumberE164,
      label: normalizeLabel(input.label),
    });
    if (!persisted.ok) {
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

  updateMapping(input: NumberMappingUpdateInput): NumberMappingSaveResult {
    const twilioNumberE164 = normalizeTwilioNumber(input.twilioNumberE164);
    if (!isValidTwilioE164(twilioNumberE164)) {
      return buildInvalidE164Refusal();
    }

    const existing = this.store.findById(input.tenantId, input.mappingId);
    if (existing && existing.orgUnitId !== input.orgUnitId) {
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

    let persisted: NumberMappingPersistenceResult;
    if (existing) {
      persisted = this.store.updateMapping({
        ...input,
        twilioNumberE164,
        label: normalizeLabel(input.label),
      });
    } else {
      persisted = this.store.createMapping({
        ...input,
        twilioNumberE164,
        label: normalizeLabel(input.label),
        mappingId: input.mappingId,
      });
    }

    if (!persisted.ok) {
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

export const connectShyftNumberMappingService = new ConnectShyftNumberMappingService(
  defaultNumberMappingStore,
);
