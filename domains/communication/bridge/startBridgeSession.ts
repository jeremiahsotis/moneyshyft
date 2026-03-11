import {
  BridgeLegRecord,
  BridgeSessionAggregate,
  BridgeSessionRecord,
  StartBridgeSessionCommand,
} from './bridgeSessionTypes'
import { transitionLeg, transitionSession } from './bridgeStateMachine'

export type BridgeSessionRepository = {
  createSession(session: BridgeSessionRecord): Promise<void>
  createLeg(leg: BridgeLegRecord): Promise<void>
  saveAggregate(aggregate: BridgeSessionAggregate): Promise<void>
  getAggregateBySessionId(sessionId: string): Promise<BridgeSessionAggregate | null>
}

export type StartOutboundCallInput = {
  bridgeSessionId: string
  legRole: 'operator' | 'neighbor'
  toContactPointId: string
  fromContactPointId?: string
}

export type BridgeTelephonyProvider = {
  startOutboundCall(input: StartOutboundCallInput): Promise<{ providerCallId: string }>
  startBridgeSession(input: {
    bridgeSessionId: string
    operatorProviderCallId: string
    neighborProviderCallId: string
  }): Promise<void>
}

export type IdGenerator = () => string

export function buildStartBridgeSession(deps: {
  repository: BridgeSessionRepository
  telephonyProvider: BridgeTelephonyProvider
  idGenerator: IdGenerator
}) {
  const { repository, telephonyProvider, idGenerator } = deps

  return async function startBridgeSession(
    command: StartBridgeSessionCommand,
  ): Promise<BridgeSessionAggregate> {
    const now = new Date()
    const sessionId = idGenerator()

    const session: BridgeSessionRecord = {
      id: sessionId,
      tenantId: command.tenantId,
      threadId: command.threadId,
      operatorParticipantId: command.operatorParticipantId,
      targetParticipantId: command.targetParticipantId,
      operatorContactPointId: command.operatorContactPointId,
      targetContactPointId: command.targetContactPointId,
      selectedOutboundContactPointId: command.selectedOutboundContactPointId ?? null,
      status: 'created',
      failureCode: null,
      failureMessage: null,
      endedBy: null,
      idempotencyKey: command.idempotencyKey ?? null,
      auditCorrelationId: command.auditCorrelationId ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    }

    const operatorLeg: BridgeLegRecord = {
      id: idGenerator(),
      tenantId: command.tenantId,
      bridgeSessionId: sessionId,
      legRole: 'operator',
      contactPointId: command.operatorContactPointId,
      providerCallId: null,
      status: 'created',
      startedAt: null,
      answeredAt: null,
      endedAt: null,
      failureCode: null,
      failureMessage: null,
      createdAt: now,
      updatedAt: now,
    }

    const neighborLeg: BridgeLegRecord = {
      id: idGenerator(),
      tenantId: command.tenantId,
      bridgeSessionId: sessionId,
      legRole: 'neighbor',
      contactPointId: command.targetContactPointId,
      providerCallId: null,
      status: 'created',
      startedAt: null,
      answeredAt: null,
      endedAt: null,
      failureCode: null,
      failureMessage: null,
      createdAt: now,
      updatedAt: now,
    }

    await repository.createSession(session)
    await repository.createLeg(operatorLeg)
    await repository.createLeg(neighborLeg)

    const dialingSession = transitionSession(session, 'operator_dialing')
    const dialingOperatorLeg = transitionLeg(operatorLeg, 'dialing')

    const operatorCall = await telephonyProvider.startOutboundCall({
      bridgeSessionId: sessionId,
      legRole: 'operator',
      toContactPointId: command.operatorContactPointId,
      fromContactPointId: command.selectedOutboundContactPointId,
    })

    const aggregate: BridgeSessionAggregate = {
      session: dialingSession,
      operatorLeg: {
        ...dialingOperatorLeg,
        providerCallId: operatorCall.providerCallId,
      },
      neighborLeg,
    }

    await repository.saveAggregate(aggregate)

    return aggregate
  }
}
