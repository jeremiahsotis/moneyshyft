import connectShyftRouter, {
  ensureConnectShyftDispatchReadySmsTargetForTests,
  resetConnectShyftOutboundDispatchReplayLedgerForTests,
  resolveConnectShyftSmsSenderForTests,
} from '../connectshyft';
import { TelephonyProviderFailure } from '../../../../../../../domains/communication';
import {
  listConnectShyftCommunicationAuditEntriesForTests,
  resetConnectShyftCommunicationAuditLogForTests,
} from '../../../../modules/connectshyft/communicationAuditLog';
import {
  findConnectShyftBridgeSessionByProviderCallControlIdAsync,
  resetConnectShyftBridgeSessionStateForTests,
} from '../../../../modules/connectshyft/bridgeSessions';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import {
  connectShyftNumberMappingServiceAsync,
  type ConnectShyftNumberMapping,
} from '../../../../modules/connectshyft/numberMappings';
import * as OperatorDestinationResolverModule from '../../../../modules/connectshyft/operatorDestinationResolver';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import {
  buildResolveThreadSmsTarget,
} from '../../../../modules/connectshyft/threadSmsTargetResolver';
import * as ThreadSmsTargetResolverModule from '../../../../modules/connectshyft/threadSmsTargetResolver';
import * as TelephonyReadinessModule from '../../../../modules/connectshyft/telephonyReadiness';
import type { ConnectShyftTelephonyReadiness } from '../../../../modules/connectshyft/telephonyReadiness';
import {
  connectShyftSmsPreferenceOverrideServiceAsync,
  type ConnectShyftResolvedSmsPreference,
} from '../../../../modules/connectshyft/smsPreferenceOverrides';
import { resetConnectShyftCommunicationReliabilityStateForTests } from '../../../../modules/connectshyft/communicationReliability';
import type { ConnectShyftThread } from '../../../../modules/connectshyft/threads';

jest.mock('../../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const loggerModule = jest.requireMock('../../../../utils/logger') as {
  default: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
};

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

const resolveRoutingMappingByNumberFromState = (input: {
  tenantId: string | null;
  twilioNumberE164: string;
}) => {
  const tenantId = typeof input.tenantId === 'string' ? input.tenantId : null;
  const scopedMappings = Object.values(DEFAULT_SMS_SENDER_MAPPINGS)
    .flat()
    .filter((mapping) => mapping.isActive && mapping.twilioNumberE164 === input.twilioNumberE164)
    .filter((mapping) => tenantId ? mapping.tenantId === tenantId : true);

  if (scopedMappings.length === 1) {
    return {
      status: 'found' as const,
      mapping: { ...scopedMappings[0] },
    };
  }

  if (scopedMappings.length > 1) {
    return {
      status: 'ambiguous' as const,
      mappings: scopedMappings.map((mapping) => ({ ...mapping })),
    };
  }

  return {
    status: 'not-found' as const,
  };
};

const buildSmsTargetThread = (overrides: Partial<ConnectShyftThread> = {}): ConnectShyftThread => ({
  threadId: overrides.threadId ?? '11111111-1111-4111-8111-111111111111',
  tenantId: overrides.tenantId ?? 'tenant-connectshyft-f1',
  orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-f1-east',
  neighborId: overrides.neighborId ?? '22222222-2222-4222-8222-222222222222',
  personId: overrides.personId ?? '33333333-3333-4333-8333-333333333333',
  activityId: overrides.activityId ?? null,
  source: overrides.source ?? 'VOICE',
  state: overrides.state ?? 'UNCLAIMED',
  lastInboundCsNumberId: overrides.lastInboundCsNumberId ?? '+12605550191',
  preferredOutboundCsNumberId: overrides.preferredOutboundCsNumberId ?? '+12605550191',
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

const buildPeopleCoreContactPoint = (overrides: Record<string, unknown> = {}) => ({
  id: 'contact-point-connectshyft-f1-1001',
  tenantId: 'tenant-connectshyft-f1',
  type: 'phone',
  normalizedValue: '+12605550111',
  rawValue: '(260) 555-0111',
  status: 'active_personal',
  firstSeenAt: '2026-03-11T12:00:00.000Z',
  lastSeenAt: '2026-03-11T12:00:00.000Z',
  suspectedShared: false,
  confirmedShared: false,
  reassignmentSuspected: false,
  createdAt: '2026-03-11T12:00:00.000Z',
  updatedAt: '2026-03-11T12:00:00.000Z',
  ...overrides,
});

const buildPeopleCoreContactPointLink = (overrides: Record<string, unknown> = {}) => ({
  id: 'contact-point-link-connectshyft-f1-1001',
  contactPointId: 'contact-point-connectshyft-f1-1001',
  subjectType: 'person',
  subjectId: '33333333-3333-4333-8333-333333333333',
  linkType: 'primary',
  confidenceBand: 'high',
  isCurrent: true,
  isPrimary: true,
  manuallyConfirmed: false,
  firstLinkedAt: '2026-03-11T12:00:00.000Z',
  linkedBy: 'system',
  createdAt: '2026-03-11T12:00:00.000Z',
  updatedAt: '2026-03-11T12:00:00.000Z',
  ...overrides,
});

const buildDispatchReadyTelephonyReadiness = (
  overrides: Partial<ConnectShyftTelephonyReadiness> = {},
): ConnectShyftTelephonyReadiness => ({
  providerReady: true,
  providerSelectionPathActive: true,
  webhookSignatureConfigured: true,
  orgUnitNumberMappingReady: true,
  voiceSupported: true,
  callbackNumberConfigured: true,
  callbackNumberNormalized: true,
  voiceReady: true,
  bridgeCallRunnable: true,
  smsReady: true,
  messageDispatchRunnable: true,
  provider: {
    requestedProvider: 'telnyx',
    resolvedProvider: 'telnyx',
    deterministic: true,
    adapterInterfaceVersion: 'v1',
  },
  orgUnitNumberMappings: {
    activeCount: 1,
    mappings: [
      {
        mappingId: 'mapping-f1-001',
        twilioNumberE164: '+12605550191',
        label: 'Front Desk',
      },
    ],
  },
  callbackNumber: {
    value: '+12605550155',
    rawInput: '(260) 555-0155',
    createdAtUtc: '2026-03-22T12:00:00.000Z',
    updatedAtUtc: '2026-03-22T12:00:00.000Z',
    persistenceAvailable: true,
  },
  operatorPhoneSource: 'callback_number',
  degradedMode: false,
  blockingReasons: [],
  nextActions: [],
  ...overrides,
});

describe('connectshyft outbound dispatch routes', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  let inspectReadinessSpy: jest.SpyInstance;
  let resolveOperatorDestinationSpy: jest.SpyInstance;
  let resolveThreadSmsTargetSpy: jest.SpyInstance;

  const setDispatchReadyTelephony = (
    overrides: Partial<ConnectShyftTelephonyReadiness> = {},
  ): void => {
    inspectReadinessSpy.mockResolvedValue(buildDispatchReadyTelephonyReadiness(overrides));
  };

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    loggerModule.default.info.mockReset();
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
    resetConnectShyftCommunicationAuditLogForTests();
    resetConnectShyftCommunicationReliabilityStateForTests();
    inspectReadinessSpy = jest.spyOn(
      TelephonyReadinessModule.connectShyftTelephonyReadinessServiceAsync,
      'inspectReadiness',
    );
    setDispatchReadyTelephony();
    resolveOperatorDestinationSpy = jest.spyOn(
      OperatorDestinationResolverModule,
      'resolveOperatorDestination',
    ).mockResolvedValue({
      phoneNumber: '+12605550155',
      source: 'actor_user',
      userId: 'user-connectshyft-f1-primary-operator',
      orgUnitId: 'org-connectshyft-f1-east',
    });
    resolveThreadSmsTargetSpy = jest.spyOn(
      ThreadSmsTargetResolverModule,
      'resolveThreadSmsTarget',
    ).mockImplementation(async (input) => ({
      ok: true,
      contactPointId: `contact-point-${input.personId}`,
      normalizedValue: input.threadId.includes('thread-f2')
        ? '+12605550112'
        : '+12605550111',
    }));
    jest.spyOn(connectShyftNumberMappingServiceAsync, 'resolveRoutingMappingByNumber').mockImplementation(
      async (input) => resolveRoutingMappingByNumberFromState(input),
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

  it('ignores an explicit outbound request target and dispatches SMS to the PeopleCore contact point', async () => {
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
    expect(resolveThreadSmsTargetSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      personId: 'person-connectshyft-f1-1001',
    }));
    expect(sendSmsMock).toHaveBeenCalledWith(expect.objectContaining({
      targetPhone: '+12605550111',
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

  it('resolves outbound SMS from the single current PeopleCore contact point', async () => {
    const resolveThreadSmsTarget = buildResolveThreadSmsTarget({
      listContactPointLinks: jest.fn(async () => [
        buildPeopleCoreContactPointLink(),
      ]),
      getContactPoint: jest.fn(async () => buildPeopleCoreContactPoint({
        id: 'contact-point-connectshyft-f1-1041',
        normalizedValue: '+12605550141',
      })),
    } as any);

    const response = await resolveThreadSmsTarget({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '33333333-3333-4333-8333-333333333333',
      personId: '33333333-3333-4333-8333-333333333333',
    });

    expect(response).toEqual({
      ok: true,
      contactPointId: 'contact-point-connectshyft-f1-1041',
      normalizedValue: '+12605550141',
    });
  });

  it('refuses ambiguous PeopleCore SMS target resolution before provider dispatch', async () => {
    const resolveThreadSmsTarget = buildResolveThreadSmsTarget({
      listContactPointLinks: jest.fn(async () => [
        buildPeopleCoreContactPointLink({
          contactPointId: 'contact-point-connectshyft-f1-1045',
        }),
        buildPeopleCoreContactPointLink({
          id: 'contact-point-link-connectshyft-f1-1046',
          contactPointId: 'contact-point-connectshyft-f1-1046',
          linkType: 'secondary',
          isPrimary: false,
        }),
      ]),
      getContactPoint: jest.fn(async ({ contactPointId }: { contactPointId: string }) => {
        if (contactPointId === 'contact-point-connectshyft-f1-1045') {
          return buildPeopleCoreContactPoint({
            id: contactPointId,
            normalizedValue: '+12605550145',
          });
        }

        return buildPeopleCoreContactPoint({
          id: contactPointId,
          normalizedValue: '+12605550146',
        });
      }),
    } as any);

    const response = await resolveThreadSmsTarget({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '66666666-6666-4666-8666-666666666666',
      personId: '33333333-3333-4333-8333-333333333333',
    });

    expect(response).toEqual({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS',
      message: 'This conversation needs one clear textable contact before sending a text.',
      reason: 'ambiguous_target',
    });
  });

  it('refuses outbound SMS when PeopleCore has no current textable contact point', async () => {
    const resolveThreadSmsTarget = buildResolveThreadSmsTarget({
      listContactPointLinks: jest.fn(async () => [
        buildPeopleCoreContactPointLink(),
      ]),
      getContactPoint: jest.fn(async () => buildPeopleCoreContactPoint({
        status: 'archived',
      })),
    } as any);

    const response = await resolveThreadSmsTarget({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '88888888-8888-4888-8888-888888888888',
      personId: '33333333-3333-4333-8333-333333333333',
    });

    expect(response).toEqual({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_INVALID',
      message: 'This conversation cannot send a text until the saved contact can receive texts.',
      reason: 'invalid_target',
    });
  });

  it('refuses outbound SMS when PeopleCore has no current contact point for the thread person', async () => {
    const resolveThreadSmsTarget = buildResolveThreadSmsTarget({
      listContactPointLinks: jest.fn(async () => []),
      getContactPoint: jest.fn(),
    } as any);

    const response = await resolveThreadSmsTarget({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: '99999999-9999-4999-8999-999999999999',
      personId: '33333333-3333-4333-8333-333333333333',
    });

    expect(response).toEqual({
      ok: false,
      code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
      message: 'This conversation cannot send a text until a textable contact is ready.',
      reason: 'missing_target',
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
      source: 'thread_alignment',
    });
  });

  it('reuses the same mapped sender metadata across repeated outbound SMS dispatches on one thread', async () => {
    const firstResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        body: 'Need assistance now',
        targetPhone: '+12605550111',
      },
    });
    const secondResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/messages',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        body: 'Checking back in',
        targetPhone: '+12605550111',
      },
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      data: {
        senderResolution: {
          source: 'thread_alignment',
          channel: 'sms',
          senderPhone: '+12605550191',
          selectedMappingId: 'mapping-f1-001',
          selectedMappingLabel: 'Front Desk',
          alignedFrom: 'preferred_outbound',
        },
      },
    });
    expect(secondResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      data: {
        senderResolution: {
          source: 'thread_alignment',
          channel: 'sms',
          senderPhone: '+12605550191',
          selectedMappingId: 'mapping-f1-001',
          selectedMappingLabel: 'Front Desk',
          alignedFrom: 'preferred_outbound',
        },
      },
    });
    expect(sendSmsMock).toHaveBeenCalledTimes(2);
    expect(sendSmsMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      threadId: 'thread-f1-unclaimed-1001',
      senderPhone: '+12605550191',
    }));
    expect(sendSmsMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      threadId: 'thread-f1-unclaimed-1001',
      senderPhone: '+12605550191',
    }));

    const auditEntries = listConnectShyftCommunicationAuditEntriesForTests()
      .filter((entry) => entry.resultState === 'succeeded' && entry.channel === 'sms');
    expect(auditEntries).toHaveLength(2);
    expect(JSON.parse(auditEntries[0].metadataJson || '{}')).toMatchObject({
      senderResolution: {
        source: 'thread_alignment',
        channel: 'sms',
        senderPhone: '+12605550191',
        selectedMappingId: 'mapping-f1-001',
        selectedMappingLabel: 'Front Desk',
        alignedFrom: 'preferred_outbound',
      },
    });
    expect(JSON.parse(auditEntries[1].metadataJson || '{}')).toMatchObject({
      senderResolution: {
        source: 'thread_alignment',
        channel: 'sms',
        senderPhone: '+12605550191',
        selectedMappingId: 'mapping-f1-001',
        selectedMappingLabel: 'Front Desk',
        alignedFrom: 'preferred_outbound',
      },
    });
  });

  it('refuses outbound SMS sender resolution when no active orgUnit mapping exists', async () => {
    const routingMappingMock = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >;
    routingMappingMock.mockResolvedValueOnce({ status: 'not-found' });

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
          reason: 'invalid_sender_alignment',
          source: 'thread_alignment',
          orgUnitId: 'org-connectshyft-f1-east',
          activeMappingCount: 0,
        },
      },
    });
  });

  it('refuses sender resolution when a thread-aligned provider number was reassigned away from the thread', async () => {
    const routingMappingMock = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >;
    routingMappingMock.mockResolvedValueOnce({ status: 'not-found' });

    const response = await resolveConnectShyftSmsSenderForTests({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      thread: buildSmsTargetThread({
        lastInboundCsNumberId: '+12605550199',
        preferredOutboundCsNumberId: '+12605550199',
      }),
      preferredOutboundLabel: 'Front Desk',
    });

    expect(response).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
      data: {
        senderResolution: {
          reason: 'invalid_sender_alignment',
          source: 'thread_alignment',
          activeMappingCount: 0,
          threadHints: {
            lastInboundCsNumberId: '+12605550199',
            preferredOutboundCsNumberId: '+12605550199',
          },
        },
      },
    });
  });

  it('refuses sender resolution when the aligned provider number now belongs to a different orgUnit', async () => {
    const routingMappingMock = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >;
    routingMappingMock.mockResolvedValueOnce({
      status: 'found',
      mapping: buildNumberMapping({
        mappingId: 'mapping-f1-west-001',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-west',
        twilioNumberE164: '+12605550191',
        label: 'West Dispatch',
      }),
    });

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
          reason: 'invalid_sender_alignment',
          source: 'thread_alignment',
          activeMappingCount: 1,
        },
      },
    });
  });

  it('refuses outbound SMS sender resolution when multiple active orgUnit mappings exist', async () => {
    const routingMappingMock = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >;
    routingMappingMock.mockResolvedValueOnce({
      status: 'ambiguous',
      mappings: [
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
          twilioNumberE164: '+12605550191',
          label: 'Overflow',
        }),
      ],
    });

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
          source: 'thread_alignment',
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

  it('returns CONNECTSHYFT_SMS_NOT_READY before route-level target validation when telephony readiness blocks outbound SMS', async () => {
    inspectReadinessSpy.mockResolvedValueOnce(buildDispatchReadyTelephonyReadiness({
      orgUnitNumberMappingReady: false,
      smsReady: false,
      messageDispatchRunnable: false,
      blockingReasons: [
        {
          code: 'CONNECTSHYFT_TELEPHONY_NUMBER_MAPPING_REQUIRED',
          category: 'number_mapping',
          message: 'Voice routing requires at least one active ConnectShyft number mapping for this orgUnit.',
          blocking: true,
          channel: 'both',
        },
      ],
      nextActions: [
        {
          code: 'ADD_CONNECTSHYFT_NUMBER_MAPPING',
          message: 'Assign at least one active ConnectShyft number mapping to this orgUnit before retrying outbound telephony.',
        },
      ],
    }));

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
      code: 'CONNECTSHYFT_SMS_NOT_READY',
      data: {
        telephonyReadiness: {
          smsReady: false,
          messageDispatchRunnable: false,
          blockingReasons: [
            expect.objectContaining({
              code: 'CONNECTSHYFT_TELEPHONY_NUMBER_MAPPING_REQUIRED',
            }),
          ],
        },
        sideEffects: {
          messageDispatched: false,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('returns CONNECTSHYFT_SMS_NOT_READY before route-level sender-required validation when telephony readiness blocks outbound SMS', async () => {
    const routingMappingMock = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >;
    routingMappingMock.mockResolvedValueOnce({ status: 'not-found' });
    inspectReadinessSpy.mockResolvedValueOnce(buildDispatchReadyTelephonyReadiness({
      webhookSignatureConfigured: false,
      smsReady: false,
      messageDispatchRunnable: false,
      blockingReasons: [
        {
          code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED',
          category: 'provider',
          message: 'Webhook signature verification must be configured before outbound telephony can be dispatched.',
          blocking: true,
          channel: 'both',
        },
      ],
      nextActions: [
        {
          code: 'CONFIGURE_CONNECTSHYFT_WEBHOOK_SIGNATURE',
          message: 'Configure webhook signature verification for the active telephony provider.',
        },
      ],
    }));

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
      code: 'CONNECTSHYFT_SMS_NOT_READY',
      data: {
        telephonyReadiness: {
          webhookSignatureConfigured: false,
          smsReady: false,
          blockingReasons: [
            expect.objectContaining({
              code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED',
            }),
          ],
        },
        sideEffects: {
          messageDispatched: false,
        },
      },
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('returns CONNECTSHYFT_SMS_NOT_READY before route-level sender-ambiguity validation when telephony readiness blocks outbound SMS', async () => {
    const routingMappingMock = connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber as jest.MockedFunction<
      typeof connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber
    >;
    routingMappingMock.mockResolvedValueOnce({
      status: 'ambiguous',
      mappings: [
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
          twilioNumberE164: '+12605550191',
          label: 'Overflow',
        }),
      ],
    });
    inspectReadinessSpy.mockResolvedValueOnce(buildDispatchReadyTelephonyReadiness({
      callbackNumberConfigured: false,
      callbackNumberNormalized: false,
      smsReady: false,
      messageDispatchRunnable: false,
      callbackNumber: {
        value: null,
        rawInput: null,
        createdAtUtc: null,
        updatedAtUtc: null,
        persistenceAvailable: true,
      },
      operatorPhoneSource: 'none',
      blockingReasons: [
        {
          code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
          category: 'callback_number',
          message: 'Voice forwarding requires an operator callback number.',
          blocking: true,
          channel: 'both',
        },
      ],
      nextActions: [
        {
          code: 'SET_OPERATOR_CALLBACK_NUMBER',
          message: 'Save a callback / forwarding number for the current operator.',
        },
      ],
    }));

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
      code: 'CONNECTSHYFT_SMS_NOT_READY',
      data: {
        telephonyReadiness: {
          callbackNumberConfigured: false,
          smsReady: false,
          blockingReasons: [
            expect.objectContaining({
              code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
            }),
          ],
        },
        sideEffects: {
          messageDispatched: false,
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
        senderResolution: {
          source: 'thread_alignment',
          channel: 'voice',
          senderPhone: '+12605550191',
        },
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
    expect(resolveOperatorDestinationSpy).toHaveBeenCalledWith({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-f1-primary-operator',
      claimedByUserId: null,
    });
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
    expect(loggerModule.default.info).toHaveBeenCalledWith(
      'ConnectShyft telephony runtime outcome',
      expect.objectContaining({
        threadId: 'thread-f1-unclaimed-1001',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        actorUserId: 'user-connectshyft-f1-primary-operator',
        claimedByUserId: null,
        senderNumber: '+12605550191',
        operatorDestinationSource: 'actor_user',
        operatorDestinationResolved: true,
        outcome: 'bridged',
      }),
    );

    const persistedBridgeSession = await findConnectShyftBridgeSessionByProviderCallControlIdAsync({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      providerCallControlId: 'provider-leg-operator-thread-f1-unclaimed-1001',
    });
    expect(persistedBridgeSession?.session.id).toBe((response.body as any).data.bridgeSession.bridgeSessionId);
  });

  it('persists the neighbor bridge leg provider call-control id when operator answer starts neighbor ringing', async () => {
    const callResponse = await invokeRoute({
      url: '/threads/thread-f1-unclaimed-1001/call',
      headers: buildHeaders(),
      body: {
        providerKey: 'telnyx',
        operatorPhoneId: '+12605550155',
        targetPhone: '+12605550111',
      },
    });

    expect(callResponse.status).toBe(200);

    const webhookResponse = await invokeRoute({
      url: '/webhooks/inbound',
      headers: buildHeaders(),
      body: {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        eventType: 'CallAnswered',
        providerEventId: 'provider-event-operator-answered-1001',
        providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001',
        from: '+12605550155',
        to: '+12605550191',
      },
    });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        bridgeSession: {
          status: 'neighbor_dialing',
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
        correlationMapping: {
          deterministic: true,
          operatorLegMapping: 'duplicate',
          neighborLegMapping: 'created',
          error: null,
        },
      },
    });

    const persistedNeighborBridgeSession = await findConnectShyftBridgeSessionByProviderCallControlIdAsync({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      providerCallControlId: 'provider-leg-neighbor-thread-f1-unclaimed-1001',
    });
    expect(persistedNeighborBridgeSession?.session.id).toBe((callResponse.body as any).data.bridgeSession.bridgeSessionId);
    expect(startOutboundCallMock).toHaveBeenCalledTimes(2);
    expect(startOutboundCallMock).toHaveBeenLastCalledWith(expect.objectContaining({
      threadId: 'thread-f1-unclaimed-1001',
      targetPhone: '+12605550111',
    }));
  });

  it('uses the claimed thread operator destination before provider dispatch on bridge calls', async () => {
    resolveOperatorDestinationSpy.mockResolvedValueOnce({
      phoneNumber: '+12605550156',
      source: 'thread_assignee',
      userId: 'user-connectshyft-f1-other-operator',
      orgUnitId: 'org-connectshyft-f1-east',
    });

    const response = await invokeRoute({
      url: '/threads/thread-f1-claimed-1002/call',
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
    });
    expect(resolveOperatorDestinationSpy).toHaveBeenCalledWith({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-f1-primary-operator',
      claimedByUserId: 'user-connectshyft-f1-other-operator',
    });
    expect(startOutboundCallMock).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-f1-claimed-1002',
      targetPhone: '+12605550156',
    }));
  });

  it('uses the orgUnit fallback operator destination before provider dispatch on bridge calls', async () => {
    resolveOperatorDestinationSpy.mockResolvedValueOnce({
      phoneNumber: '+12605550157',
      source: 'org_unit_default',
      userId: null,
      orgUnitId: 'org-connectshyft-f1-east',
    });

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
    });
    expect(startOutboundCallMock).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-f1-unclaimed-1001',
      targetPhone: '+12605550157',
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

  it('refuses outbound bridge calls when operator destination is missing', async () => {
    resolveOperatorDestinationSpy.mockResolvedValueOnce({
      phoneNumber: null,
      source: 'none',
      userId: null,
      orgUnitId: 'org-connectshyft-f1-east',
    });

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
      code: 'CONNECTSHYFT_OPERATOR_DESTINATION_MISSING',
      data: {
        sideEffects: {
          dispatchAttempted: false,
        },
      },
    });
    expect(startOutboundCallMock).not.toHaveBeenCalled();
    expect(startBridgeSessionMock).not.toHaveBeenCalled();
    expect(loggerModule.default.info).toHaveBeenCalledWith(
      'ConnectShyft telephony runtime outcome',
      expect.objectContaining({
        threadId: 'thread-f1-unclaimed-1001',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        actorUserId: 'user-connectshyft-f1-primary-operator',
        claimedByUserId: null,
        senderNumber: null,
        operatorDestinationSource: 'none',
        operatorDestinationResolved: false,
        outcome: 'refused',
      }),
    );
  });

  it('refuses outbound bridge calls when operator destination is invalid', async () => {
    resolveOperatorDestinationSpy.mockResolvedValueOnce({
      phoneNumber: null,
      source: 'thread_assignee',
      userId: 'user-connectshyft-f1-other-operator',
      orgUnitId: 'org-connectshyft-f1-east',
    });

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
      code: 'CONNECTSHYFT_OPERATOR_INVALID_PHONE',
      data: {
        sideEffects: {
          dispatchAttempted: false,
        },
      },
    });
    expect(startOutboundCallMock).not.toHaveBeenCalled();
    expect(startBridgeSessionMock).not.toHaveBeenCalled();
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
