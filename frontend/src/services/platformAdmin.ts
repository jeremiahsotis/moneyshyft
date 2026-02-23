import api from '@/services/api';

type Envelope<T> = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: T;
  tenantId?: string | null;
};

const unwrapData = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (record.data && typeof record.data === 'object') {
      return record.data as T;
    }

    return record as T;
  }

  return {} as T;
};

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
  reason: string;
};

export type EnsureInlineAdminUserResponse = {
  tenantId: string;
  userId: string;
  email: string;
  createdInline: boolean;
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

export const createTenant = async (input: CreateTenantInput): Promise<Record<string, unknown>> => {
  const response = await api.post<Envelope<Record<string, unknown>>>('/platform/admin/tenants', input);
  return unwrapData<Record<string, unknown>>(response.data);
};

export const createOrgUnit = async (input: CreateOrgUnitInput): Promise<Record<string, unknown>> => {
  const response = await api.post<Envelope<Record<string, unknown>>>('/platform/admin/org-units', input);
  return unwrapData<Record<string, unknown>>(response.data);
};

export const upsertTenantMembership = async (
  input: UpsertTenantMembershipInput
): Promise<Record<string, unknown>> => {
  const response = await api.post<Envelope<Record<string, unknown>>>('/platform/admin/tenant-memberships', input);
  return unwrapData<Record<string, unknown>>(response.data);
};

export const upsertOrgUnitMembership = async (
  input: UpsertOrgUnitMembershipInput
): Promise<Record<string, unknown>> => {
  const response = await api.post<Envelope<Record<string, unknown>>>('/platform/admin/org-unit-memberships', input);
  return unwrapData<Record<string, unknown>>(response.data);
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
  const response = await api.post<Envelope<EnsureInlineAdminUserResponse>>('/platform/admin/users/inline-admin', input);
  return unwrapData<EnsureInlineAdminUserResponse>(response.data);
};
