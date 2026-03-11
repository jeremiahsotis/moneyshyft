import {
  BridgeLegRecord,
  BridgeLegStatus,
  BridgeSessionAggregate,
  BridgeSessionRecord,
  BridgeSessionStatus,
  ProviderBridgeEvent,
} from './bridgeSessionTypes'

const allowedSessionTransitions: Record<BridgeSessionStatus, BridgeSessionStatus[]> = {
  created: ['operator_dialing', 'canceled', 'expired', 'failed'],
  operator_dialing: ['operator_answered', 'failed', 'canceled', 'expired'],
  operator_answered: ['neighbor_dialing', 'failed', 'canceled'],
  neighbor_dialing: ['neighbor_answered', 'failed', 'canceled', 'expired'],
  neighbor_answered: ['bridged', 'failed', 'canceled'],
  bridged: ['completed', 'failed', 'canceled'],
  completed: [],
  failed: [],
  canceled: [],
  expired: [],
}

const allowedLegTransitions: Record<BridgeLegStatus, BridgeLegStatus[]> = {
  created: ['dialing', 'canceled', 'failed'],
  dialing: ['ringing', 'answered', 'failed', 'canceled'],
  ringing: ['answered', 'failed', 'canceled'],
  answered: ['completed', 'failed', 'canceled'],
  completed: [],
  failed: [],
  canceled: [],
}

function assertSessionTransition(from: BridgeSessionStatus, to: BridgeSessionStatus): void {
  if (!allowedSessionTransitions[from].includes(to)) {
    throw new Error(`Invalid bridge session transition: ${from} -> ${to}`)
  }
}

function assertLegTransition(from: BridgeLegStatus, to: BridgeLegStatus): void {
  if (!allowedLegTransitions[from].includes(to)) {
    throw new Error(`Invalid bridge leg transition: ${from} -> ${to}`)
  }
}

export function transitionSession(
  session: BridgeSessionRecord,
  nextStatus: BridgeSessionStatus,
  changes: Partial<BridgeSessionRecord> = {},
): BridgeSessionRecord {
  assertSessionTransition(session.status, nextStatus)
  return {
    ...session,
    ...changes,
    status: nextStatus,
    updatedAt: new Date(),
    completedAt: nextStatus === 'completed' ? new Date() : session.completedAt ?? null,
  }
}

export function transitionLeg(
  leg: BridgeLegRecord,
  nextStatus: BridgeLegStatus,
  changes: Partial<BridgeLegRecord> = {},
): BridgeLegRecord {
  assertLegTransition(leg.status, nextStatus)
  const now = new Date()

  return {
    ...leg,
    ...changes,
    status: nextStatus,
    updatedAt: now,
    startedAt: nextStatus === 'dialing' && !leg.startedAt ? now : leg.startedAt ?? null,
    answeredAt: nextStatus === 'answered' && !leg.answeredAt ? now : leg.answeredAt ?? null,
    endedAt:
      nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'canceled'
        ? now
        : leg.endedAt ?? null,
  }
}

export function applyProviderBridgeEvent(
  aggregate: BridgeSessionAggregate,
  event: ProviderBridgeEvent,
): BridgeSessionAggregate {
  const { session, operatorLeg, neighborLeg } = aggregate

  switch (event.type) {
    case 'operator_call_created':
      return {
        session,
        operatorLeg: { ...operatorLeg, providerCallId: event.providerCallId, updatedAt: new Date() },
        neighborLeg,
      }

    case 'neighbor_call_created':
      return {
        session,
        operatorLeg,
        neighborLeg: { ...neighborLeg, providerCallId: event.providerCallId, updatedAt: new Date() },
      }

    case 'operator_answered': {
      const preparedSession =
        session.status === 'operator_dialing' ? session : transitionSession(session, 'operator_dialing')
      const preparedLeg =
        operatorLeg.status === 'ringing' ? operatorLeg : transitionLeg(operatorLeg, 'ringing')

      return {
        session: transitionSession(preparedSession, 'operator_answered'),
        operatorLeg: transitionLeg(preparedLeg, 'answered'),
        neighborLeg,
      }
    }

    case 'neighbor_answered': {
      const preparedSession =
        session.status === 'neighbor_dialing' ? session : transitionSession(session, 'neighbor_dialing')
      const preparedLeg =
        neighborLeg.status === 'ringing' ? neighborLeg : transitionLeg(neighborLeg, 'ringing')

      return {
        session: transitionSession(preparedSession, 'neighbor_answered'),
        operatorLeg,
        neighborLeg: transitionLeg(preparedLeg, 'answered'),
      }
    }

    case 'bridge_connected':
      return {
        session: transitionSession(session, 'bridged'),
        operatorLeg,
        neighborLeg,
      }

    case 'operator_failed':
      return {
        session: transitionSession(session, 'failed', {
          failureCode: 'operator_call_failed',
          failureMessage: event.reason ?? null,
        }),
        operatorLeg: transitionLeg(operatorLeg, 'failed', {
          failureCode: 'operator_call_failed',
          failureMessage: event.reason ?? null,
        }),
        neighborLeg,
      }

    case 'neighbor_failed':
      return {
        session: transitionSession(session, 'failed', {
          failureCode: 'neighbor_call_failed',
          failureMessage: event.reason ?? null,
        }),
        operatorLeg,
        neighborLeg: transitionLeg(neighborLeg, 'failed', {
          failureCode: 'neighbor_call_failed',
          failureMessage: event.reason ?? null,
        }),
      }

    case 'bridge_failed':
      return {
        session: transitionSession(session, 'failed', {
          failureCode: 'bridge_failed',
          failureMessage: event.reason ?? null,
        }),
        operatorLeg,
        neighborLeg,
      }

    case 'completed': {
      const preparedSession =
        session.status === 'bridged' ? session : transitionSession(session, 'bridged')

      return {
        session: transitionSession(preparedSession, 'completed'),
        operatorLeg:
          operatorLeg.status === 'answered' ? transitionLeg(operatorLeg, 'completed') : operatorLeg,
        neighborLeg:
          neighborLeg.status === 'answered' ? transitionLeg(neighborLeg, 'completed') : neighborLeg,
      }
    }
  }
}
