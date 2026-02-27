export const SYSTEM_ROLES = ['SYSTEM_ADMIN'] as const;
export const TENANT_ROLES = ['TENANT_ADMIN', 'TENANT_STAFF', 'TENANT_VIEWER'] as const;
export const ORG_UNIT_ROLES = ['ORGUNIT_ADMIN', 'ORGUNIT_MEMBER', 'ORGUNIT_IDENTITY_LEAD'] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type TenantRole = (typeof TENANT_ROLES)[number];
export type OrgUnitRole = (typeof ORG_UNIT_ROLES)[number];
export type ScopedRole = SystemRole | TenantRole | OrgUnitRole;

export const CAPABILITIES = {
  TENANT_CREATE: 'platform:tenant:create',
  TENANT_DELETE: 'platform:tenant:delete',
  TENANT_ADMIN_ASSIGN: 'platform:tenant_admin:assign',
  BILLING_ASSIGN: 'platform:billing:assign',
  PLATFORM_CONFIG: 'platform:config:manage',
  IMPERSONATE: 'platform:impersonate',
  DATA_VIEW_ALL: 'platform:data:view_all',

  ORG_UNIT_CREATE: 'tenant:org_unit:create',
  ORG_UNIT_UPDATE: 'tenant:org_unit:update',
  MODULE_ENTITLEMENT_MANAGE: 'tenant:module_entitlement:manage',
  TENANT_MODULE_ASSIGN_BOUNDED: 'tenant:module_entitlement:assign_bounded',
  TENANT_ROLE_ASSIGN: 'tenant:role:assign',
  ORG_UNIT_ADMIN_ASSIGN: 'tenant:org_unit_admin:assign',
  THREAD_VIEW_ALL: 'tenant:thread:view_all',
  THREAD_TAKEOVER_ALL: 'tenant:thread:takeover_all',
  NEIGHBOR_EDIT_ALL: 'tenant:neighbor:edit_all',
  NEIGHBOR_MERGE: 'tenant:neighbor:merge',
  NUMBER_MAPPING_MANAGE: 'tenant:number_mapping:manage',
  ESCALATION_ANALYTICS_VIEW: 'tenant:escalation_analytics:view',
  TENANT_READ_ALL: 'tenant:read_all',

  ORG_UNIT_ESCALATION_CONFIG: 'org_unit:escalation:configure',
  ORG_UNIT_MEMBERSHIP_MANAGE: 'org_unit:membership:manage',
  ORG_UNIT_THREAD_VIEW: 'org_unit:thread:view',
  ORG_UNIT_THREAD_CLAIM: 'org_unit:thread:claim',
  ORG_UNIT_THREAD_TAKEOVER: 'org_unit:thread:takeover',
  ORG_UNIT_THREAD_CLOSE: 'org_unit:thread:close',
  ORG_UNIT_SMS_SEND: 'org_unit:sms:send',
  ORG_UNIT_CALL_INITIATE: 'org_unit:call:initiate',
  ORG_UNIT_NEIGHBOR_EDIT_RELATED: 'org_unit:neighbor:edit_related',
  ORG_UNIT_IDENTITY_MERGE: 'org_unit:identity:merge',
  ORG_UNIT_IDENTITY_RESOLVE: 'org_unit:identity:resolve',
  ORG_UNIT_IDENTITY_MARK_UNIDENTIFIED: 'org_unit:identity:mark_unidentified',
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

const ROLE_CAPABILITY_MAP: Record<ScopedRole, Set<Capability>> = {
  SYSTEM_ADMIN: new Set<Capability>(Object.values(CAPABILITIES)),

  TENANT_ADMIN: new Set<Capability>([
    CAPABILITIES.ORG_UNIT_CREATE,
    CAPABILITIES.ORG_UNIT_UPDATE,
    CAPABILITIES.MODULE_ENTITLEMENT_MANAGE,
    CAPABILITIES.TENANT_MODULE_ASSIGN_BOUNDED,
    CAPABILITIES.TENANT_ROLE_ASSIGN,
    CAPABILITIES.ORG_UNIT_ADMIN_ASSIGN,
    CAPABILITIES.THREAD_VIEW_ALL,
    CAPABILITIES.THREAD_TAKEOVER_ALL,
    CAPABILITIES.NEIGHBOR_EDIT_ALL,
    CAPABILITIES.NEIGHBOR_MERGE,
    CAPABILITIES.TENANT_READ_ALL,
  ]),

  TENANT_STAFF: new Set<Capability>([
    CAPABILITIES.THREAD_VIEW_ALL,
    CAPABILITIES.THREAD_TAKEOVER_ALL,
    CAPABILITIES.NEIGHBOR_EDIT_ALL,
    CAPABILITIES.NUMBER_MAPPING_MANAGE,
    CAPABILITIES.ESCALATION_ANALYTICS_VIEW,
    CAPABILITIES.TENANT_READ_ALL,
  ]),

  TENANT_VIEWER: new Set<Capability>([
    CAPABILITIES.TENANT_READ_ALL,
    CAPABILITIES.THREAD_VIEW_ALL,
    CAPABILITIES.ESCALATION_ANALYTICS_VIEW,
  ]),

  ORGUNIT_ADMIN: new Set<Capability>([
    CAPABILITIES.ORG_UNIT_ESCALATION_CONFIG,
    CAPABILITIES.NUMBER_MAPPING_MANAGE,
    CAPABILITIES.ORG_UNIT_MEMBERSHIP_MANAGE,
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.ORG_UNIT_THREAD_CLAIM,
    CAPABILITIES.ORG_UNIT_THREAD_TAKEOVER,
    CAPABILITIES.ORG_UNIT_THREAD_CLOSE,
    CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
  ]),

  ORGUNIT_MEMBER: new Set<Capability>([
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.ORG_UNIT_THREAD_CLAIM,
    CAPABILITIES.ORG_UNIT_SMS_SEND,
    CAPABILITIES.ORG_UNIT_CALL_INITIATE,
    CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
    CAPABILITIES.ORG_UNIT_THREAD_CLOSE,
  ]),

  ORGUNIT_IDENTITY_LEAD: new Set<Capability>([
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.ORG_UNIT_IDENTITY_MERGE,
    CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE,
    CAPABILITIES.ORG_UNIT_IDENTITY_MARK_UNIDENTIFIED,
    CAPABILITIES.NEIGHBOR_MERGE,
  ]),
};

const ALL_ROLES = [...SYSTEM_ROLES, ...TENANT_ROLES, ...ORG_UNIT_ROLES] as const;
const ROLE_SET = new Set<string>(ALL_ROLES);

export const normalizeRole = (role: string | null | undefined): ScopedRole | null => {
  if (typeof role !== 'string') {
    return null;
  }

  const normalized = role.trim().toUpperCase();
  if (!ROLE_SET.has(normalized)) {
    return null;
  }

  return normalized as ScopedRole;
};

export const normalizeRoles = (roles: Array<string | null | undefined>): ScopedRole[] => {
  const normalized = roles
    .map((role) => normalizeRole(role))
    .filter((role): role is ScopedRole => role !== null);

  return Array.from(new Set(normalized));
};

export const getCapabilitiesForRoles = (roles: Array<string | null | undefined>): Set<Capability> => {
  const normalizedRoles = normalizeRoles(roles);
  const resolved = new Set<Capability>();

  normalizedRoles.forEach((role) => {
    ROLE_CAPABILITY_MAP[role].forEach((capability) => resolved.add(capability));
  });

  return resolved;
};

export const hasCapability = (
  roles: Array<string | null | undefined>,
  capability: Capability
): boolean => getCapabilitiesForRoles(roles).has(capability);
