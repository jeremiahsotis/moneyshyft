export type BridgeSessionStatus =
  | 'created'
  | 'operator_dialing'
  | 'operator_answered'
  | 'neighbor_dialing'
  | 'neighbor_answered'
  | 'bridged'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'expired'

export type BridgeLegRole = 'operator' | 'neighbor'

export type BridgeLegStatus =
  | 'created'
  | 'dialing'
  | 'ringing'
  | 'answered'
  | 'failed'
  | 'completed'
  | 'canceled'

export type BridgeFailureCode =
  | 'operator_call_failed'
  | 'neighbor_call_failed'
  | 'bridge_failed'
  | 'provider_error'
  | 'timeout'
  | 'canceled'
  | 'unknown'

export type BridgeSessionRecord = {
  id: string
  tenantId: string
  threadId: string
  operatorParticipantId: string
  targetParticipantId: string
  operatorContactPointId: string
  targetContactPointId: string
  selectedOutboundContactPointId?: string | null
  status: BridgeSessionStatus
  failureCode?: BridgeFailureCode | null
  failureMessage?: string | null
  endedBy?: string | null
  idempotencyKey?: string | null
  auditCorrelationId?: string | null
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
}

export type BridgeLegRecord = {
  id: string
  tenantId: string
  bridgeSessionId: string
  legRole: BridgeLegRole
  contactPointId: string
  providerCallId?: string | null
  status: BridgeLegStatus
  startedAt?: Date | null
  answeredAt?: Date | null
  endedAt?: Date | null
  failureCode?: BridgeFailureCode | null
  failureMessage?: string | null
  createdAt: Date
  updatedAt: Date
}

export type StartBridgeSessionCommand = {
  tenantId: string
  threadId: string
  operatorParticipantId: string
  targetParticipantId: string
  operatorContactPointId: string
  targetContactPointId: string
  selectedOutboundContactPointId?: string
  idempotencyKey?: string
  auditCorrelationId?: string
}

export type ProviderBridgeEvent =
  | {
      type: 'operator_call_created'
      bridgeSessionId: string
      providerCallId: string
    }
  | {
      type: 'neighbor_call_created'
      bridgeSessionId: string
      providerCallId: string
    }
  | {
      type: 'operator_answered'
      bridgeSessionId: string
      providerCallId: string
      occurredAt?: Date
    }
  | {
      type: 'neighbor_answered'
      bridgeSessionId: string
      providerCallId: string
      occurredAt?: Date
    }
  | {
      type: 'bridge_connected'
      bridgeSessionId: string
      occurredAt?: Date
    }
  | {
      type: 'operator_failed'
      bridgeSessionId: string
      providerCallId?: string
      reason?: string
      occurredAt?: Date
    }
  | {
      type: 'neighbor_failed'
      bridgeSessionId: string
      providerCallId?: string
      reason?: string
      occurredAt?: Date
    }
  | {
      type: 'bridge_failed'
      bridgeSessionId: string
      reason?: string
      occurredAt?: Date
    }
  | {
      type: 'completed'
      bridgeSessionId: string
      providerCallId?: string
      occurredAt?: Date
    }

export type BridgeSessionAggregate = {
  session: BridgeSessionRecord
  operatorLeg: BridgeLegRecord
  neighborLeg: BridgeLegRecord
}
