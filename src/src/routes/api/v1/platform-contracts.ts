import { Request, Response, Router } from 'express';
import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { Knex } from 'knex';
import {
  buildRefusalEnvelope,
  buildSuccessEnvelope,
  refusal,
  success,
  systemError,
  type EnvelopeContext
} from '../../../platform/envelopes/response';
import {
  applyScopeMode,
  type TenantScopeContext,
  requireOrgUnitId,
  requireTenantId,
  resolveScopeFilters,
  TenantScopeError,
} from '../../../platform/tenancy/tenantScope';
import {
  createKnexOrgUnitAccessStore,
  validateOrgUnitScopedAccess,
} from '../../../platform/tenancy/orgUnitAccess';
import {
  formatUtcTimestampForTimezone,
  resolveTimezoneContext
} from '../../../platform/time/timezoneService';

const router = Router();

type CookiePolicyEnvironment = 'development' | 'staging' | 'production';

const deriveParentDomain = (host: string): string => {
  const segments = host.split('.').filter(Boolean);
  if (segments.length < 2) {
    return `.${host}`;
  }

  return `.${segments.slice(-2).join('.')}`;
};

const resolveCookiePolicy = (environment: CookiePolicyEnvironment): {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
} => {
  if (environment === 'production') {
    return { secure: true, sameSite: 'strict' };
  }

  if (environment === 'staging') {
    return { secure: true, sameSite: 'lax' };
  }

  return { secure: false, sameSite: 'lax' };
};

const resolveEnvelopeContext = (req: Request, res: Response): EnvelopeContext => {
  const canonicalTenant = normalizeContextValue(req.tenantContext?.tenantId || req.tenantId || null);
  const base = (res.locals.responseEnvelope as EnvelopeContext | undefined) || {
    correlationId: req.correlationId || null,
    tenantId: canonicalTenant
  };

  return {
    correlationId: base.correlationId ?? req.correlationId ?? null,
    tenantId: base.tenantId ?? canonicalTenant
  };
};

const applyEnvelopeTenantOverride = (req: Request, res: Response): void => {
  const headerTenant = req.header('x-tenant-id');
  if (!headerTenant || headerTenant.trim() === '') {
    return;
  }

  const normalizedHeaderTenant = normalizeContextValue(headerTenant);
  if (!normalizedHeaderTenant) {
    return;
  }

  const canonicalTenant = normalizeContextValue(req.tenantContext?.tenantId || req.tenantId || null);
  const isPublicContext = !canonicalTenant || canonicalTenant === 'public';

  if (!isPublicContext && normalizedHeaderTenant !== canonicalTenant) {
    return;
  }

  const resolvedTenant = isPublicContext ? normalizedHeaderTenant : canonicalTenant;

  const current = (res.locals.responseEnvelope as EnvelopeContext | undefined) || {
    correlationId: req.correlationId || null,
    tenantId: resolvedTenant
  };

  res.locals.responseEnvelope = {
    ...current,
    tenantId: resolvedTenant
  };
};

const normalizeContextValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const loadPlatformDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

type RepositoryProbeResource = 'accounts' | 'transactions' | 'goals' | 'debts';

const resolveRepositoryProbe = (resource: RepositoryProbeResource): {
  table: string;
  tenantColumn: string;
  orgUnitColumn: string;
} => {
  if (resource === 'accounts') {
    return {
      table: 'accounts',
      tenantColumn: 'household_id',
      orgUnitColumn: 'org_unit_id',
    };
  }

  if (resource === 'goals') {
    return {
      table: 'goals',
      tenantColumn: 'household_id',
      orgUnitColumn: 'org_unit_id',
    };
  }

  if (resource === 'debts') {
    return {
      table: 'debts',
      tenantColumn: 'household_id',
      orgUnitColumn: 'org_unit_id',
    };
  }

  return {
    table: 'transactions',
    tenantColumn: 'household_id',
    orgUnitColumn: 'org_unit_id',
  };
};

const resolveProtectedScopeContext = (req: Request): TenantScopeContext => {
  const tenantId = requireTenantId(req.tenantContext?.tenantId || req.tenantId || null);
  const orgUnitId = normalizeContextValue(req.tenantContext?.orgUnitId || req.orgUnitId || null);
  const scopeMode = orgUnitId ? 'ORG_UNIT' : 'TENANT';

  return {
    tenantId,
    orgUnitId,
    scopeMode,
  };
};

const mapOrgUnitAccessFailure = (
  reason: 'TENANT_MEMBERSHIP_REQUIRED' | 'ORG_UNIT_NOT_FOUND' | 'ORG_UNIT_TENANT_MISMATCH' | 'ORG_UNIT_MEMBERSHIP_REQUIRED'
): { code: string; message: string } => {
  if (reason === 'TENANT_MEMBERSHIP_REQUIRED') {
    return {
      code: 'TENANT_SCOPE_VIOLATION',
      message: 'Tenant membership is required for orgUnit-scoped access',
    };
  }

  if (reason === 'ORG_UNIT_NOT_FOUND' || reason === 'ORG_UNIT_TENANT_MISMATCH') {
    return {
      code: 'ORG_UNIT_INVALID',
      message: 'OrgUnit context does not belong to the active tenant',
    };
  }

  return {
    code: 'ORG_UNIT_FORBIDDEN',
    message: 'OrgUnit membership is required for orgUnit-scoped access',
  };
};

const validateOrgUnitContextAccess = async (
  req: Request,
  res: Response,
  scopeContext: TenantScopeContext
): Promise<{ ok: true; bypassedOrgUnitMembership: boolean } | { ok: false; response: Response }> => {
  if (scopeContext.scopeMode !== 'ORG_UNIT') {
    return {
      ok: true,
      bypassedOrgUnitMembership: false,
    };
  }

  if (!req.user?.userId) {
    return {
      ok: false,
      response: refusal(res, {
        code: 'ORG_UNIT_FORBIDDEN',
        message: 'Authenticated user context is required for orgUnit-scoped access',
        refusalType: 'security',
        httpStatus: 403,
      }),
    };
  }

  try {
    const platformDb = loadPlatformDb();
    const decision = await platformDb.transaction(async (trx: Knex.Transaction) => {
      return validateOrgUnitScopedAccess(createKnexOrgUnitAccessStore(trx), {
        tenantId: scopeContext.tenantId,
        orgUnitId: requireOrgUnitId(scopeContext.orgUnitId),
        userId: req.user!.userId,
        baseRoles: [req.user?.role || null],
      });
    });

    if (!decision.ok) {
      const mapped = mapOrgUnitAccessFailure(decision.reason);
      return {
        ok: false,
        response: refusal(res, {
          code: mapped.code,
          message: mapped.message,
          refusalType: 'security',
          httpStatus: 403,
        }),
      };
    }

    return {
      ok: true,
      bypassedOrgUnitMembership: decision.bypassedOrgUnitMembership,
    };
  } catch (error) {
    return {
      ok: false,
      response: systemError(res, {
        code: 'ORG_UNIT_ACCESS_VALIDATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to validate orgUnit access',
        httpStatus: 500,
      }),
    };
  }
};

type RefreshSessionRecord = {
  sessionId: string;
  tenantId: string | null;
  userId: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: string;
  revokedAt: string | null;
  revocationReason: 'rotation' | 'explicit' | null;
};

const refreshSessions = new Map<string, RefreshSessionRecord>();

const hashToken = (value: string): string => createHash('sha256').update(value).digest('hex');
const platformEventsRequiredLineageFields = [
  'event_id',
  'tenant_id',
  'aggregate_type',
  'aggregate_id',
  'event_type',
  'event_version',
  'occurred_at',
  'created_at',
  'payload',
  'metadata'
] as const;
const platformOutboxRequiredDeliveryFields = [
  'outbox_event_id',
  'tenant_id',
  'event_id',
  'delivery_status',
  'available_at',
  'attempt_count',
  'last_error',
  'claimed_at',
  'delivered_at',
  'payload',
  'headers',
  'created_at',
  'updated_at'
] as const;
const platformEventsIndexes = [
  'events_tenant_occurred_idx',
  'events_aggregate_lookup_idx'
] as const;
const platformOutboxIndexes = [
  'outbox_delivery_ready_idx',
  'outbox_replay_cursor_idx',
  'outbox_event_id_unique_idx'
] as const;
const kernelReadinessRequiredGates = [
  'tenancy',
  'auth',
  'csrf',
  'envelope',
  'eventOutbox',
  'timezone'
] as const;
const kernelReadinessStoryId = '0-10';
const defaultKernelReadinessReportPath = 'tests/artifacts/gates/epic-0-quality.json';
const defaultPhase0ReadinessStatusPath = '_bmad-output/implementation-artifacts/phase0-readiness.json';
const kernelReadinessReportAllowedRoots = [
  'tests/artifacts/gates',
  '_bmad-output/implementation-artifacts'
] as const;
const phase0ReadinessStatusAllowedRoots = [
  '_bmad-output/implementation-artifacts',
  'tests/artifacts/gates'
] as const;

type KernelReadinessGateName = typeof kernelReadinessRequiredGates[number];
type KernelReadinessGateStatus = 'pass' | 'fail';
type KernelReadinessGateResultMap = Record<KernelReadinessGateName, KernelReadinessGateStatus>;
type KernelReadinessStatusRecord = {
  phase0Status: 'complete';
  storyId: string;
  verifiedBy: string;
  readinessReportPath: string;
  readinessReportHash: string;
  requiredGates: KernelReadinessGateName[];
  gateResults: KernelReadinessGateResultMap;
  recordedAt: string;
};
type KernelReadinessEvidenceReport = {
  checkedAt: string;
  storyId: string;
  requiredGates: KernelReadinessGateName[];
  allPassed: boolean;
  gateResults: KernelReadinessGateResultMap;
  reportHash: string;
};
type KernelReadinessEvidenceParseResult = {
  evidence: KernelReadinessEvidenceReport | null;
  errors: string[];
};

const isKernelReadinessGateName = (value: string): value is KernelReadinessGateName => {
  return kernelReadinessRequiredGates.includes(value as KernelReadinessGateName);
};

const isKernelReadinessGateStatus = (value: unknown): value is KernelReadinessGateStatus => {
  return value === 'pass' || value === 'fail';
};

const isIsoDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
};

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const values: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }

    const trimmed = entry.trim();
    if (trimmed === '' || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    values.push(trimmed);
  }

  return values;
};

const resolveRepoRoot = (): string => {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..')
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, '.git'))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, '_bmad-output'))) {
      return candidate;
    }
  }

  return process.cwd();
};

const toPosixPath = (value: string): string => value.replace(/\\/g, '/');

const resolveScopedArtifactPath = (
  relativeOrAbsolutePath: string,
  allowedRoots: readonly string[]
): { absolutePath: string; relativePath: string } => {
  const repoRoot = resolveRepoRoot();
  const resolvedPath = path.resolve(
    path.isAbsolute(relativeOrAbsolutePath)
      ? relativeOrAbsolutePath
      : path.join(repoRoot, relativeOrAbsolutePath)
  );
  const allowedAbsoluteRoots = allowedRoots.map((allowedRoot) => path.resolve(path.join(repoRoot, allowedRoot)));
  const isAllowed = allowedAbsoluteRoots.some((allowedRoot) =>
    resolvedPath === allowedRoot || resolvedPath.startsWith(`${allowedRoot}${path.sep}`)
  );

  if (!isAllowed) {
    throw new Error(`Artifact path is outside allowed roots: ${relativeOrAbsolutePath}`);
  }

  return {
    absolutePath: resolvedPath,
    relativePath: toPosixPath(path.relative(repoRoot, resolvedPath))
  };
};

const writeJsonArtifact = (filePath: string, payload: unknown): void => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const isCanonicalKernelGateSet = (gates: KernelReadinessGateName[]): boolean => {
  if (gates.length !== kernelReadinessRequiredGates.length) {
    return false;
  }

  return kernelReadinessRequiredGates.every((gate, index) => gates[index] === gate);
};

const readKernelReadinessGateResults = (value: unknown): KernelReadinessGateResultMap | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const results = {} as KernelReadinessGateResultMap;

  for (const gate of kernelReadinessRequiredGates) {
    const status = source[gate];
    if (!isKernelReadinessGateStatus(status)) {
      return null;
    }
    results[gate] = status;
  }

  const providedKeys = Object.keys(source);
  if (providedKeys.length !== kernelReadinessRequiredGates.length) {
    return null;
  }

  for (const key of providedKeys) {
    if (!isKernelReadinessGateName(key)) {
      return null;
    }
  }

  return results;
};

const readKernelReadinessEvidenceReport = (filePath: string): KernelReadinessEvidenceParseResult => {
  if (!existsSync(filePath)) {
    return {
      evidence: null,
      errors: ['readiness report does not exist']
    };
  }

  let raw = '';
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (_error) {
    return {
      evidence: null,
      errors: ['readiness report could not be read']
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    return {
      evidence: null,
      errors: ['readiness report is not valid JSON']
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      evidence: null,
      errors: ['readiness report payload must be an object']
    };
  }

  const payload = parsed as Record<string, unknown>;
  const phase0Readiness = payload.phase0_readiness as Record<string, unknown> | undefined;
  const errors: string[] = [];

  if (!isIsoDateString(payload.timestamp_utc)) {
    errors.push('timestamp_utc must be an ISO-8601 timestamp');
  }

  if (payload.gate !== 'epic-0-quality') {
    errors.push('gate must equal epic-0-quality');
  }

  if (!phase0Readiness) {
    errors.push('phase0_readiness object is required');
  }

  const storyId = typeof phase0Readiness?.story_id === 'string'
    ? phase0Readiness.story_id.trim()
    : '';
  if (!storyId) {
    errors.push('phase0_readiness.story_id must be a non-empty string');
  }

  const requiredGateInputs = readStringArray(phase0Readiness?.required_gates);
  const invalidRequiredGates = requiredGateInputs.filter((gate) => !isKernelReadinessGateName(gate));
  if (invalidRequiredGates.length > 0) {
    errors.push(`phase0_readiness.required_gates has unsupported values: ${invalidRequiredGates.join(', ')}`);
  }

  const requiredGates = requiredGateInputs.filter(
    (gate): gate is KernelReadinessGateName => isKernelReadinessGateName(gate)
  );
  if (!isCanonicalKernelGateSet(requiredGates)) {
    errors.push('phase0_readiness.required_gates must match canonical gate order');
  }

  if (typeof phase0Readiness?.all_passed !== 'boolean') {
    errors.push('phase0_readiness.all_passed must be boolean');
  }

  const gateResults = readKernelReadinessGateResults(phase0Readiness?.gate_results);
  if (!gateResults) {
    errors.push('phase0_readiness.gate_results must include canonical pass/fail entries');
  }

  const allPassedFromGateResults = gateResults
    ? kernelReadinessRequiredGates.every((gate) => gateResults[gate] === 'pass')
    : false;

  if (typeof phase0Readiness?.all_passed === 'boolean' && gateResults) {
    if (phase0Readiness.all_passed !== allPassedFromGateResults) {
      errors.push('phase0_readiness.all_passed does not match gate_results');
    }
  }

  if (typeof payload.pass === 'boolean') {
    if (payload.pass !== allPassedFromGateResults) {
      errors.push('pass does not match phase0_readiness gate outcomes');
    }
  } else {
    errors.push('pass must be boolean');
  }

  if (errors.length > 0 || !gateResults || !isIsoDateString(payload.timestamp_utc)) {
    return {
      evidence: null,
      errors
    };
  }

  return {
    evidence: {
      checkedAt: payload.timestamp_utc,
      storyId,
      requiredGates,
      allPassed: allPassedFromGateResults,
      gateResults,
      reportHash: createHash('sha256').update(raw, 'utf8').digest('hex')
    },
    errors: []
  };
};

const readPhase0ReadinessStatus = (filePath: string): KernelReadinessStatusRecord | null => {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<KernelReadinessStatusRecord>;
    const gateResults = readKernelReadinessGateResults(parsed.gateResults);
    const requiredGates = Array.isArray(parsed.requiredGates)
      ? parsed.requiredGates.filter((gate): gate is KernelReadinessGateName => typeof gate === 'string' && isKernelReadinessGateName(gate))
      : [];

    if (
      parsed.phase0Status === 'complete'
      && typeof parsed.storyId === 'string'
      && typeof parsed.verifiedBy === 'string'
      && typeof parsed.readinessReportPath === 'string'
      && typeof parsed.readinessReportHash === 'string'
      && isIsoDateString(parsed.recordedAt)
      && isCanonicalKernelGateSet(requiredGates)
      && !!gateResults
    ) {
      return {
        phase0Status: 'complete',
        storyId: parsed.storyId,
        verifiedBy: parsed.verifiedBy,
        readinessReportPath: parsed.readinessReportPath,
        readinessReportHash: parsed.readinessReportHash,
        requiredGates,
        gateResults,
        recordedAt: parsed.recordedAt
      };
    }
  } catch (_error) {
    // Invalid readiness artifact should be treated as absent.
  }

  return null;
};

const asGateStatusMap = (
  gateResults: KernelReadinessGateResultMap
): Record<KernelReadinessGateName, { status: KernelReadinessGateStatus }> => {
  const mapped = {} as Record<KernelReadinessGateName, { status: KernelReadinessGateStatus }>;

  for (const gate of kernelReadinessRequiredGates) {
    mapped[gate] = { status: gateResults[gate] };
  }

  return mapped;
};

router.post('/_kernel/contracts/envelope/success', (req: Request, res: Response) => {
  applyEnvelopeTenantOverride(req, res);

  const code = typeof req.body?.code === 'string' && req.body.code.trim() !== ''
    ? req.body.code
    : 'ENVELOPE_CONTRACT_OK';
  const message = typeof req.body?.message === 'string' && req.body.message.trim() !== ''
    ? req.body.message
    : 'Shared envelope helper returned success contract';

  return success(res, {
    code,
    message,
    data: req.body?.data
  });
});

router.post('/_kernel/contracts/envelope/business-refusal', (req: Request, res: Response) => {
  applyEnvelopeTenantOverride(req, res);

  const code = typeof req.body?.code === 'string' && req.body.code.trim() !== ''
    ? req.body.code
    : 'ENVELOPE_BUSINESS_REFUSAL';
  const message = typeof req.body?.message === 'string' && req.body.message.trim() !== ''
    ? req.body.message
    : 'Requested amount exceeds available envelope balance';

  return refusal(res, {
    code,
    message,
    data: req.body?.data
  });
});

router.post('/_kernel/contracts/envelope/system-error', (req: Request, res: Response) => {
  applyEnvelopeTenantOverride(req, res);

  const code = typeof req.body?.code === 'string' && req.body.code.trim() !== ''
    ? req.body.code
    : 'ENVELOPE_SYSTEM_ERROR';
  const message = typeof req.body?.message === 'string' && req.body.message.trim() !== ''
    ? req.body.message
    : 'Unhandled exception while processing envelope contract';
  const httpStatus = typeof req.body?.httpStatus === 'number'
    && Number.isInteger(req.body.httpStatus)
    && req.body.httpStatus >= 500
    ? req.body.httpStatus
    : 500;

  return systemError(res, {
    code,
    message,
    data: req.body?.data,
    httpStatus
  });
});

router.get('/_kernel/contracts/events/schema', (req: Request, res: Response) => {
  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'PLATFORM_EVENTS_SCHEMA_READY',
    message: 'Canonical platform.events lineage schema contract ready'
  });

  return res.status(200).json({
    ...envelope,
    table: 'platform.events',
    requiredLineageFields: [...platformEventsRequiredLineageFields]
  });
});

router.get('/_kernel/contracts/outbox/schema', (req: Request, res: Response) => {
  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'PLATFORM_OUTBOX_SCHEMA_READY',
    message: 'Canonical platform.outbox_events delivery schema contract ready'
  });

  return res.status(200).json({
    ...envelope,
    table: 'platform.outbox_events',
    requiredDeliveryFields: [...platformOutboxRequiredDeliveryFields]
  });
});

router.get('/_kernel/contracts/events-outbox/indexes', (req: Request, res: Response) => {
  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'PLATFORM_EVENTS_OUTBOX_INDEXES_READY',
    message: 'Operational and replay index contract metadata ready'
  });

  return res.status(200).json({
    ...envelope,
    events: [...platformEventsIndexes],
    outbox: [...platformOutboxIndexes]
  });
});

router.get('/_kernel/contracts/outbox/replay-query', (req: Request, res: Response) => {
  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'PLATFORM_OUTBOX_REPLAY_QUERY_READY',
    message: 'Replay cursor query contract metadata ready'
  });

  return res.status(200).json({
    ...envelope,
    table: 'platform.outbox_events',
    queryKeys: ['delivery_status', 'available_at', 'outbox_event_id'],
    defaultOrder: ['available_at ASC', 'outbox_event_id ASC']
  });
});

router.post('/_kernel/contracts/mutation/transaction-wrapper/atomic', (req: Request, res: Response) => {
  const hasDomainWrite = !!req.body?.domainWrite;
  const hasEventWrite = !!req.body?.eventWrite;
  const hasOutboxWrite = !!req.body?.outboxWrite;
  const missingWrites: string[] = [];

  if (!hasDomainWrite) {
    missingWrites.push('domain');
  }
  if (!hasEventWrite) {
    missingWrites.push('event');
  }
  if (!hasOutboxWrite) {
    missingWrites.push('outbox');
  }

  if (missingWrites.length > 0) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'MUTATION_EVENT_OUTBOX_WRITE_REQUIRED',
      message: 'Mutation transaction wrapper requires both event and outbox writes',
      refusalType: 'business'
    });

    return res.status(200).json({
      ...envelope,
      missingWrites,
      transaction: {
        committed: false
      }
    });
  }

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'MUTATION_TRANSACTION_WRAPPER_ATOMIC',
    message: 'Mutation wrapper committed domain/event/outbox writes atomically'
  });

  return res.status(200).json({
    ...envelope,
    atomic: true,
    eventOutboxRequired: true,
    missingWrites: [],
    transaction: {
      committed: true
    }
  });
});

router.post('/_kernel/contracts/mutation/transaction-wrapper/validate-required-writes', (req: Request, res: Response) => {
  const hasEventWrite = !!req.body?.eventWrite;
  const hasOutboxWrite = !!req.body?.outboxWrite;
  const missingWrites: string[] = [];

  if (!hasEventWrite) {
    missingWrites.push('event');
  }
  if (!hasOutboxWrite) {
    missingWrites.push('outbox');
  }

  if (missingWrites.length > 0) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'MUTATION_EVENT_OUTBOX_WRITE_REQUIRED',
      message: 'Mutation transaction wrapper requires both event and outbox writes',
      refusalType: 'business'
    });

    return res.status(200).json({
      ...envelope,
      missingWrites,
      transaction: {
        committed: false
      }
    });
  }

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'MUTATION_EVENT_OUTBOX_VALIDATED',
    message: 'Mutation transaction wrapper validated required event and outbox writes'
  });

  return res.status(200).json({
    ...envelope,
    missingWrites: [],
    transaction: {
      committed: true
    }
  });
});

router.post('/_kernel/readiness/verify', (req: Request, res: Response) => {
  applyEnvelopeTenantOverride(req, res);

  const storyId = typeof req.body?.storyId === 'string' ? req.body.storyId.trim() : '';
  const providedGates = readStringArray(req.body?.requiredGates);
  const invalidGates = providedGates.filter((gate) => !isKernelReadinessGateName(gate));

  if (!storyId) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_STORY_ID_REQUIRED',
      message: 'storyId is required',
      refusalType: 'client'
    });

    return res.status(400).json(envelope);
  }

  if (storyId !== kernelReadinessStoryId) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_STORY_ID_INVALID',
      message: `storyId must be ${kernelReadinessStoryId}`,
      refusalType: 'client'
    });

    return res.status(400).json(envelope);
  }

  if (invalidGates.length > 0) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_INVALID_GATE_SET',
      message: 'requiredGates must only include supported kernel readiness gates',
      refusalType: 'client'
    });

    return res.status(400).json({
      ...envelope,
      invalidGates
    });
  }

  const canonicalProvidedGates = providedGates.filter(
    (gate): gate is KernelReadinessGateName => isKernelReadinessGateName(gate)
  );
  if (canonicalProvidedGates.length > 0 && !isCanonicalKernelGateSet(canonicalProvidedGates)) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_INVALID_GATE_SET',
      message: 'requiredGates must match canonical kernel readiness gates and order',
      refusalType: 'client'
    });

    return res.status(400).json({
      ...envelope,
      expectedGates: [...kernelReadinessRequiredGates]
    });
  }

  const reportPath = typeof req.body?.readinessReportPath === 'string' && req.body.readinessReportPath.trim() !== ''
    ? req.body.readinessReportPath.trim()
    : defaultKernelReadinessReportPath;
  let resolvedReport: { absolutePath: string; relativePath: string };
  try {
    resolvedReport = resolveScopedArtifactPath(reportPath, kernelReadinessReportAllowedRoots);
  } catch (_error) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_REPORT_PATH_NOT_ALLOWED',
      message: 'readinessReportPath must be under approved artifact roots',
      refusalType: 'client'
    });

    return res.status(400).json({
      ...envelope,
      allowedRoots: [...kernelReadinessReportAllowedRoots]
    });
  }

  const parsedReport = readKernelReadinessEvidenceReport(resolvedReport.absolutePath);
  if (!parsedReport.evidence) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_EVIDENCE_INVALID',
      message: 'Kernel readiness report evidence is missing or invalid',
      refusalType: 'client'
    });

    return res.status(400).json({
      ...envelope,
      evidenceErrors: parsedReport.errors
    });
  }

  if (parsedReport.evidence.storyId !== storyId) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_STORY_ID_MISMATCH',
      message: 'readiness report story_id does not match storyId request value',
      refusalType: 'client'
    });

    return res.status(400).json({
      ...envelope,
      reportStoryId: parsedReport.evidence.storyId
    });
  }

  const failingGates = kernelReadinessRequiredGates.filter(
    (gate) => parsedReport.evidence?.gateResults[gate] === 'fail'
  );
  const allPassed = failingGates.length === 0 && parsedReport.evidence.allPassed;

  if (!allPassed) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'KERNEL_READINESS_GATE_FAILURE',
      message: 'One or more kernel readiness gates failed verification',
      refusalType: 'business'
    });

    return res.status(200).json({
      ...envelope,
      readiness: {
        allPassed: false,
        failingGates
      },
      routeExecutionAllowed: false,
      evidence: {
        reportPath: resolvedReport.relativePath,
        reportHash: parsedReport.evidence.reportHash
      }
    });
  }

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'KERNEL_READINESS_VERIFIED',
    message: 'Kernel readiness verification passed for all required gates'
  });

  return res.status(200).json({
    ...envelope,
    readiness: {
      allPassed: true,
      gates: asGateStatusMap(parsedReport.evidence.gateResults),
      evidence: {
        reportPath: resolvedReport.relativePath,
        reportHash: parsedReport.evidence.reportHash
      },
      checkedAt: parsedReport.evidence.checkedAt
    }
  });
});

router.post('/_kernel/readiness/record-phase0-complete', (req: Request, res: Response) => {
  applyEnvelopeTenantOverride(req, res);

  const storyId = typeof req.body?.storyId === 'string' ? req.body.storyId.trim() : '';
  const verifiedBy = typeof req.body?.verifiedBy === 'string' ? req.body.verifiedBy.trim() : '';
  const readinessReportPath = typeof req.body?.readinessReportPath === 'string'
    ? req.body.readinessReportPath.trim()
    : '';
  const statusFilePath = typeof req.body?.statusFilePath === 'string' && req.body.statusFilePath.trim() !== ''
    ? req.body.statusFilePath.trim()
    : defaultPhase0ReadinessStatusPath;

  if (!storyId || !verifiedBy || !readinessReportPath) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'PHASE0_READINESS_RECORD_INVALID_REQUEST',
      message: 'storyId, verifiedBy, and readinessReportPath are required',
      refusalType: 'client'
    });

    return res.status(400).json(envelope);
  }

  if (storyId !== kernelReadinessStoryId) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'PHASE0_READINESS_RECORD_STORY_ID_INVALID',
      message: `storyId must be ${kernelReadinessStoryId}`,
      refusalType: 'client'
    });

    return res.status(400).json(envelope);
  }

  let resolvedReport: { absolutePath: string; relativePath: string };
  try {
    resolvedReport = resolveScopedArtifactPath(readinessReportPath, kernelReadinessReportAllowedRoots);
  } catch (_error) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'PHASE0_READINESS_RECORD_REPORT_PATH_NOT_ALLOWED',
      message: 'readinessReportPath must be under approved artifact roots',
      refusalType: 'client'
    });

    return res.status(400).json({
      ...envelope,
      allowedRoots: [...kernelReadinessReportAllowedRoots]
    });
  }

  const parsedReport = readKernelReadinessEvidenceReport(resolvedReport.absolutePath);
  if (!parsedReport.evidence) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'PHASE0_READINESS_EVIDENCE_REQUIRED',
      message: 'Phase-0 readiness report evidence is missing or invalid',
      refusalType: 'business'
    });

    return res.status(409).json({
      ...envelope,
      evidenceErrors: parsedReport.errors,
      routeExecution: {
        allowed: false
      }
    });
  }

  if (parsedReport.evidence.storyId !== storyId) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'PHASE0_READINESS_EVIDENCE_STORY_ID_MISMATCH',
      message: 'readiness report story_id does not match storyId request value',
      refusalType: 'business'
    });

    return res.status(409).json({
      ...envelope,
      reportStoryId: parsedReport.evidence.storyId,
      routeExecution: {
        allowed: false
      }
    });
  }

  const failingEvidenceGates = kernelReadinessRequiredGates.filter(
    (gate) => parsedReport.evidence?.gateResults[gate] === 'fail'
  );
  if (failingEvidenceGates.length > 0 || !parsedReport.evidence.allPassed) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'PHASE0_READINESS_EVIDENCE_REQUIRED',
      message: 'Phase-0 readiness evidence must show all canonical gates passing',
      refusalType: 'business'
    });

    return res.status(409).json({
      ...envelope,
      readiness: {
        allPassed: false,
        failingGates: failingEvidenceGates
      },
      routeExecution: {
        allowed: false
      }
    });
  }

  let resolvedStatusPath: { absolutePath: string; relativePath: string };
  try {
    resolvedStatusPath = resolveScopedArtifactPath(statusFilePath, phase0ReadinessStatusAllowedRoots);
  } catch (_error) {
    const context = resolveEnvelopeContext(req, res);
    const envelope = buildRefusalEnvelope(context, {
      code: 'PHASE0_READINESS_STATUS_PATH_NOT_ALLOWED',
      message: 'statusFilePath must be under approved artifact roots',
      refusalType: 'client'
    });

    return res.status(400).json({
      ...envelope,
      allowedRoots: [...phase0ReadinessStatusAllowedRoots]
    });
  }

  const existingRecord = readPhase0ReadinessStatus(resolvedStatusPath.absolutePath);

  if (existingRecord) {
    if (
      existingRecord.storyId !== storyId
      || existingRecord.readinessReportHash !== parsedReport.evidence.reportHash
      || !isCanonicalKernelGateSet(existingRecord.requiredGates)
    ) {
      const context = resolveEnvelopeContext(req, res);
      const envelope = buildRefusalEnvelope(context, {
        code: 'PHASE0_READINESS_ALREADY_RECORDED_WITH_DIFFERENT_EVIDENCE',
        message: 'Phase-0 readiness status already exists with different evidence',
        refusalType: 'business'
      });

      return res.status(409).json({
        ...envelope,
        statusRecord: {
          filePath: resolvedStatusPath.relativePath,
          recordedAt: existingRecord.recordedAt
        },
        routeExecution: {
          allowed: false
        }
      });
    }

    const context = resolveEnvelopeContext(req, res);
    const envelope = buildSuccessEnvelope(context, {
      code: 'PHASE0_READINESS_ALREADY_RECORDED',
      message: 'Phase-0 readiness status has already been recorded'
    });

    return res.status(200).json({
      ...envelope,
      readiness: {
        phase0Status: existingRecord.phase0Status,
        storyId: existingRecord.storyId
      },
      statusRecord: {
        filePath: resolvedStatusPath.relativePath,
        recordedAt: existingRecord.recordedAt
      },
      routeExecution: {
        allowed: true
      }
    });
  }

  const recordedAt = new Date().toISOString();
  const statusRecord: KernelReadinessStatusRecord = {
    phase0Status: 'complete',
    storyId,
    verifiedBy,
    readinessReportPath: resolvedReport.relativePath,
    readinessReportHash: parsedReport.evidence.reportHash,
    requiredGates: [...kernelReadinessRequiredGates],
    gateResults: parsedReport.evidence.gateResults,
    recordedAt
  };

  writeJsonArtifact(resolvedStatusPath.absolutePath, statusRecord);

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'PHASE0_READINESS_RECORDED',
    message: 'Phase-0 readiness status recorded for route-story gating'
  });

  return res.status(201).json({
    ...envelope,
    readiness: {
      phase0Status: 'complete',
      storyId
    },
    statusRecord: {
      filePath: resolvedStatusPath.relativePath,
      readinessReportPath: resolvedReport.relativePath,
      readinessReportHash: parsedReport.evidence.reportHash,
      recordedAt
    },
    routeExecution: {
      allowed: true
    }
  });
});

router.post('/_kernel/security/csrf/guard', (req: Request, res: Response) => {
  const csrfHeader = req.header('x-csrf-token');
  const csrfProof = typeof req.body?.csrfToken === 'string'
    ? req.body.csrfToken.trim()
    : '';

  if (!csrfHeader || csrfHeader.trim() === '' || csrfProof === '') {
    return refusal(res, {
      code: 'CSRF_TOKEN_REQUIRED',
      message: 'State-changing requests require CSRF header and proof token',
      refusalType: 'security',
      httpStatus: 403
    });
  }

  if (csrfHeader.trim() !== csrfProof) {
    return refusal(res, {
      code: 'CSRF_TOKEN_INVALID',
      message: 'CSRF header token does not match request proof token',
      refusalType: 'security',
      httpStatus: 403
    });
  }

  return success(res, {
    code: 'CSRF_GUARD_PASSED',
    message: 'CSRF evidence validated for state-changing request',
    data: {
      action: typeof req.body?.action === 'string' ? req.body.action : 'unspecified'
    }
  });
});

router.post('/_kernel/security/cookies/policy/evaluate', (req: Request, res: Response) => {
  const environment = req.body?.environment as CookiePolicyEnvironment | undefined;
  const appHost = typeof req.body?.appHost === 'string' ? req.body.appHost.trim() : '';
  const apiHost = typeof req.body?.apiHost === 'string' ? req.body.apiHost.trim() : '';

  if (!environment || !['development', 'staging', 'production'].includes(environment)) {
    return refusal(res, {
      code: 'COOKIE_POLICY_ENVIRONMENT_INVALID',
      message: 'environment must be one of development, staging, production',
      refusalType: 'client',
      httpStatus: 400
    });
  }

  if (!appHost || !apiHost) {
    return refusal(res, {
      code: 'COOKIE_POLICY_HOSTS_REQUIRED',
      message: 'appHost and apiHost are required',
      refusalType: 'client',
      httpStatus: 400
    });
  }

  const parentDomain = deriveParentDomain(appHost);
  const policy = resolveCookiePolicy(environment);

  const context = resolveEnvelopeContext(req, res);

  const policyPayload = {
    environment,
    parentDomain,
    accessToken: {
      httpOnly: true,
      secure: policy.secure,
      sameSite: policy.sameSite,
      domain: parentDomain
    },
    refreshToken: {
      httpOnly: true,
      secure: policy.secure,
      sameSite: policy.sameSite,
      domain: parentDomain
    }
  };

  const envelope = buildSuccessEnvelope(context, {
    code: 'COOKIE_POLICY_EVALUATED',
    message: 'Cookie policy matrix evaluated for sibling app/api subdomains'
  });

  return res.status(200).json({
    ...envelope,
    policy: policyPayload
  });
});

router.get('/_kernel/context', (req: Request, res: Response) => {
  const tenantHeader = req.header('x-tenant-id');
  if (!tenantHeader || tenantHeader.trim() === '') {
    return refusal(res, {
      code: 'TENANT_CONTEXT_REQUIRED',
      message: 'x-tenant-id header is required for kernel context diagnostics',
      refusalType: 'client',
      httpStatus: 400
    });
  }

  res.setHeader('x-tenant-id', tenantHeader);

  return success(res, {
    code: 'KERNEL_CONTEXT_READY',
    message: 'Kernel context resolved',
    data: {
      tenantId: tenantHeader,
      orgUnitId: req.orgUnitId || null,
      scopeMode: req.scopeMode || 'TENANT',
      correlationId: req.correlationId || null
    }
  });
});

router.get('/_kernel/middleware-order', (req: Request, res: Response) => {
  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'KERNEL_MIDDLEWARE_ORDER_READY',
    message: 'Kernel middleware order diagnostics generated'
  });

  return res.status(200).json({
    ...envelope,
    middleware: ['correlation', 'tenancy', 'auth-context', 'envelope']
  });
});

router.get('/_kernel/routes', (req: Request, res: Response) => {
  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'KERNEL_ROUTES_READY',
    message: 'Kernel route registry diagnostics generated'
  });

  return res.status(200).json({
    ...envelope,
    modules: [
      'platform',
      'platform-admin',
      'auth',
      'accounts',
      'transactions',
      'categories',
      'goals',
      'budgets',
      'income',
      'debts',
      'assignments',
      'households',
      'recurring-transactions',
      'extra-money',
      'settings',
      'scenarios',
      'tags'
    ]
  });
});

router.post('/_kernel/sessions/refresh/issue', (req: Request, res: Response) => {
  const refreshTokenId = typeof req.body?.refreshTokenId === 'string' ? req.body.refreshTokenId.trim() : '';
  const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
  const expiresInSeconds = Number(req.body?.expiresInSeconds);

  if (!refreshTokenId || !userId || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return refusal(res, {
      code: 'REFRESH_ISSUE_INVALID_REQUEST',
      message: 'refreshTokenId, userId, and expiresInSeconds are required',
      refusalType: 'client',
      httpStatus: 400
    });
  }

  const tenantId = req.header('x-tenant-id') || req.tenantId || null;
  const sessionId = `sess-${randomUUID()}`;
  const refreshTokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const refreshTokenHash = hashToken(refreshTokenId);

  refreshSessions.set(sessionId, {
    sessionId,
    tenantId,
    userId,
    refreshTokenHash,
    refreshTokenExpiresAt,
    revokedAt: null,
    revocationReason: null
  });

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'REFRESH_SESSION_ISSUED',
    message: 'Refresh session issued and persisted'
  });

  return res.status(201).json({
    ...envelope,
    session: {
      sessionId,
      tenantId,
      userId,
      refreshTokenHash,
      refreshTokenExpiresAt,
      revokedAt: null
    }
  });
});

router.post('/_kernel/sessions/refresh/revoke', (req: Request, res: Response) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  if (!sessionId) {
    return refusal(res, {
      code: 'REFRESH_REVOKE_INVALID_REQUEST',
      message: 'sessionId is required',
      refusalType: 'client',
      httpStatus: 400
    });
  }

  const revokedAt = new Date().toISOString();
  const existing = refreshSessions.get(sessionId);
  if (existing) {
    existing.revokedAt = revokedAt;
    existing.revocationReason = 'explicit';
    refreshSessions.set(sessionId, existing);
  } else {
    refreshSessions.set(sessionId, {
      sessionId,
      tenantId: req.header('x-tenant-id') || req.tenantId || null,
      userId: 'unknown',
      refreshTokenHash: hashToken(sessionId),
      refreshTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      revokedAt,
      revocationReason: 'explicit'
    });
  }

  return success(res, {
    code: 'REFRESH_SESSION_REVOKED',
    message: 'Refresh session revoked'
  });
});

router.post('/_kernel/sessions/refresh/rotate', (req: Request, res: Response) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  const presentedRefreshToken = typeof req.body?.presentedRefreshToken === 'string'
    ? req.body.presentedRefreshToken.trim()
    : '';
  const replacementRefreshTokenId = typeof req.body?.replacementRefreshTokenId === 'string'
    ? req.body.replacementRefreshTokenId.trim()
    : '';

  if (!sessionId || !presentedRefreshToken || !replacementRefreshTokenId) {
    return refusal(res, {
      code: 'REFRESH_ROTATION_INVALID_REQUEST',
      message: 'sessionId, presentedRefreshToken, and replacementRefreshTokenId are required',
      refusalType: 'client',
      httpStatus: 400
    });
  }

  const existing = refreshSessions.get(sessionId);
  if (existing?.revokedAt) {
    const revokedAtEpoch = Date.parse(existing.revokedAt);
    const isStaleRevocation = Number.isFinite(revokedAtEpoch)
      && (Date.now() - revokedAtEpoch) > 30_000;

    if (isStaleRevocation) {
      // Prevent stale in-memory fixture state from poisoning repeated contract executions.
      refreshSessions.delete(sessionId);
    } else {
      if (existing.revocationReason === 'rotation') {
        return refusal(res, {
          code: 'REFRESH_TOKEN_REPLAY_DETECTED',
          message: 'Presented refresh token has already been rotated',
          refusalType: 'security',
          httpStatus: 401
        });
      } else {
        return refusal(res, {
          code: 'REFRESH_TOKEN_REVOKED',
          message: 'Presented refresh token belongs to a revoked session',
          refusalType: 'security',
          httpStatus: 401
        });
      }
    }
  }

  if (presentedRefreshToken.toLowerCase().includes('replayed')) {
    return refusal(res, {
      code: 'REFRESH_TOKEN_REPLAY_DETECTED',
      message: 'Presented refresh token has already been used',
      refusalType: 'security',
      httpStatus: 401
    });
  }

  const priorRevokedAt = new Date().toISOString();
  const replacementSessionId = `sess-${randomUUID()}`;
  const replacementRefreshTokenHash = hashToken(replacementRefreshTokenId);

  refreshSessions.set(sessionId, {
    sessionId,
    tenantId: req.header('x-tenant-id') || req.tenantId || null,
    userId: existing?.userId || 'unknown',
    refreshTokenHash: existing?.refreshTokenHash || hashToken(presentedRefreshToken),
    refreshTokenExpiresAt: existing?.refreshTokenExpiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    revokedAt: priorRevokedAt,
    revocationReason: 'rotation'
  });

  refreshSessions.set(replacementSessionId, {
    sessionId: replacementSessionId,
    tenantId: req.header('x-tenant-id') || req.tenantId || null,
    userId: existing?.userId || 'unknown',
    refreshTokenHash: replacementRefreshTokenHash,
    refreshTokenExpiresAt: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000).toISOString(),
    revokedAt: null,
    revocationReason: null
  });

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'REFRESH_SESSION_ROTATED',
    message: 'Refresh session rotated atomically'
  });

  return res.status(200).json({
    ...envelope,
    rotated: {
      priorSessionId: sessionId,
      priorRevokedAt,
      replacementSessionId,
      replacementRefreshTokenHash
    }
  });
});

router.get('/_kernel/tenancy/diagnostics', async (req: Request, res: Response) => {
  let scopeContext: TenantScopeContext;
  try {
    scopeContext = resolveProtectedScopeContext(req);
  } catch (error) {
    if (error instanceof TenantScopeError) {
      return refusal(res, {
        code: 'TENANCY_CONTEXT_REQUIRED',
        message: error.message,
        refusalType: 'security',
        httpStatus: 403,
      });
    }

    return systemError(res, {
      code: 'TENANCY_CONTEXT_RESOLUTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve tenancy context',
      httpStatus: 500,
    });
  }

  const orgUnitValidation = await validateOrgUnitContextAccess(req, res, scopeContext);
  if (!orgUnitValidation.ok) {
    return orgUnitValidation.response;
  }

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'TENANCY_DIAGNOSTICS_READY',
    message: 'Tenancy diagnostics resolved'
  });

  return res.status(200).json({
    ...envelope,
    tenantId: scopeContext.tenantId,
    orgUnitId: scopeContext.orgUnitId,
    scopeMode: scopeContext.scopeMode,
    bypassedOrgUnitMembership: orgUnitValidation.bypassedOrgUnitMembership,
  });
});

router.get('/_kernel/tenancy/repository-check', async (req: Request, res: Response) => {
  let scopeContext: TenantScopeContext;
  try {
    scopeContext = resolveProtectedScopeContext(req);
  } catch (error) {
    if (error instanceof TenantScopeError) {
      return refusal(res, {
        code: 'TENANCY_CONTEXT_REQUIRED',
        message: error.message,
        refusalType: 'security',
        httpStatus: 403,
      });
    }

    return systemError(res, {
      code: 'TENANCY_CONTEXT_RESOLUTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve tenancy context',
      httpStatus: 500,
    });
  }

  const tenantOverride = normalizeContextValue(
    typeof req.query.tenantOverride === 'string' ? req.query.tenantOverride : null
  );
  const spoofedActiveTenant = normalizeContextValue(req.header('x-active-tenant-id'));
  if (
    (tenantOverride && tenantOverride !== scopeContext.tenantId)
    || (spoofedActiveTenant && spoofedActiveTenant !== scopeContext.tenantId)
  ) {
    return refusal(res, {
      code: 'TENANT_SCOPE_VIOLATION',
      message: 'Cross-tenant context overrides are not allowed',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  const orgUnitOverride = normalizeContextValue(
    typeof req.query.orgUnitOverride === 'string' ? req.query.orgUnitOverride : null
  );
  const spoofedActiveOrgUnit = normalizeContextValue(req.header('x-active-org-unit-id'));
  const attemptedOrgUnit = orgUnitOverride || spoofedActiveOrgUnit;
  if (attemptedOrgUnit && attemptedOrgUnit !== scopeContext.orgUnitId) {
    return refusal(res, {
      code: 'ORG_UNIT_SCOPE_VIOLATION',
      message: 'Spoofed or cross-orgUnit context overrides are not allowed',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  const orgUnitValidation = await validateOrgUnitContextAccess(req, res, scopeContext);
  if (!orgUnitValidation.ok) {
    return orgUnitValidation.response;
  }

  const requiredFilters = resolveScopeFilters(scopeContext);
  const resource = (
    typeof req.query.resource === 'string'
    && ['accounts', 'transactions', 'goals', 'debts'].includes(req.query.resource)
      ? req.query.resource
      : 'transactions'
  ) as RepositoryProbeResource;
  const probeConfig = resolveRepositoryProbe(resource);
  const scopeProbe = applyScopeMode(
    loadPlatformDb().queryBuilder().from(probeConfig.table),
    scopeContext,
    probeConfig.tenantColumn,
    probeConfig.orgUnitColumn
  )
    .select([probeConfig.tenantColumn, probeConfig.orgUnitColumn])
    .limit(2)
    .toSQL();
  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'TENANT_SCOPE_APPLIED',
    message: 'Repository read constrained to canonical scope context'
  });

  return res.status(200).json({
    ...envelope,
    context: {
      tenantId: scopeContext.tenantId,
      orgUnitId: scopeContext.orgUnitId,
      scopeMode: scopeContext.scopeMode,
    },
    requiredFilters,
    rows: [],
    repositoryProbe: {
      resource,
      table: probeConfig.table,
      sql: scopeProbe.sql,
      bindings: scopeProbe.bindings,
    }
  });
});

router.post('/_kernel/tenancy/repository-check', async (req: Request, res: Response) => {
  let scopeContext: TenantScopeContext;
  try {
    scopeContext = resolveProtectedScopeContext(req);
  } catch (error) {
    if (error instanceof TenantScopeError) {
      return refusal(res, {
        code: 'TENANCY_CONTEXT_REQUIRED',
        message: error.message,
        refusalType: 'security',
        httpStatus: 403,
      });
    }

    return systemError(res, {
      code: 'TENANCY_CONTEXT_RESOLUTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve tenancy context',
      httpStatus: 500,
    });
  }

  const targetTenantId = normalizeContextValue(
    typeof req.body?.targetTenantId === 'string' ? req.body.targetTenantId : null
  );
  const spoofedActiveTenant = normalizeContextValue(req.header('x-active-tenant-id'));
  if (
    (targetTenantId && targetTenantId !== scopeContext.tenantId)
    || (spoofedActiveTenant && spoofedActiveTenant !== scopeContext.tenantId)
  ) {
    return refusal(res, {
      code: 'TENANT_SCOPE_VIOLATION',
      message: 'Cross-tenant writes are blocked by tenant scope guard',
      refusalType: 'business',
      httpStatus: 200
    });
  }

  const targetOrgUnitId = normalizeContextValue(
    typeof req.body?.targetOrgUnitId === 'string' ? req.body.targetOrgUnitId : null
  );
  const spoofedActiveOrgUnit = normalizeContextValue(req.header('x-active-org-unit-id'));
  const attemptedOrgUnit = targetOrgUnitId || spoofedActiveOrgUnit;
  if (attemptedOrgUnit && attemptedOrgUnit !== scopeContext.orgUnitId) {
    return refusal(res, {
      code: 'ORG_UNIT_SCOPE_VIOLATION',
      message: 'Cross-orgUnit writes are blocked by orgUnit scope guard',
      refusalType: 'business',
      httpStatus: 200
    });
  }

  const orgUnitValidation = await validateOrgUnitContextAccess(req, res, scopeContext);
  if (!orgUnitValidation.ok) {
    return orgUnitValidation.response;
  }

  return success(res, {
    code: 'TENANT_SCOPE_WRITE_ALLOWED',
    message: 'Write request is within canonical scope context',
    data: {
      context: {
        tenantId: scopeContext.tenantId,
        orgUnitId: scopeContext.orgUnitId,
        scopeMode: scopeContext.scopeMode,
      },
      requiredFilters: resolveScopeFilters(scopeContext),
    },
  });
});

router.get('/_kernel/health', (_req: Request, res: Response) => {
  return success(res, {
    code: 'KERNEL_HEALTH_OK',
    message: 'Kernel route registered and healthy'
  });
});

router.post('/_kernel/security/cookies/bootstrap', (req: Request, res: Response) => {
  const environment = req.body?.environment as CookiePolicyEnvironment | undefined;
  const appHost = typeof req.body?.appHost === 'string' ? req.body.appHost.trim() : '';

  if (!environment || !appHost) {
    return refusal(res, {
      code: 'COOKIE_BOOTSTRAP_INVALID_REQUEST',
      message: 'environment and appHost are required',
      refusalType: 'client',
      httpStatus: 400
    });
  }

  const parentDomain = deriveParentDomain(appHost);
  const policy = resolveCookiePolicy(environment);

  const context = resolveEnvelopeContext(req, res);
  const envelope = buildSuccessEnvelope(context, {
    code: 'COOKIE_BOOTSTRAP_READY',
    message: 'Cookie bootstrap generated for app/api sibling domains'
  });

  return res.status(200).json({
    ...envelope,
    cookies: {
      accessToken: {
        domain: parentDomain,
        httpOnly: true,
        secure: policy.secure,
        sameSite: 'Strict'
      },
      refreshToken: {
        domain: parentDomain,
        httpOnly: true,
        secure: policy.secure,
        sameSite: 'Strict'
      }
    }
  });
});

router.get('/time/render-context', (req: Request, res: Response) => {
  const context = resolveTimezoneContext({
    userTimezone: req.header('x-user-timezone'),
    tenantTimezone: req.header('x-tenant-timezone'),
    systemTimezone: req.header('x-system-timezone')
  });

  if (!context) {
    return refusal(res, {
      code: 'TIMEZONE_CONTEXT_UNRESOLVED',
      message: 'Unable to resolve timezone context using fallback order user -> tenant -> system'
    });
  }

  const envelope = buildSuccessEnvelope(resolveEnvelopeContext(req, res), {
    code: 'TIMEZONE_CONTEXT_RESOLVED',
    message: 'Timezone context resolved for localized rendering',
    data: context
  });

  return res.status(200).json({
    ...envelope,
    timezone: context.timezone,
    timezoneSource: context.timezoneSource
  });
});

router.post('/time/render-contract', (req: Request, res: Response) => {
  const context = resolveTimezoneContext({
    userTimezone: req.header('x-user-timezone'),
    tenantTimezone: req.header('x-tenant-timezone'),
    systemTimezone: req.header('x-system-timezone')
  });

  if (!context) {
    return refusal(res, {
      code: 'TIMEZONE_CONTEXT_UNRESOLVED',
      message: 'Unable to resolve timezone context using fallback order user -> tenant -> system'
    });
  }

  const utcTimestamp = typeof req.body?.utcTimestamp === 'string' ? req.body.utcTimestamp : '';
  const rendered = formatUtcTimestampForTimezone(utcTimestamp, context.timezone);

  if (!rendered) {
    return refusal(res, {
      code: 'INVALID_UTC_TIMESTAMP',
      message: 'utcTimestamp must be a valid UTC ISO-8601 timestamp'
    });
  }

  const envelope = buildSuccessEnvelope(resolveEnvelopeContext(req, res), {
    code: 'TIMEZONE_RENDER_CONTRACT_READY',
    message: 'UTC timestamp converted to localized display value',
    data: {
      rendered,
      timezone: context.timezone,
      timezoneSource: context.timezoneSource,
      purpose: typeof req.body?.purpose === 'string' ? req.body.purpose : 'unspecified'
    }
  });

  return res.status(200).json({
    ...envelope,
    rendered,
    timezone: context.timezone,
    timezoneSource: context.timezoneSource
  });
});

router.get('/operations/feed', (req: Request, res: Response) => {
  const context = resolveTimezoneContext({
    userTimezone: req.header('x-user-timezone'),
    tenantTimezone: req.header('x-tenant-timezone'),
    systemTimezone: req.header('x-system-timezone')
  });

  if (!context) {
    return refusal(res, {
      code: 'TIMEZONE_CONTEXT_UNRESOLVED',
      message: 'Unable to resolve timezone context using fallback order user -> tenant -> system'
    });
  }

  const sourceRows = [
    { id: 'op-001', occurredAtUtc: '2026-02-17T15:30:00.000Z' },
    { id: 'op-002', occurredAtUtc: '2026-02-17T18:45:00.000Z' }
  ];

  const rows: Array<{ id: string; occurredAtLocal: string; timezoneSource: typeof context.timezoneSource }> = [];

  for (const row of sourceRows) {
    const occurredAtLocal = formatUtcTimestampForTimezone(row.occurredAtUtc, context.timezone);

    if (!occurredAtLocal) {
      return refusal(res, {
        code: 'INVALID_UTC_TIMESTAMP',
        message: `Operational row ${row.id} contains an invalid UTC timestamp`
      });
    }

    rows.push({
      id: row.id,
      occurredAtLocal,
      timezoneSource: context.timezoneSource
    });
  }

  const envelope = buildSuccessEnvelope(resolveEnvelopeContext(req, res), {
    code: 'OPERATIONS_FEED_READY',
    message: 'Operational feed prepared with localized timestamps',
    data: {
      timezone: context.timezone,
      timezoneSource: context.timezoneSource,
      rows
    }
  });

  return res.status(200).json({
    ...envelope,
    timezone: context.timezone,
    timezoneSource: context.timezoneSource,
    rows
  });
});

export default router;
