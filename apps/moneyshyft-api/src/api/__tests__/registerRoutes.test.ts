import type { Application, Request, Response, Router } from 'express';
jest.mock('../../platform/tenantModuleEntitlements', () => ({
  evaluateActorTenantModuleEntitlement: jest.fn(),
}));

import {
  registerV1RoutesWithLoader,
  V1_ROUTE_REGISTRATIONS,
} from '../registerRoutes';
import { evaluateActorTenantModuleEntitlement } from '../../platform/tenantModuleEntitlements';

const mockedEvaluateActorTenantModuleEntitlement = evaluateActorTenantModuleEntitlement as jest.MockedFunction<
  typeof evaluateActorTenantModuleEntitlement
>;

type UseCall = {
  path: string;
  handlers: Array<unknown>;
};

const createAppStub = (): {
  app: Application;
  calls: UseCall[];
} => {
  const calls: UseCall[] = [];
  const app = {
    use: jest.fn((path: string, ...handlers: Array<unknown>) => {
      calls.push({ path, handlers });
    }),
  } as unknown as Application;

  return { app, calls };
};

type ResponseStub = Response & { payload?: unknown; ended?: boolean };

const createResponseStub = (): ResponseStub => {
  const res = {
    locals: {},
    statusCode: 200,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.payload = payload;
      res.ended = true;
      return res;
    },
    send(payload: unknown) {
      res.payload = payload;
      res.ended = true;
      return res;
    },
    setHeader() {
      return res;
    },
    getHeader() {
      return undefined;
    },
    end(payload?: unknown) {
      res.payload = payload;
      res.ended = true;
      return res;
    },
  } as unknown as ResponseStub;

  return res;
};

describe('registerRoutes moneyshyft entitlement guard', () => {
  beforeEach(() => {
    mockedEvaluateActorTenantModuleEntitlement.mockReset();
  });

  it('keeps non-governed paths mounted without the moneyshyft guard', () => {
    const { app, calls } = createAppStub();
    const router = {} as Router;

    registerV1RoutesWithLoader(app, () => router);

    const platformCall = calls.find((call) => call.path === '/api/v1/platform');

    expect(platformCall).toBeDefined();
    expect(platformCall?.handlers).toEqual([router]);
    expect(
      V1_ROUTE_REGISTRATIONS.some((registration) => registration.path === '/api/v1/platform')
    ).toBe(true);
  });

  it('returns a refusal envelope when the moneyshyft entitlement is disabled', async () => {
    const { app, calls } = createAppStub();
    const router = {} as Router;

    registerV1RoutesWithLoader(app, () => router);

    const governedCall = calls.find((call) => call.path === '/api/v1/accounts');
    expect(governedCall?.handlers).toHaveLength(2);

    mockedEvaluateActorTenantModuleEntitlement.mockResolvedValue({
      tenantId: '22222222-2222-4222-8222-222222222222',
      moduleKey: 'moneyshyft',
      enabled: false,
      reason: 'disabled',
      refusalCode: 'MONEYSHYFT_MODULE_DISABLED',
      message: 'moneyshyft is disabled for this tenant.',
    });

    const next = jest.fn();
    const res = createResponseStub();
    const req = {
      user: {
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'ORGUNIT_MEMBER',
        activeTenantId: '22222222-2222-4222-8222-222222222222',
      },
    } as unknown as Request;

    await (governedCall?.handlers[0] as (req: Request, res: Response, next: (error?: unknown) => void) => Promise<void>)(
      req,
      res,
      next
    );

    expect(mockedEvaluateActorTenantModuleEntitlement).toHaveBeenCalledWith(
      expect.anything(),
      {
        userId: '11111111-1111-4111-8111-111111111111',
        baseRole: 'ORGUNIT_MEMBER',
        headerRoles: [],
        activeTenantId: '22222222-2222-4222-8222-222222222222',
      },
      '22222222-2222-4222-8222-222222222222',
      'moneyshyft'
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'MONEYSHYFT_MODULE_DISABLED',
        message: 'moneyshyft is disabled for this tenant.',
      })
    );
  });

  it('falls through when the request has no tenant id', async () => {
    const { app, calls } = createAppStub();
    const router = {} as Router;

    registerV1RoutesWithLoader(app, () => router);

    const governedCall = calls.find((call) => call.path === '/api/v1/accounts');
    const next = jest.fn();

    await (governedCall?.handlers[0] as (req: Request, res: Response, next: (error?: unknown) => void) => Promise<void>)(
      { user: { userId: '11111111-1111-4111-8111-111111111111', role: 'ORGUNIT_MEMBER' } } as unknown as Request,
      createResponseStub(),
      next
    );

    expect(mockedEvaluateActorTenantModuleEntitlement).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});
