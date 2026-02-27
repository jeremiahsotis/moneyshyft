import { Request, Response, Router } from 'express';
import { refusal, success } from '../../../platform/envelopes/response';
import { routeRefusalService } from '../application/refusalService';

const router = Router();

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const resolveTenantId = (req: Request, res: Response): string => {
  const fromUser = normalizeString(req.user?.activeTenantId || req.user?.householdId || null);
  if (fromUser) {
    return fromUser;
  }

  const fromEnvelope = normalizeString(
    (res.locals as { responseEnvelope?: { tenantId?: string | null } })?.responseEnvelope?.tenantId,
  );
  if (fromEnvelope && fromEnvelope.toLowerCase() !== 'public') {
    return fromEnvelope;
  }

  const fromHeader = normalizeString(req.header('x-tenant-id'));
  if (fromHeader && fromHeader.toLowerCase() !== 'public') {
    return fromHeader;
  }

  return '';
};

const resolveActorUserId = (req: Request): string | null => {
  const actorUserId = normalizeString(req.user?.userId || null);
  return actorUserId || null;
};

const resolveIdempotencyKey = (req: Request): string | null => {
  const idempotencyKey = normalizeString(req.header('idempotency-key'));
  return idempotencyKey || null;
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

router.get('/_health', (_req: Request, res: Response) => {
  return success(res, {
    code: 'ROUTE_MODULE_HEALTHY',
    message: 'Route module registered and healthy',
    data: {
      capability: 'refusal-outcomes',
    },
  });
});

router.post('/staff/requests/:requestId/refuse', (req: Request, res: Response) => {
  const requestId = normalizeString(req.params.requestId);
  const tenantId = resolveTenantId(req, res);
  const body = parseRefusalBody(req);

  const result = routeRefusalService.issueRequestRefusal({
    tenantId,
    requestId,
    reasonCode: body.reasonCode,
    reasonMessage: body.reasonMessage,
    alternatives: body.alternatives,
    actorUserId: resolveActorUserId(req),
    idempotencyKey: resolveIdempotencyKey(req),
  });

  if (!result.ok) {
    return refusal(res, {
      code: result.code,
      message: result.message,
      refusalType: result.refusalType,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  }

  return success(res, {
    code: result.code,
    message: result.message,
    httpStatus: result.httpStatus,
    data: result.data,
  });
});

router.post('/staff/commitments/:commitmentId/refuse', (req: Request, res: Response) => {
  const commitmentId = normalizeString(req.params.commitmentId);
  const tenantId = resolveTenantId(req, res);
  const body = parseRefusalBody(req);

  const result = routeRefusalService.issueCommitmentRefusal({
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
    return refusal(res, {
      code: result.code,
      message: result.message,
      refusalType: result.refusalType,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  }

  return success(res, {
    code: result.code,
    message: result.message,
    httpStatus: result.httpStatus,
    data: result.data,
  });
});

router.get('/staff/requests/:requestId/history', (req: Request, res: Response) => {
  const requestId = normalizeString(req.params.requestId);
  const tenantId = resolveTenantId(req, res);

  const result = routeRefusalService.getRequestHistory({
    tenantId,
    scopeId: requestId,
  });

  if (!result.ok) {
    return refusal(res, {
      code: result.code,
      message: result.message,
      refusalType: result.refusalType,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  }

  return success(res, {
    code: result.code,
    message: result.message,
    httpStatus: result.httpStatus,
    data: result.data,
  });
});

router.get('/staff/commitments/:commitmentId/history', (req: Request, res: Response) => {
  const commitmentId = normalizeString(req.params.commitmentId);
  const tenantId = resolveTenantId(req, res);

  const result = routeRefusalService.getCommitmentHistory({
    tenantId,
    scopeId: commitmentId,
  });

  if (!result.ok) {
    return refusal(res, {
      code: result.code,
      message: result.message,
      refusalType: result.refusalType,
      httpStatus: result.httpStatus,
      data: result.data,
    });
  }

  return success(res, {
    code: result.code,
    message: result.message,
    httpStatus: result.httpStatus,
    data: result.data,
  });
});

export default router;
