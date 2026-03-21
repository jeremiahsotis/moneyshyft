// @ts-nocheck
import request from 'supertest';
import db from '../../../../config/knex';
import * as canonicalEventsModule from '../../../../modules/connectshyft/canonicalEvents';
import * as identityResolverModule from '../../../../modules/connectshyft/identityResolver';
import * as neighborsModule from '../../../../modules/connectshyft/neighbors';
import { AsyncConnectShyftNeighborService } from '../../../../modules/connectshyft/neighbors';
import {
  connectShyftNumberMappingServiceAsync,
  type ConnectShyftNumberMapping,
} from '../../../../modules/connectshyft/numberMappings';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import { AsyncConnectShyftThreadService } from '../../../../modules/connectshyft/threads';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TENANT_ID = 'tenant-connectshyft-f1';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f1-east';
const TEST_PROVIDER_NUMBER = '+12605550191';
const TEST_TIMESTAMP = '2026-03-18T12:00:00.000Z';

const readString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const sendSmsMock = jest.fn();
const startOutboundCallMock = jest.fn();
const startBridgeSessionMock = jest.fn();
const endCallMock = jest.fn();
const verifyWebhookMock = jest.fn(() => ({ ok: true as const }));
const translateProviderEventMock = jest.fn(({ rawEventType, payload }: {
  rawEventType: string;
  payload: unknown;
}) => {
  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};

  return {
    eventType: readString(rawEventType) || 'sms.inbound',
    payload: source,
    correlation: {
      providerLegId: readString(source.providerLegId, source.provider_leg_id),
      providerMessageId: readString(
        source.providerMessageId,
        source.provider_message_id,
        source.messageId,
        source.message_id,
        source.sid,
      ),
      providerEventId: readString(
        source.providerEventId,
        source.provider_event_id,
        source.eventId,
        source.event_id,
      ),
      providerNumber: readString(source.to, source.toNumber, source.to_number),
    },
    providerNeutral: true as const,
    providerSpecificFieldsStripped: true as const,
    providerBranchingInDomain: false as const,
  };
});

jest.mock('../../../../../../../infrastructure/communications', () => ({
  resolveTelephonyProviderAdapter: jest.fn(() => ({
    providerKey: 'telnyx',
    adapterInterfaceVersion: 'v1',
    sendSms: sendSmsMock,
    startOutboundCall: startOutboundCallMock,
    startBridgeSession: startBridgeSessionMock,
    endCall: endCallMock,
    verifyWebhook: verifyWebhookMock,
    translateProviderEvent: translateProviderEventMock,
  })),
}));

const buildSmsHeaders = (
  overrides: Record<string, string> = {},
): Record<string, string> => buildHeaders({
  'x-test-connectshyft-tenant-id': TEST_TENANT_ID,
  'x-test-connectshyft-orgunit-id': TEST_ORG_UNIT_ID,
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-f1-operator',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify([TEST_ORG_UNIT_ID]),
  'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
  ...overrides,
});

const buildNumberMapping = (
  overrides: Partial<ConnectShyftNumberMapping> & Pick<
    ConnectShyftNumberMapping,
    'mappingId' | 'tenantId' | 'orgUnitId' | 'twilioNumberE164' | 'label'
  >,
): ConnectShyftNumberMapping => ({
  mappingId: overrides.mappingId,
  tenantId: overrides.tenantId,
  orgUnitId: overrides.orgUnitId,
  twilioNumberE164: overrides.twilioNumberE164,
  label: overrides.label,
  isActive: overrides.isActive ?? true,
  createdAtUtc: overrides.createdAtUtc ?? TEST_TIMESTAMP,
  updatedAtUtc: overrides.updatedAtUtc ?? TEST_TIMESTAMP,
});

const buildEnsuredThread = (overrides: Record<string, unknown> = {}) => ({
  threadId: 'thread-sms-characterization-1001',
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  neighborId: 'neighbor-connectshyft-f1-1001',
  source: 'SMS',
  state: 'UNCLAIMED',
  lastInboundCsNumberId: TEST_PROVIDER_NUMBER,
  preferredOutboundCsNumberId: TEST_PROVIDER_NUMBER,
  claimedByUserId: null,
  claimedAtUtc: null,
  closedByUserId: null,
  closedAtUtc: null,
  createdAtUtc: TEST_TIMESTAMP,
  updatedAtUtc: TEST_TIMESTAMP,
  escalation: {
    stage: 0,
    nextEvaluationAtUtc: null,
  },
  ...overrides,
});

const buildInboundSmsBody = (overrides: Record<string, unknown> = {}) => ({
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  threadId: 'thread-f1-unclaimed-1001',
  eventType: 'sms.inbound',
  sid: 'sms-sid-characterization-1001',
  providerEventId: 'provider-event-sms-characterization-1001',
  providerMessageId: 'provider-message-sms-characterization-1001',
  from: '+12605552001',
  to: TEST_PROVIDER_NUMBER,
  body: 'Please call me back when you can.',
  ...overrides,
});

const mockInboundSmsPersistence = (input?: {
  ensuredNeighborId?: string;
  ensuredThreadId?: string;
  ensureThreadError?: Error;
  canonicalEventError?: Error;
}) => {
  const originalTransaction = db.transaction;
  const mockedTransaction = jest.fn(async (handler: any) =>
    handler({
      fn: {
        now: () => new Date(TEST_TIMESTAMP),
      },
    }));
  Object.defineProperty(db, 'transaction', {
    value: mockedTransaction,
  });

  const ensureThreadSpy = jest.spyOn(
    AsyncConnectShyftThreadService.prototype,
    'ensureThread',
  );
  if (input?.ensureThreadError) {
    ensureThreadSpy.mockRejectedValue(input.ensureThreadError);
  } else {
    ensureThreadSpy.mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_ENSURED',
      httpStatus: 200,
      data: {
        thread: buildEnsuredThread({
          threadId: input?.ensuredThreadId || 'thread-sms-characterization-1001',
          neighborId: input?.ensuredNeighborId || 'neighbor-connectshyft-f1-1001',
        }),
      },
    } as any);
  }

  const canonicalEventSpy = jest.spyOn(
    canonicalEventsModule,
    'recordConnectShyftCanonicalEvent',
  );
  if (input?.canonicalEventError) {
    canonicalEventSpy.mockRejectedValue(input.canonicalEventError);
  } else {
    canonicalEventSpy.mockImplementation(async (eventInput) => ({
      eventId: 'canonical-event-sms-characterization-1001',
      aggregateId: eventInput.aggregateId,
      aggregateType: eventInput.aggregateType,
      eventType: eventInput.eventType,
      payload: eventInput.payload,
      occurredAtUtc: TEST_TIMESTAMP,
    }) as any);
  }

  const textingPreferenceSpy = jest.spyOn(
    AsyncConnectShyftNeighborService.prototype,
    'applyInboundSmsTextingPreference',
  ).mockResolvedValue({
    ok: true,
    updated: true,
    neighbor: {
      neighborId: input?.ensuredNeighborId || 'neighbor-connectshyft-f1-1001',
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      firstName: '',
      lastName: '',
      prefersTexting: 'YES',
      phones: [],
      createdAtUtc: TEST_TIMESTAMP,
      updatedAtUtc: TEST_TIMESTAMP,
    },
  } as any);

  return {
    canonicalEventSpy,
    ensureThreadSpy,
    textingPreferenceSpy,
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

describe('connectshyft inbound sms webhook route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  let resolveRoutingMappingByNumberSpy: jest.SpyInstance;

  beforeEach(() => {
    sendSmsMock.mockClear();
    startOutboundCallMock.mockClear();
    startBridgeSessionMock.mockClear();
    endCallMock.mockClear();
    verifyWebhookMock.mockClear();
    translateProviderEventMock.mockClear();
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftProviderCorrelationStateForTests();

    resolveRoutingMappingByNumberSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'resolveRoutingMappingByNumber',
    ).mockImplementation(async (input) => {
      if (
        input.twilioNumberE164 === TEST_PROVIDER_NUMBER
        && (!input.tenantId || input.tenantId === TEST_TENANT_ID)
      ) {
        return {
          status: 'found' as const,
          mapping: buildNumberMapping({
            mappingId: 'mapping-f1-001',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            twilioNumberE164: TEST_PROVIDER_NUMBER,
            label: 'Front Desk',
          }),
        };
      }

      return {
        status: 'not-found' as const,
      };
    });
  });

  afterEach(() => {
    resolveRoutingMappingByNumberSpy.mockRestore();
  });

  it('returns the current inbound SMS success envelope and response payload shape on /webhooks/sms', async () => {
    const app = buildApp();
    const { canonicalEventSpy, restore } = mockInboundSmsPersistence({
      ensuredThreadId: 'thread-sms-characterization-1001',
      ensuredNeighborId: 'neighbor-connectshyft-f1-1001',
    });

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          providerEventId: 'provider-event-sms-success-1001',
          providerMessageId: 'provider-message-sms-success-1001',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        message: 'Inbound webhook accepted for processing',
        data: {
          sid: 'sms-sid-characterization-1001',
          from: '+12605552001',
          to: TEST_PROVIDER_NUMBER,
          eventType: 'sms.inbound',
          providerResolution: {
            requestedProvider: 'telnyx',
            resolvedProvider: 'telnyx',
            deterministic: true,
            adapterInvoked: true,
          },
          correlation: {
            source: 'metadata',
            deterministic: true,
            threadId: 'thread-sms-characterization-1001',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            neighborId: 'neighbor-connectshyft-f1-1001',
            providerLegId: null,
            providerMessageId: 'provider-message-sms-success-1001',
            providerEventId: 'provider-event-sms-success-1001',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-success-1001',
          },
          canonicalTranslation: {
            eventType: 'sms.inbound',
            providerNeutral: true,
            providerSpecificFieldsStripped: true,
            providerBranchingInDomain: false,
          },
          domainHandlers: {
            providerBranchingInDomain: false,
          },
          canonicalEvent: {
            eventId: 'canonical-event-sms-characterization-1001',
            aggregateId: 'thread-sms-characterization-1001',
            aggregateType: 'Thread',
            eventType: 'connectshyft.inbound.sms_appended',
          },
          threadId: 'thread-sms-characterization-1001',
          threadState: 'UNCLAIMED',
          thread: buildEnsuredThread(),
          lifecycle: {
            ensuredActiveThread: true,
            createdNewThread: true,
          },
          inboundMessageArtifact: {
            artifactId: 'canonical-event-sms-characterization-1001',
            channel: 'sms',
            direction: 'inbound',
            providerEventId: 'provider-event-sms-success-1001',
            providerMessageId: 'provider-message-sms-success-1001',
            providerLegId: null,
            body: 'Please call me back when you can.',
            from: '+12605552001',
            to: TEST_PROVIDER_NUMBER,
          },
          transaction: {
            atomic: false,
            auditPersisted: false,
            outboxPersisted: false,
          },
          sideEffects: {
            lifecycleMutationApplied: true,
            canonicalEventPersisted: true,
            auditPersisted: false,
            outboxPersisted: false,
          },
          timeline: {
            eventName: 'connectshyft.inbound.sms_appended',
            routingDecision: 'accepted',
            deterministicOrdering: true,
          },
          timelineOutcome: {
            eventName: 'connectshyft.inbound.sms_appended',
            routingDecision: 'accepted',
          },
        },
      });
      expect(Object.keys(response.body.data).sort()).toEqual([
        'canonicalEvent',
        'canonicalTranslation',
        'correlation',
        'domainHandlers',
        'eventType',
        'from',
        'inboundMessageArtifact',
        'lifecycle',
        'providerResolution',
        'replaySafe',
        'sideEffects',
        'sid',
        'thread',
        'threadId',
        'threadState',
        'timeline',
        'timelineOutcome',
        'to',
        'transaction',
      ].sort());
      expect(Object.keys(response.body.data.canonicalTranslation).sort()).toEqual([
        'correlation',
        'eventType',
        'payload',
        'providerBranchingInDomain',
        'providerNeutral',
        'providerSpecificFieldsStripped',
      ].sort());
      expect(Object.keys(response.body.data.thread).sort()).toEqual([
        'claimedAtUtc',
        'claimedByUserId',
        'closedAtUtc',
        'closedByUserId',
        'createdAtUtc',
        'escalation',
        'lastInboundCsNumberId',
        'neighborId',
        'orgUnitId',
        'preferredOutboundCsNumberId',
        'source',
        'state',
        'tenantId',
        'threadId',
        'updatedAtUtc',
      ].sort());
      expect(response.body.data).not.toHaveProperty('audit');
      expect(response.body.data).not.toHaveProperty('outbox');
      expect(canonicalEventSpy).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it('preserves the current duplicate-safe replay surface for inbound SMS webhooks', async () => {
    const app = buildApp();
    const { canonicalEventSpy, restore } = mockInboundSmsPersistence({
      ensuredThreadId: 'thread-sms-characterization-duplicate-1002',
      ensuredNeighborId: 'neighbor-connectshyft-f1-1001',
    });

    try {
      const body = buildInboundSmsBody({
        providerEventId: 'provider-event-sms-duplicate-1002',
        providerMessageId: 'provider-message-sms-duplicate-1002',
      });

      const firstResponse = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(body);
      const duplicateResponse = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(body);

      expect(firstResponse.status).toBe(200);
      expect(duplicateResponse.status).toBe(200);
      expect(duplicateResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        message: 'Inbound webhook accepted (duplicate suppressed)',
        data: {
          sid: 'sms-sid-characterization-1001',
          from: '+12605552001',
          to: TEST_PROVIDER_NUMBER,
          eventType: 'sms.inbound',
          providerResolution: {
            requestedProvider: 'telnyx',
            resolvedProvider: 'telnyx',
            deterministic: true,
            adapterInvoked: true,
          },
          correlation: {
            source: 'metadata',
            deterministic: true,
            threadId: 'thread-f1-unclaimed-1001',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            providerMessageId: 'provider-message-sms-duplicate-1002',
            providerEventId: 'provider-event-sms-duplicate-1002',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: true,
            suppressedDomainWrites: true,
            dedupeKey: 'provider-event:provider-event-sms-duplicate-1002',
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
        },
      });
      expect(Object.keys(duplicateResponse.body.data).sort()).toEqual([
        'correlation',
        'eventType',
        'from',
        'providerResolution',
        'replaySafe',
        'sideEffects',
        'sid',
        'to',
      ].sort());
      expect(canonicalEventSpy).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it.each([
    {
      name: 'required',
      body: buildInboundSmsBody({
        threadId: undefined,
        providerEventId: 'provider-event-sms-missing-phone-1003',
        providerMessageId: 'provider-message-sms-missing-phone-1003',
        from: undefined,
      }),
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
      message: 'Inbound SMS processing requires a sender phone number.',
      reason: 'sender_phone_required',
    },
    {
      name: 'invalid',
      body: buildInboundSmsBody({
        threadId: undefined,
        providerEventId: 'provider-event-sms-invalid-phone-1004',
        providerMessageId: 'provider-message-sms-invalid-phone-1004',
        from: 'not-a-phone-number',
      }),
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
      message: 'Inbound SMS processing requires a valid sender phone number.',
      reason: 'sender_phone_invalid',
    },
  ])('returns the current sender-phone-%s refusal shape before inbound SMS processing continues', async ({
    body,
    code,
    message,
    reason,
  }) => {
    const app = buildApp();
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code,
        message,
        refusalType: 'business',
        data: {
          providerResolution: {
            requestedProvider: 'telnyx',
            resolvedProvider: 'telnyx',
            deterministic: true,
            adapterInvoked: true,
          },
          correlation: {
            source: 'number_mapping',
            deterministic: true,
            threadId: '',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            providerMessageId: body.providerMessageId,
            providerEventId: body.providerEventId,
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: `provider-event:${body.providerEventId}`,
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
          reason,
        },
      });
      expect(Object.keys(response.body.data).sort()).toEqual([
        'correlation',
        'providerResolution',
        'reason',
        'replaySafe',
        'sideEffects',
        'timelineOutcome',
      ].sort());
      expect(resolveSubjectSpy).not.toHaveBeenCalled();
    } finally {
      resolveSubjectSpy.mockRestore();
    }
  });

  it('returns the current ambiguous-neighbor refusal shape when multiple active neighbors share the same sender phone', async () => {
    const app = buildApp();
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValue(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'multiple_matches',
        candidateNeighborIds: ['neighbor-a-2003', 'neighbor-b-2003'],
        normalizedContactPoint: '+12605552003',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          threadId: undefined,
          providerEventId: 'provider-event-sms-ambiguous-2003',
          providerMessageId: 'provider-message-sms-ambiguous-2003',
          from: '+12605552003',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'IDENTITY_MATCH_AMBIGUOUS',
        message: 'Inbound SMS sender phone matches multiple neighbors. Resolve manually before retrying.',
        refusalType: 'business',
        data: {
          providerResolution: {
            requestedProvider: 'telnyx',
            resolvedProvider: 'telnyx',
            deterministic: true,
            adapterInvoked: true,
          },
          correlation: {
            source: 'number_mapping',
            deterministic: true,
            threadId: '',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            providerMessageId: 'provider-message-sms-ambiguous-2003',
            providerEventId: 'provider-event-sms-ambiguous-2003',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-ambiguous-2003',
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
          senderPhone: '+12605552003',
          candidateNeighborIds: ['neighbor-a-2003', 'neighbor-b-2003'],
          reason: 'neighbor_ambiguous',
        },
      });
      expect(Object.keys(response.body.data).sort()).toEqual([
        'candidateNeighborIds',
        'correlation',
        'providerResolution',
        'reason',
        'replaySafe',
        'senderPhone',
        'sideEffects',
        'timelineOutcome',
      ].sort());
      expect(createNeighborSpy).not.toHaveBeenCalled();
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
    }
  });

  it('preserves the ambiguity refusal path for PeopleCore and legacy disagreement without attaching or creating a neighbor', async () => {
    const app = buildApp();
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValue(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'multiple_matches',
        candidateNeighborIds: ['neighbor-conflict-2004'],
        normalizedContactPoint: '+12605552004',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          threadId: undefined,
          providerEventId: 'provider-event-sms-conflict-2004',
          providerMessageId: 'provider-message-sms-conflict-2004',
          from: '+12605552004',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'IDENTITY_MATCH_AMBIGUOUS',
        message: 'Inbound SMS sender phone matches multiple neighbors. Resolve manually before retrying.',
        refusalType: 'business',
        data: {
          correlation: {
            source: 'number_mapping',
            deterministic: true,
            threadId: '',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            providerMessageId: 'provider-message-sms-conflict-2004',
            providerEventId: 'provider-event-sms-conflict-2004',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-conflict-2004',
          },
          senderPhone: '+12605552004',
          candidateNeighborIds: ['neighbor-conflict-2004'],
          reason: 'neighbor_ambiguous',
        },
      });
      expect(createNeighborSpy).not.toHaveBeenCalled();
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
    }
  });

  it('returns the current inbound SMS success shape when subject resolution finds a single reusable neighbor', async () => {
    const app = buildApp();
    const { canonicalEventSpy, ensureThreadSpy, restore } = mockInboundSmsPersistence({
      ensuredThreadId: 'thread-sms-characterization-single-match-2002',
      ensuredNeighborId: 'neighbor-connectshyft-f1-2002',
    });
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'single_match',
        neighborId: 'neighbor-connectshyft-f1-2002',
        normalizedContactPoint: '+12605552002',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          threadId: undefined,
          providerEventId: 'provider-event-sms-single-match-2002',
          providerMessageId: 'provider-message-sms-single-match-2002',
          from: '(260) 555-2002',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        message: 'Inbound webhook accepted for processing',
        data: {
          from: '(260) 555-2002',
          to: TEST_PROVIDER_NUMBER,
          eventType: 'sms.inbound',
          correlation: {
            source: 'number_mapping',
            deterministic: true,
            threadId: 'thread-sms-characterization-single-match-2002',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            neighborId: 'neighbor-connectshyft-f1-2002',
            providerMessageId: 'provider-message-sms-single-match-2002',
            providerEventId: 'provider-event-sms-single-match-2002',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-single-match-2002',
          },
          threadId: 'thread-sms-characterization-single-match-2002',
          threadState: 'UNCLAIMED',
          thread: buildEnsuredThread({
            threadId: 'thread-sms-characterization-single-match-2002',
            neighborId: 'neighbor-connectshyft-f1-2002',
          }),
          lifecycle: {
            ensuredActiveThread: true,
            createdNewThread: true,
          },
          inboundMessageArtifact: {
            body: 'Please call me back when you can.',
            from: '(260) 555-2002',
            to: TEST_PROVIDER_NUMBER,
            providerEventId: 'provider-event-sms-single-match-2002',
            providerMessageId: 'provider-message-sms-single-match-2002',
          },
        },
      });
      expect(resolveSubjectSpy).toHaveBeenCalledWith({
        tenantId: TEST_TENANT_ID,
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: '+12605552002',
      });
      expect(createNeighborSpy).not.toHaveBeenCalled();
      expect(ensureThreadSpy).toHaveBeenCalledTimes(1);
      expect(canonicalEventSpy).toHaveBeenCalledTimes(1);
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      restore();
    }
  });

  it('preserves the create-new flow when subject resolution reports no reusable neighbor', async () => {
    const app = buildApp();
    const { canonicalEventSpy, ensureThreadSpy, restore } = mockInboundSmsPersistence({
      ensuredThreadId: 'thread-sms-characterization-created-2011',
      ensuredNeighborId: 'neighbor-connectshyft-f1-2011',
    });
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'no_match',
        normalizedContactPoint: '+12605552011',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound')
      .mockResolvedValue({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: {
            neighborId: 'neighbor-connectshyft-f1-2011',
          },
        },
      } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          threadId: undefined,
          providerEventId: 'provider-event-sms-created-2011',
          providerMessageId: 'provider-message-sms-created-2011',
          from: '+12605552011',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        message: 'Inbound webhook accepted for processing',
        data: {
          from: '+12605552011',
          to: TEST_PROVIDER_NUMBER,
          eventType: 'sms.inbound',
          correlation: {
            source: 'number_mapping',
            deterministic: true,
            threadId: 'thread-sms-characterization-created-2011',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            neighborId: 'neighbor-connectshyft-f1-2011',
            providerMessageId: 'provider-message-sms-created-2011',
            providerEventId: 'provider-event-sms-created-2011',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-created-2011',
          },
          threadId: 'thread-sms-characterization-created-2011',
          threadState: 'UNCLAIMED',
          thread: buildEnsuredThread({
            threadId: 'thread-sms-characterization-created-2011',
            neighborId: 'neighbor-connectshyft-f1-2011',
          }),
          lifecycle: {
            ensuredActiveThread: true,
            createdNewThread: true,
          },
          inboundMessageArtifact: {
            body: 'Please call me back when you can.',
            from: '+12605552011',
            to: TEST_PROVIDER_NUMBER,
            providerEventId: 'provider-event-sms-created-2011',
            providerMessageId: 'provider-message-sms-created-2011',
          },
        },
      });
      expect(resolveSubjectSpy).toHaveBeenCalledWith({
        tenantId: TEST_TENANT_ID,
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: '+12605552011',
      });
      expect(createNeighborSpy).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: TEST_TENANT_ID,
        orgUnitId: TEST_ORG_UNIT_ID,
        phone: '+12605552011',
      }));
      expect(ensureThreadSpy).toHaveBeenCalledTimes(1);
      expect(canonicalEventSpy).toHaveBeenCalledTimes(1);
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      restore();
    }
  });

  it('returns the current unresolved-neighbor refusal shape when inbound neighbor creation yields no reusable neighbor id', async () => {
    const app = buildApp();
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'no_match',
        normalizedContactPoint: '+12605552012',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound')
      .mockResolvedValue({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: {
            neighborId: '',
          },
        },
      } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          threadId: undefined,
          providerEventId: 'provider-event-sms-unresolved-2012',
          providerMessageId: 'provider-message-sms-unresolved-2012',
          from: '+12605552012',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_WEBHOOK_NEIGHBOR_UNRESOLVED',
        message: 'Inbound SMS processing requires a resolvable neighbor context.',
        refusalType: 'business',
        data: {
          providerResolution: {
            requestedProvider: 'telnyx',
            resolvedProvider: 'telnyx',
            deterministic: true,
            adapterInvoked: true,
          },
          correlation: {
            source: 'number_mapping',
            deterministic: true,
            threadId: '',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            providerMessageId: 'provider-message-sms-unresolved-2012',
            providerEventId: 'provider-event-sms-unresolved-2012',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-unresolved-2012',
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
          senderPhone: '+12605552012',
          reason: 'neighbor_unresolved',
        },
      });
      expect(Object.keys(response.body.data).sort()).toEqual([
        'correlation',
        'providerResolution',
        'reason',
        'replaySafe',
        'senderPhone',
        'sideEffects',
        'timelineOutcome',
      ].sort());
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
    }
  });

  it('returns the current inbound SMS thread-ensure persistence refusal mapping', async () => {
    const app = buildApp();
    const { canonicalEventSpy, ensureThreadSpy, restore } = mockInboundSmsPersistence({
      ensureThreadError: new Error('thread-ensure-down'),
    });

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          providerEventId: 'provider-event-sms-ensure-error-1005',
          providerMessageId: 'provider-message-sms-ensure-error-1005',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_THREAD_ENSURE_PERSISTENCE_UNAVAILABLE',
        message: 'Inbound SMS thread ensure is temporarily unavailable.',
        refusalType: 'business',
        data: {
          providerResolution: {
            requestedProvider: 'telnyx',
            resolvedProvider: 'telnyx',
            deterministic: true,
            adapterInvoked: true,
          },
          correlation: {
            source: 'metadata',
            deterministic: true,
            threadId: 'thread-f1-unclaimed-1001',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            neighborId: 'neighbor-connectshyft-f1-1001',
            providerMessageId: 'provider-message-sms-ensure-error-1005',
            providerEventId: 'provider-event-sms-ensure-error-1005',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-ensure-error-1005',
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          error: 'thread-ensure-down',
        },
      });
      expect(Object.keys(response.body.data).sort()).toEqual([
        'correlation',
        'error',
        'providerResolution',
        'replaySafe',
        'sideEffects',
      ].sort());
      expect(ensureThreadSpy).toHaveBeenCalledTimes(1);
      expect(canonicalEventSpy).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('returns the current inbound SMS canonical persistence refusal mapping', async () => {
    const app = buildApp();
    const { canonicalEventSpy, ensureThreadSpy, restore } = mockInboundSmsPersistence({
      canonicalEventError: new Error('canonical-down'),
    });

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/sms')
        .set(buildSmsHeaders())
        .send(buildInboundSmsBody({
          providerEventId: 'provider-event-sms-canonical-error-1006',
          providerMessageId: 'provider-message-sms-canonical-error-1006',
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_INBOUND_SMS_PERSISTENCE_UNAVAILABLE',
        message: 'Inbound SMS processing could not persist timeline side effects.',
        refusalType: 'business',
        data: {
          providerResolution: {
            requestedProvider: 'telnyx',
            resolvedProvider: 'telnyx',
            deterministic: true,
            adapterInvoked: true,
          },
          correlation: {
            source: 'metadata',
            deterministic: true,
            threadId: 'thread-f1-unclaimed-1001',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            neighborId: 'neighbor-connectshyft-f1-1001',
            providerMessageId: 'provider-message-sms-canonical-error-1006',
            providerEventId: 'provider-event-sms-canonical-error-1006',
            providerNumberE164: TEST_PROVIDER_NUMBER,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-sms-canonical-error-1006',
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          error: 'canonical-down',
        },
      });
      expect(Object.keys(response.body.data).sort()).toEqual([
        'correlation',
        'error',
        'providerResolution',
        'replaySafe',
        'sideEffects',
      ].sort());
      expect(ensureThreadSpy).toHaveBeenCalledTimes(1);
      expect(canonicalEventSpy).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });
});
