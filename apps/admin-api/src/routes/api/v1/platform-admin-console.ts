import { Request, Response, Router } from 'express';
import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../../../config/knex';
import { refusal, success, error as errorEnvelope } from '../../../platform/envelopes/response';
import { CAPABILITIES, hasCapability } from '../../../platform/rbac/capabilities';
import {
  ensureScopedAdminUser,
  evaluateRequestCapabilities,
  PlatformAdminActorContext,
} from '../../../services/PlatformAdminService';
import {
  connectShyftNumberMappingServiceAsync,
  type ConnectShyftNumberMapping,
} from '../../../platform/connectshyftNumberMappings';

const router = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NODE_TYPES = new Set(['SUBTENANT', 'ORGUNIT', 'GROUP']);
const GOVERNED_MODULES = ['connectshyft', 'moneyshyft'] as const;
const BCRYPT_ROUNDS = 12;
const ADMIN_CONSOLE_V1_ENABLED = process.env.ADMIN_CONSOLE_V1 !== 'false';
const INTEGRITY_DASHBOARD_V1_ENABLED = process.env.INTEGRITY_DASHBOARD_V1 !== 'false';

type NodeType = 'SUBTENANT' | 'ORGUNIT' | 'GROUP';
type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

type StructureNodeDto = {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  nodeType: NodeType;
  parentId: string | null;
  depth: number;
  admins: Array<{ id: string; name: string; email: string }>;
  moduleOverrides: Record<string, boolean>;
  moduleEffective: Record<string, boolean>;
  children: StructureNodeDto[];
};

type IntegrityIssueItem = {
  id: string;
  label: string;
  context: Record<string, unknown>;
  fixAction: {
    actionType: string;
    target: Record<string, unknown>;
  };
};

type IntegrityIssue = {
  issueType: string;
  severity: Severity;
  count: number;
  items: IntegrityIssueItem[];
};

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value.trim());
const isEmail = (value: unknown): value is string => typeof value === 'string' && EMAIL_PATTERN.test(value.trim());
const normalize = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const normalizeModuleKey = (value: unknown): 'connectshyft' | 'moneyshyft' | null => {
  const normalized = normalize(value).toLowerCase();
  return (GOVERNED_MODULES as readonly string[]).includes(normalized)
    ? normalized as 'connectshyft' | 'moneyshyft'
    : null;
};

const parseRoleSet = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalize(entry).toUpperCase()).filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((entry) => normalize(entry).toUpperCase()).filter((entry) => entry.length > 0)
        : [];
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const toPlainTenantRole = (tenantRoleSet: string[]): 'ADMIN' | 'VIEWER' | 'MEMBER' => {
  if (tenantRoleSet.includes('TENANT_ADMIN')) {
    return 'ADMIN';
  }

  if (tenantRoleSet.includes('TENANT_VIEWER')) {
    return 'VIEWER';
  }

  return 'MEMBER';
};

const actorFromRequest = (req: Request): PlatformAdminActorContext => ({
  userId: req.user?.userId || null,
  baseRole: req.user?.role || null,
  headerRoles: [],
  activeTenantId: req.user?.activeTenantId || null,
});

const activeTenantIdFromRequest = (req: Request): string | null => {
  const candidate = req.user?.activeTenantId || null;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
};

const isSystemAdminRequest = (req: Request): boolean => normalize(req.user?.role).toUpperCase() === 'SYSTEM_ADMIN';

const computeRequestHash = (req: Request): string => {
  const payload = JSON.stringify({
    method: req.method.toUpperCase(),
    path: req.path,
    query: req.query || {},
    body: req.body || {},
  });
  return createHash('sha256').update(payload).digest('hex');
};

const withIdempotency = async (req: Request, res: Response, handler: () => Promise<void>): Promise<void> => {
  if (!WRITE_METHODS.has(req.method.toUpperCase())) {
    await handler();
    return;
  }

  const idempotencyKey = normalize(req.header('Idempotency-Key'));
  if (!idempotencyKey) {
    refusal(res, {
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key header is required for admin write operations',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const actorUserId = normalize(req.user?.userId);
  if (!isUuid(actorUserId)) {
    refusal(res, {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authenticated actor context is required',
      refusalType: 'security',
      httpStatus: 401,
    });
    return;
  }

  const requestHash = computeRequestHash(req);
  const requestMethod = req.method.toUpperCase();
  const requestPath = req.path;

  let existing: any = null;
  try {
    existing = await db
      .withSchema('platform')
      .table('idempotency_requests')
      .where({
        actor_user_id: actorUserId,
        idempotency_key: idempotencyKey,
        request_method: requestMethod,
        request_path: requestPath,
      })
      .first(['request_hash', 'response_http_status', 'response_payload']);
  } catch (_error) {
    existing = null;
  }

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

    res
      .status(typeof existing.response_http_status === 'number' ? existing.response_http_status : 200)
      .json(existing.response_payload);
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
        tenant_id: activeTenantIdFromRequest(req),
        request_hash: requestHash,
        response_http_status: capturedStatus,
        response_payload: capturedBody,
      })
      .onConflict(['actor_user_id', 'idempotency_key', 'request_method', 'request_path'])
      .ignore();
  } catch (_error) {
    // Fail-open for environments without migration.
  }
};

const resolveTenantIdForAudit = (req: Request, responseBody: any): string | null => {
  const fromResponse = normalize(responseBody?.data?.tenantId);
  if (isUuid(fromResponse)) {
    return fromResponse;
  }

  const fromParams = normalize(req.params?.tenantId);
  if (isUuid(fromParams)) {
    return fromParams;
  }

  const fromBody = normalize(req.body?.tenantId);
  if (isUuid(fromBody)) {
    return fromBody;
  }

  const fromQuery = normalize(req.query?.tenantId);
  if (isUuid(fromQuery)) {
    return fromQuery;
  }

  const fromSession = activeTenantIdFromRequest(req);
  if (isUuid(fromSession)) {
    return fromSession;
  }

  return null;
};

const resolveEntityIdForAudit = (
  req: Request,
  responseBody: any,
  actorUserId: string | null,
  tenantId: string,
): string => {
  const candidates = [
    normalize(responseBody?.data?.node?.id),
    normalize(responseBody?.data?.nodeId),
    normalize(responseBody?.data?.user?.id),
    normalize(responseBody?.data?.userId),
    normalize(req.params?.nodeId),
    normalize(req.params?.userId),
    normalize(req.params?.tenantId),
  ];

  for (const candidate of candidates) {
    if (isUuid(candidate)) {
      return candidate;
    }
  }

  if (actorUserId && isUuid(actorUserId)) {
    return actorUserId;
  }

  return tenantId;
};

const buildAuditEventName = (req: Request): string => {
  const method = req.method.toUpperCase();
  const normalizedPath = req.path
    .replace(/\//g, '.')
    .replace(/:+/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .toLowerCase();
  return `admin.${method.toLowerCase()}.${normalizedPath}`;
};

router.use((req: Request, res: Response, next) => {
  if (!ADMIN_CONSOLE_V1_ENABLED) {
    refusal(res, {
      code: 'ADMIN_CONSOLE_V1_DISABLED',
      message: 'Admin Console V1 is disabled',
      refusalType: 'business',
      httpStatus: 403,
    });
    return;
  }

  if (!INTEGRITY_DASHBOARD_V1_ENABLED && req.path.startsWith('/integrity')) {
    refusal(res, {
      code: 'INTEGRITY_DASHBOARD_V1_DISABLED',
      message: 'Integrity Dashboard V1 is disabled',
      refusalType: 'business',
      httpStatus: 403,
    });
    return;
  }

  next();
});

router.use((req: Request, res: Response, next) => {
  if (!WRITE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  let responseBody: unknown;
  const mutableRes = res as Response & { json: (body: unknown) => Response };
  const originalJson = mutableRes.json.bind(res);

  mutableRes.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as typeof mutableRes.json;

  res.on('finish', () => {
    mutableRes.json = originalJson as typeof mutableRes.json;

    if (res.statusCode >= 500) {
      return;
    }

    const tenantId = resolveTenantIdForAudit(req, responseBody);
    if (!tenantId || !isUuid(tenantId)) {
      return;
    }

    const actorUserId = normalize(req.user?.userId);
    const eventName = buildAuditEventName(req);
    const entityId = resolveEntityIdForAudit(req, responseBody, actorUserId || null, tenantId);

    db
      .withSchema('platform')
      .table('events')
      .insert({
        tenant_id: tenantId,
        actor_id: isUuid(actorUserId) ? actorUserId : null,
        event_name: eventName,
        entity_type: 'admin_mutation',
        entity_id: entityId,
        occurred_at_utc: db.fn.now(),
        payload: {
          path: req.path,
          method: req.method.toUpperCase(),
          statusCode: res.statusCode,
          responseCode: (responseBody as any)?.code || null,
        },
      })
      .catch(() => {
        // Keep API writes fail-open if audit persistence is unavailable.
      });
  });

  next();
});

const ensureTenantAccess = async (
  req: Request,
  res: Response,
  options: {
    tenantId?: string | null;
    requireSystem?: boolean;
  } = {},
): Promise<{ tenantId: string; evaluation: Awaited<ReturnType<typeof evaluateRequestCapabilities>> } | null> => {
  const requestedTenantId = normalize(options.tenantId);
  const tenantId = requestedTenantId || activeTenantIdFromRequest(req);
  if (!isUuid(tenantId)) {
    refusal(res, {
      code: 'TENANT_ID_REQUIRED',
      message: 'tenantId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return null;
  }

  try {
    const evaluation = await evaluateRequestCapabilities(db, actorFromRequest(req), tenantId, undefined);

    if (options.requireSystem) {
      if (!evaluation.roles.includes('SYSTEM_ADMIN')) {
        refusal(res, {
          code: 'FORBIDDEN',
          message: 'System administrator privileges are required',
          refusalType: 'security',
          httpStatus: 403,
        });
        return null;
      }
    } else {
      const canAccess = hasCapability(evaluation.roles, CAPABILITIES.ORG_UNIT_CREATE)
        || hasCapability(evaluation.roles, CAPABILITIES.TENANT_ROLE_ASSIGN)
        || hasCapability(evaluation.roles, CAPABILITIES.TENANT_READ_ALL)
        || evaluation.roles.includes('SYSTEM_ADMIN');

      if (!canAccess) {
        refusal(res, {
          code: 'FORBIDDEN',
          message: 'Tenant administration privileges are required',
          refusalType: 'security',
          httpStatus: 403,
        });
        return null;
      }
    }

    return { tenantId, evaluation };
  } catch (error) {
    errorEnvelope(res, {
      code: 'RBAC_EVALUATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to evaluate access',
      httpStatus: 500,
    });
    return null;
  }
};

const ensureTenantStructureRules = async (tenantId: string): Promise<{
  maxDepth: number;
  allowedNodeTypes: NodeType[];
  allowViewerRole: boolean;
}> => {
  const row = await db
    .withSchema('platform')
    .table('tenant_structure_rules')
    .where({ tenant_id: tenantId })
    .first(['max_depth', 'allowed_node_types', 'allow_viewer_role']);

  if (!row) {
    await db.withSchema('platform').table('tenant_structure_rules').insert({
      tenant_id: tenantId,
      max_depth: 2,
      allowed_node_types: JSON.stringify(['SUBTENANT', 'ORGUNIT', 'GROUP']),
      allow_viewer_role: false,
      created_at_utc: db.fn.now(),
      updated_at_utc: db.fn.now(),
    }).onConflict(['tenant_id']).ignore();

    return {
      maxDepth: 2,
      allowedNodeTypes: ['SUBTENANT', 'ORGUNIT', 'GROUP'],
      allowViewerRole: false,
    };
  }

  const maxDepth = Number(row.max_depth || 2);
  const rawAllowed = row.allowed_node_types;
  const allowedNodeTypes = (Array.isArray(rawAllowed)
    ? rawAllowed
    : typeof rawAllowed === 'string'
      ? JSON.parse(rawAllowed)
      : ['SUBTENANT', 'ORGUNIT', 'GROUP'])
    .map((value: unknown) => normalize(value).toUpperCase())
    .filter((value: string): value is NodeType => NODE_TYPES.has(value));

  return {
    maxDepth: Number.isFinite(maxDepth) ? maxDepth : 2,
    allowedNodeTypes: allowedNodeTypes.length > 0 ? allowedNodeTypes : ['SUBTENANT', 'ORGUNIT', 'GROUP'],
    allowViewerRole: row.allow_viewer_role === true,
  };
};

const resolveTenantModuleMap = async (tenantId: string): Promise<Record<string, boolean>> => {
  const rows = await db
    .withSchema('platform')
    .table('tenant_module_entitlements')
    .where({ tenant_id: tenantId })
    .select(['module_key', 'enabled']);

  const map: Record<string, boolean> = {
    connectshyft: false,
    moneyshyft: false,
  };

  rows.forEach((row: any) => {
    const key = normalize(row.module_key).toLowerCase();
    if (!key) {
      return;
    }
    map[key] = row.enabled === true;
  });

  return map;
};

const resolveScopedUserForAdminFlow = async (
  tenantId: string,
  input: {
    userId?: string;
    userEmail?: string;
    firstName?: string;
    lastName?: string;
    temporaryPassword?: string;
    forceResetOnFirstLogin?: boolean;
  },
): Promise<{ userId: string; email: string; createdInline: boolean }> => {
  if (isUuid(input.userId)) {
    const user = await db('users').where({ id: input.userId }).first(['id', 'email']);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    return {
      userId: user.id,
      email: user.email,
      createdInline: false,
    };
  }

  const userEmail = normalize(input.userEmail).toLowerCase();
  if (!isEmail(userEmail)) {
    throw new Error('USER_REFERENCE_REQUIRED');
  }

  const existing = await db('users').whereRaw('LOWER(email) = ?', [userEmail]).first(['id', 'email']);
  if (existing) {
    return {
      userId: existing.id,
      email: existing.email,
      createdInline: false,
    };
  }

  const firstName = normalize(input.firstName) || 'Admin';
  const lastName = normalize(input.lastName) || 'User';
  const temporaryPassword = normalize(input.temporaryPassword) || randomUUID();
  const forceResetOnFirstLogin = input.forceResetOnFirstLogin !== false;
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const [user] = await db('users')
    .insert({
      email: userEmail,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      household_id: null,
      role: 'member',
      must_reset_password: forceResetOnFirstLogin,
      password_set_by_admin: true,
    })
    .returning(['id', 'email']);

  if (!user) {
    throw new Error('INLINE_USER_CREATE_FAILED');
  }

  return {
    userId: user.id,
    email: user.email,
    createdInline: true,
  };
};

const computeStructureDepthMap = (nodes: Array<{ id: string; parent_org_unit_id: string | null }>): Map<string, number> => {
  const byId = new Map<string, { id: string; parent_org_unit_id: string | null }>();
  nodes.forEach((node) => byId.set(node.id, node));
  const cache = new Map<string, number>();

  const resolveDepth = (nodeId: string, visited: Set<string>): number => {
    const cached = cache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }

    if (visited.has(nodeId)) {
      cache.set(nodeId, Number.MAX_SAFE_INTEGER);
      return Number.MAX_SAFE_INTEGER;
    }

    const node = byId.get(nodeId);
    if (!node) {
      return 1;
    }

    if (!node.parent_org_unit_id) {
      cache.set(nodeId, 1);
      return 1;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(nodeId);
    const depth = 1 + resolveDepth(node.parent_org_unit_id, nextVisited);
    cache.set(nodeId, depth);
    return depth;
  };

  nodes.forEach((node) => {
    resolveDepth(node.id, new Set());
  });

  return cache;
};

const buildStructureTree = async (tenantId: string): Promise<{
  roots: StructureNodeDto[];
  flat: StructureNodeDto[];
}> => {
  const [orgUnits, tenantRules, tenantModules, moduleOverrides, adminMemberships] = await Promise.all([
    db
      .withSchema('platform')
      .table('org_units')
      .where({ tenant_id: tenantId })
      .orderBy('name', 'asc')
      .orderBy('id', 'asc')
      .select([
        'id',
        'tenant_id',
        'name',
        'status',
        'type',
        'node_type',
        'parent_org_unit_id',
      ]),
    ensureTenantStructureRules(tenantId),
    resolveTenantModuleMap(tenantId),
    db
      .withSchema('platform')
      .table('org_unit_module_overrides')
      .where({ tenant_id: tenantId })
      .select(['org_unit_id', 'module_key', 'enabled']),
    db
      .withSchema('platform')
      .table('org_unit_memberships as oum')
      .join('org_units as ou', 'ou.id', 'oum.org_unit_id')
      .joinRaw('INNER JOIN "public"."users" as "u" ON "u"."id" = "oum"."user_id"')
      .where('ou.tenant_id', tenantId)
      .whereRaw('oum.role_set_json @> ?::jsonb', [JSON.stringify(['ORGUNIT_ADMIN'])])
      .select([
        'oum.org_unit_id as orgUnitId',
        'u.id as userId',
        'u.email as userEmail',
        'u.first_name as firstName',
        'u.last_name as lastName',
      ]),
  ]);

  const depthMap = computeStructureDepthMap(orgUnits as Array<{ id: string; parent_org_unit_id: string | null }>);

  const overridesByNode = new Map<string, Record<string, boolean>>();
  moduleOverrides.forEach((row: any) => {
    const nodeId = String(row.org_unit_id);
    const moduleKey = normalize(row.module_key).toLowerCase();
    if (!moduleKey) {
      return;
    }
    const current = overridesByNode.get(nodeId) || {};
    current[moduleKey] = row.enabled === true;
    overridesByNode.set(nodeId, current);
  });

  const adminsByNode = new Map<string, Array<{ id: string; name: string; email: string }>>();
  adminMemberships.forEach((row: any) => {
    const nodeId = String(row.orgUnitId);
    const current = adminsByNode.get(nodeId) || [];
    current.push({
      id: String(row.userId),
      email: String(row.userEmail),
      name: `${normalize(row.firstName)} ${normalize(row.lastName)}`.trim() || String(row.userEmail),
    });
    adminsByNode.set(nodeId, current);
  });

  const nodeMap = new Map<string, StructureNodeDto>();
  (orgUnits as any[]).forEach((row) => {
    const nodeId = String(row.id);
    const nodeType = normalize(row.node_type || row.type).toUpperCase();
    nodeMap.set(nodeId, {
      id: nodeId,
      tenantId: String(row.tenant_id),
      name: String(row.name),
      status: String(row.status || 'active'),
      nodeType: NODE_TYPES.has(nodeType) ? nodeType as NodeType : 'ORGUNIT',
      parentId: row.parent_org_unit_id ? String(row.parent_org_unit_id) : null,
      depth: depthMap.get(nodeId) || 1,
      admins: adminsByNode.get(nodeId) || [],
      moduleOverrides: overridesByNode.get(nodeId) || {},
      moduleEffective: {},
      children: [],
    });
  });

  const roots: StructureNodeDto[] = [];
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortedModules = [...GOVERNED_MODULES];
  const applyEffectiveModules = (node: StructureNodeDto, inherited: Record<string, boolean>): void => {
    const effective: Record<string, boolean> = {};
    sortedModules.forEach((moduleKey) => {
      if (Object.prototype.hasOwnProperty.call(node.moduleOverrides, moduleKey)) {
        effective[moduleKey] = node.moduleOverrides[moduleKey] === true;
      } else {
        effective[moduleKey] = inherited[moduleKey] === true;
      }
    });
    node.moduleEffective = effective;

    node.children.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    node.children.forEach((child) => applyEffectiveModules(child, effective));
  };

  roots.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  roots.forEach((root) => applyEffectiveModules(root, tenantModules));

  const flat: StructureNodeDto[] = [];
  const walk = (node: StructureNodeDto): void => {
    flat.push(node);
    node.children.forEach((child) => walk(child));
  };
  roots.forEach((node) => walk(node));

  return {
    roots,
    flat,
  };
};

const resolveIntegrityIssues = async (tenantId: string): Promise<IntegrityIssue[]> => {
  const structure = await buildStructureTree(tenantId);
  const nodes = structure.flat;
  const tenantRules = await ensureTenantStructureRules(tenantId);
  const tenantModules = await resolveTenantModuleMap(tenantId);

  const issues: IntegrityIssue[] = [];

  const orphanedNodes = nodes
    .filter((node) => node.status === 'active' && node.admins.length === 0)
    .map((node) => ({
      id: node.id,
      label: node.name,
      context: {
        nodeType: node.nodeType,
      },
      fixAction: {
        actionType: 'ASSIGN_ADMIN',
        target: { nodeId: node.id },
      },
    }));

  issues.push({
    issueType: 'ID-01_ORPHANED_NODES',
    severity: 'WARNING',
    count: orphanedNodes.length,
    items: orphanedNodes,
  });

  const depthViolations = nodes
    .filter((node) => node.depth > tenantRules.maxDepth)
    .map((node) => ({
      id: node.id,
      label: node.name,
      context: {
        depth: node.depth,
        maxDepth: tenantRules.maxDepth,
      },
      fixAction: {
        actionType: 'MOVE_NODE',
        target: { nodeId: node.id },
      },
    }));

  issues.push({
    issueType: 'ID-02_DEPTH_VIOLATIONS',
    severity: 'CRITICAL',
    count: depthViolations.length,
    items: depthViolations,
  });

  const moduleContradictions = nodes.flatMap((node) => {
    const contradictions: IntegrityIssueItem[] = [];
    Object.entries(node.moduleOverrides).forEach(([moduleKey, enabled]) => {
      if (enabled && tenantModules[moduleKey] !== true) {
        contradictions.push({
          id: `${node.id}:${moduleKey}:tenant-disabled`,
          label: `${node.name} (${moduleKey})`,
          context: {
            moduleKey,
            reason: 'override-enables-disabled-tenant-module',
          },
          fixAction: {
            actionType: 'DISABLE_OVERRIDE',
            target: { nodeId: node.id, moduleKey },
          },
        });
      }
    });

    return contradictions;
  });

  issues.push({
    issueType: 'ID-03_MODULE_CONTRADICTIONS',
    severity: 'WARNING',
    count: moduleContradictions.length,
    items: moduleContradictions,
  });

  const archivedMembershipRows = await db
    .withSchema('platform')
    .table('org_unit_memberships as oum')
    .join('org_units as ou', 'ou.id', 'oum.org_unit_id')
    .joinRaw('INNER JOIN "public"."users" as "u" ON "u"."id" = "oum"."user_id"')
    .where('ou.tenant_id', tenantId)
    .andWhere('ou.status', 'archived')
    .select([
      'u.id as userId',
      'u.email as userEmail',
      'ou.id as nodeId',
      'ou.name as nodeName',
    ]);

  const archivedMemberships = archivedMembershipRows.map((row: any) => ({
    id: `${row.userId}:${row.nodeId}`,
    label: `${row.userEmail} in ${row.nodeName}`,
    context: {
      userId: row.userId,
      nodeId: row.nodeId,
    },
    fixAction: {
      actionType: 'MOVE_USER',
      target: {
        userId: row.userId,
        nodeId: row.nodeId,
      },
    },
  }));

  issues.push({
    issueType: 'ID-04_ARCHIVED_MEMBERSHIPS',
    severity: 'INFO',
    count: archivedMemberships.length,
    items: archivedMemberships,
  });

  const crossScopeAdminsRows = await db
    .withSchema('platform')
    .table('org_unit_memberships as oum')
    .join('org_units as ou', 'ou.id', 'oum.org_unit_id')
    .joinRaw('INNER JOIN "public"."users" as "u" ON "u"."id" = "oum"."user_id"')
    .where('ou.tenant_id', tenantId)
    .whereRaw('oum.role_set_json @> ?::jsonb', [JSON.stringify(['ORGUNIT_ADMIN'])])
    .whereNotExists(
      db
        .withSchema('platform')
        .table('tenant_memberships as tm')
        .select(db.raw('1'))
        .whereRaw('tm.user_id = u.id')
        .andWhere('tm.tenant_id', tenantId),
    )
    .select([
      'u.id as userId',
      'u.email as userEmail',
      'ou.id as nodeId',
      'ou.name as nodeName',
    ]);

  const crossScopeAdmins = crossScopeAdminsRows.map((row: any) => ({
    id: `${row.userId}:${row.nodeId}`,
    label: `${row.userEmail} on ${row.nodeName}`,
    context: {
      userId: row.userId,
      nodeId: row.nodeId,
    },
    fixAction: {
      actionType: 'REMOVE_ADMIN',
      target: {
        userId: row.userId,
        nodeId: row.nodeId,
      },
    },
  }));

  issues.push({
    issueType: 'ID-05_CROSS_SCOPE_ADMIN',
    severity: 'CRITICAL',
    count: crossScopeAdmins.length,
    items: crossScopeAdmins,
  });

  const connectShyftEnabled = tenantModules.connectshyft === true;
  const connectShyftIssues: IntegrityIssueItem[] = [];

  if (connectShyftEnabled) {
    let mappings: ConnectShyftNumberMapping[] = [];
    try {
      const activeNodesWithConnectShyft = nodes
        .filter((node) => node.status === 'active' && node.moduleEffective.connectshyft === true);

      for (const node of activeNodesWithConnectShyft) {
        const nodeMappings = await connectShyftNumberMappingServiceAsync.listMappings(tenantId, node.id);
        mappings.push(...nodeMappings);
        if (nodeMappings.length === 0) {
          connectShyftIssues.push({
            id: `${node.id}:missing-number-map`,
            label: `${node.name} has ConnectShyft enabled but no numbers mapped`,
            context: {
              nodeId: node.id,
              nodeName: node.name,
            },
            fixAction: {
              actionType: 'ADD_NUMBER_MAPPING',
              target: {
                nodeId: node.id,
              },
            },
          });
        }
      }

      const activeNodeIdSet = new Set(nodes.filter((node) => node.status === 'active').map((node) => node.id));
      mappings.forEach((mapping) => {
        if (!activeNodeIdSet.has(mapping.orgUnitId)) {
          connectShyftIssues.push({
            id: `${mapping.mappingId}:archived-node-mapping`,
            label: `${mapping.twilioNumberE164} mapped to archived node`,
            context: {
              mappingId: mapping.mappingId,
              orgUnitId: mapping.orgUnitId,
            },
            fixAction: {
              actionType: 'REASSIGN_NUMBER_MAPPING',
              target: {
                mappingId: mapping.mappingId,
              },
            },
          });
        }
      });

      const countByNumber = new Map<string, number>();
      mappings.forEach((mapping) => {
        const current = countByNumber.get(mapping.twilioNumberE164) || 0;
        countByNumber.set(mapping.twilioNumberE164, current + 1);
      });

      countByNumber.forEach((count, number) => {
        if (count <= 1) {
          return;
        }
        connectShyftIssues.push({
          id: `duplicate:${number}`,
          label: `Duplicate ConnectShyft mapping for ${number}`,
          context: {
            twilioNumberE164: number,
            duplicateCount: count,
          },
          fixAction: {
            actionType: 'REASSIGN_NUMBER_MAPPING',
            target: {
              twilioNumberE164: number,
            },
          },
        });
      });
    } catch (_error) {
      // If persistence migrations are not present, skip ID-06 checks.
    }
  }

  issues.push({
    issueType: 'ID-06_CONNECTSHYFT_MAPPING_HEALTH',
    severity: 'CRITICAL',
    count: connectShyftIssues.length,
    items: connectShyftIssues,
  });

  return issues.map((issue) => ({
    ...issue,
    items: issue.items.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id)),
  }));
};

const upsertNodeAdminMembership = async (tenantId: string, nodeId: string, userId: string): Promise<void> => {
  await db
    .withSchema('platform')
    .table('org_unit_memberships')
    .insert({
      org_unit_id: nodeId,
      user_id: userId,
      role_set_json: JSON.stringify(['ORGUNIT_ADMIN']),
      created_at_utc: db.fn.now(),
      updated_at_utc: db.fn.now(),
    })
    .onConflict(['org_unit_id', 'user_id'])
    .merge({
      role_set_json: JSON.stringify(['ORGUNIT_ADMIN']),
      updated_at_utc: db.fn.now(),
    });

  await db
    .withSchema('platform')
    .table('tenant_memberships')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role_set_json: JSON.stringify(['TENANT_ADMIN']),
      created_at_utc: db.fn.now(),
      updated_at_utc: db.fn.now(),
    })
    .onConflict(['tenant_id', 'user_id'])
    .ignore();
};

router.get('/tenants', async (req: Request, res: Response) => {
  const access = await ensureTenantAccess(req, res, {
    tenantId: normalize(req.query.tenantId),
    requireSystem: true,
  });
  if (!access) {
    return;
  }

  const query = normalize(req.query.query).toLowerCase();
  const status = normalize(req.query.status).toLowerCase();
  const moduleKey = normalize(req.query.module).toLowerCase();

  try {
    const tenantsQuery = db
      .withSchema('platform')
      .table('tenants')
      .select(['id', 'name', 'status', 'tenancy_model', 'created_at_utc', 'updated_at_utc']);

    if (query) {
      tenantsQuery.whereRaw('LOWER(name) LIKE ?', [`%${query}%`]);
    }

    if (status) {
      tenantsQuery.andWhere('status', status);
    }

    if (moduleKey) {
      tenantsQuery.whereExists(
        db
          .withSchema('platform')
          .table('tenant_module_entitlements as tme')
          .select(db.raw('1'))
          .whereRaw('tme.tenant_id = tenants.id')
          .andWhere('tme.module_key', moduleKey)
          .andWhere('tme.enabled', true),
      );
    }

    const rows = await tenantsQuery.orderBy('name', 'asc').orderBy('id', 'asc');
    const tenantIds = rows.map((row: any) => row.id);

    const [rulesRows, moduleRows, adminRows] = await Promise.all([
      tenantIds.length > 0
        ? db
          .withSchema('platform')
          .table('tenant_structure_rules')
          .whereIn('tenant_id', tenantIds)
          .select(['tenant_id', 'max_depth', 'allowed_node_types', 'allow_viewer_role'])
        : Promise.resolve([]),
      tenantIds.length > 0
        ? db
          .withSchema('platform')
          .table('tenant_module_entitlements')
          .whereIn('tenant_id', tenantIds)
          .orderBy('module_key', 'asc')
          .select(['tenant_id', 'module_key', 'enabled'])
        : Promise.resolve([]),
      tenantIds.length > 0
        ? db
          .withSchema('platform')
          .table('tenant_memberships')
          .whereIn('tenant_id', tenantIds)
          .whereRaw('role_set_json @> ?::jsonb', [JSON.stringify(['TENANT_ADMIN'])])
          .select(['tenant_id', 'user_id'])
        : Promise.resolve([]),
    ]);

    const rulesByTenant = new Map<string, any>();
    rulesRows.forEach((row: any) => rulesByTenant.set(String(row.tenant_id), row));

    const modulesByTenant = new Map<string, Array<{ moduleKey: string; enabled: boolean }>>();
    moduleRows.forEach((row: any) => {
      const tenantId = String(row.tenant_id);
      const current = modulesByTenant.get(tenantId) || [];
      current.push({ moduleKey: String(row.module_key), enabled: row.enabled === true });
      modulesByTenant.set(tenantId, current);
    });

    const adminCountByTenant = new Map<string, number>();
    adminRows.forEach((row: any) => {
      const tenantId = String(row.tenant_id);
      adminCountByTenant.set(tenantId, (adminCountByTenant.get(tenantId) || 0) + 1);
    });

    success(res, {
      code: 'TENANTS_LIST_RESOLVED',
      message: 'Tenants resolved',
      data: {
        tenants: rows.map((row: any) => {
          const tenantId = String(row.id);
          const rules = rulesByTenant.get(tenantId);
          return {
            id: tenantId,
            name: String(row.name),
            status: String(row.status),
            tenancyModel: normalize(row.tenancy_model) || 'single-tenant',
            moduleEntitlements: modulesByTenant.get(tenantId) || [],
            structureRules: rules
              ? {
                maxDepth: Number(rules.max_depth || 2),
                allowedNodeTypes: Array.isArray(rules.allowed_node_types)
                  ? rules.allowed_node_types
                  : JSON.parse(rules.allowed_node_types || '[]'),
                allowViewerRole: rules.allow_viewer_role === true,
              }
              : null,
            adminCount: adminCountByTenant.get(tenantId) || 0,
          };
        }),
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'TENANTS_LIST_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve tenants',
      httpStatus: 500,
    });
  }
});

router.get('/tenants/:tenantId', async (req: Request, res: Response) => {
  const tenantId = normalize(req.params.tenantId);
  if (!isUuid(tenantId)) {
    refusal(res, {
      code: 'TENANT_ID_INVALID',
      message: 'tenantId must be a UUID',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const access = await ensureTenantAccess(req, res, { tenantId, requireSystem: true });
  if (!access) {
    return;
  }

  try {
    const tenant = await db
      .withSchema('platform')
      .table('tenants')
      .where({ id: tenantId })
      .first(['id', 'name', 'status', 'tenancy_model', 'created_at_utc', 'updated_at_utc']);

    if (!tenant) {
      refusal(res, {
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
        refusalType: 'client',
        httpStatus: 404,
      });
      return;
    }

    const [rules, modules, admins] = await Promise.all([
      ensureTenantStructureRules(tenantId),
      db
        .withSchema('platform')
        .table('tenant_module_entitlements')
        .where({ tenant_id: tenantId })
        .orderBy('module_key', 'asc')
        .select(['module_key', 'enabled', 'reason', 'updated_at_utc']),
      db
        .withSchema('platform')
        .table('tenant_memberships as tm')
        .joinRaw('INNER JOIN "public"."users" as "u" ON "u"."id" = "tm"."user_id"')
        .where('tm.tenant_id', tenantId)
        .whereRaw('tm.role_set_json @> ?::jsonb', [JSON.stringify(['TENANT_ADMIN'])])
        .select(['u.id', 'u.email', 'u.first_name', 'u.last_name']),
    ]);

    success(res, {
      code: 'TENANT_DETAIL_RESOLVED',
      message: 'Tenant detail resolved',
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          tenancyModel: tenant.tenancy_model,
          structureRules: rules,
          moduleEntitlements: modules.map((row: any) => ({
            moduleKey: row.module_key,
            enabled: row.enabled === true,
            reason: row.reason,
            updatedAtUtc: row.updated_at_utc,
          })),
          admins: admins.map((admin: any) => ({
            id: admin.id,
            email: admin.email,
            firstName: admin.first_name,
            lastName: admin.last_name,
          })),
        },
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'TENANT_DETAIL_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve tenant detail',
      httpStatus: 500,
    });
  }
});

router.patch('/tenants/:tenantId/modules', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const tenantId = normalize(req.params.tenantId);
    if (!isUuid(tenantId)) {
      refusal(res, {
        code: 'TENANT_ID_INVALID',
        message: 'tenantId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const access = await ensureTenantAccess(req, res, { tenantId, requireSystem: true });
    if (!access) {
      return;
    }

    const rawModules = Array.isArray(req.body?.modulesEnabled)
      ? req.body.modulesEnabled
      : Array.isArray(req.body?.modules_enabled)
        ? req.body.modules_enabled
        : [];

    const modulesEnabled = rawModules
      .map((value: unknown) => normalize(value).toLowerCase())
      .filter((value: string) => (GOVERNED_MODULES as readonly string[]).includes(value));

    const reason = normalize(req.body?.reason) || 'tenant-module-update';

    try {
      await db.transaction(async (trx) => {
        for (const moduleKey of GOVERNED_MODULES) {
          await trx
            .withSchema('platform')
            .table('tenant_module_entitlements')
            .insert({
              tenant_id: tenantId,
              module_key: moduleKey,
              enabled: modulesEnabled.includes(moduleKey),
              reason,
              created_by_user_id: req.user?.userId || null,
              updated_by_user_id: req.user?.userId || null,
              created_at_utc: trx.fn.now(),
              updated_at_utc: trx.fn.now(),
            })
            .onConflict(['tenant_id', 'module_key'])
            .merge({
              enabled: modulesEnabled.includes(moduleKey),
              reason,
              updated_by_user_id: req.user?.userId || null,
              updated_at_utc: trx.fn.now(),
            });
        }
      });

      success(res, {
        code: 'TENANT_MODULES_UPDATED',
        message: 'Tenant modules updated',
        data: {
          tenantId,
          modulesEnabled,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'TENANT_MODULES_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update tenant modules',
        httpStatus: 500,
      });
    }
  });
});

router.patch('/tenants/:tenantId/structure-rules', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const tenantId = normalize(req.params.tenantId);
    if (!isUuid(tenantId)) {
      refusal(res, {
        code: 'TENANT_ID_INVALID',
        message: 'tenantId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const access = await ensureTenantAccess(req, res, { tenantId, requireSystem: true });
    if (!access) {
      return;
    }

    const maxDepth = Number(req.body?.maxDepth ?? req.body?.max_depth);
    const allowViewerRole = req.body?.allowViewerRole === true;
    const rawAllowed = Array.isArray(req.body?.allowedNodeTypes)
      ? req.body.allowedNodeTypes
      : Array.isArray(req.body?.allowed_node_types)
        ? req.body.allowed_node_types
        : [];

    const allowedNodeTypes = rawAllowed
      .map((value: unknown) => normalize(value).toUpperCase())
      .filter((value: string): value is NodeType => NODE_TYPES.has(value));

    if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 8 || allowedNodeTypes.length === 0) {
      refusal(res, {
        code: 'TENANT_STRUCTURE_RULES_INVALID',
        message: 'maxDepth (1..8) and allowedNodeTypes are required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      await db
        .withSchema('platform')
        .table('tenant_structure_rules')
        .insert({
          tenant_id: tenantId,
          max_depth: maxDepth,
          allowed_node_types: JSON.stringify(allowedNodeTypes),
          allow_viewer_role: allowViewerRole,
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .onConflict(['tenant_id'])
        .merge({
          max_depth: maxDepth,
          allowed_node_types: JSON.stringify(allowedNodeTypes),
          allow_viewer_role: allowViewerRole,
          updated_at_utc: db.fn.now(),
        });

      success(res, {
        code: 'TENANT_STRUCTURE_RULES_UPDATED',
        message: 'Tenant structure rules updated',
        data: {
          tenantId,
          maxDepth,
          allowedNodeTypes,
          allowViewerRole,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'TENANT_STRUCTURE_RULES_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update tenant structure rules',
        httpStatus: 500,
      });
    }
  });
});

router.post('/tenants/:tenantId/admins', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const tenantId = normalize(req.params.tenantId);
    if (!isUuid(tenantId)) {
      refusal(res, {
        code: 'TENANT_ID_INVALID',
        message: 'tenantId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const access = await ensureTenantAccess(req, res, { tenantId, requireSystem: true });
    if (!access) {
      return;
    }

    const mode = normalize(req.body?.mode).toLowerCase();
    const reason = normalize(req.body?.reason) || 'tenant-admin-assignment';

    if (mode !== 'create' && mode !== 'select') {
      refusal(res, {
        code: 'TENANT_ADMIN_MODE_INVALID',
        message: 'mode must be "create" or "select"',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      const resolvedUser = await resolveScopedUserForAdminFlow(tenantId, {
        userId: mode === 'select' ? req.body?.userId : undefined,
        userEmail: mode === 'create' ? req.body?.email : req.body?.userEmail,
        firstName: req.body?.firstName,
        lastName: req.body?.lastName,
        temporaryPassword: req.body?.temporaryPassword,
        forceResetOnFirstLogin: req.body?.forceResetOnFirstLogin,
      });

      await db
        .withSchema('platform')
        .table('tenant_memberships')
        .insert({
          tenant_id: tenantId,
          user_id: resolvedUser.userId,
          role_set_json: JSON.stringify(['TENANT_ADMIN']),
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .onConflict(['tenant_id', 'user_id'])
        .merge({
          role_set_json: JSON.stringify(['TENANT_ADMIN']),
          updated_at_utc: db.fn.now(),
        });

      success(res, {
        code: 'TENANT_ADMIN_ASSIGNED',
        message: 'Tenant admin assigned',
        data: {
          tenantId,
          userId: resolvedUser.userId,
          userEmail: resolvedUser.email,
          createdInline: resolvedUser.createdInline,
          reason,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_REFERENCE_REQUIRED') {
        refusal(res, {
          code: 'USER_REFERENCE_REQUIRED',
          message: 'Provide userId for select mode or email for create mode',
          refusalType: 'client',
          httpStatus: 400,
        });
        return;
      }

      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        refusal(res, {
          code: 'USER_NOT_FOUND',
          message: 'User was not found',
          refusalType: 'client',
          httpStatus: 404,
        });
        return;
      }

      errorEnvelope(res, {
        code: 'TENANT_ADMIN_ASSIGN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to assign tenant admin',
        httpStatus: 500,
      });
    }
  });
});

router.delete('/tenants/:tenantId/admins/:userId', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const tenantId = normalize(req.params.tenantId);
    const userId = normalize(req.params.userId);

    if (!isUuid(tenantId) || !isUuid(userId)) {
      refusal(res, {
        code: 'TENANT_ADMIN_REMOVE_INPUT_INVALID',
        message: 'tenantId and userId must be UUIDs',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const access = await ensureTenantAccess(req, res, { tenantId, requireSystem: true });
    if (!access) {
      return;
    }

    try {
      const adminCountRow = await db
        .withSchema('platform')
        .table('tenant_memberships')
        .where({ tenant_id: tenantId })
        .whereRaw('role_set_json @> ?::jsonb', [JSON.stringify(['TENANT_ADMIN'])])
        .count<{ count: string }[]>('* as count')
        .first();

      const adminCount = Number(adminCountRow?.count || 0);
      if (adminCount <= 1) {
        refusal(res, {
          code: 'TENANT_ADMIN_MINIMUM_REQUIRED',
          message: 'Tenant must retain at least one tenant admin',
          refusalType: 'business',
          httpStatus: 409,
        });
        return;
      }

      await db
        .withSchema('platform')
        .table('tenant_memberships')
        .where({ tenant_id: tenantId, user_id: userId })
        .del();

      success(res, {
        code: 'TENANT_ADMIN_REMOVED',
        message: 'Tenant admin removed',
        data: { tenantId, userId },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'TENANT_ADMIN_REMOVE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to remove tenant admin',
        httpStatus: 500,
      });
    }
  });
});

router.get('/users/global', async (req: Request, res: Response) => {
  const access = await ensureTenantAccess(req, res, {
    tenantId: normalize(req.query.tenantId),
    requireSystem: true,
  });
  if (!access) {
    return;
  }

  const query = normalize(req.query.query).toLowerCase();
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  try {
    const baseQuery = db('users').where((builder) => {
      if (!query) {
        return;
      }

      builder
        .whereRaw('LOWER(email) LIKE ?', [`%${query}%`])
        .orWhereRaw('LOWER(first_name) LIKE ?', [`%${query}%`])
        .orWhereRaw('LOWER(last_name) LIKE ?', [`%${query}%`]);
    });

    const totalRow = await baseQuery.clone().count<{ count: string }[]>('* as count').first();
    const users = await baseQuery
      .clone()
      .select(['id', 'email', 'first_name', 'last_name', 'household_id', 'role', 'last_login_at'])
      .orderByRaw('LOWER(last_name) ASC, LOWER(first_name) ASC, id ASC')
      .limit(pageSize)
      .offset(offset);

    success(res, {
      code: 'GLOBAL_USERS_RESOLVED',
      message: 'Global users resolved',
      data: {
        page,
        pageSize,
        total: Number(totalRow?.count || 0),
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          householdId: user.household_id,
          role: user.role,
          lastLoginAt: user.last_login_at,
        })),
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'GLOBAL_USERS_RESOLVE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve global users',
      httpStatus: 500,
    });
  }
});

router.get('/structure/tree', async (req: Request, res: Response) => {
  const requestedTenantId = normalize(req.query.tenantId);
  const access = await ensureTenantAccess(req, res, {
    tenantId: requestedTenantId,
    requireSystem: requestedTenantId.length > 0 && isSystemAdminRequest(req),
  });
  if (!access) {
    return;
  }

  try {
    const tree = await buildStructureTree(access.tenantId);
    const rules = await ensureTenantStructureRules(access.tenantId);
    success(res, {
      code: 'STRUCTURE_TREE_RESOLVED',
      message: 'Structure tree resolved',
      data: {
        tenantId: access.tenantId,
        rules,
        roots: tree.roots,
        flat: tree.flat,
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'STRUCTURE_TREE_RESOLVE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve structure tree',
      httpStatus: 500,
    });
  }
});

router.post('/structure/nodes', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const requestedTenantId = normalize(req.body?.tenantId);
    const access = await ensureTenantAccess(req, res, {
      tenantId: requestedTenantId,
      requireSystem: false,
    });
    if (!access) {
      return;
    }

    const name = normalize(req.body?.name);
    const nodeType = normalize(req.body?.type).toUpperCase();
    const parentId = normalize(req.body?.parentId || req.body?.parent_id);
    const reason = normalize(req.body?.reason) || 'node-create';

    if (!name || !NODE_TYPES.has(nodeType as NodeType)) {
      refusal(res, {
        code: 'STRUCTURE_NODE_INPUT_INVALID',
        message: 'name and valid type are required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      const rules = await ensureTenantStructureRules(access.tenantId);
      if (!rules.allowedNodeTypes.includes(nodeType as NodeType)) {
        refusal(res, {
          code: 'NODE_TYPE_NOT_ALLOWED',
          message: 'Node type is not allowed by tenant structure rules',
          refusalType: 'business',
          httpStatus: 409,
        });
        return;
      }

      let parentNode: any = null;
      if (parentId) {
        if (!isUuid(parentId)) {
          refusal(res, {
            code: 'PARENT_NODE_INVALID',
            message: 'parentId must be a UUID when provided',
            refusalType: 'client',
            httpStatus: 400,
          });
          return;
        }

        parentNode = await db
          .withSchema('platform')
          .table('org_units')
          .where({ id: parentId, tenant_id: access.tenantId })
          .first(['id', 'status']);

        if (!parentNode) {
          refusal(res, {
            code: 'PARENT_NODE_NOT_FOUND',
            message: 'Parent node was not found in tenant scope',
            refusalType: 'client',
            httpStatus: 404,
          });
          return;
        }

        if (String(parentNode.status) === 'archived') {
          refusal(res, {
            code: 'PARENT_NODE_ARCHIVED',
            message: 'Parent node is archived',
            refusalType: 'business',
            httpStatus: 409,
          });
          return;
        }
      }

      const existingNodes = await db
        .withSchema('platform')
        .table('org_units')
        .where({ tenant_id: access.tenantId })
        .select(['id', 'parent_org_unit_id']);
      const depthMap = computeStructureDepthMap(existingNodes as Array<{ id: string; parent_org_unit_id: string | null }>);
      const nextDepth = parentId ? (depthMap.get(parentId) || 1) + 1 : 1;

      if (nextDepth > rules.maxDepth) {
        refusal(res, {
          code: 'MAX_DEPTH_EXCEEDED',
          message: 'Node depth exceeds tenant maximum depth',
          refusalType: 'business',
          httpStatus: 409,
        });
        return;
      }

      const [node] = await db
        .withSchema('platform')
        .table('org_units')
        .insert({
          tenant_id: access.tenantId,
          parent_org_unit_id: parentId || null,
          type: nodeType,
          node_type: nodeType,
          name,
          status: 'active',
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .returning(['id', 'tenant_id', 'name', 'status', 'node_type', 'parent_org_unit_id']);

      const assignment = req.body?.adminAssignment;
      if (assignment && typeof assignment === 'object') {
        const mode = normalize((assignment as any).mode).toLowerCase();
        const resolvedUser = await resolveScopedUserForAdminFlow(access.tenantId, {
          userId: mode === 'select' ? (assignment as any).userId : undefined,
          userEmail: mode === 'create' ? (assignment as any).email : (assignment as any).userEmail,
          firstName: (assignment as any).firstName,
          lastName: (assignment as any).lastName,
          temporaryPassword: (assignment as any).temporaryPassword,
          forceResetOnFirstLogin: (assignment as any).forceResetOnFirstLogin,
        });
        await upsertNodeAdminMembership(access.tenantId, node.id, resolvedUser.userId);
      }

      if (req.body?.modulesOverrides && typeof req.body.modulesOverrides === 'object') {
        const tenantModules = await resolveTenantModuleMap(access.tenantId);
        const entries = Object.entries(req.body.modulesOverrides as Record<string, unknown>);

        for (const [moduleKeyRaw, enabledRaw] of entries) {
          const moduleKey = normalizeModuleKey(moduleKeyRaw);
          if (!moduleKey || typeof enabledRaw !== 'boolean') {
            continue;
          }

          if (enabledRaw === true && tenantModules[moduleKey] !== true) {
            refusal(res, {
              code: 'MODULE_ASSIGNMENT_OUT_OF_BOUNDS',
              message: 'Cannot enable a module that is disabled at tenant scope',
              refusalType: 'business',
              httpStatus: 409,
            });
            return;
          }

          await db
            .withSchema('platform')
            .table('org_unit_module_overrides')
            .insert({
              id: randomUUID(),
              tenant_id: access.tenantId,
              org_unit_id: node.id,
              module_key: moduleKey,
              enabled: enabledRaw,
              created_by_user_id: req.user?.userId || null,
              updated_by_user_id: req.user?.userId || null,
              created_at_utc: db.fn.now(),
              updated_at_utc: db.fn.now(),
            })
            .onConflict(['org_unit_id', 'module_key'])
            .merge({
              enabled: enabledRaw,
              updated_by_user_id: req.user?.userId || null,
              updated_at_utc: db.fn.now(),
            });
        }
      }

      success(res, {
        code: 'STRUCTURE_NODE_CREATED',
        message: 'Structure node created',
        data: {
          tenantId: access.tenantId,
          reason,
          node: {
            id: node.id,
            name: node.name,
            status: node.status,
            nodeType: node.node_type,
            parentId: node.parent_org_unit_id,
          },
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'STRUCTURE_NODE_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create structure node',
        httpStatus: 500,
      });
    }
  });
});

router.patch('/structure/nodes/:nodeId', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const nodeId = normalize(req.params.nodeId);
    if (!isUuid(nodeId)) {
      refusal(res, {
        code: 'NODE_ID_INVALID',
        message: 'nodeId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const requestedTenantId = normalize(req.body?.tenantId);
    const access = await ensureTenantAccess(req, res, { tenantId: requestedTenantId });
    if (!access) {
      return;
    }

    try {
      const node = await db
        .withSchema('platform')
        .table('org_units')
        .where({ id: nodeId, tenant_id: access.tenantId })
        .first(['id', 'tenant_id', 'name', 'status', 'node_type', 'parent_org_unit_id']);

      if (!node) {
        refusal(res, {
          code: 'NODE_NOT_FOUND',
          message: 'Node was not found in tenant scope',
          refusalType: 'client',
          httpStatus: 404,
        });
        return;
      }

      const patch: Record<string, unknown> = {
        updated_at_utc: db.fn.now(),
      };

      if (typeof req.body?.name === 'string' && normalize(req.body.name)) {
        patch.name = normalize(req.body.name);
      }

      if (req.body?.type !== undefined) {
        const nextType = normalize(req.body.type).toUpperCase();
        if (!NODE_TYPES.has(nextType as NodeType)) {
          refusal(res, {
            code: 'NODE_TYPE_INVALID',
            message: 'type must be one of SUBTENANT, ORGUNIT, GROUP',
            refusalType: 'client',
            httpStatus: 400,
          });
          return;
        }
        patch.node_type = nextType;
        patch.type = nextType;
      }

      await db
        .withSchema('platform')
        .table('org_units')
        .where({ id: nodeId, tenant_id: access.tenantId })
        .update(patch);

      if (req.body?.modulesOverrides && typeof req.body.modulesOverrides === 'object') {
        const tenantModules = await resolveTenantModuleMap(access.tenantId);
        for (const [moduleKeyRaw, enabledRaw] of Object.entries(req.body.modulesOverrides as Record<string, unknown>)) {
          const moduleKey = normalizeModuleKey(moduleKeyRaw);
          if (!moduleKey || typeof enabledRaw !== 'boolean') {
            continue;
          }

          if (enabledRaw === true && tenantModules[moduleKey] !== true) {
            refusal(res, {
              code: 'MODULE_ASSIGNMENT_OUT_OF_BOUNDS',
              message: 'Cannot enable a module that is disabled at tenant scope',
              refusalType: 'business',
              httpStatus: 409,
            });
            return;
          }

          await db
            .withSchema('platform')
            .table('org_unit_module_overrides')
            .insert({
              id: randomUUID(),
              tenant_id: access.tenantId,
              org_unit_id: nodeId,
              module_key: moduleKey,
              enabled: enabledRaw,
              created_by_user_id: req.user?.userId || null,
              updated_by_user_id: req.user?.userId || null,
              created_at_utc: db.fn.now(),
              updated_at_utc: db.fn.now(),
            })
            .onConflict(['org_unit_id', 'module_key'])
            .merge({
              enabled: enabledRaw,
              updated_by_user_id: req.user?.userId || null,
              updated_at_utc: db.fn.now(),
            });
        }
      }

      success(res, {
        code: 'STRUCTURE_NODE_UPDATED',
        message: 'Structure node updated',
        data: {
          tenantId: access.tenantId,
          nodeId,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'STRUCTURE_NODE_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update structure node',
        httpStatus: 500,
      });
    }
  });
});

router.post('/structure/nodes/move', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const requestedTenantId = normalize(req.body?.tenantId);
    const access = await ensureTenantAccess(req, res, { tenantId: requestedTenantId });
    if (!access) {
      return;
    }

    const nodeIds = Array.isArray(req.body?.nodeIds)
      ? req.body.nodeIds.map((value: unknown) => normalize(value)).filter((value: string) => isUuid(value))
      : [];
    const newParentId = normalize(req.body?.newParentId);

    if (nodeIds.length === 0 || (newParentId && !isUuid(newParentId))) {
      refusal(res, {
        code: 'NODE_MOVE_INPUT_INVALID',
        message: 'nodeIds[] and optional newParentId(UUID) are required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      const rules = await ensureTenantStructureRules(access.tenantId);
      const allNodes = await db
        .withSchema('platform')
        .table('org_units')
        .where({ tenant_id: access.tenantId })
        .select(['id', 'parent_org_unit_id', 'status']);
      const allNodeMap = new Map<string, any>();
      allNodes.forEach((node: any) => allNodeMap.set(String(node.id), node));

      if (newParentId) {
        const parentNode = allNodeMap.get(newParentId);
        if (!parentNode) {
          refusal(res, {
            code: 'MOVE_DESTINATION_NOT_FOUND',
            message: 'Destination parent node was not found',
            refusalType: 'client',
            httpStatus: 404,
          });
          return;
        }

        if (String(parentNode.status) === 'archived') {
          refusal(res, {
            code: 'MOVE_DESTINATION_ARCHIVED',
            message: 'Destination parent is archived',
            refusalType: 'business',
            httpStatus: 409,
          });
          return;
        }
      }

      const depthMap = computeStructureDepthMap(allNodes as Array<{ id: string; parent_org_unit_id: string | null }>);
      const destinationDepth = newParentId ? (depthMap.get(newParentId) || 1) : 0;

      for (const nodeId of nodeIds) {
        const node = allNodeMap.get(nodeId);
        if (!node) {
          refusal(res, {
            code: 'NODE_NOT_FOUND',
            message: `Node ${nodeId} was not found`,
            refusalType: 'client',
            httpStatus: 404,
          });
          return;
        }

        if (nodeId === newParentId) {
          refusal(res, {
            code: 'ORG_UNIT_CYCLE_DETECTED',
            message: 'A node cannot be moved under itself',
            refusalType: 'client',
            httpStatus: 409,
          });
          return;
        }

        if ((destinationDepth + 1) > rules.maxDepth) {
          refusal(res, {
            code: 'MAX_DEPTH_EXCEEDED',
            message: 'Move would exceed max depth',
            refusalType: 'business',
            httpStatus: 409,
          });
          return;
        }
      }

      await db.transaction(async (trx) => {
        for (const nodeId of nodeIds) {
          await trx
            .withSchema('platform')
            .table('org_units')
            .where({ id: nodeId, tenant_id: access.tenantId })
            .update({
              parent_org_unit_id: newParentId || null,
              updated_at_utc: trx.fn.now(),
            });
        }
      });

      success(res, {
        code: 'STRUCTURE_NODE_MOVE_COMPLETED',
        message: 'Structure nodes moved',
        data: {
          tenantId: access.tenantId,
          nodeIds,
          newParentId: newParentId || null,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'STRUCTURE_NODE_MOVE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to move structure nodes',
        httpStatus: 500,
      });
    }
  });
});

router.post('/structure/nodes/:nodeId/archive', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const nodeId = normalize(req.params.nodeId);
    if (!isUuid(nodeId)) {
      refusal(res, {
        code: 'NODE_ID_INVALID',
        message: 'nodeId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const requestedTenantId = normalize(req.body?.tenantId);
    const access = await ensureTenantAccess(req, res, { tenantId: requestedTenantId });
    if (!access) {
      return;
    }

    try {
      const node = await db
        .withSchema('platform')
        .table('org_units')
        .where({ id: nodeId, tenant_id: access.tenantId })
        .first(['id', 'status']);

      if (!node) {
        refusal(res, {
          code: 'NODE_NOT_FOUND',
          message: 'Node was not found',
          refusalType: 'client',
          httpStatus: 404,
        });
        return;
      }

      const childCountRow = await db
        .withSchema('platform')
        .table('org_units')
        .where({ tenant_id: access.tenantId, parent_org_unit_id: nodeId, status: 'active' })
        .count<{ count: string }[]>('* as count')
        .first();

      if (Number(childCountRow?.count || 0) > 0) {
        refusal(res, {
          code: 'NODE_HAS_ACTIVE_CHILDREN',
          message: 'Archive is blocked while active children exist',
          refusalType: 'business',
          httpStatus: 409,
        });
        return;
      }

      await db
        .withSchema('platform')
        .table('org_units')
        .where({ id: nodeId, tenant_id: access.tenantId })
        .update({
          status: 'archived',
          archived_at_utc: db.fn.now(),
          archived_by_user_id: req.user?.userId || null,
          updated_at_utc: db.fn.now(),
        });

      success(res, {
        code: 'STRUCTURE_NODE_ARCHIVED',
        message: 'Node archived',
        data: {
          tenantId: access.tenantId,
          nodeId,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'STRUCTURE_NODE_ARCHIVE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to archive node',
        httpStatus: 500,
      });
    }
  });
});

router.post('/structure/nodes/:nodeId/restore', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const nodeId = normalize(req.params.nodeId);
    if (!isUuid(nodeId)) {
      refusal(res, {
        code: 'NODE_ID_INVALID',
        message: 'nodeId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const requestedTenantId = normalize(req.body?.tenantId);
    const access = await ensureTenantAccess(req, res, { tenantId: requestedTenantId });
    if (!access) {
      return;
    }

    const newParentId = normalize(req.body?.newParentId);

    try {
      const node = await db
        .withSchema('platform')
        .table('org_units')
        .where({ id: nodeId, tenant_id: access.tenantId })
        .first(['id', 'status', 'parent_org_unit_id']);

      if (!node) {
        refusal(res, {
          code: 'NODE_NOT_FOUND',
          message: 'Node was not found',
          refusalType: 'client',
          httpStatus: 404,
        });
        return;
      }

      let targetParentId: string | null = node.parent_org_unit_id ? String(node.parent_org_unit_id) : null;
      if (targetParentId) {
        const parent = await db
          .withSchema('platform')
          .table('org_units')
          .where({ id: targetParentId, tenant_id: access.tenantId })
          .first(['id', 'status']);

        if (!parent || String(parent.status) === 'archived') {
          if (!newParentId) {
            success(res, {
              code: 'STRUCTURE_NODE_RESTORE_PARENT_REQUIRED',
              message: 'Select a new parent before restore',
              data: {
                requiresParentSelection: true,
                nodeId,
              },
            });
            return;
          }

          if (!isUuid(newParentId)) {
            refusal(res, {
              code: 'PARENT_NODE_INVALID',
              message: 'newParentId must be a UUID',
              refusalType: 'client',
              httpStatus: 400,
            });
            return;
          }

          targetParentId = newParentId;
        }
      }

      await db
        .withSchema('platform')
        .table('org_units')
        .where({ id: nodeId, tenant_id: access.tenantId })
        .update({
          status: 'active',
          parent_org_unit_id: targetParentId,
          archived_at_utc: null,
          archived_by_user_id: null,
          updated_at_utc: db.fn.now(),
        });

      success(res, {
        code: 'STRUCTURE_NODE_RESTORED',
        message: 'Node restored',
        data: {
          nodeId,
          tenantId: access.tenantId,
          parentId: targetParentId,
          requiresParentSelection: false,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'STRUCTURE_NODE_RESTORE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to restore node',
        httpStatus: 500,
      });
    }
  });
});

router.post('/structure/nodes/:nodeId/admin', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const nodeId = normalize(req.params.nodeId);
    if (!isUuid(nodeId)) {
      refusal(res, {
        code: 'NODE_ID_INVALID',
        message: 'nodeId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const requestedTenantId = normalize(req.body?.tenantId);
    const access = await ensureTenantAccess(req, res, { tenantId: requestedTenantId });
    if (!access) {
      return;
    }

    try {
      const node = await db
        .withSchema('platform')
        .table('org_units')
        .where({ id: nodeId, tenant_id: access.tenantId })
        .first(['id']);

      if (!node) {
        refusal(res, {
          code: 'NODE_NOT_FOUND',
          message: 'Node was not found',
          refusalType: 'client',
          httpStatus: 404,
        });
        return;
      }

      const assignment = req.body?.adminAssignment || req.body;
      const mode = normalize((assignment as any).mode).toLowerCase();
      const resolvedUser = await resolveScopedUserForAdminFlow(access.tenantId, {
        userId: mode === 'select' ? (assignment as any).userId : undefined,
        userEmail: mode === 'create' ? (assignment as any).email : (assignment as any).userEmail,
        firstName: (assignment as any).firstName,
        lastName: (assignment as any).lastName,
        temporaryPassword: (assignment as any).temporaryPassword,
        forceResetOnFirstLogin: (assignment as any).forceResetOnFirstLogin,
      });

      await upsertNodeAdminMembership(access.tenantId, nodeId, resolvedUser.userId);

      success(res, {
        code: 'STRUCTURE_NODE_ADMIN_ASSIGNED',
        message: 'Node admin assigned',
        data: {
          tenantId: access.tenantId,
          nodeId,
          userId: resolvedUser.userId,
          userEmail: resolvedUser.email,
          createdInline: resolvedUser.createdInline,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_REFERENCE_REQUIRED') {
        refusal(res, {
          code: 'USER_REFERENCE_REQUIRED',
          message: 'Provide a valid admin user reference',
          refusalType: 'client',
          httpStatus: 400,
        });
        return;
      }

      errorEnvelope(res, {
        code: 'STRUCTURE_NODE_ADMIN_ASSIGN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to assign node admin',
        httpStatus: 500,
      });
    }
  });
});

router.patch('/structure/nodes/:nodeId/modules', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const nodeId = normalize(req.params.nodeId);
    if (!isUuid(nodeId)) {
      refusal(res, {
        code: 'NODE_ID_INVALID',
        message: 'nodeId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const access = await ensureTenantAccess(req, res, { tenantId: normalize(req.body?.tenantId) });
    if (!access) {
      return;
    }

    const moduleKey = normalizeModuleKey(req.body?.moduleKey);
    const enabled = req.body?.enabled;

    if (!moduleKey || typeof enabled !== 'boolean') {
      refusal(res, {
        code: 'NODE_MODULE_OVERRIDE_INPUT_INVALID',
        message: 'moduleKey and enabled(boolean) are required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      const tenantModules = await resolveTenantModuleMap(access.tenantId);
      if (enabled === true && tenantModules[moduleKey] !== true) {
        refusal(res, {
          code: 'MODULE_ASSIGNMENT_OUT_OF_BOUNDS',
          message: 'Cannot enable a module that is disabled at tenant scope',
          refusalType: 'business',
          httpStatus: 409,
        });
        return;
      }

      await db
        .withSchema('platform')
        .table('org_unit_module_overrides')
        .insert({
          id: randomUUID(),
          tenant_id: access.tenantId,
          org_unit_id: nodeId,
          module_key: moduleKey,
          enabled,
          created_by_user_id: req.user?.userId || null,
          updated_by_user_id: req.user?.userId || null,
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .onConflict(['org_unit_id', 'module_key'])
        .merge({
          enabled,
          updated_by_user_id: req.user?.userId || null,
          updated_at_utc: db.fn.now(),
        });

      success(res, {
        code: 'NODE_MODULE_OVERRIDE_UPDATED',
        message: 'Node module override updated',
        data: {
          tenantId: access.tenantId,
          nodeId,
          moduleKey,
          enabled,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'NODE_MODULE_OVERRIDE_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update node module override',
        httpStatus: 500,
      });
    }
  });
});

router.post('/structure/nodes/modules/bulk-toggle', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const access = await ensureTenantAccess(req, res, { tenantId: normalize(req.body?.tenantId) });
    if (!access) {
      return;
    }

    const nodeIds = Array.isArray(req.body?.nodeIds)
      ? req.body.nodeIds.map((value: unknown) => normalize(value)).filter((value: string) => isUuid(value))
      : [];
    const moduleKey = normalizeModuleKey(req.body?.moduleKey);
    const enabled = req.body?.enabled;

    if (nodeIds.length === 0 || !moduleKey || typeof enabled !== 'boolean') {
      refusal(res, {
        code: 'BULK_MODULE_TOGGLE_INPUT_INVALID',
        message: 'nodeIds[], moduleKey, and enabled(boolean) are required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      const tenantModules = await resolveTenantModuleMap(access.tenantId);
      if (enabled === true && tenantModules[moduleKey] !== true) {
        refusal(res, {
          code: 'MODULE_ASSIGNMENT_OUT_OF_BOUNDS',
          message: 'Cannot enable a module that is disabled at tenant scope',
          refusalType: 'business',
          httpStatus: 409,
        });
        return;
      }

      await db.transaction(async (trx) => {
        for (const nodeId of nodeIds) {
          await trx
            .withSchema('platform')
            .table('org_unit_module_overrides')
            .insert({
              id: randomUUID(),
              tenant_id: access.tenantId,
              org_unit_id: nodeId,
              module_key: moduleKey,
              enabled,
              created_by_user_id: req.user?.userId || null,
              updated_by_user_id: req.user?.userId || null,
              created_at_utc: trx.fn.now(),
              updated_at_utc: trx.fn.now(),
            })
            .onConflict(['org_unit_id', 'module_key'])
            .merge({
              enabled,
              updated_by_user_id: req.user?.userId || null,
              updated_at_utc: trx.fn.now(),
            });
        }
      });

      success(res, {
        code: 'BULK_MODULE_TOGGLE_COMPLETED',
        message: 'Bulk module toggle completed',
        data: {
          tenantId: access.tenantId,
          nodeIds,
          moduleKey,
          enabled,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'BULK_MODULE_TOGGLE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to apply bulk module toggle',
        httpStatus: 500,
      });
    }
  });
});

router.get('/people', async (req: Request, res: Response) => {
  const access = await ensureTenantAccess(req, res, { tenantId: normalize(req.query.tenantId) });
  if (!access) {
    return;
  }

  const query = normalize(req.query.query).toLowerCase();
  const nodeIdFilter = normalize(req.query.nodeId);
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  try {
    const base = db('users as u')
      .where((scopeBuilder) => {
        scopeBuilder
          .whereExists(
            db
              .withSchema('platform')
              .table('tenant_memberships as tm')
              .select(db.raw('1'))
              .whereRaw('tm.user_id = u.id')
              .andWhere('tm.tenant_id', access.tenantId),
          )
          .orWhereExists(
            db
              .withSchema('platform')
              .table('org_unit_memberships as oum')
              .join('org_units as ou', 'ou.id', 'oum.org_unit_id')
              .select(db.raw('1'))
              .whereRaw('oum.user_id = u.id')
              .andWhere('ou.tenant_id', access.tenantId),
          );
      });

    if (query) {
      base.andWhere((builder) => {
        builder
          .whereRaw('LOWER(u.email) LIKE ?', [`%${query}%`])
          .orWhereRaw('LOWER(u.first_name) LIKE ?', [`%${query}%`])
          .orWhereRaw('LOWER(u.last_name) LIKE ?', [`%${query}%`]);
      });
    }

    if (nodeIdFilter && isUuid(nodeIdFilter)) {
      base.whereExists(
        db
          .withSchema('platform')
          .table('org_unit_memberships as n_oum')
          .select(db.raw('1'))
          .whereRaw('n_oum.user_id = u.id')
          .andWhere('n_oum.org_unit_id', nodeIdFilter),
      );
    }

    const totalRow = await base.clone().count<{ count: string }[]>('u.id as count').first();
    const users = await base
      .clone()
      .select([
        'u.id',
        'u.email',
        'u.first_name',
        'u.last_name',
        'u.must_reset_password',
        'u.last_login_at',
      ])
      .orderByRaw('LOWER(u.last_name) ASC, LOWER(u.first_name) ASC, u.id ASC')
      .limit(pageSize)
      .offset(offset);

    const userIds = users.map((user: any) => String(user.id));
    const tenantRolesByUser = new Map<string, string[]>();
    const nodeByUser = new Map<string, string>();

    if (userIds.length > 0) {
      const membershipRows = await db
        .withSchema('platform')
        .table('tenant_memberships')
        .where({ tenant_id: access.tenantId })
        .whereIn('user_id', userIds)
        .select(['user_id', 'role_set_json']);

      membershipRows.forEach((row: any) => {
        tenantRolesByUser.set(String(row.user_id), parseRoleSet(row.role_set_json));
      });

      const orgMembershipRows = await db
        .withSchema('platform')
        .table('org_unit_memberships as oum')
        .join('org_units as ou', 'ou.id', 'oum.org_unit_id')
        .whereIn('oum.user_id', userIds)
        .andWhere('ou.tenant_id', access.tenantId)
        .orderBy('ou.created_at_utc', 'asc')
        .orderBy('oum.created_at_utc', 'asc')
        .select(['oum.user_id as user_id', 'oum.org_unit_id as org_unit_id']);

      orgMembershipRows.forEach((row: any) => {
        const userId = String(row.user_id);
        const orgUnitId = String(row.org_unit_id);
        if (!nodeByUser.has(userId) && isUuid(orgUnitId)) {
          nodeByUser.set(userId, orgUnitId);
        }
      });
    }

    success(res, {
      code: 'TENANT_PEOPLE_RESOLVED',
      message: 'People resolved',
      data: {
        tenantId: access.tenantId,
        page,
        pageSize,
        total: Number(totalRow?.count || 0),
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: toPlainTenantRole(tenantRolesByUser.get(String(user.id)) || []),
          nodeId: nodeByUser.get(String(user.id)) || null,
          mustResetPassword: user.must_reset_password === true,
          lastLoginAt: user.last_login_at,
        })),
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'TENANT_PEOPLE_RESOLVE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve people',
      httpStatus: 500,
    });
  }
});

router.post('/people', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const access = await ensureTenantAccess(req, res, { tenantId: normalize(req.body?.tenantId) });
    if (!access) {
      return;
    }

    const email = normalize(req.body?.email).toLowerCase();
    const firstName = normalize(req.body?.firstName);
    const lastName = normalize(req.body?.lastName);
    const temporaryPassword = normalize(req.body?.temporaryPassword);
    const forceResetOnFirstLogin = req.body?.forceResetOnFirstLogin !== false;
    const nodeId = normalize(req.body?.nodeId);
    const role = normalize(req.body?.role).toUpperCase();

    if (!isEmail(email) || !firstName || !lastName || !temporaryPassword) {
      refusal(res, {
        code: 'PEOPLE_CREATE_INPUT_INVALID',
        message: 'email, firstName, lastName, and temporaryPassword are required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      const existing = await db('users').whereRaw('LOWER(email) = ?', [email]).first(['id']);
      if (existing) {
        refusal(res, {
          code: 'USER_ALREADY_EXISTS',
          message: 'A user with this email already exists',
          refusalType: 'business',
          httpStatus: 409,
        });
        return;
      }

      const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
      const [user] = await db('users')
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          household_id: null,
          role: 'member',
          must_reset_password: forceResetOnFirstLogin,
          password_set_by_admin: true,
        })
        .returning(['id', 'email', 'first_name', 'last_name', 'household_id', 'role', 'must_reset_password']);

      if (!user) {
        throw new Error('USER_CREATE_FAILED');
      }

      if (nodeId && isUuid(nodeId)) {
        const orgRoleSet = role === 'ADMIN' ? ['ORGUNIT_ADMIN'] : ['ORGUNIT_MEMBER'];
        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .insert({
            org_unit_id: nodeId,
            user_id: user.id,
            role_set_json: JSON.stringify(orgRoleSet),
            created_at_utc: db.fn.now(),
            updated_at_utc: db.fn.now(),
          })
          .onConflict(['org_unit_id', 'user_id'])
          .merge({
            role_set_json: JSON.stringify(orgRoleSet),
            updated_at_utc: db.fn.now(),
          });
      }

      const tenantRoleSet = role === 'VIEWER' ? ['TENANT_VIEWER'] : role === 'ADMIN' ? ['TENANT_ADMIN'] : ['TENANT_STAFF'];
      await db
        .withSchema('platform')
        .table('tenant_memberships')
        .insert({
          tenant_id: access.tenantId,
          user_id: user.id,
          role_set_json: JSON.stringify(tenantRoleSet),
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .onConflict(['tenant_id', 'user_id'])
        .merge({
          role_set_json: JSON.stringify(tenantRoleSet),
          updated_at_utc: db.fn.now(),
        });

      success(res, {
        code: 'TENANT_PERSON_CREATED',
        message: 'Person created',
        data: {
          tenantId: access.tenantId,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: tenantRoleSet[0],
            mustResetPassword: user.must_reset_password === true,
          },
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'TENANT_PERSON_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create person',
        httpStatus: 500,
      });
    }
  });
});

router.patch('/people/:userId', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const userId = normalize(req.params.userId);
    if (!isUuid(userId)) {
      refusal(res, {
        code: 'USER_ID_INVALID',
        message: 'userId must be a UUID',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const access = await ensureTenantAccess(req, res, { tenantId: normalize(req.body?.tenantId) });
    if (!access) {
      return;
    }

    const role = normalize(req.body?.role).toUpperCase();
    const nodeId = normalize(req.body?.nodeId);
    const archiveUser = req.body?.archiveUser === true;

    try {
      if (archiveUser) {
        await db.withSchema('platform').table('tenant_memberships').where({ tenant_id: access.tenantId, user_id: userId }).del();
        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .whereIn(
            'org_unit_id',
            db
              .withSchema('platform')
              .table('org_units')
              .where({ tenant_id: access.tenantId })
              .select('id'),
          )
          .andWhere({ user_id: userId })
          .del();

        await db('users')
          .where({ id: userId })
          .update({
            role: 'member',
            updated_at: db.fn.now(),
          });

        success(res, {
          code: 'TENANT_PERSON_ARCHIVED',
          message: 'Person archived from tenant access',
          data: {
            tenantId: access.tenantId,
            userId,
          },
        });
        return;
      }

      if (role) {
        const tenantRoleSet = role === 'VIEWER' ? ['TENANT_VIEWER'] : role === 'ADMIN' ? ['TENANT_ADMIN'] : ['TENANT_STAFF'];
        await db
          .withSchema('platform')
          .table('tenant_memberships')
          .insert({
            tenant_id: access.tenantId,
            user_id: userId,
            role_set_json: JSON.stringify(tenantRoleSet),
            created_at_utc: db.fn.now(),
            updated_at_utc: db.fn.now(),
          })
          .onConflict(['tenant_id', 'user_id'])
          .merge({
            role_set_json: JSON.stringify(tenantRoleSet),
            updated_at_utc: db.fn.now(),
          });
      }

      if (nodeId && isUuid(nodeId)) {
        const orgRoleSet = role === 'ADMIN' ? ['ORGUNIT_ADMIN'] : ['ORGUNIT_MEMBER'];

        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .whereIn(
            'org_unit_id',
            db
              .withSchema('platform')
              .table('org_units')
              .where({ tenant_id: access.tenantId })
              .select('id'),
          )
          .andWhere({ user_id: userId })
          .del();

        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .insert({
            org_unit_id: nodeId,
            user_id: userId,
            role_set_json: JSON.stringify(orgRoleSet),
            created_at_utc: db.fn.now(),
            updated_at_utc: db.fn.now(),
          })
          .onConflict(['org_unit_id', 'user_id'])
          .merge({
            role_set_json: JSON.stringify(orgRoleSet),
            updated_at_utc: db.fn.now(),
          });
      }

      success(res, {
        code: 'TENANT_PERSON_UPDATED',
        message: 'Person updated',
        data: {
          tenantId: access.tenantId,
          userId,
          role: role || null,
          nodeId: nodeId || null,
        },
      });
    } catch (error) {
      errorEnvelope(res, {
        code: 'TENANT_PERSON_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update person',
        httpStatus: 500,
      });
    }
  });
});

router.get('/integrity/summary', async (req: Request, res: Response) => {
  const access = await ensureTenantAccess(req, res, {
    tenantId: normalize(req.query.tenantId),
    requireSystem: true,
  });
  if (!access) {
    return;
  }

  try {
    const tenants = await db.withSchema('platform').table('tenants').orderBy('name', 'asc').select(['id', 'name', 'status']);

    const summary = [] as Array<Record<string, unknown>>;
    for (const tenant of tenants as any[]) {
      const issues = await resolveIntegrityIssues(String(tenant.id));
      const countsBySeverity = issues.reduce((acc, issue) => {
        const current = (acc[issue.severity] as number | undefined) || 0;
        acc[issue.severity] = current + issue.count;
        return acc;
      }, {} as Record<string, number>);

      summary.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        status: tenant.status,
        totalIssues: issues.reduce((sum, issue) => sum + issue.count, 0),
        countsBySeverity,
        topIssues: issues
          .filter((issue) => issue.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((issue) => ({
            issueType: issue.issueType,
            severity: issue.severity,
            count: issue.count,
          })),
      });
    }

    success(res, {
      code: 'INTEGRITY_SUMMARY_RESOLVED',
      message: 'Integrity summary resolved',
      data: {
        tenants: summary.sort((a, b) => Number(b.totalIssues) - Number(a.totalIssues)),
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'INTEGRITY_SUMMARY_RESOLVE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve integrity summary',
      httpStatus: 500,
    });
  }
});

router.get('/integrity', async (req: Request, res: Response) => {
  const tenantIdFromQuery = normalize(req.query.tenantId);
  const access = await ensureTenantAccess(req, res, {
    tenantId: tenantIdFromQuery,
    requireSystem: false,
  });
  if (!access) {
    return;
  }

  try {
    const issues = await resolveIntegrityIssues(access.tenantId);

    const severitySortOrder: Record<Severity, number> = {
      CRITICAL: 3,
      WARNING: 2,
      INFO: 1,
    };

    success(res, {
      code: 'INTEGRITY_ISSUES_RESOLVED',
      message: 'Integrity issues resolved',
      data: {
        tenantId: access.tenantId,
        issues: issues
          .sort((a, b) => {
            const severityDelta = severitySortOrder[b.severity] - severitySortOrder[a.severity];
            if (severityDelta !== 0) {
              return severityDelta;
            }
            return a.issueType.localeCompare(b.issueType);
          }),
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'INTEGRITY_ISSUES_RESOLVE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve integrity issues',
      httpStatus: 500,
    });
  }
});

router.post('/integrity/fix', async (req: Request, res: Response) => {
  await withIdempotency(req, res, async () => {
    const access = await ensureTenantAccess(req, res, { tenantId: normalize(req.body?.tenantId) });
    if (!access) {
      return;
    }

    const actionType = normalize(req.body?.actionType || req.body?.action_type).toUpperCase();
    const target = req.body?.target && typeof req.body.target === 'object' ? req.body.target as Record<string, unknown> : {};

    if (!actionType) {
      refusal(res, {
        code: 'INTEGRITY_FIX_INPUT_INVALID',
        message: 'actionType is required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    try {
      if (actionType === 'ASSIGN_ADMIN') {
        const nodeId = normalize(target.nodeId);
        if (!isUuid(nodeId)) {
          throw new Error('TARGET_NODE_REQUIRED');
        }

        const resolvedUser = await resolveScopedUserForAdminFlow(access.tenantId, {
          userId: normalize(target.userId) || undefined,
          userEmail: normalize(target.userEmail) || undefined,
          firstName: normalize(target.firstName) || undefined,
          lastName: normalize(target.lastName) || undefined,
          temporaryPassword: normalize(target.temporaryPassword) || undefined,
          forceResetOnFirstLogin: target.forceResetOnFirstLogin === false ? false : true,
        });

        await upsertNodeAdminMembership(access.tenantId, nodeId, resolvedUser.userId);
      } else if (actionType === 'MOVE_NODE') {
        const nodeId = normalize(target.nodeId);
        const newParentId = normalize(target.newParentId);
        if (!isUuid(nodeId)) {
          throw new Error('TARGET_NODE_REQUIRED');
        }

        await db
          .withSchema('platform')
          .table('org_units')
          .where({ id: nodeId, tenant_id: access.tenantId })
          .update({
            parent_org_unit_id: isUuid(newParentId) ? newParentId : null,
            updated_at_utc: db.fn.now(),
          });
      } else if (actionType === 'DISABLE_OVERRIDE') {
        const nodeId = normalize(target.nodeId);
        const moduleKey = normalizeModuleKey(target.moduleKey);
        if (!isUuid(nodeId) || !moduleKey) {
          throw new Error('TARGET_OVERRIDE_REQUIRED');
        }

        await db
          .withSchema('platform')
          .table('org_unit_module_overrides')
          .where({ tenant_id: access.tenantId, org_unit_id: nodeId, module_key: moduleKey })
          .del();
      } else if (actionType === 'ADD_NUMBER_MAPPING') {
        const nodeId = normalize(target.nodeId);
        const twilioNumberE164 = normalize(target.twilioNumberE164);
        const label = normalize(target.label) || 'Primary';
        if (!isUuid(nodeId) || !twilioNumberE164) {
          throw new Error('TARGET_NUMBER_MAPPING_REQUIRED');
        }

        const result = await connectShyftNumberMappingServiceAsync.createMapping({
          actorRoles: [req.user?.role || null],
          tenantId: access.tenantId,
          orgUnitId: nodeId,
          twilioNumberE164,
          label,
          isActive: true,
        });
        if (!result.ok) {
          throw new Error(result.message);
        }
      } else if (actionType === 'REASSIGN_NUMBER_MAPPING') {
        const mappingId = normalize(target.mappingId);
        const newOrgUnitId = normalize(target.newOrgUnitId);
        const twilioNumberE164 = normalize(target.twilioNumberE164);
        const label = normalize(target.label) || 'Reassigned';

        if (!isUuid(mappingId) || !isUuid(newOrgUnitId) || !twilioNumberE164) {
          throw new Error('TARGET_NUMBER_MAPPING_REQUIRED');
        }

        const update = await connectShyftNumberMappingServiceAsync.updateMapping({
          actorRoles: [req.user?.role || null],
          tenantId: access.tenantId,
          orgUnitId: newOrgUnitId,
          mappingId,
          twilioNumberE164,
          label,
          isActive: true,
        });
        if (!update.ok) {
          throw new Error(update.message);
        }
      } else if (actionType === 'MOVE_USER') {
        const userId = normalize(target.userId);
        const newNodeId = normalize(target.newNodeId || target.nodeId);
        if (!isUuid(userId) || !isUuid(newNodeId)) {
          throw new Error('TARGET_USER_MOVE_REQUIRED');
        }

        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .whereIn('org_unit_id', db.withSchema('platform').table('org_units').where({ tenant_id: access.tenantId }).select('id'))
          .andWhere({ user_id: userId })
          .del();

        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .insert({
            org_unit_id: newNodeId,
            user_id: userId,
            role_set_json: JSON.stringify(['ORGUNIT_MEMBER']),
            created_at_utc: db.fn.now(),
            updated_at_utc: db.fn.now(),
          })
          .onConflict(['org_unit_id', 'user_id'])
          .merge({
            role_set_json: JSON.stringify(['ORGUNIT_MEMBER']),
            updated_at_utc: db.fn.now(),
          });
      } else if (actionType === 'ARCHIVE_USER') {
        const userId = normalize(target.userId);
        if (!isUuid(userId)) {
          throw new Error('TARGET_USER_REQUIRED');
        }

        await db.withSchema('platform').table('tenant_memberships').where({ tenant_id: access.tenantId, user_id: userId }).del();
        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .whereIn('org_unit_id', db.withSchema('platform').table('org_units').where({ tenant_id: access.tenantId }).select('id'))
          .andWhere({ user_id: userId })
          .del();
      } else if (actionType === 'REMOVE_ADMIN') {
        const userId = normalize(target.userId);
        const nodeId = normalize(target.nodeId);
        if (!isUuid(userId) || !isUuid(nodeId)) {
          throw new Error('TARGET_ADMIN_REQUIRED');
        }

        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .where({ org_unit_id: nodeId, user_id: userId })
          .del();
      } else {
        refusal(res, {
          code: 'INTEGRITY_FIX_ACTION_UNSUPPORTED',
          message: `Unsupported actionType: ${actionType}`,
          refusalType: 'client',
          httpStatus: 400,
        });
        return;
      }

      success(res, {
        code: 'INTEGRITY_FIX_APPLIED',
        message: 'Integrity fix applied',
        data: {
          tenantId: access.tenantId,
          actionType,
          target,
        },
      });
    } catch (error) {
      const codeMap: Record<string, string> = {
        TARGET_NODE_REQUIRED: 'TARGET_NODE_REQUIRED',
        TARGET_OVERRIDE_REQUIRED: 'TARGET_OVERRIDE_REQUIRED',
        TARGET_NUMBER_MAPPING_REQUIRED: 'TARGET_NUMBER_MAPPING_REQUIRED',
        TARGET_USER_MOVE_REQUIRED: 'TARGET_USER_MOVE_REQUIRED',
        TARGET_USER_REQUIRED: 'TARGET_USER_REQUIRED',
        TARGET_ADMIN_REQUIRED: 'TARGET_ADMIN_REQUIRED',
      };

      if (error instanceof Error && codeMap[error.message]) {
        refusal(res, {
          code: codeMap[error.message],
          message: error.message,
          refusalType: 'client',
          httpStatus: 400,
        });
        return;
      }

      errorEnvelope(res, {
        code: 'INTEGRITY_FIX_FAILED',
        message: error instanceof Error ? error.message : 'Failed to apply integrity fix',
        httpStatus: 500,
      });
    }
  });
});

router.get('/audit/events', async (req: Request, res: Response) => {
  const requestedTenantId = normalize(req.query.tenantId);
  const requireSystem = requestedTenantId.length === 0;

  const access = await ensureTenantAccess(req, res, {
    tenantId: requestedTenantId,
    requireSystem,
  });
  if (!access) {
    return;
  }

  const actorId = normalize(req.query.actorId);
  const action = normalize(req.query.action);
  const dateFrom = normalize(req.query.dateFrom);
  const dateTo = normalize(req.query.dateTo);
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 25)));
  const offset = (page - 1) * pageSize;

  try {
    const base = db
      .withSchema('platform')
      .table('events')
      .where({ tenant_id: access.tenantId });

    if (actorId && isUuid(actorId)) {
      base.andWhere('actor_id', actorId);
    }

    if (action) {
      base.andWhereRaw('LOWER(event_name) LIKE ?', [`%${action.toLowerCase()}%`]);
    }

    if (dateFrom) {
      base.andWhere('occurred_at_utc', '>=', dateFrom);
    }

    if (dateTo) {
      base.andWhere('occurred_at_utc', '<=', dateTo);
    }

    const totalRow = await base.clone().count<{ count: string }[]>('* as count').first();
    const rows = await base
      .clone()
      .orderBy('occurred_at_utc', 'desc')
      .orderBy('id', 'asc')
      .limit(pageSize)
      .offset(offset)
      .select([
        'id',
        'tenant_id',
        'actor_id',
        'event_name',
        'entity_type',
        'entity_id',
        'occurred_at_utc',
        'payload',
      ]);

    success(res, {
      code: 'AUDIT_EVENTS_RESOLVED',
      message: 'Audit events resolved',
      data: {
        tenantId: access.tenantId,
        page,
        pageSize,
        total: Number(totalRow?.count || 0),
        events: rows.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          actorId: row.actor_id,
          eventName: row.event_name,
          entityType: row.entity_type,
          entityId: row.entity_id,
          occurredAtUtc: row.occurred_at_utc,
          payload: row.payload,
        })),
      },
    });
  } catch (error) {
    errorEnvelope(res, {
      code: 'AUDIT_EVENTS_RESOLVE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve audit events',
      httpStatus: 500,
    });
  }
});

export default router;
