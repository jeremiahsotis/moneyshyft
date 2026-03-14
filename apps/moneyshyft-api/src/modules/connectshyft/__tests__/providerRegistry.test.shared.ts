export type HeaderMap = Record<string, string>;

export const buildRequest = (input?: {
  headers?: HeaderMap;
  body?: Record<string, unknown>;
  rawBody?: string;
  tenantId?: string;
  orgUnitId?: string;
}) => {
  const normalizedHeaders: HeaderMap = {};
  Object.entries(input?.headers || {}).forEach(([key, value]) => {
    normalizedHeaders[key.toLowerCase()] = value;
  });

  return {
    body: input?.body || {},
    rawBody: input?.rawBody,
    originalUrl: '/api/v1/connectshyft/webhooks/inbound',
    protocol: 'https',
    url: '/api/v1/connectshyft/webhooks/inbound',
    tenantId: input?.tenantId,
    orgUnitId: input?.orgUnitId,
    header: (name: string) => normalizedHeaders[name.toLowerCase()],
  };
};

export const registerProviderRegistryEnvHooks = (): void => {
  let previousNodeEnv: string | undefined;
  let previousEnableFlags: string | undefined;
  let previousTelnyxPublicKey: string | undefined;
  let previousProviderRolloutAllowlist: string | undefined;

  beforeEach(() => {
    previousNodeEnv = process.env.NODE_ENV;
    previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
    previousTelnyxPublicKey = process.env.TELNYX_PUBLIC_KEY;
    previousProviderRolloutAllowlist = process.env.CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST;
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    delete process.env.CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST;
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags;
    process.env.TELNYX_PUBLIC_KEY = previousTelnyxPublicKey;
    process.env.CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST = previousProviderRolloutAllowlist;
  });
};

export const withScopedEnv = async <T>(
  overrides: Record<string, string | undefined>,
  callback: () => Promise<T> | T,
): Promise<T> => {
  const previousValues = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previousValues.set(key, process.env[key]);
    if (typeof value === 'undefined') {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of previousValues.entries()) {
      if (typeof value === 'undefined') {
        delete process.env[key];
        continue;
      }
      process.env[key] = value;
    }
  }
};
