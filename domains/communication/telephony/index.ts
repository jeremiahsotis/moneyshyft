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
  senderPhone?: string
}

export type TelephonyStartOutboundCallCommand = TelephonyDispatchCommandBase & {
  callPolicy?: TelephonyOutboundCallPolicy
}

export type TelephonyBridgeLegRole = 'operator' | 'neighbor' | 'voicemail'

export type TelephonyStartBridgeOutboundCallCommand = TelephonyDispatchCommandBase & {
  bridgeSessionId: string
  legId: string
  legRole: TelephonyBridgeLegRole
  fromContactPointId?: string | null
}

export type TelephonyStartBridgeSessionCommand = {
  providerKey: string
  bridgeSessionId: string
  operatorProviderCallId: string
  neighborProviderCallId: string
  idempotencyKey?: string
}

export type TelephonyStartBridgeSessionResult = {
  providerKey: string
  bridgeSessionId: string
  bridgeEstablished: true
  providerRequestId?: string | null
  adapterInvoked: true
  providerBranchingInDomain: false
  requestedAt?: string
}

export type TelephonyEndCallCommand = {
  providerKey: string
  providerLegId: string
  idempotencyKey?: string
}

export type TelephonyEndCallResult = {
  providerKey: string
  providerLegId: string
  ended: true
  providerRequestId?: string | null
  adapterInvoked: true
  providerBranchingInDomain: false
  requestedAt?: string
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

export type TelephonyProviderEventCorrelation = {
  providerLegId: string | null
  providerMessageId: string | null
  providerEventId: string | null
  providerNumber: string | null
}

export type TelephonyProviderEvent = {
  eventType: string
  payload: Record<string, unknown>
  correlation: TelephonyProviderEventCorrelation
  providerNeutral: true
  providerSpecificFieldsStripped: true
  providerBranchingInDomain: false
}

export type TelephonyProviderFailureCategory =
  | 'auth_configuration'
  | 'temporary_provider_failure'
  | 'invalid_request'
  | 'unknown_provider_failure'

export type TelephonyProviderFailureClassification = {
  providerKey: string
  category: TelephonyProviderFailureCategory
  retryable: boolean
  httpStatus: number | null
  providerCode: string | null
}

export class TelephonyProviderFailure extends Error {
  readonly classification: TelephonyProviderFailureClassification

  constructor(input: {
    message: string
    classification: TelephonyProviderFailureClassification
  }) {
    super(input.message)
    this.name = 'TelephonyProviderFailure'
    this.classification = input.classification
  }
}

export const isTelephonyProviderFailure = (
  error: unknown,
): error is TelephonyProviderFailure => error instanceof TelephonyProviderFailure

export interface TelephonyProviderAdapter {
  providerKey: string
  adapterInterfaceVersion: 'v1'
  sendSms(command: TelephonySendSmsCommand): Promise<TelephonyDispatchResult>
  startOutboundCall(command: TelephonyStartOutboundCallCommand): Promise<TelephonyDispatchResult>
  startBridgeOutboundCall?: (
    command: TelephonyStartBridgeOutboundCallCommand,
  ) => Promise<TelephonyDispatchResult>
  verifyWebhook(input: TelephonyWebhookVerificationInput): TelephonyWebhookVerificationResult
  translateProviderEvent(input: TelephonyProviderEventTranslationInput): TelephonyProviderEvent
  startBridgeSession?: (
    command: TelephonyStartBridgeSessionCommand,
  ) => Promise<TelephonyStartBridgeSessionResult>
  endCall(command: TelephonyEndCallCommand): Promise<TelephonyEndCallResult>
}

export type TelephonyDispatchReplayKeyInput = {
  tenantId: string
  orgUnitId: string
  threadId: string
  providerKey: string
  action: 'call' | 'message'
  idempotencyKey?: string | null
  actorId?: string | null
  targetPhone?: string | null
  senderPhone?: string | null
  operatorContactPointId?: string | null
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
    actorId: normalizeString(input.actorId),
    targetPhone: normalizeString(input.targetPhone),
    senderPhone: normalizeString(input.senderPhone),
    operatorContactPointId: normalizeString(input.operatorContactPointId),
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

const normalizeEndCallResult = (
  result: TelephonyEndCallResult,
): TelephonyEndCallResult => ({
  providerKey: normalizeString(result.providerKey).toLowerCase(),
  providerLegId: normalizeString(result.providerLegId),
  ended: true,
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

export const assertValidEndCallResult = (
  result: TelephonyEndCallResult,
): TelephonyEndCallResult => {
  const normalized = normalizeEndCallResult(result)

  if (!normalized.providerKey) {
    throw new Error('End-call results require providerKey.')
  }

  if (!normalized.providerLegId) {
    throw new Error('End-call results require providerLegId.')
  }

  return normalized
}
