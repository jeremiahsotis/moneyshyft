import request from 'supertest';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

describe('connectshyft provider adapter registry route integration - webhook correlation resolution', () => {
  registerProviderRegistryRouteIntegrationHooks();

  it('routes inbound webhook processing through provider adapter translation metadata', async () => {
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
        providerEventId: 'telnyx-call-event-f1-1001',
        callStatus: 'CONNECTED',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInvoked: true,
        },
        canonicalTranslation: {
          providerBranchingInDomain: false,
          eventType: 'CallConnected',
          providerNeutral: true,
          providerSpecificFieldsStripped: true,
        },
      },
    });
  });

  it('resolves webhook correlation by provider identifiers when metadata is missing', async () => {
    const app = buildApp();
    const callResponse = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/call')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
      });

    expect(callResponse.status).toBe(200);
    const providerLegId = callResponse.body?.data?.dispatch?.providerLegId as string;
    expect(typeof providerLegId).toBe('string');
    expect(providerLegId.length).toBeGreaterThan(0);

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        eventType: 'voice.connected',
        providerKey: 'telnyx',
        providerLegId,
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        threadId: 'thread-f1-unclaimed-1001',
        correlation: {
          source: 'provider_fallback',
          deterministic: true,
          providerLegId,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
        },
        timeline: {
          routingDecision: 'accepted',
        },
      },
    });
  });

  it('resolves webhook correlation by tenant number mapping when provider identifiers are unavailable', async () => {
    const app = buildApp();
    const mappedInboundNumber = '+12605550141';

    const mappingResponse = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'SYSTEM_ADMIN',
      }))
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerNumberE164: mappedInboundNumber,
        label: 'Webhook number-routing fallback',
        isActive: true,
      });

    expect([200, 201]).toContain(mappingResponse.status);

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        eventType: 'sms.delivered',
        providerKey: 'telnyx',
        providerPayload: {
          to: mappedInboundNumber,
          from: '+12605550142',
        },
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        correlation: {
          source: 'number_mapping',
          deterministic: true,
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: expect.any(String),
          providerNumberE164: mappedInboundNumber,
        },
      },
    });
  });

  it('resolves webhook number-mapping correlation without authenticated tenant context when mapping is globally unique', async () => {
    const app = buildApp();
    const mappedInboundNumber = '+12605550145';

    const mappingResponse = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'SYSTEM_ADMIN',
      }))
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerNumberE164: mappedInboundNumber,
        label: 'Unauthenticated webhook routing',
        isActive: true,
      });

    expect([200, 201]).toContain(mappingResponse.status);

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders({
        'x-test-connectshyft-tenant-id': 'public',
        'x-test-connectshyft-role': 'SYSTEM_ADMIN',
        'x-test-connectshyft-orgunit-memberships': JSON.stringify([]),
      }))
      .send({
        eventType: 'sms.delivered',
        providerKey: 'telnyx',
        providerPayload: {
          to: mappedInboundNumber,
          from: '+12605550142',
        },
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        correlation: {
          source: 'number_mapping',
          deterministic: true,
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          providerNumberE164: mappedInboundNumber,
        },
      },
    });
  });
});
