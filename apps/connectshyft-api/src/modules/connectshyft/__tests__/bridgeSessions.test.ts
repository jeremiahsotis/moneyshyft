import {
  BridgeSessionState,
  handleConnectShyftBridgeWebhookEvent,
  loadConnectShyftBridgeAggregateByProviderCallId,
  loadConnectShyftBridgeAggregateBySessionId,
  resetConnectShyftBridgeSessionStateForTests,
  startConnectShyftBridgeSession,
  transitionBridgeSessionState,
  transitionConnectShyftBridgeSessionStateAsync,
} from '../bridgeSessions'
import { resetConnectShyftProviderCorrelationStateForTests } from '../providerCorrelationMappings'
import type { ConnectShyftProviderAdapter } from '../providerRegistry'

const sendSmsMock = jest.fn()
const startOutboundCallMock = jest.fn()
const startBridgeOutboundCallMock = jest.fn(async (input: { legRole: string; threadId: string }) => ({
  providerKey: 'provider-a',
  channel: 'call' as const,
  providerLegId: input.legRole === 'operator'
    ? `provider-leg-operator-${input.threadId}`
    : `provider-leg-neighbor-${input.threadId}`,
  providerMessageId: null,
  providerRequestId: `req-${input.legRole}-${input.threadId}`,
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:00:00.000Z',
}))
const startBridgeSessionMock = jest.fn(async (input: { bridgeSessionId: string }) => ({
  providerKey: 'provider-a',
  bridgeSessionId: input.bridgeSessionId,
  bridgeEstablished: true as const,
  providerRequestId: 'req-bridge-1001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:05:00.000Z',
}))
const verifyWebhookMock = jest.fn(() => ({ ok: true as const }))
const endCallMock = jest.fn(async (input: { providerLegId: string }) => ({
  providerKey: 'provider-a',
  providerLegId: input.providerLegId,
  ended: true as const,
  providerRequestId: 'req-end-call-1001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:07:00.000Z',
}))
const translateProviderEventMock = jest.fn(({ rawEventType, payload }: { rawEventType: string; payload: unknown }) => ({
  eventType: rawEventType,
  payload: (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>,
  correlation: {
    providerLegId: null,
    providerMessageId: null,
    providerEventId: null,
    providerNumber: null,
  },
  providerNeutral: true as const,
  providerSpecificFieldsStripped: true as const,
  providerBranchingInDomain: false as const,
}))

const providerAdapter: ConnectShyftProviderAdapter = {
  providerKey: 'provider-a',
  adapterInterfaceVersion: 'v1',
  sendSms: sendSmsMock,
  startOutboundCall: startOutboundCallMock,
  startBridgeOutboundCall: startBridgeOutboundCallMock,
  verifyWebhook: verifyWebhookMock,
  translateProviderEvent: translateProviderEventMock,
  startBridgeSession: startBridgeSessionMock,
  endCall: endCallMock,
}

const baseInput = {
  tenantId: 'tenant-connectshyft-f1',
  orgUnitId: 'org-connectshyft-f1-east',
  threadId: 'thread-f1-unclaimed-1001',
  personId: 'person-connectshyft-f1-1001',
  operatorParticipantId: 'user-connectshyft-f1-primary-operator',
  neighborParticipantId: 'neighbor-f1-1001',
  operatorContactPointId: '+12605550155',
  neighborContactPointId: '+12605550111',
  selectedOutboundContactPointId: '+12605550191',
  providerKey: 'provider-a',
  providerAdapter,
} as const

const buildTransitionSession = (status: string) => ({
  id: 'bridge-session-transition-1001',
  tenantId: baseInput.tenantId,
  orgUnitId: baseInput.orgUnitId,
  threadId: baseInput.threadId,
  operatorParticipantId: baseInput.operatorParticipantId,
  neighborParticipantId: baseInput.neighborParticipantId,
  operatorContactPointId: baseInput.operatorContactPointId,
  neighborContactPointId: baseInput.neighborContactPointId,
  selectedOutboundContactPointId: baseInput.selectedOutboundContactPointId,
  status,
  failureCode: null,
  failureMessage: null,
  endedBy: null,
  idempotencyKey: null,
  auditCorrelationId: null,
  createdAt: new Date('2026-03-11T12:00:00.000Z'),
  updatedAt: new Date('2026-03-11T12:00:00.000Z'),
  completedAt: null,
}) as any

describe('connectshyft bridgeSessions', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS

  beforeAll(() => {
    process.env.NODE_ENV = 'test'
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true'
  })

  beforeEach(() => {
    sendSmsMock.mockReset()
    startOutboundCallMock.mockReset()
    startBridgeOutboundCallMock.mockClear()
    startBridgeSessionMock.mockClear()
    endCallMock.mockClear()
    verifyWebhookMock.mockClear()
    translateProviderEventMock.mockClear()
    resetConnectShyftBridgeSessionStateForTests()
    resetConnectShyftProviderCorrelationStateForTests()
  })

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags
  })

  it('allows valid bridge session transitions through the central state machine', () => {
    const transitioned = transitionBridgeSessionState(
      buildTransitionSession(BridgeSessionState.NEIGHBOR_DIALING),
      BridgeSessionState.VOICEMAIL,
      {
        source: 'provider',
        eventType: 'recording.saved',
        occurredAt: new Date('2026-03-11T12:03:00.000Z'),
      },
    )

    expect(transitioned).toMatchObject({
      status: 'voicemail',
    })
    expect(transitioned.updatedAt.toISOString()).toBe('2026-03-11T12:03:00.000Z')
  })

  it('ignores invalid bridge session transitions', () => {
    const session = buildTransitionSession(BridgeSessionState.OPERATOR_DIALING)
    const transitioned = transitionBridgeSessionState(
      session,
      BridgeSessionState.BRIDGED,
      {
        source: 'provider',
        eventType: 'call.bridged',
      },
    )

    expect(transitioned).toBe(session)
    expect(transitioned.status).toBe('operator_dialing')
  })

  it('keeps terminal bridge session states immutable', () => {
    const session = buildTransitionSession(BridgeSessionState.COMPLETED)
    const transitioned = transitionBridgeSessionState(
      session,
      BridgeSessionState.FAILED,
      {
        source: 'provider',
        eventType: 'call.failed',
      },
    )

    expect(transitioned).toBe(session)
    expect(transitioned.status).toBe('completed')
  })

  it('treats duplicate bridge session transitions as idempotent', () => {
    const session = buildTransitionSession(BridgeSessionState.NEIGHBOR_DIALING)
    const transitioned = transitionBridgeSessionState(
      session,
      BridgeSessionState.NEIGHBOR_DIALING,
      {
        source: 'provider',
        eventType: 'call.ringing',
      },
    )

    expect(transitioned).toBe(session)
  })

  it('persists a created bridge session with operator and neighbor legs on startup', async () => {
    const result = await startConnectShyftBridgeSession(baseInput)

    expect(result.aggregate.session.status).toBe('operator_dialing')
    expect(result.aggregate.session.selectedOutboundContactPointId).toBe('+12605550191')
    expect(result.aggregate.operatorLeg.status).toBe('ringing')
    expect(result.aggregate.neighborLeg.status).toBe('created')
    expect(result.correlationMapping).toEqual({
      deterministic: true,
      operatorLegMapping: 'created',
      neighborLegMapping: 'ignored',
      error: null,
    })

    const persistedBySession = await loadConnectShyftBridgeAggregateBySessionId(result.aggregate.session.id)
    const persistedByProviderCallId = await loadConnectShyftBridgeAggregateByProviderCallId({
      providerCallId: result.aggregate.operatorLeg.providerCallId || '',
    })

    expect(persistedBySession).toMatchObject({
      session: {
        id: result.aggregate.session.id,
        status: 'operator_dialing',
      },
      operatorLeg: {
        status: 'ringing',
      },
      neighborLeg: {
        status: 'created',
      },
    })
    expect(persistedByProviderCallId?.session.id).toBe(result.aggregate.session.id)
    expect(startBridgeOutboundCallMock).toHaveBeenCalledTimes(1)
    expect(startBridgeOutboundCallMock).toHaveBeenCalledWith(expect.objectContaining({
      legRole: 'operator',
      targetPhone: '+12605550155',
    }))
  })

  it('rehydrates by provider leg id and persists neighbor dialing after operator answer', async () => {
    const started = await startConnectShyftBridgeSession(baseInput)

    const progressed = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
  providerKey: 'provider-a',
      providerAdapter,
      providerLegId: started.aggregate.operatorLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })

    expect(progressed).toMatchObject({
      handled: true,
      domainEvent: {
        type: 'operator_answered',
      },
      aggregate: {
        session: {
          status: 'neighbor_dialing',
        },
        operatorLeg: {
          status: 'answered',
        },
        neighborLeg: {
          status: 'ringing',
        },
      },
      correlationMapping: {
        deterministic: true,
        operatorLegMapping: 'duplicate',
        neighborLegMapping: 'created',
        error: null,
      },
    })

    const persistedNeighbor = await loadConnectShyftBridgeAggregateByProviderCallId({
      providerCallId: progressed.aggregate?.neighborLeg.providerCallId || '',
    })

    expect(persistedNeighbor).toMatchObject({
      session: {
        status: 'neighbor_dialing',
      },
      neighborLeg: {
        providerCallId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
        status: 'ringing',
      },
    })
    expect(startBridgeOutboundCallMock).toHaveBeenCalledTimes(2)
    expect(startBridgeOutboundCallMock).toHaveBeenLastCalledWith(expect.objectContaining({
      legRole: 'neighbor',
      targetPhone: '+12605550111',
    }))
  })

  it('allows voicemail only from the unanswered neighbor flow', async () => {
    const started = await startConnectShyftBridgeSession(baseInput)
    const afterOperatorAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: started.aggregate.operatorLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })

    const voicemailAggregate = await transitionConnectShyftBridgeSessionStateAsync({
      bridgeSessionId: started.aggregate.session.id,
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      nextState: BridgeSessionState.VOICEMAIL,
      context: {
        source: 'system',
        eventType: 'neighbor_ring_timeout',
        occurredAt: new Date('2026-03-11T12:02:00.000Z'),
      },
    })

    expect(afterOperatorAnswer.aggregate?.session.status).toBe('neighbor_dialing')
    expect(voicemailAggregate?.session.status).toBe('voicemail')
  })

  it('persists completed bridge sessions after both legs answer and the bridge ends', async () => {
    const started = await startConnectShyftBridgeSession(baseInput)

    const afterOperatorAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: started.aggregate.operatorLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    const afterNeighborAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: afterOperatorAnswer.aggregate?.neighborLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })
    const completed = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: afterNeighborAnswer.aggregate?.neighborLeg.providerCallId || null,
      eventType: 'CallCompleted',
      occurredAt: new Date('2026-03-11T12:03:00.000Z'),
    })

    expect(afterNeighborAnswer.aggregate?.session.status).toBe('bridged')
    expect(completed).toMatchObject({
      handled: true,
      domainEvent: {
        type: 'completed',
      },
      aggregate: {
        session: {
          status: 'completed',
        },
        operatorLeg: {
          status: 'completed',
        },
        neighborLeg: {
          status: 'completed',
        },
      },
    })

    const persisted = await loadConnectShyftBridgeAggregateBySessionId(started.aggregate.session.id)
    expect(persisted?.session.status).toBe('completed')
    expect(startBridgeSessionMock).toHaveBeenCalledTimes(1)
  })

  it('persists failed bridge sessions when the neighbor leg fails before bridge completion', async () => {
    const started = await startConnectShyftBridgeSession(baseInput)

    const afterOperatorAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: started.aggregate.operatorLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    const failed = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: afterOperatorAnswer.aggregate?.neighborLeg.providerCallId || null,
      eventType: 'CallFailed',
      reason: 'neighbor_declined',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })

    expect(failed).toMatchObject({
      handled: true,
      domainEvent: {
        type: 'neighbor_failed',
      },
      aggregate: {
        session: {
          status: 'failed',
          failureCode: 'neighbor_failed',
        },
        neighborLeg: {
          status: 'failed',
          failureCode: 'neighbor_failed',
          failureMessage: 'neighbor_declined',
        },
      },
    })

    const persisted = await loadConnectShyftBridgeAggregateBySessionId(started.aggregate.session.id)
    expect(persisted).toMatchObject({
      session: {
        status: 'failed',
        failureCode: 'neighbor_failed',
      },
      neighborLeg: {
        status: 'failed',
        failureCode: 'neighbor_failed',
        failureMessage: 'neighbor_declined',
      },
    })
  })

  it('keeps replayed provider events from re-triggering the same state progression', async () => {
    const started = await startConnectShyftBridgeSession(baseInput)

    const firstOperatorAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: started.aggregate.operatorLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    const replayedOperatorAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: started.aggregate.operatorLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })

    expect(firstOperatorAnswer.aggregate?.session.status).toBe('neighbor_dialing')
    expect(replayedOperatorAnswer.aggregate?.session.status).toBe('neighbor_dialing')
    expect(replayedOperatorAnswer.aggregate?.neighborLeg.providerCallId)
      .toBe(firstOperatorAnswer.aggregate?.neighborLeg.providerCallId)
    expect(startBridgeOutboundCallMock).toHaveBeenCalledTimes(2)
  })

  it('keeps out-of-order provider events from regressing a completed bridge session', async () => {
    const started = await startConnectShyftBridgeSession(baseInput)

    const afterOperatorAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: started.aggregate.operatorLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    const afterNeighborAnswer = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: afterOperatorAnswer.aggregate?.neighborLeg.providerCallId || null,
      eventType: 'CallAnswered',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })
    await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: afterNeighborAnswer.aggregate?.neighborLeg.providerCallId || null,
      eventType: 'CallCompleted',
      occurredAt: new Date('2026-03-11T12:03:00.000Z'),
    })

    const outOfOrderFailure = await handleConnectShyftBridgeWebhookEvent({
      tenantId: baseInput.tenantId,
      orgUnitId: baseInput.orgUnitId,
      threadId: baseInput.threadId,
      providerKey: 'provider-a',
      providerAdapter,
      providerLegId: afterNeighborAnswer.aggregate?.neighborLeg.providerCallId || null,
      eventType: 'CallFailed',
      reason: 'late_failure',
      occurredAt: new Date('2026-03-11T12:04:00.000Z'),
    })

    expect(outOfOrderFailure.aggregate).toMatchObject({
      session: {
        status: 'completed',
        failureCode: null,
      },
      operatorLeg: {
        status: 'completed',
      },
      neighborLeg: {
        status: 'completed',
      },
    })
  })
})
