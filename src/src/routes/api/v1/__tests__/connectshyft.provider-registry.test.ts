import express from 'express';
import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import request from 'supertest';
import * as PlatformAdminService from '../../../../services/PlatformAdminService';
import * as ProviderRegistry from '../../../../modules/connectshyft/providerRegistry';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  app.use((req, _res, next) => {
    const tenantId = req.header('x-test-connectshyft-tenant-id') || 'tenant-connectshyft-f1';
    const orgUnitId = req.header('x-test-connectshyft-orgunit-id') || 'org-connectshyft-f1-east';
    const role = req.header('x-test-connectshyft-role') || 'ORGUNIT_MEMBER';
    const userId = req.header('x-test-connectshyft-user-id') || 'user-connectshyft-f1-operator';

    req.user = {
      userId,
      email: `${userId}@connectshyft.test`,
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId: orgUnitId,
      role,
    };
    req.tenantId = tenantId;
    req.orgUnitId = orgUnitId;
    req.tenantContext = {
      tenantId,
      orgUnitId,
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    };

    next();
  });

  app.use('/api/v1/connectshyft', connectShyftRouter);
  return app;
};

const buildHeaders = (overrides: Record<string, string> = {}): Record<string, string> => ({
  'x-correlation-id': 'corr-connectshyft-f1-provider-registry',
  'x-test-connectshyft-flags': JSON.stringify({
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  }),
  'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f1',
  'x-test-connectshyft-orgunit-id': 'org-connectshyft-f1-east',
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-f1-operator',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f1-east']),
  'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
  'x-test-connectshyft-disabled-providers': JSON.stringify(['twilio']),
  ...overrides,
});

type CanonicalEventRecord = {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAtUtc: string;
};

const sortCanonical = (events: CanonicalEventRecord[]): CanonicalEventRecord[] => {
  return [...events].sort((left, right) => {
    const timeDelta = new Date(left.occurredAtUtc).getTime() - new Date(right.occurredAtUtc).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return left.eventId.localeCompare(right.eventId);
  });
};

const expectProviderSpecificLeakageRemoved = (payload: Record<string, unknown>): void => {
  expect(payload).not.toHaveProperty('twilioCallSid');
  expect(payload).not.toHaveProperty('telnyxCallControlId');
  expect(payload).not.toHaveProperty('providerLegId');
  expect(payload).not.toHaveProperty('providerMessageId');
};

describe('connectshyft provider adapter registry route integration', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousTelnyxPublicKey = process.env.TELNYX_PUBLIC_KEY;
  const previousConnectShyftEnabled = process.env.CONNECTSHYFT_ENABLED;
  const previousConnectShyftInboxEnabled = process.env.CONNECTSHYFT_INBOX_ENABLED;
  const previousConnectShyftEscalationEnabled = process.env.CONNECTSHYFT_ESCALATION_ENABLED;
  const previousConnectShyftWebhooksEnabled = process.env.CONNECTSHYFT_WEBHOOKS_ENABLED;
  let entitlementSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    process.env.CONNECTSHYFT_ENABLED = 'true';
    process.env.CONNECTSHYFT_INBOX_ENABLED = 'true';
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = 'true';
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = 'true';
    entitlementSpy = jest.spyOn(PlatformAdminService, 'evaluateActorTenantModuleEntitlement').mockResolvedValue({
      tenantId: 'tenant-connectshyft-f1',
      moduleKey: 'connectshyft',
      enabled: true,
      reason: 'enabled',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_ENABLED',
      message: 'ConnectShyft entitlement enabled for tests.',
    });
  });

  afterAll(() => {
    entitlementSpy.mockRestore();
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.TELNYX_PUBLIC_KEY = previousTelnyxPublicKey;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
  });

  it('dispatches outbound call through deterministic provider adapter resolution metadata', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/call')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
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
          adapterInvoked: true,
          providerBranchingInDomain: false,
        },
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

  it('fails closed when requested provider is disabled and confirms no partial-write side effects', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-claimed-1002/call')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'twilio',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      data: {
        providerResolution: {
          requestedProvider: 'twilio',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-disabled',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('returns actionable unavailable-provider refusal metadata and preserves thread state', async () => {
    const app = buildApp();
    const headers = buildHeaders();
    const refusalResponse = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/messages')
      .set(headers)
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'legacy-provider',
        channel: 'sms',
        body: 'Provider-registry missing provider contract check.',
      });

    expect(refusalResponse.status).toBe(200);
    expect(refusalResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_PROVIDER_UNAVAILABLE',
      refusalType: 'business',
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

    const followUpResponse = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/call')
      .set(headers)
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
      });

    expect(followUpResponse.status).toBe(200);
    expect(followUpResponse.body).toMatchObject({
      ok: true,
      data: {
        lifecycle: {
          priorState: 'UNCLAIMED',
          nextState: 'UNCLAIMED',
        },
      },
    });
  });

  it('returns provider-neutral number mapping contract fields in route responses', async () => {
    const app = buildApp();
    const providerNumberE164 = `+1260${Date.now().toString().slice(-7)}`;
    const createResponse = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'SYSTEM_ADMIN',
      }))
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerNumberE164,
        label: 'Provider-neutral contract check',
        isActive: true,
      });

    expect([200, 201]).toContain(createResponse.status);
    expect(createResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
      data: {
        providerNumberE164,
        twilioNumberE164: providerNumberE164,
      },
    });
  });

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

  it('returns deterministic refusal when provider dispatch fails before side-effect persistence', async () => {
    const dispatchFailureSpy = jest.spyOn(ProviderRegistry, 'resolveConnectShyftProviderAdapter').mockReturnValue({
      ok: true,
      providerResolution: {
        requestedProvider: 'telnyx',
        resolvedProvider: 'telnyx',
        deterministic: true,
      },
      adapter: {
        providerKey: 'telnyx',
        adapterInterfaceVersion: 'v1',
        dispatchOutboundCall: async () => {
          throw new Error('provider-dispatch-failure');
        },
        dispatchOutboundMessage: async () => ({
          providerKey: 'telnyx',
          channel: 'message',
          adapterInvoked: true,
          providerBranchingInDomain: false,
        }),
        validateInboundWebhookSignature: () => ({ ok: true }),
        toCanonicalEvent: ({ rawEventType }) => ({
          eventType: rawEventType,
          payload: {},
          providerNeutral: true,
          providerSpecificFieldsStripped: true,
          providerBranchingInDomain: false,
        }),
      },
    });

    try {
      const app = buildApp();
      const response = await request(app)
        .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/call')
        .set(buildHeaders())
        .send({
          orgUnitId: 'org-connectshyft-f1-east',
          providerKey: 'telnyx',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_PROVIDER_DISPATCH_FAILED',
        data: {
          sideEffects: {
            dispatchAttempted: true,
            lifecycleMutationApplied: false,
            auditPersisted: false,
          },
        },
      });
    } finally {
      dispatchFailureSpy.mockRestore();
    }
  });

  it('rejects inbound webhooks without Telnyx signature headers when override mode is disabled', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'false';
    process.env.TELNYX_PUBLIC_KEY = generateKeyPairSync('ed25519').publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

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
    });

    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  it('accepts inbound webhooks with valid Telnyx signatures when override mode is disabled', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'false';
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    process.env.TELNYX_PUBLIC_KEY = publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const payload = {
      eventType: 'voice.connected',
      threadId: 'thread-f1-unclaimed-1001',
      orgUnitId: 'org-connectshyft-f1-east',
      tenantId: 'tenant-connectshyft-f1',
      providerKey: 'telnyx',
    };
    const timestamp = '1700000000';
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

    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });
});
