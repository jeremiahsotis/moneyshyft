import express from 'express';
import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import request from 'supertest';
import * as PlatformAdminService from '../../../../services/PlatformAdminService';
import * as ProviderRegistry from '../../../../modules/connectshyft/providerRegistry';
import db from '../../../../config/knex';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const CONNECTSHYFT_PROVIDER_REGISTRY_TEST_TENANT_IDS = [
  'tenant-connectshyft-f1',
  'tenant-connectshyft-f2',
  'tenant-connectshyft-allowlist-only',
] as const;

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

const resetProviderCorrelationDbStateForTests = async (): Promise<void> => {
  try {
    const testTenantIds = [...CONNECTSHYFT_PROVIDER_REGISTRY_TEST_TENANT_IDS];
    await db
      .withSchema('connectshyft')
      .table('cs_webhook_receipts')
      .whereIn('tenant_id', testTenantIds)
      .del();
    await db
      .withSchema('connectshyft')
      .table('cs_provider_identifier_mappings')
      .whereIn('tenant_id', testTenantIds)
      .del();
  } catch (_error) {
    // Ignore cleanup failures when db-backed tables are unavailable in isolated test runs.
  }
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

  beforeEach(async () => {
    resetConnectShyftProviderCorrelationStateForTests();
    await resetProviderCorrelationDbStateForTests();
  });

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

  afterAll(async () => {
    entitlementSpy.mockRestore();
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.TELNYX_PUBLIC_KEY = previousTelnyxPublicKey;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
    try {
      await db.destroy();
    } catch (_error) {
      // ignore teardown close errors in test cleanup
    }
  });

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

  it('fails closed when Telnyx rollout allow-list excludes tenant/orgUnit context', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/call')
      .set(buildHeaders({
        'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
          telnyx: {
            tenantIds: ['tenant-connectshyft-allowlist-only'],
            orgUnitIds: ['org-connectshyft-allowlist-only'],
            tenantOrgUnitPairs: ['tenant-connectshyft-allowlist-only::org-connectshyft-allowlist-only'],
          },
        }),
      }))
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
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

  it('revalidates rollout allow-list against correlated webhook context before side effects', async () => {
    const app = buildApp();
    const f2Headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });
    const callResponse = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f2-unclaimed-1001/call')
      .set(f2Headers)
      .send({
        orgUnitId: 'org-connectshyft-f2-east',
        providerKey: 'telnyx',
      });

    expect(callResponse.status).toBe(200);
    const providerLegId = callResponse.body?.data?.dispatch?.providerLegId as string;
    expect(typeof providerLegId).toBe('string');
    expect(providerLegId.length).toBeGreaterThan(0);

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders({
        'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
          telnyx: {
            tenantOrgUnitPairs: ['tenant-connectshyft-f1::org-connectshyft-f1-east'],
            tenantIds: [],
            orgUnitIds: [],
          },
        }),
      }))
      .send({
        eventType: 'voice.connected',
        providerKey: 'telnyx',
        providerLegId,
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-allowlisted',
        },
        correlation: {
          source: 'provider_fallback',
          deterministic: true,
          tenantId: 'tenant-connectshyft-f2',
          orgUnitId: 'org-connectshyft-f2-east',
          threadId: 'thread-f2-unclaimed-1001',
          providerLegId,
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
          providerLegId: null,
          providerMessageId: 'telnyx-message-thread-f1-unclaimed-1001',
          dispatchContext: {
            targetPhone: null,
            messageBodyProvided: true,
          },
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

    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });
});
