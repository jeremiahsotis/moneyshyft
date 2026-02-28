import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import {
  resolveConnectShyftProviderAdapter,
  resolveConnectShyftRequestedProviderKey,
} from '../providerRegistry';

type HeaderMap = Record<string, string>;

const buildRequest = (input?: {
  headers?: HeaderMap;
  body?: Record<string, unknown>;
  rawBody?: string;
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
    header: (name: string) => normalizedHeaders[name.toLowerCase()],
  };
};

describe('connectshyft provider registry', () => {
  let previousNodeEnv: string | undefined;
  let previousEnableFlags: string | undefined;
  let previousTelnyxPublicKey: string | undefined;

  beforeEach(() => {
    previousNodeEnv = process.env.NODE_ENV;
    previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
    previousTelnyxPublicKey = process.env.TELNYX_PUBLIC_KEY;
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags;
    process.env.TELNYX_PUBLIC_KEY = previousTelnyxPublicKey;
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
    const timestamp = '1700000000';
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
});
