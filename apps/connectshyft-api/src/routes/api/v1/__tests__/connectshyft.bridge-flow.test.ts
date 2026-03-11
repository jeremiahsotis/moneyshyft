import connectShyftRouter from '../connectshyft'
import { resetConnectShyftBridgeSessionStateForTests } from '../../../../modules/connectshyft/bridgeSessions'
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents'
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings'

const toCanonicalEventType = (rawEventType: string): string => rawEventType
  .split(/[._-]+/)
  .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
  .join('')

const sendSmsMock = jest.fn()
const startOutboundCallMock = jest.fn(async (command: { threadId: string; targetPhone?: string }) => ({
  providerKey: 'telnyx',
  channel: 'call' as const,
  providerLegId: command.targetPhone === '+12605550155'
    ? `telnyx-leg-operator-${command.threadId}`
    : `telnyx-leg-neighbor-${command.threadId}`,
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
const verifyWebhookMock = jest.fn(() => ({ ok: true as const }))
const translateProviderEventMock = jest.fn(({ rawEventType, payload }: { rawEventType: string; payload: unknown }) => ({
  eventType: toCanonicalEventType(rawEventType),
  payload: (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>,
  providerNeutral: true as const,
  providerSpecificFieldsStripped: true as const,
  providerBranchingInDomain: false as const,
}))

jest.mock('../../../../../../../infrastructure/communications/telnyx', () => ({
  createTelnyxAdapter: jest.fn(() => ({
    providerKey: 'telnyx',
    adapterInterfaceVersion: 'v1',
    sendSms: sendSmsMock,
    startOutboundCall: startOutboundCallMock,
    startBridgeSession: startBridgeSessionMock,
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
  ...extra,
})

const invokeRoute = async (input: {
  method?: 'GET' | 'POST'
  url: string
  body?: Record<string, unknown>
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
    verifyWebhookMock.mockClear()
    translateProviderEventMock.mockClear()
    resetConnectShyftCanonicalEventsForTests()
    resetConnectShyftBridgeSessionStateForTests()
    resetConnectShyftProviderCorrelationStateForTests()
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
          providerLegId: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
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
        provider_leg_id: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
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
        provider_leg_id: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
      operatorProviderCallId: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
      neighborProviderCallId: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
        provider_event_id: 'bridge-operator-answered-1001',
        provider_leg_id: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
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
        provider_event_id: 'bridge-operator-answered-1001',
        provider_leg_id: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
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
      .toContain('bridge-operator-answered-1001')
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
        provider_leg_id: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
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
        provider_leg_id: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
        provider_event_id: 'bridge-completed-1001',
        provider_leg_id: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
        provider_event_id: 'bridge-completed-1001',
        provider_leg_id: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
        provider_leg_id: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
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
        provider_leg_id: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
        provider_leg_id: 'telnyx-leg-operator-thread-f1-unclaimed-1001',
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
        provider_leg_id: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
        provider_event_id: 'bridge-completed-refresh-1001',
        provider_leg_id: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001',
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
