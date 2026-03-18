import connectShyftRouter, {
  ensureConnectShyftDispatchReadySmsTargetForTests,
  resetConnectShyftOutboundDispatchReplayLedgerForTests,
  resolveConnectShyftSmsSenderForTests,
  resolveConnectShyftSmsTargetForTests,
} from '../connectshyft';
import { TelephonyProviderFailure } from '../../../../../../../domains/communication';
import { resetConnectShyftBridgeSessionStateForTests } from '../../../../modules/connectshyft/bridgeSessions';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import {
  connectShyftNeighborServiceAsync,
  type ConnectShyftNeighborPhone,
  type ConnectShyftResolveNeighborResult,
} from '../../../../modules/connectshyft/neighbors';
import {
  connectShyftNumberMappingServiceAsync,
  type ConnectShyftNumberMapping,
} from '../../../../modules/connectshyft/numberMappings';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import {
  connectShyftSmsPreferenceOverrideServiceAsync,
  type ConnectShyftResolvedSmsPreference,
} from '../../../../modules/connectshyft/smsPreferenceOverrides';
import type { ConnectShyftThread } from '../../../../modules/connectshyft/threads';

const toCanonicalEventType = (rawEventType: string): string => rawEventType
  .split(/[._-]+/)
  .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
  .join('');

const toProviderCorrelation = (payload: unknown) => {
  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};

  return {
    providerLegId: typeof source.providerLegId === 'string' ? source.providerLegId : null,
    providerMessageId: typeof source.providerMessageId === 'string' ? source.providerMessageId : null,
    providerEventId: typeof source.providerEventId === 'string' ? source.providerEventId : null,
    providerNumber: typeof source.providerNumber === 'string'
      ? source.providerNumber
      : (typeof source.to === 'string'
        ? source.to
        : (typeof source.to_number === 'string' ? source.to_number : null)),
  };
};

const sendSmsMock = jest.fn(async (command: {
  threadId: string;
  targetPhone?: string;
  senderPhone?: string;
  body?: string;
}) => ({
  providerKey: 'telnyx',
  channel: 'message' as const,
  providerLegId: null,
  providerMessageId: `provider-message-${command.threadId}`,
  providerRequestId: 'req-sms-1001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:00:00.000Z',
}));

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
}));
const startBridgeSessionMock = jest.fn(async (command: { bridgeSessionId: string }) => ({
  providerKey: 'telnyx',
  bridgeSessionId: command.bridgeSessionId,
  bridgeEstablished: true as const,
  providerRequestId: 'req-bridge-3001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:06:00.000Z',
}));

const verifyWebhookMock = jest.fn(() => ({ ok: true as const }));
const endCallMock = jest.fn(async (command: { providerLegId: string }) => ({
  providerKey: 'telnyx',
  providerLegId: command.providerLegId,
  ended: true as const,
  providerRequestId: 'req-end-call-4001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-11T12:07:00.000Z',
}));
const translateProviderEventMock = jest.fn(({ rawEventType, payload }: { rawEventType: string; payload: unknown }) => ({
  eventType: toCanonicalEventType(rawEventType),
  payload: (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>,
  correlation: toProviderCorrelation(payload),
  providerNeutral: true as const,
  providerSpecificFieldsStripped: true as const,
  providerBranchingInDomain: false as const,
}));

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

const buildResolvedNeighborPhone = (
  overrides: Partial<ConnectShyftNeighborPhone> & Pick<ConnectShyftNeighborPhone, 'phoneId' | 'value'>,
): ConnectShyftNeighborPhone => ({
  phoneId: overrides.phoneId,
  label: overrides.label ?? 'mobile',
  value: overrides.value,
  rawInput: overrides.rawInput ?? overrides.value,
  displayNational: overrides.displayNational ?? '(260) 555-0111',
  countryCode: overrides.countryCode ?? '1',
  nationalNumber: overrides.nationalNumber ?? '2605550111',
  extension: overrides.extension ?? null,
  validationStatus: overrides.validationStatus ?? 'valid',
  usageType: overrides.usageType ?? 'mobile',
  source: overrides.source ?? 'user_entered',
  sortOrder: overrides.sortOrder ?? 0,
  isPrimary: overrides.isPrimary ?? false,
  isShared: overrides.isShared ?? false,
  verificationStatus: overrides.verificationStatus ?? 'verified',
  isActive: overrides.isActive ?? true,
  createdAtUtc: overrides.createdAtUtc ?? '2026-03-11T12:00:00.000Z',
  updatedAtUtc: overrides.updatedAtUtc ?? '2026-03-11T12:00:00.000Z',
});

const buildResolvedNeighborResult = (
  phones: ConnectShyftNeighborPhone[],
): ConnectShyftResolveNeighborResult => ({
  ok: true,
  code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
  httpStatus: 200,
  data: {
    neighbor: {
      neighborId: 'neighbor-connectshyft-f1-1001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      firstName: 'Route',
      lastName: 'Fixture',
      prefersTexting: 'YES',
      phones,
      createdAtUtc: '2026-03-11T12:00:00.000Z',
      updatedAtUtc: '2026-03-11T12:00:00.000Z',
    },
  },
});

const buildResolvedSmsPreference = (
  overrides: Partial<ConnectShyftResolvedSmsPreference> = {},
): ConnectShyftResolvedSmsPreference => ({
  prefersTexting: 'YES',
  neighborId: 'neighbor-connectshyft-f1-1001',
  source: 'neighbor-record',
  ...overrides,
});

const buildNumberMapping = (
  overrides: Partial<ConnectShyftNumberMapping> & Pick<ConnectShyftNumberMapping, 'mappingId' | 'tenantId' | 'orgUnitId' | 'twilioNumberE164' | 'label'>,
): ConnectShyftNumberMapping => ({
  mappingId: overrides.mappingId,
  tenantId: overrides.tenantId,
  orgUnitId: overrides.orgUnitId,
  twilioNumberE164: overrides.twilioNumberE164,
  label: overrides.label,
  isActive: overrides.isActive ?? true,
  createdAtUtc: overrides.createdAtUtc ?? '2026-03-11T12:00:00.000Z',
  updatedAtUtc: overrides.updatedAtUtc ?? '2026-03-11T12:00:00.000Z',
});

const DEFAULT_SMS_SENDER_MAPPINGS: Record<string, ConnectShyftNumberMapping[]> = {
  'tenant-connectshyft-f1::org-connectshyft-f1-east': [
    buildNumberMapping({
      mappingId: 'mapping-f1-001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      twilioNumberE164: '+12605550191',
      label: 'Front Desk',
    }),
  ],
  'tenant-connectshyft-f2::org-connectshyft-f2-east': [
    buildNumberMapping({
      mappingId: 'mapping-f2-001',
      tenantId: 'tenant-connectshyft-f2',
      orgUnitId: 'org-connectshyft-f2-east',
      twilioNumberE164: '+12605550192',
      label: 'Overflow',
    }),
  ],
};

const buildSmsTargetThread = (overrides: Partial<ConnectShyftThread> = {}): ConnectShyftThread => ({
  threadId: overrides.threadId ?? '11111111-1111-4111-8111-111111111111',
  tenantId: overrides.tenantId ?? 'tenant-connectshyft-f1',
  orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-f1-east',
  neighborId: overrides.neighborId ?? '22222222-2222-4222-8222-222222222222',
  source: overrides.source ?? 'VOICE',
  state: overrides.state ?? 'UNCLAIMED',
  lastInboundCsNumberId: overrides.lastInboundCsNumberId ?? 'cs-number-f1-401',
  preferredOutboundCsNumberId: overrides.preferredOutboundCsNumberId ?? 'cs-number-f1-501',
  escalation: overrides.escalation ?? {
    stage: 0,
    nextEvaluationAtUtc: '2026-03-11T12:00:00.000Z',
  },
  claimedByUserId: overrides.claimedByUserId ?? null,
  claimedAtUtc: overrides.claimedAtUtc ?? null,
  closedByUserId: overrides.closedByUserId ?? null,
  closedAtUtc: overrides.closedAtUtc ?? null,
  createdAtUtc: overrides.createdAtUtc ?? '2026-03-11T12:00:00.000Z',
  updatedAtUtc: overrides.updatedAtUtc ?? '2026-03-11T12:00:00.000Z',
});

describe('connectshyft outbound dispatch routes', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    sendSmsMock.mockClear();
    startOutboundCallMock.mockClear();
    verifyWebhookMock.mockClear();
    translateProviderEventMock.mockClear();
    startBridgeSessionMock.mockClear();
    endCallMock.mockClear();
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftBridgeSessionStateForTests();
    resetConnectShyftProviderCorrelationStateForTests();
    resetConnectShyftOutboundDispatchReplayLedgerForTests();
    jest.spyOn(connectShyftNumberMappingServiceAsync, 'listMappings').mockImplementation(
      async (tenantId: string, orgUnitId: string) => DEFAULT_SMS_SENDER_MAPPINGS[`${tenantId}::${orgUnitId}`] || [],
    );
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
          providerMessageId: 'provider-message-thread-f1-unclaimed-1001',
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
          providerMessageId: 'provider-message-thread-f1-unclaimed-1001',
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
      senderPhone: '+12605550191',
    }));
  });

  it('prefers an explicit outbound request target over neighbor-record phones for SMS dispatch', async () => {
    const resolveNeighborSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'resolveNeighbor');
    jest.spyOn(connectShyftSmsPreferenceOverrideServiceAsync, 'resolvePreference').mockResolvedValue(
      buildResolvedSmsPreference(),
    );

    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550999',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
    });
    expect(resolveNeighborSpy).not.toHaveBeenCalled();
    expect(sendSmsMock).toHaveBeenCalledWith(expect.objectContaining({
      targetPhone: '+12605550999',
      senderPhone: '+12605550191',
    }));
  });

  it('dispatches composer-origin SMS without request targetPhone by resolving the target server-side', async () => {
    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders({
        'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
      }),
      body: {
        body: 'Need assistance',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
    });
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    const command = sendSmsMock.mock.calls[0]?.[0] as {
      targetPhone?: string;
      senderPhone?: string;
      body?: string;
      providerKey?: string;
    } | undefined;
    expect(command).toEqual(expect.objectContaining({
      providerKey: 'telnyx',
      body: 'Need assistance',
      senderPhone: '+12605550191',
    }));
    expect(command?.targetPhone).toMatch(/^\+\d{11,15}$/);
  });

  it('dispatches outbound SMS from different orgUnit-specific sender numbers', async () => {
    const f1Response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550111',
      },
    });

    const f2Response = await invokeRoute({
      url: '/threads/thread-f2-unclaimed-1001/messages',
      headers: buildHeaders({
        'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
        'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
        'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
        'x-test-connectshyft-user-id': 'user-connectshyft-f2-primary-operator',
      }),
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550112',
      },
    });

    expect(f1Response.status).toBe(200);
    expect(f2Response.status).toBe(200);
    expect(sendSmsMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      threadId: 'thread-f1-unclaimed-1001',
      targetPhone: '+12605550111',
      senderPhone: '+12605550191',
    }));
    expect(sendSmsMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      threadId: 'thread-f2-unclaimed-1001',
      targetPhone: '+12605550112',
      senderPhone: '+12605550192',
    }));
  });

  it('selects the primary active valid neighbor phone when no explicit SMS target is provided', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'resolveNeighbor').mockResolvedValue(
      buildResolvedNeighborResult([
        buildResolvedNeighborPhone({
          phoneId: 'phone-primary',
          value: '+12605550141',
          isPrimary: true,
          sortOrder: 0,
        }),
        buildResolvedNeighborPhone({
          phoneId: 'phone-secondary',
          value: '+12605550142',
          isPrimary: false,
          sortOrder: 1,
        }),
      ]),
    );

    const response = await resolveConnectShyftSmsTargetForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '33333333-3333-4333-8333-333333333333',
      thread: buildSmsTargetThread(),
      actorRoles: ['ORGUNIT_MEMBER'],
      requestedTargetPhone: null,
      allowTestFallback: false,
    });

    expect(response).toMatchObject({
      ok: true,
      source: 'primary_active_valid_phone',
      targetPhone: '+12605550141',
    });
  });

  it('selects the only active valid neighbor phone when the primary phone is not SMS eligible', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'resolveNeighbor').mockResolvedValue(
      buildResolvedNeighborResult([
        buildResolvedNeighborPhone({
          phoneId: 'phone-invalid-primary',
          value: '+12605550143',
          isPrimary: true,
          validationStatus: 'invalid',
          sortOrder: 0,
        }),
        buildResolvedNeighborPhone({
          phoneId: 'phone-only-valid',
          value: '+12605550144',
          isPrimary: false,
          sortOrder: 1,
        }),
      ]),
    );

    const response = await resolveConnectShyftSmsTargetForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '44444444-4444-4444-8444-444444444444',
      thread: buildSmsTargetThread({
        neighborId: '55555555-5555-4555-8555-555555555555',
      }),
      actorRoles: ['ORGUNIT_MEMBER'],
      requestedTargetPhone: null,
      allowTestFallback: false,
    });

    expect(response).toMatchObject({
      ok: true,
      source: 'only_active_valid_phone',
      targetPhone: '+12605550144',
    });
  });

  it('refuses ambiguous SMS target resolution before provider dispatch', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'resolveNeighbor').mockResolvedValue(
      buildResolvedNeighborResult([
        buildResolvedNeighborPhone({
          phoneId: 'phone-a',
          value: '+12605550145',
          isPrimary: false,
          sortOrder: 0,
        }),
        buildResolvedNeighborPhone({
          phoneId: 'phone-b',
          value: '+12605550146',
          isPrimary: false,
          sortOrder: 1,
        }),
      ]),
    );

    const response = await resolveConnectShyftSmsTargetForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '66666666-6666-4666-8666-666666666666',
      thread: buildSmsTargetThread({
        neighborId: '77777777-7777-4777-8777-777777777777',
      }),
      actorRoles: ['ORGUNIT_MEMBER'],
      requestedTargetPhone: null,
      allowTestFallback: false,
    });

    expect(response).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS',
      data: {
        targetResolution: {
          reason: 'ambiguous_target',
          source: 'neighbor_record',
          candidateCount: 2,
          candidatePhones: ['+12605550145', '+12605550146'],
        },
      },
    });
  });

  it('refuses outbound SMS when no active valid neighbor phone exists', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'resolveNeighbor').mockResolvedValue(
      buildResolvedNeighborResult([
        buildResolvedNeighborPhone({
          phoneId: 'phone-inactive',
          value: '+12605550147',
          isPrimary: true,
          isActive: false,
          sortOrder: 0,
        }),
        buildResolvedNeighborPhone({
          phoneId: 'phone-needs-review',
          value: '+12605550148',
          isPrimary: false,
          validationStatus: 'needs_review',
          sortOrder: 1,
        }),
      ]),
    );

    const response = await resolveConnectShyftSmsTargetForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '88888888-8888-4888-8888-888888888888',
      thread: buildSmsTargetThread({
        neighborId: '99999999-9999-4999-8999-999999999999',
      }),
      actorRoles: ['ORGUNIT_MEMBER'],
      requestedTargetPhone: null,
      allowTestFallback: false,
    });

    expect(response).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
      data: {
        targetResolution: {
          reason: 'missing_target',
          source: 'neighbor_record',
          candidateCount: 0,
        },
      },
    });
  });

  it('resolves outbound SMS sender from the single active orgUnit mapping', async () => {
    const response = await resolveConnectShyftSmsSenderForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      thread: buildSmsTargetThread(),
      preferredOutboundLabel: 'Front Desk',
    });

    expect(response).toMatchObject({
      ok: true,
      senderPhone: '+12605550191',
      source: 'single_active_org_unit_mapping',
    });
  });

  it('refuses outbound SMS sender resolution when no active orgUnit mapping exists', async () => {
    const listMappingsMock = connectShyftNumberMappingServiceAsync.listMappings as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.listMappings
    >;
    listMappingsMock.mockResolvedValueOnce([]);

    const response = await resolveConnectShyftSmsSenderForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      thread: buildSmsTargetThread(),
      preferredOutboundLabel: 'Front Desk',
    });

    expect(response).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
      data: {
        senderResolution: {
          reason: 'missing_sender',
          source: 'org_unit_number_mapping',
          orgUnitId: 'org-connectshyft-f1-east',
          activeMappingCount: 0,
        },
      },
    });
  });

  it('refuses outbound SMS sender resolution when multiple active orgUnit mappings exist', async () => {
    const listMappingsMock = connectShyftNumberMappingServiceAsync.listMappings as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.listMappings
    >;
    listMappingsMock.mockResolvedValueOnce([
      buildNumberMapping({
        mappingId: 'mapping-f1-a',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        twilioNumberE164: '+12605550191',
        label: 'Front Desk',
      }),
      buildNumberMapping({
        mappingId: 'mapping-f1-b',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        twilioNumberE164: '+12605550193',
        label: 'Overflow',
      }),
    ]);

    const response = await resolveConnectShyftSmsSenderForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      thread: buildSmsTargetThread(),
      preferredOutboundLabel: 'Front Desk',
    });

    expect(response).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS',
      data: {
        senderResolution: {
          reason: 'ambiguous_sender',
          source: 'org_unit_number_mapping',
          orgUnitId: 'org-connectshyft-f1-east',
          activeMappingCount: 2,
        },
      },
    });
  });

  it('refuses non-dispatchable SMS targets at the exported dispatch-ready helper boundary', () => {
    expect(ensureConnectShyftDispatchReadySmsTargetForTests({
      resolvedTargetPhone: '   ',
      requestedTargetPhone: null,
      threadNeighborId: '22222222-2222-4222-8222-222222222222',
    })).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
      data: {
        targetResolution: {
          reason: 'missing_target',
          source: 'neighbor_record',
          neighborId: '22222222-2222-4222-8222-222222222222',
        },
      },
    });
  });

  it('refuses outbound SMS before provider dispatch when the route does not hold a dispatch-ready target', async () => {
    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        body: 'Need assistance',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
      data: {
        targetResolution: {
          reason: 'missing_target',
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('refuses outbound SMS before provider dispatch when no active sender mapping exists', async () => {
    const listMappingsMock = connectShyftNumberMappingServiceAsync.listMappings as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.listMappings
    >;
    listMappingsMock.mockResolvedValueOnce([]);

    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550111',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
      data: {
        senderResolution: {
          reason: 'missing_sender',
          source: 'org_unit_number_mapping',
          activeMappingCount: 0,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('refuses outbound SMS before provider dispatch when sender mappings are ambiguous', async () => {
    const listMappingsMock = connectShyftNumberMappingServiceAsync.listMappings as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.listMappings
    >;
    listMappingsMock.mockResolvedValueOnce([
      buildNumberMapping({
        mappingId: 'mapping-f1-a',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        twilioNumberE164: '+12605550191',
        label: 'Front Desk',
      }),
      buildNumberMapping({
        mappingId: 'mapping-f1-b',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        twilioNumberE164: '+12605550193',
        label: 'Overflow',
      }),
    ]);

    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550111',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS',
      data: {
        senderResolution: {
          reason: 'ambiguous_sender',
          source: 'org_unit_number_mapping',
          activeMappingCount: 2,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('keeps canonical texting preference gating ahead of SMS target dispatch behavior', async () => {
    jest.spyOn(connectShyftSmsPreferenceOverrideServiceAsync, 'resolvePreference').mockResolvedValue(
      buildResolvedSmsPreference({
        prefersTexting: 'NO',
      }),
    );

    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550149',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
      data: {
        preferencePolicy: {
          prefersTexting: 'NO',
          source: 'neighbor-record',
          overrideRequired: true,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('starts a persisted bridge session for outbound calls and returns bridge-session state', async () => {
    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
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
          providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
          providerMessageId: null,
        },
        call: {
          transport: 'bridge',
          autoRetry: false,
          redialPolicy: 'manual_only',
        },
        bridgeSession: {
          status: 'operator_dialing',
          operatorLeg: {
            status: 'ringing',
          },
          neighborLeg: {
            status: 'created',
          },
        },
        correlationMapping: {
          deterministic: true,
          operatorLegMapping: 'created',
          neighborLegMapping: 'ignored',
        },
        replaySafe: {
          duplicate: false,
        },
      },
    });
    expect((response.body as any).data.bridgeSession.bridgeSessionId).toBeTruthy();
    expect(startOutboundCallMock).toHaveBeenCalledTimes(1);
    expect(startOutboundCallMock).toHaveBeenCalledWith(expect.objectContaining({
      providerKey: 'telnyx',
      targetPhone: '+12605550155',
      callPolicy: {
        transport: 'bridge',
        autoRetry: false,
        redialPolicy: 'manual_only',
      },
    }));
  });

  it('rejects conflicting reuse of the same idempotency key for a materially different payload', async () => {
    const headers = buildHeaders({
      'Idempotency-Key': 'idem-sms-conflict-1001',
    });

    const firstResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers,
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance',
        targetPhone: '+12605550111',
      },
    });

    expect(firstResponse.status).toBe(200);
    expect((firstResponse.body as any).ok).toBe(true);

    const conflictResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers,
      body: {
        providerKey: 'telnyx',
        body: 'Different message body',
        targetPhone: '+12605550111',
      },
    });

    expect(conflictResponse.status).toBe(200);
    expect(conflictResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
    });
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
  });

  it('refuses outbound bridge calls when no operator callback number is provided', async () => {
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
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_REQUIRED',
    });
    expect(startOutboundCallMock).not.toHaveBeenCalled();
  });

  it('surfaces normalized provider failure classification only after a valid resolved target reaches provider dispatch', async () => {
    sendSmsMock.mockRejectedValueOnce(new TelephonyProviderFailure({
      message: 'Rate limited by provider',
      classification: {
        providerKey: 'telnyx',
        category: 'temporary_provider_failure',
        retryable: true,
        httpStatus: 429,
        providerCode: 'rate_limited',
      },
    }));

    const response = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders({
        'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
      }),
      body: {
        body: 'Need assistance',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_PROVIDER_DISPATCH_FAILED',
      data: {
        providerFailureClassification: {
          providerKey: 'telnyx',
          category: 'temporary_provider_failure',
          retryable: true,
          httpStatus: 429,
          providerCode: 'rate_limited',
        },
      },
    });
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    expect(sendSmsMock).toHaveBeenCalledWith(expect.objectContaining({
      body: 'Need assistance',
      targetPhone: expect.stringMatching(/^\+\d{11,15}$/),
      senderPhone: '+12605550191',
    }));
  });
});
