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
const TEST_CUTOVER_STAGE_HEADER = 'x-test-route-cutover-stage';

const ROUTE_BRIDGE_SOURCE_TYPE = 'wordpress_fulfillment';
const ROUTE_BRIDGE_CUTOVER_STAGE_ENV = 'ROUTESHYFT_WP_CUTOVER_STAGE';
const ROUTE_BRIDGE_WRITE_MODE_HEADER = 'x-route-wp-write-mode';
const ROUTE_BRIDGE_WRITE_MODE_BODY_FIELD = 'wpWriteMode';
const ROUTE_BRIDGE_WRITE_MODE_ASSERTION = 'api_only';

type RouteBridgeCutoverStage = 'bridge' | 'monolith_authoritative' | 'read_only';

type RouteBridgeCutoverState = {
  stage: RouteBridgeCutoverStage;
  dualWritePreventionActive: boolean;
  writeBlocked: boolean;
  requiresApiOnlyAssertion: boolean;
  invalidConfiguration: boolean;
  configuredStage: string;
};

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

const isRouteBridgeCutoverStage = (value: string): value is RouteBridgeCutoverStage =>
  value === 'bridge' || value === 'monolith_authoritative' || value === 'read_only';

const resolveRouteBridgeCutoverState = (req: Request): RouteBridgeCutoverState => {
  const envStage = normalizeNonEmptyString(process.env[ROUTE_BRIDGE_CUTOVER_STAGE_ENV] || 'bridge')
    .toLowerCase();
  const testStage = isNodeTestEnv()
    ? normalizeNonEmptyString(req.header(TEST_CUTOVER_STAGE_HEADER) || '').toLowerCase()
    : '';
  const configuredStage = testStage || envStage || 'bridge';

  if (!isRouteBridgeCutoverStage(configuredStage)) {
    return {
      stage: 'read_only',
      dualWritePreventionActive: true,
      writeBlocked: true,
      requiresApiOnlyAssertion: false,
      invalidConfiguration: true,
      configuredStage,
    };
  }

  return {
    stage: configuredStage,
    dualWritePreventionActive: configuredStage !== 'bridge',
    writeBlocked: configuredStage === 'read_only',
    requiresApiOnlyAssertion: configuredStage === 'monolith_authoritative',
    invalidConfiguration: false,
    configuredStage,
  };
};

const resolveApiOnlyAssertion = (req: Request): boolean => {
  const headerMode = normalizeNonEmptyString(req.header(ROUTE_BRIDGE_WRITE_MODE_HEADER) || '').toLowerCase();
  if (headerMode === ROUTE_BRIDGE_WRITE_MODE_ASSERTION) {
    return true;
  }

  const bodyMode = normalizeNonEmptyString(req.body?.[ROUTE_BRIDGE_WRITE_MODE_BODY_FIELD] || '').toLowerCase();
  return bodyMode === ROUTE_BRIDGE_WRITE_MODE_ASSERTION;
};

const buildBridgeMetadata = (
  cutover: RouteBridgeCutoverState,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  integration: 'wordpress',
  stateAuthority: 'monolith',
  cutover: {
    stage: cutover.stage,
    dualWritePreventionActive: cutover.dualWritePreventionActive,
    writeBlocked: cutover.writeBlocked,
    requiresApiOnlyAssertion: cutover.requiresApiOnlyAssertion,
    invalidConfiguration: cutover.invalidConfiguration,
    configuredStage: cutover.configuredStage,
  },
  ...overrides,
});

const enforceBridgeMutationCutoverPolicy = (
  req: Request,
  res: Response,
  cutover: RouteBridgeCutoverState,
): boolean => {
  if (cutover.invalidConfiguration) {
    refusal(res, {
      code: 'ROUTE_BRIDGE_CUTOVER_CONFIGURATION_INVALID',
      message: `Cutover stage configuration '${cutover.configuredStage}' is invalid. Bridge mutation paths are fail-closed until corrected.`,
      refusalType: 'security',
      httpStatus: 503,
      data: {
        expectedStages: ['bridge', 'monolith_authoritative', 'read_only'],
      },
    });
    return false;
  }

  if (cutover.writeBlocked) {
    refusal(res, {
      code: 'ROUTE_BRIDGE_CUTOVER_STAGE_BLOCKS_WRITE',
      message: 'Route bridge write paths are disabled for the current cutover stage.',
      refusalType: 'business',
      httpStatus: 409,
      data: {
        stage: cutover.stage,
      },
    });
    return false;
  }

  if (cutover.requiresApiOnlyAssertion && !resolveApiOnlyAssertion(req)) {
    refusal(res, {
      code: 'ROUTE_BRIDGE_DUAL_WRITE_BLOCKED',
      message: 'Bridge write rejected because api_only assertion is required at current cutover stage.',
      refusalType: 'business',
      httpStatus: 409,
      data: {
        stage: cutover.stage,
        requiredWriteMode: ROUTE_BRIDGE_WRITE_MODE_ASSERTION,
        writeModeHeader: ROUTE_BRIDGE_WRITE_MODE_HEADER,
        writeModeBodyField: ROUTE_BRIDGE_WRITE_MODE_BODY_FIELD,
      },
    });
    return false;
  }

  return true;
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
  sourceType: normalizeNonEmptyString(req.body?.sourceType) || ROUTE_BRIDGE_SOURCE_TYPE,
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

const parseSourceType = (req: Request): string =>
  normalizeNonEmptyString(req.query?.sourceType || null) || ROUTE_BRIDGE_SOURCE_TYPE;

const parseReconciliationLimit = (req: Request): number => {
  const raw = normalizeNonEmptyString(req.query?.limit || null);
  if (!raw) {
    return 1000;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 1000;
  }

  return Math.min(parsed, 5000);
};

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
  const cutover = resolveRouteBridgeCutoverState(req);
  success(res, {
    code: transitionApplied
      ? 'ROUTE_BRIDGE_COMPLETION_APPLIED'
      : 'ROUTE_BRIDGE_COMPLETION_IDEMPOTENT_REPLAY',
    message: transitionApplied
      ? 'Bridge completion applied'
      : 'Bridge completion replay acknowledged',
    httpStatus: 200,
    data: localizeRouteResponseData(req, {
      bridge: buildBridgeMetadata(cutover, {
        lineageId: bridgeLineageId,
      }),
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

const applyFulfillmentReplaySuccess = (
  req: Request,
  res: Response,
  resolved: {
    data: {
      commitment: {
        commitmentId: string;
      };
      state: unknown;
    };
  },
): void => {
  const cutover = resolveRouteBridgeCutoverState(req);
  success(res, {
    code: 'ROUTE_BRIDGE_FULFILLMENT_IDEMPOTENT_REPLAY',
    message: 'Bridge fulfillment replay acknowledged',
    httpStatus: 200,
    data: localizeRouteResponseData(req, {
      bridge: buildBridgeMetadata(cutover),
      idempotency: {
        replayed: true,
      },
      canonicalLifecycle: resolved.data,
    }),
  });
};

type ReconciliationDuplicateViolation = {
  key: string;
  count: number;
  commitmentIds: string[];
};

const collectDuplicateViolations = (
  items: Array<{
    commitmentId: string;
    key: string | null;
  }>,
): ReconciliationDuplicateViolation[] => {
  const grouped = new Map<string, string[]>();

  items.forEach((item) => {
    if (!item.key) {
      return;
    }

    const existing = grouped.get(item.key) || [];
    grouped.set(item.key, [...existing, item.commitmentId]);
  });

  return [...grouped.entries()]
    .filter((entry) => entry[1].length > 1)
    .sort((left, right) => right[1].length - left[1].length)
    .map(([key, commitmentIds]) => ({
      key,
      count: commitmentIds.length,
      commitmentIds,
    }));
};

const buildBridgeReconciliationData = (
  commitments: Array<{
    commitmentId: string;
    sourceId: string;
    externalRef: string | null;
  }>,
): {
  driftDetected: boolean;
  checks: Array<{
    name: string;
    ok: boolean;
    violationCount: number;
    violations: ReconciliationDuplicateViolation[];
  }>;
} => {
  const duplicateSourceIdViolations = collectDuplicateViolations(
    commitments.map((commitment) => ({
      commitmentId: commitment.commitmentId,
      key: commitment.sourceId,
    })),
  );

  const duplicateExternalRefViolations = collectDuplicateViolations(
    commitments.map((commitment) => ({
      commitmentId: commitment.commitmentId,
      key: commitment.externalRef,
    })),
  );

  const checks = [
    {
      name: 'duplicate_bridge_source_ids',
      ok: duplicateSourceIdViolations.length === 0,
      violationCount: duplicateSourceIdViolations.length,
      violations: duplicateSourceIdViolations,
    },
    {
      name: 'duplicate_bridge_lineage_refs',
      ok: duplicateExternalRefViolations.length === 0,
      violationCount: duplicateExternalRefViolations.length,
      violations: duplicateExternalRefViolations,
    },
  ];

  const driftDetected = checks.some((check) => !check.ok);
  return {
    driftDetected,
    checks,
  };
};

export const createRouteBridgeRouter = (
  commitmentService: CommitmentService = defaultCommitmentService,
): Router => {
  const router = Router();

  router.get('/_health', (req: Request, res: Response) => {
    const cutover = resolveRouteBridgeCutoverState(req);
    success(res, {
      code: 'ROUTE_BRIDGE_MODULE_HEALTHY',
      message: 'Route bridge module registered and healthy',
      data: {
        service: 'route-bridge',
        feature: 'wordpress-cutover',
        bridge: buildBridgeMetadata(cutover),
      },
    });
  });

  router.use(authenticateToken);

  router.post('/fulfillment', async (req: Request, res: Response) => {
    const cutover = resolveRouteBridgeCutoverState(req);
    if (!enforceBridgeMutationCutoverPolicy(req, res, cutover)) {
      return;
    }

    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const body = parseFulfillmentCreateBody(req);
    if (body.sourceType !== ROUTE_BRIDGE_SOURCE_TYPE) {
      refusal(res, {
        code: 'ROUTE_BRIDGE_SOURCE_TYPE_UNSUPPORTED',
        message: `Route bridge only accepts sourceType '${ROUTE_BRIDGE_SOURCE_TYPE}'.`,
        refusalType: 'client',
        httpStatus: 400,
        data: {
          receivedSourceType: body.sourceType,
          expectedSourceType: ROUTE_BRIDGE_SOURCE_TYPE,
        },
      });
      return;
    }

    const scopedOrgUnitId = resolveScopedOrgUnitId(req, res, body.orgUnitId);
    if (scopedOrgUnitId === undefined) {
      return;
    }

    if (cutover.dualWritePreventionActive) {
      const bySource = await commitmentService.findCommitmentBySource({
        tenantId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        orgUnitId: scopedOrgUnitId,
      });
      if (!bySource.ok) {
        applyServiceRefusal(res, bySource);
        return;
      }

      if (bySource.data.commitment) {
        const existing = bySource.data.commitment;
        if (
          body.externalRef
          && existing.externalRef
          && body.externalRef !== existing.externalRef
        ) {
          refusal(res, {
            code: 'ROUTE_BRIDGE_DUAL_WRITE_BLOCKED',
            message: 'Dual-write guard blocked fulfillment replay: sourceId is already mapped to a different bridge lineage.',
            refusalType: 'business',
            httpStatus: 409,
            data: {
              sourceId: body.sourceId,
              existingCommitmentId: existing.commitmentId,
              existingLineageId: existing.externalRef,
              requestedLineageId: body.externalRef,
            },
          });
          return;
        }

        const resolvedExisting = await commitmentService.resolveCommitment({
          tenantId,
          commitmentId: existing.commitmentId,
        });
        if (!resolvedExisting.ok) {
          applyServiceRefusal(res, resolvedExisting);
          return;
        }

        applyFulfillmentReplaySuccess(req, res, resolvedExisting);
        return;
      }

      if (body.externalRef) {
        const byExternalRef = await commitmentService.findCommitmentByExternalRef({
          tenantId,
          externalRef: body.externalRef,
          sourceType: body.sourceType,
          orgUnitId: scopedOrgUnitId,
        });
        if (!byExternalRef.ok) {
          applyServiceRefusal(res, byExternalRef);
          return;
        }

        if (byExternalRef.data.commitment && byExternalRef.data.commitment.sourceId !== body.sourceId) {
          refusal(res, {
            code: 'ROUTE_BRIDGE_DUAL_WRITE_BLOCKED',
            message: 'Dual-write guard blocked fulfillment replay: bridge lineage is already mapped to a different sourceId.',
            refusalType: 'business',
            httpStatus: 409,
            data: {
              sourceId: body.sourceId,
              requestedLineageId: body.externalRef,
              existingCommitmentId: byExternalRef.data.commitment.commitmentId,
              existingSourceId: byExternalRef.data.commitment.sourceId,
            },
          });
          return;
        }
      }
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
        bridge: buildBridgeMetadata(cutover),
        canonicalLifecycle: created.data,
      }),
    });
  });

  router.get('/pending', async (req: Request, res: Response) => {
    const cutover = resolveRouteBridgeCutoverState(req);
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
        bridge: buildBridgeMetadata(cutover),
        generatedAtUtc: new Date().toISOString(),
        canonicalLifecycle: pending.data,
      }),
    });
  });

  router.get('/reconciliation', async (req: Request, res: Response) => {
    const cutover = resolveRouteBridgeCutoverState(req);
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const requestedOrgUnitId = parsePendingOrgUnit(req);
    const scopedOrgUnitId = resolveScopedOrgUnitId(req, res, requestedOrgUnitId);
    if (scopedOrgUnitId === undefined) {
      return;
    }

    const sourceType = parseSourceType(req);
    const listed = await commitmentService.listCommitmentsBySourceType({
      tenantId,
      sourceType,
      orgUnitId: scopedOrgUnitId,
      limit: parseReconciliationLimit(req),
    });
    if (!listed.ok) {
      applyServiceRefusal(res, listed);
      return;
    }

    const reconciliation = buildBridgeReconciliationData(
      listed.data.items.map((commitment) => ({
        commitmentId: commitment.commitmentId,
        sourceId: commitment.sourceId,
        externalRef: commitment.externalRef,
      })),
    );
    const singleSourceOfTruthConfirmed = !reconciliation.driftDetected;

    success(res, {
      code: reconciliation.driftDetected
        ? 'ROUTE_BRIDGE_RECONCILIATION_DRIFT_DETECTED'
        : 'ROUTE_BRIDGE_RECONCILIATION_PASSED',
      message: reconciliation.driftDetected
        ? 'Bridge reconciliation found dual-write drift indicators.'
        : 'Bridge reconciliation confirms single-source state.',
      httpStatus: 200,
      data: localizeRouteResponseData(req, {
        bridge: buildBridgeMetadata(cutover),
        generatedAtUtc: new Date().toISOString(),
        reconciliation: {
          sourceType,
          commitmentCount: listed.data.total,
          driftDetected: reconciliation.driftDetected,
          singleSourceOfTruthConfirmed,
          checks: reconciliation.checks,
          actions: reconciliation.driftDetected
            ? ['Block cutover stage promotion and resolve duplicate source/lineage mappings.']
            : ['Cutover stage progression is clear for this tenant/orgUnit scope.'],
        },
      }),
    });
  });

  router.post('/fulfillment/:commitmentId/completion', async (req: Request, res: Response) => {
    const cutover = resolveRouteBridgeCutoverState(req);
    if (!enforceBridgeMutationCutoverPolicy(req, res, cutover)) {
      return;
    }

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
    if (cutover.dualWritePreventionActive && commitment.sourceType !== ROUTE_BRIDGE_SOURCE_TYPE) {
      refusal(res, {
        code: 'ROUTE_BRIDGE_DUAL_WRITE_BLOCKED',
        message: 'Dual-write guard rejected completion because commitment source is outside WP bridge scope.',
        refusalType: 'business',
        httpStatus: 409,
        data: {
          commitmentId,
          commitmentSourceType: commitment.sourceType,
          expectedSourceType: ROUTE_BRIDGE_SOURCE_TYPE,
          stage: cutover.stage,
        },
      });
      return;
    }

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
          bridge: buildBridgeMetadata(cutover, {
            lineageId: completion.bridgeLineageId,
          }),
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
