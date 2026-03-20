import type { Request, Response } from 'express';
import { postConnectWebhookInbound } from '../handlers/postConnectWebhookInbound';
import { postConnectWebhookSms } from '../handlers/postConnectWebhookSms';
import {
  executeConnectShyftInboundWebhookRoute,
  registerConnectShyftInboundWebhookCoreExecutor,
  resolveConnectShyftInboundWebhookAccessContext,
} from '../http/inboundWebhookContext';
import * as inboundWebhookContextModule from '../http/inboundWebhookContext';
import * as accessContextModule from '../http/accessContext';
import * as providerRegistryModule from '../providerRegistry';
import * as providerCorrelationMappingsModule from '../providerCorrelationMappings';
import * as bridgeSessionsModule from '../bridgeSessions';
import * as canonicalEventsModule from '../canonicalEvents';
import * as inboundSmsModule from '../inboundSms';
import * as inboundVoiceModule from '../inboundVoice';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const TEST_TENANT_ID = 'tenant-connectshyft-c9';
const TEST_ORG_UNIT_ID = 'org-connectshyft-c9-east';
const TEST_THREAD_ID = 'thread-connectshyft-c9-1001';

const createRequest = (overrides: Partial<Request> = {}): Request => {
  const {
    headers: overrideHeaders,
    body: overrideBody,
    ...restOverrides
  } = overrides as Partial<Request> & {
    headers?: Record<string, string>;
  };
  const headers = Object.entries((overrideHeaders || {}) as Record<string, string>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {},
  );

  return {
    path: '/api/v1/connect/webhooks/inbound',
    url: '/api/v1/connect/webhooks/inbound',
    originalUrl: '/api/v1/connect/webhooks/inbound',
    protocol: 'https',
    params: {},
    query: {},
    body: {
      eventType: 'MessageReceived',
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: TEST_THREAD_ID,
      ...(overrideBody || {}),
    },
    user: {
      userId: 'user-connectshyft-c9-1001',
      role: 'ORGUNIT_MEMBER',
      activeTenantId: TEST_TENANT_ID,
      activeOrgUnitId: TEST_ORG_UNIT_ID,
      householdId: TEST_TENANT_ID,
      email: 'inbound-webhook-context@test.local',
    },
    header: (name: string) => headers[name.toLowerCase()] || undefined,
    ...restOverrides,
  } as unknown as Request;
};

const createMockResponse = (): MockResponse => {
  const res = {
    locals: {
      responseEnvelope: {
        correlationId: 'corr-inbound-webhook-context',
        tenantId: TEST_TENANT_ID,
      },
    },
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

const createProviderSelection = (overrides: {
  verifyWebhookResult?: unknown;
  canonicalTranslation?: Record<string, unknown>;
} = {}) => {
  const canonicalTranslation = {
    eventType: 'message.received',
    payload: {
      eventType: 'MessageReceived',
    },
    correlation: {
      providerLegId: null,
      providerMessageId: 'provider-message-c9-1001',
      providerEventId: 'provider-event-c9-1001',
      providerNumber: '+12605550199',
    },
    providerNeutral: true,
    providerSpecificFieldsStripped: true,
    providerBranchingInDomain: false,
    ...(overrides.canonicalTranslation || {}),
  };
  const adapter = {
    providerKey: 'telnyx',
    adapterInterfaceVersion: 'v1',
    verifyWebhook: jest.fn().mockReturnValue(overrides.verifyWebhookResult || { ok: true }),
    translateProviderEvent: jest.fn().mockReturnValue(canonicalTranslation),
  };
  const selection = {
    ok: true,
    adapter,
    providerResolution: {
      requestedProvider: 'telnyx',
      resolvedProvider: 'telnyx',
      deterministic: true,
    },
  };

  return {
    adapter,
    selection,
    canonicalTranslation,
  };
};

describe('connectshyft inbound webhook helper boundary', () => {
  beforeEach(() => {
    registerConnectShyftInboundWebhookCoreExecutor(async () => undefined);
    jest.spyOn(accessContextModule, 'enforceConnectShyftCapability').mockResolvedValue(true as any);
    jest.spyOn(accessContextModule, 'loadConnectShyftPlatformDb').mockReturnValue({
      mocked: 'db',
    } as any);
    jest.spyOn(providerRegistryModule, 'resolveConnectShyftRequestedProviderKey').mockReturnValue('telnyx');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the scoped webhook prerequisites for a valid SMS webhook request', async () => {
    const { adapter, selection, canonicalTranslation } = createProviderSelection();
    const resolveProviderAdapterSpy = jest
      .spyOn(providerRegistryModule, 'resolveConnectShyftProviderAdapter')
      .mockReturnValue(selection as any);
    const correlationLookupSpy = jest
      .spyOn(providerCorrelationMappingsModule, 'resolveConnectShyftProviderCorrelationByIdentifiers')
      .mockResolvedValue({
        ok: false,
        reason: 'not-found',
      } as any);
    const req = createRequest({
      path: '/api/v1/connect/webhooks/sms',
      url: '/api/v1/connect/webhooks/sms',
      originalUrl: '/api/v1/connect/webhooks/sms',
    });
    const res = createMockResponse();

    const context = await resolveConnectShyftInboundWebhookAccessContext(req, res);

    expect(context).toMatchObject({
      routeKind: 'sms',
      providerSelection: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
        },
      },
      canonicalTranslation,
      eventType: 'message.received',
      normalizedEventType: 'message.received',
      correlation: {
        source: 'metadata',
        tenantId: TEST_TENANT_ID,
        orgUnitId: TEST_ORG_UNIT_ID,
        threadId: TEST_THREAD_ID,
        providerLegId: null,
        providerMessageId: 'provider-message-c9-1001',
        providerEventId: 'provider-event-c9-1001',
        providerNumberE164: '+12605550199',
      },
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: TEST_THREAD_ID,
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'canonicalTranslation',
      'correlation',
      'eventType',
      'normalizedEventType',
      'orgUnitId',
      'providerSelection',
      'routeKind',
      'tenantId',
      'threadId',
    ]);
    expect(resolveProviderAdapterSpy).toHaveBeenNthCalledWith(1, {
      req,
      operation: 'webhook',
      requestedProvider: 'telnyx',
    });
    expect(resolveProviderAdapterSpy).toHaveBeenNthCalledWith(2, {
      req: expect.objectContaining({
        tenantId: TEST_TENANT_ID,
        orgUnitId: TEST_ORG_UNIT_ID,
        body: req.body,
        url: req.url,
        originalUrl: req.originalUrl,
        protocol: req.protocol,
      }),
      operation: 'webhook',
      requestedProvider: 'telnyx',
    });
    expect(adapter.verifyWebhook).toHaveBeenCalledTimes(1);
    expect(adapter.translateProviderEvent).toHaveBeenCalledWith({
      rawEventType: 'MessageReceived',
      payload: req.body,
    });
    expect(correlationLookupSpy).toHaveBeenCalledWith({
      providerName: 'telnyx',
      providerLegId: null,
      providerMessageId: 'provider-message-c9-1001',
      tenantId: TEST_TENANT_ID,
      db: { mocked: 'db' },
    });
    expect(accessContextModule.loadConnectShyftPlatformDb).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('maps missing webhook signatures to the current refusal envelope', async () => {
    const { adapter, selection } = createProviderSelection({
      verifyWebhookResult: {
        ok: false,
        refusal: {
          code: 'WEBHOOK_SIGNATURE_MISSING',
          message: 'Webhook signature header is required.',
          refusalType: 'client',
          httpStatus: 401,
        },
      },
    });
    const correlationLookupSpy = jest.spyOn(
      providerCorrelationMappingsModule,
      'resolveConnectShyftProviderCorrelationByIdentifiers',
    );
    jest.spyOn(providerRegistryModule, 'resolveConnectShyftProviderAdapter').mockReturnValue(selection as any);
    const res = createMockResponse();

    const context = await resolveConnectShyftInboundWebhookAccessContext(createRequest(), res, 'inbound');

    expect(context).toBeNull();
    expect(adapter.translateProviderEvent).not.toHaveBeenCalled();
    expect(correlationLookupSpy).not.toHaveBeenCalled();
    expect(accessContextModule.loadConnectShyftPlatformDb).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING',
      message: 'Webhook signature header is required.',
      refusalType: 'client',
      correlationId: 'corr-inbound-webhook-context',
      tenantId: TEST_TENANT_ID,
      data: expect.objectContaining({
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInvoked: true,
        },
        signatureValidation: {
          deterministic: true,
          verified: false,
          provider: 'telnyx',
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: 'connectshyft.webhook.signature.missing',
          remediation: 'Ensure provider webhook signing is configured and include a valid signature.',
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
      }),
    }));
  });

  it('stays limited to prerequisite resolution and execution delegation without bridge or canonical side effects', async () => {
    const { selection, canonicalTranslation } = createProviderSelection();
    jest.spyOn(providerRegistryModule, 'resolveConnectShyftProviderAdapter').mockReturnValue(selection as any);
    jest.spyOn(
      providerCorrelationMappingsModule,
      'resolveConnectShyftProviderCorrelationByIdentifiers',
    ).mockResolvedValue({
      ok: false,
      reason: 'not-found',
    } as any);
    const bridgeWebhookSpy = jest.spyOn(
      bridgeSessionsModule,
      'handleConnectShyftBridgeWebhookEvent',
    ).mockImplementation(async () => {
      throw new Error('Bridge webhook handling should not run during inbound helper preparation.');
    });
    const canonicalEventSpy = jest.spyOn(
      canonicalEventsModule,
      'recordConnectShyftCanonicalEvent',
    ).mockImplementation(async () => {
      throw new Error('Canonical event persistence should not run during inbound helper preparation.');
    });
    const inboundSmsSpy = jest.spyOn(
      inboundSmsModule,
      'mapConnectShyftInboundSmsWebhookToDomainEvent',
    ).mockImplementation(() => {
      throw new Error('Inbound SMS domain mapping should not run during inbound helper preparation.');
    });
    const inboundVoiceSpy = jest.spyOn(
      inboundVoiceModule,
      'mapConnectShyftInboundVoiceWebhookToDomainEvent',
    ).mockImplementation(() => {
      throw new Error('Inbound voice domain mapping should not run during inbound helper preparation.');
    });
    const coreExecutor = jest.fn(async (_input: unknown) => undefined);
    const req = createRequest({
      path: '/api/v1/connect/webhooks/sms',
      url: '/api/v1/connect/webhooks/sms',
      originalUrl: '/api/v1/connect/webhooks/sms',
    });
    const res = createMockResponse();

    registerConnectShyftInboundWebhookCoreExecutor(coreExecutor);

    await executeConnectShyftInboundWebhookRoute(req, res, 'sms');

    expect(coreExecutor).toHaveBeenCalledTimes(1);

    const executionInput = coreExecutor.mock.calls[0]?.[0];
    if (!executionInput) {
      throw new Error('Expected inbound webhook core executor to receive execution input.');
    }

    expect(executionInput).toMatchObject({
      req,
      res,
      routeKind: 'sms',
      providerSelection: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
        },
      },
      canonicalTranslation,
      eventType: 'message.received',
      normalizedEventType: 'message.received',
      correlation: {
        source: 'metadata',
        tenantId: TEST_TENANT_ID,
        orgUnitId: TEST_ORG_UNIT_ID,
        threadId: TEST_THREAD_ID,
      },
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: TEST_THREAD_ID,
    });
    expect(Object.keys(executionInput).sort()).toEqual([
      'canonicalTranslation',
      'correlation',
      'eventType',
      'normalizedEventType',
      'orgUnitId',
      'providerSelection',
      'req',
      'res',
      'routeKind',
      'tenantId',
      'threadId',
    ]);
    expect(bridgeWebhookSpy).not.toHaveBeenCalled();
    expect(canonicalEventSpy).not.toHaveBeenCalled();
    expect(inboundSmsSpy).not.toHaveBeenCalled();
    expect(inboundVoiceSpy).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('prepares deterministic route kinds for the thin inbound webhook handlers', async () => {
    const executeRouteSpy = jest
      .spyOn(inboundWebhookContextModule, 'executeConnectShyftInboundWebhookRoute')
      .mockResolvedValue(undefined);
    const req = createRequest();
    const res = createMockResponse();

    await postConnectWebhookInbound(req, res);
    await postConnectWebhookSms(req, res);

    expect(executeRouteSpy).toHaveBeenNthCalledWith(1, req, res, 'inbound');
    expect(executeRouteSpy).toHaveBeenNthCalledWith(2, req, res, 'sms');
  });
});
