import { applyProviderBridgeEvent, transitionLeg, transitionSession } from '../bridgeStateMachine'
import type { BridgeSessionAggregate } from '../bridgeSessionTypes'

const buildAggregate = (): BridgeSessionAggregate => {
  const now = new Date('2026-03-11T12:00:00.000Z')
  return {
    session: {
      id: 'bridge-session-1001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      operatorParticipantId: 'user-connectshyft-f1-primary-operator',
      neighborParticipantId: 'neighbor-f1-1001',
      operatorContactPointId: '+12605550155',
      neighborContactPointId: '+12605550111',
      selectedOutboundContactPointId: 'cs-number-501',
      status: 'created',
      failureCode: null,
      failureMessage: null,
      endedBy: null,
      idempotencyKey: null,
      auditCorrelationId: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    },
    operatorLeg: {
      id: 'bridge-leg-operator-1001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      bridgeSessionId: 'bridge-session-1001',
      legRole: 'operator',
      contactPointId: '+12605550155',
      providerCallId: null,
      status: 'created',
      startedAt: null,
      answeredAt: null,
      endedAt: null,
      failureCode: null,
      failureMessage: null,
      createdAt: now,
      updatedAt: now,
    },
    neighborLeg: {
      id: 'bridge-leg-neighbor-1001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      bridgeSessionId: 'bridge-session-1001',
      legRole: 'neighbor',
      contactPointId: '+12605550111',
      providerCallId: null,
      status: 'created',
      startedAt: null,
      answeredAt: null,
      endedAt: null,
      failureCode: null,
      failureMessage: null,
      createdAt: now,
      updatedAt: now,
    },
  }
}

describe('bridge state machine', () => {
  it('initializes into operator dialing and ringing without mutating the neighbor leg', () => {
    const created = buildAggregate()

    const operatorDialing = {
      session: transitionSession(created.session, 'operator_dialing'),
      operatorLeg: transitionLeg(created.operatorLeg, 'dialing'),
      neighborLeg: created.neighborLeg,
    }
    const operatorCreated = applyProviderBridgeEvent(operatorDialing, {
      type: 'operator_call_created',
      bridgeSessionId: created.session.id,
      providerCallId: 'provider-operator-1001',
    })

    expect(operatorDialing.session.status).toBe('operator_dialing')
    expect(operatorCreated.operatorLeg.status).toBe('ringing')
    expect(operatorCreated.operatorLeg.providerCallId).toBe('provider-operator-1001')
    expect(operatorCreated.neighborLeg.status).toBe('created')
  })

  it('advances operator and neighbor legs through the bridged path', () => {
    const created = buildAggregate()
    const operatorDialing = {
      session: transitionSession(created.session, 'operator_dialing'),
      operatorLeg: transitionLeg(created.operatorLeg, 'dialing'),
      neighborLeg: created.neighborLeg,
    }
    const operatorCreated = applyProviderBridgeEvent(operatorDialing, {
      type: 'operator_call_created',
      bridgeSessionId: created.session.id,
      providerCallId: 'provider-operator-1001',
    })
    const operatorAnswered = applyProviderBridgeEvent(operatorCreated, {
      type: 'operator_answered',
      bridgeSessionId: created.session.id,
      providerCallId: 'provider-operator-1001',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    const neighborDialing = {
      session: transitionSession(operatorAnswered.session, 'neighbor_dialing'),
      operatorLeg: operatorAnswered.operatorLeg,
      neighborLeg: transitionLeg(operatorAnswered.neighborLeg, 'dialing'),
    }
    const neighborCreated = applyProviderBridgeEvent(neighborDialing, {
      type: 'neighbor_call_created',
      bridgeSessionId: created.session.id,
      providerCallId: 'provider-neighbor-1001',
    })
    const neighborAnswered = applyProviderBridgeEvent(neighborCreated, {
      type: 'neighbor_answered',
      bridgeSessionId: created.session.id,
      providerCallId: 'provider-neighbor-1001',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })
    const bridged = applyProviderBridgeEvent(neighborAnswered, {
      type: 'bridge_connected',
      bridgeSessionId: created.session.id,
      occurredAt: new Date('2026-03-11T12:03:00.000Z'),
    })

    expect(operatorCreated.operatorLeg.status).toBe('ringing')
    expect(operatorAnswered.session.status).toBe('operator_answered')
    expect(operatorAnswered.operatorLeg.status).toBe('answered')
    expect(neighborCreated.neighborLeg.status).toBe('ringing')
    expect(neighborAnswered.session.status).toBe('neighbor_answered')
    expect(neighborAnswered.neighborLeg.status).toBe('answered')
    expect(bridged.session.status).toBe('bridged')
  })

  it('suppresses backward transitions and preserves terminal outcomes on replay', () => {
    const aggregate = buildAggregate()
    const completed = applyProviderBridgeEvent({
      session: {
        ...aggregate.session,
        status: 'bridged',
      },
      operatorLeg: {
        ...aggregate.operatorLeg,
        status: 'answered',
      },
      neighborLeg: {
        ...aggregate.neighborLeg,
        status: 'answered',
      },
    }, {
      type: 'completed',
      bridgeSessionId: aggregate.session.id,
      occurredAt: new Date('2026-03-11T12:04:00.000Z'),
    })
    const replayedOperatorAnswer = applyProviderBridgeEvent(completed, {
      type: 'operator_answered',
      bridgeSessionId: aggregate.session.id,
      providerCallId: 'provider-operator-1001',
      occurredAt: new Date('2026-03-11T12:05:00.000Z'),
    })

    expect(completed.session.status).toBe('completed')
    expect(completed.operatorLeg.status).toBe('completed')
    expect(completed.neighborLeg.status).toBe('completed')
    expect(replayedOperatorAnswer.session.status).toBe('completed')
    expect(replayedOperatorAnswer.operatorLeg.status).toBe('completed')
  })

  it('persists failure metadata for operator, neighbor, and bridge terminal failures', () => {
    const aggregate = buildAggregate()

    const operatorFailed = applyProviderBridgeEvent(aggregate, {
      type: 'operator_failed',
      bridgeSessionId: aggregate.session.id,
      providerCallId: 'provider-operator-1001',
      reason: 'operator_declined',
      occurredAt: new Date('2026-03-11T12:01:00.000Z'),
    })
    const neighborFailed = applyProviderBridgeEvent({
      session: {
        ...aggregate.session,
        status: 'neighbor_dialing',
      },
      operatorLeg: {
        ...aggregate.operatorLeg,
        status: 'answered',
      },
      neighborLeg: {
        ...aggregate.neighborLeg,
        status: 'ringing',
        providerCallId: 'provider-neighbor-1001',
      },
    }, {
      type: 'neighbor_failed',
      bridgeSessionId: aggregate.session.id,
      providerCallId: 'provider-neighbor-1001',
      reason: 'neighbor_declined',
      occurredAt: new Date('2026-03-11T12:02:00.000Z'),
    })
    const bridgeFailed = applyProviderBridgeEvent({
      session: {
        ...aggregate.session,
        status: 'neighbor_answered',
      },
      operatorLeg: {
        ...aggregate.operatorLeg,
        status: 'answered',
      },
      neighborLeg: {
        ...aggregate.neighborLeg,
        status: 'answered',
      },
    }, {
      type: 'bridge_failed',
      bridgeSessionId: aggregate.session.id,
      reason: 'bridge_control_timeout',
      occurredAt: new Date('2026-03-11T12:03:00.000Z'),
    })

    expect(operatorFailed).toMatchObject({
      session: {
        status: 'failed',
        failureCode: 'operator_failed',
        failureMessage: 'operator_declined',
      },
      operatorLeg: {
        status: 'failed',
        failureMessage: 'operator_declined',
      },
    })
    expect(neighborFailed).toMatchObject({
      session: {
        status: 'failed',
        failureCode: 'neighbor_failed',
        failureMessage: 'neighbor_declined',
      },
      neighborLeg: {
        status: 'failed',
        failureMessage: 'neighbor_declined',
      },
    })
    expect(bridgeFailed).toMatchObject({
      session: {
        status: 'failed',
        failureCode: 'bridge_failed',
        failureMessage: 'bridge_control_timeout',
      },
      operatorLeg: {
        status: 'answered',
      },
      neighborLeg: {
        status: 'answered',
      },
    })
  })
})
