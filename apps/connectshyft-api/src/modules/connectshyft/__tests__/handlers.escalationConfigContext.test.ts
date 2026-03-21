import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  resolveConnectShyftEscalationConfigUpdateAccessContext,
  resolveConnectShyftEscalationRecipientsAccessContext,
} from '../http/escalationConfigContext';
import * as accessContextModule from '../http/accessContext';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const TEST_TENANT_ID = 'tenant-escalation-config-context';
const TEST_ORG_UNIT_ID = 'org-escalation-config-context-east';

const createRequest = (overrides: Partial<Request> = {}): Request => {
  const headers = Object.entries((overrides.headers || {}) as Record<string, string>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {},
  );

  return {
    body: {
      orgUnitId: TEST_ORG_UNIT_ID,
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-escalation-primary-1001',
        secondaryOrgUnitAdminUserId: 'user-escalation-secondary-1001',
        tenantStaffUserId: 'user-escalation-tenant-1001',
      },
      ...(overrides.body || {}),
    },
    query: {},
    user: {
      userId: 'user-escalation-config-context-1001',
      role: 'ORGUNIT_ADMIN',
      activeTenantId: TEST_TENANT_ID,
      activeOrgUnitId: TEST_ORG_UNIT_ID,
      householdId: TEST_TENANT_ID,
      email: 'escalation-config-context@test.local',
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
        correlationId: 'corr-escalation-config-context',
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

describe('connectshyft escalation config helper boundary', () => {
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

  it('returns the scoped update prerequisites and stable parsed config input', async () => {
    const req = createRequest({
      body: {
        orgUnitId: `  ${TEST_ORG_UNIT_ID}  `,
        escalationBaselineHours: '6',
        recipients: {
          primaryOrgUnitAdminUserId: 'user-escalation-primary-1001',
          secondaryOrgUnitAdminUserId: ' user-escalation-secondary-1001 ',
          tenantStaffUserId: '',
        },
      } as any,
    });

    const context = await resolveConnectShyftEscalationConfigUpdateAccessContext(
      req,
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
      actorRoles: ['ORGUNIT_ADMIN'],
      payload: {
        orgUnitId: TEST_ORG_UNIT_ID,
        escalationBaselineHours: '6',
        recipients: {
          primaryOrgUnitAdminUserId: 'user-escalation-primary-1001',
          secondaryOrgUnitAdminUserId: ' user-escalation-secondary-1001 ',
          tenantStaffUserId: '',
        },
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
      [CAPABILITIES.ORG_UNIT_ESCALATION_CONFIG],
      resolvedContext,
    );
  });

  it('maps capability refusals to the current escalation-config forbidden envelope', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValueOnce(false);

    const context = await resolveConnectShyftEscalationConfigUpdateAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_FORBIDDEN',
      message: 'Escalation configuration requires an authorized orgUnit role.',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('maps context prerequisite refusals through the shared context responder', async () => {
    const res = createMockResponse();
    jest.spyOn(accessContextModule, 'resolveConnectShyftRouteContextDecision').mockResolvedValueOnce({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      message: 'Cross-orgUnit context overrides are not allowed for this route',
      refusalType: 'business',
      httpStatus: 200,
    } as any);

    const context = await resolveConnectShyftEscalationConfigUpdateAccessContext(
      createRequest(),
      res,
    );

    expect(context).toBeNull();
    expect(accessContextModule.respondWithConnectShyftContextRefusal).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        ok: false,
        code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      }),
    );
    expect(accessContextModule.requestHasAnyCapability).not.toHaveBeenCalled();
  });

  it('stays prerequisite-only by returning only access context for recipients routes', async () => {
    const context = await resolveConnectShyftEscalationRecipientsAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
      actorRoles: ['ORGUNIT_ADMIN'],
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'actorRoles',
      'context',
    ]);
  });
});
