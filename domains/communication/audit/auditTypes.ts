export type CommunicationAuditResultState =
  | 'succeeded'
  | 'failed'
  | 'ignored_duplicate'
  | 'retrying'
  | 'exhausted'

export type CommunicationAuditEntry = {
  id: string
  tenantId: string
  correlationId: string
  actorType: 'user' | 'system' | 'provider'
  actorId?: string | null
  operationName: string
  targetEntityType: string
  targetEntityId?: string | null
  channel: 'sms' | 'voice' | 'bridge' | 'webhook'
  resultState: CommunicationAuditResultState
  resultCode?: string | null
  resultMessage?: string | null
  idempotencyKey?: string | null
  requestFingerprint?: string | null
  providerName?: string | null
  providerReferenceId?: string | null
  metadataJson?: string | null
  createdAt: Date
}
