import { createPublicKey, verify } from 'node:crypto'
import {
  assertValidCallDispatchResult,
  assertValidEndCallResult,
  assertValidSmsDispatchResult,
  type TelephonyDispatchResult,
  type TelephonyEndCallCommand,
  type TelephonyEndCallResult,
  type TelephonyProviderEventCorrelation,
  type TelephonyProviderAdapter,
  type TelephonyProviderFailureCategory,
  type TelephonyProviderEvent,
  type TelephonyProviderEventTranslationInput,
  TelephonyProviderFailure,
  type TelephonySendSmsCommand,
  type TelephonyStartBridgeOutboundCallCommand,
  type TelephonyStartBridgeSessionCommand,
  type TelephonyStartBridgeSessionResult,
  type TelephonyStartOutboundCallCommand,
  type TelephonyWebhookHeaders,
  type TelephonyWebhookVerificationInput,
  type TelephonyWebhookVerificationResult,
} from '../../../domains/communication'

const DEFAULT_TELNYX_API_BASE_URL = 'https://api.telnyx.com/v2'
const DEFAULT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS = 300
const TELNYX_SIGNATURE_HEADER = 'telnyx-signature-ed25519'
const TELNYX_TIMESTAMP_HEADER = 'telnyx-timestamp'
const PROVIDER_SPECIFIC_KEYS = new Set([
  'id',
  'from',
  'to',
  'providerKey',
  'providerName',
  'providerMessageId',
  'providerLegId',
  'providerEventId',
  'providerPayload',
  'callControlId',
  'call_leg_id',
  'call_control_id',
  'call_session_id',
  'message_id',
  'telnyxMessageId',
  'telnyxCallControlId',
  'telnyxPayload',
  'telnyxHeaders',
  'webhookEventId',
  'record_type',
])

type TelnyxAdapterOptions = {
  apiKey?: string
  apiBaseUrl?: string
  fromNumber?: string
  connectionId?: string
  messagingProfileId?: string
  fetchImpl?: typeof globalThis.fetch
  now?: () => number
}

type TelnyxDispatchResponseBody = {
  data?: {
    id?: unknown
    call_leg_id?: unknown
    call_control_id?: unknown
  }
  errors?: Array<{
    code?: unknown
    title?: unknown
    detail?: unknown
  }>
}

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const normalizePayloadRecord = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  return payload as Record<string, unknown>
}

const readStringFromPayloadSources = (
  sources: Array<Record<string, unknown>>,
  candidates: string[],
): string | null => {
  for (const source of sources) {
    for (const candidate of candidates) {
      const value = normalizeString(source[candidate])
      if (value) {
        return value
      }
    }
  }

  return null
}

const sanitizePayloadValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePayloadValue(entry))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const sanitized: Record<string, unknown> = {}
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const lowerKey = key.toLowerCase()
    if (
      PROVIDER_SPECIFIC_KEYS.has(key)
      || PROVIDER_SPECIFIC_KEYS.has(lowerKey)
      || lowerKey.startsWith('telnyx')
      || lowerKey.startsWith('provider')
    ) {
      return
    }

    const sanitizedEntry = sanitizePayloadValue(entry)
    if (
      sanitizedEntry
      && typeof sanitizedEntry === 'object'
      && !Array.isArray(sanitizedEntry)
      && Object.keys(sanitizedEntry as Record<string, unknown>).length === 0
    ) {
      return
    }

    sanitized[key] = sanitizedEntry
  })

  return sanitized
}

const readHeader = (
  headers: TelephonyWebhookHeaders,
  name: string,
): string => {
  const direct = headers[name]
  if (Array.isArray(direct)) {
    const firstValue = direct.find((entry) => typeof entry === 'string')
    return normalizeString(firstValue)
  }
  if (typeof direct === 'string') {
    return direct.trim()
  }

  const lower = headers[name.toLowerCase()]
  if (Array.isArray(lower)) {
    const firstValue = lower.find((entry) => typeof entry === 'string')
    return normalizeString(firstValue)
  }
  if (typeof lower === 'string') {
    return lower.trim()
  }

  return ''
}

const resolveWebhookPayload = (input: TelephonyWebhookVerificationInput): string => {
  if (typeof input.rawBody === 'string') {
    return input.rawBody
  }

  if (Buffer.isBuffer(input.rawBody)) {
    return input.rawBody.toString('utf8')
  }

  if (typeof input.payload === 'string') {
    return input.payload
  }

  if (!input.payload || typeof input.payload !== 'object') {
    return ''
  }

  try {
    return JSON.stringify(input.payload)
  } catch (_error) {
    return ''
  }
}

const parseSignature = (signature: string): Buffer | null => {
  const normalized = normalizeString(signature)
  if (!normalized) {
    return null
  }

  if (/^[a-f0-9]+$/i.test(normalized) && normalized.length % 2 === 0) {
    return Buffer.from(normalized, 'hex')
  }

  try {
    const parsed = Buffer.from(normalized, 'base64')
    return parsed.length > 0 ? parsed : null
  } catch (_error) {
    return null
  }
}

const parseWebhookTimestampMs = (timestamp: string): number | null => {
  const normalized = normalizeString(timestamp)
  if (!/^\d+$/.test(normalized)) {
    return null
  }

  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed > 1_000_000_000_000 ? parsed : parsed * 1000
}

const buildWebhookRefusal = (
  code: TelephonyWebhookVerificationResult extends infer _T ? any : never,
): never => {
  throw new Error(`Unexpected webhook refusal code ${code}`)
}

const toWebhookRefusal = (
  code: 'WEBHOOK_SIGNATURE_NOT_CONFIGURED' | 'WEBHOOK_SIGNATURE_MISSING' | 'WEBHOOK_SIGNATURE_INVALID',
  message: string,
  refusalType: 'business' | 'client',
  httpStatus: 401 | 503,
): Extract<TelephonyWebhookVerificationResult, { ok: false }> => ({
  ok: false,
  refusal: {
    code,
    message,
    refusalType,
    httpStatus,
  },
})

const toCanonicalEventType = (rawEventType: string): string => {
  const normalized = normalizeString(rawEventType).toLowerCase()
  if (!normalized) {
    return 'MessageQueued'
  }

  if (normalized === 'call.connected' || normalized === 'voice.connected') {
    return 'CallConnected'
  }

  if (normalized === 'call.initiated' || normalized === 'call.initiated.outbound') {
    return 'CallAttemptStarted'
  }

  if (normalized === 'message.delivered' || normalized === 'message.finalized') {
    return 'MessageDelivered'
  }

  if (normalized === 'message.sent' || normalized === 'message.sending') {
    return 'MessageSent'
  }

  if (normalized === 'message.queued' || normalized === 'sms.queued') {
    return 'MessageQueued'
  }

  return normalized
    .split(/[._-]+/)
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join('') || 'MessageQueued'
}

const resolveFetch = (fetchImpl?: typeof globalThis.fetch): typeof globalThis.fetch => {
  const resolved = fetchImpl ?? globalThis.fetch
  if (typeof resolved !== 'function') {
    throw buildTelnyxProviderFailure({
      message: 'Global fetch is unavailable for the Telnyx adapter.',
      category: 'auth_configuration',
      retryable: false,
    })
  }

  return resolved
}

const resolveConfig = (options: TelnyxAdapterOptions) => ({
  apiKey: normalizeString(options.apiKey ?? process.env.TELNYX_API_KEY),
  apiBaseUrl: normalizeString(options.apiBaseUrl ?? process.env.TELNYX_API_BASE_URL)
    || DEFAULT_TELNYX_API_BASE_URL,
  fromNumber: normalizeString(options.fromNumber ?? process.env.TELNYX_FROM_NUMBER),
  connectionId: normalizeString(options.connectionId ?? process.env.TELNYX_CONNECTION_ID),
  messagingProfileId: normalizeString(
    options.messagingProfileId ?? process.env.TELNYX_MESSAGING_PROFILE_ID,
  ),
})

const buildRequestHeaders = (input: {
  apiKey: string
  idempotencyKey?: string
}): Record<string, string> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.apiKey}`,
    'Content-Type': 'application/json',
  }

  const idempotencyKey = normalizeString(input.idempotencyKey)
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  return headers
}

const parseJsonResponse = async (response: Response): Promise<TelnyxDispatchResponseBody> => {
  const bodyText = await response.text()
  if (!bodyText) {
    return {}
  }

  try {
    return JSON.parse(bodyText) as TelnyxDispatchResponseBody
  } catch (_error) {
    throw new TelephonyProviderFailure({
      message: `Telnyx response was not valid JSON (status ${response.status}).`,
      classification: {
        providerKey: 'telnyx',
        category: 'unknown_provider_failure',
        retryable: false,
        httpStatus: response.status,
        providerCode: null,
      },
    })
  }
}

const assertConfiguredTargetPhone = (targetPhone: string | undefined): string => {
  const resolved = normalizeString(targetPhone)
  if (!resolved) {
    throw new TelephonyProviderFailure({
      message: 'Telnyx dispatch requires targetPhone for provider-backed delivery.',
      classification: {
        providerKey: 'telnyx',
        category: 'invalid_request',
        retryable: false,
        httpStatus: null,
        providerCode: null,
      },
    })
  }

  return resolved
}

const buildSmsPayload = (
  config: ReturnType<typeof resolveConfig>,
  command: TelephonySendSmsCommand,
): Record<string, unknown> => {
  const text = normalizeString(command.body)
  if (!text) {
    throw new TelephonyProviderFailure({
      message: 'Telnyx SMS dispatch requires a non-empty body.',
      classification: {
        providerKey: 'telnyx',
        category: 'invalid_request',
        retryable: false,
        httpStatus: null,
        providerCode: null,
      },
    })
  }

  const payload: Record<string, unknown> = {
    to: assertConfiguredTargetPhone(command.targetPhone),
    text,
  }

  if (config.fromNumber) {
    payload.from = config.fromNumber
    return payload
  }

  if (config.messagingProfileId) {
    payload.messaging_profile_id = config.messagingProfileId
    return payload
  }

  throw new TelephonyProviderFailure({
    message: 'Set TELNYX_FROM_NUMBER or TELNYX_MESSAGING_PROFILE_ID for Telnyx SMS dispatch.',
    classification: {
      providerKey: 'telnyx',
      category: 'auth_configuration',
      retryable: false,
      httpStatus: null,
      providerCode: null,
    },
  })
}

const buildOutboundCallPayload = (
  config: ReturnType<typeof resolveConfig>,
  command: TelephonyStartOutboundCallCommand | TelephonyStartBridgeOutboundCallCommand,
): Record<string, unknown> => {
  if (!config.connectionId) {
    throw new TelephonyProviderFailure({
      message: 'Set TELNYX_CONNECTION_ID for Telnyx outbound call initiation.',
      classification: {
        providerKey: 'telnyx',
        category: 'auth_configuration',
        retryable: false,
        httpStatus: null,
        providerCode: null,
      },
    })
  }

  if (!config.fromNumber) {
    throw new TelephonyProviderFailure({
      message: 'Set TELNYX_FROM_NUMBER for Telnyx outbound call initiation.',
      classification: {
        providerKey: 'telnyx',
        category: 'auth_configuration',
        retryable: false,
        httpStatus: null,
        providerCode: null,
      },
    })
  }

  return {
    connection_id: config.connectionId,
    from: config.fromNumber,
    to: assertConfiguredTargetPhone(command.targetPhone),
  }
}

const buildBridgePayload = (
  command: TelephonyStartBridgeSessionCommand,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    call_control_id: command.neighborProviderCallId,
    call_control_id_to_bridge_with: command.neighborProviderCallId,
  }

  const idempotencyKey = normalizeString(command.idempotencyKey)
  if (idempotencyKey) {
    payload.command_id = idempotencyKey
  }

  return payload
}

const buildEndCallPayload = (
  command: TelephonyEndCallCommand,
): Record<string, unknown> => {
  const idempotencyKey = normalizeString(command.idempotencyKey)
  return idempotencyKey
    ? { command_id: idempotencyKey }
    : {}
}

const classifyTelnyxResponseFailure = (
  response: Response,
): {
  category: TelephonyProviderFailureCategory
  retryable: boolean
} => {
  if (response.status === 401 || response.status === 403) {
    return {
      category: 'auth_configuration',
      retryable: false,
    }
  }

  if (response.status === 429 || response.status >= 500) {
    return {
      category: 'temporary_provider_failure',
      retryable: true,
    }
  }

  if (response.status >= 400 && response.status < 500) {
    return {
      category: 'invalid_request',
      retryable: false,
    }
  }

  return {
    category: 'unknown_provider_failure',
    retryable: false,
  }
}

const buildTelnyxProviderFailure = (input: {
  message: string
  category: TelephonyProviderFailureCategory
  retryable: boolean
  httpStatus?: number | null
  providerCode?: string | null
}): TelephonyProviderFailure => new TelephonyProviderFailure({
  message: input.message,
  classification: {
    providerKey: 'telnyx',
    category: input.category,
    retryable: input.retryable,
    httpStatus: input.httpStatus ?? null,
    providerCode: normalizeString(input.providerCode) || null,
  },
})

const extractTelnyxErrorMessage = (
  response: Response,
  data: TelnyxDispatchResponseBody,
): {
  message: string
  providerCode: string | null
} => {
  const firstError = Array.isArray(data.errors) ? data.errors[0] : null
  const providerCode = normalizeString(firstError?.code) || null
  const detail = normalizeString(firstError?.detail)
  const title = normalizeString(firstError?.title)

  return {
    message: detail || title || `Telnyx request failed with status ${response.status}.`,
    providerCode,
  }
}

const requestTelnyx = async (
  input: {
    options: TelnyxAdapterOptions
    path: string
    body: Record<string, unknown>
    idempotencyKey?: string
  },
): Promise<{ response: Response; data: TelnyxDispatchResponseBody }> => {
  const config = resolveConfig(input.options)
  if (!config.apiKey) {
    throw buildTelnyxProviderFailure({
      message: 'TELNYX_API_KEY is required for real Telnyx dispatch.',
      category: 'auth_configuration',
      retryable: false,
    })
  }

  const fetchImpl = resolveFetch(input.options.fetchImpl)
  let response: Response
  try {
    response = await fetchImpl(`${config.apiBaseUrl}${input.path}`, {
      method: 'POST',
      headers: buildRequestHeaders({
        apiKey: config.apiKey,
        idempotencyKey: input.idempotencyKey,
      }),
      body: JSON.stringify(input.body),
    })
  } catch (error) {
    throw buildTelnyxProviderFailure({
      message: error instanceof Error
        ? error.message
        : 'Telnyx request failed before a response was received.',
      category: 'temporary_provider_failure',
      retryable: true,
    })
  }

  const data = await parseJsonResponse(response)
  if (!response.ok) {
    const failure = classifyTelnyxResponseFailure(response)
    const errorDetails = extractTelnyxErrorMessage(response, data)
    throw buildTelnyxProviderFailure({
      message: errorDetails.message,
      category: failure.category,
      retryable: failure.retryable,
      httpStatus: response.status,
      providerCode: errorDetails.providerCode,
    })
  }

  return { response, data }
}

const extractProviderEventCorrelation = (
  payload: unknown,
): TelephonyProviderEventCorrelation => {
  const normalizedPayload = normalizePayloadRecord(payload)
  const data = normalizePayloadRecord(normalizedPayload.data)
  const dataPayload = normalizePayloadRecord(data.payload)
  const sources = [normalizedPayload, dataPayload, data]

  return {
    providerLegId: readStringFromPayloadSources(sources, [
      'call_control_id',
      'call_leg_id',
    ]),
    providerMessageId: readStringFromPayloadSources(sources, [
      'message_uuid',
      'message_id',
    ]),
    providerEventId: readStringFromPayloadSources(sources, [
      'event_id',
      'id',
    ]),
    providerNumber: readStringFromPayloadSources(sources, [
      'to',
      'to_number',
      'toNumber',
    ]),
  }
}

const buildProviderEvent = (
  input: TelephonyProviderEventTranslationInput,
): TelephonyProviderEvent => ({
  eventType: toCanonicalEventType(input.rawEventType),
  payload: sanitizePayloadValue(normalizePayloadRecord(input.payload)) as Record<string, unknown>,
  correlation: extractProviderEventCorrelation(input.payload),
  providerNeutral: true,
  providerSpecificFieldsStripped: true,
  providerBranchingInDomain: false,
})

const verifyTelnyxWebhook = (
  input: TelephonyWebhookVerificationInput,
  options: TelnyxAdapterOptions,
): TelephonyWebhookVerificationResult => {
  if (input.verification?.enforceValidation === false) {
    return { ok: true }
  }

  const publicKeyPem =
    normalizeString(input.verification?.publicKeyPem)
    || normalizeString(process.env.TELNYX_PUBLIC_KEY)
  if (!publicKeyPem) {
    return toWebhookRefusal(
      'WEBHOOK_SIGNATURE_NOT_CONFIGURED',
      'Webhook signature validation is not configured for Telnyx.',
      'business',
      503,
    )
  }

  const incomingSignature = readHeader(input.headers, TELNYX_SIGNATURE_HEADER)
  const incomingTimestamp = readHeader(input.headers, TELNYX_TIMESTAMP_HEADER)
  if (!incomingSignature || !incomingTimestamp) {
    return toWebhookRefusal(
      'WEBHOOK_SIGNATURE_MISSING',
      'Telnyx webhook signature headers are required.',
      'client',
      401,
    )
  }

  const signature = parseSignature(incomingSignature)
  if (!signature) {
    return toWebhookRefusal(
      'WEBHOOK_SIGNATURE_INVALID',
      'Webhook signature validation failed.',
      'client',
      401,
    )
  }

  let publicKey: ReturnType<typeof createPublicKey>
  try {
    publicKey = createPublicKey(publicKeyPem)
  } catch (_error) {
    return toWebhookRefusal(
      'WEBHOOK_SIGNATURE_NOT_CONFIGURED',
      'Webhook signature validation is not configured for Telnyx.',
      'business',
      503,
    )
  }

  const payload = resolveWebhookPayload(input)
  let isValid = false
  try {
    isValid = verify(
      null,
      Buffer.from(`${incomingTimestamp}|${payload}`, 'utf8'),
      publicKey,
      signature,
    )
  } catch (_error) {
    isValid = false
  }

  if (!isValid) {
    return toWebhookRefusal(
      'WEBHOOK_SIGNATURE_INVALID',
      'Webhook signature validation failed.',
      'client',
      401,
    )
  }

  const timestampMs = parseWebhookTimestampMs(incomingTimestamp)
  const configuredMaxAgeSeconds = Number.parseInt(
    process.env.CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS || '',
    10,
  )
  const maxAgeSeconds =
    input.verification?.maxAgeSeconds
    ?? (Number.isFinite(configuredMaxAgeSeconds)
      ? configuredMaxAgeSeconds
      : DEFAULT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS)
  const now = options.now ?? Date.now
  if (!timestampMs || Math.abs(now() - timestampMs) > (maxAgeSeconds * 1000)) {
    return toWebhookRefusal(
      'WEBHOOK_SIGNATURE_INVALID',
      'Webhook signature timestamp is outside the allowed replay window.',
      'client',
      401,
    )
  }

  return { ok: true }
}

export function createTelnyxAdapter(
  options: TelnyxAdapterOptions = {},
): TelephonyProviderAdapter {
  return {
    providerKey: 'telnyx',
    adapterInterfaceVersion: 'v1',
    async sendSms(command) {
      const requestStartedAt = new Date((options.now ?? Date.now)()).toISOString()
      const { response, data } = await requestTelnyx({
        options,
        path: '/messages',
        body: buildSmsPayload(resolveConfig(options), command),
        idempotencyKey: command.idempotencyKey,
      })

      return assertValidSmsDispatchResult({
        providerKey: 'telnyx',
        channel: 'message',
        providerLegId: null,
        providerMessageId: normalizeString(data.data?.id),
        providerRequestId: normalizeString(response.headers.get('x-request-id')),
        adapterInvoked: true,
        providerBranchingInDomain: false,
        requestedAt: requestStartedAt,
      })
    },
    async startOutboundCall(command) {
      const requestStartedAt = new Date((options.now ?? Date.now)()).toISOString()
      const { response, data } = await requestTelnyx({
        options,
        path: '/calls',
        body: buildOutboundCallPayload(resolveConfig(options), command),
        idempotencyKey: command.idempotencyKey,
      })

      const providerLegId =
        normalizeString(data.data?.call_control_id)
        || normalizeString(data.data?.call_leg_id)
        || normalizeString(data.data?.id)

      return assertValidCallDispatchResult({
        providerKey: 'telnyx',
        channel: 'call',
        providerLegId,
        providerMessageId: null,
        providerRequestId: normalizeString(response.headers.get('x-request-id')),
        adapterInvoked: true,
        providerBranchingInDomain: false,
        requestedAt: requestStartedAt,
      })
    },
    async startBridgeOutboundCall(command) {
      const requestStartedAt = new Date((options.now ?? Date.now)()).toISOString()
      const { response, data } = await requestTelnyx({
        options,
        path: '/calls',
        body: buildOutboundCallPayload(resolveConfig(options), command),
        idempotencyKey: command.idempotencyKey,
      })

      const providerLegId =
        normalizeString(data.data?.call_control_id)
        || normalizeString(data.data?.call_leg_id)
        || normalizeString(data.data?.id)

      return assertValidCallDispatchResult({
        providerKey: 'telnyx',
        channel: 'call',
        providerLegId,
        providerMessageId: null,
        providerRequestId: normalizeString(response.headers.get('x-request-id')),
        adapterInvoked: true,
        providerBranchingInDomain: false,
        requestedAt: requestStartedAt,
      })
    },
    async startBridgeSession(command): Promise<TelephonyStartBridgeSessionResult> {
      const requestStartedAt = new Date((options.now ?? Date.now)()).toISOString()
      const { response } = await requestTelnyx({
        options,
        path: `/calls/${encodeURIComponent(command.operatorProviderCallId)}/actions/bridge`,
        body: buildBridgePayload(command),
        idempotencyKey: command.idempotencyKey,
      })

      return {
        providerKey: 'telnyx',
        bridgeSessionId: command.bridgeSessionId,
        bridgeEstablished: true,
        providerRequestId: normalizeString(response.headers.get('x-request-id')),
        adapterInvoked: true,
        providerBranchingInDomain: false,
        requestedAt: requestStartedAt,
      }
    },
    async endCall(command): Promise<TelephonyEndCallResult> {
      const requestStartedAt = new Date((options.now ?? Date.now)()).toISOString()
      const { response } = await requestTelnyx({
        options,
        path: `/calls/${encodeURIComponent(command.providerLegId)}/actions/hangup`,
        body: buildEndCallPayload(command),
        idempotencyKey: command.idempotencyKey,
      })

      return assertValidEndCallResult({
        providerKey: 'telnyx',
        providerLegId: command.providerLegId,
        ended: true,
        providerRequestId: normalizeString(response.headers.get('x-request-id')),
        adapterInvoked: true,
        providerBranchingInDomain: false,
        requestedAt: requestStartedAt,
      })
    },
    verifyWebhook(input) {
      return verifyTelnyxWebhook(input, options)
    },
    translateProviderEvent(input) {
      return buildProviderEvent(input)
    },
  }
}
