import { randomUUID } from 'node:crypto';
import { generateAccessToken, type JWTPayload } from '../../../src/src/utils/jwt';

type TenantScopeOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  email?: string;
  correlationId?: string;
  csrfToken?: string;
};

type RepositoryGuardQueryOverrides = {
  resource?: 'accounts' | 'transactions' | 'goals' | 'debts';
  includeDiagnostics?: boolean;
};

type CrossTenantProbeOverrides = {
  sourceTenantId?: string;
  sourceOrgUnitId?: string | null;
  targetTenantId?: string;
  targetOrgUnitId?: string | null;
  mode?: 'read' | 'write';
};

export function createTenantScopeHeaders(overrides: TenantScopeOverrides = {}): Record<string, string> {
  const tenantId = overrides.tenantId ?? `tenant-${randomUUID()}`;
  const orgUnitId = overrides.orgUnitId ?? null;
  const role = overrides.role ?? 'TENANT_STAFF';
  const userId = overrides.userId ?? `user-${randomUUID()}`;
  const email = overrides.email ?? `${userId}@example.com`;
  const correlationId = overrides.correlationId ?? `corr-${randomUUID()}`;
  const csrfToken = overrides.csrfToken ?? `csrf-${randomUUID()}`;
  const payload: JWTPayload = {
    userId,
    email,
    householdId: tenantId,
    activeTenantId: tenantId,
    activeOrgUnitId: orgUnitId,
    role,
  };
  const accessToken = generateAccessToken(payload);

  return {
    'x-correlation-id': correlationId,
    'x-csrf-token': csrfToken,
    cookie: `access_token=${accessToken}; csrf_token=${csrfToken}`,
  };
}

export function createRepositoryGuardQuery(overrides: RepositoryGuardQueryOverrides = {}): string {
  const resource = overrides.resource ?? 'transactions';
  const includeDiagnostics = overrides.includeDiagnostics ?? true;

  const params = new URLSearchParams({
    resource,
    includeDiagnostics: String(includeDiagnostics),
  });

  return `?${params.toString()}`;
}

export function createCrossTenantProbe(overrides: CrossTenantProbeOverrides = {}) {
  const sourceTenantId = overrides.sourceTenantId ?? `tenant-${randomUUID()}`;
  const sourceOrgUnitId = overrides.sourceOrgUnitId ?? null;
  const targetTenantId = overrides.targetTenantId ?? `tenant-${randomUUID()}`;
  const targetOrgUnitId = overrides.targetOrgUnitId ?? null;
  const mode = overrides.mode ?? 'read';

  const queryParams = new URLSearchParams({
    resource: 'transactions',
    tenantOverride: targetTenantId,
    mode,
  });

  if (targetOrgUnitId) {
    queryParams.set('orgUnitOverride', targetOrgUnitId);
  }

  return {
    sourceTenantId,
    sourceOrgUnitId,
    targetTenantId,
    targetOrgUnitId,
    mode,
    query: `?${queryParams.toString()}`,
    payload: {
      sourceTenantId,
      sourceOrgUnitId,
      targetTenantId,
      targetOrgUnitId,
      mode,
      mutation: {
        action: 'upsert',
        aggregate: 'transaction',
        id: `txn-${randomUUID()}`,
      },
    },
  };
}
