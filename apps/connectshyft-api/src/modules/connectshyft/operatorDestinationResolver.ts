import type { Knex } from 'knex';
import db from '../../config/knex';
import {
  normalizePhone,
  validatePhoneForChannel,
} from '../../../../../domains/communication';
import { KnexConnectShyftEscalationConfigStore } from './escalationConfig';

export type ConnectShyftOperatorDestinationResolution = {
  phoneNumber: string | null;
  source: 'thread_assignee' | 'actor_user' | 'org_unit_default' | 'none';
  userId: string | null;
  orgUnitId: string;
};

export type ConnectShyftTelephonyOperatorPhoneSource =
  | 'callback_number'
  | 'orgunit_default'
  | 'none';

type ConnectShyftTelephonyOperatorPhoneCandidateStatus =
  | 'missing'
  | 'invalid'
  | 'valid';

export type ConnectShyftTelephonyOperatorPhoneResolution = {
  value: string | null;
  source: ConnectShyftTelephonyOperatorPhoneSource;
  normalized: boolean;
  callbackNumberStatus: ConnectShyftTelephonyOperatorPhoneCandidateStatus;
  orgUnitDefaultStatus: ConnectShyftTelephonyOperatorPhoneCandidateStatus;
};

export type ResolveConnectShyftOperatorDestinationInput = {
  tenantId: string;
  orgUnitId: string;
  actorUserId?: string | null;
  claimedByUserId?: string | null;
};

export type ResolveOperatorDestinationInput = ResolveConnectShyftOperatorDestinationInput;

export type ResolveOperatorDestinationResult = ConnectShyftOperatorDestinationResolution;

export type OperatorDestinationStore = {
  getUserPhone(input: {
    tenantId: string;
    userId: string;
  }): Promise<{
    userId: string;
    phoneNumber: string | null;
  } | null>;
};

type ConnectShyftOperatorDestinationStore = OperatorDestinationStore & {
  getOrgUnitDefaultPhone(input: {
    tenantId: string;
    orgUnitId: string;
  }): Promise<{
    orgUnitId: string;
    phoneNumber: string | null;
  } | null>;
};

type ResolveCandidatePhoneResult =
  | {
    status: 'missing';
    phoneNumber: null;
  }
  | {
    status: 'invalid';
    phoneNumber: null;
  }
  | {
    status: 'valid';
    phoneNumber: string;
  };

type ResolveNormalizedPhoneResult =
  | {
    status: 'missing';
    value: null;
  }
  | {
    status: 'invalid';
    value: null;
  }
  | {
    status: 'valid';
    value: string;
  };

type ConnectShyftOperatorCallbackPhoneRow = {
  user_id: string;
  callback_number_e164: string | null;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const resolveCandidatePhone = (value: unknown): ResolveCandidatePhoneResult => {
  const rawPhone = normalizeString(value);
  if (!rawPhone) {
    return {
      status: 'missing',
      phoneNumber: null,
    };
  }

  const normalizedPhone = normalizePhone(rawPhone, {
    defaultCountry: 'US',
  });
  if (!normalizedPhone.ok) {
    return {
      status: 'invalid',
      phoneNumber: null,
    };
  }

  const voiceValidation = validatePhoneForChannel(normalizedPhone.phone, 'voice');
  if (!voiceValidation.ok) {
    return {
      status: 'invalid',
      phoneNumber: null,
    };
  }

  return {
    status: 'valid',
    phoneNumber: normalizedPhone.phone.normalizedE164,
  };
};

const resolveNormalizedPhone = (value: unknown): ResolveNormalizedPhoneResult => {
  const rawPhone = normalizeString(value);
  if (!rawPhone) {
    return {
      status: 'missing',
      value: null,
    };
  }

  const normalizedPhone = normalizePhone(rawPhone, {
    defaultCountry: 'US',
  });
  if (!normalizedPhone.ok) {
    return {
      status: 'invalid',
      value: null,
    };
  }

  return {
    status: 'valid',
    value: normalizedPhone.phone.normalizedE164,
  };
};

const buildResolution = (
  input: {
    orgUnitId: string;
    phoneNumber: string | null;
    source: ConnectShyftOperatorDestinationResolution['source'];
    userId: string | null;
  },
): ConnectShyftOperatorDestinationResolution => ({
  phoneNumber: input.phoneNumber,
  source: input.source,
  userId: input.userId,
  orgUnitId: input.orgUnitId,
});

const buildTelephonyOperatorPhoneResolution = (input: {
  value: string | null;
  source: ConnectShyftTelephonyOperatorPhoneSource;
  normalized: boolean;
  callbackNumberStatus: ConnectShyftTelephonyOperatorPhoneCandidateStatus;
  orgUnitDefaultStatus: ConnectShyftTelephonyOperatorPhoneCandidateStatus;
}): ConnectShyftTelephonyOperatorPhoneResolution => ({
  value: input.value,
  source: input.source,
  normalized: input.normalized,
  callbackNumberStatus: input.callbackNumberStatus,
  orgUnitDefaultStatus: input.orgUnitDefaultStatus,
});

export class InMemoryConnectShyftOperatorDestinationStore
implements ConnectShyftOperatorDestinationStore {
  private readonly userPhones = new Map<string, { userId: string; phoneNumber: string | null }>();

  private readonly orgUnitDefaultPhones = new Map<string, { orgUnitId: string; phoneNumber: string | null }>();

  private buildUserKey(tenantId: string, userId: string): string {
    return `${tenantId}::${userId}`;
  }

  private buildOrgUnitKey(tenantId: string, orgUnitId: string): string {
    return `${tenantId}::${orgUnitId}`;
  }

  seedUserPhone(input: {
    tenantId: string;
    userId: string;
    phoneNumber?: string | null;
  }): void {
    this.userPhones.set(this.buildUserKey(input.tenantId, input.userId), {
      userId: input.userId,
      phoneNumber: normalizeString(input.phoneNumber) || null,
    });
  }

  seedOrgUnitDefaultPhone(input: {
    tenantId: string;
    orgUnitId: string;
    phoneNumber?: string | null;
  }): void {
    this.orgUnitDefaultPhones.set(this.buildOrgUnitKey(input.tenantId, input.orgUnitId), {
      orgUnitId: input.orgUnitId,
      phoneNumber: normalizeString(input.phoneNumber) || null,
    });
  }

  async getUserPhone(input: {
    tenantId: string;
    userId: string;
  }): Promise<{ userId: string; phoneNumber: string | null } | null> {
    return this.userPhones.get(this.buildUserKey(input.tenantId, input.userId)) || null;
  }

  async getOrgUnitDefaultPhone(input: {
    tenantId: string;
    orgUnitId: string;
  }): Promise<{ orgUnitId: string; phoneNumber: string | null } | null> {
    return this.orgUnitDefaultPhones.get(this.buildOrgUnitKey(input.tenantId, input.orgUnitId)) || null;
  }
}

export class KnexConnectShyftOperatorDestinationStore
implements ConnectShyftOperatorDestinationStore {
  private readonly escalationConfigStore: KnexConnectShyftEscalationConfigStore;

  constructor(private readonly resolveDb: () => Knex) {
    this.escalationConfigStore = new KnexConnectShyftEscalationConfigStore(resolveDb);
  }

  private operatorCallbackNumbersTable() {
    return this.resolveDb()
      .withSchema('connectshyft')
      .table<ConnectShyftOperatorCallbackPhoneRow>('cs_operator_callback_numbers');
  }

  async getUserPhone(input: {
    tenantId: string;
    userId: string;
  }): Promise<{ userId: string; phoneNumber: string | null } | null> {
    const row = await this.operatorCallbackNumbersTable()
      .where({
        tenant_id: input.tenantId,
        user_id: input.userId,
      })
      .first(['user_id', 'callback_number_e164']);

    if (!row) {
      return null;
    }

    return {
      userId: row.user_id,
      phoneNumber: normalizeString(row.callback_number_e164) || null,
    };
  }

  async getOrgUnitDefaultPhone(input: {
    tenantId: string;
    orgUnitId: string;
  }): Promise<{ orgUnitId: string; phoneNumber: string | null } | null> {
    const config = await this.escalationConfigStore.getConfig(input.tenantId, input.orgUnitId);
    if (!config) {
      return null;
    }

    return {
      orgUnitId: config.orgUnitId,
      phoneNumber: config.defaultOperatorPhoneE164,
    };
  }
}

export class ConnectShyftOperatorDestinationResolverService {
  constructor(private readonly store: ConnectShyftOperatorDestinationStore) {}

  async resolve(
    input: ResolveConnectShyftOperatorDestinationInput,
  ): Promise<ConnectShyftOperatorDestinationResolution> {
    const claimedByUserId = normalizeString(input.claimedByUserId);
    const actorUserId = normalizeString(input.actorUserId);
    const visitedUserIds = new Set<string>();

    if (claimedByUserId) {
      visitedUserIds.add(claimedByUserId);

      const claimedUser = await this.store.getUserPhone({
        tenantId: input.tenantId,
        userId: claimedByUserId,
      });
      const claimedPhone = resolveCandidatePhone(claimedUser?.phoneNumber);

      if (claimedPhone.status === 'valid') {
        return buildResolution({
          orgUnitId: input.orgUnitId,
          phoneNumber: claimedPhone.phoneNumber,
          source: 'thread_assignee',
          userId: claimedUser?.userId || claimedByUserId,
        });
      }

      if (claimedPhone.status === 'invalid') {
        return buildResolution({
          orgUnitId: input.orgUnitId,
          phoneNumber: null,
          source: 'thread_assignee',
          userId: claimedUser?.userId || claimedByUserId,
        });
      }
    }

    if (actorUserId && !visitedUserIds.has(actorUserId)) {
      visitedUserIds.add(actorUserId);

      const actorUser = await this.store.getUserPhone({
        tenantId: input.tenantId,
        userId: actorUserId,
      });
      const actorPhone = resolveCandidatePhone(actorUser?.phoneNumber);

      if (actorPhone.status === 'valid') {
        return buildResolution({
          orgUnitId: input.orgUnitId,
          phoneNumber: actorPhone.phoneNumber,
          source: 'actor_user',
          userId: actorUser?.userId || actorUserId,
        });
      }

      if (actorPhone.status === 'invalid') {
        return buildResolution({
          orgUnitId: input.orgUnitId,
          phoneNumber: null,
          source: 'actor_user',
          userId: actorUser?.userId || actorUserId,
        });
      }
    }

    const orgUnitDefault = await this.store.getOrgUnitDefaultPhone({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
    });
    const orgUnitDefaultPhone = resolveCandidatePhone(orgUnitDefault?.phoneNumber);

    if (orgUnitDefaultPhone.status === 'valid') {
      return buildResolution({
        orgUnitId: input.orgUnitId,
        phoneNumber: orgUnitDefaultPhone.phoneNumber,
        source: 'org_unit_default',
        userId: null,
      });
    }

    if (orgUnitDefaultPhone.status === 'invalid') {
      return buildResolution({
        orgUnitId: input.orgUnitId,
        phoneNumber: null,
        source: 'org_unit_default',
        userId: null,
      });
    }

    return buildResolution({
      orgUnitId: input.orgUnitId,
      phoneNumber: null,
      source: 'none',
      userId: null,
    });
  }
}

export class ConnectShyftTelephonyOperatorPhoneResolverService {
  constructor(
    private readonly store: Pick<ConnectShyftOperatorDestinationStore, 'getOrgUnitDefaultPhone'>,
  ) {}

  async resolve(input: {
    tenantId: string;
    orgUnitId: string;
    callbackNumberE164?: string | null;
    callbackNumberPersistenceAvailable?: boolean;
  }): Promise<ConnectShyftTelephonyOperatorPhoneResolution> {
    if (input.callbackNumberPersistenceAvailable === false) {
      return buildTelephonyOperatorPhoneResolution({
        value: null,
        source: 'none',
        normalized: false,
        callbackNumberStatus: 'missing',
        orgUnitDefaultStatus: 'missing',
      });
    }

    const callbackNumber = resolveNormalizedPhone(input.callbackNumberE164);
    const orgUnitDefault = await this.store.getOrgUnitDefaultPhone({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
    });
    const orgUnitDefaultPhone = resolveNormalizedPhone(orgUnitDefault?.phoneNumber);

    if (callbackNumber.status === 'valid') {
      return buildTelephonyOperatorPhoneResolution({
        value: callbackNumber.value,
        source: 'callback_number',
        normalized: true,
        callbackNumberStatus: callbackNumber.status,
        orgUnitDefaultStatus: orgUnitDefaultPhone.status,
      });
    }

    if (orgUnitDefaultPhone.status === 'valid') {
      return buildTelephonyOperatorPhoneResolution({
        value: orgUnitDefaultPhone.value,
        source: 'orgunit_default',
        normalized: true,
        callbackNumberStatus: callbackNumber.status,
        orgUnitDefaultStatus: orgUnitDefaultPhone.status,
      });
    }

    if (callbackNumber.status === 'invalid') {
      return buildTelephonyOperatorPhoneResolution({
        value: null,
        source: 'callback_number',
        normalized: false,
        callbackNumberStatus: callbackNumber.status,
        orgUnitDefaultStatus: orgUnitDefaultPhone.status,
      });
    }

    if (orgUnitDefaultPhone.status === 'invalid') {
      return buildTelephonyOperatorPhoneResolution({
        value: null,
        source: 'orgunit_default',
        normalized: false,
        callbackNumberStatus: callbackNumber.status,
        orgUnitDefaultStatus: orgUnitDefaultPhone.status,
      });
    }

    return buildTelephonyOperatorPhoneResolution({
      value: null,
      source: 'none',
      normalized: false,
      callbackNumberStatus: callbackNumber.status,
      orgUnitDefaultStatus: orgUnitDefaultPhone.status,
    });
  }
}

const connectShyftOperatorDestinationStore =
  new KnexConnectShyftOperatorDestinationStore(() => db);

const connectShyftOperatorDestinationResolverService =
  new ConnectShyftOperatorDestinationResolverService(
    connectShyftOperatorDestinationStore,
  );

const connectShyftTelephonyOperatorPhoneResolverService =
  new ConnectShyftTelephonyOperatorPhoneResolverService(
    connectShyftOperatorDestinationStore,
  );

export type ResolveOperatorDestinationDependencies = {
  service?: Pick<ConnectShyftOperatorDestinationResolverService, 'resolve'>;
  store?: OperatorDestinationStore;
  getOrgUnitDefaultPhone?: ConnectShyftOperatorDestinationStore['getOrgUnitDefaultPhone'];
};

export async function resolveOperatorDestination(
  input: ResolveOperatorDestinationInput,
  overrides?: ResolveOperatorDestinationDependencies,
): Promise<ResolveOperatorDestinationResult> {
  if (overrides?.service) {
    return overrides.service.resolve(input);
  }

  if (overrides?.store || overrides?.getOrgUnitDefaultPhone) {
    const store: ConnectShyftOperatorDestinationStore = {
      getUserPhone: async (dependencyInput) => (
        overrides.store
          ? overrides.store.getUserPhone(dependencyInput)
          : connectShyftOperatorDestinationStore.getUserPhone(dependencyInput)
      ),
      getOrgUnitDefaultPhone: async (dependencyInput) => (
        overrides.getOrgUnitDefaultPhone
          ? overrides.getOrgUnitDefaultPhone(dependencyInput)
          : connectShyftOperatorDestinationStore.getOrgUnitDefaultPhone(dependencyInput)
      ),
    };

    return new ConnectShyftOperatorDestinationResolverService(store).resolve(input);
  }

  return connectShyftOperatorDestinationResolverService.resolve(input);
}

export async function resolveConnectShyftTelephonyOperatorPhone(input: {
  tenantId: string;
  orgUnitId: string;
  callbackNumberE164?: string | null;
  callbackNumberPersistenceAvailable?: boolean;
}): Promise<ConnectShyftTelephonyOperatorPhoneResolution> {
  return connectShyftTelephonyOperatorPhoneResolverService.resolve(input);
}
