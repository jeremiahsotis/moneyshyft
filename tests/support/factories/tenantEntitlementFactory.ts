import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

type Story12ContextOverrides = {
  tenantId?: string;
  moduleKey?: string;
  orgUnitCode?: string;
  actorUserId?: string;
  assigneeUserId?: string;
};

type Story12HeaderOverrides = {
  role?: string;
  orgUnitId?: string | null;
  userId?: string;
};

type ModuleEntitlementPayloadOverrides = {
  enabled?: boolean;
  reason?: string;
};

type OrgUnitPayloadOverrides = {
  name?: string;
  code?: string;
};

type RoleAssignmentPayloadOverrides = {
  userId?: string;
  role?: string;
  orgUnitId?: string;
  reason?: string;
};

type InitialTenantAdminPayloadOverrides = {
  assigneeUserId?: string;
};

export function createStory12Context(overrides: Story12ContextOverrides = {}) {
  const tenantId = overrides.tenantId ?? 'tenant-a';
  const moduleKey = overrides.moduleKey ?? 'payroll';
  const orgUnitCode = overrides.orgUnitCode ?? `regional-ops-${randomUUID().slice(0, 8)}`;
  const actorUserId = overrides.actorUserId ?? `actor-${randomUUID()}`;
  const assigneeUserId = overrides.assigneeUserId ?? `assignee-${randomUUID()}`;

  return {
    tenantId,
    moduleKey,
    orgUnitCode,
    actorUserId,
    assigneeUserId,
  };
}

export function createStory12TenantHeaders(
  context: ReturnType<typeof createStory12Context>,
  overrides: Story12HeaderOverrides = {},
): Record<string, string> {
  return createTenantScopeHeaders({
    tenantId: context.tenantId,
    orgUnitId: overrides.orgUnitId ?? null,
    role: overrides.role ?? 'TENANT_ADMIN',
    userId: overrides.userId ?? context.actorUserId,
  });
}

export function createModuleEntitlementPayload(
  overrides: ModuleEntitlementPayloadOverrides = {},
): {
  enabled: boolean;
  reason: string;
} {
  return {
    enabled: overrides.enabled ?? false,
    reason: overrides.reason ?? 'suspend-module',
  };
}

export function createOrgUnitPayload(
  context: ReturnType<typeof createStory12Context>,
  overrides: OrgUnitPayloadOverrides = {},
): {
  name: string;
  code: string;
} {
  return {
    name: overrides.name ?? 'Regional Ops',
    code: overrides.code ?? context.orgUnitCode,
  };
}

export function createRoleAssignmentPayload(
  context: ReturnType<typeof createStory12Context>,
  overrides: RoleAssignmentPayloadOverrides = {},
): {
  userId: string;
  role: string;
  orgUnitId?: string;
  reason: string;
} {
  return {
    userId: overrides.userId ?? context.assigneeUserId,
    role: overrides.role ?? 'ORGUNIT_ADMIN',
    orgUnitId: overrides.orgUnitId,
    reason: overrides.reason ?? 'operations-coverage',
  };
}

export function createInitialTenantAdminPayload(
  context: ReturnType<typeof createStory12Context>,
  overrides: InitialTenantAdminPayloadOverrides = {},
): {
  assigneeUserId: string;
} {
  return {
    assigneeUserId: overrides.assigneeUserId ?? context.assigneeUserId,
  };
}
