// @ts-nocheck
import request from 'supertest';
import db from '../../../../config/knex';
import * as canonicalEventsModule from '../../../../modules/connectshyft/canonicalEvents';
import * as identityResolverModule from '../../../../modules/connectshyft/identityResolver';
import * as neighborsModule from '../../../../modules/connectshyft/neighbors';
import { AsyncConnectShyftNeighborService } from '../../../../modules/connectshyft/neighbors';
import { AsyncConnectShyftThreadService } from '../../../../modules/connectshyft/threads';
import {
  buildApp,
  buildHeaders,
  type CanonicalEventRecord,
  expectProviderSpecificLeakageRemoved,
  registerProviderRegistryRouteIntegrationHooks,
  sortCanonical,
} from './connectshyft.provider-registry.test.shared';

const mockInboundSmsPersistence = (input?: {
  ensuredNeighborId?: string;
  ensuredThreadId?: string;
}) => {
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
        threadId: input?.ensuredThreadId || '00000000-0000-4000-8000-000000000111',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        neighborId: input?.ensuredNeighborId || 'neighbor-inbound',
        state: 'UNCLAIMED',
        summary: '',
        escalationStage: 0,
        nextEvaluationAtUtc: null,
        lastInboundCsNumberId: 'fixture-last-inbound',
        preferredOutboundCsNumberId: 'fixture-preferred-outbound',
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
    eventId: 'canonical-event-inbound-1',
    aggregateId: input?.ensuredThreadId || '00000000-0000-4000-8000-000000000111',
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
    updated: true,
    neighbor: {
      neighborId: input?.ensuredNeighborId || 'neighbor-inbound',
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

  return () => {
    textingPreferenceSpy.mockRestore();
    canonicalEventSpy.mockRestore();
    ensureThreadSpy.mockRestore();
    Object.defineProperty(db, 'transaction', {
      value: originalTransaction,
    });
  };
};
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

  it('prefers canonical neighborId metadata over thread correlation for inbound SMS', async () => {
    const app = buildApp();
    const restore = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-metadata-1001',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValueOnce({
        neighborId: 'neighbor-metadata-1001',
      } as any);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-f1-unclaimed-1001',
          eventType: 'sms.inbound',
          neighborId: 'neighbor-metadata-1001',
          from: '+12605559991',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-metadata-1001',
          },
        },
      });
      expect(resolveActiveSpy).toHaveBeenCalledTimes(1);
      expect(resolveSubjectSpy).not.toHaveBeenCalled();
    } finally {
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('uses thread correlation before phone matching for inbound SMS', async () => {
    const app = buildApp();
    const restore = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-thread-1003',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValueOnce({
        neighborId: 'neighbor-thread-1003',
      } as any);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-f1-unclaimed-1001',
          eventType: 'sms.inbound',
          from: '+12605551004',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-thread-1003',
          },
        },
      });
      expect(resolveSubjectSpy).not.toHaveBeenCalled();
    } finally {
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('reuses a unique phone match and avoids creating duplicate neighbors', async () => {
    const app = buildApp();
    const restore = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-phone-match-1005',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValue(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'single_match',
        neighborId: 'neighbor-phone-match-1005',
        normalizedContactPoint: '+12605551005',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'sms-phone-match-thread-1005',
          eventType: 'sms.inbound',
          from: '(260) 555-1005',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-phone-match-1005',
          },
        },
      });
      expect(createNeighborSpy).not.toHaveBeenCalled();
      expect(resolveSubjectSpy).toHaveBeenCalledWith({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        contactPoint: '+12605551005',
      });
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('creates a new neighbor when phone resolution finds no active match and promotes UNKNOWN to YES', async () => {
    const app = buildApp();
    const restore = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-created-1006',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValue(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'no_match',
        normalizedContactPoint: '+12605551006',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound')
      .mockResolvedValue({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: {
            neighborId: 'neighbor-created-1006',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            firstName: '',
            lastName: '',
            prefersTexting: 'UNKNOWN',
            phones: [
              {
                phoneId: 'phone-created-1006',
                label: 'mobile',
                value: '+12605551006',
                rawInput: '+12605551006',
                displayNational: '(260) 555-1006',
                countryCode: '1',
                nationalNumber: '2605551006',
                extension: null,
                validationStatus: 'valid',
                usageType: 'unknown',
                source: 'system_generated',
                sortOrder: 0,
                isPrimary: true,
                isShared: false,
                verificationStatus: 'verified',
                isActive: true,
                createdAtUtc: '2026-03-18T12:00:00.000Z',
                updatedAtUtc: '2026-03-18T12:00:00.000Z',
              },
            ],
            createdAtUtc: '2026-03-18T12:00:00.000Z',
            updatedAtUtc: '2026-03-18T12:00:00.000Z',
          },
        },
      } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'sms-no-match-thread-1006',
          eventType: 'sms.inbound',
          from: '+12605551006',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-created-1006',
          },
        },
      });
      expect(createNeighborSpy).toHaveBeenCalledWith(expect.objectContaining({
        phone: '+12605551006',
      }));
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('creates a new neighbor when explicit metadata points to a soft-deleted neighbor', async () => {
    const app = buildApp();
    const restore = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-created-1007',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'no_match',
        normalizedContactPoint: '+12605551007',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound')
      .mockResolvedValue({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: {
            neighborId: 'neighbor-created-1007',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            firstName: '',
            lastName: '',
            prefersTexting: 'UNKNOWN',
            phones: [],
            createdAtUtc: '2026-03-18T12:00:00.000Z',
            updatedAtUtc: '2026-03-18T12:00:00.000Z',
          },
        },
      } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'sms-deleted-metadata-thread-1007',
          eventType: 'sms.inbound',
          neighborId: 'neighbor-deleted-1007',
          from: '+12605551007',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-created-1007',
          },
        },
      });
      expect(createNeighborSpy).toHaveBeenCalled();
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('records canonical outbound and inbound events and lists deterministic provider-neutral records', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });
    const adminHeaders = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-admin',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });

    const threadId = 'thread-f2-unclaimed-1001';

    const listMappingsResponse = await request(app)
      .get('/api/v1/connectshyft/numbers')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
      })
      .set(adminHeaders);
    expect(listMappingsResponse.status).toBe(200);
    expect(listMappingsResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
    });

    let mappings = listMappingsResponse.body.data.mappings ?? [];
    if (mappings.length === 0) {
      const numberMappingResponse = await request(app)
        .post('/api/v1/connectshyft/numbers')
        .set(adminHeaders)
        .send({
          orgUnitId: 'org-connectshyft-f2-east',
          providerNumberE164: '+12605550192',
          label: 'F2 East Primary',
          isActive: true,
        });
      expect(numberMappingResponse.status).toBe(201);
      expect(numberMappingResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
        data: {
          orgUnitId: 'org-connectshyft-f2-east',
          isActive: true,
        },
      });
      mappings = numberMappingResponse.body.data.mappings ?? [];
    }

    const selectedMappingId = (
      mappings.find((mapping) => mapping.twilioNumberE164 === '+12605550192')
      || mappings[0]
    ).mappingId;

    for (const mapping of mappings) {
      const shouldBeActive = mapping.mappingId === selectedMappingId;
      if (mapping.isActive === shouldBeActive) {
        continue;
      }

      const updateMappingResponse = await request(app)
        .put(`/api/v1/connectshyft/numbers/${mapping.mappingId}`)
        .set(adminHeaders)
        .send({
          orgUnitId: 'org-connectshyft-f2-east',
          providerNumberE164: mapping.twilioNumberE164,
          label: mapping.label,
          isActive: shouldBeActive,
        });
      expect(updateMappingResponse.status).toBe(200);
      expect(updateMappingResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
      });
    }

    const normalizedMappingsResponse = await request(app)
      .get('/api/v1/connectshyft/numbers')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
      })
      .set(adminHeaders);
    expect(normalizedMappingsResponse.status).toBe(200);

    const activeMappings = (normalizedMappingsResponse.body.data.mappings ?? [])
      .filter((mapping) => mapping.isActive === true);
    expect(activeMappings).toHaveLength(1);

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
    expect(messageResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
    });

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
