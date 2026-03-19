import connectShyftRouter from '../connectshyft'
import { resetConnectShyftBridgeSessionStateForTests } from '../../../../modules/connectshyft/bridgeSessions'
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents'
import { connectShyftNumberMappingServiceAsync } from '../../../../modules/connectshyft/numberMappings'
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings'

const toCanonicalEventType = (rawEventType: string): string => rawEventType
  .split(/[._-]+/)
  .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
  .join('')

const toProviderCorrelation = (payload: unknown) => {
  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {}

  return {
    providerLegId: typeof source.providerLegId === 'string' ? source.providerLegId : null,
    providerMessageId: typeof source.providerMessageId === 'string' ? source.providerMessageId : null,
    providerEventId: typeof source.providerEventId === 'string' ? source.providerEventId : null,
    providerNumber: typeof source.providerNumber === 'string'
      ? source.providerNumber
      : (typeof source.to === 'string'
        ? source.to
        : (typeof source.to_number === 'string' ? source.to_number : null)),
  }
}

const sendSmsMock = jest.fn()
const startOutboundCallMock = jest.fn(async (command: { threadId: string; targetPhone?: string }) => ({
  providerKey: 'telnyx',
  channel: 'call' as const,
  providerLegId: command.targetPhone === '+12605550155'
    ? `provider-leg-operator-${command.threadId}`
    : `provider-leg-neighbor-${command.threadId}`,
  providerMessageId: null,
  providerRequestId: 'req-call-2001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:05:00.000Z',
}))
const startBridgeSessionMock = jest.fn(async (command: {
  bridgeSessionId: string
  operatorProviderCallId: string
  neighborProviderCallId: string
}) => ({
  providerKey: 'telnyx',
  bridgeSessionId: command.bridgeSessionId,
  bridgeEstablished: true as const,
  providerRequestId: 'req-bridge-3001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:06:00.000Z',
}))
const verifyWebhookMock = jest.fn(
  (): { ok: true } | {
    ok: false
    refusal: {
      code: 'WEBHOOK_SIGNATURE_NOT_CONFIGURED' | 'WEBHOOK_SIGNATURE_MISSING' | 'WEBHOOK_SIGNATURE_INVALID'
      message: string
      refusalType: 'business' | 'client'
      httpStatus: 401 | 503
    }
  } => ({ ok: true as const }),
)
const endCallMock = jest.fn(async (command: { providerLegId: string }) => ({
  providerKey: 'telnyx',
  providerLegId: command.providerLegId,
  ended: true as const,
  providerRequestId: 'req-end-call-4001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:07:00.000Z',
}))
const translateProviderEventMock = jest.fn(({ rawEventType, payload }: { rawEventType: string; payload: unknown }) => ({
  eventType: toCanonicalEventType(rawEventType),
  payload: (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>,
  correlation: toProviderCorrelation(payload),
  providerNeutral: true as const,
  providerSpecificFieldsStripped: true as const,
  providerBranchingInDomain: false as const,
}))

jest.mock('../../../../../../../infrastructure/communications', () => ({
  resolveTelephonyProviderAdapter: jest.fn(() => ({
    providerKey: 'telnyx',
    adapterInterfaceVersion: 'v1',
    sendSms: sendSmsMock,
    startOutboundCall: startOutboundCallMock,
    startBridgeSession: startBridgeSessionMock,
    endCall: endCallMock,
    verifyWebhook: verifyWebhookMock,
    translateProviderEvent: translateProviderEventMock,
  })),
}))

const buildHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f1',
  'x-test-connectshyft-orgunit-id': 'org-connectshyft-f1-east',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f1-east']),
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-f1-primary-operator',
  'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
  'x-test-connectshyft-flags': JSON.stringify({
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  }),
  ...extra,
})

const invokeRoute = async (input: {
  method?: 'GET' | 'POST'
  url: string
  body?: Record<string, unknown>
  rawBody?: string | Buffer
  headers?: Record<string, string>
}): Promise<{ status: number; body: unknown }> => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(input.headers || {}).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return new Promise((resolve, reject) => {
    let resolved = false
    const req = {
      method: input.method || 'POST',
      url: input.url,
      originalUrl: input.url,
      path: input.url,
      protocol: 'https',
      body: input.body || {},
      rawBody: input.rawBody,
      headers: normalizedHeaders,
      params: {},
      query: {},
      tenantContext: undefined,
      tenantId: undefined,
      orgUnitId: undefined,
      user: undefined,
      header(name: string): string | undefined {
        return normalizedHeaders[name.toLowerCase()]
      },
      get(name: string): string | undefined {
        return normalizedHeaders[name.toLowerCase()]
      },
    } as any

    const res = {
      locals: {},
      statusCode: 200,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(payload: unknown) {
        resolved = true
        resolve({
          status: this.statusCode,
          body: payload,
        })
        return this
      },
      send(payload: unknown) {
        resolved = true
        resolve({
          status: this.statusCode,
          body: payload,
        })
        return this
      },
      setHeader() {
        return this
      },
      getHeader() {
        return undefined
      },
      end(payload?: unknown) {
        if (!resolved) {
          resolved = true
          resolve({
            status: this.statusCode,
            body: payload,
          })
        }
        return this
      },
    } as any

    ;(connectShyftRouter as any).handle(req, res, (error?: unknown) => {
      if (error) {
        reject(error)
        return
      }

      if (!resolved) {
        resolve({
          status: res.statusCode,
          body: null,
        })
      }
    })
  })
}

describe('connectshyft bridge webhook flow', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS

  beforeAll(() => {
    process.env.NODE_ENV = 'test'
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true'
  })

  beforeEach(() => {
    sendSmsMock.mockClear()
    startOutboundCallMock.mockClear()
    startBridgeSessionMock.mockClear()
    endCallMock.mockClear()
    verifyWebhookMock.mockClear()
    translateProviderEventMock.mockClear()
    resetConnectShyftCanonicalEventsForTests()
    resetConnectShyftBridgeSessionStateForTests()
    resetConnectShyftProviderCorrelationStateForTests()
    jest.spyOn(connectShyftNumberMappingServiceAsync, 'resolveRoutingMappingByNumber').mockImplementation(
      async (input) => {
        if (input.tenantId === 'tenant-connectshyft-f1' && input.twilioNumberE164 === '+12605550191') {
          return {
            status: 'found' as const,
            mapping: {
              mappingId: 'mapping-f1-001',
              tenantId: 'tenant-connectshyft-f1',
              orgUnitId: 'org-connectshyft-f1-east',
              twilioNumberE164: '+12605550191',
              label: 'Front Desk',
              isActive: true,
              createdAtUtc: '2026-03-11T12:00:00.000Z',
              updatedAtUtc: '2026-03-11T12:00:00.000Z',
            },
          }
        }

        return {
          status: 'not-found' as const,
        }
      },
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags
  })

  it('creates a persisted bridge session on call start with operator-first dialing', async () => {
    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
      data: {
        dispatch: {
          providerKey: 'telnyx',
          providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
        },
        bridgeSession: {
          bridgeSessionId: expect.any(String),
          status: 'operator_dialing',
          sessionState: 'operator_dialing',
          operatorLegState: 'ringing',
          neighborLegState: 'created',
          failureCode: null,
          failureMessage: null,
          operatorLeg: {
            status: 'ringing',
            failureCode: null,
            failureMessage: null,
          },
          neighborLeg: {
            status: 'created',
            failureCode: null,
            failureMessage: null,
          },
        },
      },
    })
    expect(startOutboundCallMock).toHaveBeenCalledTimes(1)
    expect(startOutboundCallMock).toHaveBeenCalledWith(expect.objectContaining({
      targetPhone: '+12605550155',
    }))
  })

  it('refuses outbound call start when sender alignment cannot resolve to an active mapped number', async () => {
    const routingSpy = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >
    routingSpy.mockResolvedValueOnce({ status: 'not-found' })

    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_CALL_SENDER_REQUIRED',
      data: {
        senderResolution: {
          source: 'thread_alignment',
          channel: 'voice',
          reason: 'sender_mapping_missing',
          candidateProviderNumberE164: '+12605550191',
        },
      },
    })
    expect(startOutboundCallMock).not.toHaveBeenCalled()
    expect(startBridgeSessionMock).not.toHaveBeenCalled()
  })

  it('rejects unverified webhooks before receipt processing or bridge side effects', async () => {
    verifyWebhookMock.mockReturnValueOnce({
      ok: false as const,
      refusal: {
        code: 'WEBHOOK_SIGNATURE_INVALID' as const,
        message: 'Signature invalid',
        refusalType: 'business' as const,
        httpStatus: 401 as const,
      },
    })

    const response = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        eventType: 'call.answered',
        providerEventId: 'provider-event-webhook-invalid-1001',
        providerLegId: 'provider-leg-webhook-invalid-1001',
      },
    })

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
      data: {
        signatureValidation: {
          verified: false,
        },
      },
    })
    expect(translateProviderEventMock).not.toHaveBeenCalled()
    expect(startOutboundCallMock).not.toHaveBeenCalled()
    expect(startBridgeSessionMock).not.toHaveBeenCalled()
  })

  it('passes the exact rawBody through webhook signature verification', async () => {
    const payload = {
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      eventType: 'call.answered',
      providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
    }
    const rawBody = JSON.stringify(payload)

    const response = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: payload,
      rawBody,
    })

    expect(response.status).toBe(200)
    expect(verifyWebhookMock).toHaveBeenCalledWith(expect.objectContaining({
      rawBody,
    }))
  })

  it('advances operator answered to neighbor dialing and bridges on neighbor answered', async () => {
    const startResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    })

    expect(startResponse.status).toBe(200)
    expect(startOutboundCallMock).toHaveBeenCalledTimes(1)

    const operatorAnswered = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
      },
    })

    expect(operatorAnswered.status).toBe(200)
    expect(operatorAnswered.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        bridgeSession: {
          status: 'neighbor_dialing',
          sessionState: 'neighbor_dialing',
          operatorLegState: 'answered',
          neighborLegState: 'ringing',
          failureCode: null,
          failureMessage: null,
          operatorLeg: {
            status: 'answered',
          },
          neighborLeg: {
            status: 'ringing',
          },
        },
        bridgeEvent: {
          type: 'operator_answered',
        },
      },
    })
    expect(startOutboundCallMock).toHaveBeenCalledTimes(2)
    expect(startOutboundCallMock).toHaveBeenLastCalledWith(expect.objectContaining({
      targetPhone: '+12605550111',
    }))

    const neighborAnswered = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerLegId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
      },
    })

    expect(neighborAnswered.status).toBe(200)
    expect(neighborAnswered.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        bridgeSession: {
          status: 'bridged',
          sessionState: 'bridged',
          operatorLegState: 'answered',
          neighborLegState: 'answered',
          failureCode: null,
          failureMessage: null,
          operatorLeg: {
            status: 'answered',
          },
          neighborLeg: {
            status: 'answered',
          },
        },
        bridgeEvent: {
          type: 'neighbor_answered',
        },
      },
    })
    expect(startBridgeSessionMock).toHaveBeenCalledTimes(1)
    expect(startBridgeSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      operatorProviderCallId: 'provider-leg-operator-thread-f1-unclaimed-1001',
      neighborProviderCallId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
    }))
  })

  it('suppresses duplicate webhook receipts before bridge side effects are re-applied', async () => {
    await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    })

    const operatorAnswered = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerEventId: 'provider-event-operator-answered-1001',
        providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
      },
    })
    const operatorAnsweredDuplicate = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerEventId: 'provider-event-operator-answered-1001',
        providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
      },
    })

    expect(operatorAnswered.status).toBe(200)
    expect(operatorAnswered.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
        },
        bridgeSession: {
          sessionState: 'neighbor_dialing',
          operatorLegState: 'answered',
          neighborLegState: 'ringing',
        },
      },
    })
    expect(operatorAnsweredDuplicate.status).toBe(200)
    expect(operatorAnsweredDuplicate.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        replaySafe: {
          duplicate: true,
          suppressedDomainWrites: true,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
      },
    })
    expect((operatorAnsweredDuplicate.body as any).data.replaySafe.dedupeKey)
      .toContain('provider-event-operator-answered-1001')
    expect(startOutboundCallMock).toHaveBeenCalledTimes(2)
    expect(startBridgeSessionMock).toHaveBeenCalledTimes(0)
  })

  it('persists terminal completion without repeating side effects on duplicate webhook delivery', async () => {
    await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    })

    await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
      },
    })
    await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerLegId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
      },
    })

    const completed = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.completed',
        providerEventId: 'provider-event-completed-1001',
        providerLegId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
      },
    })
    const completedReplay = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.completed',
        providerEventId: 'provider-event-completed-1001',
        providerLegId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
      },
    })

    expect(completed.status).toBe(200)
    expect(completed.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        bridgeSession: {
          status: 'completed',
          sessionState: 'completed',
          operatorLegState: 'completed',
          neighborLegState: 'completed',
          failureCode: null,
          failureMessage: null,
          operatorLeg: {
            status: 'completed',
          },
          neighborLeg: {
            status: 'completed',
          },
        },
        bridgeEvent: {
          type: 'completed',
        },
      },
    })
    expect(completedReplay.status).toBe(200)
    expect(completedReplay.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        replaySafe: {
          duplicate: true,
          suppressedDomainWrites: true,
        },
      },
    })
    expect(startBridgeSessionMock).toHaveBeenCalledTimes(1)
  })

  it('persists terminal bridge failure when the neighbor leg fails before bridge completion', async () => {
    await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    })

    await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
      },
    })

    const failed = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.failed',
        providerLegId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
        reason: 'neighbor_declined',
      },
    })

    expect(failed.status).toBe(200)
    expect(failed.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        bridgeSession: {
          status: 'failed',
          sessionState: 'failed',
          operatorLegState: 'answered',
          neighborLegState: 'failed',
          failureCode: 'neighbor_failed',
          failureMessage: 'neighbor_declined',
          neighborLeg: {
            status: 'failed',
            failureCode: 'neighbor_failed',
            failureMessage: 'neighbor_declined',
          },
        },
        bridgeEvent: {
          type: 'neighbor_failed',
        },
      },
    })
    expect(startBridgeSessionMock).not.toHaveBeenCalled()
  })

  it('loads persisted bridge state from a fresh thread detail read after completion', async () => {
    await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    })

    await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
      },
    })
    await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.answered',
        providerLegId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
      },
    })
    await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'call.completed',
        providerEventId: 'provider-event-completed-refresh-1001',
        providerLegId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
      },
    })

    const detailResponse = await invokeRoute({
      method: 'GET',
      url: '/threads/thread-f1-unclaimed-1001',
      headers: buildHeaders(),
    })

    expect(detailResponse.status).toBe(200)
    expect(detailResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      data: {
        bridgeSession: {
          bridgeSessionId: expect.any(String),
          status: 'completed',
          sessionState: 'completed',
          operatorLegState: 'completed',
          neighborLegState: 'completed',
          failureCode: null,
          failureMessage: null,
        },
      },
    })
  })
})
