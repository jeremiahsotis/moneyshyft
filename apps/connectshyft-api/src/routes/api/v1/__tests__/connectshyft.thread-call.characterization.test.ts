// @ts-nocheck
import request from 'supertest';
import * as OperatorDestinationResolverModule from '../../../../modules/connectshyft/operatorDestinationResolver';
import * as SenderNumberResolverModule from '../../../../modules/connectshyft/senderNumberResolver';
import * as TelephonyReadinessModule from '../../../../modules/connectshyft/telephonyReadiness';
import { resetConnectShyftBridgeSessionStateForTests } from '../../../../modules/connectshyft/bridgeSessions';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import { resetConnectShyftCommunicationAuditLogForTests } from '../../../../modules/connectshyft/communicationAuditLog';
import { resetConnectShyftCommunicationReliabilityStateForTests } from '../../../../modules/connectshyft/communicationReliability';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
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

const TEST_TENANT_ID = 'tenant-connectshyft-f1';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f1-east';
const TEST_ACTOR_USER_ID = 'user-connectshyft-f1-operator';
const CALL_SUCCESS_THREAD_ID = 'thread-f1-unclaimed-1001';
const CALL_CLOSED_THREAD_ID = 'thread-f1-closed-1003';

const buildCallHeaders = (
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

const buildVoiceSenderResolution = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
}) => ({
  ok: true,
  providerNumberE164: '+12605550191',
  mappingId: 'mapping-f1-001',
  routingMetadata: {
    deterministic: true,
    channel: 'voice',
    source: 'thread_alignment',
    mappingLabel: 'Front Desk',
    threadId: input.threadId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    preferredOutboundCsNumberId: '+12605550191',
    lastInboundCsNumberId: '+12605550191',
    alignedFrom: 'preferred_outbound',
    candidateProviderNumberE164: '+12605550191',
  },
});

const buildVoiceSenderRefusal = (input: {
  threadId: string;
  reason?: 'sender_mapping_missing' | 'sender_mapping_ambiguous';
}) => ({
  ok: false,
  code: input.reason === 'sender_mapping_ambiguous'
    ? 'CONNECTSHYFT_SENDER_MAPPING_AMBIGUOUS'
    : 'CONNECTSHYFT_SENDER_MAPPING_REQUIRED',
  message: input.reason === 'sender_mapping_ambiguous'
    ? 'Thread sender alignment maps to multiple active provider numbers in this tenant.'
    : 'Thread sender alignment does not map to an active provider number in this tenant.',
  reason: input.reason || 'sender_mapping_missing',
  routingMetadata: {
    deterministic: true,
    channel: 'voice',
    source: 'thread_alignment',
    threadId: input.threadId,
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    preferredOutboundCsNumberId: '+12605550191',
    lastInboundCsNumberId: '+12605550191',
    alignedFrom: 'preferred_outbound',
    candidateProviderNumberE164: '+12605550191',
  },
});

const buildTelephonyReadiness = (overrides: Record<string, unknown> = {}) => ({
  providerReady: true,
  providerSelectionPathActive: true,
  webhookSignatureConfigured: true,
  orgUnitNumberMappingReady: true,
  voiceSupported: true,
  callbackNumberConfigured: true,
  callbackNumberNormalized: true,
  voiceReady: true,
  bridgeCallRunnable: true,
  smsReady: true,
  messageDispatchRunnable: true,
  provider: {
    requestedProvider: 'telnyx',
    resolvedProvider: 'telnyx',
    deterministic: true,
    adapterInterfaceVersion: 'v1',
  },
  orgUnitNumberMappings: {
    activeCount: 1,
    mappings: [
      {
        mappingId: 'mapping-f1-001',
        twilioNumberE164: '+12605550191',
        label: 'Front Desk',
      },
    ],
  },
  callbackNumber: {
    value: '+12605550155',
    rawInput: '(260) 555-0155',
    createdAtUtc: '2026-03-22T12:00:00.000Z',
    updatedAtUtc: '2026-03-22T12:00:00.000Z',
    persistenceAvailable: true,
  },
  operatorPhoneSource: 'callback_number',
  degradedMode: false,
  blockingReasons: [],
  nextActions: [],
  ...overrides,
});

describe('connectshyft outbound call route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  let resolveOperatorDestinationSpy: jest.SpyInstance;
  let resolveSenderNumberSpy: jest.SpyInstance;
  let inspectReadinessSpy: jest.SpyInstance;

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

    inspectReadinessSpy = jest.spyOn(
      TelephonyReadinessModule.connectShyftTelephonyReadinessServiceAsync,
      'inspectReadiness',
    ).mockResolvedValue(buildTelephonyReadiness());
    resolveOperatorDestinationSpy = jest.spyOn(
      OperatorDestinationResolverModule,
      'resolveOperatorDestination',
    ).mockResolvedValue({
      phoneNumber: '+12605550155',
      source: 'actor_user',
      userId: TEST_ACTOR_USER_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
    });
    resolveSenderNumberSpy = jest.spyOn(SenderNumberResolverModule, 'resolveSenderNumber')
      .mockImplementation(async (input) => buildVoiceSenderResolution(input));
  });

  afterEach(() => {
    inspectReadinessSpy.mockRestore();
    resolveOperatorDestinationSpy.mockRestore();
    resolveSenderNumberSpy.mockRestore();
  });

  it('returns the current outbound call success envelope and bridge-session response shape', async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_SUCCESS_THREAD_ID}/call`)
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
      message: 'ConnectShyft outbound call dispatched',
      data: {
        threadId: CALL_SUCCESS_THREAD_ID,
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
          effectiveRoles: ['ORGUNIT_MEMBER'],
        },
        thread: {
          threadId: CALL_SUCCESS_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          neighborId: 'neighbor-connectshyft-f1-1001',
          source: 'VOICE',
          state: 'UNCLAIMED',
          lastInboundCsNumberId: '+12605550191',
          preferredOutboundCsNumberId: '+12605550191',
          claimedByUserId: null,
          claimedAtUtc: null,
          closedByUserId: null,
          closedAtUtc: null,
          createdAtUtc: expect.any(String),
          updatedAtUtc: expect.any(String),
          escalation: {
            stage: 0,
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
          messageKey: 'connectshyft.outbound.call.dispatched',
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
          aggregateId: CALL_SUCCESS_THREAD_ID,
          aggregateType: 'Thread',
          eventType: 'CallAttemptStarted',
          payload: expect.objectContaining({
            direction: 'outbound',
            channel: 'voice',
            actor: 'user',
            eventName: 'connectshyft.thread.outbound_call_dispatched',
            lifecycleEvent: 'connectshyft.thread.outbound_call_dispatched',
            threadState: 'UNCLAIMED',
            reopenedFromClosed: false,
            outboundMessageArtifact: null,
          }),
          occurredAtUtc: expect.any(String),
        },
        senderResolution: {
          source: 'thread_alignment',
          channel: 'voice',
          senderPhone: '+12605550191',
          orgUnitId: TEST_ORG_UNIT_ID,
          selectedMappingId: 'mapping-f1-001',
          selectedMappingLabel: 'Front Desk',
          alignedFrom: 'preferred_outbound',
        },
        dispatch: {
          providerKey: 'telnyx',
          channel: 'call',
          providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
          providerMessageId: null,
          adapterInvoked: true,
          providerBranchingInDomain: false,
          requestedAt: expect.any(String),
          dispatchContext: {
            targetPhone: '+12605550111',
            messageBodyProvided: false,
          },
        },
        correlationMapping: {
          deterministic: true,
          operatorLegMapping: 'created',
          neighborLegMapping: 'ignored',
          error: null,
        },
        replaySafe: {
          duplicate: false,
          replayKey: null,
        },
        call: {
          transport: 'bridge',
          autoRetry: false,
          redialPolicy: 'manual_only',
          phases: ['initiated', 'ringing', 'connected', 'completed'],
        },
        autoClaimPolicy: {
          trigger: 'CONNECTED',
          appliesToState: 'UNCLAIMED',
          nextState: 'CLAIMED',
        },
        bridgeSession: {
          bridgeSessionId: expect.any(String),
          status: 'operator_dialing',
          operatorLeg: {
            status: 'ringing',
          },
          neighborLeg: {
            status: 'created',
          },
        },
        audit: {
          eventName: 'connectshyft.thread.outbound_call_dispatched',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_ACTOR_USER_ID,
            thread_id: CALL_SUCCESS_THREAD_ID,
            prior_state: 'UNCLAIMED',
            new_state: 'UNCLAIMED',
            action: 'outbound_call',
            reason: null,
            resolution: null,
            thread_reopened_by_user: null,
            lifecycle_lineage: null,
          },
        },
        outbox: {
          eventName: 'connectshyft.thread.outbound_call_dispatched',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_ACTOR_USER_ID,
            thread_id: CALL_SUCCESS_THREAD_ID,
            prior_state: 'UNCLAIMED',
            new_state: 'UNCLAIMED',
            action: 'outbound_call',
            reason: null,
            resolution: null,
            thread_reopened_by_user: null,
            lifecycle_lineage: null,
          },
        },
        outboundDispatch: {
          audit: {
            eventName: 'connectshyft.thread.outbound_call_dispatched',
          },
          outbox: {
            eventName: 'connectshyft.thread.outbound_call_dispatched',
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'autoClaimPolicy',
      'bridgeSession',
      'call',
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
      'providerResolution',
      'replaySafe',
      'senderResolution',
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
    expect(startOutboundCallMock).toHaveBeenCalledTimes(1);
  });

  it('allows outbound bridge calls to continue when degraded mode is active but voice remains runnable', async () => {
    inspectReadinessSpy.mockResolvedValueOnce(buildTelephonyReadiness({
      operatorPhoneSource: 'orgunit_default',
      degradedMode: true,
      blockingReasons: [
        {
          code: 'CONNECTSHYFT_ORGUNIT_DEFAULT_OPERATOR_PHONE_ACTIVE',
          category: 'orgunit_fallback',
          message: 'Using the orgUnit fallback phone until the operator callback number is set.',
          blocking: false,
          channel: 'voice',
        },
      ],
      nextActions: [
        {
          code: 'SET_OPERATOR_CALLBACK_NUMBER',
          message: 'Save a callback / forwarding number so telephony no longer depends on the orgUnit fallback phone.',
        },
      ],
    }));

    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_SUCCESS_THREAD_ID}/call`)
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.code).toBe('CONNECTSHYFT_THREAD_CALL_DISPATCHED');
    expect(startOutboundCallMock).toHaveBeenCalledTimes(1);
  });

  it('preserves the current closed-thread reopen behavior for outbound calls on the same thread', async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_CLOSED_THREAD_ID}/call`)
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550118',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
      message: 'ConnectShyft outbound call dispatched',
      data: {
        threadId: CALL_CLOSED_THREAD_ID,
        thread: {
          threadId: CALL_CLOSED_THREAD_ID,
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
          aggregateId: CALL_CLOSED_THREAD_ID,
          eventType: 'CallAttemptStarted',
          payload: expect.objectContaining({
            direction: 'outbound',
            channel: 'voice',
            lifecycleEvent: 'connectshyft.thread.outbound_call_dispatched',
            threadState: 'UNCLAIMED',
            reopenedFromClosed: true,
          }),
        },
        call: {
          transport: 'bridge',
          autoRetry: false,
          redialPolicy: 'manual_only',
          phases: ['initiated', 'ringing', 'connected', 'completed'],
        },
        autoClaimPolicy: {
          trigger: 'CONNECTED',
          appliesToState: 'UNCLAIMED',
          nextState: 'CLAIMED',
        },
        bridgeSession: {
          bridgeSessionId: expect.any(String),
          status: 'operator_dialing',
        },
        audit: {
          eventName: 'connectshyft.thread_reopened_by_user',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_ACTOR_USER_ID,
            thread_id: CALL_CLOSED_THREAD_ID,
            prior_state: 'CLOSED',
            new_state: 'UNCLAIMED',
            action: 'outbound_call',
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
            eventName: 'connectshyft.thread.outbound_call_dispatched',
            metadata: {
              tenant_id: TEST_TENANT_ID,
              org_unit_id: TEST_ORG_UNIT_ID,
              actor_user_id: TEST_ACTOR_USER_ID,
              thread_id: CALL_CLOSED_THREAD_ID,
              prior_state: 'UNCLAIMED',
              new_state: 'UNCLAIMED',
              action: 'outbound_call',
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
            eventName: 'connectshyft.thread.outbound_call_dispatched',
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'autoClaimPolicy',
      'bridgeSession',
      'call',
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
      'providerResolution',
      'replaySafe',
      'senderResolution',
      'sideEffectsPersisted',
      'thread',
      'threadId',
      'uiFeedback',
    ].sort());
    expect(response.body.data.audit.eventName).not.toBe(response.body.data.outboundDispatch.audit.eventName);
    expect(startOutboundCallMock).toHaveBeenCalledTimes(1);
  });

  it('returns the current operator-destination-missing refusal shape for outbound bridge calls', async () => {
    resolveOperatorDestinationSpy.mockResolvedValueOnce({
      phoneNumber: null,
      source: 'none',
      userId: null,
      orgUnitId: TEST_ORG_UNIT_ID,
    });

    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_SUCCESS_THREAD_ID}/call`)
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        targetPhone: '+12605550111',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_DESTINATION_MISSING',
      message: 'Outbound bridge calls require a resolved operator destination.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: CALL_SUCCESS_THREAD_ID,
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInterfaceVersion: 'v1',
          providerBranchingInDomain: false,
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
    expect(startOutboundCallMock).not.toHaveBeenCalled();
  });

  it('returns the current voice-not-ready refusal shape before outbound call dispatch', async () => {
    inspectReadinessSpy.mockResolvedValueOnce(buildTelephonyReadiness({
      callbackNumberConfigured: false,
      callbackNumberNormalized: false,
      voiceReady: false,
      bridgeCallRunnable: false,
      smsReady: true,
      messageDispatchRunnable: true,
      callbackNumber: {
        value: null,
        rawInput: null,
        createdAtUtc: null,
        updatedAtUtc: null,
        persistenceAvailable: true,
      },
      operatorPhoneSource: 'none',
      degradedMode: false,
      blockingReasons: [
        {
          code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
          category: 'callback_number',
          message: 'Voice forwarding requires an operator callback number.',
          blocking: true,
          channel: 'voice',
        },
      ],
      nextActions: [
        {
          code: 'SET_OPERATOR_CALLBACK_NUMBER',
          message: 'Save a callback / forwarding number for the current operator.',
        },
      ],
    }));

    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_SUCCESS_THREAD_ID}/call`)
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_VOICE_NOT_READY',
      message: 'Outbound bridge calls are unavailable until telephony readiness requirements are satisfied.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: CALL_SUCCESS_THREAD_ID,
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInterfaceVersion: 'v1',
          providerBranchingInDomain: false,
        },
        telephonyReadiness: {
          voiceReady: false,
          bridgeCallRunnable: false,
          smsReady: true,
          messageDispatchRunnable: true,
          operatorPhoneSource: 'none',
          degradedMode: false,
          blockingReasons: [
            expect.objectContaining({
              code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
            }),
          ],
          nextActions: [
            expect.objectContaining({
              code: 'SET_OPERATOR_CALLBACK_NUMBER',
            }),
          ],
        },
        uiFeedback: {
          severity: 'warning',
          ariaLive: 'assertive',
          messageKey: 'connectshyft.outbound.call.not_ready',
          presentation: 'contextual-action-feedback',
          requiresAction: true,
          actionLabel: 'Review telephony',
          accessibilityHint:
            'Resolve telephony readiness requirements before retrying the outbound call.',
          message:
            'Outbound bridge calls are unavailable until telephony readiness requirements are satisfied.',
        },
        chrome: {
          persistentOperationsBannerVisible: false,
          heavyOperationsDefaultLayout: false,
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
    expect(resolveOperatorDestinationSpy).not.toHaveBeenCalled();
    expect(resolveSenderNumberSpy).not.toHaveBeenCalled();
    expect(startOutboundCallMock).not.toHaveBeenCalled();
    expect(startBridgeSessionMock).not.toHaveBeenCalled();
  });

  it('returns the current neighbor-phone-required refusal shape for outbound bridge calls', async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_SUCCESS_THREAD_ID}/call`)
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
      message: 'Outbound bridge calls require a dialable neighbor phone.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: CALL_SUCCESS_THREAD_ID,
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInterfaceVersion: 'v1',
          providerBranchingInDomain: false,
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
    expect(startOutboundCallMock).not.toHaveBeenCalled();
  });

  it('returns the current sender-resolution refusal shape before outbound call dispatch', async () => {
    resolveSenderNumberSpy.mockResolvedValueOnce(
      buildVoiceSenderRefusal({
        threadId: CALL_SUCCESS_THREAD_ID,
      }),
    );

    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_SUCCESS_THREAD_ID}/call`)
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_CALL_SENDER_REQUIRED',
      message: 'Persist one valid mapped ConnectShyft outbound line on the thread before starting a call.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: CALL_SUCCESS_THREAD_ID,
        senderResolution: {
          reason: 'sender_mapping_missing',
          source: 'thread_alignment',
          channel: 'voice',
          orgUnitId: TEST_ORG_UNIT_ID,
          candidateProviderNumberE164: '+12605550191',
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
    expect(startOutboundCallMock).not.toHaveBeenCalled();
  });

  it('returns the current client refusal when call receives a blank threadId param', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/%20/call')
      .set(buildCallHeaders())
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
    });
  });

  it('returns the current thread-not-found refusal when call runs outside the active tenant and orgUnit scope', async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/v1/connectshyft/threads/${CALL_SUCCESS_THREAD_ID}/call`)
      .set(buildCallHeaders({
        'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
        'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
        'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
        'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
      }))
      .send({
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      message: 'Thread not found for this tenant/orgUnit context.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: 'tenant-connectshyft-f2',
          orgUnitId: 'org-connectshyft-f2-east',
          bypassedOrgUnitMembership: false,
        },
        threadId: CALL_SUCCESS_THREAD_ID,
      },
    });
    expect(startOutboundCallMock).not.toHaveBeenCalled();
  });
});
