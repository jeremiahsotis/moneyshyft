// @ts-nocheck
import request from 'supertest';
import {
  buildApp,
  buildHeaders,
  type CanonicalEventRecord,
  expectProviderSpecificLeakageRemoved,
  registerProviderRegistryRouteIntegrationHooks,
  sortCanonical,
} from './connectshyft.provider-registry.test.shared';
describe('connectshyft provider adapter registry route integration - dispatch and canonical events', () => {
  registerProviderRegistryRouteIntegrationHooks();

  it('dispatches outbound call through deterministic provider adapter resolution metadata', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/call')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
        targetPhone: '+12605550199',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInterfaceVersion: 'v1',
          providerBranchingInDomain: false,
        },
        dispatch: {
          channel: 'call',
          dispatchContext: {
            targetPhone: '+12605550199',
            messageBodyProvided: false,
          },
          adapterInvoked: true,
          providerBranchingInDomain: false,
        },
      },
    });
  });

  it('refuses mine bucket reads when actor context is missing', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/inbox')
      .query({
        bucket: 'mine',
      })
      .set(buildHeaders({
        'x-test-connectshyft-user-id': '   ',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
      refusalType: 'business',
      data: {
        bucket: 'mine',
      },
    });
  });

  it('records canonical outbound and inbound events and lists deterministic provider-neutral records', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });

    const threadId = 'thread-f2-unclaimed-1001';

    const callResponse = await request(app)
      .post(`/api/v1/connectshyft/threads/${threadId}/call`)
      .set(headers)
      .send({
        orgUnitId: 'org-connectshyft-f2-east',
        providerKey: 'telnyx',
      });
    expect(callResponse.status).toBe(200);

    const messageResponse = await request(app)
      .post(`/api/v1/connectshyft/threads/${threadId}/messages`)
      .set(headers)
      .send({
        orgUnitId: 'org-connectshyft-f2-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'Story f2 canonical store test message.',
      });
    expect(messageResponse.status).toBe(200);

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(headers)
      .send({
        eventType: 'voice.connected',
        threadId,
        orgUnitId: 'org-connectshyft-f2-east',
        tenantId: 'tenant-connectshyft-f2',
        providerKey: 'telnyx',
        providerEventId: 'provider-event-f2-1001',
        providerPayload: {
          telnyxCallControlId: 'telnyx-hidden',
          twilioCallSid: 'twilio-hidden',
        },
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        canonicalTranslation: {
          eventType: 'CallConnected',
          providerNeutral: true,
          providerSpecificFieldsStripped: true,
        },
        domainHandlers: {
          providerBranchingInDomain: false,
        },
      },
    });

    const eventsResponse = await request(app)
      .get('/api/v1/connectshyft/events')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
        aggregateId: threadId,
        aggregateType: 'Thread',
        limit: '50',
      })
      .set(headers);

    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_CANONICAL_EVENTS_LISTED',
      data: {
        deterministic: true,
        providerNeutral: true,
        filters: {
          aggregateId: threadId,
          aggregateType: 'Thread',
        },
      },
    });

    const events = eventsResponse.body.data.events as CanonicalEventRecord[];
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events).toEqual(sortCanonical(events));
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining([
      'CallAttemptStarted',
      'MessageQueued',
      'CallConnected',
    ]));

    events.forEach((event) => {
      expect(event.aggregateId).toBe(threadId);
      expect(event.aggregateType).toBe('Thread');
      expectProviderSpecificLeakageRemoved(event.payload);
    });
  });

  it('filters canonical events by event type deterministically across repeated reads', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });
    const query = {
      orgUnitId: 'org-connectshyft-f2-east',
      aggregateId: 'thread-f2-unclaimed-1001',
      aggregateType: 'Thread',
      eventType: 'CallConnected',
      limit: '50',
    };

    await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(headers)
      .send({
        eventType: 'voice.connected',
        threadId: 'thread-f2-unclaimed-1001',
        orgUnitId: 'org-connectshyft-f2-east',
        tenantId: 'tenant-connectshyft-f2',
        providerKey: 'telnyx',
      });

    const first = await request(app)
      .get('/api/v1/connectshyft/events')
      .query(query)
      .set(headers);
    const second = await request(app)
      .get('/api/v1/connectshyft/events')
      .query(query)
      .set(headers);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.events).toEqual(second.body.data.events);

    const events = first.body.data.events as CanonicalEventRecord[];
    events.forEach((event) => {
      expect(event.eventType).toBe('CallConnected');
      expectProviderSpecificLeakageRemoved(event.payload);
    });
  });

  it('records voice-family canonical webhook payloads with channel=voice', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });

    const threadId = 'thread-f2-unclaimed-1001';
    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(headers)
      .send({
        eventType: 'voice.fallback',
        threadId,
        orgUnitId: 'org-connectshyft-f2-east',
        tenantId: 'tenant-connectshyft-f2',
        providerKey: 'telnyx',
      });

    expect(webhookResponse.status).toBe(200);

    const eventsResponse = await request(app)
      .get('/api/v1/connectshyft/events')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
        aggregateId: threadId,
        aggregateType: 'Thread',
        eventType: 'VoiceFallback',
        limit: '10',
      })
      .set(headers);

    expect(eventsResponse.status).toBe(200);
    const events = eventsResponse.body.data.events as CanonicalEventRecord[];
    expect(events.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(event.eventType).toBe('VoiceFallback');
      expect(event.payload).toMatchObject({
        direction: 'inbound',
        channel: 'voice',
      });
    });
  });

  it('derives provider-neutral thread detail timeline from canonical events with deterministic ordering', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });

    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-f2-unclaimed-1001')
      .set(headers);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      data: {
        thread: {
          threadId: 'thread-f2-unclaimed-1001',
          providerNeutral: true,
          statusDerivedFromCanonicalEvents: true,
          timeline: expect.any(Array),
        },
      },
    });

    const timeline = response.body.data.thread.timeline as CanonicalEventRecord[];
    expect(timeline).toEqual(sortCanonical(timeline));
    timeline.forEach((event) => {
      expectProviderSpecificLeakageRemoved(event.payload);
    });
  });
});
