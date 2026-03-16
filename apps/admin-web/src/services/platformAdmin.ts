import api from '@/services/api';
import {
  createAdminClient,
  unwrapData,
  type AdminEnvelope as Envelope,
} from '../../../../libs/ui-shell/dist/adminClient';
const { adminDelete, adminPatch, adminPost, adminPut } = createAdminClient(api);

export type AdminModuleKey = 'connectshyft' | 'moneyshyft';
export type AdminNodeType = 'SUBTENANT' | 'ORGUNIT' | 'GROUP';
export type AdminIntegritySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type RbacEvaluation = {
  roles: string[];
  capabilities: string[];
  tenantId?: string | null;
  moduleEntitlements?: {
    connectshyft?: boolean;
    moneyshyft?: boolean;
  };
};

export type CreateTenantInput = {
  name: string;
  status?: string;
  billingAccountName?: string;
  assignTenantAdminUserId?: string;
  assignTenantAdminUserEmail?: string;
  assignTenantAdminFirstName?: string;
  assignTenantAdminLastName?: string;
  assignTenantAdminTemporaryPassword?: string;
  assignTenantAdminForceResetOnFirstLogin?: boolean;
  tenancyModel?: 'single-tenant' | 'multi-tenant';
  moduleGrants?: {
    connectshyft?: boolean;
    moneyshyft?: boolean;
  };
  reason?: string;
};

export type CreateOrgUnitInput = {
  tenantId?: string;
  name: string;
  type?: string;
  parentOrgUnitId?: string | null;
  status?: string;
  reason: string;
};

export type UpsertTenantMembershipInput = {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  roleSet: string[];
  reason: string;
};

export type UpsertOrgUnitMembershipInput = {
  tenantId?: string;
  orgUnitId: string;
  userId?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  roleSet: string[];
  reason: string;
};

export type ScopedLookupUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type ScopedLookupResponse = {
  tenantId: string;
  orgUnitId: string | null;
  q: string;
  page: number;
  pageSize: number;
  total: number;
  users: ScopedLookupUser[];
};

export type EnsureInlineAdminUserInput = {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  temporaryPassword?: string;
  forceResetOnFirstLogin?: boolean;
  reason: string;
};

export type EnsureInlineAdminUserResponse = {
  tenantId: string;
  userId: string;
  email: string;
  createdInline: boolean;
};

export type TenantStructureRules = {
  maxDepth: number;
  allowedNodeTypes: AdminNodeType[];
  allowViewerRole: boolean;
};

export type TenantModuleEntitlement = {
  moduleKey: AdminModuleKey;
  enabled: boolean;
  reason?: string;
  updatedAtUtc?: string;
};

export type TenantSummary = {
  id: string;
  name: string;
  status: string;
  tenancyModel: string;
  moduleEntitlements: TenantModuleEntitlement[];
  structureRules: TenantStructureRules | null;
  adminCount: number;
};

export type TenantAdminIdentity = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type TenantDetail = {
  tenant: {
    id: string;
    name: string;
    status: string;
    tenancyModel: string;
    structureRules: TenantStructureRules;
    moduleEntitlements: TenantModuleEntitlement[];
    admins: TenantAdminIdentity[];
  };
};

export type GlobalUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  householdId: string | null;
  role: string;
  lastLoginAt?: string;
};

export type GlobalUsersResponse = {
  page: number;
  pageSize: number;
  total: number;
  users: GlobalUser[];
};

export type StructureNode = {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  nodeType: AdminNodeType;
  parentId: string | null;
  depth: number;
  admins: Array<{ id: string; name: string; email: string }>;
  moduleOverrides: Record<string, boolean>;
  moduleEffective: Record<string, boolean>;
  children: StructureNode[];
};

export type StructureTreeResponse = {
  tenantId: string;
  rules: TenantStructureRules;
  roots: StructureNode[];
  flat: StructureNode[];
};

export type NodeAdminAssignmentInput = {
  mode: 'create' | 'select';
  userId?: string;
  userEmail?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  temporaryPassword?: string;
  forceResetOnFirstLogin?: boolean;
};

export type CreateStructureNodeInput = {
  tenantId?: string;
  type: AdminNodeType;
  name: string;
  parentId?: string | null;
  reason?: string;
  adminAssignment?: NodeAdminAssignmentInput;
  modulesOverrides?: Partial<Record<AdminModuleKey, boolean>>;
};

export type UpdateStructureNodeInput = {
  tenantId?: string;
  name?: string;
  type?: AdminNodeType;
  modulesOverrides?: Partial<Record<AdminModuleKey, boolean>>;
};

export type MoveStructureNodesInput = {
  tenantId?: string;
  nodeIds: string[];
  newParentId?: string | null;
};

export type NodeModuleOverrideInput = {
  tenantId?: string;
  moduleKey: AdminModuleKey;
  enabled: boolean;
};

export type BulkNodeModuleOverrideInput = {
  tenantId?: string;
  nodeIds: string[];
  moduleKey: AdminModuleKey;
  enabled: boolean;
};

export type TenantPerson = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  nodeId?: string | null;
  mustResetPassword: boolean;
  lastLoginAt?: string;
};

export type TenantPeopleResponse = {
  tenantId: string;
  page: number;
  pageSize: number;
  total: number;
  users: TenantPerson[];
};

export type CreateTenantPersonInput = {
  tenantId?: string;
  email: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
  forceResetOnFirstLogin?: boolean;
  nodeId?: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
};

export type UpdateTenantPersonInput = {
  tenantId?: string;
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
  nodeId?: string;
  archiveUser?: boolean;
};

export type IntegrityIssueFixAction = {
  actionType: string;
  target: Record<string, unknown>;
};

export type IntegrityIssueItem = {
  id: string;
  label: string;
  context: Record<string, unknown>;
  fixAction: IntegrityIssueFixAction;
};

export type IntegrityIssue = {
  issueType: string;
  severity: AdminIntegritySeverity;
  count: number;
  items: IntegrityIssueItem[];
};

export type IntegritySummaryTenant = {
  tenantId: string;
  tenantName: string;
  status: string;
  totalIssues: number;
  countsBySeverity: Record<string, number>;
  topIssues: Array<{ issueType: string; severity: AdminIntegritySeverity; count: number }>;
};

export type IntegritySummaryResponse = {
  tenants: IntegritySummaryTenant[];
};

export type IntegrityIssuesResponse = {
  tenantId: string;
  issues: IntegrityIssue[];
};

export type IntegrityFixInput = {
  tenantId?: string;
  actionType: string;
  target: Record<string, unknown>;
};

export type AuditEvent = {
  id: string;
  tenantId: string;
  actorId: string | null;
  eventName: string;
  entityType: string;
  entityId: string;
  occurredAtUtc: string;
  payload?: Record<string, unknown>;
};

export type AuditEventsResponse = {
  tenantId: string;
  page: number;
  pageSize: number;
  total: number;
  events: AuditEvent[];
};

export const evaluateRbac = async (params: {
  tenantId?: string | null;
  orgUnitId?: string | null;
} = {}): Promise<RbacEvaluation> => {
  const response = await api.get<Envelope<RbacEvaluation>>('/platform/admin/rbac/evaluate', {
    params: {
      tenantId: params.tenantId || undefined,
      orgUnitId: params.orgUnitId || undefined,
    },
  });

  return unwrapData<RbacEvaluation>(response.data);
};

export const listTenants = async (params: {
  tenantId?: string;
  query?: string;
  status?: string;
  module?: AdminModuleKey;
} = {}): Promise<{ tenants: TenantSummary[] }> => {
  const response = await api.get<Envelope<{ tenants: TenantSummary[] }>>('/platform/admin/tenants', {
    params,
  });

  return unwrapData<{ tenants: TenantSummary[] }>(response.data);
};

export const getTenantDetail = async (tenantId: string): Promise<TenantDetail> => {
  const response = await api.get<Envelope<TenantDetail>>(`/platform/admin/tenants/${tenantId}`);
  return unwrapData<TenantDetail>(response.data);
};

export const updateTenantModules = async (
  tenantId: string,
  input: { modulesEnabled: AdminModuleKey[]; reason?: string },
): Promise<{ tenantId: string; modulesEnabled: AdminModuleKey[] }> => {
  return adminPatch<{ tenantId: string; modulesEnabled: AdminModuleKey[] }>(
    `/platform/admin/tenants/${tenantId}/modules`,
    {
      modulesEnabled: input.modulesEnabled,
      reason: input.reason,
    },
  );
};

export const updateTenantStructureRules = async (
  tenantId: string,
  input: TenantStructureRules,
): Promise<{ tenantId: string; maxDepth: number; allowedNodeTypes: AdminNodeType[]; allowViewerRole: boolean }> => {
  return adminPatch(`/platform/admin/tenants/${tenantId}/structure-rules`, {
    maxDepth: input.maxDepth,
    allowedNodeTypes: input.allowedNodeTypes,
    allowViewerRole: input.allowViewerRole,
  });
};

export const assignTenantAdmin = async (
  tenantId: string,
  input: {
    mode: 'create' | 'select';
    userId?: string;
    userEmail?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    temporaryPassword?: string;
    forceResetOnFirstLogin?: boolean;
    reason?: string;
  },
): Promise<{
  tenantId: string;
  userId: string;
  userEmail: string;
  createdInline: boolean;
  reason: string;
}> => {
  return adminPost(`/platform/admin/tenants/${tenantId}/admins`, input);
};

export const removeTenantAdmin = async (
  tenantId: string,
  userId: string,
): Promise<{ tenantId: string; userId: string }> => {
  return adminDelete(`/platform/admin/tenants/${tenantId}/admins/${userId}`);
};

export const listGlobalUsers = async (params: {
  tenantId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<GlobalUsersResponse> => {
  const response = await api.get<Envelope<GlobalUsersResponse>>('/platform/admin/users/global', {
    params,
  });

  return unwrapData<GlobalUsersResponse>(response.data);
};

export const getStructureTree = async (params: { tenantId?: string } = {}): Promise<StructureTreeResponse> => {
  const response = await api.get<Envelope<StructureTreeResponse>>('/platform/admin/structure/tree', {
    params,
  });

  return unwrapData<StructureTreeResponse>(response.data);
};

export const createStructureNode = async (input: CreateStructureNodeInput): Promise<{
  tenantId: string;
  reason: string;
  node: {
    id: string;
    name: string;
    status: string;
    nodeType: AdminNodeType;
    parentId: string | null;
  };
}> => {
  return adminPost('/platform/admin/structure/nodes', input);
};

export const updateStructureNode = async (
  nodeId: string,
  input: UpdateStructureNodeInput,
): Promise<{ tenantId: string; nodeId: string }> => {
  return adminPatch(`/platform/admin/structure/nodes/${nodeId}`, input);
};

export const moveStructureNodes = async (
  input: MoveStructureNodesInput,
): Promise<{ tenantId: string; nodeIds: string[]; newParentId: string | null }> => {
  return adminPost('/platform/admin/structure/nodes/move', input);
};

export const archiveStructureNode = async (
  nodeId: string,
  input: { tenantId?: string } = {},
): Promise<{ tenantId: string; nodeId: string }> => {
  return adminPost(`/platform/admin/structure/nodes/${nodeId}/archive`, input);
};

export const restoreStructureNode = async (
  nodeId: string,
  input: { tenantId?: string; newParentId?: string } = {},
): Promise<{ nodeId: string; tenantId: string; parentId: string | null; requiresParentSelection: boolean }> => {
  return adminPost(`/platform/admin/structure/nodes/${nodeId}/restore`, input);
};

export const assignStructureNodeAdmin = async (
  nodeId: string,
  input: { tenantId?: string; adminAssignment: NodeAdminAssignmentInput },
): Promise<{
  tenantId: string;
  nodeId: string;
  userId: string;
  userEmail: string;
  createdInline: boolean;
}> => {
  return adminPost(`/platform/admin/structure/nodes/${nodeId}/admin`, input);
};

export const updateStructureNodeModuleOverride = async (
  nodeId: string,
  input: NodeModuleOverrideInput,
): Promise<{ tenantId: string; nodeId: string; moduleKey: AdminModuleKey; enabled: boolean }> => {
  return adminPatch(`/platform/admin/structure/nodes/${nodeId}/modules`, input);
};

export const bulkToggleStructureNodeModules = async (
  input: BulkNodeModuleOverrideInput,
): Promise<{ tenantId: string; nodeIds: string[]; moduleKey: AdminModuleKey; enabled: boolean }> => {
  return adminPost('/platform/admin/structure/nodes/modules/bulk-toggle', input);
};

export const listTenantPeople = async (params: {
  tenantId?: string;
  query?: string;
  nodeId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<TenantPeopleResponse> => {
  const response = await api.get<Envelope<TenantPeopleResponse>>('/platform/admin/people', { params });
  return unwrapData<TenantPeopleResponse>(response.data);
};

export const createTenantPerson = async (input: CreateTenantPersonInput): Promise<{
  tenantId: string;
  user: TenantPerson;
}> => {
  return adminPost('/platform/admin/people', input);
};

export const updateTenantPerson = async (
  userId: string,
  input: UpdateTenantPersonInput,
): Promise<{ tenantId: string; userId: string; role: string | null; nodeId: string | null }> => {
  return adminPatch(`/platform/admin/people/${userId}`, input);
};

export const getIntegritySummary = async (params: { tenantId?: string } = {}): Promise<IntegritySummaryResponse> => {
  const response = await api.get<Envelope<IntegritySummaryResponse>>('/platform/admin/integrity/summary', { params });
  return unwrapData<IntegritySummaryResponse>(response.data);
};

export const getIntegrityIssues = async (params: { tenantId?: string } = {}): Promise<IntegrityIssuesResponse> => {
  const response = await api.get<Envelope<IntegrityIssuesResponse>>('/platform/admin/integrity', { params });
  return unwrapData<IntegrityIssuesResponse>(response.data);
};

export const applyIntegrityFix = async (input: IntegrityFixInput): Promise<{
  tenantId: string;
  actionType: string;
  target: Record<string, unknown>;
}> => {
  return adminPost('/platform/admin/integrity/fix', input);
};

export const listAuditEvents = async (params: {
  tenantId?: string;
  actorId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AuditEventsResponse> => {
  const response = await api.get<Envelope<AuditEventsResponse>>('/platform/admin/audit/events', {
    params,
  });

  return unwrapData<AuditEventsResponse>(response.data);
};

export const createTenant = async (input: CreateTenantInput): Promise<Record<string, unknown>> => {
  return adminPost<Record<string, unknown>>('/platform/admin/tenants', input);
};

export const createOrgUnit = async (input: CreateOrgUnitInput): Promise<Record<string, unknown>> => {
  return adminPost<Record<string, unknown>>('/platform/admin/org-units', input);
};

export const upsertTenantMembership = async (
  input: UpsertTenantMembershipInput
): Promise<Record<string, unknown>> => {
  return adminPost<Record<string, unknown>>('/platform/admin/tenant-memberships', input);
};

export const upsertOrgUnitMembership = async (
  input: UpsertOrgUnitMembershipInput
): Promise<Record<string, unknown>> => {
  return adminPost<Record<string, unknown>>('/platform/admin/org-unit-memberships', input);
};

export const lookupScopedUsers = async (params: {
  tenantId?: string | null;
  orgUnitId?: string | null;
  q: string;
  page?: number;
  pageSize?: number;
}): Promise<ScopedLookupResponse> => {
  const response = await api.get<Envelope<ScopedLookupResponse>>('/platform/admin/users/lookup', {
    params: {
      tenantId: params.tenantId || undefined,
      orgUnitId: params.orgUnitId || undefined,
      q: params.q,
      page: params.page,
      pageSize: params.pageSize,
    },
  });

  return unwrapData<ScopedLookupResponse>(response.data);
};

export const ensureInlineAdminUser = async (
  input: EnsureInlineAdminUserInput
): Promise<EnsureInlineAdminUserResponse> => {
  return adminPost<EnsureInlineAdminUserResponse>('/platform/admin/users/inline-admin', input);
};

export const updateModuleEntitlement = async (input: {
  tenantId?: string;
  moduleKey: AdminModuleKey;
  enabled: boolean;
  reason: string;
}): Promise<Record<string, unknown>> => {
  return adminPut<Record<string, unknown>>('/platform/admin/module-entitlements', input);
};

export type AdminUserPasswordResetInput = {
  tenantId?: string;
  orgUnitId?: string;
  userId?: string;
  userEmail?: string;
  mode: 'temporary' | 'link';
  temporaryPassword?: string;
  resetBaseUrl?: string;
  reason: string;
};

export type AdminUserPasswordResetResponse = {
  tenantId: string;
  userId: string;
  mode: 'temporary' | 'link';
  mustResetPassword?: boolean;
  resetLink?: string;
  expiresAtUtc?: string;
};

export const resetUserPassword = async (
  input: AdminUserPasswordResetInput
): Promise<AdminUserPasswordResetResponse> => {
  return adminPost<AdminUserPasswordResetResponse>('/platform/admin/users/password-reset', input);
};
