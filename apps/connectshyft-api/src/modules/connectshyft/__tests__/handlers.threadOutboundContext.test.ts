import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  executeConnectShyftThreadOutboundAction,
  registerConnectShyftThreadOutboundCoreExecutor,
  resolveConnectShyftThreadOutboundAccessContext,
} from '../http/threadOutboundContext';
import * as accessContextModule from '../http/accessContext';
import * as threadLifecycleContextModule from '../http/threadLifecycleContext';
import * as providerRegistryModule from '../providerRegistry';
import * as bridgeSessionsModule from '../bridgeSessions';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const createRequest = (overrides: Partial<Request> = {}): Request => {
  const headers = Object.entries((overrides.headers || {}) as Record<string, string>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {},
  );

  return {
    params: {
      threadId: 'thread-c8-outbound-1001',
      ...(overrides.params || {}),
    },
    body: {
      message: 'Checking in with a short update.',
      ...(overrides.body || {}),
    },
    query: {},
    user: {
      userId: 'user-thread-outbound-context-1001',
      role: 'ORGUNIT_MEMBER',
      activeTenantId: 'tenant-connectshyft-c8',
      activeOrgUnitId: 'org-connectshyft-c8-east',
      householdId: 'tenant-connectshyft-c8',
      email: 'thread-outbound-context@test.local',
      ...(overrides.user || {}),
    },
    header: (name: string) => headers[name.toLowerCase()] || undefined,
    ...overrides,
  } as unknown as Request;
};

const createMockResponse = (): MockResponse => {
  const res = {
    locals: {
      responseEnvelope: {
        correlationId: 'corr-thread-outbound-context',
        tenantId: 'tenant-connectshyft-c8',
      },
    },
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

describe('connectshyft thread outbound helper boundary', () => {
  const resolvedContext = {
    tenantId: 'tenant-connectshyft-c8',
    orgUnitId: 'org-connectshyft-c8-east',
    bypassedOrgUnitMembership: false,
    effectiveRoles: ['ORGUNIT_MEMBER'],
  } as const;
  const resolvedLifecycleContext = {
    detail: {
      threadId: 'thread-c8-outbound-1001',
      tenantId: 'tenant-connectshyft-c8',
      orgUnitId: 'org-connectshyft-c8-east',
    },
    syntheticThread: {
      tenantId: 'tenant-connectshyft-c8',
      orgUnitId: 'org-connectshyft-c8-east',
      state: 'UNCLAIMED',
    },
    currentState: 'UNCLAIMED',
    claimedByUserId: null,
  } as const;

  beforeEach(() => {
    registerConnectShyftThreadOutboundCoreExecutor(async () => undefined);
    jest.spyOn(accessContextModule, 'enforceConnectShyftCapability').mockResolvedValue({
      connectshyft_enabled: true,
      connectshyft_inbox_enabled: true,
      connectshyft_escalation_enabled: true,
      connectshyft_webhooks_enabled: true,
    } as any);
    jest.spyOn(accessContextModule, 'resolveConnectShyftRouteContextDecision').mockResolvedValue({
      ok: true,
      context: resolvedContext,
    } as any);
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValue(true);
    jest.spyOn(accessContextModule, 'resolveConnectShyftRequestedActorUserId').mockReturnValue(
      'user-thread-outbound-context-1001',
    );
    jest.spyOn(accessContextModule, 'resolveConnectShyftActorRoles').mockReturnValue([
      'ORGUNIT_MEMBER',
    ]);
    jest.spyOn(accessContextModule, 'respondWithConnectShyftContextRefusal').mockImplementation((res) => res);
    jest.spyOn(accessContextModule, 'sendConnectShyftRouteRefusal').mockImplementation((res) => res);
    jest.spyOn(
      threadLifecycleContextModule,
      'resolveConnectShyftThreadLifecycleStateContext',
    ).mockResolvedValue(resolvedLifecycleContext as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the scoped outbound prerequisites for a valid call request', async () => {
    const context = await resolveConnectShyftThreadOutboundAccessContext(
      createRequest(),
      createMockResponse(),
      'call',
    );

    expect(context).toMatchObject({
      context: resolvedContext,
      threadId: 'thread-c8-outbound-1001',
      actorUserId: 'user-thread-outbound-context-1001',
      actorRoles: ['ORGUNIT_MEMBER'],
      lifecycleContext: {
        currentState: 'UNCLAIMED',
        claimedByUserId: null,
        syntheticThread: {
          tenantId: 'tenant-connectshyft-c8',
          orgUnitId: 'org-connectshyft-c8-east',
          state: 'UNCLAIMED',
        },
      },
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'actorRoles',
      'actorUserId',
      'context',
      'lifecycleContext',
      'threadId',
    ]);
    expect(accessContextModule.requestHasAnyCapability).toHaveBeenCalledWith(
      expect.anything(),
      [
        CAPABILITIES.ORG_UNIT_THREAD_VIEW,
        CAPABILITIES.THREAD_VIEW_ALL,
      ],
      resolvedContext,
    );
    expect(accessContextModule.requestHasAnyCapability).toHaveBeenCalledWith(
      expect.anything(),
      [
        CAPABILITIES.ORG_UNIT_CALL_INITIATE,
        CAPABILITIES.THREAD_TAKEOVER_ALL,
      ],
      resolvedContext,
    );
    expect(
      threadLifecycleContextModule.resolveConnectShyftThreadLifecycleStateContext,
    ).toHaveBeenCalledWith({
      tenantId: 'tenant-connectshyft-c8',
      orgUnitId: 'org-connectshyft-c8-east',
      threadId: 'thread-c8-outbound-1001',
      actorUserId: 'user-thread-outbound-context-1001',
    });
  });

  it('returns the current client refusal for a missing thread id', async () => {
    const res = createMockResponse();

    const context = await resolveConnectShyftThreadOutboundAccessContext(
      createRequest({
        params: {
          threadId: '   ',
        } as any,
      }),
      res,
      'message',
    );

    expect(context).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
      correlationId: 'corr-thread-outbound-context',
      tenantId: 'tenant-connectshyft-c8',
    }));
  });

  it('maps route context refusals through the shared context responder', async () => {
    const res = createMockResponse();
    jest.spyOn(accessContextModule, 'resolveConnectShyftRouteContextDecision').mockResolvedValueOnce({
      ok: false,
      reason: 'context-missing',
    } as any);

    const context = await resolveConnectShyftThreadOutboundAccessContext(
      createRequest(),
      res,
      'call',
    );

    expect(context).toBeNull();
    expect(accessContextModule.respondWithConnectShyftContextRefusal).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        ok: false,
        reason: 'context-missing',
      }),
    );
    expect(
      threadLifecycleContextModule.resolveConnectShyftThreadLifecycleStateContext,
    ).not.toHaveBeenCalled();
  });

  it('maps missing lifecycle prerequisites to the current thread-not-found refusal', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    jest.spyOn(
      threadLifecycleContextModule,
      'resolveConnectShyftThreadLifecycleStateContext',
    ).mockResolvedValueOnce({
      detail: null,
      syntheticThread: null,
      currentState: null,
      claimedByUserId: null,
    } as any);

    const context = await resolveConnectShyftThreadOutboundAccessContext(
      createRequest({
        params: {
          threadId: '11111111-1111-4111-8111-111111111111',
        } as any,
      }),
      createMockResponse(),
      'message',
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      message: 'Thread not found for this tenant/orgUnit context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: resolvedContext,
        threadId: '11111111-1111-4111-8111-111111111111',
      },
    });
  });

  it('stays limited to prerequisite resolution and execution delegation without provider or bridge side effects', async () => {
    const providerAdapterSpy = jest.spyOn(
      providerRegistryModule,
      'resolveConnectShyftProviderAdapter',
    );
    const startBridgeSessionSpy = jest.spyOn(
      bridgeSessionsModule,
      'startConnectShyftBridgeSession',
    );
    const coreExecutor = jest.fn(async (_input: unknown) => undefined);
    const req = createRequest({
      params: {
        threadId: 'thread-c8-outbound-message-1001',
      } as any,
    });
    const res = createMockResponse();

    registerConnectShyftThreadOutboundCoreExecutor(coreExecutor);

    await executeConnectShyftThreadOutboundAction(req, res, 'message');

    expect(accessContextModule.requestHasAnyCapability).toHaveBeenCalledWith(
      expect.anything(),
      [
        CAPABILITIES.ORG_UNIT_SMS_SEND,
        CAPABILITIES.THREAD_TAKEOVER_ALL,
      ],
      resolvedContext,
    );
    expect(coreExecutor).toHaveBeenCalledTimes(1);

    const executionInput = coreExecutor.mock.calls[0]?.[0];
    if (!executionInput) {
      throw new Error('Expected outbound core executor to receive execution input.');
    }
    expect(executionInput).toMatchObject({
      req,
      res,
      outboundAction: 'message',
      context: resolvedContext,
      threadId: 'thread-c8-outbound-message-1001',
      actorUserId: 'user-thread-outbound-context-1001',
      actorRoles: ['ORGUNIT_MEMBER'],
      lifecycleContext: resolvedLifecycleContext,
    });
    expect(Object.keys(executionInput).sort()).toEqual([
      'actorRoles',
      'actorUserId',
      'context',
      'lifecycleContext',
      'outboundAction',
      'req',
      'res',
      'threadId',
    ]);
    expect(providerAdapterSpy).not.toHaveBeenCalled();
    expect(startBridgeSessionSpy).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
