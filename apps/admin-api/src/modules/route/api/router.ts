import { Request, Response, Router } from 'express';
import { refusal, success } from '../../../platform/envelopes/response';
import { CAPABILITIES, hasCapability } from '../../../platform/rbac/capabilities';
import {
  routeRefusalService,
  type RouteRefusalService,
} from '../application/refusalService';

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const resolveActorUserId = (req: Request): string | null => {
  const actorUserId = normalizeString(req.user?.userId || null);
  return actorUserId || null;
};

const resolveIdempotencyKey = (req: Request): string | null => {
  const idempotencyKey = normalizeString(
    req.header('idempotency-key') || req.header('Idempotency-Key'),
  );
  return idempotencyKey || null;
};

const resolveTenantId = (req: Request): string => {
  return normalizeString(req.user?.activeTenantId || req.user?.householdId || null);
};

const parseRefusalBody = (req: Request): {
  reasonCode: unknown;
  reasonMessage: unknown;
  alternatives: unknown;
  requestId: string | null;
} => {
  return {
    reasonCode: req.body?.reasonCode ?? req.body?.refusal_code,
    reasonMessage: req.body?.reasonMessage ?? req.body?.refusal_message,
    alternatives: req.body?.alternatives,
    requestId: normalizeString(req.body?.requestId) || null,
  };
};

const requireAuthenticatedUser = (req: Request, res: Response): boolean => {
  if (req.user?.userId) {
    return true;
  }

  refusal(res, {
    code: 'AUTH_REQUIRED',
    message: 'Authenticated staff context is required for route refusal operations.',
    refusalType: 'security',
    httpStatus: 401,
  });
  return false;
};

const requireResolvedTenant = (req: Request, res: Response): boolean => {
  const tenantId = resolveTenantId(req);
  if (tenantId) {
    return true;
  }

  refusal(res, {
    code: 'ROUTE_TENANT_CONTEXT_REQUIRED',
    message: 'Active tenant context is required.',
    refusalType: 'security',
    httpStatus: 403,
  });
  return false;
};

const hasAnyCapability = (
  req: Request,
  capabilities: Array<(typeof CAPABILITIES)[keyof typeof CAPABILITIES]>,
): boolean => {
  return capabilities.some((capability) => hasCapability([req.user?.role || null], capability));
};

const requireRefusalWriteCapability = (req: Request, res: Response): boolean => {
  const allowed = hasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_CLOSE,
    CAPABILITIES.ORG_UNIT_THREAD_TAKEOVER,
    CAPABILITIES.THREAD_TAKEOVER_ALL,
  ]);
  if (allowed) {
    return true;
  }

  refusal(res, {
    code: 'ROUTE_REFUSAL_FORBIDDEN',
    message: 'Route refusal operations require an authorized staff role.',
    refusalType: 'security',
    httpStatus: 403,
  });
  return false;
};

const requireHistoryReadCapability = (req: Request, res: Response): boolean => {
  const allowed = hasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.THREAD_VIEW_ALL,
    CAPABILITIES.TENANT_READ_ALL,
  ]);
  if (allowed) {
    return true;
  }

  refusal(res, {
    code: 'ROUTE_REFUSAL_HISTORY_FORBIDDEN',
    message: 'Route refusal history access requires an authorized staff role.',
    refusalType: 'security',
    httpStatus: 403,
  });
  return false;
};

const ensureStaffWriteAccess = (req: Request, res: Response): boolean => {
  if (!requireAuthenticatedUser(req, res)) {
    return false;
  }
  if (!requireResolvedTenant(req, res)) {
    return false;
  }
  return requireRefusalWriteCapability(req, res);
};

const ensureStaffHistoryAccess = (req: Request, res: Response): boolean => {
  if (!requireAuthenticatedUser(req, res)) {
    return false;
  }
  if (!requireResolvedTenant(req, res)) {
    return false;
  }
  return requireHistoryReadCapability(req, res);
};

export const createRouteRouter = (
  service: RouteRefusalService = routeRefusalService,
): Router => {
  const router = Router();

  router.get('/_health', (_req: Request, res: Response) => {
    return success(res, {
      code: 'ROUTE_MODULE_HEALTHY',
      message: 'Route module registered and healthy',
      data: {
        capability: 'refusal-outcomes',
      },
    });
  });

  router.post('/staff/requests/:requestId/refuse', async (req: Request, res: Response) => {
    if (!ensureStaffWriteAccess(req, res)) {
      return;
    }

    const requestId = normalizeString(req.params.requestId);
    const tenantId = resolveTenantId(req);
    const body = parseRefusalBody(req);

    const result = await service.issueRequestRefusal({
      tenantId,
      requestId,
      reasonCode: body.reasonCode,
      reasonMessage: body.reasonMessage,
      alternatives: body.alternatives,
      actorUserId: resolveActorUserId(req),
      idempotencyKey: resolveIdempotencyKey(req),
    });

    if (!result.ok) {
      refusal(res, {
        code: result.code,
        message: result.message,
        refusalType: result.refusalType,
        httpStatus: result.httpStatus,
        data: result.data,
      });
      return;
    }

    success(res, {
      code: result.code,
      message: result.message,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  });

  router.post('/staff/commitments/:commitmentId/refuse', async (req: Request, res: Response) => {
    if (!ensureStaffWriteAccess(req, res)) {
      return;
    }

    const commitmentId = normalizeString(req.params.commitmentId);
    const tenantId = resolveTenantId(req);
    const body = parseRefusalBody(req);

    const result = await service.issueCommitmentRefusal({
      tenantId,
      commitmentId,
      requestId: body.requestId,
      reasonCode: body.reasonCode,
      reasonMessage: body.reasonMessage,
      alternatives: body.alternatives,
      actorUserId: resolveActorUserId(req),
      idempotencyKey: resolveIdempotencyKey(req),
    });

    if (!result.ok) {
      refusal(res, {
        code: result.code,
        message: result.message,
        refusalType: result.refusalType,
        httpStatus: result.httpStatus,
        data: result.data,
      });
      return;
    }

    success(res, {
      code: result.code,
      message: result.message,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  });

  router.get('/staff/requests/:requestId/history', async (req: Request, res: Response) => {
    if (!ensureStaffHistoryAccess(req, res)) {
      return;
    }

    const requestId = normalizeString(req.params.requestId);
    const tenantId = resolveTenantId(req);

    const result = await service.getRequestHistory({
      tenantId,
      scopeId: requestId,
    });

    if (!result.ok) {
      refusal(res, {
        code: result.code,
        message: result.message,
        refusalType: result.refusalType,
        httpStatus: result.httpStatus,
        data: result.data,
      });
      return;
    }

    success(res, {
      code: result.code,
      message: result.message,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  });

  router.get('/staff/commitments/:commitmentId/history', async (req: Request, res: Response) => {
    if (!ensureStaffHistoryAccess(req, res)) {
      return;
    }

    const commitmentId = normalizeString(req.params.commitmentId);
    const tenantId = resolveTenantId(req);

    const result = await service.getCommitmentHistory({
      tenantId,
      scopeId: commitmentId,
    });

    if (!result.ok) {
      refusal(res, {
        code: result.code,
        message: result.message,
        refusalType: result.refusalType,
        httpStatus: result.httpStatus,
        data: result.data,
      });
      return;
    }

    success(res, {
      code: result.code,
      message: result.message,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  });

  return router;
};

export default createRouteRouter();
