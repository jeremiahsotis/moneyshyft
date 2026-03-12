import connectShyftRouter, { resetConnectShyftOutboundDispatchReplayLedgerForTests } from '../connectshyft';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';

const sendSmsMock = jest.fn(async (command: { threadId: string }) => ({
  providerKey: 'telnyx',
  channel: 'message' as const,
  providerLegId: null,
  providerMessageId: `telnyx-message-${command.threadId}`,
  providerRequestId: 'req-sms-1001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:00:00.000Z',
}));

const startOutboundCallMock = jest.fn(async (command: { threadId: string }) => ({
  providerKey: 'telnyx',
  channel: 'call' as const,
  providerLegId: `telnyx-leg-${command.threadId}`,
  providerMessageId: null,
  providerRequestId: 'req-call-2001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:05:00.000Z',
}));

const verifyWebhookMock = jest.fn(() => ({ ok: true as const }));
const translateProviderEventMock = jest.fn(({ rawEventType, payload }: { rawEventType: string; payload: unknown }) => ({
  eventType: rawEventType,
  payload: (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>,
  providerNeutral: true as const,
  providerSpecificFieldsStripped: true as const,
  providerBranchingInDomain: false as const,
}));

jest.mock('../../../../../../../infrastructure/communications/telnyx', () => ({
  createTelnyxAdapter: jest.fn(() => ({
    providerKey: 'telnyx',
    adapterInterfaceVersion: 'v1',
    sendSms: sendSmsMock,
    startOutboundCall: startOutboundCallMock,
    verifyWebhook: verifyWebhookMock,
    translateProviderEvent: translateProviderEventMock,
  })),
}));

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
});

const invokeRoute = async (input: {
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): Promise<{ status: number; body: unknown }> => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(input.headers || {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return new Promise((resolve, reject) => {
    let resolved = false;
    const req = {
      method: 'POST',
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
        return normalizedHeaders[name.toLowerCase()];
      },
      get(name: string): string | undefined {
        return normalizedHeaders[name.toLowerCase()];
      },
    } as any;

    const res = {
      locals: {},
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        resolved = true;
        resolve({
          status: this.statusCode,
          body: payload,
        });
        return this;
      },
      send(payload: unknown) {
        resolved = true;
        resolve({
          status: this.statusCode,
          body: payload,
        });
        return this;
      },
      setHeader() {
        return this;
      },
      getHeader() {
        return undefined;
      },
      end(payload?: unknown) {
        if (!resolved) {
          resolved = true;
          resolve({
            status: this.statusCode,
            body: payload,
          });
        }
        return this;
      },
    } as any;

    (connectShyftRouter as any).handle(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      if (!resolved) {
        resolve({
          status: res.statusCode,
          body: null,
        });
      }
    });
  });
};

describe('connectshyft outbound dispatch routes', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
    sendSmsMock.mockClear();
    startOutboundCallMock.mockClear();
    verifyWebhookMock.mockClear();
    translateProviderEventMock.mockClear();
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftProviderCorrelationStateForTests();
    resetConnectShyftOutboundDispatchReplayLedgerForTests();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags;
  });

  it('returns providerMessageId values and replays idempotent outbound SMS without a second adapter call', async () => {
    const headers = buildHeaders({
      'Idempotency-Key': 'idem-sms-1001',
    });
    const payload = {
      providerKey: 'telnyx',
      body: 'Need assistance',
      targetPhone: '+12605550111',
    };

    const firstResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers,
      body: payload,
    });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      data: {
        dispatch: {
          providerKey: 'telnyx',
          providerMessageId: 'telnyx-message-thread-f1-unclaimed-1001',
          providerLegId: null,
        },
        correlationMapping: {
          deterministic: true,
          messageMapping: 'created',
        },
        replaySafe: {
          duplicate: false,
        },
      },
    });

    const replayResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers,
      body: payload,
    });

    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      data: {
        dispatch: {
          providerKey: 'telnyx',
          providerMessageId: 'telnyx-message-thread-f1-unclaimed-1001',
        },
        replaySafe: {
          duplicate: true,
        },
      },
    });
    expect((replayResponse.body as any).data.canonicalEvent.eventId)
      .toBe((firstResponse.body as any).data.canonicalEvent.eventId);
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    expect(sendSmsMock).toHaveBeenCalledWith(expect.objectContaining({
      providerKey: 'telnyx',
      idempotencyKey: 'idem-sms-1001',
      body: 'Need assistance',
      targetPhone: '+12605550111',
    }));
  });

  it('returns providerLegId values for outbound calls without exposing bridge-session state', async () => {
    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        targetPhone: '+12605550111',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
      data: {
        dispatch: {
          providerKey: 'telnyx',
          providerLegId: 'telnyx-leg-thread-f1-unclaimed-1001',
          providerMessageId: null,
        },
        call: {
          transport: 'bridge',
          autoRetry: false,
          redialPolicy: 'manual_only',
        },
        replaySafe: {
          duplicate: false,
        },
      },
    });
    expect((response.body as any).data.bridgeSession).toBeUndefined();
    expect(startOutboundCallMock).toHaveBeenCalledTimes(1);
    expect(startOutboundCallMock).toHaveBeenCalledWith(expect.objectContaining({
      providerKey: 'telnyx',
      targetPhone: '+12605550111',
      callPolicy: {
        transport: 'bridge',
        autoRetry: false,
        redialPolicy: 'manual_only',
      },
    }));
  });
});
