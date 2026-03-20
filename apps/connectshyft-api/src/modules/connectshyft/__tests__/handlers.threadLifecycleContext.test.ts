import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import { resolveConnectShyftThreadLifecycleAccessContext } from '../http/threadLifecycleContext';
import * as accessContextModule from '../http/accessContext';
import * as readContractsModule from '../readContracts';
import * as platformMutationsModule from '../../../platform/mutations/executePlatformMutation';

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
      threadId: 'thread-c5-unclaimed-1001',
      ...(overrides.params || {}),
    },
    body: {
      reason: 'Operator accepted ownership',
      resolution: 'follow_up',
      ...(overrides.body || {}),
    },
    query: {},
    user: {
      userId: 'user-thread-lifecycle-context-1001',
      role: 'ORGUNIT_MEMBER',
      activeTenantId: 'tenant-connectshyft-c5',
      activeOrgUnitId: 'org-connectshyft-c5-east',
      householdId: 'tenant-connectshyft-c5',
      email: 'thread-lifecycle-context@test.local',
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
        correlationId: 'corr-thread-lifecycle-context',
        tenantId: 'tenant-connectshyft-c5',
      },
    },
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

describe('connectshyft thread lifecycle helper boundary', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const resolvedContext = {
    tenantId: 'tenant-connectshyft-c5',
    orgUnitId: 'org-connectshyft-c5-east',
    bypassedOrgUnitMembership: false,
    effectiveRoles: ['ORGUNIT_MEMBER'],
  } as const;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
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
      'user-thread-lifecycle-context-1001',
    );
    jest.spyOn(accessContextModule, 'resolveConnectShyftActorRoles').mockReturnValue([
      'ORGUNIT_MEMBER',
    ]);
    jest.spyOn(accessContextModule, 'loadConnectShyftPlatformDb').mockReturnValue({ mocked: 'db' } as any);
    jest.spyOn(accessContextModule, 'respondWithConnectShyftContextRefusal').mockImplementation((res) => res);
    jest.spyOn(accessContextModule, 'sendConnectShyftRouteRefusal').mockImplementation((res) => res);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
  });

  it('returns the scoped lifecycle prerequisites for a valid claim request', async () => {
    const context = await resolveConnectShyftThreadLifecycleAccessContext(
      createRequest(),
      createMockResponse(),
      'claim',
    );

    expect(context).toMatchObject({
      action: 'claim',
      context: resolvedContext,
      threadId: 'thread-c5-unclaimed-1001',
      actorUserId: 'user-thread-lifecycle-context-1001',
      actorRoles: ['ORGUNIT_MEMBER'],
      reason: 'Operator accepted ownership',
      resolution: 'follow_up',
      nextState: 'CLAIMED',
      lifecycleContext: {
        currentState: 'UNCLAIMED',
        claimedByUserId: null,
        syntheticThread: {
          tenantId: 'tenant-connectshyft-c5',
          orgUnitId: 'org-connectshyft-c5-east',
          state: 'UNCLAIMED',
        },
      },
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'action',
      'actorRoles',
      'actorUserId',
      'context',
      'lifecycleContext',
      'nextState',
      'reason',
      'resolution',
      'threadId',
    ]);
    expect(accessContextModule.requestHasAnyCapability).toHaveBeenCalledWith(
      expect.anything(),
      [
        CAPABILITIES.ORG_UNIT_THREAD_CLAIM,
        CAPABILITIES.THREAD_TAKEOVER_ALL,
      ],
      resolvedContext,
    );
  });

  it('returns the current client refusal for a missing thread id', async () => {
    const res = createMockResponse();

    const context = await resolveConnectShyftThreadLifecycleAccessContext(
      createRequest({
        params: {
          threadId: '   ',
        } as any,
      }),
      res,
      'claim',
    );

    expect(context).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
      correlationId: 'corr-thread-lifecycle-context',
      tenantId: 'tenant-connectshyft-c5',
    }));
  });

  it('maps unavailable lifecycle context to the current thread-not-found refusal', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    const resolveContractSpy = jest.spyOn(
      readContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(null);

    const context = await resolveConnectShyftThreadLifecycleAccessContext(
      createRequest({
        params: {
          threadId: '11111111-1111-4111-8111-111111111111',
        } as any,
      }),
      createMockResponse(),
      'claim',
    );

    expect(context).toBeNull();
    expect(resolveContractSpy).toHaveBeenCalledWith({
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      threadId: '11111111-1111-4111-8111-111111111111',
      actorUserId: 'user-thread-lifecycle-context-1001',
      db: { mocked: 'db' },
    });
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

  it('maps missing actor attribution to the current lifecycle policy refusal', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    jest.spyOn(accessContextModule, 'resolveConnectShyftRequestedActorUserId').mockReturnValue(null);

    const context = await resolveConnectShyftThreadLifecycleAccessContext(
      createRequest(),
      createMockResponse(),
      'claim',
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
      message: 'Lifecycle actions require actor attribution.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: resolvedContext,
        threadId: 'thread-c5-unclaimed-1001',
        priorState: 'UNCLAIMED',
      },
    });
  });

  it('stays limited to lifecycle prerequisites and does not perform transition side effects', async () => {
    const executeMutationSpy = jest.spyOn(
      platformMutationsModule,
      'executePlatformMutation',
    ).mockImplementation(async () => {
      throw new Error('executePlatformMutation should not run during access-context resolution');
    });
    const res = createMockResponse();

    const context = await resolveConnectShyftThreadLifecycleAccessContext(
      createRequest({
        body: {
          reason: 'Need ownership',
          resolution: 'call_back',
        },
      }),
      res,
      'claim',
    );

    expect(context).toMatchObject({
      action: 'claim',
      threadId: 'thread-c5-unclaimed-1001',
      reason: 'Need ownership',
      resolution: 'call_back',
      nextState: 'CLAIMED',
    });
    expect(executeMutationSpy).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
