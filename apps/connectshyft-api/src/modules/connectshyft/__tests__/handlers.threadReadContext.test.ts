import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  loadConnectShyftThreadReadContractAsync,
  resolveConnectShyftThreadDetailReadAccessContext,
  resolveConnectShyftThreadTimelineReadContext,
} from '../http/threadReadContext';
import * as accessContextModule from '../http/accessContext';
import * as readContractsModule from '../readContracts';

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
      threadId: 'thread-read-context-1001',
      ...(overrides.params || {}),
    },
    query: {},
    user: {
      userId: 'user-thread-read-context-1001',
      role: 'ORGUNIT_MEMBER',
      activeTenantId: 'tenant-thread-read-context',
      activeOrgUnitId: 'org-thread-read-context-east',
      householdId: 'tenant-thread-read-context',
      email: 'thread-read-context@test.local',
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
        correlationId: 'corr-thread-read-context',
        tenantId: 'tenant-thread-read-context',
      },
    },
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

describe('connectshyft thread read helper boundary', () => {
  const resolvedContext = {
    tenantId: 'tenant-thread-read-context',
    orgUnitId: 'org-thread-read-context-east',
    bypassedOrgUnitMembership: false,
    effectiveRoles: ['ORGUNIT_MEMBER'],
  } as const;

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
      'user-thread-read-context-1001',
    );
    jest.spyOn(accessContextModule, 'resolveConnectShyftRequestedRole').mockReturnValue('ORGUNIT_MEMBER');
    jest.spyOn(accessContextModule, 'loadConnectShyftPlatformDb').mockReturnValue({ mocked: 'db' } as any);
    jest.spyOn(accessContextModule, 'respondWithConnectShyftContextRefusal').mockImplementation((res) => res);
    jest.spyOn(accessContextModule, 'sendConnectShyftRouteRefusal').mockImplementation((res) => res);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the scoped read access context for a valid thread read request', async () => {
    const context = await resolveConnectShyftThreadDetailReadAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
      includeDeleted: false,
      threadId: 'thread-read-context-1001',
      actorUserId: 'user-thread-read-context-1001',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'actorUserId',
      'context',
      'includeDeleted',
      'requestedRole',
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
  });

  it('returns the current client refusal for a missing thread id', async () => {
    const res = createMockResponse();

    const context = await resolveConnectShyftThreadDetailReadAccessContext(
      createRequest({
        params: {
          threadId: '   ',
        } as any,
      }),
      res,
    );

    expect(context).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
      correlationId: 'corr-thread-read-context',
      tenantId: 'tenant-thread-read-context',
    }));
  });

  it('maps unavailable timeline prerequisites to the current thread-not-found refusal', async () => {
    const sendRefusalSpy = jest.spyOn(accessContextModule, 'sendConnectShyftRouteRefusal');
    jest.spyOn(readContractsModule, 'resolveConnectShyftThreadDetailContractAsync').mockResolvedValue(null);

    const context = await resolveConnectShyftThreadTimelineReadContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      message: 'Thread detail is unavailable for the requested orgUnit context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: {
          tenantId: 'tenant-thread-read-context',
          orgUnitId: 'org-thread-read-context-east',
          bypassedOrgUnitMembership: false,
        },
      },
    });
  });

  it('loads only the read-contract prerequisites and does not leak broader route payload assembly', async () => {
    const resolveContractSpy = jest.spyOn(
      readContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue({
      threadId: 'thread-read-context-1001',
    } as any);

    const thread = await loadConnectShyftThreadReadContractAsync({
      context: resolvedContext as any,
      includeDeleted: true,
      threadId: 'thread-read-context-1001',
      actorUserId: 'user-thread-read-context-1001',
      requestedRole: 'TENANT_ADMIN',
    });

    expect(thread).toEqual({
      threadId: 'thread-read-context-1001',
    });
    expect(resolveContractSpy).toHaveBeenCalledWith({
      tenantId: 'tenant-thread-read-context',
      orgUnitId: 'org-thread-read-context-east',
      threadId: 'thread-read-context-1001',
      actorUserId: 'user-thread-read-context-1001',
      requestedRole: 'TENANT_ADMIN',
      includeDeleted: true,
      db: { mocked: 'db' },
    });
  });
});
