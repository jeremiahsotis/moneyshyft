import { Application, Router } from 'express';
import { requestCorrelation } from '../platform/middleware/requestCorrelation';
import { tenancyContext } from '../platform/middleware/tenancyContext';
import { authContext } from '../platform/middleware/authContext';
import { responseEnvelope } from '../platform/middleware/responseEnvelope';

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
  { path: '/api/v1/auth', modulePath: '../routes/api/v1/auth' },
];

const loadRouter = (modulePath: string): Router => {
  const mod = require(modulePath) as { default: Router };
  return mod.default;
};

export const registerPlatformMiddleware = (app: Application): void => {
  PLATFORM_MIDDLEWARE_CHAIN.forEach((middleware) => {
    app.use(middleware);
  });
};

export const registerV1Routes = (app: Application): void => {
  V1_ROUTE_REGISTRATIONS.forEach(({ path, modulePath }) => {
    app.use(path, loadRouter(modulePath));
  });
};

export const registerV1RoutesWithLoader = (
  app: Application,
  routeLoader: (modulePath: string) => Router
): void => {
  V1_ROUTE_REGISTRATIONS.forEach(({ path, modulePath }) => {
    app.use(path, routeLoader(modulePath));
  });
};
