import { Request, Response, Router } from 'express';
import type { Knex } from 'knex';
import { authenticateToken } from '../../../middleware/auth';
import { refusal, success } from '../../../platform/envelopes/response';
import { requireTenantId, TenantScopeError } from '../../../platform/tenancy/tenantScope';
import { CommitmentService } from '../../../modules/route/application/commitmentService';
import { KnexCommitmentRepository } from '../../../modules/route/infrastructure/commitmentRepository';
import {
  localizeRouteOperationalData,
  resolveRouteTimezoneContext,
} from '../../../modules/route/api/timezoneAdapter';

const TEST_TENANT_HEADER = 'x-test-route-tenant-id';
const TEST_ACTOR_HEADER = 'x-test-route-actor-id';

const isNodeTestEnv = (): boolean => process.env.NODE_ENV?.trim().toLowerCase() === 'test';

const loadRouteDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

const defaultCommitmentService = new CommitmentService(
  new KnexCommitmentRepository(loadRouteDb()),
);

const normalizeNonEmptyString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const resolveTenantContext = (req: Request): string | null => {
  const resolvedTenant = normalizeNonEmptyString(
    req.user?.activeTenantId
    || req.user?.householdId
    || req.tenantContext?.tenantId
    || req.tenantId
    || null,
  );

  if (resolvedTenant) {
    return resolvedTenant;
  }

  if (!isNodeTestEnv()) {
    return null;
  }

  return normalizeNonEmptyString(req.header(TEST_TENANT_HEADER)) || null;
};

const resolveActorId = (req: Request): string | null => {
  const actorId = normalizeNonEmptyString(req.user?.userId || null);
  if (actorId) {
    return actorId;
  }

  if (!isNodeTestEnv()) {
    return null;
  }

  return normalizeNonEmptyString(req.header(TEST_ACTOR_HEADER)) || null;
};

const resolveOrgUnitContext = (req: Request): string | null => {
  const orgUnitId = normalizeNonEmptyString(
    req.user?.activeOrgUnitId
    || req.authContext?.orgUnitId
    || req.tenantContext?.orgUnitId
    || req.orgUnitId
    || null,
  );

  return orgUnitId || null;
};

const resolveTenantId = (req: Request, res: Response): string | null => {
  try {
    return requireTenantId(resolveTenantContext(req));
  } catch (error) {
    const message = error instanceof TenantScopeError
      ? error.message
      : 'Tenant context is required for Route bridge requests.';

    refusal(res, {
      code: 'ROUTE_TENANT_CONTEXT_REQUIRED',
      message,
      refusalType: 'security',
      httpStatus: 403,
    });

    return null;
  }
};

const resolveScopedOrgUnitId = (
  req: Request,
  res: Response,
  requestedOrgUnitId: string | null,
): string | null | undefined => {
  const scopedOrgUnitId = resolveOrgUnitContext(req);
  if (requestedOrgUnitId && !scopedOrgUnitId) {
    refusal(res, {
      code: 'ROUTE_ORG_UNIT_CONTEXT_REQUIRED',
      message: 'OrgUnit context is required when orgUnitId is provided.',
      refusalType: 'security',
      httpStatus: 403,
    });
    return undefined;
  }

  if (requestedOrgUnitId && scopedOrgUnitId && requestedOrgUnitId !== scopedOrgUnitId) {
    refusal(res, {
      code: 'ROUTE_ORG_UNIT_SCOPE_MISMATCH',
      message: 'orgUnitId must match active orgUnit context.',
      refusalType: 'security',
      httpStatus: 403,
      data: {
        activeOrgUnitId: scopedOrgUnitId,
        requestedOrgUnitId,
      },
    });
    return undefined;
  }

  return scopedOrgUnitId;
};

const parseFulfillmentCreateBody = (req: Request) => ({
  sourceType: normalizeNonEmptyString(req.body?.sourceType) || 'wordpress_fulfillment',
  sourceId: normalizeNonEmptyString(req.body?.sourceId || req.body?.fulfillmentId),
  orgUnitId: normalizeNonEmptyString(req.body?.orgUnitId) || null,
  externalRef: normalizeNonEmptyString(
    req.body?.externalRef
    || req.body?.bridgeLineageId
    || req.body?.wpRequestId,
  ) || null,
});

const parsePendingLimit = (req: Request): number => {
  const raw = normalizeNonEmptyString(req.query?.limit || null);
  if (!raw) {
    return 100;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(parsed, 500);
};

const parsePendingOrgUnit = (req: Request): string | null =>
  normalizeNonEmptyString(req.query?.orgUnitId || null) || null;

const applyServiceRefusal = (
  res: Response,
  rejected: {
    code: string;
    message: string;
    refusalType: 'business' | 'client' | 'security';
    httpStatus: number;
    data?: unknown;
  },
): void => {
  refusal(res, {
    code: rejected.code,
    message: rejected.message,
    refusalType: rejected.refusalType,
    httpStatus: rejected.httpStatus,
    data: rejected.data,
  });
};

const localizeRouteResponseData = (req: Request, data: unknown): Record<string, unknown> => {
  const timezoneContext = resolveRouteTimezoneContext(req);
  return localizeRouteOperationalData(data, timezoneContext);
};

export const createRouteBridgeRouter = (
  commitmentService: CommitmentService = defaultCommitmentService,
): Router => {
  const router = Router();

  router.get('/_health', (_req: Request, res: Response) => success(res, {
    code: 'ROUTE_BRIDGE_MODULE_HEALTHY',
    message: 'Route bridge module registered and healthy',
    data: {
      service: 'route-bridge',
      feature: 'wordpress-cutover',
    },
  }));

  router.use(authenticateToken);

  router.post('/fulfillment', async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const body = parseFulfillmentCreateBody(req);
    const scopedOrgUnitId = resolveScopedOrgUnitId(req, res, body.orgUnitId);
    if (scopedOrgUnitId === undefined) {
      return;
    }

    const created = await commitmentService.createCommitment({
      tenantId,
      actorId: resolveActorId(req),
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      orgUnitId: scopedOrgUnitId,
      externalRef: body.externalRef,
    });

    if (!created.ok) {
      applyServiceRefusal(res, created);
      return;
    }

    success(res, {
      code: 'ROUTE_BRIDGE_FULFILLMENT_CREATED',
      message: 'Bridge fulfillment created',
      httpStatus: created.httpStatus,
      data: localizeRouteResponseData(req, {
        bridge: {
          integration: 'wordpress',
          stateAuthority: 'monolith',
        },
        canonicalLifecycle: created.data,
      }),
    });
  });

  router.get('/pending', async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const requestedOrgUnitId = parsePendingOrgUnit(req);
    const scopedOrgUnitId = resolveScopedOrgUnitId(req, res, requestedOrgUnitId);
    if (scopedOrgUnitId === undefined) {
      return;
    }

    const pending = await commitmentService.listPendingCommitments({
      tenantId,
      orgUnitId: scopedOrgUnitId,
      limit: parsePendingLimit(req),
    });

    if (!pending.ok) {
      applyServiceRefusal(res, pending);
      return;
    }

    success(res, {
      code: 'ROUTE_BRIDGE_PENDING_FETCH_RESOLVED',
      message: 'Bridge pending commitments resolved',
      httpStatus: pending.httpStatus,
      data: localizeRouteResponseData(req, {
        bridge: {
          integration: 'wordpress',
          stateAuthority: 'monolith',
        },
        generatedAtUtc: new Date().toISOString(),
        canonicalLifecycle: pending.data,
      }),
    });
  });

  return router;
};

export default createRouteBridgeRouter();
