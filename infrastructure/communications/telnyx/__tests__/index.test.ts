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
  it('sends SMS with configured from-number fallback when no explicit sender is provided', async () => {
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

  it('prefers explicit senderPhone over configured from-number fallback for SMS payloads', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn()
    fetchMock.mockResolvedValue(
      buildResponse(
        {
          data: {
            id: 'telnyx-message-1002',
          },
        },
        {
          headers: {
            'x-request-id': 'req-1002',
          },
        },
      ),
    )

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fromNumber: '+12605550199',
      fetchImpl: fetchMock,
      now: () => Date.parse('2026-03-11T12:01:00.000Z'),
    })

    const result = await adapter.sendSms({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      providerKey: 'telnyx',
      body: 'Need assistance',
      targetPhone: '+12605550111',
      senderPhone: '+12605550191',
      idempotencyKey: 'idem-sms-002',
    })

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      from: '+12605550191',
      to: '+12605550111',
      text: 'Need assistance',
    })
    expect(result).toMatchObject({
      providerKey: 'telnyx',
      channel: 'message',
      providerMessageId: 'telnyx-message-1002',
      providerLegId: null,
      providerRequestId: 'req-1002',
      adapterInvoked: true,
      providerBranchingInDomain: false,
      requestedAt: '2026-03-11T12:01:00.000Z',
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

  it('ends active calls through the Telnyx hangup endpoint', async () => {
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
            'x-request-id': 'req-hangup-4001',
          },
        },
      ),
    )

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fetchImpl: fetchMock,
      now: () => Date.parse('2026-03-11T12:07:00.000Z'),
    })

    const result = await adapter.endCall({
      providerKey: 'telnyx',
      providerLegId: 'telnyx-control-2001',
      idempotencyKey: 'idem-hangup-001',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telnyx.com/v2/calls/telnyx-control-2001/actions/hangup',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer telnyx-test-key',
          'Idempotency-Key': 'idem-hangup-001',
        }),
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      command_id: 'idem-hangup-001',
    })
    expect(result).toEqual({
      providerKey: 'telnyx',
      providerLegId: 'telnyx-control-2001',
      ended: true,
      providerRequestId: 'req-hangup-4001',
      adapterInvoked: true,
      providerBranchingInDomain: false,
      requestedAt: '2026-03-11T12:07:00.000Z',
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
    ).rejects.toMatchObject({
      message: 'TELNYX_API_KEY is required for real Telnyx dispatch.',
      classification: {
        providerKey: 'telnyx',
        category: 'auth_configuration',
        retryable: false,
        httpStatus: null,
        providerCode: null,
      },
    })
  })

  it('treats missing targetPhone as a defensive invalid-request guard', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn()

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fromNumber: '+12605550199',
      fetchImpl: fetchMock,
    })

    await expect(
      adapter.sendSms({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        providerKey: 'telnyx',
        body: 'Need assistance',
      }),
    ).rejects.toMatchObject({
      message: 'Telnyx dispatch requires targetPhone for provider-backed delivery.',
      classification: {
        providerKey: 'telnyx',
        category: 'invalid_request',
        retryable: false,
        httpStatus: null,
        providerCode: null,
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
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

  it.each([
    {
      status: 400,
      expectedCategory: 'invalid_request',
      expectedRetryable: false,
    },
    {
      status: 401,
      expectedCategory: 'auth_configuration',
      expectedRetryable: false,
    },
    {
      status: 403,
      expectedCategory: 'auth_configuration',
      expectedRetryable: false,
    },
    {
      status: 429,
      expectedCategory: 'temporary_provider_failure',
      expectedRetryable: true,
    },
    {
      status: 503,
      expectedCategory: 'temporary_provider_failure',
      expectedRetryable: true,
    },
  ])(
    'classifies Telnyx HTTP failures for status $status',
    async ({ status, expectedCategory, expectedRetryable }) => {
      const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn()
      fetchMock.mockResolvedValue(
        buildResponse(
          {
            errors: [
              {
                code: `telnyx-${status}`,
                detail: `failure-${status}`,
              },
            ],
          },
          {
            status,
          },
        ),
      )

      const adapter = createTelnyxAdapter({
        apiKey: 'telnyx-test-key',
        fromNumber: '+12605550199',
        fetchImpl: fetchMock,
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
      ).rejects.toMatchObject({
        message: `failure-${status}`,
        classification: {
          providerKey: 'telnyx',
          category: expectedCategory,
          retryable: expectedRetryable,
          httpStatus: status,
          providerCode: `telnyx-${status}`,
        },
      })
    },
  )

  it('classifies transport failures as temporary provider failures', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn()
    fetchMock.mockRejectedValue(new Error('socket hang up'))

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fromNumber: '+12605550199',
      fetchImpl: fetchMock,
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
    ).rejects.toMatchObject({
      message: 'socket hang up',
      classification: {
        providerKey: 'telnyx',
        category: 'temporary_provider_failure',
        retryable: true,
        httpStatus: null,
        providerCode: null,
      },
    })
  })

  it('classifies invalid JSON responses as unknown provider failures', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('not-json', {
        status: 502,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
      fromNumber: '+12605550199',
      fetchImpl: fetchMock,
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
    ).rejects.toMatchObject({
      message: 'Telnyx response was not valid JSON (status 502).',
      classification: {
        providerKey: 'telnyx',
        category: 'unknown_provider_failure',
        retryable: false,
        httpStatus: 502,
        providerCode: null,
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
          data: {
            id: 'evt-1001',
            payload: {
              call_control_id: 'telnyx-raw-001',
              to: '+12605550199',
            },
          },
          delivery: {
            status: 'connected',
          },
        },
      }),
    ).toEqual({
      eventType: 'CallConnected',
      payload: {
        delivery: {
          status: 'connected',
        },
      },
      correlation: {
        providerLegId: 'telnyx-raw-001',
        providerMessageId: null,
        providerEventId: 'evt-1001',
        providerNumber: '+12605550199',
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
          data: {
            id: 'evt-1002',
            payload: {
              call_control_id: 'telnyx-control-operator-1001',
              call_leg_id: 'telnyx-leg-operator-1001',
              call_session_id: 'telnyx-session-1001',
            },
          },
          occurrence: {
            leg: 'operator',
          },
        },
      }),
    ).toEqual({
      eventType: 'CallAnswered',
      payload: {
        occurrence: {
          leg: 'operator',
        },
      },
      correlation: {
        providerLegId: 'telnyx-control-operator-1001',
        providerMessageId: null,
        providerEventId: 'evt-1002',
        providerNumber: null,
      },
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    })
  })

  it('extracts correlation identifiers from providerPayload aliases used by webhook tests', () => {
    const adapter = createTelnyxAdapter({
      apiKey: 'telnyx-test-key',
    })

    expect(
      adapter.translateProviderEvent({
        rawEventType: 'sms.delivered',
        payload: {
          providerEventId: 'evt-provider-payload-1001',
          providerLegId: 'telnyx-leg-provider-payload-1001',
          providerPayload: {
            message_uuid: 'telnyx-message-provider-payload-1001',
            to: '+12605550123',
          },
        },
      }),
    ).toEqual({
      eventType: 'MessageDelivered',
      payload: {},
      correlation: {
        providerLegId: 'telnyx-leg-provider-payload-1001',
        providerMessageId: 'telnyx-message-provider-payload-1001',
        providerEventId: 'evt-provider-payload-1001',
        providerNumber: '+12605550123',
      },
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    })
  })
})
