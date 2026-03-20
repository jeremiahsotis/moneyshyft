// @ts-nocheck
import request from 'supertest';
import * as SenderNumberResolverModule from '../../../../modules/connectshyft/senderNumberResolver';
import { resetConnectShyftBridgeSessionStateForTests } from '../../../../modules/connectshyft/bridgeSessions';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import { resetConnectShyftCommunicationAuditLogForTests } from '../../../../modules/connectshyft/communicationAuditLog';
import { resetConnectShyftCommunicationReliabilityStateForTests } from '../../../../modules/connectshyft/communicationReliability';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import {
  connectShyftSmsPreferenceOverrideServiceAsync,
} from '../../../../modules/connectshyft/smsPreferenceOverrides';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const sendSmsMock = jest.fn(async (command: {
  threadId: string;
  targetPhone?: string;
  senderPhone?: string;
  body?: string;
}) => ({
  providerKey: 'telnyx',
  channel: 'message' as const,
  providerLegId: null,
  providerMessageId: `provider-message-${command.threadId}`,
  providerRequestId: 'req-sms-1001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:00:00.000Z',
}));

const startOutboundCallMock = jest.fn(async (command: { threadId: string; targetPhone?: string }) => ({
  providerKey: 'telnyx',
  channel: 'call' as const,
  providerLegId: command.targetPhone === '+12605550155'
    ? `provider-leg-operator-${command.threadId}`
    : `provider-leg-neighbor-${command.threadId}`,
  providerMessageId: null,
  providerRequestId: 'req-call-2001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:05:00.000Z',
}));

const startBridgeSessionMock = jest.fn(async (command: { bridgeSessionId: string }) => ({
  providerKey: 'telnyx',
  bridgeSessionId: command.bridgeSessionId,
  bridgeEstablished: true as const,
  providerRequestId: 'req-bridge-3001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:06:00.000Z',
}));

const verifyWebhookMock = jest.fn(() => ({ ok: true as const }));
const endCallMock = jest.fn(async (command: { providerLegId: string }) => ({
  providerKey: 'telnyx',
  providerLegId: command.providerLegId,
  ended: true as const,
  providerRequestId: 'req-end-call-4001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:07:00.000Z',
}));

const translateProviderEventMock = jest.fn(() => ({
  eventType: 'SmsInbound',
  payload: {},
  correlation: {
    providerLegId: null,
    providerMessageId: null,
    providerEventId: null,
    providerNumber: null,
  },
  providerNeutral: true as const,
  providerSpecificFieldsStripped: true as const,
  providerBranchingInDomain: false as const,
}));

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

const TEST_TENANT_ID = 'tenant-connectshyft-f2';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f2-east';
const TEST_ACTOR_USER_ID = 'user-connectshyft-f2-operator';
const MESSAGE_SUCCESS_THREAD_ID = 'thread-f2-unclaimed-1001';
const MESSAGE_CLOSED_THREAD_ID = 'thread-f2-closed-1003';

const buildMessageHeaders = (
  overrides: Record<string, string> = {},
): Record<string, string> => buildHeaders({
  'x-test-connectshyft-tenant-id': TEST_TENANT_ID,
  'x-test-connectshyft-orgunit-id': TEST_ORG_UNIT_ID,
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': TEST_ACTOR_USER_ID,
  'x-test-connectshyft-orgunit-memberships': JSON.stringify([TEST_ORG_UNIT_ID]),
  'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
  ...overrides,
});

const buildSmsPreference = (overrides: Record<string, unknown> = {}) => ({
  prefersTexting: 'YES',
  neighborId: 'neighbor-connectshyft-f2-1001',
  source: 'neighbor-record',
  ...overrides,
});

const buildSmsSenderResolution = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
}) => ({
  ok: true,
  providerNumberE164: '+12605550192',
  mappingId: 'mapping-f2-001',
  routingMetadata: {
    deterministic: true,
    channel: 'sms',
    source: 'thread_alignment',
    mappingLabel: 'Overflow',
    threadId: input.threadId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    preferredOutboundCsNumberId: '+12605550192',
    lastInboundCsNumberId: '+12605550192',
    alignedFrom: 'preferred_outbound',
    candidateProviderNumberE164: '+12605550192',
  },
});

const buildSmsSenderRefusal = (input: {
  threadId: string;
}) => ({
  ok: false,
  code: 'CONNECTSHYFT_SENDER_MAPPING_REQUIRED',
  message: 'Thread sender alignment does not map to an active provider number in this tenant.',
  reason: 'sender_mapping_missing',
  routingMetadata: {
    deterministic: true,
    channel: 'sms',
    source: 'thread_alignment',
    threadId: input.threadId,
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    preferredOutboundCsNumberId: '+12605550192',
    lastInboundCsNumberId: '+12605550192',
    alignedFrom: 'preferred_outbound',
    candidateProviderNumberE164: '+12605550192',
  },
});

describe('connectshyft outbound message route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  let resolvePreferenceSpy: jest.SpyInstance;
  let resolveSenderNumberSpy: jest.SpyInstance;

  beforeEach(() => {
    sendSmsMock.mockClear();
    startOutboundCallMock.mockClear();
    startBridgeSessionMock.mockClear();
    verifyWebhookMock.mockClear();
    endCallMock.mockClear();
    translateProviderEventMock.mockClear();
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftBridgeSessionStateForTests();
    resetConnectShyftProviderCorrelationStateForTests();
    resetConnectShyftCommunicationAuditLogForTests();
    resetConnectShyftCommunicationReliabilityStateForTests();

    resolvePreferenceSpy = jest.spyOn(
      connectShyftSmsPreferenceOverrideServiceAsync,
      'resolvePreference',
    ).mockResolvedValue(buildSmsPreference());
    resolveSenderNumberSpy = jest.spyOn(SenderNumberResolverModule, 'resolveSenderNumber')
      .mockImplementation(async (input) => buildSmsSenderResolution(input));
  });

  afterEach(() => {
    resolvePreferenceSpy.mockRestore();
    resolveSenderNumberSpy.mockRestore();
  });

  it('returns the current outbound message success envelope and dispatch response shape', async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${MESSAGE_SUCCESS_THREAD_ID}/messages`)
      .set(buildMessageHeaders())
      .send({
        providerKey: 'telnyx',
        body: 'Checking in about your request',
        targetPhone: '+12605550222',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      message: 'ConnectShyft outbound message dispatched',
      data: {
        threadId: MESSAGE_SUCCESS_THREAD_ID,
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
          effectiveRoles: ['ORGUNIT_MEMBER'],
        },
        thread: {
          threadId: MESSAGE_SUCCESS_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          neighborId: 'neighbor-connectshyft-f2-1001',
          source: 'VOICE',
          state: 'UNCLAIMED',
          lastInboundCsNumberId: '+12605550192',
          preferredOutboundCsNumberId: '+12605550192',
          claimedByUserId: null,
          claimedAtUtc: null,
          closedByUserId: null,
          closedAtUtc: null,
          createdAtUtc: expect.any(String),
          updatedAtUtc: expect.any(String),
          escalation: {
            stage: 1,
            nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
          },
        },
        lifecycleEvent: null,
        lifecycle: {
          priorState: 'UNCLAIMED',
          nextState: 'UNCLAIMED',
          reopenedFromClosed: false,
          reopenedByInbound: false,
          sameThreadId: true,
          noInboundAutoReopenSideEffects: true,
        },
        operatorFeedback: 'Outbound dispatched. Escalation continues until claim; no reset was applied.',
        operatorFeedbackMeta: {
          heading: 'Outbound dispatch completed.',
          hiddenTransition: false,
        },
        uiFeedback: {
          severity: 'success',
          ariaLive: 'polite',
          messageKey: 'connectshyft.outbound.message.dispatched',
          presentation: 'contextual-action-feedback',
          message: 'Outbound dispatched. Escalation continues until claim; no reset was applied.',
          heading: 'Outbound dispatch completed.',
          hiddenTransition: false,
        },
        chrome: {
          persistentOperationsBannerVisible: false,
          heavyOperationsDefaultLayout: false,
        },
        escalationReset: null,
        sideEffectsPersisted: false,
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInterfaceVersion: 'v1',
          providerBranchingInDomain: false,
        },
        canonicalEvent: {
          eventId: expect.any(String),
          aggregateId: MESSAGE_SUCCESS_THREAD_ID,
          aggregateType: 'Thread',
          eventType: 'MessageQueued',
          payload: {
            direction: 'outbound',
            channel: 'sms',
            actor: 'user',
            eventName: 'connectshyft.outbound.sms_appended',
            lifecycleEvent: 'connectshyft.thread.outbound_message_dispatched',
            threadState: 'UNCLAIMED',
            reopenedFromClosed: false,
            outboundMessageArtifact: {
              channel: 'sms',
              direction: 'outbound',
              body: 'Checking in about your request',
              from: '+12605550192',
              to: '+12605550222',
            },
          },
          occurredAtUtc: expect.any(String),
        },
        senderResolution: {
          source: 'thread_alignment',
          channel: 'sms',
          senderPhone: '+12605550192',
          orgUnitId: TEST_ORG_UNIT_ID,
          selectedMappingId: 'mapping-f2-001',
          selectedMappingLabel: 'Overflow',
          alignedFrom: 'preferred_outbound',
          threadHints: {
            lastInboundCsNumberId: '+12605550192',
            preferredOutboundCsNumberId: '+12605550192',
            preferredOutboundLabel: null,
          },
        },
        dispatch: {
          providerKey: 'telnyx',
          channel: 'message',
          providerLegId: null,
          providerMessageId: 'provider-message-thread-f2-unclaimed-1001',
          providerRequestId: 'req-sms-1001',
          adapterInvoked: true,
          providerBranchingInDomain: false,
          requestedAt: '2026-03-11T12:00:00.000Z',
          dispatchContext: {
            targetPhone: '+12605550222',
            messageBodyProvided: true,
          },
        },
        correlationMapping: {
          deterministic: true,
          callLegMapping: 'ignored',
          messageMapping: 'created',
          error: null,
        },
        replaySafe: {
          duplicate: false,
          replayKey: null,
        },
        preferencePolicy: {
          prefersTexting: 'YES',
          source: 'neighbor-record',
          overrideRequired: false,
          overrideAccepted: true,
        },
        sideEffects: {
          messageDispatched: true,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
        audit: {
          eventName: 'connectshyft.thread.outbound_message_dispatched',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_ACTOR_USER_ID,
            thread_id: MESSAGE_SUCCESS_THREAD_ID,
            prior_state: 'UNCLAIMED',
            new_state: 'UNCLAIMED',
            action: 'outbound_message',
            reason: null,
            resolution: null,
            thread_reopened_by_user: null,
            lifecycle_lineage: null,
          },
        },
        outbox: {
          eventName: 'connectshyft.thread.outbound_message_dispatched',
        },
        outboundDispatch: {
          audit: {
            eventName: 'connectshyft.thread.outbound_message_dispatched',
          },
          outbox: {
            eventName: 'connectshyft.thread.outbound_message_dispatched',
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'canonicalEvent',
      'chrome',
      'context',
      'correlationMapping',
      'dispatch',
      'escalationReset',
      'lifecycle',
      'lifecycleEvent',
      'operatorFeedback',
      'operatorFeedbackMeta',
      'outboundDispatch',
      'outbox',
      'preferencePolicy',
      'providerResolution',
      'replaySafe',
      'senderResolution',
      'sideEffects',
      'sideEffectsPersisted',
      'thread',
      'threadId',
      'uiFeedback',
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
    expect(response.body.data.audit).toEqual(response.body.data.outbox);
    expect(response.body.data.outboundDispatch.audit).toEqual(response.body.data.audit);
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
  });

  it('preserves the current closed-thread reopen behavior for outbound messages on the same thread', async () => {
    resolvePreferenceSpy.mockResolvedValueOnce(buildSmsPreference({
      neighborId: 'neighbor-connectshyft-f2-1003',
    }));

    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${MESSAGE_CLOSED_THREAD_ID}/messages`)
      .set(buildMessageHeaders())
      .send({
        providerKey: 'telnyx',
        body: 'Following up on your closed conversation',
        targetPhone: '+12605550228',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      message: 'ConnectShyft outbound message dispatched',
      data: {
        threadId: MESSAGE_CLOSED_THREAD_ID,
        thread: {
          threadId: MESSAGE_CLOSED_THREAD_ID,
          state: 'UNCLAIMED',
          claimedByUserId: null,
          closedByUserId: null,
          closedAtUtc: null,
          escalation: {
            stage: 0,
            nextEvaluationAtUtc: expect.any(String),
          },
        },
        lifecycleEvent: 'connectshyft.thread_reopened_by_user',
        lifecycle: {
          priorState: 'CLOSED',
          nextState: 'UNCLAIMED',
          reopenedFromClosed: true,
          reopenedByInbound: false,
          sameThreadId: true,
          noInboundAutoReopenSideEffects: true,
        },
        operatorFeedback: 'Conversation reopened on the same thread and outbound dispatch completed. Escalation and inactivity timers were reset.',
        operatorFeedbackMeta: {
          heading: 'Conversation reopened and outbound dispatch completed.',
          hiddenTransition: false,
        },
        uiFeedback: {
          severity: 'success',
          ariaLive: 'polite',
          messageKey: 'connectshyft.thread.reopened_dispatch_success',
          presentation: 'contextual-action-feedback',
          message: 'Conversation reopened on the same thread and outbound dispatch completed. Escalation and inactivity timers were reset.',
          heading: 'Conversation reopened and outbound dispatch completed.',
          hiddenTransition: false,
        },
        escalationReset: {
          stage: 0,
          inactivityWindow: 'reset',
        },
        sideEffectsPersisted: false,
        canonicalEvent: {
          aggregateId: MESSAGE_CLOSED_THREAD_ID,
          eventType: 'MessageQueued',
          payload: {
            direction: 'outbound',
            channel: 'sms',
            actor: 'user',
            eventName: 'connectshyft.outbound.sms_appended',
            lifecycleEvent: 'connectshyft.thread.outbound_message_dispatched',
            threadState: 'UNCLAIMED',
            reopenedFromClosed: true,
            outboundMessageArtifact: {
              channel: 'sms',
              direction: 'outbound',
              body: 'Following up on your closed conversation',
              from: '+12605550192',
              to: '+12605550228',
            },
          },
        },
        preferencePolicy: {
          prefersTexting: 'YES',
          source: 'neighbor-record',
          overrideRequired: false,
          overrideAccepted: true,
        },
        sideEffects: {
          messageDispatched: true,
          lifecycleMutationApplied: true,
          auditPersisted: false,
        },
        audit: {
          eventName: 'connectshyft.thread_reopened_by_user',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_ACTOR_USER_ID,
            thread_id: MESSAGE_CLOSED_THREAD_ID,
            prior_state: 'CLOSED',
            new_state: 'UNCLAIMED',
            action: 'outbound_message',
            reason: null,
            resolution: null,
            thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
            lifecycle_lineage: {
              prior_state: 'CLOSED',
              new_state: 'UNCLAIMED',
              thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
            },
          },
        },
        outbox: {
          eventName: 'connectshyft.thread_reopened_by_user',
        },
        outboundDispatch: {
          audit: {
            eventName: 'connectshyft.thread.outbound_message_dispatched',
            metadata: {
              tenant_id: TEST_TENANT_ID,
              org_unit_id: TEST_ORG_UNIT_ID,
              actor_user_id: TEST_ACTOR_USER_ID,
              thread_id: MESSAGE_CLOSED_THREAD_ID,
              prior_state: 'UNCLAIMED',
              new_state: 'UNCLAIMED',
              action: 'outbound_message',
              reason: null,
              resolution: null,
              thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
              lifecycle_lineage: {
                prior_state: 'CLOSED',
                new_state: 'UNCLAIMED',
                thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
              },
            },
          },
          outbox: {
            eventName: 'connectshyft.thread.outbound_message_dispatched',
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'canonicalEvent',
      'chrome',
      'context',
      'correlationMapping',
      'dispatch',
      'escalationReset',
      'lifecycle',
      'lifecycleEvent',
      'operatorFeedback',
      'operatorFeedbackMeta',
      'outboundDispatch',
      'outbox',
      'preferencePolicy',
      'providerResolution',
      'replaySafe',
      'senderResolution',
      'sideEffects',
      'sideEffectsPersisted',
      'thread',
      'threadId',
      'uiFeedback',
    ].sort());
    expect(response.body.data.audit.eventName).not.toBe(response.body.data.outboundDispatch.audit.eventName);
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
  });

  it('returns the current SMS-target-required refusal shape before outbound message dispatch', async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${MESSAGE_SUCCESS_THREAD_ID}/messages`)
      .set(buildMessageHeaders())
      .send({
        providerKey: 'telnyx',
        body: 'Need assistance',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
      message: 'Add or select a valid phone number before sending SMS.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: MESSAGE_SUCCESS_THREAD_ID,
        preferencePolicy: {
          prefersTexting: 'YES',
          source: 'neighbor-record',
          overrideRequired: false,
          overrideAccepted: true,
        },
        targetResolution: {
          reason: 'missing_target',
          source: 'neighbor_record',
          neighborId: 'neighbor-connectshyft-f2-1001',
          requestedTargetPhone: null,
          candidateCount: 0,
          candidatePhones: [],
        },
        uiFeedback: {
          severity: 'warning',
          ariaLive: 'assertive',
          messageKey: 'connectshyft.sms_target.missing',
          presentation: 'contextual-action-feedback',
          requiresAction: true,
          actionLabel: 'Select phone',
          accessibilityHint: 'Update the neighbor profile or choose a valid phone number before sending the outbound message.',
          message: 'Add or select a valid phone number before sending SMS.',
        },
        chrome: {
          persistentOperationsBannerVisible: false,
          heavyOperationsDefaultLayout: false,
        },
        sideEffects: {
          messageDispatched: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('returns the current SMS-sender-required refusal shape before outbound message dispatch', async () => {
    resolveSenderNumberSpy.mockResolvedValueOnce(
      buildSmsSenderRefusal({
        threadId: MESSAGE_SUCCESS_THREAD_ID,
      }),
    );

    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${MESSAGE_SUCCESS_THREAD_ID}/messages`)
      .set(buildMessageHeaders())
      .send({
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550222',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
      message: 'Persist one valid mapped ConnectShyft sender number on the thread before sending SMS.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: MESSAGE_SUCCESS_THREAD_ID,
        preferencePolicy: {
          prefersTexting: 'YES',
          source: 'neighbor-record',
          overrideRequired: false,
          overrideAccepted: true,
        },
        senderResolution: {
          reason: 'invalid_sender_alignment',
          source: 'thread_alignment',
          orgUnitId: TEST_ORG_UNIT_ID,
          activeMappingCount: 0,
          candidateMappings: [],
          threadHints: {
            lastInboundCsNumberId: '+12605550192',
            preferredOutboundCsNumberId: '+12605550192',
            preferredOutboundLabel: null,
          },
        },
        uiFeedback: {
          severity: 'warning',
          ariaLive: 'assertive',
          messageKey: 'connectshyft.sms_sender.required',
          presentation: 'contextual-action-feedback',
          requiresAction: true,
          actionLabel: 'Review numbers',
          accessibilityHint: 'Persist a valid mapped provider number on the thread before retrying.',
          message: 'Persist one valid mapped ConnectShyft sender number on the thread before sending SMS.',
        },
        chrome: {
          persistentOperationsBannerVisible: false,
          heavyOperationsDefaultLayout: false,
        },
        sideEffects: {
          messageDispatched: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('returns the current texting-preference override refusal shape before outbound message dispatch', async () => {
    resolvePreferenceSpy.mockResolvedValueOnce(buildSmsPreference({
      prefersTexting: 'NO',
    }));

    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${MESSAGE_SUCCESS_THREAD_ID}/messages`)
      .set(buildMessageHeaders())
      .send({
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550222',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
      message: 'Outbound SMS requires an override reason when prefers_texting=NO.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: MESSAGE_SUCCESS_THREAD_ID,
        preferencePolicy: {
          prefersTexting: 'NO',
          source: 'neighbor-record',
          overrideRequired: true,
          overrideAccepted: false,
          allowedOverrideReasons: [
            'safety-follow-up',
            'care-plan-exception',
            'documented-consent',
            'critical-service-update',
          ],
        },
        uiFeedback: {
          severity: 'warning',
          ariaLive: 'assertive',
          messageKey: 'connectshyft.override.required',
          presentation: 'contextual-action-feedback',
          requiresAction: true,
          actionLabel: 'Add override reason',
          accessibilityHint: 'Open override reason selector and resubmit the outbound message.',
          message: 'Outbound SMS requires an override reason when prefers_texting=NO.',
        },
        chrome: {
          persistentOperationsBannerVisible: false,
          heavyOperationsDefaultLayout: false,
        },
        sideEffects: {
          messageDispatched: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('returns the current idempotency-conflict refusal shape for materially different outbound messages', async () => {
    const app = buildApp();
    const headers = buildMessageHeaders({
      'Idempotency-Key': 'idem-message-characterization-1001',
    });

    const firstResponse = await request(app)
      .post(`/api/v1/connectshyft/threads/${MESSAGE_SUCCESS_THREAD_ID}/messages`)
      .set(headers)
      .send({
        providerKey: 'telnyx',
        body: 'Initial outbound body',
        targetPhone: '+12605550222',
      });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.ok).toBe(true);

    const conflictResponse = await request(app)
      .post(`/api/v1/connectshyft/threads/${MESSAGE_SUCCESS_THREAD_ID}/messages`)
      .set(headers)
      .send({
        providerKey: 'telnyx',
        body: 'Changed outbound body',
        targetPhone: '+12605550222',
      });

    expect(conflictResponse.status).toBe(200);
    expect(conflictResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
      message: 'Idempotency key cannot be reused for a materially different outbound request.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: MESSAGE_SUCCESS_THREAD_ID,
        idempotency: {
          duplicate: false,
          conflict: true,
          idempotencyKey: 'idem-message-characterization-1001',
        },
      },
    });
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
  });

  it('returns the current client refusal when message receives a blank threadId param', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/%20/messages')
      .set(buildMessageHeaders())
      .send({
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550222',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
    });
  });
});
