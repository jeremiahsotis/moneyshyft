// @ts-nocheck
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import db from '../../../../config/knex';
import * as canonicalEventsModule from '../../../../modules/connectshyft/canonicalEvents';
import * as identityResolverModule from '../../../../modules/connectshyft/identityResolver';
import * as neighborsModule from '../../../../modules/connectshyft/neighbors';
import { AsyncConnectShyftNeighborService } from '../../../../modules/connectshyft/neighbors';
import { connectShyftNumberMappingServiceAsync } from '../../../../modules/connectshyft/numberMappings';
import * as OperatorDestinationResolverModule from '../../../../modules/connectshyft/operatorDestinationResolver';
import { AsyncConnectShyftThreadService } from '../../../../modules/connectshyft/threads';
import * as ProviderRegistry from '../../../../modules/connectshyft/providerRegistry';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const mockInboundSmsPersistence = (neighborId: string) => {
  const originalTransaction = db.transaction;
  const mockedTransaction = jest.fn(async (handler: any) =>
    handler({
      fn: {
        now: () => new Date('2026-03-18T12:00:00.000Z'),
      },
    }));
  Object.defineProperty(db, 'transaction', {
    value: mockedTransaction,
  });
  const ensureThreadSpy = jest.spyOn(
    AsyncConnectShyftThreadService.prototype,
    'ensureThread',
  ).mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_THREAD_ENSURED',
    httpStatus: 200,
    data: {
      thread: {
        threadId: '00000000-0000-4000-8000-000000000222',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        neighborId,
        state: 'UNCLAIMED',
        summary: '',
        escalationStage: 0,
        nextEvaluationAtUtc: null,
        lastInboundCsNumberId: '+12605550191',
        preferredOutboundCsNumberId: '+12605550191',
        claimedByUserId: null,
        createdAtUtc: '2026-03-18T12:00:00.000Z',
        updatedAtUtc: '2026-03-18T12:00:00.000Z',
      },
    },
  } as any);
  const canonicalEventSpy = jest.spyOn(
    canonicalEventsModule,
    'recordConnectShyftCanonicalEvent',
  ).mockResolvedValue({
    eventId: 'canonical-event-inbound-2',
    aggregateId: '00000000-0000-4000-8000-000000000222',
    aggregateType: 'Thread',
    eventType: 'connectshyft.inbound.sms_appended',
    payload: {},
    occurredAtUtc: '2026-03-18T12:00:00.000Z',
  } as any);
  const textingPreferenceSpy = jest.spyOn(
    AsyncConnectShyftNeighborService.prototype,
    'applyInboundSmsTextingPreference',
  ).mockResolvedValue({
    ok: true,
    updated: false,
    neighbor: {
      neighborId,
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      firstName: '',
      lastName: '',
      prefersTexting: 'YES',
      phones: [],
      createdAtUtc: '2026-03-18T12:00:00.000Z',
      updatedAtUtc: '2026-03-18T12:00:00.000Z',
    },
  } as any);

  return {
    ensureThreadSpy,
    restore: () => {
      textingPreferenceSpy.mockRestore();
      canonicalEventSpy.mockRestore();
      ensureThreadSpy.mockRestore();
      Object.defineProperty(db, 'transaction', {
        value: originalTransaction,
      });
    },
  };
};

const resolveRoutingMappingByNumberForTests = async (input: {
  tenantId: string | null;
  twilioNumberE164: string;
}) => {
  if (input.tenantId === 'tenant-connectshyft-f1' && input.twilioNumberE164 === '+12605550191') {
    return {
      status: 'found' as const,
      mapping: {
        mappingId: 'mapping-f1-001',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        twilioNumberE164: '+12605550191',
        label: 'Front Desk',
        isActive: true,
        createdAtUtc: '2026-03-18T12:00:00.000Z',
        updatedAtUtc: '2026-03-18T12:00:00.000Z',
      },
    };
  }

  if (input.tenantId === 'tenant-connectshyft-f2' && input.twilioNumberE164 === '+12605550192') {
    return {
      status: 'found' as const,
      mapping: {
        mappingId: 'mapping-f2-001',
        tenantId: 'tenant-connectshyft-f2',
        orgUnitId: 'org-connectshyft-f2-east',
        twilioNumberE164: '+12605550192',
        label: 'F2 East Primary',
        isActive: true,
        createdAtUtc: '2026-03-18T12:00:00.000Z',
        updatedAtUtc: '2026-03-18T12:00:00.000Z',
      },
    };
  }

  return {
    status: 'not-found' as const,
  };
};

describe('connectshyft provider adapter registry route integration - guardrails', () => {
  registerProviderRegistryRouteIntegrationHooks();

  beforeEach(() => {
    jest.spyOn(OperatorDestinationResolverModule, 'resolveOperatorDestination').mockResolvedValue({
      phoneNumber: '+12605550155',
      source: 'actor_user',
      userId: 'user-connectshyft-f1-operator',
      orgUnitId: 'org-connectshyft-f1-east',
    });
    jest.spyOn(connectShyftNumberMappingServiceAsync, 'resolveRoutingMappingByNumber')
      .mockImplementation(resolveRoutingMappingByNumberForTests);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('ignores metadata alias keys and continues to thread correlation', async () => {
    const app = buildApp();
    const restore = mockInboundSmsPersistence('neighbor-connectshyft-f1-1001');
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-f1-unclaimed-1001',
          eventType: 'sms.inbound',
          neighbor_id: 'neighbor-alias-ignored-2001',
          from: '+12605552099',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-connectshyft-f1-1001',
          },
        },
      });
      expect(connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber).toHaveBeenCalledWith({
        tenantId: 'tenant-connectshyft-f1',
        twilioNumberE164: '+12605550191',
      });
      expect(restore.ensureThreadSpy).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        lastInboundCsNumberId: '+12605550191',
        preferredOutboundCsNumberId: '+12605550191',
      }));
      expect(resolveActiveSpy).not.toHaveBeenCalled();
    } finally {
      resolveActiveSpy.mockRestore();
      restore.restore();
    }
  });

  it('refuses inbound SMS when the mapped sender number is ambiguous in scoped routing', async () => {
    const app = buildApp();
    const routingSpy = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >;
    routingSpy.mockResolvedValueOnce({
      status: 'ambiguous',
      mappings: [
        {
          mappingId: 'mapping-f1-a',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          twilioNumberE164: '+12605550191',
          label: 'Front Desk',
          isActive: true,
          createdAtUtc: '2026-03-18T12:00:00.000Z',
          updatedAtUtc: '2026-03-18T12:00:00.000Z',
        },
        {
          mappingId: 'mapping-f1-b',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          twilioNumberE164: '+12605550191',
          label: 'Overflow',
          isActive: true,
          createdAtUtc: '2026-03-18T12:00:00.000Z',
          updatedAtUtc: '2026-03-18T12:00:00.000Z',
        },
      ],
    });

    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'sms.inbound',
        from: '+12605552098',
        to: '+12605550191',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS',
      refusalType: 'business',
      data: {
        reason: 'sender_mapping_ambiguous',
        correlation: {
          providerNumberE164: '+12605550191',
        },
      },
    });
  });

  it('refuses inbound SMS when multiple active neighbors share the same sender phone', async () => {
    const app = buildApp();
    const createInboundSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound');
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValue(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'multiple_matches',
        candidateNeighborIds: ['neighbor-a-2003', 'neighbor-b-2003'],
        normalizedContactPoint: '+12605552003',
      });

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'sms-ambiguous-thread-2003',
          eventType: 'sms.inbound',
          from: '+12605552003',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'IDENTITY_MATCH_AMBIGUOUS',
        refusalType: 'business',
        data: {
          reason: 'neighbor_ambiguous',
          candidateNeighborIds: ['neighbor-a-2003', 'neighbor-b-2003'],
        },
      });
      expect(createInboundSpy).not.toHaveBeenCalled();
    } finally {
      createInboundSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
    }
  });

  it('refuses inbound SMS when the sender phone is malformed', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildHeaders())
      .send({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'sms-invalid-phone-thread-2004',
        eventType: 'sms.inbound',
        from: 'not-a-phone-number',
        to: '+12605550191',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
      refusalType: 'business',
      data: {
        reason: 'sender_phone_invalid',
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
