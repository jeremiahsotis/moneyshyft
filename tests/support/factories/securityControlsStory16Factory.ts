import { randomUUID } from 'node:crypto';
import {
  createCookiePolicyProbe,
  createCsrfGuardRequest,
  type CookiePolicyProbe,
  type CsrfGuardRequest,
} from './csrfCookiePolicyFactory';
import {
  createCrossTenantProbe,
  createTenantScopeHeaders,
} from './tenantRepositoryFactory';

type Story16ContextOverrides = {
  tenantId?: string;
  crossTenantId?: string;
  orgUnitId?: string | null;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  securityDashboardPath?: string;
  redactionReportPath?: string;
};

type Story16TenantHeaderOverrides = {
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  csrfToken?: string;
};

type Story16CsrfProbeOverrides = {
  includeCsrfHeader?: boolean;
  csrfToken?: string;
};

export type Story16RedactionProbe = {
  payload: {
    scope: {
      tenantId: string;
      actorUserId: string;
      correlationId: string;
    };
    auditEvent: {
      eventName: string;
      action: string;
      metadata: Record<string, string>;
      sensitive: {
        accessToken: string;
        refreshToken: string;
        password: string;
        apiKey: string;
      };
    };
  };
  expected: {
    redactedFields: string[];
    preservedPaths: string[];
    forbiddenPlaintextMarkers: string[];
  };
};

export type Story16Context = {
  storyId: string;
  tenantId: string;
  crossTenantId: string;
  orgUnitId: string | null;
  userId: string;
  correlationId: string;
  csrfToken: string;
  securityDashboardPath: string;
  redactionReportPath: string;
};

export function createStory16Context(
  overrides: Story16ContextOverrides = {},
): Story16Context {
  return {
    storyId: '1-6',
    tenantId: overrides.tenantId ?? `story16-tenant-${randomUUID().slice(0, 8)}`,
    crossTenantId:
      overrides.crossTenantId ?? `story16-tenant-cross-${randomUUID().slice(0, 8)}`,
    orgUnitId: overrides.orgUnitId ?? null,
    userId: overrides.userId ?? `story16-user-${randomUUID().slice(0, 8)}`,
    correlationId:
      overrides.correlationId ?? `corr-story16-${randomUUID().slice(0, 8)}`,
    csrfToken: overrides.csrfToken ?? `csrf-story16-${randomUUID().slice(0, 8)}`,
    securityDashboardPath:
      overrides.securityDashboardPath ?? '/platform/security-verification',
    redactionReportPath:
      overrides.redactionReportPath ??
      '/api/v1/platform/_kernel/security/redaction/verify',
  };
}

export function createStory16TenantHeaders(
  context: Story16Context,
  overrides: Story16TenantHeaderOverrides = {},
): Record<string, string> {
  return createTenantScopeHeaders({
    tenantId: context.tenantId,
    orgUnitId:
      overrides.orgUnitId === undefined ? context.orgUnitId : overrides.orgUnitId,
    role: overrides.role ?? 'TENANT_ADMIN',
    userId: overrides.userId ?? context.userId,
    correlationId: context.correlationId,
    csrfToken: overrides.csrfToken ?? context.csrfToken,
  });
}

export function createStory16CrossTenantReadProbe(context: Story16Context) {
  return createCrossTenantProbe({
    sourceTenantId: context.tenantId,
    sourceOrgUnitId: context.orgUnitId,
    targetTenantId: context.crossTenantId,
    mode: 'read',
  });
}

export function createStory16CrossTenantWriteProbe(context: Story16Context) {
  return createCrossTenantProbe({
    sourceTenantId: context.tenantId,
    sourceOrgUnitId: context.orgUnitId,
    targetTenantId: context.crossTenantId,
    mode: 'write',
  });
}

export function createStory16CsrfGuardProbe(
  context: Story16Context,
  overrides: Story16CsrfProbeOverrides = {},
): CsrfGuardRequest {
  return createCsrfGuardRequest({
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    csrfToken: overrides.csrfToken ?? context.csrfToken,
    includeCsrfHeader: overrides.includeCsrfHeader ?? true,
  });
}

export function createStory16CookiePolicyProbe(
  context: Story16Context,
): CookiePolicyProbe {
  return createCookiePolicyProbe({
    environment: 'production',
    appHost: 'app.moneyshyft.test',
    apiHost: 'api.moneyshyft.test',
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    csrfToken: context.csrfToken,
  });
}

export function createStory16RedactionProbe(
  context: Story16Context,
): Story16RedactionProbe {
  const plaintextAccessToken = `plain-access-token-${context.storyId}`;
  const plaintextRefreshToken = `plain-refresh-token-${context.storyId}`;
  const plaintextPassword = 'PlaintextPassword!23';
  const plaintextApiKey = `plain-api-key-${context.storyId}`;

  return {
    payload: {
      scope: {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        correlationId: context.correlationId,
      },
      auditEvent: {
        eventName: 'platform.security.redaction-verification',
        action: 'verify-security-redaction',
        metadata: {
          source: 'story-1-6-atdd',
          channel: 'platform-kernel',
        },
        sensitive: {
          accessToken: plaintextAccessToken,
          refreshToken: plaintextRefreshToken,
          password: plaintextPassword,
          apiKey: plaintextApiKey,
        },
      },
    },
    expected: {
      redactedFields: [
        'accessToken',
        'refreshToken',
        'password',
        'apiKey',
      ],
      preservedPaths: [
        'scope.tenantId',
        'scope.actorUserId',
        'scope.correlationId',
        'auditEvent.eventName',
        'auditEvent.action',
      ],
      forbiddenPlaintextMarkers: [
        plaintextAccessToken,
        plaintextRefreshToken,
        plaintextPassword,
        plaintextApiKey,
      ],
    },
  };
}
