import { Request, Response, Router } from 'express';
import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../../../config/knex';
import { authenticateToken } from '../../../middleware/auth';
import { refusal, replayEnvelope, success, error as errorEnvelope } from '../../../platform/envelopes/response';
import { CAPABILITIES, hasCapability } from '../../../platform/rbac/capabilities';
import {
  createOrgUnit,
  createTenant,
  ensureScopedAdminUser,
  evaluateRequestCapabilities,
  lookupScopedUsers,
  parseRoleSetBody,
  PlatformAdminActorContext,
  revokeOrgUnitMembership,
  revokeTenantMembership,
  upsertOrgUnitMembership,
  upsertTenantMembership,
  upsertTenantModuleEntitlement,
  updateOrgUnit,
} from '../../../services/PlatformAdminService';
import adminConsoleRouter from './platform-admin-console';

const router = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string => {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const isEmail = (value: unknown): value is string => typeof value === 'string' && EMAIL_PATTERN.test(value.trim());

const TENANCY_MODELS = new Set(['single-tenant', 'multi-tenant']);

const actorFromRequest = (req: Request): PlatformAdminActorContext => ({
  userId: req.user?.userId || null,
  baseRole: req.user?.role || null,
  headerRoles: [],
  activeTenantId: req.user?.activeTenantId || req.user?.householdId || null,
});

const getMessage = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);

const handleScopeErrors = (res: Response, error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === 'TENANT_SCOPE_REQUIRED') {
    refusal(res, {
      code: 'TENANT_SCOPE_REQUIRED',
      message: 'Active tenant context is required',
      refusalType: 'security',
      httpStatus: 403,
    });
    return true;
  }

  if (error.message === 'TENANT_SCOPE_MISMATCH') {
    refusal(res, {
      code: 'TENANT_SCOPE_MISMATCH',
      message: 'Cross-tenant mutations are not allowed for this actor',
      refusalType: 'security',
      httpStatus: 403,
    });
    return true;
  }

  if (error.message === 'TENANT_ID_REQUIRED') {
    refusal(res, {
      code: 'TENANT_ID_REQUIRED',
      message: 'tenantId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return true;
  }

  if (error.message === 'TENANT_NOT_FOUND') {
    refusal(res, {
      code: 'TENANT_NOT_FOUND',
      message: 'Active tenant scope was not found',
      refusalType: 'client',
      httpStatus: 404,
    });
    return true;
  }

  return false;
};

const handleForbiddenError = (res: Response, error: unknown, message: string): boolean => {
  if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
    refusal(res, {
      code: 'FORBIDDEN',
      message,
      refusalType: 'security',
      httpStatus: 403,
    });
    return true;
  }

  return false;
};

const handleModuleDisabledError = (res: Response, error: unknown): boolean => {
  if (error instanceof Error && error.message.startsWith('MODULE_DISABLED:')) {
    const moduleKey = error.message.slice('MODULE_DISABLED:'.length);
    refusal(res, {
      code: 'MODULE_DISABLED',
      message: `Module ${moduleKey} is disabled for this tenant`,
      refusalType: 'security',
      httpStatus: 403,
    });
    return true;
  }

  return false;
};

const handleModuleAssignmentBoundaryError = (res: Response, error: unknown): boolean => {
  if (error instanceof Error && error.message === 'FORBIDDEN_MODULE_ASSIGNMENT_BOUNDARY') {
    refusal(res, {
      code: 'MODULE_ASSIGNMENT_OUT_OF_BOUNDS',
      message: 'Tenant actor can only assign modules already granted by system administration',
      refusalType: 'security',
      httpStatus: 403,
    });
    return true;
  }

  return false;
};

const handleUserResolutionError = (res: Response, error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === 'USER_REFERENCE_REQUIRED') {
    refusal(res, {
      code: 'USER_REFERENCE_REQUIRED',
      message: 'Either userId or userEmail is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return true;
  }

  if (error.message === 'USER_NOT_FOUND' || error.message === 'USER_OUT_OF_SCOPE') {
    refusal(res, {
      code: 'ASSIGNABLE_USER_NOT_FOUND',
      message: 'User was not found in active tenant scope',
      refusalType: 'client',
      httpStatus: 404,
    });
    return true;
  }

  if (error.message === 'USER_LOOKUP_QUERY_TOO_SHORT') {
    refusal(res, {
      code: 'USER_LOOKUP_QUERY_TOO_SHORT',
      message: 'Lookup query must be at least 3 characters',
      refusalType: 'client',
      httpStatus: 400,
    });
    return true;
  }

  return false;
};

const handleOrgUnitHierarchyErrors = (res: Response, error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === 'ORG_UNIT_REPARENT_CONFLICT') {
    refusal(res, {
      code: 'ORG_UNIT_REPARENT_CONFLICT',
      message: 'Another orgUnit hierarchy update is in progress. Retry this operation.',
      refusalType: 'client',
      httpStatus: 409,
    });
    return true;
  }

  if (error.message === 'ORG_UNIT_CYCLE_DETECTED') {
    refusal(res, {
      code: 'ORG_UNIT_CYCLE_DETECTED',
      message: 'OrgUnit hierarchy update would create a cycle',
      refusalType: 'client',
      httpStatus: 409,
    });
    return true;
  }

  return false;
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ADMIN_NODE_TYPES = new Set(['SUBTENANT', 'ORGUNIT', 'GROUP']);
const ADMIN_MUTATION_IDEMPOTENCY_COLUMNS = [
  'actor_user_id',
  'idempotency_key',
  'request_method',
  'request_path',
] as const;
const GOVERNED_MODULES = ['connectshyft', 'moneyshyft'] as const;
const BCRYPT_ROUNDS = 12;

const isSystemAdminRequest = (req: Request): boolean => (req.user?.role || '').toUpperCase() === 'SYSTEM_ADMIN';

const resolveActiveTenantId = (req: Request): string | null => {
  const candidate = req.user?.activeTenantId || req.user?.householdId || null;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
};

const normalizeNodeType = (value: unknown): 'SUBTENANT' | 'ORGUNIT' | 'GROUP' => {
  if (typeof value !== 'string') {
    return 'ORGUNIT';
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'SUBTENANT' || normalized === 'GROUP' || normalized === 'ORGUNIT') {
    return normalized;
  }

  return 'ORGUNIT';
};

const normalizeModuleKey = (value: unknown): 'connectshyft' | 'moneyshyft' | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return (GOVERNED_MODULES as readonly string[]).includes(normalized)
    ? normalized as 'connectshyft' | 'moneyshyft'
    : null;
};

const buildIdempotencyRequestHash = (req: Request): string => {
  const method = req.method.toUpperCase();
  const path = req.path;
  const query = JSON.stringify(req.query || {});
  const body = JSON.stringify(req.body || {});
  return createHash('sha256')
    .update(`${method}:${path}:${query}:${body}`)
    .digest('hex');
};

const withAdminIdempotency = async (
  req: Request,
  res: Response,
  handler: () => Promise<void>,
): Promise<void> => {
  if (!WRITE_METHODS.has(req.method.toUpperCase())) {
    await handler();
    return;
  }

  const idempotencyKey = typeof req.header('Idempotency-Key') === 'string'
    ? req.header('Idempotency-Key')!.trim()
    : '';
  if (!idempotencyKey) {
    refusal(res, {
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key header is required for admin write operations',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const actorUserId = req.user?.userId || null;
  if (!actorUserId || !isUuid(actorUserId)) {
    refusal(res, {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authenticated actor context is required',
      refusalType: 'security',
      httpStatus: 401,
    });
    return;
  }

  const requestMethod = req.method.toUpperCase();
  const requestPath = req.path;
  const requestHash = buildIdempotencyRequestHash(req);

  const existing = await db
    .withSchema('platform')
    .table('idempotency_requests')
    .where({
      actor_user_id: actorUserId,
      idempotency_key: idempotencyKey,
      request_method: requestMethod,
      request_path: requestPath,
    })
    .first(['request_hash', 'response_http_status', 'response_payload']);

  if (existing) {
    if (typeof existing.request_hash === 'string' && existing.request_hash !== requestHash) {
      refusal(res, {
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        message: 'Idempotency-Key was already used with a different request payload',
        refusalType: 'client',
        httpStatus: 409,
      });
      return;
    }

    const statusCode = typeof existing.response_http_status === 'number'
      ? existing.response_http_status
      : 200;
    replayEnvelope(res, existing.response_payload, statusCode);
    return;
  }

  const mutableRes = res as Response & {
    status: (code: number) => Response;
    json: (body: unknown) => Response;
  };
  const originalStatus = mutableRes.status.bind(res);
  const originalJson = mutableRes.json.bind(res);
  let capturedStatus = 200;
  let capturedBody: unknown = undefined;

  mutableRes.status = ((code: number) => {
    capturedStatus = code;
    return originalStatus(code);
  }) as typeof mutableRes.status;

  mutableRes.json = ((body: unknown) => {
    capturedBody = body;
    return originalJson(body);
  }) as typeof mutableRes.json;

  try {
    await handler();
  } finally {
    mutableRes.status = originalStatus as typeof mutableRes.status;
    mutableRes.json = originalJson as typeof mutableRes.json;
  }

  if (capturedBody === undefined) {
    return;
  }

  try {
    await db
      .withSchema('platform')
      .table('idempotency_requests')
      .insert({
        id: randomUUID(),
        idempotency_key: idempotencyKey,
        request_method: requestMethod,
        request_path: requestPath,
        actor_user_id: actorUserId,
        tenant_id: resolveActiveTenantId(req),
        request_hash: requestHash,
        response_http_status: capturedStatus,
        response_payload: capturedBody,
      })
      .onConflict(ADMIN_MUTATION_IDEMPOTENCY_COLUMNS as unknown as string[])
      .ignore();
  } catch (_error) {
    // Fail-open for environments where idempotency persistence is not yet migrated.
  }
};

const isTenantAdminContext = async (
  req: Request,
  tenantId: string,
): Promise<boolean> => {
  if (isSystemAdminRequest(req)) {
    return true;
  }

  const evaluation = await evaluateRequestCapabilities(db, actorFromRequest(req), tenantId, undefined);
  return hasCapability(evaluation.roles, CAPABILITIES.ORG_UNIT_CREATE)
    || hasCapability(evaluation.roles, CAPABILITIES.TENANT_ROLE_ASSIGN)
    || hasCapability(evaluation.roles, CAPABILITIES.TENANT_READ_ALL);
};

router.use(authenticateToken);

router.get('/users/lookup', async (req: Request, res: Response) => {
  const tenantId = req.query.tenantId && typeof req.query.tenantId === 'string'
    ? req.query.tenantId
    : undefined;
  const orgUnitId = req.query.orgUnitId && typeof req.query.orgUnitId === 'string'
    ? req.query.orgUnitId
    : undefined;
  const q = req.query.q && typeof req.query.q === 'string'
    ? req.query.q
    : '';
  const page = req.query.page && typeof req.query.page === 'string'
    ? Number.parseInt(req.query.page, 10)
    : undefined;
  const pageSize = req.query.pageSize && typeof req.query.pageSize === 'string'
    ? Number.parseInt(req.query.pageSize, 10)
    : undefined;

  if ((tenantId !== undefined && !isUuid(tenantId)) || (orgUnitId !== undefined && !isUuid(orgUnitId))) {
    return refusal(res, {
      code: 'USER_LOOKUP_SCOPE_INVALID',
      message: 'tenantId and orgUnitId must be UUIDs when provided',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const lookup = await lookupScopedUsers(db, actorFromRequest(req), {
      tenantId,
      orgUnitId,
      q,
      page,
      pageSize,
    });

    return success(res, {
      code: 'SCOPED_USER_LOOKUP_RESOLVED',
      message: 'Scoped user lookup completed',
      data: lookup,
    });
  } catch (error) {
    if (handleScopeErrors(res, error) || handleUserResolutionError(res, error)) {
      return;
    }

    if (error instanceof Error && error.message === 'ORG_UNIT_NOT_FOUND') {
      refusal(res, {
        code: 'ORG_UNIT_NOT_FOUND',
        message: 'OrgUnit was not found in active tenant scope',
        refusalType: 'client',
        httpStatus: 404,
      });
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for scoped user lookup')) {
      return;
    }

    return errorEnvelope(res, {
      code: 'SCOPED_USER_LOOKUP_FAILED',
      message: getMessage(error, 'Failed to execute scoped user lookup'),
      httpStatus: 500,
    });
  }
});

router.post('/users/inline-admin', async (req: Request, res: Response) => {
  const {
    tenantId,
    userId,
    userEmail,
    firstName,
    lastName,
    temporaryPassword,
    forceResetOnFirstLogin,
    reason,
  } = req.body || {};

  const hasUserId = typeof userId === 'string' && userId.trim().length > 0;
  const hasUserEmail = typeof userEmail === 'string' && userEmail.trim().length > 0;

  if (
    (tenantId !== undefined && !isUuid(tenantId))
    || (hasUserId && !isUuid(userId))
    || (hasUserEmail && !isEmail(userEmail))
    || (!hasUserId && !hasUserEmail)
    || typeof reason !== 'string'
    || reason.trim() === ''
  ) {
    return refusal(res, {
      code: 'INLINE_ADMIN_INPUT_INVALID',
      message: 'tenantId (optional), reason, and either userId(UUID) or userEmail are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const ensuredUser = await ensureScopedAdminUser(db, actorFromRequest(req), {
      tenantId,
      userId,
      userEmail,
      firstName,
      lastName,
      temporaryPassword,
      forceResetOnFirstLogin,
      reason,
    });

    return success(res, {
      code: 'INLINE_ADMIN_USER_READY',
      message: 'Scoped admin identity resolved',
      data: ensuredUser,
    });
  } catch (error) {
    if (handleScopeErrors(res, error) || handleUserResolutionError(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for inline admin user resolution')) {
      return;
    }

    return errorEnvelope(res, {
      code: 'INLINE_ADMIN_USER_RESOLUTION_FAILED',
      message: getMessage(error, 'Failed to resolve inline admin identity'),
      httpStatus: 500,
    });
  }
});

router.post('/tenants', async (req: Request, res: Response) => {
  const {
    name,
    status,
    billingAccountName,
    assignTenantAdminUserId,
    assignTenantAdminUserEmail,
    assignTenantAdminFirstName,
    assignTenantAdminLastName,
    assignTenantAdminTemporaryPassword,
    assignTenantAdminForceResetOnFirstLogin,
    tenancyModel,
    moduleGrants,
    reason,
  } = req.body || {};

  if (typeof name !== 'string' || name.trim() === '') {
    return refusal(res, {
      code: 'TENANT_NAME_REQUIRED',
      message: 'name is required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  if (assignTenantAdminUserId !== undefined && !isUuid(assignTenantAdminUserId)) {
    return refusal(res, {
      code: 'TENANT_ADMIN_USER_ID_INVALID',
      message: 'assignTenantAdminUserId must be a UUID when provided',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  if (assignTenantAdminUserEmail !== undefined && !isEmail(assignTenantAdminUserEmail)) {
    return refusal(res, {
      code: 'TENANT_ADMIN_EMAIL_INVALID',
      message: 'assignTenantAdminUserEmail must be a valid email when provided',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  if (tenancyModel !== undefined && (typeof tenancyModel !== 'string' || !TENANCY_MODELS.has(tenancyModel))) {
    return refusal(res, {
      code: 'TENANCY_MODEL_INVALID',
      message: 'tenancyModel must be one of: single-tenant, multi-tenant',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  if (
    moduleGrants !== undefined
    && (
      typeof moduleGrants !== 'object'
      || moduleGrants === null
      || (
        (moduleGrants as { connectshyft?: unknown; moneyshyft?: unknown }).connectshyft !== undefined
        && typeof (moduleGrants as { connectshyft?: unknown }).connectshyft !== 'boolean'
      )
      || (
        (moduleGrants as { moneyshyft?: unknown }).moneyshyft !== undefined
        && typeof (moduleGrants as { moneyshyft?: unknown }).moneyshyft !== 'boolean'
      )
    )
  ) {
    return refusal(res, {
      code: 'TENANT_MODULE_GRANTS_INVALID',
      message: 'moduleGrants.connectshyft and moduleGrants.moneyshyft must be booleans when provided',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const created = await createTenant(db, actorFromRequest(req), {
      name,
      status,
      billingAccountName,
      assignTenantAdminUserId,
      assignTenantAdminUserEmail,
      assignTenantAdminFirstName,
      assignTenantAdminLastName,
      assignTenantAdminTemporaryPassword,
      assignTenantAdminForceResetOnFirstLogin,
      tenancyModel,
      moduleGrants,
      reason,
    });

    return success(res, {
      code: 'TENANT_CREATED',
      message: 'Tenant created successfully',
      data: created,
    });
  } catch (error) {
    if (handleForbiddenError(res, error, 'Insufficient permissions for tenant creation')) {
      return;
    }

    return errorEnvelope(res, {
      code: 'TENANT_CREATE_FAILED',
      message: getMessage(error, 'Failed to create tenant'),
      httpStatus: 500,
    });
  }
});

router.put('/module-entitlements', async (req: Request, res: Response) => {
  const { tenantId, moduleKey, enabled, reason } = req.body || {};

  if (
    (tenantId !== undefined && !isUuid(tenantId))
    ||
    typeof moduleKey !== 'string'
    || moduleKey.trim() === ''
    || typeof enabled !== 'boolean'
    || typeof reason !== 'string'
    || reason.trim() === ''
  ) {
    return refusal(res, {
      code: 'MODULE_ENTITLEMENT_INPUT_INVALID',
      message: 'moduleKey, enabled(boolean), and reason are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const updated = await upsertTenantModuleEntitlement(db, actorFromRequest(req), {
      tenantId,
      moduleKey,
      enabled,
      reason,
    });

    return success(res, {
      code: 'MODULE_ENTITLEMENT_UPDATED',
      message: 'Tenant module entitlement updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORG_UNIT_NOT_FOUND') {
      return refusal(res, {
        code: 'PARENT_ORG_UNIT_NOT_FOUND',
        message: 'Parent orgUnit was not found in active tenant scope',
        refusalType: 'client',
        httpStatus: 404,
      });
    }

    if (handleOrgUnitHierarchyErrors(res, error)) {
      return;
    }

    if (handleScopeErrors(res, error)) {
      return;
    }

    if (handleModuleAssignmentBoundaryError(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for module entitlement update')) {
      return;
    }

    return errorEnvelope(res, {
      code: 'MODULE_ENTITLEMENT_UPDATE_FAILED',
      message: getMessage(error, 'Failed to update tenant module entitlement'),
      httpStatus: 500,
    });
  }
});

router.post('/org-units', async (req: Request, res: Response) => {
  const { tenantId, name, type, parentOrgUnitId, status, reason } = req.body || {};

  if (
    typeof name !== 'string'
    || name.trim() === ''
    || (tenantId !== undefined && !isUuid(tenantId))
    || (parentOrgUnitId !== undefined && parentOrgUnitId !== null && !isUuid(parentOrgUnitId))
  ) {
    return refusal(res, {
      code: 'ORG_UNIT_INPUT_INVALID',
      message: 'name is required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const created = await createOrgUnit(db, actorFromRequest(req), {
      tenantId,
      name,
      type,
      parentOrgUnitId,
      status,
      reason,
    });

    return success(res, {
      code: 'ORG_UNIT_CREATED',
      message: 'OrgUnit created successfully',
      data: created,
    });
  } catch (error) {
    if (handleScopeErrors(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for org unit creation')) {
      return;
    }

    if (handleModuleDisabledError(res, error)) {
      return;
    }

    return errorEnvelope(res, {
      code: 'ORG_UNIT_CREATE_FAILED',
      message: getMessage(error, 'Failed to create org unit'),
      httpStatus: 500,
    });
  }
});

router.put('/org-units/:orgUnitId', async (req: Request, res: Response) => {
  const { tenantId, name, type, parentOrgUnitId, status, reason } = req.body || {};
  const orgUnitId = typeof req.params.orgUnitId === 'string' ? req.params.orgUnitId.trim() : '';

  if (!orgUnitId) {
    return refusal(res, {
      code: 'ORG_UNIT_INPUT_INVALID',
      message: 'orgUnitId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  if (
    !isUuid(orgUnitId)
    || (tenantId !== undefined && !isUuid(tenantId))
    || (parentOrgUnitId !== undefined && parentOrgUnitId !== null && !isUuid(parentOrgUnitId))
  ) {
    return refusal(res, {
      code: 'ORG_UNIT_INPUT_INVALID',
      message: 'orgUnitId, tenantId, and parentOrgUnitId must be UUIDs when provided',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  const hasPatch =
    (typeof name === 'string' && name.trim() !== '')
    || (typeof type === 'string' && type.trim() !== '')
    || (typeof status === 'string' && status.trim() !== '')
    || parentOrgUnitId !== undefined;

  if (!hasPatch) {
    return refusal(res, {
      code: 'ORG_UNIT_UPDATE_INPUT_INVALID',
      message: 'At least one patch field is required: name, type, status, parentOrgUnitId',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const updated = await updateOrgUnit(db, actorFromRequest(req), {
      tenantId,
      orgUnitId,
      name,
      type,
      parentOrgUnitId,
      status,
      reason,
    });

    return success(res, {
      code: 'ORG_UNIT_UPDATED',
      message: 'OrgUnit updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORG_UNIT_NOT_FOUND') {
      return refusal(res, {
        code: 'ORG_UNIT_NOT_FOUND',
        message: 'OrgUnit was not found in active tenant scope',
        refusalType: 'client',
        httpStatus: 404,
      });
    }

    if (handleOrgUnitHierarchyErrors(res, error)) {
      return;
    }

    if (handleScopeErrors(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for org unit update')) {
      return;
    }

    if (handleModuleDisabledError(res, error)) {
      return;
    }

    return errorEnvelope(res, {
      code: 'ORG_UNIT_UPDATE_FAILED',
      message: getMessage(error, 'Failed to update org unit'),
      httpStatus: 500,
    });
  }
});

router.post('/tenant-memberships', async (req: Request, res: Response) => {
  const { tenantId, userId, userEmail, firstName, lastName, roleSet, reason } = req.body || {};
  const parsedRoleSet = parseRoleSetBody(roleSet);
  const hasUserId = typeof userId === 'string' && userId.trim().length > 0;
  const hasUserEmail = typeof userEmail === 'string' && userEmail.trim().length > 0;

  if (
    (!hasUserId && !hasUserEmail)
    || (hasUserId && !isUuid(userId))
    || (hasUserEmail && !isEmail(userEmail))
    || (tenantId !== undefined && !isUuid(tenantId))
    || parsedRoleSet.length === 0
    || typeof reason !== 'string'
    || reason.trim() === ''
  ) {
    return refusal(res, {
      code: 'TENANT_MEMBERSHIP_INPUT_INVALID',
      message: 'userId(UUID) or userEmail, roleSet[], and reason are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const updated = await upsertTenantMembership(db, actorFromRequest(req), {
      tenantId,
      userId,
      userEmail,
      firstName,
      lastName,
      roleSet: parsedRoleSet,
      reason,
    });

    return success(res, {
      code: 'TENANT_MEMBERSHIP_UPDATED',
      message: 'Tenant membership updated successfully',
      data: updated,
    });
  } catch (error) {
    if (handleScopeErrors(res, error) || handleUserResolutionError(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for tenant membership update')) {
      return;
    }

    if (handleModuleDisabledError(res, error)) {
      return;
    }

    return errorEnvelope(res, {
      code: 'TENANT_MEMBERSHIP_UPDATE_FAILED',
      message: getMessage(error, 'Failed to update tenant membership'),
      httpStatus: 500,
    });
  }
});

router.delete('/tenant-memberships', async (req: Request, res: Response) => {
  const { tenantId, userId, reason } = req.body || {};

  if (
    typeof userId !== 'string'
    || userId.trim() === ''
    || !isUuid(userId)
    || (tenantId !== undefined && !isUuid(tenantId))
    || typeof reason !== 'string'
    || reason.trim() === ''
  ) {
    return refusal(res, {
      code: 'TENANT_MEMBERSHIP_INPUT_INVALID',
      message: 'userId and reason are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const revoked = await revokeTenantMembership(db, actorFromRequest(req), {
      tenantId,
      userId,
      reason,
    });

    return success(res, {
      code: 'TENANT_MEMBERSHIP_REVOKED',
      message: 'Tenant membership revoked successfully',
      data: revoked,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'TENANT_MEMBERSHIP_NOT_FOUND') {
      return refusal(res, {
        code: 'TENANT_MEMBERSHIP_NOT_FOUND',
        message: 'Tenant membership was not found',
        refusalType: 'client',
        httpStatus: 404,
      });
    }

    if (handleScopeErrors(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for tenant membership revocation')) {
      return;
    }

    if (handleModuleDisabledError(res, error)) {
      return;
    }

    return errorEnvelope(res, {
      code: 'TENANT_MEMBERSHIP_REVOKE_FAILED',
      message: getMessage(error, 'Failed to revoke tenant membership'),
      httpStatus: 500,
    });
  }
});

router.post('/org-unit-memberships', async (req: Request, res: Response) => {
  const {
    tenantId,
    orgUnitId,
    userId,
    userEmail,
    firstName,
    lastName,
    roleSet,
    reason,
  } = req.body || {};
  const parsedRoleSet = parseRoleSetBody(roleSet);
  const hasUserId = typeof userId === 'string' && userId.trim().length > 0;
  const hasUserEmail = typeof userEmail === 'string' && userEmail.trim().length > 0;

  if (
    typeof orgUnitId !== 'string'
    || orgUnitId.trim() === ''
    || !isUuid(orgUnitId)
    || (!hasUserId && !hasUserEmail)
    || (hasUserId && !isUuid(userId))
    || (hasUserEmail && !isEmail(userEmail))
    || (tenantId !== undefined && !isUuid(tenantId))
    || parsedRoleSet.length === 0
    || typeof reason !== 'string'
    || reason.trim() === ''
  ) {
    return refusal(res, {
      code: 'ORG_UNIT_MEMBERSHIP_INPUT_INVALID',
      message: 'orgUnitId, userId(UUID) or userEmail, roleSet[], and reason are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const updated = await upsertOrgUnitMembership(db, actorFromRequest(req), {
      tenantId,
      orgUnitId,
      userId,
      userEmail,
      firstName,
      lastName,
      roleSet: parsedRoleSet,
      reason,
    });

    return success(res, {
      code: 'ORG_UNIT_MEMBERSHIP_UPDATED',
      message: 'OrgUnit membership updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORG_UNIT_NOT_FOUND') {
      return refusal(res, {
        code: 'ORG_UNIT_NOT_FOUND',
        message: 'OrgUnit was not found in active tenant scope',
        refusalType: 'client',
        httpStatus: 404,
      });
    }

    if (handleOrgUnitHierarchyErrors(res, error)) {
      return;
    }

    if (handleScopeErrors(res, error) || handleUserResolutionError(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for org unit membership update')) {
      return;
    }

    if (handleModuleDisabledError(res, error)) {
      return;
    }

    return errorEnvelope(res, {
      code: 'ORG_UNIT_MEMBERSHIP_UPDATE_FAILED',
      message: getMessage(error, 'Failed to update org unit membership'),
      httpStatus: 500,
    });
  }
});

router.delete('/org-unit-memberships', async (req: Request, res: Response) => {
  const { tenantId, orgUnitId, userId, reason } = req.body || {};

  if (
    typeof orgUnitId !== 'string'
    || orgUnitId.trim() === ''
    || !isUuid(orgUnitId)
    || typeof userId !== 'string'
    || userId.trim() === ''
    || !isUuid(userId)
    || (tenantId !== undefined && !isUuid(tenantId))
    || typeof reason !== 'string'
    || reason.trim() === ''
  ) {
    return refusal(res, {
      code: 'ORG_UNIT_MEMBERSHIP_INPUT_INVALID',
      message: 'orgUnitId, userId, and reason are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const revoked = await revokeOrgUnitMembership(db, actorFromRequest(req), {
      tenantId,
      orgUnitId,
      userId,
      reason,
    });

    return success(res, {
      code: 'ORG_UNIT_MEMBERSHIP_REVOKED',
      message: 'OrgUnit membership revoked successfully',
      data: revoked,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORG_UNIT_NOT_FOUND') {
      return refusal(res, {
        code: 'ORG_UNIT_NOT_FOUND',
        message: 'OrgUnit was not found in active tenant scope',
        refusalType: 'client',
        httpStatus: 404,
      });
    }

    if (handleOrgUnitHierarchyErrors(res, error)) {
      return;
    }

    if (error instanceof Error && error.message === 'ORG_UNIT_MEMBERSHIP_NOT_FOUND') {
      return refusal(res, {
        code: 'ORG_UNIT_MEMBERSHIP_NOT_FOUND',
        message: 'OrgUnit membership was not found',
        refusalType: 'client',
        httpStatus: 404,
      });
    }

    if (handleScopeErrors(res, error)) {
      return;
    }

    if (handleForbiddenError(res, error, 'Insufficient permissions for org unit membership revocation')) {
      return;
    }

    if (handleModuleDisabledError(res, error)) {
      return;
    }

    return errorEnvelope(res, {
      code: 'ORG_UNIT_MEMBERSHIP_REVOKE_FAILED',
      message: getMessage(error, 'Failed to revoke org unit membership'),
      httpStatus: 500,
    });
  }
});

router.get('/rbac/evaluate', async (req: Request, res: Response) => {
  const tenantId = req.query.tenantId && typeof req.query.tenantId === 'string'
    ? req.query.tenantId
    : undefined;
  const orgUnitId = req.query.orgUnitId && typeof req.query.orgUnitId === 'string'
    ? req.query.orgUnitId
    : undefined;

  try {
    const data = await evaluateRequestCapabilities(db, actorFromRequest(req), tenantId, orgUnitId);

    return success(res, {
      code: 'RBAC_EVALUATED',
      message: 'Resolved request role and capability context',
      data,
    });
  } catch (error) {
    return errorEnvelope(res, {
      code: 'RBAC_EVALUATION_FAILED',
      message: getMessage(error, 'Failed to evaluate RBAC'),
      httpStatus: 500,
    });
  }
});

router.use(adminConsoleRouter);

export default router;
