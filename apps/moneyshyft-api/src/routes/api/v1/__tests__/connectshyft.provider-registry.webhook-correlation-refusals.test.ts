import request from 'supertest';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

describe('connectshyft provider adapter registry route integration - webhook correlation refusals', () => {
  registerProviderRegistryRouteIntegrationHooks();

  it('returns deterministic ambiguous refusal when unauthenticated number mapping fallback matches multiple active tenants', async () => {
    const app = buildApp();
    const sharedInboundNumber = '+12605550146';

    const firstMappingResponse = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'SYSTEM_ADMIN',
      }))
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerNumberE164: sharedInboundNumber,
        label: 'Tenant F1 shared number',
        isActive: true,
      });
    expect([200, 201]).toContain(firstMappingResponse.status);

    const secondMappingResponse = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders({
        'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
        'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
        'x-test-connectshyft-role': 'SYSTEM_ADMIN',
        'x-test-connectshyft-user-id': 'user-connectshyft-f2-admin',
        'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
      }))
      .send({
        orgUnitId: 'org-connectshyft-f2-east',
        providerNumberE164: sharedInboundNumber,
        label: 'Tenant F2 shared number',
        isActive: true,
      });
    expect([200, 201]).toContain(secondMappingResponse.status);

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
          to: sharedInboundNumber,
          from: '+12605550142',
        },
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_AMBIGUOUS',
      refusalType: 'business',
      data: {
        correlation: {
          deterministic: true,
          reason: 'ambiguous',
          providerNumberE164: sharedInboundNumber,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
      },
    });
  });

  it('returns deterministic conflict refusal when full metadata disagrees with provider fallback mapping', async () => {
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

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        eventType: 'voice.connected',
        providerKey: 'telnyx',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-claimed-1002',
        providerLegId,
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_CONFLICT',
      refusalType: 'business',
      data: {
        correlation: {
          deterministic: true,
          reason: 'conflict',
          providerLegId,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
      },
    });
  });

  it('returns deterministic conflict refusal when partial metadata disagrees with provider fallback mapping', async () => {
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

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        eventType: 'voice.connected',
        providerKey: 'telnyx',
        threadId: 'thread-f1-closed-1003',
        providerLegId,
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_CONFLICT',
      refusalType: 'business',
      data: {
        correlation: {
          deterministic: true,
          reason: 'conflict',
          providerLegId,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
      },
    });
  });

  it('returns deterministic refusal when correlation metadata and fallback identifiers are missing', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        eventType: 'voice.connected',
        providerKey: 'telnyx',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED',
      refusalType: 'business',
      data: {
        correlation: {
          deterministic: true,
          reason: 'missing-identifiers',
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
      },
    });
  });

  it('returns deterministic not-found refusal when provider-number mapping is missing', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        eventType: 'sms.delivered',
        providerKey: 'telnyx',
        providerPayload: {
          to: '+12605550991',
          from: '+12605550142',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND',
      refusalType: 'business',
      data: {
        correlation: {
          deterministic: true,
          reason: 'not-found',
          providerNumberE164: '+12605550991',
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
      },
    });
  });

  it('returns deterministic not-found refusal when matching provider-number mapping is inactive', async () => {
    const app = buildApp();
    const inactiveMappedNumber = '+12605550992';

    const mappingResponse = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'SYSTEM_ADMIN',
      }))
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerNumberE164: inactiveMappedNumber,
        label: 'Disabled routing number',
        isActive: false,
      });

    expect([200, 201]).toContain(mappingResponse.status);

    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        eventType: 'sms.delivered',
        providerKey: 'telnyx',
        providerPayload: {
          to: inactiveMappedNumber,
          from: '+12605550142',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND',
      refusalType: 'business',
      data: {
        correlation: {
          deterministic: true,
          reason: 'not-found',
          providerNumberE164: inactiveMappedNumber,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
      },
    });
  });
});
