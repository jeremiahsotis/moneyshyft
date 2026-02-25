import { Application, Request, Response, Router } from 'express';
import { requestCorrelation } from '../platform/middleware/requestCorrelation';
import { tenancyContext } from '../platform/middleware/tenancyContext';
import { authContext } from '../platform/middleware/authContext';
import { responseEnvelope } from '../platform/middleware/responseEnvelope';
import { refusal } from '../platform/envelopes/response';
import {
  evaluateActorTenantModuleEntitlement,
  type PlatformAdminActorContext,
} from '../services/PlatformAdminService';
import type { Knex } from 'knex';

type RouteRegistration = {
  path: string;
  modulePath: string;
};

export const PLATFORM_MIDDLEWARE_ORDER = [
  'correlation',
  'tenancy',
  'auth-context',
  'response-envelope'
] as const;

export const PLATFORM_MIDDLEWARE_CHAIN = [
  requestCorrelation,
  tenancyContext,
  authContext,
  responseEnvelope
];

export const V1_ROUTE_REGISTRATIONS: RouteRegistration[] = [
  { path: '/api/v1/platform', modulePath: '../routes/api/v1/platform-contracts' },
  { path: '/api/v1/platform/admin', modulePath: '../routes/api/v1/platform-admin' },
  { path: '/api/v1/route', modulePath: '../routes/api/v1/route' },
  { path: '/api/v1/connectshyft', modulePath: '../routes/api/v1/connectshyft' },
  { path: '/api/v1/auth', modulePath: '../routes/api/v1/auth' },
  { path: '/api/v1/accounts', modulePath: '../routes/api/v1/accounts' },
  { path: '/api/v1/transactions', modulePath: '../routes/api/v1/transactions' },
  { path: '/api/v1/transactions', modulePath: '../routes/api/v1/splits' },
  { path: '/api/v1/categories', modulePath: '../routes/api/v1/categories' },
  { path: '/api/v1/goals', modulePath: '../routes/api/v1/goals' },
  { path: '/api/v1/budgets', modulePath: '../routes/api/v1/budgets' },
  { path: '/api/v1/income', modulePath: '../routes/api/v1/income' },
  { path: '/api/v1/debts', modulePath: '../routes/api/v1/debts' },
  { path: '/api/v1/assignments', modulePath: '../routes/api/v1/assignments' },
  { path: '/api/v1/households', modulePath: '../routes/api/v1/households' },
  { path: '/api/v1/recurring-transactions', modulePath: '../routes/api/v1/recurring-transactions' },
  { path: '/api/v1/extra-money', modulePath: '../routes/api/v1/extra-money' },
  { path: '/api/v1/settings', modulePath: '../routes/api/v1/settings' },
  { path: '/api/v1/scenarios', modulePath: '../routes/api/v1/scenarios' },
  { path: '/api/v1/tags', modulePath: '../routes/api/v1/tags' }
];

const loadRouter = (modulePath: string): Router => {
  const mod = require(modulePath) as { default: Router };
  return mod.default;
};

const loadPlatformDb = (): Knex => {
  const knexModule = require('../config/knex') as { default: Knex };
  return knexModule.default;
};

const MONEYSHYFT_GOVERNED_PATHS = new Set<string>([
  '/api/v1/accounts',
  '/api/v1/transactions',
  '/api/v1/categories',
  '/api/v1/goals',
  '/api/v1/budgets',
  '/api/v1/income',
  '/api/v1/debts',
  '/api/v1/assignments',
  '/api/v1/households',
  '/api/v1/recurring-transactions',
  '/api/v1/extra-money',
  '/api/v1/settings',
  '/api/v1/scenarios',
  '/api/v1/tags',
]);

const actorFromRequest = (req: Request): PlatformAdminActorContext => ({
  userId: req.user?.userId || null,
  baseRole: req.user?.role || null,
  headerRoles: [],
  activeTenantId: req.user?.activeTenantId || req.user?.householdId || null,
});

const resolveTenantId = (req: Request): string | null => {
  return req.user?.activeTenantId || req.user?.householdId || null;
};

const applyRouteWithOptionalMoneyShyftGuard = (app: Application, path: string, router: Router): void => {
  if (!MONEYSHYFT_GOVERNED_PATHS.has(path)) {
    app.use(path, router);
    return;
  }

  app.use(path, async (req: Request, res: Response, next) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      next();
      return;
    }

    try {
      const decision = await evaluateActorTenantModuleEntitlement(
        loadPlatformDb(),
        actorFromRequest(req),
        tenantId,
        'moneyshyft',
      );

      if (decision.enabled) {
        next();
        return;
      }

      refusal(res, {
        code: decision.refusalCode,
        message: decision.message,
        refusalType: 'business',
        httpStatus: 200,
        data: {
          moduleKey: decision.moduleKey,
          tenantId: decision.tenantId,
          reason: decision.reason,
        },
      });
    } catch (error) {
      next(error);
    }
  }, router);
};

export const registerPlatformMiddleware = (app: Application): void => {
  PLATFORM_MIDDLEWARE_CHAIN.forEach((middleware) => {
    app.use(middleware);
  });
};

export const registerV1Routes = (app: Application): void => {
  V1_ROUTE_REGISTRATIONS.forEach(({ path, modulePath }) => {
    applyRouteWithOptionalMoneyShyftGuard(app, path, loadRouter(modulePath));
  });
};

export const registerV1RoutesWithLoader = (
  app: Application,
  routeLoader: (modulePath: string) => Router
): void => {
  V1_ROUTE_REGISTRATIONS.forEach(({ path, modulePath }) => {
    applyRouteWithOptionalMoneyShyftGuard(app, path, routeLoader(modulePath));
  });
};
