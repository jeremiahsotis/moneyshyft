import {
  BridgeSessionAggregate,
  BridgeSessionRepository,
  BridgeTelephonyProvider,
  ProviderBridgeEvent,
} from './bridgeSessionTypes'
import { applyProviderBridgeEvent, transitionLeg, transitionSession } from './bridgeStateMachine'

const isOperatorAnsweredReplay = (aggregate: BridgeSessionAggregate): boolean =>
  aggregate.session.status === 'neighbor_dialing'
  || aggregate.session.status === 'neighbor_answered'
  || aggregate.session.status === 'bridged'
  || aggregate.session.status === 'completed'
  || aggregate.session.status === 'failed'
  || aggregate.session.status === 'canceled'
  || aggregate.session.status === 'expired'

const isNeighborAnsweredReplay = (aggregate: BridgeSessionAggregate): boolean =>
  aggregate.session.status === 'bridged'
  || aggregate.session.status === 'completed'
  || aggregate.session.status === 'failed'
  || aggregate.session.status === 'canceled'
  || aggregate.session.status === 'expired'

export function buildHandleProviderBridgeEvent(deps: {
  repository: BridgeSessionRepository
  telephonyProvider: BridgeTelephonyProvider
}) {
  const { repository, telephonyProvider } = deps

  return async function handleProviderBridgeEvent(
    event: ProviderBridgeEvent,
  ): Promise<BridgeSessionAggregate | null> {
    let aggregate = event.bridgeSessionId
      ? await repository.getAggregateBySessionId(event.bridgeSessionId)
      : null

    if (!aggregate && 'providerCallId' in event && event.providerCallId) {
      aggregate = await repository.getAggregateByProviderCallId({
        providerCallId: event.providerCallId,
      })
    }

    if (!aggregate) {
      return null
    }

    if (event.type === 'operator_answered') {
      const operatorAdvancedAggregate = applyProviderBridgeEvent(aggregate, event)
      const neighborDialingAggregate: BridgeSessionAggregate = {
        session: transitionSession(operatorAdvancedAggregate.session, 'neighbor_dialing'),
        operatorLeg: operatorAdvancedAggregate.operatorLeg,
        neighborLeg: transitionLeg(operatorAdvancedAggregate.neighborLeg, 'dialing'),
      }

      if (isOperatorAnsweredReplay(aggregate) || aggregate.neighborLeg.providerCallId) {
        await repository.saveAggregate(neighborDialingAggregate)
        return neighborDialingAggregate
      }

      const neighborCall = await telephonyProvider.startOutboundCall({
        bridgeSessionId: aggregate.session.id,
        legId: aggregate.neighborLeg.id,
        legRole: 'neighbor',
        toContactPointId: aggregate.neighborLeg.contactPointId,
        fromContactPointId: aggregate.session.selectedOutboundContactPointId ?? null,
      })

      const bridgedProgressAggregate = applyProviderBridgeEvent(neighborDialingAggregate, {
        type: 'neighbor_call_created',
        bridgeSessionId: aggregate.session.id,
        providerCallId: neighborCall.providerCallId,
      })

      await repository.saveAggregate(bridgedProgressAggregate)
      return bridgedProgressAggregate
    }

    if (event.type === 'neighbor_answered') {
      const answeredAggregate = applyProviderBridgeEvent(aggregate, event)
      if (
        isNeighborAnsweredReplay(aggregate)
        || aggregate.session.status === 'bridged'
      ) {
        await repository.saveAggregate(answeredAggregate)
        return answeredAggregate
      }

      const operatorProviderCallId = answeredAggregate.operatorLeg.providerCallId
      const neighborProviderCallId = answeredAggregate.neighborLeg.providerCallId
      if (!operatorProviderCallId || !neighborProviderCallId) {
        const failedAggregate = applyProviderBridgeEvent(answeredAggregate, {
          type: 'bridge_failed',
          bridgeSessionId: answeredAggregate.session.id,
          reason: 'Missing provider call id required for bridge control.',
          occurredAt: event.occurredAt,
        })
        await repository.saveAggregate(failedAggregate)
        return failedAggregate
      }

      await telephonyProvider.startBridgeSession({
        bridgeSessionId: answeredAggregate.session.id,
        operatorProviderCallId,
        neighborProviderCallId,
      })

      const bridgedAggregate = applyProviderBridgeEvent(answeredAggregate, {
        type: 'bridge_connected',
        bridgeSessionId: answeredAggregate.session.id,
        occurredAt: event.occurredAt,
      })

      await repository.saveAggregate(bridgedAggregate)
      return bridgedAggregate
    }

    const nextAggregate = applyProviderBridgeEvent(aggregate, event)
    await repository.saveAggregate(nextAggregate)
    return nextAggregate
  }
}
