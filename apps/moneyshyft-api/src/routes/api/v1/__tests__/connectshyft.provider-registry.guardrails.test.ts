import { randomUUID } from 'node:crypto';
import request from 'supertest';
import * as ProviderRegistry from '../../../../modules/connectshyft/providerRegistry';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

describe('connectshyft provider adapter registry route integration - guardrails', () => {
  registerProviderRegistryRouteIntegrationHooks();

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

  it('dispatches outbound SMS using an explicit target when neighbor fallback is ambiguous', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/messages')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'Explicit target should win.',
        targetPhone: '+12605550999',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      data: {
        threadId: 'thread-f1-unclaimed-1001',
        thread: {
          threadId: 'thread-f1-unclaimed-1001',
          source: 'SMS',
        },
        dispatch: {
          providerKey: 'telnyx',
          channel: 'message',
          dispatchContext: {
            targetPhone: '+12605550999',
            messageBodyProvided: true,
          },
        },
        smsTargetResolution: {
          resolutionSource: 'explicit-request',
          deterministic: true,
          targetPhone: '+12605550999',
        },
        preferencePolicy: {
          prefersTexting: 'YES',
          dispatchPermitted: true,
        },
      },
    });
  });

  it('dispatches outbound SMS using a deterministic neighbor primary target when no explicit target is set', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-claimed-1002/messages')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'Deterministic neighbor target should dispatch.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      data: {
        threadId: 'thread-f1-claimed-1002',
        thread: {
          threadId: 'thread-f1-claimed-1002',
          source: 'SMS',
        },
        dispatch: {
          providerKey: 'telnyx',
          channel: 'message',
          dispatchContext: {
            targetPhone: '+12605550121',
            messageBodyProvided: true,
          },
        },
        smsTargetResolution: {
          resolutionSource: 'neighbor-primary',
          deterministic: true,
          targetPhone: '+12605550121',
        },
        preferencePolicy: {
          prefersTexting: 'YES',
          dispatchPermitted: true,
        },
      },
    });
  });

  it('returns an explicit refusal when multiple valid neighbor phones exist without an explicit SMS target', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/messages')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'This send should refuse due to multiple candidates.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_MULTIPLE_TARGET_PHONES',
      refusalType: 'business',
      data: {
        threadId: 'thread-f1-unclaimed-1001',
        preferencePolicy: {
          prefersTexting: 'YES',
          dispatchPermitted: false,
        },
        smsTargetResolution: {
          resolutionSource: 'ambiguous',
          deterministic: false,
          candidatePhones: ['+12605550111', '+12605550112'],
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('returns an explicit refusal when no deterministic target phone is available', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-closed-1003/messages')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'This send should refuse due to no target.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_PHONE_NOT_AVAILABLE',
      refusalType: 'business',
      data: {
        threadId: 'thread-f1-closed-1003',
        threadSource: 'SMS',
        smsTargetResolution: {
          resolutionSource: 'none',
          deterministic: false,
          candidatePhones: [],
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: true,
          auditPersisted: false,
        },
        lifecycle: {
          priorState: 'CLOSED',
          nextState: 'UNCLAIMED',
          reopenedFromClosed: true,
        },
      },
    });
  });

  it('returns an explicit refusal when prefers_texting does not allow outbound SMS', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f2-claimed-1002/messages')
      .set(buildHeaders({
        'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
        'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
        'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
        'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
      }))
      .send({
        orgUnitId: 'org-connectshyft-f2-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'This send should refuse due to texting preference.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TEXTING_NOT_PERMITTED',
      refusalType: 'business',
      data: {
        threadId: 'thread-f2-claimed-1002',
        preferencePolicy: {
          prefersTexting: 'NO',
          dispatchPermitted: false,
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('returns provider-neutral number mapping contract fields in route responses', async () => {
    const app = buildApp();
    const providerNumberE164 = `+1260${randomUUID().replace(/\D/g, '').slice(0, 7).padEnd(7, '0')}`;
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
});
