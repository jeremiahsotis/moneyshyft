// @ts-nocheck
import request from 'supertest';
import {
  recordConnectShyftCanonicalEvent,
  resetConnectShyftCanonicalEventsForTests,
} from '../../../../modules/connectshyft/canonicalEvents';
import * as ReadContractsModule from '../../../../modules/connectshyft/readContracts';
import {
  CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
} from '../../../../modules/connectshyft/inboundSms';
import {
  CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
  CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES,
} from '../../../../modules/connectshyft/threadTimeline';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TENANT_ID = 'tenant-connectshyft-f1';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f1-east';

const buildThreadDetailRecord = (overrides: Record<string, unknown> = {}) => ({
  threadId: 'thread-timeline-1001',
  neighborId: 'neighbor-timeline-1001',
  neighborDeleted: false,
  neighbor_deleted: false,
  neighborDeletedAtUtc: null,
  neighbor_deleted_at_utc: null,
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  state: 'CLAIMED',
  claimedByUserId: 'user-connectshyft-f1-operator',
  claimed_by_user_id: 'user-connectshyft-f1-operator',
  bucket: 'mine',
  escalationStage: 1,
  isNewUnread: false,
  priorityRank: 3,
  urgencyLabel: 'Needs attention soon',
  lastActivityAtUtc: '2026-03-19T10:05:00.000Z',
  lastInboundCsNumberId: 'cs-number-1001',
  last_inbound_cs_number_id: 'cs-number-1001',
  preferredOutboundCsNumberId: 'cs-number-2001',
  preferred_outbound_cs_number_id: 'cs-number-2001',
  preferredOutboundContext: {
    csNumberId: 'cs-number-2001',
    label: 'Primary Queue',
  },
  preferred_outbound_context: {
    cs_number_id: 'cs-number-2001',
    label: 'Primary Queue',
  },
  voicemailIndicator: false,
  voicemailLabel: null,
  summary: 'Timeline thread detail',
  actions: ['Call', 'Text', 'Close'],
  lifecycle: {
    reopenedByInbound: false,
  },
  ...overrides,
});

const recordTimelineEvent = async (input: {
  threadId: string;
  eventType: string;
  occurredAtUtc: string;
  payload: Record<string, unknown>;
}) => recordConnectShyftCanonicalEvent({
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  aggregateId: input.threadId,
  aggregateType: 'Thread',
  eventType: input.eventType,
  occurredAtUtc: input.occurredAtUtc,
  payload: input.payload,
});

describe('connectshyft thread timeline route', () => {
  registerProviderRegistryRouteIntegrationHooks();

  beforeEach(() => {
    resetConnectShyftCanonicalEventsForTests();
  });

  afterEach(() => {
    resetConnectShyftCanonicalEventsForTests();
  });

  it('returns an ordered mixed inbound and outbound sms timeline', async () => {
    const resolveThreadSpy = jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId: 'thread-timeline-ordered-1001',
    }) as any);

    try {
      await recordTimelineEvent({
        threadId: 'thread-timeline-ordered-1001',
        eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        occurredAtUtc: '2026-03-19T10:00:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'sms',
          actor: 'neighbor',
          eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
          inboundMessageArtifact: {
            body: 'Inbound first',
          },
        },
      });
      await recordTimelineEvent({
        threadId: 'thread-timeline-ordered-1001',
        eventType: 'MessageQueued',
        occurredAtUtc: '2026-03-19T10:01:00.000Z',
        payload: {
          direction: 'outbound',
          channel: 'sms',
          actor: 'user',
          eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
          outboundMessageArtifact: {
            body: 'Outbound second',
          },
        },
      });

      const app = buildApp();
      const response = await request(app)
        .get('/api/v1/connectshyft/threads/thread-timeline-ordered-1001/timeline')
        .set(buildHeaders());

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
        data: {
          thread_id: 'thread-timeline-ordered-1001',
          neighbor_deleted: false,
          neighbor_deleted_at_utc: null,
          deterministic: true,
          limit_applied: 200,
        },
      });
      expect(response.body.data.items).toEqual([
        expect.objectContaining({
          direction: 'inbound',
          channel: 'sms',
          body: 'Inbound first',
          actor: 'neighbor',
        }),
        expect.objectContaining({
          direction: 'outbound',
          channel: 'sms',
          body: 'Outbound second',
          actor: 'user',
        }),
      ]);
    } finally {
      resolveThreadSpy.mockRestore();
    }
  });

  it('applies a bounded most-recent limit window and returns an empty timeline when no sms events are eligible', async () => {
    const resolveThreadSpy = jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockImplementation(async ({ threadId }) => buildThreadDetailRecord({ threadId }) as any);

    try {
      await recordTimelineEvent({
        threadId: 'thread-timeline-limit-1001',
        eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        occurredAtUtc: '2026-03-19T10:00:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'sms',
          actor: 'neighbor',
          eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
          inboundMessageArtifact: {
            body: 'oldest',
          },
        },
      });
      await recordTimelineEvent({
        threadId: 'thread-timeline-limit-1001',
        eventType: 'MessageQueued',
        occurredAtUtc: '2026-03-19T10:01:00.000Z',
        payload: {
          direction: 'outbound',
          channel: 'sms',
          actor: 'user',
          eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
          outboundMessageArtifact: {
            body: 'middle',
          },
        },
      });
      await recordTimelineEvent({
        threadId: 'thread-timeline-limit-1001',
        eventType: 'MessageQueued',
        occurredAtUtc: '2026-03-19T10:02:00.000Z',
        payload: {
          direction: 'outbound',
          channel: 'sms',
          actor: 'user',
          eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
          outboundMessageArtifact: {
            body: 'newest',
          },
        },
      });

      const app = buildApp();
      const limitedResponse = await request(app)
        .get('/api/v1/connectshyft/threads/thread-timeline-limit-1001/timeline')
        .query({
          limit: '2',
        })
        .set(buildHeaders());
      const emptyResponse = await request(app)
        .get('/api/v1/connectshyft/threads/thread-timeline-empty-1001/timeline')
        .set(buildHeaders());

      expect(limitedResponse.status).toBe(200);
      expect(limitedResponse.body.data.limit_applied).toBe(2);
      expect(limitedResponse.body.data.items.map((item) => item.body)).toEqual([
        'middle',
        'newest',
      ]);

      expect(emptyResponse.status).toBe(200);
      expect(emptyResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
        data: {
          thread_id: 'thread-timeline-empty-1001',
          items: [],
        },
      });
    } finally {
      resolveThreadSpy.mockRestore();
    }
  });

  it('refuses deleted-neighbor timeline review without tenant-privileged admin access', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-soft-delete-timeline-1001/timeline')
      .query({
        includeDeleted: 'true',
      })
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN',
      refusalType: 'business',
    });
  });

  it('returns deleted-neighbor timelines only through includeDeleted=true and surfaces deletion metadata', async () => {
    const resolveThreadSpy = jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockImplementation(async ({ threadId, includeDeleted }) => {
      if (threadId !== 'thread-soft-delete-timeline-1001') {
        return null;
      }

      if (includeDeleted !== true) {
        return null;
      }

      return buildThreadDetailRecord({
        threadId,
        neighborDeleted: true,
        neighbor_deleted: true,
        neighborDeletedAtUtc: '2026-03-19T10:00:00.000Z',
        neighbor_deleted_at_utc: '2026-03-19T10:00:00.000Z',
      }) as any;
    });

    try {
      await recordTimelineEvent({
        threadId: 'thread-soft-delete-timeline-1001',
        eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        occurredAtUtc: '2026-03-19T10:01:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'sms',
          actor: 'neighbor',
          eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
          inboundMessageArtifact: {
            body: 'Deleted neighbor history',
          },
        },
      });

      const app = buildApp();
      const hiddenResponse = await request(app)
        .get('/api/v1/connectshyft/threads/thread-soft-delete-timeline-1001/timeline')
        .set(buildHeaders({
          'x-test-connectshyft-role': 'TENANT_ADMIN',
        }));
      const visibleResponse = await request(app)
        .get('/api/v1/connectshyft/threads/thread-soft-delete-timeline-1001/timeline')
        .query({
          includeDeleted: 'true',
        })
        .set(buildHeaders({
          'x-test-connectshyft-role': 'TENANT_ADMIN',
        }));

      expect(hiddenResponse.status).toBe(200);
      expect(hiddenResponse.body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      });

      expect(visibleResponse.status).toBe(200);
      expect(visibleResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
        data: {
          thread_id: 'thread-soft-delete-timeline-1001',
          neighbor_deleted: true,
          neighbor_deleted_at_utc: '2026-03-19T10:00:00.000Z',
          items: [
            expect.objectContaining({
              body: 'Deleted neighbor history',
            }),
          ],
        },
      });
    } finally {
      resolveThreadSpy.mockRestore();
    }
  });

  it('keeps timeline reads tenant-scoped and validates thread existence through the read contract', async () => {
    const resolveThreadSpy = jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(null);

    try {
      const app = buildApp();
      const response = await request(app)
        .get('/api/v1/connectshyft/threads/thread-cross-tenant-hidden-1001/timeline')
        .set(buildHeaders({
          'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f1',
          'x-test-connectshyft-orgunit-id': 'org-connectshyft-f1-east',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      });
      expect(resolveThreadSpy).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-cross-tenant-hidden-1001',
        includeDeleted: false,
      }));
    } finally {
      resolveThreadSpy.mockRestore();
    }
  });

  it('keeps future voice placeholders in stable order alongside sms items', async () => {
    const resolveThreadSpy = jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId: 'thread-timeline-voice-1001',
    }) as any);

    try {
      await recordTimelineEvent({
        threadId: 'thread-timeline-voice-1001',
        eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        occurredAtUtc: '2026-03-19T10:00:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'sms',
          actor: 'neighbor',
          eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
          inboundMessageArtifact: {
            body: 'sms first',
          },
        },
      });
      await recordTimelineEvent({
        threadId: 'thread-timeline-voice-1001',
        eventType: CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.started,
        occurredAtUtc: '2026-03-19T10:01:00.000Z',
        payload: {
          direction: 'outbound',
          channel: 'voice',
          actor: 'user',
          eventName: CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.started,
        },
      });
      await recordTimelineEvent({
        threadId: 'thread-timeline-voice-1001',
        eventType: 'MessageQueued',
        occurredAtUtc: '2026-03-19T10:02:00.000Z',
        payload: {
          direction: 'outbound',
          channel: 'sms',
          actor: 'user',
          eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
          outboundMessageArtifact: {
            body: 'sms last',
          },
        },
      });

      const app = buildApp();
      const response = await request(app)
        .get('/api/v1/connectshyft/threads/thread-timeline-voice-1001/timeline')
        .set(buildHeaders());

      expect(response.status).toBe(200);
      expect(response.body.data.items.map((item) => item.type)).toEqual([
        'message',
        'voice_event',
        'message',
      ]);
      expect(response.body.data.items[1]).toMatchObject({
        channel: 'voice',
        type: 'voice_event',
      });
    } finally {
      resolveThreadSpy.mockRestore();
    }
  });
});
