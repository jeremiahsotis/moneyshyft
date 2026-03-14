import {
  BridgeFailureCode,
  BridgeLegRecord,
  BridgeLegStatus,
  BridgeSessionAggregate,
  BridgeSessionRecord,
  BridgeSessionStatus,
  ProviderBridgeEvent,
} from './bridgeSessionTypes'

const sessionOrder: Record<BridgeSessionStatus, number> = {
  created: 0,
  operator_dialing: 1,
  operator_answered: 2,
  neighbor_dialing: 3,
  neighbor_answered: 4,
  bridged: 5,
  completed: 6,
  failed: 6,
  canceled: 6,
  expired: 6,
}

const legOrder: Record<BridgeLegStatus, number> = {
  created: 0,
  dialing: 1,
  ringing: 2,
  answered: 3,
  completed: 4,
  failed: 4,
  canceled: 4,
}

const terminalSessionStatuses = new Set<BridgeSessionStatus>(['completed', 'failed', 'canceled', 'expired'])
const terminalLegStatuses = new Set<BridgeLegStatus>(['completed', 'failed', 'canceled'])

const resolveEventTime = (occurredAt?: Date): Date => occurredAt ?? new Date()

const isSessionTerminal = (status: BridgeSessionStatus): boolean => terminalSessionStatuses.has(status)

const isLegTerminal = (status: BridgeLegStatus): boolean => terminalLegStatuses.has(status)

const shouldAdvanceSession = (
  current: BridgeSessionStatus,
  next: BridgeSessionStatus,
): boolean => {
  if (current === next) {
    return false
  }

  if (isSessionTerminal(current)) {
    return false
  }

  if (isSessionTerminal(next)) {
    return true
  }

  return sessionOrder[next] >= sessionOrder[current]
}

const shouldAdvanceLeg = (current: BridgeLegStatus, next: BridgeLegStatus): boolean => {
  if (current === next) {
    return false
  }

  if (isLegTerminal(current)) {
    return false
  }

  if (isLegTerminal(next)) {
    return true
  }

  return legOrder[next] >= legOrder[current]
}

export function transitionSession(
  session: BridgeSessionRecord,
  nextStatus: BridgeSessionStatus,
  changes: Partial<BridgeSessionRecord> = {},
): BridgeSessionRecord {
  if (!shouldAdvanceSession(session.status, nextStatus)) {
    return {
      ...session,
      ...changes,
      updatedAt: changes.updatedAt ?? session.updatedAt,
    }
  }

  const updatedAt = changes.updatedAt instanceof Date ? changes.updatedAt : new Date()
  const completedAt = nextStatus === 'completed'
    ? (changes.completedAt instanceof Date ? changes.completedAt : session.completedAt ?? updatedAt)
    : session.completedAt ?? null

  return {
    ...session,
    ...changes,
    status: nextStatus,
    updatedAt,
    completedAt,
  }
}

export function transitionLeg(
  leg: BridgeLegRecord,
  nextStatus: BridgeLegStatus,
  changes: Partial<BridgeLegRecord> = {},
): BridgeLegRecord {
  if (!shouldAdvanceLeg(leg.status, nextStatus)) {
    return {
      ...leg,
      ...changes,
      updatedAt: changes.updatedAt ?? leg.updatedAt,
    }
  }

  const updatedAt = changes.updatedAt instanceof Date ? changes.updatedAt : new Date()
  const startedAt = nextStatus === 'dialing'
    ? (changes.startedAt instanceof Date ? changes.startedAt : leg.startedAt ?? updatedAt)
    : leg.startedAt ?? null
  const answeredAt = nextStatus === 'answered'
    ? (changes.answeredAt instanceof Date ? changes.answeredAt : leg.answeredAt ?? updatedAt)
    : leg.answeredAt ?? null
  const endedAt = isLegTerminal(nextStatus)
    ? (changes.endedAt instanceof Date ? changes.endedAt : leg.endedAt ?? updatedAt)
    : leg.endedAt ?? null

  return {
    ...leg,
    ...changes,
    status: nextStatus,
    updatedAt,
    startedAt,
    answeredAt,
    endedAt,
  }
}

const applyFailure = (input: {
  aggregate: BridgeSessionAggregate
  legRole: 'operator' | 'neighbor' | 'bridge'
  failureCode: BridgeFailureCode
  failureMessage?: string
  occurredAt?: Date
}): BridgeSessionAggregate => {
  const failureMessage = input.failureMessage ?? null
  const failureAt = resolveEventTime(input.occurredAt)
  const session = transitionSession(input.aggregate.session, 'failed', {
    failureCode: input.failureCode,
    failureMessage,
    updatedAt: failureAt,
  })

  if (input.legRole === 'operator') {
    return {
      session,
      operatorLeg: transitionLeg(input.aggregate.operatorLeg, 'failed', {
        failureCode: input.failureCode,
        failureMessage,
        endedAt: failureAt,
        updatedAt: failureAt,
      }),
      neighborLeg: input.aggregate.neighborLeg,
    }
  }

  if (input.legRole === 'neighbor') {
    return {
      session,
      operatorLeg: input.aggregate.operatorLeg,
      neighborLeg: transitionLeg(input.aggregate.neighborLeg, 'failed', {
        failureCode: input.failureCode,
        failureMessage,
        endedAt: failureAt,
        updatedAt: failureAt,
      }),
    }
  }

  return {
    session,
    operatorLeg: input.aggregate.operatorLeg,
    neighborLeg: input.aggregate.neighborLeg,
  }
}

export function applyProviderBridgeEvent(
  aggregate: BridgeSessionAggregate,
  event: ProviderBridgeEvent,
): BridgeSessionAggregate {
  switch (event.type) {
    case 'operator_call_created': {
      const updatedAt = new Date()
      const operatorLeg = transitionLeg(aggregate.operatorLeg, 'ringing', {
        providerCallId: event.providerCallId,
        updatedAt,
      })
      return {
        session: transitionSession(aggregate.session, 'operator_dialing', { updatedAt }),
        operatorLeg,
        neighborLeg: aggregate.neighborLeg,
      }
    }
    case 'neighbor_call_created': {
      const updatedAt = new Date()
      const neighborLeg = transitionLeg(aggregate.neighborLeg, 'ringing', {
        providerCallId: event.providerCallId,
        updatedAt,
      })
      return {
        session: transitionSession(aggregate.session, 'neighbor_dialing', { updatedAt }),
        operatorLeg: aggregate.operatorLeg,
        neighborLeg,
      }
    }
    case 'operator_answered': {
      const occurredAt = resolveEventTime(event.occurredAt)
      return {
        session: transitionSession(aggregate.session, 'operator_answered', {
          updatedAt: occurredAt,
        }),
        operatorLeg: transitionLeg(aggregate.operatorLeg, 'answered', {
          providerCallId: event.providerCallId,
          answeredAt: occurredAt,
          updatedAt: occurredAt,
        }),
        neighborLeg: aggregate.neighborLeg,
      }
    }
    case 'neighbor_answered': {
      const occurredAt = resolveEventTime(event.occurredAt)
      return {
        session: transitionSession(aggregate.session, 'neighbor_answered', {
          updatedAt: occurredAt,
        }),
        operatorLeg: aggregate.operatorLeg,
        neighborLeg: transitionLeg(aggregate.neighborLeg, 'answered', {
          providerCallId: event.providerCallId,
          answeredAt: occurredAt,
          updatedAt: occurredAt,
        }),
      }
    }
    case 'bridge_connected': {
      const occurredAt = resolveEventTime(event.occurredAt)
      return {
        session: transitionSession(aggregate.session, 'bridged', {
          updatedAt: occurredAt,
        }),
        operatorLeg: aggregate.operatorLeg,
        neighborLeg: aggregate.neighborLeg,
      }
    }
    case 'operator_failed':
      return applyFailure({
        aggregate,
        legRole: 'operator',
        failureCode: 'operator_failed',
        failureMessage: event.reason,
        occurredAt: event.occurredAt,
      })
    case 'neighbor_failed':
      return applyFailure({
        aggregate,
        legRole: 'neighbor',
        failureCode: 'neighbor_failed',
        failureMessage: event.reason,
        occurredAt: event.occurredAt,
      })
    case 'bridge_failed':
      return applyFailure({
        aggregate,
        legRole: 'bridge',
        failureCode: 'bridge_failed',
        failureMessage: event.reason,
        occurredAt: event.occurredAt,
      })
    case 'completed': {
      const occurredAt = resolveEventTime(event.occurredAt)
      const session = transitionSession(aggregate.session, 'completed', {
        completedAt: occurredAt,
        updatedAt: occurredAt,
      })

      return {
        session,
        operatorLeg: transitionLeg(aggregate.operatorLeg, 'completed', {
          endedAt: occurredAt,
          updatedAt: occurredAt,
        }),
        neighborLeg: transitionLeg(aggregate.neighborLeg, 'completed', {
          endedAt: occurredAt,
          updatedAt: occurredAt,
        }),
      }
    }
  }
}
