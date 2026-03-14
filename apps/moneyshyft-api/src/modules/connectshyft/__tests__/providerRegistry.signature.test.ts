import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import {
  resolveConnectShyftProviderAdapter,
} from '../providerRegistry';
import {
  buildRequest,
  registerProviderRegistryEnvHooks,
  withScopedEnv,
} from './providerRegistry.test.shared';

describe('connectshyft provider registry webhook signature validation', () => {
  registerProviderRegistryEnvHooks();

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

  it('rejects webhook signatures when Telnyx signature headers are missing outside override mode', async () => {
    await withScopedEnv(
      {
        ENABLE_TEST_CONNECTSHYFT_FLAGS: 'false',
        TELNYX_PUBLIC_KEY: generateKeyPairSync('ed25519').publicKey.export({
          type: 'spki',
          format: 'pem',
        }).toString(),
      },
      async () => {
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
          }),
        });

        expect(signatureDecision).toMatchObject({
          ok: false,
          refusal: {
            code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING',
            httpStatus: 401,
          },
        });
      },
    );
  });

  it('accepts valid Telnyx webhook signatures outside override mode', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    await withScopedEnv(
      {
        ENABLE_TEST_CONNECTSHYFT_FLAGS: 'false',
        TELNYX_PUBLIC_KEY: publicKey.export({
          type: 'spki',
          format: 'pem',
        }).toString(),
      },
      async () => {
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
      },
    );
  });

  it('rejects validly-signed webhooks when timestamp falls outside replay window', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    await withScopedEnv(
      {
        ENABLE_TEST_CONNECTSHYFT_FLAGS: 'false',
        TELNYX_PUBLIC_KEY: publicKey.export({
          type: 'spki',
          format: 'pem',
        }).toString(),
      },
      async () => {
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
      },
    );
  });
});
