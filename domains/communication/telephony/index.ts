import { createHash } from 'node:crypto'

export type TelephonyDispatchChannel = 'call' | 'message'

export type TelephonyWebhookVerificationCode =
  | 'WEBHOOK_SIGNATURE_NOT_CONFIGURED'
  | 'WEBHOOK_SIGNATURE_MISSING'
  | 'WEBHOOK_SIGNATURE_INVALID'

export type TelephonyDispatchCommandBase = {
  tenantId: string
  orgUnitId: string
  threadId: string
  providerKey: string
  idempotencyKey?: string
  targetPhone?: string
  actorId?: string | null
}

export type TelephonyOutboundCallPolicy = {
  transport: string
  autoRetry: boolean
  redialPolicy: string
}

export type TelephonySendSmsCommand = TelephonyDispatchCommandBase & {
  body: string
}

export type TelephonyStartOutboundCallCommand = TelephonyDispatchCommandBase & {
  callPolicy?: TelephonyOutboundCallPolicy
}

export type TelephonyDispatchResult = {
  providerKey: string
  channel: TelephonyDispatchChannel
  providerLegId: string | null
  providerMessageId: string | null
  providerRequestId?: string | null
  adapterInvoked: true
  providerBranchingInDomain: false
  requestedAt?: string
}

export type TelephonyWebhookHeaders = Record<string, string | string[] | undefined>

export type TelephonyWebhookVerificationInput = {
  providerKey: string
  headers: TelephonyWebhookHeaders
  rawBody?: Buffer | string
  payload?: unknown
  requestPath?: string
  protocol?: string
  verification?: {
    enforceValidation?: boolean
    publicKeyPem?: string | null
    maxAgeSeconds?: number | null
  }
}

export type TelephonyWebhookVerificationResult =
  | { ok: true }
  | {
    ok: false
    refusal: {
      code: TelephonyWebhookVerificationCode
      message: string
      refusalType: 'business' | 'client'
      httpStatus: 401 | 503
    }
  }

export type TelephonyProviderEventTranslationInput = {
  rawEventType: string
  payload: unknown
}

export type TelephonyProviderEvent = {
  eventType: string
  payload: Record<string, unknown>
  providerNeutral: true
  providerSpecificFieldsStripped: true
  providerBranchingInDomain: false
}

export interface TelephonyProviderAdapter {
  providerKey: string
  adapterInterfaceVersion: 'v1'
  sendSms(command: TelephonySendSmsCommand): Promise<TelephonyDispatchResult>
  startOutboundCall(command: TelephonyStartOutboundCallCommand): Promise<TelephonyDispatchResult>
  verifyWebhook(input: TelephonyWebhookVerificationInput): TelephonyWebhookVerificationResult
  translateProviderEvent(input: TelephonyProviderEventTranslationInput): TelephonyProviderEvent
  startBridgeSession?: (command: unknown) => Promise<unknown>
  endCall?: (command: unknown) => Promise<unknown>
}

export type TelephonyDispatchReplayKeyInput = {
  tenantId: string
  orgUnitId: string
  threadId: string
  providerKey: string
  action: 'call' | 'message'
  idempotencyKey?: string | null
  targetPhone?: string | null
  body?: string | null
  callPolicy?: TelephonyOutboundCallPolicy | null
}

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const sanitizeReplayCallPolicy = (
  callPolicy: TelephonyOutboundCallPolicy | null | undefined,
): TelephonyOutboundCallPolicy | null => {
  if (!callPolicy) {
    return null
  }

  return {
    transport: normalizeString(callPolicy.transport),
    autoRetry: callPolicy.autoRetry === true,
    redialPolicy: normalizeString(callPolicy.redialPolicy),
  }
}

export const buildTelephonyDispatchReplayKey = (
  input: TelephonyDispatchReplayKeyInput,
): string | null => {
  const explicitKey = normalizeString(input.idempotencyKey)
  if (!explicitKey) {
    return null
  }

  const fingerprint = JSON.stringify({
    targetPhone: normalizeString(input.targetPhone),
    body: normalizeString(input.body),
    callPolicy: sanitizeReplayCallPolicy(input.callPolicy),
  })

  const contentHash = createHash('sha256').update(fingerprint).digest('hex')
  return [
    'telephony-dispatch',
    normalizeString(input.tenantId),
    normalizeString(input.orgUnitId),
    normalizeString(input.threadId),
    normalizeString(input.providerKey).toLowerCase(),
    input.action,
    explicitKey,
    contentHash,
  ].join(':')
}

export class InMemoryTelephonyDispatchLedger<T> {
  private readonly records = new Map<string, T>()

  get(replayKey: string | null | undefined): T | null {
    if (!replayKey) {
      return null
    }

    return this.records.get(replayKey) ?? null
  }

  remember(replayKey: string | null | undefined, value: T): void {
    if (!replayKey) {
      return
    }

    this.records.set(replayKey, value)
  }

  clear(): void {
    this.records.clear()
  }
}

const normalizeDispatchResult = (
  result: TelephonyDispatchResult,
): TelephonyDispatchResult => ({
  providerKey: normalizeString(result.providerKey).toLowerCase(),
  channel: result.channel,
  providerLegId: normalizeString(result.providerLegId) || null,
  providerMessageId: normalizeString(result.providerMessageId) || null,
  providerRequestId: normalizeString(result.providerRequestId) || null,
  adapterInvoked: true,
  providerBranchingInDomain: false,
  requestedAt: normalizeString(result.requestedAt) || undefined,
})

export const assertValidSmsDispatchResult = (
  result: TelephonyDispatchResult,
): TelephonyDispatchResult => {
  const normalized = normalizeDispatchResult(result)
  if (normalized.channel !== 'message') {
    throw new Error('SMS dispatch results must report channel "message".')
  }

  if (!normalized.providerKey) {
    throw new Error('Telephony dispatch results require providerKey.')
  }

  if (!normalized.providerMessageId) {
    throw new Error('SMS dispatch results require providerMessageId.')
  }

  if (normalized.providerLegId) {
    throw new Error('SMS dispatch results must not include providerLegId.')
  }

  return normalized
}

export const assertValidCallDispatchResult = (
  result: TelephonyDispatchResult,
): TelephonyDispatchResult => {
  const normalized = normalizeDispatchResult(result)
  if (normalized.channel !== 'call') {
    throw new Error('Call dispatch results must report channel "call".')
  }

  if (!normalized.providerKey) {
    throw new Error('Telephony dispatch results require providerKey.')
  }

  if (!normalized.providerLegId) {
    throw new Error('Call dispatch results require providerLegId.')
  }

  if (normalized.providerMessageId) {
    throw new Error('Call dispatch results must not include providerMessageId.')
  }

  return normalized
}
