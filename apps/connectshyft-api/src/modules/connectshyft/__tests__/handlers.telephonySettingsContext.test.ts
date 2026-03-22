import type { Request, Response } from 'express';
import {
  resolveConnectShyftOperatorCallbackNumberUpdateAccessContext,
  resolveConnectShyftTelephonyReadinessAccessContext,
} from '../http/telephonySettingsContext';
import * as accessContextModule from '../http/accessContext';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const TEST_TENANT_ID = 'tenant-telephony-settings-context';
const TEST_ORG_UNIT_ID = 'org-telephony-settings-context-east';

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
      callbackNumber: '(317) 555-0100',
      ...(overrides.body || {}),
    },
    query: {},
    user: {
      userId: 'user-telephony-settings-context-1001',
      role: 'ORGUNIT_MEMBER',
      activeTenantId: TEST_TENANT_ID,
      activeOrgUnitId: TEST_ORG_UNIT_ID,
      householdId: TEST_TENANT_ID,
      email: 'telephony-settings-context@test.local',
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
        correlationId: 'corr-telephony-settings-context',
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

describe('connectshyft telephony settings helper boundary', () => {
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

  it('returns scoped operator callback-number update prerequisites and parsed payload', async () => {
    const req = createRequest({
      body: {
        callbackNumber: '  (317) 555-0100  ',
      } as any,
      headers: {
        'x-test-connectshyft-provider-requested': 'telnyx',
      } as any,
    });

    const context = await resolveConnectShyftOperatorCallbackNumberUpdateAccessContext(
      req,
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
      actorUserId: 'user-telephony-settings-context-1001',
      requestedProvider: 'telnyx',
      payload: {
        callbackNumber: '  (317) 555-0100  ',
      },
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'actorUserId',
      'context',
      'payload',
      'requestedProvider',
    ]);
  });

  it('maps capability refusals to the current callback-number forbidden envelope', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValueOnce(false);

    const context = await resolveConnectShyftOperatorCallbackNumberUpdateAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_FORBIDDEN',
      message:
        'Callback number management requires an authorized ConnectShyft operator with active orgUnit access.',
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

    const context = await resolveConnectShyftTelephonyReadinessAccessContext(
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
  });

  it('refuses telephony settings access when the actor context is missing', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;

    const context = await resolveConnectShyftTelephonyReadinessAccessContext(
      createRequest({
        user: {
          userId: '',
        } as any,
      }),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
      message: 'Telephony settings require an authenticated operator context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        surface: 'telephony_readiness',
      },
    });
  });
});
