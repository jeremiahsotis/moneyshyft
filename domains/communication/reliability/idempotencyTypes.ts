export type IdempotencyOperationName =
  | 'send_sms'
  | 'start_outbound_call'
  | 'start_bridge_session'
  | 'apply_provider_event'

export type IdempotencyRecordStatus = 'in_progress' | 'succeeded' | 'failed'

export type IdempotencyFailureSnapshot = {
  category: string
  retryable: boolean
  httpStatus?: number | null
  providerCode?: string | null
}

export type IdempotencyRecord = {
  id: string
  tenantId: string
  idempotencyKey: string
  operationName: IdempotencyOperationName
  actorId?: string | null
  actorScopeKey?: string | null
  requestFingerprint: string
  requestSummary?: string | null
  resourceType?: string | null
  resourceId?: string | null
  status: IdempotencyRecordStatus
  responseSnapshot?: string | null
  failureSnapshot?: IdempotencyFailureSnapshot | null
  failureMessage?: string | null
  attemptCount: number
  firstSeenAt: Date
  lastSeenAt: Date
  completedAt?: Date | null
  retryEligibleAt?: Date | null
  expiresAt: Date
}
