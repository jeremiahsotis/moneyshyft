import { Request, Response, Router } from 'express';
import type { Knex } from 'knex';
import { authenticateToken } from '../../../middleware/auth';
import { refusal, success } from '../../../platform/envelopes/response';
import { requireTenantId, TenantScopeError } from '../../../platform/tenancy/tenantScope';
import { normalizeRole } from '../../../platform/rbac/capabilities';
import { CommitmentService } from '../../../modules/route/application/commitmentService';
import { KnexCommitmentRepository } from '../../../modules/route/infrastructure/commitmentRepository';
import { isCommitmentStatus } from '../../../modules/route/domain/commitmentLifecycle';
import { IntakeService } from '../../../modules/route/application/intakeService';
import { KnexIntakeRequestRepository } from '../../../modules/route/infrastructure/intakeRequestRepository';
import { RouteIntakeChannel, RouteIntakePayload } from '../../../modules/route/domain/intakePolicy';
import { donorIntakeController } from '../../../modules/route/api/donorIntakeController';

const TEST_TENANT_HEADER = 'x-test-route-tenant-id';
const TEST_ACTOR_HEADER = 'x-test-route-actor-id';
const TEST_ROLE_HEADER = 'x-test-route-role';
const POLICY_EXCEPTION_ALLOWED_ROLES = new Set(['SYSTEM_ADMIN', 'TENANT_ADMIN']);

const isNodeTestEnv = (): boolean => process.env.NODE_ENV?.trim().toLowerCase() === 'test';

const loadRouteDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

const defaultCommitmentService = new CommitmentService(
  new KnexCommitmentRepository(loadRouteDb()),
);
const defaultIntakeService = new IntakeService(
  defaultCommitmentService,
  new KnexIntakeRequestRepository(loadRouteDb()),
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

const resolveRequestedRole = (req: Request): string | null => {
  const userRole = normalizeNonEmptyString(req.user?.role || null);
  if (userRole) {
    return userRole;
  }

  if (!isNodeTestEnv()) {
    return null;
  }

  return normalizeNonEmptyString(req.header(TEST_ROLE_HEADER)) || null;
};

const canApplyPolicyException = (req: Request): boolean => {
  const role = normalizeRole(resolveRequestedRole(req));
  if (!role) {
    return false;
  }

  return POLICY_EXCEPTION_ALLOWED_ROLES.has(role);
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

const parseCommitmentId = (req: Request): string => normalizeNonEmptyString(req.params.commitmentId || null);
const parseRequestId = (req: Request): string => normalizeNonEmptyString(req.params.requestId || null);

const parseCreateBody = (req: Request) => ({
  sourceType: normalizeNonEmptyString(req.body?.sourceType),
  sourceId: normalizeNonEmptyString(req.body?.sourceId),
  orgUnitId: normalizeNonEmptyString(req.body?.orgUnitId) || null,
  externalRef: normalizeNonEmptyString(req.body?.externalRef) || null,
});

const parseTransitionBody = (req: Request) => ({
  nextStatus: normalizeNonEmptyString(req.body?.nextStatus),
  reason: normalizeNonEmptyString(req.body?.reason),
  policyExceptionCode: normalizeNonEmptyString(req.body?.policyExceptionCode) || null,
});

const parseIntakeBody = (req: Request): RouteIntakePayload => ({
  tenantId: normalizeNonEmptyString(req.body?.tenantId),
  orgUnitId: normalizeNonEmptyString(req.body?.orgUnitId),
  requestedAtUtc: normalizeNonEmptyString(req.body?.requestedAtUtc),
  requestedWindowStartUtc: normalizeNonEmptyString(req.body?.requestedWindowStartUtc),
  requestedWindowEndUtc: normalizeNonEmptyString(req.body?.requestedWindowEndUtc),
  channel: normalizeNonEmptyString(req.body?.channel),
  notes: normalizeNonEmptyString(req.body?.notes),
  forceRefusal: (() => {
    if (typeof req.body?.forceRefusal === 'boolean') {
      return req.body.forceRefusal;
    }

    if (typeof req.body?.forceRefusal === 'string') {
      const normalized = req.body.forceRefusal.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return false;
  })(),
  scheduleMode: normalizeNonEmptyString(req.body?.scheduleMode) || null,
});

const resolveScopedCreateOrgUnitId = (
  req: Request,
  res: Response,
  requestedOrgUnitId: string | null,
): string | null | undefined => {
  const scopedOrgUnitId = resolveOrgUnitContext(req);
  const scopeMode = normalizeNonEmptyString(req.scopeMode || req.authContext?.scopeMode || null);

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

  if (scopeMode.toUpperCase() === 'ORG_UNIT' && !scopedOrgUnitId) {
    refusal(res, {
      code: 'ROUTE_ORG_UNIT_CONTEXT_REQUIRED',
      message: 'Active orgUnit context is required for orgUnit-scoped Route requests.',
      refusalType: 'security',
      httpStatus: 403,
    });
    return undefined;
  }

  return scopedOrgUnitId;
};

const resolveTenantId = (req: Request, res: Response): string | null => {
  try {
    const scopedTenant = requireTenantId(resolveTenantContext(req));
    return scopedTenant;
  } catch (error) {
    const message = error instanceof TenantScopeError
      ? error.message
      : 'Tenant context is required for Route module requests.';

    refusal(res, {
      code: 'ROUTE_TENANT_CONTEXT_REQUIRED',
      message,
      refusalType: 'security',
      httpStatus: 403,
    });
    return null;
  }
};

const resolveScopedIntakePayload = (
  req: Request,
  res: Response,
  tenantId: string,
  channel: RouteIntakeChannel,
): RouteIntakePayload | null => {
  const requested = parseIntakeBody(req);
  const scopedOrgUnitId = resolveOrgUnitContext(req);

  if (requested.tenantId && requested.tenantId !== tenantId) {
    refusal(res, {
      code: 'ROUTE_TENANT_SCOPE_MISMATCH',
      message: 'tenantId must match active tenant context.',
      refusalType: 'security',
      httpStatus: 403,
      data: {
        activeTenantId: tenantId,
        requestedTenantId: requested.tenantId,
      },
    });

    return null;
  }

  if (requested.orgUnitId && scopedOrgUnitId && requested.orgUnitId !== scopedOrgUnitId) {
    refusal(res, {
      code: 'ROUTE_ORG_UNIT_SCOPE_MISMATCH',
      message: 'orgUnitId must match active orgUnit context.',
      refusalType: 'security',
      httpStatus: 403,
      data: {
        activeOrgUnitId: scopedOrgUnitId,
        requestedOrgUnitId: requested.orgUnitId,
      },
    });

    return null;
  }

  if (!scopedOrgUnitId) {
    refusal(res, {
      code: 'ROUTE_ORG_UNIT_CONTEXT_REQUIRED',
      message: 'Active orgUnit context is required for intake requests.',
      refusalType: 'security',
      httpStatus: 403,
    });

    return null;
  }

  return {
    ...requested,
    tenantId,
    orgUnitId: scopedOrgUnitId,
    scheduleMode: requested.scheduleMode || 'pickup',
    channel: requested.channel || channel,
  };
};

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

const handleSubmitIntake = (
  intakeService: IntakeService,
  channel: RouteIntakeChannel,
) => async (req: Request, res: Response): Promise<void> => {
  const tenantId = resolveTenantId(req, res);
  if (!tenantId) {
    return;
  }

  const payload = resolveScopedIntakePayload(req, res, tenantId, channel);
  if (!payload) {
    return;
  }

  const result = await intakeService.submitIntake({
    tenantId,
    orgUnitId: payload.orgUnitId,
    actorId: resolveActorId(req),
    channel,
    payload,
  });

  if (!result.ok) {
    applyServiceRefusal(res, result);
    return;
  }

  success(res, {
    code: result.code,
    message: result.message,
    httpStatus: result.httpStatus,
    data: result.data,
  });
};

const handleResolveIntake = (
  intakeService: IntakeService,
  channel: RouteIntakeChannel,
) => async (req: Request, res: Response): Promise<void> => {
  const tenantId = resolveTenantId(req, res);
  if (!tenantId) {
    return;
  }

  const scopedOrgUnitId = resolveOrgUnitContext(req);
  if (!scopedOrgUnitId) {
    refusal(res, {
      code: 'ROUTE_ORG_UNIT_CONTEXT_REQUIRED',
      message: 'Active orgUnit context is required for intake requests.',
      refusalType: 'security',
      httpStatus: 403,
    });
    return;
  }

  const requestId = parseRequestId(req);
  if (!requestId) {
    refusal(res, {
      code: 'ROUTESHYFT_INTAKE_REQUEST_ID_REQUIRED',
      message: 'requestId is required.',
      refusalType: 'client',
      httpStatus: 400,
    });

    return;
  }

  const result = await intakeService.resolveIntake({
    tenantId,
    orgUnitId: scopedOrgUnitId,
    requestId,
    channel,
  });

  if (!result.ok) {
    applyServiceRefusal(res, result);
    return;
  }

  success(res, {
    code: result.code,
    message: result.message,
    httpStatus: result.httpStatus,
    data: result.data,
  });
};

export const createRouteRouter = (
  commitmentService: CommitmentService = defaultCommitmentService,
  intakeService: IntakeService = defaultIntakeService,
): Router => {
  const router = Router();

  router.get('/_health', (_req: Request, res: Response) => success(res, {
    code: 'ROUTE_MODULE_HEALTHY',
    message: 'Route module registered and healthy',
    data: {
      service: 'route',
      feature: 'commitment_lifecycle',
    },
  }));

  // Donor self-service intake is public and uses business refusal envelopes for outcome semantics.
  router.post('/intake/donor-requests', (req: Request, res: Response) => {
    const result = donorIntakeController.submit(req);

    if (result.ok) {
      return success(res, {
        code: result.code,
        message: result.message,
        data: result.data,
      });
    }

    return refusal(res, {
      code: result.code,
      message: result.message,
      refusalType: 'business',
      httpStatus: 200,
      data: result.data,
    });
  });

  router.get('/intake/donor-requests/:requestId', (req: Request, res: Response) => {
    const result = donorIntakeController.detail(req);

    if (result.ok) {
      return success(res, {
        code: result.code,
        message: result.message,
        data: result.data,
      });
    }

    return refusal(res, {
      code: result.code,
      message: result.message,
      refusalType: 'business',
      httpStatus: 200,
      data: result.data,
    });
  });

  router.use(authenticateToken);

  router.post('/commitments', async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const body = parseCreateBody(req);
    const scopedOrgUnitId = resolveScopedCreateOrgUnitId(req, res, body.orgUnitId);
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
      code: created.code,
      message: created.message,
      httpStatus: created.httpStatus,
      data: created.data,
    });
  });

  router.get('/commitments/:commitmentId', async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const commitmentId = parseCommitmentId(req);
    if (!commitmentId) {
      refusal(res, {
        code: 'ROUTE_COMMITMENT_ID_REQUIRED',
        message: 'commitmentId is required.',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const resolved = await commitmentService.resolveCommitment({
      tenantId,
      commitmentId,
    });

    if (!resolved.ok) {
      applyServiceRefusal(res, resolved);
      return;
    }

    success(res, {
      code: resolved.code,
      message: resolved.message,
      httpStatus: resolved.httpStatus,
      data: resolved.data,
    });
  });

  router.post('/commitments/:commitmentId/transitions', async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const commitmentId = parseCommitmentId(req);
    if (!commitmentId) {
      refusal(res, {
        code: 'ROUTE_COMMITMENT_ID_REQUIRED',
        message: 'commitmentId is required.',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const body = parseTransitionBody(req);
    if (!isCommitmentStatus(body.nextStatus)) {
      refusal(res, {
        code: 'ROUTE_COMMITMENT_INVALID_STATUS',
        message: 'nextStatus must be one of scheduled, in_progress, completed, canceled, or refused.',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const transitioned = await commitmentService.transitionCommitment({
      tenantId,
      commitmentId,
      actorId: resolveActorId(req),
      nextStatus: body.nextStatus,
      reason: body.reason,
      policyExceptionCode: body.policyExceptionCode,
      allowPolicyException: canApplyPolicyException(req),
    });

    if (!transitioned.ok) {
      applyServiceRefusal(res, transitioned);
      return;
    }

    success(res, {
      code: transitioned.code,
      message: transitioned.message,
      httpStatus: transitioned.httpStatus,
      data: transitioned.data,
    });
  });

  router.post('/intake/requests', handleSubmitIntake(intakeService, 'donor'));
  router.get('/intake/requests/:requestId', handleResolveIntake(intakeService, 'donor'));
  router.post('/intake/cashier-requests', handleSubmitIntake(intakeService, 'cashier'));
  router.get('/intake/cashier-requests/:requestId', handleResolveIntake(intakeService, 'cashier'));

  return router;
};

export default createRouteRouter();
