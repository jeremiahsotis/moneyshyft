import { randomUUID } from 'node:crypto';

type TenantScopeOverrides = {
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type RepositoryGuardQueryOverrides = {
  resource?: 'accounts' | 'transactions' | 'goals' | 'debts';
  includeDiagnostics?: boolean;
};

type CrossTenantProbeOverrides = {
  sourceTenantId?: string;
  targetTenantId?: string;
  mode?: 'read' | 'write';
};

export function createTenantScopeHeaders(overrides: TenantScopeOverrides = {}): Record<string, string> {
  const tenantId = overrides.tenantId ?? `tenant-${randomUUID()}`;
  const correlationId = overrides.correlationId ?? `corr-${randomUUID()}`;
  const csrfToken = overrides.csrfToken ?? `csrf-${randomUUID()}`;

  return {
    'x-tenant-id': tenantId,
    'x-correlation-id': correlationId,
    'x-csrf-token': csrfToken,
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
  const targetTenantId = overrides.targetTenantId ?? `tenant-${randomUUID()}`;
  const mode = overrides.mode ?? 'read';

  const queryParams = new URLSearchParams({
    resource: 'transactions',
    tenantOverride: targetTenantId,
    mode,
  });

  return {
    sourceTenantId,
    targetTenantId,
    mode,
    query: `?${queryParams.toString()}`,
    payload: {
      sourceTenantId,
      targetTenantId,
      mode,
      mutation: {
        action: 'upsert',
        aggregate: 'transaction',
        id: `txn-${randomUUID()}`,
      },
    },
  };
}
