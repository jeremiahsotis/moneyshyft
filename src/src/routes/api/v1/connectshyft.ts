import { Request, Response, Router } from 'express';
import type { Knex } from 'knex';
import { refusal, success } from '../../../platform/envelopes/response';
import { CAPABILITIES, hasCapability } from '../../../platform/rbac/capabilities';
import {
  evaluateConnectShyftCapability,
  isConnectShyftTestOverrideEnabled,
  mergeConnectShyftFlagsWithEntitlement,
  resolveConnectShyftFeatureFlags,
  type ConnectShyftCapability,
  type ConnectShyftFeatureFlags,
} from '../../../modules/connectshyft/featureFlags';
import { resolveConnectShyftOrgUnitContext } from '../../../modules/connectshyft/contextAccess';
import { connectShyftNumberMappingServiceAsync } from '../../../modules/connectshyft/numberMappings';
import {
  ConnectShyftEscalationConfigService,
  KnexConnectShyftEscalationConfigStore,
  connectShyftEscalationRecipientScopes,
  createEscalationRecipientDirectory,
  type ConnectShyftEscalationRecipientDirectory,
  type ConnectShyftEscalationRecipientOption,
} from '../../../modules/connectshyft/escalationConfig';
import {
  createKnexOrgUnitAccessStore,
  validateOrgUnitScopedAccess,
} from '../../../platform/tenancy/orgUnitAccess';
import {
  evaluateActorTenantModuleEntitlement,
  type PlatformAdminActorContext,
} from '../../../services/PlatformAdminService';

const router = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const loadPlatformDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

const connectShyftEscalationConfigService = new ConnectShyftEscalationConfigService(
  new KnexConnectShyftEscalationConfigStore(loadPlatformDb),
);

const actorFromRequest = (req: Request): PlatformAdminActorContext => ({
  userId: req.user?.userId || null,
  baseRole: req.user?.role || null,
  headerRoles: [],
  activeTenantId: req.user?.activeTenantId || req.user?.householdId || null,
});

const resolveTenantIdFromRequest = (req: Request): string | null => {
  return req.user?.activeTenantId || req.user?.householdId || null;
};

const shouldBypassTestHarnessEntitlementLookup = (tenantId: string): boolean => {
  return isConnectShyftTestOverrideEnabled() && !UUID_PATTERN.test(tenantId);
};

const resolveEntitlementAwareConnectShyftFlags = async (
  req: Request,
): Promise<{ flags: ConnectShyftFeatureFlags; entitlementDecision: Awaited<ReturnType<typeof evaluateActorTenantModuleEntitlement>> | null }> => {
  const resolvedFlags = resolveConnectShyftFeatureFlags(req);
  const tenantId = resolveTenantIdFromRequest(req);
  if (!tenantId) {
    return {
      flags: resolvedFlags,
      entitlementDecision: null,
    };
  }

  if (shouldBypassTestHarnessEntitlementLookup(tenantId)) {
    return {
      flags: resolvedFlags,
      entitlementDecision: null,
    };
  }

  const entitlementDecision = await evaluateActorTenantModuleEntitlement(
    loadPlatformDb(),
    actorFromRequest(req),
    tenantId,
    'connectshyft',
  );

  return {
    flags: mergeConnectShyftFlagsWithEntitlement(resolvedFlags, {
      moduleEnabled: entitlementDecision.enabled,
    }),
    entitlementDecision,
  };
};

const enforceCapability = async (
  req: Request,
  res: Response,
  capability: ConnectShyftCapability,
): Promise<ConnectShyftFeatureFlags | null> => {
  const { flags, entitlementDecision } = await resolveEntitlementAwareConnectShyftFlags(req);
  const evaluation = evaluateConnectShyftCapability(flags, capability);
  if (evaluation.ok) {
    return flags;
  }

  const moduleDeniedByEntitlement =
    evaluation.code === 'CONNECTSHYFT_MODULE_DISABLED'
    && entitlementDecision
    && !entitlementDecision.enabled;

  refusal(res, {
    code: moduleDeniedByEntitlement ? entitlementDecision.refusalCode : evaluation.code,
    message: moduleDeniedByEntitlement ? entitlementDecision.message : evaluation.message,
    refusalType: evaluation.refusalType,
    httpStatus: 200,
    data: moduleDeniedByEntitlement
      ? {
        moduleKey: entitlementDecision.moduleKey,
        tenantId: entitlementDecision.tenantId,
        reason: entitlementDecision.reason,
      }
      : undefined,
  });
  return null;
};

const enforceOrgUnitContext = async (
  req: Request,
  res: Response,
  attemptedOrgUnitId?: string | null,
) => {
  const decision = await resolveConnectShyftOrgUnitContext(req, {
    attemptedOrgUnitId,
    resolveOrgUnitAccess: async ({ tenantId, orgUnitId, userId, baseRoles }) =>
      validateOrgUnitScopedAccess(
        createKnexOrgUnitAccessStore(loadPlatformDb()),
        {
          tenantId,
          orgUnitId,
          userId,
          baseRoles,
        },
      ),
  });

  if (decision.ok) {
    return decision.context;
  }

  refusal(res, {
    code: decision.code,
    message: decision.message,
    refusalType: decision.refusalType,
    httpStatus: decision.httpStatus,
  });
  return null;
};

const resolveConnectShyftRequestedRole = (req: Request): string | null => {
  if (isConnectShyftTestOverrideEnabled()) {
    const testOverrideRole = req.header('x-test-connectshyft-role');
    if (typeof testOverrideRole === 'string' && testOverrideRole.trim().length > 0) {
      return testOverrideRole.trim();
    }
  }

  return req.user?.role || null;
};

const enforceNumberMappingManageCapability = (
  req: Request,
  res: Response,
): boolean => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (hasCapability([requestedRole], CAPABILITIES.NUMBER_MAPPING_MANAGE)) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
    message: 'Number mapping management requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceEscalationConfigCapability = (
  req: Request,
  res: Response,
): boolean => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (hasCapability([requestedRole], CAPABILITIES.ORG_UNIT_ESCALATION_CONFIG)) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_ESCALATION_CONFIG_FORBIDDEN',
    message: 'Escalation configuration requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadViewCapability = (
  req: Request,
  res: Response,
): boolean => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (
    hasCapability([requestedRole], CAPABILITIES.ORG_UNIT_THREAD_VIEW)
    || hasCapability([requestedRole], CAPABILITIES.THREAD_VIEW_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
    message: 'Thread access requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceEscalationActionMembership = (
  req: Request,
  res: Response,
  bypassedOrgUnitMembership: boolean,
): boolean => {
  if (!bypassedOrgUnitMembership) {
    return true;
  }

  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (hasCapability([requestedRole], CAPABILITIES.THREAD_TAKEOVER_ALL)) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
    message: 'orgUnit membership is required for this ConnectShyft route',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadClaimCapability = (
  req: Request,
  res: Response,
): boolean => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (
    hasCapability([requestedRole], CAPABILITIES.ORG_UNIT_THREAD_CLAIM)
    || hasCapability([requestedRole], CAPABILITIES.THREAD_TAKEOVER_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
    message: 'Thread claim requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadTakeoverCapability = (
  req: Request,
  res: Response,
): boolean => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (
    hasCapability([requestedRole], CAPABILITIES.ORG_UNIT_THREAD_TAKEOVER)
    || hasCapability([requestedRole], CAPABILITIES.THREAD_TAKEOVER_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_TAKEOVER_FORBIDDEN',
    message: 'Thread takeover requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const parseOrgUnitIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.body.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseMappingBody = (req: Request) => ({
  twilioNumberE164: typeof req.body?.twilioNumberE164 === 'string' ? req.body.twilioNumberE164 : '',
  label: typeof req.body?.label === 'string' ? req.body.label : '',
  isActive: req.body?.isActive === undefined ? true : Boolean(req.body.isActive),
});

const parseEscalationConfigBody = (req: Request) => ({
  escalationBaselineHours: req.body?.escalationBaselineHours,
  recipients: req.body?.recipients,
});

const TEST_RECIPIENT_DIRECTORY_HEADER = 'x-test-connectshyft-recipient-directory';

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseScopedRecipientEntries = (
  rawEntries: unknown,
  scope: ConnectShyftEscalationRecipientOption['scope'],
): {
  recipientIds: string[];
  options: ConnectShyftEscalationRecipientOption[];
} => {
  if (!Array.isArray(rawEntries)) {
    return {
      recipientIds: [],
      options: [],
    };
  }

  const recipientIds: string[] = [];
  const options: ConnectShyftEscalationRecipientOption[] = [];

  rawEntries.forEach((entry) => {
    if (typeof entry === 'string') {
      const userId = normalizeNonEmptyString(entry);
      if (!userId) {
        return;
      }

      recipientIds.push(userId);
      options.push({
        value: userId,
        label: userId,
        scope,
      });
      return;
    }

    if (!entry || typeof entry !== 'object') {
      return;
    }

    const candidate = entry as {
      userId?: unknown;
      label?: unknown;
    };

    const userId = normalizeNonEmptyString(candidate.userId);
    if (!userId) {
      return;
    }

    const label = normalizeNonEmptyString(candidate.label) || userId;
    recipientIds.push(userId);
    options.push({
      value: userId,
      label,
      scope,
    });
  });

  return {
    recipientIds,
    options,
  };
};

const parseRecipientOptions = (
  rawOptions: unknown,
): ConnectShyftEscalationRecipientOption[] => {
  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const candidate = entry as {
        value?: unknown;
        label?: unknown;
        scope?: unknown;
      };

      const value = normalizeNonEmptyString(candidate.value);
      if (!value) {
        return null;
      }

      const label = normalizeNonEmptyString(candidate.label) || value;
      const scope = normalizeNonEmptyString(candidate.scope)
        || connectShyftEscalationRecipientScopes.TEST_ONLY;

      return {
        value,
        label,
        scope,
      } as ConnectShyftEscalationRecipientOption;
    })
    .filter((entry): entry is ConnectShyftEscalationRecipientOption => entry !== null);
};

const buildDefaultTestRecipientDirectory = (): ConnectShyftEscalationRecipientDirectory =>
  createEscalationRecipientDirectory({
    orgUnitRecipientIds: [
      'user-connectshyft-a4-primary-recipient',
      'user-connectshyft-a4-secondary-recipient',
      'user-connectshyft-a5-orgunit-admin',
      'user-connectshyft-a5-orgunit-member',
    ],
    tenantRecipientIds: [
      'user-connectshyft-a4-primary-recipient',
      'user-connectshyft-a4-secondary-recipient',
      'user-connectshyft-a4-tenant-staff-recipient',
      'user-connectshyft-a5-orgunit-admin',
      'user-connectshyft-a5-orgunit-member',
      'user-connectshyft-a5-tenant-staff',
    ],
    options: [
      {
        value: 'user-connectshyft-a4-primary-recipient',
        label: 'Primary OrgUnit Admin',
        scope: connectShyftEscalationRecipientScopes.ORG_UNIT,
      },
      {
        value: 'user-connectshyft-a4-secondary-recipient',
        label: 'Secondary OrgUnit Admin',
        scope: connectShyftEscalationRecipientScopes.ORG_UNIT,
      },
      {
        value: 'user-connectshyft-a4-tenant-staff-recipient',
        label: 'Tenant Staff Recipient',
        scope: connectShyftEscalationRecipientScopes.TENANT,
      },
      {
        value: 'user-connectshyft-a5-orgunit-admin',
        label: 'A5 OrgUnit Admin',
        scope: connectShyftEscalationRecipientScopes.ORG_UNIT,
      },
      {
        value: 'user-connectshyft-a5-orgunit-member',
        label: 'A5 OrgUnit Member',
        scope: connectShyftEscalationRecipientScopes.ORG_UNIT,
      },
      {
        value: 'user-connectshyft-a5-tenant-staff',
        label: 'A5 Tenant Staff',
        scope: connectShyftEscalationRecipientScopes.TENANT,
      },
      {
        value: 'user-connectshyft-a4-cross-tenant-recipient',
        label: 'Cross-tenant recipient (invalid test option)',
        scope: connectShyftEscalationRecipientScopes.TEST_ONLY,
      },
    ],
  });

const resolveEscalationRecipientDirectoryFromHeader = (
  req: Request,
): ConnectShyftEscalationRecipientDirectory | null => {
  if (!isConnectShyftTestOverrideEnabled()) {
    return null;
  }

  const rawHeader = req.header(TEST_RECIPIENT_DIRECTORY_HEADER);
  if (!rawHeader) {
    return buildDefaultTestRecipientDirectory();
  }

  try {
    const parsed = JSON.parse(rawHeader) as {
      orgUnitRecipients?: unknown;
      tenantRecipients?: unknown;
      options?: unknown;
    };

    const orgUnitRecipients = parseScopedRecipientEntries(
      parsed.orgUnitRecipients,
      connectShyftEscalationRecipientScopes.ORG_UNIT,
    );
    const tenantRecipients = parseScopedRecipientEntries(
      parsed.tenantRecipients,
      connectShyftEscalationRecipientScopes.TENANT,
    );

    const options = [
      ...orgUnitRecipients.options,
      ...tenantRecipients.options,
      ...parseRecipientOptions(parsed.options),
    ];

    return createEscalationRecipientDirectory({
      orgUnitRecipientIds: orgUnitRecipients.recipientIds,
      tenantRecipientIds: [
        ...tenantRecipients.recipientIds,
        ...orgUnitRecipients.recipientIds,
      ],
      options,
    });
  } catch (_error) {
    return buildDefaultTestRecipientDirectory();
  }
};

const buildRecipientLabel = (
  userId: string,
  firstName: unknown,
  lastName: unknown,
): string => {
  const first = typeof firstName === 'string' ? firstName.trim() : '';
  const last = typeof lastName === 'string' ? lastName.trim() : '';
  const fullName = `${first} ${last}`.trim();
  return fullName.length > 0 ? fullName : userId;
};

const buildDatabaseRecipientDirectory = async (
  tenantId: string,
  orgUnitId: string,
): Promise<ConnectShyftEscalationRecipientDirectory> => {
  if (!UUID_PATTERN.test(tenantId) || !UUID_PATTERN.test(orgUnitId)) {
    return createEscalationRecipientDirectory({
      orgUnitRecipientIds: [],
      tenantRecipientIds: [],
      options: [],
    });
  }

  const db = loadPlatformDb();

  const tenantRows = await db('platform.tenant_memberships as tm')
    .leftJoin('users as u', 'u.id', 'tm.user_id')
    .where('tm.tenant_id', tenantId)
    .select('tm.user_id as userId', 'u.first_name as firstName', 'u.last_name as lastName');

  const orgUnitRows = await db('platform.org_unit_memberships as om')
    .join('platform.org_units as ou', 'ou.id', 'om.org_unit_id')
    .leftJoin('users as u', 'u.id', 'om.user_id')
    .where('om.org_unit_id', orgUnitId)
    .andWhere('ou.tenant_id', tenantId)
    .select('om.user_id as userId', 'u.first_name as firstName', 'u.last_name as lastName');

  const orgUnitRecipientIds: string[] = [];
  const orgUnitOptions: ConnectShyftEscalationRecipientOption[] = [];
  orgUnitRows.forEach((row) => {
    const userId = normalizeNonEmptyString((row as { userId?: unknown }).userId);
    if (!userId) {
      return;
    }

    orgUnitRecipientIds.push(userId);
    orgUnitOptions.push({
      value: userId,
      label: buildRecipientLabel(
        userId,
        (row as { firstName?: unknown }).firstName,
        (row as { lastName?: unknown }).lastName,
      ),
      scope: connectShyftEscalationRecipientScopes.ORG_UNIT,
    });
  });

  const tenantRecipientIds: string[] = [];
  const tenantOptions: ConnectShyftEscalationRecipientOption[] = [];
  tenantRows.forEach((row) => {
    const userId = normalizeNonEmptyString((row as { userId?: unknown }).userId);
    if (!userId) {
      return;
    }

    tenantRecipientIds.push(userId);
    tenantOptions.push({
      value: userId,
      label: buildRecipientLabel(
        userId,
        (row as { firstName?: unknown }).firstName,
        (row as { lastName?: unknown }).lastName,
      ),
      scope: connectShyftEscalationRecipientScopes.TENANT,
    });
  });

  const directory = createEscalationRecipientDirectory({
    orgUnitRecipientIds,
    tenantRecipientIds,
    options: [...orgUnitOptions, ...tenantOptions],
  });

  directory.options.sort((a, b) => {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return a.value.localeCompare(b.value);
  });

  return directory;
};

const resolveEscalationRecipientDirectory = async (
  req: Request,
  tenantId: string,
  orgUnitId: string,
): Promise<ConnectShyftEscalationRecipientDirectory> => {
  const testDirectory = resolveEscalationRecipientDirectoryFromHeader(req);
  if (testDirectory) {
    return testDirectory;
  }

  return buildDatabaseRecipientDirectory(tenantId, orgUnitId);
};

router.get('/availability', async (req: Request, res: Response) => {
  const { flags, entitlementDecision } = await resolveEntitlementAwareConnectShyftFlags(req);

  return success(res, {
    code: 'CONNECTSHYFT_AVAILABILITY_RESOLVED',
    message: 'ConnectShyft availability state resolved',
    data: {
      flags,
      entitlement: entitlementDecision
        ? {
          moduleKey: entitlementDecision.moduleKey,
          enabled: entitlementDecision.enabled,
          reason: entitlementDecision.reason,
        }
        : null,
      capabilities: {
        module: evaluateConnectShyftCapability(flags, 'module').ok,
        inbox: evaluateConnectShyftCapability(flags, 'inbox').ok,
        escalation: evaluateConnectShyftCapability(flags, 'escalation').ok,
        webhooks: evaluateConnectShyftCapability(flags, 'webhooks').ok,
      },
    },
  });
});

router.get('/inbox', async (req: Request, res: Response) => {
  const flags = await enforceCapability(req, res, 'inbox');
  if (!flags) {
    return;
  }

  if (!enforceThreadViewCapability(req, res)) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_INBOX_READY',
    message: 'ConnectShyft inbox is available for this tenant',
    data: {
      context,
      items: [],
      actions: {
        claim: flags.connectshyft_escalation_enabled,
        takeover: flags.connectshyft_escalation_enabled,
      },
    },
  });
});

router.get('/numbers', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'module')) {
    return;
  }

  if (!enforceNumberMappingManageCapability(req, res)) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
    message: 'ConnectShyft number mappings resolved',
    data: {
      orgUnitId: context.orgUnitId,
      mappings: await connectShyftNumberMappingServiceAsync.listMappings(context.tenantId, context.orgUnitId),
    },
  });
});

router.post('/numbers', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'module')) {
    return;
  }

  if (!enforceNumberMappingManageCapability(req, res)) {
    return;
  }

  const requestedOrgUnitId = parseOrgUnitIdFromBody(req);
  const context = await enforceOrgUnitContext(req, res, requestedOrgUnitId);
  if (!context) {
    return;
  }

  const payload = parseMappingBody(req);
  const requestedRole = resolveConnectShyftRequestedRole(req);
  const saved = await connectShyftNumberMappingServiceAsync.createMapping({
    actorRoles: [requestedRole],
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    twilioNumberE164: payload.twilioNumberE164,
    label: payload.label,
    isActive: payload.isActive,
  });

  if (!saved.ok) {
    const refusalData = 'data' in saved ? saved.data : undefined;
    refusal(res, {
      code: saved.code,
      message: saved.message,
      refusalType: 'business',
      httpStatus: 200,
      data: refusalData,
    });
    return;
  }

  return success(res, {
    code: saved.code,
    message: 'ConnectShyft number mapping saved',
    httpStatus: saved.httpStatus,
    data: {
      orgUnitId: saved.data.orgUnitId,
      mappingId: saved.data.mappingId,
      twilioNumberE164: saved.data.twilioNumberE164,
      label: saved.data.label,
      isActive: saved.data.isActive,
      mappings: saved.data.mappings,
    },
  });
});

router.put('/numbers/:mappingId', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'module')) {
    return;
  }

  if (!enforceNumberMappingManageCapability(req, res)) {
    return;
  }

  const mappingId = typeof req.params.mappingId === 'string' ? req.params.mappingId.trim() : '';
  if (!mappingId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NUMBER_MAPPING_ID_REQUIRED',
      message: 'mappingId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const requestedOrgUnitId = parseOrgUnitIdFromBody(req);
  const context = await enforceOrgUnitContext(req, res, requestedOrgUnitId);
  if (!context) {
    return;
  }

  const payload = parseMappingBody(req);
  const requestedRole = resolveConnectShyftRequestedRole(req);
  const updated = await connectShyftNumberMappingServiceAsync.updateMapping({
    actorRoles: [requestedRole],
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    mappingId,
    twilioNumberE164: payload.twilioNumberE164,
    label: payload.label,
    isActive: payload.isActive,
  });

  if (!updated.ok) {
    refusal(res, {
      code: updated.code,
      message: updated.message,
      refusalType: 'business',
      httpStatus: 200,
      data: updated.data,
    });
    return;
  }

  return success(res, {
    code: updated.code,
    message: 'ConnectShyft number mapping updated',
    httpStatus: updated.httpStatus,
    data: {
      mappingId: updated.data.mappingId,
      orgUnitId: updated.data.orgUnitId,
      twilioNumberE164: updated.data.twilioNumberE164,
      label: updated.data.label,
      isActive: updated.data.isActive,
      mappings: updated.data.mappings,
    },
  });
});

router.get('/escalation/recipients', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'escalation')) {
    return;
  }

  if (!enforceEscalationConfigCapability(req, res)) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  const recipientDirectory = await resolveEscalationRecipientDirectory(
    req,
    context.tenantId,
    context.orgUnitId,
  );

  return success(res, {
    code: 'CONNECTSHYFT_ESCALATION_RECIPIENTS_RESOLVED',
    message: 'ConnectShyft escalation recipients resolved',
    data: {
      orgUnitId: context.orgUnitId,
      recipientOptions: recipientDirectory.options,
    },
  });
});

router.get('/escalation/config', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'escalation')) {
    return;
  }

  if (!enforceEscalationConfigCapability(req, res)) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  const config = await connectShyftEscalationConfigService.getConfig(context.tenantId, context.orgUnitId);

  return success(res, {
    code: 'CONNECTSHYFT_ESCALATION_CONFIG_RESOLVED',
    message: 'ConnectShyft escalation configuration resolved',
    data: {
      orgUnitId: config.orgUnitId,
      escalationBaselineHours: config.escalationBaselineHours,
      recipients: config.recipients,
      updatedAtUtc: config.updatedAtUtc,
    },
  });
});

router.put('/escalation/config', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'escalation')) {
    return;
  }

  if (!enforceEscalationConfigCapability(req, res)) {
    return;
  }

  const requestedOrgUnitId = parseOrgUnitIdFromBody(req);
  const context = await enforceOrgUnitContext(req, res, requestedOrgUnitId);
  if (!context) {
    return;
  }

  const recipientDirectory = await resolveEscalationRecipientDirectory(
    req,
    context.tenantId,
    context.orgUnitId,
  );

  const payload = parseEscalationConfigBody(req);
  const requestedRole = resolveConnectShyftRequestedRole(req);
  const saved = await connectShyftEscalationConfigService.saveConfig({
    actorRoles: [requestedRole],
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    escalationBaselineHours: payload.escalationBaselineHours,
    recipients: payload.recipients,
    recipientDirectory,
  });

  if (!saved.ok) {
    const refusalData = 'data' in saved ? saved.data : undefined;
    refusal(res, {
      code: saved.code,
      message: saved.message,
      refusalType: 'business',
      httpStatus: 200,
      data: refusalData,
    });
    return;
  }

  return success(res, {
    code: saved.code,
    message: 'ConnectShyft escalation settings saved',
    httpStatus: saved.httpStatus,
    data: {
      orgUnitId: saved.data.orgUnitId,
      escalationBaselineHours: saved.data.escalationBaselineHours,
      recipients: saved.data.recipients,
      updatedAtUtc: saved.data.updatedAtUtc,
    },
  });
});

router.post('/threads', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'inbox')) {
    return;
  }

  if (!enforceThreadViewCapability(req, res)) {
    return;
  }

  const requestedOrgUnitId = typeof req.body?.orgUnitId === 'string'
    ? req.body.orgUnitId
    : null;
  const context = await enforceOrgUnitContext(req, res, requestedOrgUnitId);
  if (!context) {
    return;
  }

  const fallbackThreadId = 'thread-connectshyft-generated';
  const requestedThreadId = typeof req.body?.threadId === 'string'
    ? req.body.threadId.trim()
    : '';

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_ENSURED',
    message: 'ConnectShyft thread ensured',
    data: {
      threadId: requestedThreadId || fallbackThreadId,
      orgUnitId: context.orgUnitId,
      neighborId: typeof req.body?.neighborId === 'string' ? req.body.neighborId : null,
    },
  });
});

router.post('/threads/:threadId/claim', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'escalation')) {
    return;
  }

  if (!enforceThreadClaimCapability(req, res)) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  if (!enforceEscalationActionMembership(req, res, context.bypassedOrgUnitMembership)) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_CLAIM_READY',
    message: 'ConnectShyft claim action accepted',
    data: {
      threadId: req.params.threadId,
      context,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
    },
  });
});

router.post('/threads/:threadId/takeover', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'escalation')) {
    return;
  }

  if (!enforceThreadTakeoverCapability(req, res)) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  if (!enforceEscalationActionMembership(req, res, context.bypassedOrgUnitMembership)) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_TAKEOVER_READY',
    message: 'ConnectShyft takeover action accepted',
    data: {
      threadId: req.params.threadId,
      context,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
    },
  });
});

router.post('/webhooks/sms', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'webhooks')) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
    message: 'Inbound webhook accepted for processing',
    data: {
      sid: typeof req.body?.sid === 'string' ? req.body.sid : null,
      from: typeof req.body?.from === 'string' ? req.body.from : null,
      to: typeof req.body?.to === 'string' ? req.body.to : null,
    },
  });
});

export default router;
