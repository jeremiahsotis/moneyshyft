import { buildHandleProviderBridgeEvent } from '../handleProviderBridgeEvent'
import { buildStartBridgeSession } from '../startBridgeSession'
import type {
  BridgeSessionAggregate,
  BridgeSessionRepository,
  BridgeTelephonyProvider,
} from '../bridgeSessionTypes'

class InMemoryRepository implements BridgeSessionRepository {
  private aggregate: BridgeSessionAggregate | null = null

  async createSession(): Promise<void> {}

  async createLeg(): Promise<void> {}

  async saveAggregate(aggregate: BridgeSessionAggregate): Promise<void> {
    this.aggregate = {
      session: { ...aggregate.session },
      operatorLeg: { ...aggregate.operatorLeg },
      neighborLeg: { ...aggregate.neighborLeg },
    }
  }

  async getAggregateBySessionId(): Promise<BridgeSessionAggregate | null> {
    return this.aggregate
  }

  async getAggregateByThreadId(input: {
    threadId: string
  }): Promise<BridgeSessionAggregate | null> {
    if (!this.aggregate) {
      return null
    }

    return this.aggregate.session.threadId === input.threadId
      ? this.aggregate
      : null
  }

  async getAggregateByProviderCallId(input: {
    providerCallId: string
  }): Promise<BridgeSessionAggregate | null> {
    if (!this.aggregate) {
      return null
    }

    if (
      this.aggregate.operatorLeg.providerCallId === input.providerCallId
      || this.aggregate.neighborLeg.providerCallId === input.providerCallId
    ) {
      return this.aggregate
    }

    return null
  }
}

describe('handleProviderBridgeEvent', () => {
  it('starts a persisted bridge session by dialing only the operator leg first', async () => {
    const repository = new InMemoryRepository()
    const startOutboundCall = jest.fn(async () => ({
      providerCallId: 'provider-operator-1001',
    }))
    const startBridgeSession = jest.fn(async () => undefined)
    const telephonyProvider: BridgeTelephonyProvider = {
      startOutboundCall,
      startBridgeSession,
    }

    const startBridge = buildStartBridgeSession({
      repository,
      telephonyProvider,
      idGenerator: (() => {
        const ids = ['bridge-session-1001', 'bridge-leg-operator-1001', 'bridge-leg-neighbor-1001']
        return () => ids.shift() || 'bridge-generated-fallback'
      })(),
    })
    const aggregate = await startBridge({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      operatorParticipantId: 'user-connectshyft-f1-primary-operator',
      neighborParticipantId: 'neighbor-f1-1001',
      operatorContactPointId: '+12605550155',
      neighborContactPointId: '+12605550111',
      selectedOutboundContactPointId: 'cs-number-501',
    })

    expect(aggregate.session.status).toBe('operator_dialing')
    expect(aggregate.operatorLeg.status).toBe('ringing')
    expect(aggregate.neighborLeg.status).toBe('created')
    expect(startOutboundCall).toHaveBeenCalledTimes(1)
    expect(startBridgeSession).not.toHaveBeenCalled()
  })

  it('dials the neighbor once after operator answer and bridges once after neighbor answer', async () => {
    const repository = new InMemoryRepository()
    const startOutboundCall = jest.fn(async (input: { legRole: string }) => ({
      providerCallId: input.legRole === 'operator'
        ? 'provider-operator-1001'
        : 'provider-neighbor-1001',
    }))
    const startBridgeSession = jest.fn(async () => undefined)
    const telephonyProvider: BridgeTelephonyProvider = {
      startOutboundCall,
      startBridgeSession,
    }

    const startBridge = buildStartBridgeSession({
      repository,
      telephonyProvider,
      idGenerator: (() => {
        const ids = ['bridge-session-1001', 'bridge-leg-operator-1001', 'bridge-leg-neighbor-1001']
        return () => ids.shift() || 'bridge-generated-fallback'
      })(),
    })
    await startBridge({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      operatorParticipantId: 'user-connectshyft-f1-primary-operator',
      neighborParticipantId: 'neighbor-f1-1001',
      operatorContactPointId: '+12605550155',
      neighborContactPointId: '+12605550111',
      selectedOutboundContactPointId: 'cs-number-501',
    })

    const handleEvent = buildHandleProviderBridgeEvent({
      repository,
      telephonyProvider,
    })

    const afterOperatorAnswer = await handleEvent({
      type: 'operator_answered',
      providerCallId: 'provider-operator-1001',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    const afterDuplicateOperatorAnswer = await handleEvent({
      type: 'operator_answered',
      providerCallId: 'provider-operator-1001',
      occurredAt: new Date('2026-03-11T12:01:30.000Z'),
    })
    const afterNeighborAnswer = await handleEvent({
      type: 'neighbor_answered',
      providerCallId: 'provider-neighbor-1001',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })
    const afterDuplicateNeighborAnswer = await handleEvent({
      type: 'neighbor_answered',
      providerCallId: 'provider-neighbor-1001',
      occurredAt: new Date('2026-03-11T12:02:30.000Z'),
    })

    expect(afterOperatorAnswer?.session.status).toBe('neighbor_dialing')
    expect(afterOperatorAnswer?.neighborLeg.status).toBe('ringing')
    expect(afterDuplicateOperatorAnswer?.session.status).toBe('neighbor_dialing')
    expect(afterNeighborAnswer?.session.status).toBe('bridged')
    expect(afterDuplicateNeighborAnswer?.session.status).toBe('bridged')
    expect(startOutboundCall).toHaveBeenCalledTimes(2)
    expect(startBridgeSession).toHaveBeenCalledTimes(1)
  })

  it('keeps terminal completion replay-safe without re-triggering bridge control', async () => {
    const repository = new InMemoryRepository()
    const startOutboundCall = jest.fn(async (input: { legRole: string }) => ({
      providerCallId: input.legRole === 'operator'
        ? 'provider-operator-1001'
        : 'provider-neighbor-1001',
    }))
    const startBridgeSession = jest.fn(async () => undefined)
    const telephonyProvider: BridgeTelephonyProvider = {
      startOutboundCall,
      startBridgeSession,
    }

    const startBridge = buildStartBridgeSession({
      repository,
      telephonyProvider,
      idGenerator: (() => {
        const ids = ['bridge-session-1001', 'bridge-leg-operator-1001', 'bridge-leg-neighbor-1001']
        return () => ids.shift() || 'bridge-generated-fallback'
      })(),
    })
    await startBridge({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      operatorParticipantId: 'user-connectshyft-f1-primary-operator',
      neighborParticipantId: 'neighbor-f1-1001',
      operatorContactPointId: '+12605550155',
      neighborContactPointId: '+12605550111',
      selectedOutboundContactPointId: 'cs-number-501',
    })

    const handleEvent = buildHandleProviderBridgeEvent({
      repository,
      telephonyProvider,
    })

    await handleEvent({
      type: 'operator_answered',
      providerCallId: 'provider-operator-1001',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    await handleEvent({
      type: 'neighbor_answered',
      providerCallId: 'provider-neighbor-1001',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })
    const completed = await handleEvent({
      type: 'completed',
      providerCallId: 'provider-neighbor-1001',
      occurredAt: new Date('2026-03-11T12:03:00.000Z'),
    })
    const completedReplay = await handleEvent({
      type: 'completed',
      providerCallId: 'provider-neighbor-1001',
      occurredAt: new Date('2026-03-11T12:03:30.000Z'),
    })
    const failureReplay = await handleEvent({
      type: 'neighbor_failed',
      providerCallId: 'provider-neighbor-1001',
      reason: 'late_failure',
      occurredAt: new Date('2026-03-11T12:04:00.000Z'),
    })

    expect(completed?.session.status).toBe('completed')
    expect(completedReplay?.session.status).toBe('completed')
    expect(failureReplay?.session.status).toBe('completed')
    expect(startOutboundCall).toHaveBeenCalledTimes(2)
    expect(startBridgeSession).toHaveBeenCalledTimes(1)
  })
})
