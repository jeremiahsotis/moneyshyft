import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  resolveConnectShyftNumberMappingCreateAccessContext,
  resolveConnectShyftNumberMappingListAccessContext,
  resolveConnectShyftNumberMappingUpdateAccessContext,
} from '../http/numberMappingContext';
import * as accessContextModule from '../http/accessContext';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const TEST_TENANT_ID = 'tenant-number-mapping-context';
const TEST_ORG_UNIT_ID = 'org-number-mapping-context-east';

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
      mappingId: 'mapping-context-1001',
      ...(overrides.params || {}),
    },
    body: {
      orgUnitId: TEST_ORG_UNIT_ID,
      providerNumberE164: '+12605550111',
      label: 'Primary Dispatch',
      isActive: true,
      ...(overrides.body || {}),
    },
    query: {},
    user: {
      userId: 'user-number-mapping-context-1001',
      role: 'ORGUNIT_ADMIN',
      activeTenantId: TEST_TENANT_ID,
      activeOrgUnitId: TEST_ORG_UNIT_ID,
      householdId: TEST_TENANT_ID,
      email: 'number-mapping-context@test.local',
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
        correlationId: 'corr-number-mapping-context',
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

describe('connectshyft number mapping helper boundary', () => {
  const resolvedContext = {
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    bypassedOrgUnitMembership: false,
    effectiveRoles: ['ORGUNIT_ADMIN'],
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
    jest.spyOn(accessContextModule, 'resolveConnectShyftActorRoles').mockReturnValue([
      'ORGUNIT_ADMIN',
    ]);
    jest.spyOn(accessContextModule, 'respondWithConnectShyftContextRefusal').mockImplementation((res) => res);
    jest.spyOn(accessContextModule, 'sendConnectShyftRouteRefusal').mockImplementation((res) => res);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the scoped create prerequisites and stable parsed payload for valid requests', async () => {
    const req = createRequest({
      body: {
        orgUnitId: `  ${TEST_ORG_UNIT_ID}  `,
        twilioNumberE164: '+12605550119',
        providerNumberE164: undefined,
        label: ' Night Dispatch ',
        isActive: 'false',
      } as any,
    });

    const context = await resolveConnectShyftNumberMappingCreateAccessContext(
      req,
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
      actorRoles: ['ORGUNIT_ADMIN'],
      payload: {
        orgUnitId: TEST_ORG_UNIT_ID,
        isActive: false,
        providerNumberE164: '+12605550119',
        label: ' Night Dispatch ',
      },
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'actorRoles',
      'context',
      'payload',
    ]);
    expect(accessContextModule.resolveConnectShyftRouteContextDecision).toHaveBeenCalledWith(
      req,
      {
        attemptedOrgUnitId: TEST_ORG_UNIT_ID,
      },
    );
    expect(accessContextModule.requestHasAnyCapability).toHaveBeenCalledWith(
      req,
      [CAPABILITIES.NUMBER_MAPPING_MANAGE],
      resolvedContext,
    );
  });

  it('returns the current client refusal when mappingId is missing', async () => {
    const res = createMockResponse();

    const context = await resolveConnectShyftNumberMappingUpdateAccessContext(
      createRequest({
        params: {
          mappingId: '   ',
        } as any,
      }),
      res,
    );

    expect(context).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_ID_REQUIRED',
      message: 'mappingId is required',
      refusalType: 'client',
      correlationId: 'corr-number-mapping-context',
      tenantId: TEST_TENANT_ID,
    }));
    expect(accessContextModule.resolveConnectShyftRouteContextDecision).not.toHaveBeenCalled();
  });

  it('maps orgUnit context prerequisite refusals through the shared context responder', async () => {
    const res = createMockResponse();
    jest.spyOn(accessContextModule, 'resolveConnectShyftRouteContextDecision').mockResolvedValueOnce({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      message: 'orgUnit context is required for ConnectShyft orgUnit-scoped routes',
      refusalType: 'business',
      httpStatus: 200,
    } as any);

    const context = await resolveConnectShyftNumberMappingCreateAccessContext(
      createRequest(),
      res,
    );

    expect(context).toBeNull();
    expect(accessContextModule.respondWithConnectShyftContextRefusal).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        ok: false,
        code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      }),
    );
    expect(accessContextModule.requestHasAnyCapability).not.toHaveBeenCalled();
  });

  it('stays prerequisite-only by returning only the scoped list context for list routes', async () => {
    const req = createRequest();

    const context = await resolveConnectShyftNumberMappingListAccessContext(
      req,
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'context',
    ]);
    expect(accessContextModule.resolveConnectShyftActorRoles).toHaveBeenCalledWith(
      req,
      resolvedContext,
    );
  });
});
