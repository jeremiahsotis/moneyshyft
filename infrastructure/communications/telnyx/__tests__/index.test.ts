import { generateKeyPairSync, sign as signPayload } from 'node:crypto'
import { createTelnyxAdapter } from '../index'

const buildResponse = (body: unknown, init?: { status?: number; headers?: Record<string, string> }) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  })

describe('Telnyx adapter', () => {
  it('sends SMS with bearer auth, idempotency key, and provider-neutral results', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
    fetchMock.mockResolvedValue(
      buildResponse(
        {
          data: {
            id: 'telnyx-message-1001',
          },
        },
        {
          headers: {
            'x-request-id': 'req-1001',
          },
        },
      ),
    )

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fromNumber: '+12605550199',
      fetchImpl: fetchMock,
      now: () => Date.parse('2026-03-11T12:00:00.000Z'),
    })

    const result = await adapter.sendSms({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      providerKey: 'telnyx',
      body: 'Need assistance',
      targetPhone: '+12605550111',
      idempotencyKey: 'idem-sms-001',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telnyx.com/v2/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer telnyx-test-key',
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idem-sms-001',
        }),
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      from: '+12605550199',
      to: '+12605550111',
      text: 'Need assistance',
    })
    expect(result).toMatchObject({
      providerKey: 'telnyx',
      channel: 'message',
      providerMessageId: 'telnyx-message-1001',
      providerLegId: null,
      providerRequestId: 'req-1001',
      adapterInvoked: true,
      providerBranchingInDomain: false,
      requestedAt: '2026-03-11T12:00:00.000Z',
    })
  })

  it('initiates outbound calls with connection configuration and returns provider leg ids', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
    fetchMock.mockResolvedValue(
      buildResponse({
        data: {
          call_leg_id: 'telnyx-leg-2001',
          call_control_id: 'telnyx-control-2001',
        },
      }),
    )

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fromNumber: '+12605550199',
      connectionId: '2084000000000000001',
      fetchImpl: fetchMock,
      now: () => Date.parse('2026-03-11T12:05:00.000Z'),
    })

    const result = await adapter.startOutboundCall({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      providerKey: 'telnyx',
      targetPhone: '+12605550111',
      idempotencyKey: 'idem-call-001',
      callPolicy: {
        transport: 'bridge',
        autoRetry: false,
        redialPolicy: 'manual_only',
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telnyx.com/v2/calls',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer telnyx-test-key',
          'Idempotency-Key': 'idem-call-001',
        }),
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      connection_id: '2084000000000000001',
      from: '+12605550199',
      to: '+12605550111',
    })
    expect(result).toMatchObject({
      providerKey: 'telnyx',
      channel: 'call',
      providerLegId: 'telnyx-control-2001',
      providerMessageId: null,
      adapterInvoked: true,
      providerBranchingInDomain: false,
      requestedAt: '2026-03-11T12:05:00.000Z',
    })
  })

  it('bridges two provider call legs through the Telnyx call-control endpoint', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn()
    fetchMock.mockResolvedValue(
      buildResponse(
        {
          data: {
            result: 'ok',
          },
        },
        {
          headers: {
            'x-request-id': 'req-bridge-3001',
          },
        },
      ),
    )

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fromNumber: '+12605550199',
      connectionId: '2084000000000000001',
      fetchImpl: fetchMock,
      now: () => Date.parse('2026-03-11T12:06:00.000Z'),
    })

    const result = await adapter.startBridgeSession?.({
      providerKey: 'telnyx',
      bridgeSessionId: 'bridge-session-1001',
      operatorProviderCallId: 'telnyx-control-operator-1001',
      neighborProviderCallId: 'telnyx-control-neighbor-1001',
      idempotencyKey: 'idem-bridge-001',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telnyx.com/v2/calls/telnyx-control-operator-1001/actions/bridge',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer telnyx-test-key',
          'Idempotency-Key': 'idem-bridge-001',
        }),
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      call_control_id: 'telnyx-control-neighbor-1001',
      call_control_id_to_bridge_with: 'telnyx-control-neighbor-1001',
      command_id: 'idem-bridge-001',
    })
    expect(result).toEqual({
      providerKey: 'telnyx',
      bridgeSessionId: 'bridge-session-1001',
      bridgeEstablished: true,
      providerRequestId: 'req-bridge-3001',
      adapterInvoked: true,
      providerBranchingInDomain: false,
      requestedAt: '2026-03-11T12:06:00.000Z',
    })
  })

  it('fails deterministically when TELNYX_API_KEY is missing', async () => {
    const adapter = createTelnyxAdapter({
      fromNumber: '+12605550199',
      fetchImpl: jest.fn() as jest.MockedFunction<typeof fetch>,
    })

    await expect(
      adapter.sendSms({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550111',
      }),
    ).rejects.toThrow('TELNYX_API_KEY is required for real Telnyx dispatch.')
  })

  it('verifies Telnyx webhook signatures with Ed25519 public keys', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const publicKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString()
    const payload = JSON.stringify({
      data: {
        event_type: 'call.initiated',
      },
    })
    const timestamp = Math.trunc(Date.now() / 1000).toString()
    const signature = signPayload(
      null,
      Buffer.from(`${timestamp}|${payload}`, 'utf8'),
      privateKey,
    ).toString('base64')

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      now: () => Date.parse('2026-03-11T12:10:00.000Z'),
    })

    const decision = adapter.verifyWebhook({
      providerKey: 'telnyx',
      headers: {
        'telnyx-signature-ed25519': signature,
        'telnyx-timestamp': timestamp,
      },
      rawBody: payload,
      verification: {
        publicKeyPem,
        maxAgeSeconds: 600_000,
      },
    })

    expect(decision).toEqual({ ok: true })
  })

  it('fails closed when webhook signatures are missing or invalid', () => {
    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      now: () => Date.parse('2026-03-11T12:10:00.000Z'),
    })

    expect(
      adapter.verifyWebhook({
        providerKey: 'telnyx',
        headers: {},
        rawBody: '{}',
        verification: {
          publicKeyPem: 'not-a-key',
          maxAgeSeconds: 300,
        },
      }),
    ).toMatchObject({
      ok: false,
      refusal: {
        code: 'WEBHOOK_SIGNATURE_MISSING',
      },
    })
  })

  it('translates provider events into sanitized provider-neutral payloads', () => {
    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
    })

    expect(
      adapter.translateProviderEvent({
        rawEventType: 'call.connected',
        payload: {
          eventType: 'call.connected',
          telnyxCallControlId: 'telnyx-raw-001',
          providerPayload: {
            call_control_id: 'telnyx-raw-001',
          },
          delivery: {
            status: 'connected',
          },
        },
      }),
    ).toEqual({
      eventType: 'CallConnected',
      payload: {
        eventType: 'call.connected',
        delivery: {
          status: 'connected',
        },
      },
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    })
  })

  it('translates answered bridge-leg events without leaking Telnyx identifiers', () => {
    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
    })

    expect(
      adapter.translateProviderEvent({
        rawEventType: 'call.answered',
        payload: {
          call_control_id: 'telnyx-control-operator-1001',
          call_leg_id: 'telnyx-leg-operator-1001',
          eventType: 'call.answered',
          call_session_id: 'telnyx-session-1001',
          occurrence: {
            leg: 'operator',
          },
        },
      }),
    ).toEqual({
      eventType: 'CallAnswered',
      payload: {
        eventType: 'call.answered',
        occurrence: {
          leg: 'operator',
        },
      },
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    })
  })
})
