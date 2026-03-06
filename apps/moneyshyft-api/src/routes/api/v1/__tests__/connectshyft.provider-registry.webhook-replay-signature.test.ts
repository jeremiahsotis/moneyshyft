import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import request from 'supertest';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
  withScopedEnv,
} from './connectshyft.provider-registry.test.shared';

describe('connectshyft provider adapter registry route integration - webhook replay and signature guardrails', () => {
  registerProviderRegistryRouteIntegrationHooks();

  it('suppresses duplicate webhook callbacks and prevents duplicate domain writes', async () => {
    const app = buildApp();
    const messageResponse = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/messages')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'Story f3 duplicate callback suppression test',
        targetPhone: '+12605550142',
      });

    expect(messageResponse.status).toBe(200);
    const providerMessageId = messageResponse.body?.data?.dispatch?.providerMessageId as string;
    expect(typeof providerMessageId).toBe('string');
    expect(providerMessageId.length).toBeGreaterThan(0);
    expect(messageResponse.body?.data?.dispatch?.dispatchContext).toMatchObject({
      targetPhone: '+12605550142',
      messageBodyProvided: true,
    });

    const webhookPayload = {
      eventType: 'sms.delivered',
      providerKey: 'telnyx',
      providerEventId: 'provider-event-f3-duplicate-1001',
      providerMessageId,
    };

    const first = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send(webhookPayload);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
        },
      },
    });

    const duplicate = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send(webhookPayload);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        replaySafe: {
          duplicate: true,
          suppressedDomainWrites: true,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
      },
    });
    expect(duplicate.body.data).not.toHaveProperty('canonicalEvent');
    expect(duplicate.body.data).not.toHaveProperty('timeline');
    expect(duplicate.body.data).not.toHaveProperty('audit');
    expect(duplicate.body.data).not.toHaveProperty('outbox');
    expect(duplicate.body.data).not.toHaveProperty('lifecycle');
  });

  it('rejects inbound webhooks without Telnyx signature headers when override mode is disabled', async () => {
    await withScopedEnv(
      {
        ENABLE_TEST_CONNECTSHYFT_FLAGS: 'false',
        TELNYX_PUBLIC_KEY: generateKeyPairSync('ed25519').publicKey.export({
          type: 'spki',
          format: 'pem',
        }).toString(),
      },
      async () => {
        const app = buildApp();
        const response = await request(app)
          .post('/api/v1/connectshyft/webhooks/inbound')
          .set(buildHeaders())
          .send({
            eventType: 'voice.connected',
            threadId: 'thread-f1-unclaimed-1001',
            orgUnitId: 'org-connectshyft-f1-east',
            tenantId: 'tenant-connectshyft-f1',
            providerKey: 'telnyx',
          });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING',
          refusalType: 'client',
          data: {
            signatureValidation: {
              deterministic: true,
              verified: false,
              provider: 'telnyx',
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
      },
    );
  });

  it('accepts inbound webhooks with valid Telnyx signatures when override mode is disabled', async () => {
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
          orgUnitId: 'org-connectshyft-f1-east',
          tenantId: 'tenant-connectshyft-f1',
          providerKey: 'telnyx',
        };
        const timestamp = Math.trunc(Date.now() / 1000).toString();
        const signature = signPayload(
          null,
          Buffer.from(`${timestamp}|${JSON.stringify(payload)}`),
          privateKey,
        ).toString('base64');

        const app = buildApp();
        const response = await request(app)
          .post('/api/v1/connectshyft/webhooks/inbound')
          .set(buildHeaders({
            'telnyx-timestamp': timestamp,
            'telnyx-signature-ed25519': signature,
          }))
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            providerResolution: {
              resolvedProvider: 'telnyx',
              adapterInvoked: true,
            },
          },
        });
      },
    );
  });
});
