import type { Request, Response } from 'express';
import * as platformMutationsModule from '../../../platform/mutations/executePlatformMutation';
import {
  resolveConnectShyftNeighborDetailAccessContext,
  resolveConnectShyftNeighborIdentityMatchAccessContext,
  resolveConnectShyftNeighborMergeAccessContext,
  resolveConnectShyftNeighborUpdateAccessContext,
} from '../http/neighborIdentityContext';
import * as neighborIdentityContextModule from '../http/neighborIdentityContext';
import * as accessContextModule from '../http/accessContext';
import { connectShyftNeighborServiceAsync } from '../neighbors';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const TEST_TENANT_ID = 'tenant-neighbor-identity-context';
const TEST_ORG_UNIT_ID = 'org-neighbor-identity-context-east';

const createRequest = (overrides: Partial<Request> = {}): Request => {
  const {
    headers: overrideHeaders,
    params: overrideParams,
    body: overrideBody,
    user: overrideUser,
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
    params: {
      neighborId: 'neighbor-context-1001',
      ...(overrideParams || {}),
    },
    body: {
      orgUnitId: TEST_ORG_UNIT_ID,
      firstName: 'Mina',
      lastName: 'Lopez',
      prefersTexting: 'YES',
      phones: [
        {
          label: 'mobile',
          value: '+1 (260) 555-0101',
          verificationStatus: 'verified',
        },
      ],
      contactPoint: {
        label: 'mobile',
        value: '+1 (260) 555-0101',
        verificationStatus: 'verified',
      },
      sourceNeighborId: 'neighbor-source-1001',
      survivorNeighborId: 'neighbor-survivor-1001',
      irreversibleConfirmation: {
        acknowledged: true,
        phrase: 'IRREVERSIBLE MERGE',
      },
      reason: 'Manual duplicate resolution',
      ...(overrideBody || {}),
    },
    query: {},
    user: {
      userId: 'user-neighbor-identity-context-1001',
      role: 'ORGUNIT_MEMBER',
      activeTenantId: TEST_TENANT_ID,
      activeOrgUnitId: TEST_ORG_UNIT_ID,
      householdId: TEST_TENANT_ID,
      email: 'neighbor-identity-context@test.local',
      ...(overrideUser || {}),
    },
    header: (name: string) => headers[name.toLowerCase()] || undefined,
    ...restOverrides,
  } as unknown as Request;
};

const createMockResponse = (): MockResponse => {
  const res = {
    locals: {
      responseEnvelope: {
        correlationId: 'corr-neighbor-identity-context',
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

describe('connectshyft neighbor identity helper boundary', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const resolvedContext = {
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    bypassedOrgUnitMembership: false,
    effectiveRoles: ['ORGUNIT_MEMBER'],
  } as const;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
    jest.spyOn(accessContextModule, 'enforceConnectShyftCapability').mockResolvedValue(true as any);
    jest.spyOn(accessContextModule, 'resolveConnectShyftRouteContextDecision').mockResolvedValue({
      ok: true,
      context: resolvedContext,
    } as any);
    jest.spyOn(accessContextModule, 'resolveConnectShyftActorRoles').mockReturnValue([
      'ORGUNIT_MEMBER',
    ]);
    jest.spyOn(accessContextModule, 'resolveConnectShyftRequestedActorUserId').mockReturnValue(
      'user-neighbor-identity-context-1001',
    );
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValue(true);
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

  it('returns the scoped update prerequisites and trims the neighborId', async () => {
    const req = createRequest({
      params: {
        neighborId: '  neighbor-context-1001  ',
      } as any,
      body: {
        orgUnitId: `  ${TEST_ORG_UNIT_ID}  `,
      } as any,
    });

    const context = await resolveConnectShyftNeighborUpdateAccessContext(
      req,
      createMockResponse(),
    );

    expect(context).toMatchObject({
      context: resolvedContext,
      actorRoles: ['ORGUNIT_MEMBER'],
      actorUserId: 'user-neighbor-identity-context-1001',
      neighborId: 'neighbor-context-1001',
      payload: {
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Mina',
        lastName: 'Lopez',
        prefersTexting: 'YES',
        phones: [
          {
            label: 'mobile',
            value: '+1 (260) 555-0101',
            isShared: false,
            verificationStatus: 'verified',
          },
        ],
      },
      policyDecision: {
        policyPath: 'tenant-privileged',
        indicator: null,
        contextOverrideNotice: 'Tenant-privileged override applied',
        relationshipValidated: true,
      },
      provenance: {
        audit: {
          eventName: 'connectshyft.neighbor.updated',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: 'user-neighbor-identity-context-1001',
            policy_path: 'tenant-privileged',
          },
        },
      },
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'actorRoles',
      'actorUserId',
      'context',
      'neighborId',
      'payload',
      'policyDecision',
      'provenance',
    ]);
    expect(accessContextModule.resolveConnectShyftRouteContextDecision).toHaveBeenCalledWith(
      req,
      {
        attemptedOrgUnitId: TEST_ORG_UNIT_ID,
      },
    );
  });

  it('returns the current client refusal when neighborId is missing', async () => {
    const res = createMockResponse();

    const context = await resolveConnectShyftNeighborDetailAccessContext(
      createRequest({
        params: {
          neighborId: '   ',
        } as any,
      }),
      res,
    );

    expect(context).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_ID_REQUIRED',
      message: 'neighborId is required',
      refusalType: 'client',
      correlationId: 'corr-neighbor-identity-context',
      tenantId: TEST_TENANT_ID,
    }));
  });

  it('maps identity-match prerequisite refusals to the current update-forbidden envelope', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValue(false);

    const context = await resolveConnectShyftNeighborIdentityMatchAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATE_FORBIDDEN',
      message: 'Neighbor profile updates require an authorized ConnectShyft role.',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('maps merge prerequisite refusals to the current merge-forbidden envelope', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValue(false);

    const context = await resolveConnectShyftNeighborMergeAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN',
      message: 'Neighbor merge requires an authorized role.',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('stays limited to neighbor identity prerequisites and does not execute bridge side effects', async () => {
    const executeMutationSpy = jest.spyOn(
      platformMutationsModule,
      'executePlatformMutation',
    ).mockImplementation(async () => {
      throw new Error('executePlatformMutation should not run during access-context resolution');
    });
    const evaluateIdentityMatchSpy = jest.spyOn(
      connectShyftNeighborServiceAsync,
      'evaluateIdentityMatch',
    ).mockRejectedValue(new Error('evaluateIdentityMatch should not run during access-context resolution'));
    const mergeNeighborSpy = jest.spyOn(
      connectShyftNeighborServiceAsync,
      'mergeNeighbor',
    ).mockRejectedValue(new Error('mergeNeighbor should not run during access-context resolution'));
    const identityRes = createMockResponse();
    const mergeRes = createMockResponse();

    const identityContext = await resolveConnectShyftNeighborIdentityMatchAccessContext(
      createRequest(),
      identityRes,
    );
    const mergeContext = await resolveConnectShyftNeighborMergeAccessContext(
      createRequest(),
      mergeRes,
    );

    expect(identityContext).toMatchObject({
      context: resolvedContext,
      actorRoles: ['ORGUNIT_MEMBER'],
      actorUserId: 'user-neighbor-identity-context-1001',
      payload: {
        orgUnitId: TEST_ORG_UNIT_ID,
      },
    });
    expect(mergeContext).toMatchObject({
      context: resolvedContext,
      actorRoles: ['ORGUNIT_MEMBER'],
      actorUserId: 'user-neighbor-identity-context-1001',
      payload: {
        orgUnitId: TEST_ORG_UNIT_ID,
        sourceNeighborId: 'neighbor-source-1001',
        survivorNeighborId: 'neighbor-survivor-1001',
      },
    });
    expect(executeMutationSpy).not.toHaveBeenCalled();
    expect(evaluateIdentityMatchSpy).not.toHaveBeenCalled();
    expect(mergeNeighborSpy).not.toHaveBeenCalled();
    expect(Object.keys(neighborIdentityContextModule).some((name) => /Outbound|Webhook/i.test(name))).toBe(false);
    expect(identityRes.status).not.toHaveBeenCalled();
    expect(identityRes.json).not.toHaveBeenCalled();
    expect(mergeRes.status).not.toHaveBeenCalled();
    expect(mergeRes.json).not.toHaveBeenCalled();
  });
});
