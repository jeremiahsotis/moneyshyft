export type WebhookReceiptRecord = {
  id: string
  tenantId: string
  providerName: string
  eventType: string
  providerEventId?: string | null
  payloadHash: string
  processingStatus:
    | 'received'
    | 'processed'
    | 'ignored_duplicate'
    | 'failed_retryable'
    | 'failed_terminal'
  attemptCount: number
  nextRetryAt?: Date | null
  lastFailureClassification?: string | null
}

export type WebhookReceiptRepository = {
  findDuplicate(input: {
    tenantId: string
    providerName: string
    providerEventId?: string | null
    payloadHash: string
  }): Promise<WebhookReceiptRecord | null>
}

export async function dedupeWebhookEvent(
  repository: WebhookReceiptRepository,
  input: { tenantId: string; providerName: string; providerEventId?: string; payloadHash: string },
) {
  const duplicate = await repository.findDuplicate({
    tenantId: input.tenantId,
    providerName: input.providerName,
    providerEventId: input.providerEventId ?? null,
    payloadHash: input.payloadHash,
  })
  if (!duplicate) {
    return { decision: 'proceed' as const }
  }

  if (duplicate.processingStatus === 'processed' || duplicate.processingStatus === 'failed_terminal') {
    return { decision: 'ignore_duplicate' as const, duplicate }
  }

  return { decision: 'reprocess' as const, duplicate }
}
