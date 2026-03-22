import type { Knex } from 'knex';
import db from '../../config/knex';
import {
  normalizePhone,
  validatePhoneForChannel,
} from '../../../../../domains/communication';

export type ConnectShyftOperatorDestinationResolution = {
  phoneNumber: string | null;
  source: 'thread_assignee' | 'actor_user' | 'org_unit_default' | 'none';
  userId: string | null;
  orgUnitId: string;
};

type ConnectShyftResolvedOperatorDestinationSource =
  Exclude<ConnectShyftOperatorDestinationResolution['source'], 'none'>;

type ResolveOperatorDestinationInput = {
  tenantId: string;
  orgUnitId: string;
  actorUserId?: string | null;
  claimedByUserId?: string | null;
};

type DbUserPhoneRow = {
  phone_e164?: string | null;
};

type DbOrgUnitFallbackRow = {
  default_operator_phone_e164?: string | null;
};

export type ConnectShyftOperatorDestinationStore = {
  getUserPhoneE164(input: {
    userId: string;
  }): Promise<string | null>;
  getOrgUnitDefaultOperatorPhoneE164(input: {
    tenantId: string;
    orgUnitId: string;
  }): Promise<string | null>;
};

const CONNECTSHYFT_ESCALATION_CONFIG_TABLE = 'cs_org_unit_escalation_config';

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildTenantOrgUnitKey = (tenantId: string, orgUnitId: string): string =>
  `${tenantId}::${orgUnitId}`;

const normalizeResolvedOperatorDestinationPhone = (input: {
  rawPhone: string;
  source: ConnectShyftResolvedOperatorDestinationSource;
  userId: string | null;
  orgUnitId: string;
}): string => {
  const normalizedPhone = normalizePhone(input.rawPhone, {
    defaultCountry: 'US',
  });

  if (!normalizedPhone.ok) {
    throw new ConnectShyftOperatorDestinationInvalidPhoneError({
      source: input.source,
      userId: input.userId,
      orgUnitId: input.orgUnitId,
      reason: normalizedPhone.error.message,
    });
  }

  const voiceValidation = validatePhoneForChannel(normalizedPhone.phone, 'voice');
  if (!voiceValidation.ok) {
    throw new ConnectShyftOperatorDestinationInvalidPhoneError({
      source: input.source,
      userId: input.userId,
      orgUnitId: input.orgUnitId,
      reason: voiceValidation.reason,
    });
  }

  return normalizedPhone.phone.normalizedE164;
};

export class ConnectShyftOperatorDestinationInvalidPhoneError extends Error {
  readonly code = 'CONNECTSHYFT_OPERATOR_INVALID_PHONE';

  constructor(
    readonly input: {
      source: ConnectShyftResolvedOperatorDestinationSource;
      userId: string | null;
      orgUnitId: string;
      reason: string;
    },
  ) {
    super('Operator destination phone must be a valid voice-capable E.164 or 10-digit US number.');
    this.name = 'ConnectShyftOperatorDestinationInvalidPhoneError';
  }

  get source(): ConnectShyftResolvedOperatorDestinationSource {
    return this.input.source;
  }

  get userId(): string | null {
    return this.input.userId;
  }

  get orgUnitId(): string {
    return this.input.orgUnitId;
  }

  get reason(): string {
    return this.input.reason;
  }
}

export class InMemoryConnectShyftOperatorDestinationStore
implements ConnectShyftOperatorDestinationStore {
  private readonly userPhones = new Map<string, string>();
  private readonly orgUnitDefaultPhones = new Map<string, string>();

  setUserPhone(userId: string, phoneE164: string | null): void {
    const normalizedUserId = normalizeOptionalString(userId);
    if (!normalizedUserId) {
      return;
    }

    const normalizedPhone = normalizeOptionalString(phoneE164);
    if (!normalizedPhone) {
      this.userPhones.delete(normalizedUserId);
      return;
    }

    this.userPhones.set(normalizedUserId, normalizedPhone);
  }

  setOrgUnitDefaultOperatorPhone(
    tenantId: string,
    orgUnitId: string,
    phoneE164: string | null,
  ): void {
    const normalizedTenantId = normalizeOptionalString(tenantId);
    const normalizedOrgUnitId = normalizeOptionalString(orgUnitId);
    if (!normalizedTenantId || !normalizedOrgUnitId) {
      return;
    }

    const key = buildTenantOrgUnitKey(normalizedTenantId, normalizedOrgUnitId);
    const normalizedPhone = normalizeOptionalString(phoneE164);
    if (!normalizedPhone) {
      this.orgUnitDefaultPhones.delete(key);
      return;
    }

    this.orgUnitDefaultPhones.set(key, normalizedPhone);
  }

  async getUserPhoneE164(input: {
    userId: string;
  }): Promise<string | null> {
    return this.userPhones.get(input.userId) || null;
  }

  async getOrgUnitDefaultOperatorPhoneE164(input: {
    tenantId: string;
    orgUnitId: string;
  }): Promise<string | null> {
    return this.orgUnitDefaultPhones.get(
      buildTenantOrgUnitKey(input.tenantId, input.orgUnitId),
    ) || null;
  }
}

export class KnexConnectShyftOperatorDestinationStore
implements ConnectShyftOperatorDestinationStore {
  constructor(private readonly knexClient: Knex = db) {}

  async getUserPhoneE164(input: {
    userId: string;
  }): Promise<string | null> {
    const row = await this.knexClient('users')
      .first<DbUserPhoneRow>('phone_e164')
      .whereRaw('id::text = ?', [input.userId]);

    return normalizeOptionalString(row?.phone_e164);
  }

  async getOrgUnitDefaultOperatorPhoneE164(input: {
    tenantId: string;
    orgUnitId: string;
  }): Promise<string | null> {
    const row = await this.knexClient
      .withSchema('connectshyft')
      .table<DbOrgUnitFallbackRow>(CONNECTSHYFT_ESCALATION_CONFIG_TABLE)
      .where('tenant_id', input.tenantId)
      .andWhere('org_unit_id', input.orgUnitId)
      .first('default_operator_phone_e164');

    return normalizeOptionalString(row?.default_operator_phone_e164);
  }
}

export class AsyncConnectShyftOperatorDestinationResolver {
  constructor(
    private readonly store: ConnectShyftOperatorDestinationStore = new KnexConnectShyftOperatorDestinationStore(),
  ) {}

  async resolveOperatorDestination(
    input: ResolveOperatorDestinationInput,
  ): Promise<ConnectShyftOperatorDestinationResolution> {
    const claimedByUserId = normalizeOptionalString(input.claimedByUserId);
    const actorUserId = normalizeOptionalString(input.actorUserId);

    const userCandidates: Array<{
      source: ConnectShyftResolvedOperatorDestinationSource;
      userId: string | null;
    }> = [
      {
        source: 'thread_assignee',
        userId: claimedByUserId,
      },
      {
        source: 'actor_user',
        userId: actorUserId,
      },
    ];

    for (const candidate of userCandidates) {
      if (!candidate.userId) {
        continue;
      }

      const rawPhone = await this.store.getUserPhoneE164({
        userId: candidate.userId,
      });
      if (!rawPhone) {
        continue;
      }

      return {
        phoneNumber: normalizeResolvedOperatorDestinationPhone({
          rawPhone,
          source: candidate.source,
          userId: candidate.userId,
          orgUnitId: input.orgUnitId,
        }),
        source: candidate.source,
        userId: candidate.userId,
        orgUnitId: input.orgUnitId,
      };
    }

    const orgUnitFallbackPhone = await this.store.getOrgUnitDefaultOperatorPhoneE164({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
    });

    if (orgUnitFallbackPhone) {
      return {
        phoneNumber: normalizeResolvedOperatorDestinationPhone({
          rawPhone: orgUnitFallbackPhone,
          source: 'org_unit_default',
          userId: null,
          orgUnitId: input.orgUnitId,
        }),
        source: 'org_unit_default',
        userId: null,
        orgUnitId: input.orgUnitId,
      };
    }

    return {
      phoneNumber: null,
      source: 'none',
      userId: null,
      orgUnitId: input.orgUnitId,
    };
  }
}

export const connectShyftOperatorDestinationResolverAsync =
  new AsyncConnectShyftOperatorDestinationResolver();

export async function resolveOperatorDestination(
  input: ResolveOperatorDestinationInput,
): Promise<ConnectShyftOperatorDestinationResolution> {
  return connectShyftOperatorDestinationResolverAsync.resolveOperatorDestination(input);
}
