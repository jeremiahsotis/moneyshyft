import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import {
  ConnectShyftProviderDispatchPolicyError,
  resolveConnectShyftProviderAdapter,
  resolveConnectShyftRequestedProviderKey,
} from '../providerRegistry';

type HeaderMap = Record<string, string>;

const buildRequest = (input?: {
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

describe('connectshyft provider registry', () => {
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

  it('resolves deterministic default provider from enabled registry order', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
          'x-test-connectshyft-disabled-providers': JSON.stringify(['twilio']),
        },
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected deterministic provider resolution to succeed');
    }

    expect(result.providerResolution).toEqual({
      requestedProvider: 'telnyx',
      resolvedProvider: 'telnyx',
      deterministic: true,
    });
  });

  it('returns disabled-provider refusal metadata with explicit no-side-effect contract', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
          'x-test-connectshyft-disabled-providers': JSON.stringify(['twilio']),
        },
        body: {
          providerKey: 'twilio',
        },
      }),
      operation: 'message',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected disabled provider resolution refusal');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'twilio',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-disabled',
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: 'connectshyft.provider.disabled',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('returns unavailable-provider refusal with actionable metadata for missing adapters', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
        },
        body: {
          providerKey: 'legacy-provider',
        },
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected unavailable provider refusal');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_UNAVAILABLE',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'legacy-provider',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-registered',
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: 'connectshyft.provider.unavailable',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('fails closed when rollout allow-list excludes the request tenant/orgUnit context', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
          'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
            telnyx: {
              tenantIds: ['tenant-connectshyft-allowed'],
              orgUnitIds: ['org-connectshyft-allowed'],
              tenantOrgUnitPairs: ['tenant-connectshyft-allowed::org-connectshyft-allowed'],
            },
          }),
        },
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-blocked',
        orgUnitId: 'org-connectshyft-blocked',
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected rollout allow-list refusal for excluded tenant/orgUnit');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-allowlisted',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('allows resolution when rollout allow-list includes the request tenant/orgUnit context', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
          'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
            telnyx: {
              tenantIds: [],
              orgUnitIds: [],
              tenantOrgUnitPairs: ['tenant-connectshyft-f1::org-connectshyft-f1-east'],
            },
          }),
        },
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
      }),
      operation: 'message',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected allow-listed provider resolution to succeed');
    }

    expect(result.providerResolution).toEqual({
      requestedProvider: 'telnyx',
      resolvedProvider: 'telnyx',
      deterministic: true,
    });
  });

  it('fails closed when rollout allow-list configuration is invalid JSON', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
          'x-test-connectshyft-provider-rollout-allowlist': '{not-valid-json',
        },
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected invalid rollout allow-list configuration to fail closed');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-allowlisted',
        },
      },
    });
  });

  it('defers webhook allow-list gating without context and enforces after context is known', () => {
    const headers = {
      'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
      'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
        telnyx: {
          tenantIds: ['tenant-connectshyft-f2'],
          orgUnitIds: ['org-connectshyft-f2-east'],
          tenantOrgUnitPairs: ['tenant-connectshyft-f2::org-connectshyft-f2-east'],
        },
      }),
    };

    const preCorrelation = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers,
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'webhook',
    });

    expect(preCorrelation.ok).toBe(true);
    if (!preCorrelation.ok) {
      throw new Error('Expected webhook provider resolution to defer allow-list gating before correlation context');
    }

    const postCorrelation = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers,
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
      }),
      operation: 'webhook',
    });

    expect(postCorrelation.ok).toBe(false);
    if (postCorrelation.ok) {
      throw new Error('Expected webhook provider resolution to fail once correlation context is evaluated');
    }

    expect(postCorrelation.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-allowlisted',
        },
      },
    });
  });

  it('routes outbound call/message and webhook translation through the adapter interface', async () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
        },
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'webhook',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    const callDispatch = await result.adapter.dispatchOutboundCall({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
    });
    expect(callDispatch).toMatchObject({
      providerKey: 'telnyx',
      channel: 'call',
      providerLegId: 'telnyx-call-leg-thread-f1-unclaimed-1001',
      providerMessageId: null,
      adapterInvoked: true,
      providerBranchingInDomain: false,
    });

    const messageDispatch = await result.adapter.dispatchOutboundMessage({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
    });
    expect(messageDispatch).toMatchObject({
      providerKey: 'telnyx',
      channel: 'message',
      providerLegId: null,
      providerMessageId: 'telnyx-message-thread-f1-unclaimed-1001',
      adapterInvoked: true,
      providerBranchingInDomain: false,
    });

    const signatureDecision = result.adapter.validateInboundWebhookSignature({
      req: buildRequest({
        body: {
          eventType: 'call.connected',
        },
      }),
    });
    expect(signatureDecision).toEqual({ ok: true });

    expect(
      result.adapter.toCanonicalEvent({
        rawEventType: 'call.connected',
        payload: {},
      }),
    ).toEqual({
      eventType: 'CallConnected',
      payload: {},
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    });
  });

  it('enforces bridge-only/manual retry policy at the adapter dispatch boundary', async () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    await expect(
      result.adapter.dispatchOutboundCall({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        callPolicy: {
          transport: 'sip',
          autoRetry: false,
          redialPolicy: 'manual_only',
        },
      }),
    ).rejects.toMatchObject({
      code: 'CONNECTSHYFT_OUTBOUND_CALL_TRANSPORT_UNSUPPORTED',
    });

    await expect(
      result.adapter.dispatchOutboundCall({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        callPolicy: {
          transport: 'bridge',
          autoRetry: true,
          redialPolicy: 'manual_only',
        },
      }),
    ).rejects.toBeInstanceOf(ConnectShyftProviderDispatchPolicyError);
  });

  it('prefers body providerKey over test header provider request override', () => {
    const requested = resolveConnectShyftRequestedProviderKey(
      buildRequest({
        headers: {
          'x-test-connectshyft-provider-requested': 'mock-sandbox',
        },
        body: {
          providerKey: 'telnyx',
        },
      }),
    );

    expect(requested).toBe('telnyx');
  });

  it('enforces webhook signature validation in test override mode when explicitly requested', () => {
    const { publicKey } = generateKeyPairSync('ed25519');
    const testPublicKey = publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'webhook',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    const signatureDecision = result.adapter.validateInboundWebhookSignature({
      req: buildRequest({
        body: {
          eventType: 'voice.connected',
        },
        headers: {
          'x-test-connectshyft-enforce-webhook-signature': 'true',
          'x-test-connectshyft-telnyx-public-key': testPublicKey,
        },
      }),
    });

    expect(signatureDecision).toMatchObject({
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING',
        httpStatus: 401,
      },
    });
  });

  it('accepts valid webhook signatures in test override mode when explicit signature enforcement is enabled', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const testPublicKey = publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const payload = {
      eventType: 'voice.connected',
      threadId: 'thread-f1-unclaimed-1001',
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.trunc(Date.now() / 1000).toString();
    const signature = signPayload(
      null,
      Buffer.from(`${timestamp}|${rawBody}`),
      privateKey,
    ).toString('base64');

    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        body: payload,
        rawBody,
      }),
      operation: 'webhook',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    const signatureDecision = result.adapter.validateInboundWebhookSignature({
      req: buildRequest({
        body: payload,
        rawBody,
        headers: {
          'x-test-connectshyft-enforce-webhook-signature': 'true',
          'x-test-connectshyft-telnyx-public-key': testPublicKey,
          'telnyx-timestamp': timestamp,
          'telnyx-signature-ed25519': signature,
        },
      }),
    });

    expect(signatureDecision).toEqual({ ok: true });
  });

  it('rejects webhook signatures when Telnyx signature headers are missing outside override mode', () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'false';

    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'webhook',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    process.env.TELNYX_PUBLIC_KEY = generateKeyPairSync('ed25519').publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const signatureDecision = result.adapter.validateInboundWebhookSignature({
      req: buildRequest({
        body: {
          eventType: 'voice.connected',
        },
      }),
    });

    expect(signatureDecision).toMatchObject({
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING',
        httpStatus: 401,
      },
    });
  });

  it('accepts valid Telnyx webhook signatures outside override mode', () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'false';

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    process.env.TELNYX_PUBLIC_KEY = publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const payload = {
      eventType: 'voice.connected',
      threadId: 'thread-f1-unclaimed-1001',
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.trunc(Date.now() / 1000).toString();
    const signature = signPayload(
      null,
      Buffer.from(`${timestamp}|${rawBody}`),
      privateKey,
    ).toString('base64');

    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        body: payload,
        rawBody,
        headers: {
          'telnyx-timestamp': timestamp,
          'telnyx-signature-ed25519': signature,
        },
      }),
      operation: 'webhook',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    const signatureDecision = result.adapter.validateInboundWebhookSignature({
      req: buildRequest({
        body: payload,
        rawBody,
        headers: {
          'telnyx-timestamp': timestamp,
          'telnyx-signature-ed25519': signature,
        },
      }),
    });

    expect(signatureDecision).toEqual({ ok: true });
  });

  it('rejects validly-signed webhooks when timestamp falls outside replay window', () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'false';

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    process.env.TELNYX_PUBLIC_KEY = publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const payload = {
      eventType: 'voice.connected',
      threadId: 'thread-f1-unclaimed-1001',
    };
    const rawBody = JSON.stringify(payload);
    const staleTimestamp = '1700000000';
    const signature = signPayload(
      null,
      Buffer.from(`${staleTimestamp}|${rawBody}`),
      privateKey,
    ).toString('base64');

    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        body: payload,
        rawBody,
        headers: {
          'telnyx-timestamp': staleTimestamp,
          'telnyx-signature-ed25519': signature,
        },
      }),
      operation: 'webhook',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    const signatureDecision = result.adapter.validateInboundWebhookSignature({
      req: buildRequest({
        body: payload,
        rawBody,
        headers: {
          'telnyx-timestamp': staleTimestamp,
          'telnyx-signature-ed25519': signature,
        },
      }),
    });

    expect(signatureDecision).toMatchObject({
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
        httpStatus: 401,
      },
    });
  });
});
