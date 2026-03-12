import {
  BridgeSessionAggregate,
  BridgeSessionRecord,
  BridgeLegRecord,
  BridgeSessionRepository,
  BridgeTelephonyProvider,
  StartBridgeSessionCommand,
} from './bridgeSessionTypes'
import { applyProviderBridgeEvent, transitionLeg, transitionSession } from './bridgeStateMachine'

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
      orgUnitId: command.orgUnitId,
      threadId: command.threadId,
      operatorParticipantId: command.operatorParticipantId,
      neighborParticipantId: command.neighborParticipantId,
      operatorContactPointId: command.operatorContactPointId,
      neighborContactPointId: command.neighborContactPointId,
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
      orgUnitId: command.orgUnitId,
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
      orgUnitId: command.orgUnitId,
      bridgeSessionId: sessionId,
      legRole: 'neighbor',
      contactPointId: command.neighborContactPointId,
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

    const dialingAggregate: BridgeSessionAggregate = {
      session: transitionSession(session, 'operator_dialing'),
      operatorLeg: transitionLeg(operatorLeg, 'dialing'),
      neighborLeg,
    }

    const operatorCall = await telephonyProvider.startOutboundCall({
      bridgeSessionId: sessionId,
      legId: operatorLeg.id,
      legRole: 'operator',
      toContactPointId: command.operatorContactPointId,
      fromContactPointId: command.selectedOutboundContactPointId ?? null,
    })

    const aggregate = applyProviderBridgeEvent(dialingAggregate, {
      type: 'operator_call_created',
      bridgeSessionId: sessionId,
      providerCallId: operatorCall.providerCallId,
    })

    await repository.saveAggregate(aggregate)

    return aggregate
  }
}
