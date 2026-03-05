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

const parseCommitmentIdParam = (req: Request): string =>
  normalizeNonEmptyString(req.params.commitmentId || null);

const parseCompletionBody = (req: Request) => ({
  idempotencyKey: normalizeNonEmptyString(
    req.body?.idempotencyKey
    || req.body?.completionIdempotencyKey,
  ),
  bridgeLineageId: normalizeNonEmptyString(
    req.body?.bridgeLineageId
    || req.body?.externalRef
    || req.body?.wpRequestId,
  ),
  reason: normalizeNonEmptyString(req.body?.reason),
});

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

const buildCompletionReason = (
  reason: string,
  idempotencyKey: string,
  bridgeLineageId: string,
): string => {
  if (reason) {
    return reason;
  }

  return `Bridge completion submitted [lineage=${bridgeLineageId}; key=${idempotencyKey}]`;
};

const applyIdempotentReplaySuccess = (
  req: Request,
  res: Response,
  resolved: {
    data: {
      commitment: {
        commitmentId: string;
        status: string;
      };
      state: unknown;
    };
  },
  idempotencyKey: string,
  bridgeLineageId: string,
  transitionApplied: boolean,
): void => {
  success(res, {
    code: transitionApplied
      ? 'ROUTE_BRIDGE_COMPLETION_APPLIED'
      : 'ROUTE_BRIDGE_COMPLETION_IDEMPOTENT_REPLAY',
    message: transitionApplied
      ? 'Bridge completion applied'
      : 'Bridge completion replay acknowledged',
    httpStatus: 200,
    data: localizeRouteResponseData(req, {
      bridge: {
        integration: 'wordpress',
        stateAuthority: 'monolith',
        lineageId: bridgeLineageId,
      },
      idempotency: {
        key: idempotencyKey,
        replayed: !transitionApplied,
      },
      completion: {
        commitmentId: resolved.data.commitment.commitmentId,
        transitionApplied,
      },
      canonicalLifecycle: resolved.data,
    }),
  });
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

  router.post('/fulfillment/:commitmentId/completion', async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const commitmentId = parseCommitmentIdParam(req);
    if (!commitmentId) {
      refusal(res, {
        code: 'ROUTE_COMMITMENT_ID_REQUIRED',
        message: 'commitmentId is required.',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const completion = parseCompletionBody(req);
    if (!completion.idempotencyKey) {
      refusal(res, {
        code: 'ROUTE_BRIDGE_IDEMPOTENCY_KEY_REQUIRED',
        message: 'idempotencyKey is required for bridge completion submissions.',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    if (!completion.bridgeLineageId) {
      refusal(res, {
        code: 'ROUTE_BRIDGE_LINEAGE_ID_REQUIRED',
        message: 'bridgeLineageId is required for bridge completion submissions.',
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

    const commitment = resolved.data.commitment;
    if (commitment.externalRef !== completion.bridgeLineageId) {
      refusal(res, {
        code: 'ROUTE_BRIDGE_LINEAGE_MISMATCH',
        message: 'bridgeLineageId does not match commitment lineage reference.',
        refusalType: 'business',
        httpStatus: 409,
        data: {
          commitmentId,
          commitmentExternalRef: commitment.externalRef,
          bridgeLineageId: completion.bridgeLineageId,
        },
      });
      return;
    }

    if (commitment.status === 'completed') {
      applyIdempotentReplaySuccess(
        req,
        res,
        resolved,
        completion.idempotencyKey,
        completion.bridgeLineageId,
        false,
      );
      return;
    }

    const transitioned = await commitmentService.transitionCommitment({
      tenantId,
      commitmentId,
      actorId: resolveActorId(req),
      nextStatus: 'completed',
      reason: buildCompletionReason(
        completion.reason,
        completion.idempotencyKey,
        completion.bridgeLineageId,
      ),
    });

    if (transitioned.ok) {
      success(res, {
        code: 'ROUTE_BRIDGE_COMPLETION_APPLIED',
        message: 'Bridge completion applied',
        httpStatus: 200,
        data: localizeRouteResponseData(req, {
          bridge: {
            integration: 'wordpress',
            stateAuthority: 'monolith',
            lineageId: completion.bridgeLineageId,
          },
          idempotency: {
            key: completion.idempotencyKey,
            replayed: false,
          },
          completion: {
            commitmentId,
            transitionApplied: true,
            transitionAuditId: transitioned.data.transition.transitionAuditId,
          },
          canonicalLifecycle: {
            commitment: transitioned.data.commitment,
            state: transitioned.data.state,
          },
        }),
      });
      return;
    }

    const resolvedAfterFailure = await commitmentService.resolveCommitment({
      tenantId,
      commitmentId,
    });
    if (
      !resolvedAfterFailure.ok
      || resolvedAfterFailure.data.commitment.status !== 'completed'
      || resolvedAfterFailure.data.commitment.externalRef !== completion.bridgeLineageId
    ) {
      applyServiceRefusal(res, transitioned);
      return;
    }

    applyIdempotentReplaySuccess(
      req,
      res,
      resolvedAfterFailure,
      completion.idempotencyKey,
      completion.bridgeLineageId,
      false,
    );
  });

  return router;
};

export default createRouteBridgeRouter();
