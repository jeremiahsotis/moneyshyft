import { randomUUID } from 'node:crypto';

export type EnvironmentName = 'development' | 'staging' | 'production';

export type ParentDomainHosts = {
  appHost: string;
  apiHost: string;
  appOrigin: string;
  apiOrigin: string;
  parentDomain: string;
};

export type CsrfGuardRequest = {
  headers: Record<string, string>;
  payload: {
    action: string;
    amountCents: number;
    csrfToken: string;
  };
};

export type CookiePolicyProbe = {
  headers: Record<string, string>;
  payload: {
    environment: EnvironmentName;
    appHost: string;
    apiHost: string;
  };
  expected: {
    environment: EnvironmentName;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    parentDomain: string;
  };
};

type CsrfGuardRequestOverrides = {
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
  authToken?: string;
  includeCsrfHeader?: boolean;
};

type ParentDomainHostOverrides = {
  appHost?: string;
  apiHost?: string;
};

type CookiePolicyProbeOverrides = {
  environment?: EnvironmentName;
  appHost?: string;
  apiHost?: string;
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
};

function deriveParentDomain(host: string): string {
  const segments = host.split('.').filter(Boolean);
  if (segments.length < 2) {
    return `.${host}`;
  }

  return `.${segments.slice(-2).join('.')}`;
}

function getEnvironmentPolicy(environment: EnvironmentName): {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
} {
  if (environment === 'production') {
    return {
      secure: true,
      sameSite: 'strict',
    };
  }

  if (environment === 'staging') {
    return {
      secure: true,
      sameSite: 'lax',
    };
  }

  return {
    secure: false,
    sameSite: 'lax',
  };
}

export function createParentDomainHosts(
  overrides: ParentDomainHostOverrides = {},
): ParentDomainHosts {
  const appHost = overrides.appHost ?? 'app.moneyshyft.test';
  const apiHost = overrides.apiHost ?? 'api.moneyshyft.test';
  const parentDomain = deriveParentDomain(appHost);

  return {
    appHost,
    apiHost,
    appOrigin: `https://${appHost}`,
    apiOrigin: `https://${apiHost}`,
    parentDomain,
  };
}

export function createCsrfGuardRequest(
  overrides: CsrfGuardRequestOverrides = {},
): CsrfGuardRequest {
  const tenantId = overrides.tenantId ?? `tenant-${randomUUID()}`;
  const correlationId = overrides.correlationId ?? `corr-${randomUUID()}`;
  const csrfToken = overrides.csrfToken ?? `csrf-${randomUUID()}`;
  const authToken = overrides.authToken ?? `access-${randomUUID()}`;

  const headers: Record<string, string> = {
    'x-tenant-id': tenantId,
    'x-correlation-id': correlationId,
    authorization: `Bearer ${authToken}`,
  };

  if (overrides.includeCsrfHeader !== false) {
    headers['x-csrf-token'] = csrfToken;
  }

  return {
    headers,
    payload: {
      action: 'state-changing-kernel-mutation',
      amountCents: 2500,
      csrfToken,
    },
  };
}

export function createCookiePolicyProbe(
  overrides: CookiePolicyProbeOverrides = {},
): CookiePolicyProbe {
  const hosts = createParentDomainHosts({
    appHost: overrides.appHost,
    apiHost: overrides.apiHost,
  });
  const environment = overrides.environment ?? 'production';
  const policy = getEnvironmentPolicy(environment);

  const csrfGuard = createCsrfGuardRequest({
    tenantId: overrides.tenantId,
    correlationId: overrides.correlationId,
    csrfToken: overrides.csrfToken,
  });

  return {
    headers: csrfGuard.headers,
    payload: {
      environment,
      appHost: hosts.appHost,
      apiHost: hosts.apiHost,
    },
    expected: {
      environment,
      secure: policy.secure,
      sameSite: policy.sameSite,
      parentDomain: hosts.parentDomain,
    },
  };
}
