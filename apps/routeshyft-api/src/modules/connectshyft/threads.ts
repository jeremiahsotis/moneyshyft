import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { CAPABILITIES, hasCapability } from '../../platform/rbac/capabilities';
import { isStrictUtcIsoTimestamp } from '../../platform/time/timezoneService';

const CONNECTSHYFT_CANONICAL_THREAD_STATES = ['UNCLAIMED', 'CLAIMED', 'CLOSED'] as const;
const CONNECTSHYFT_CANONICAL_THREAD_STATE_SET = new Set<string>(CONNECTSHYFT_CANONICAL_THREAD_STATES);
const DEFAULT_THREAD_SOURCE = 'VOICE';
const DEFAULT_DUE_THREAD_LIMIT = 50;
const MAX_DUE_THREAD_LIMIT = 250;
const DEFAULT_ESCALATION_BASELINE_HOURS = 24;
const MIN_ESCALATION_BASELINE_HOURS = 1;
const MAX_ESCALATION_BASELINE_HOURS = 24;
const MAX_ESCALATION_STAGE = 3;
const HOUR_MS = 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ConnectShyftThreadState = (typeof CONNECTSHYFT_CANONICAL_THREAD_STATES)[number];
export type ConnectShyftLifecycleAction = 'claim' | 'takeover' | 'close';

export type ConnectShyftLifecyclePolicyDecision =
  | {
    ok: true;
    nextState: ConnectShyftThreadState;
  }
  | {
    ok: false;
    code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID' | 'CONNECTSHYFT_THREAD_OWNERSHIP_REQUIRED';
    message: string;
  };

export type ConnectShyftThread = {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  source: string;
  state: ConnectShyftThreadState;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  claimedByUserId: string | null;
  claimedAtUtc: string | null;
  closedByUserId: string | null;
  closedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  escalation: {
    stage: number;
    nextEvaluationAtUtc: string | null;
  };
};

type ThreadLifecycleFields = Pick<
  ConnectShyftThread,
  'claimedByUserId' | 'claimedAtUtc' | 'closedByUserId' | 'closedAtUtc'
>;

type ThreadStoreEnsureInput = {
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  source: string;
  state: ConnectShyftThreadState;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  threadId?: string;
  actorUserId?: string | null;
  nextEvaluationAtUtc?: string | null;
};

type ThreadStoreListDueInput = {
  tenantId: string;
  orgUnitId: string;
  limit: number;
};

type ThreadStoreEvaluateInput = {
  tenantId: string;
  orgUnitId: string;
  asOfUtc: string;
  limit: number;
  baselineHours: number;
  actorUserId?: string | null;
};

type ThreadStoreTransitionInput = {
  tenantId: string;
  threadId: string;
  nextState: ConnectShyftThreadState;
  actorUserId?: string | null;
};

export type ConnectShyftEscalationTransition = {
  threadId: string;
  previousStage: number;
  stage: number;
  dueAtUtc: string;
  nextDueAtUtc: string;
  nextDueOffsetHours: number;
};

type ThreadEscalationTransition = ConnectShyftEscalationTransition;

type ThreadPersistenceEnsureResult =
  | {
    ok: true;
    thread: ConnectShyftThread;
  }
  | {
    ok: false;
    reason: 'TRANSITION_ACTOR_REQUIRED';
  };

type ThreadPersistenceTransitionResult =
  | {
    ok: true;
    thread: ConnectShyftThread;
  }
  | {
    ok: false;
    reason: 'THREAD_NOT_FOUND' | 'TRANSITION_ACTOR_REQUIRED';
  };

type ThreadRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN'
    | 'CONNECTSHYFT_THREAD_TRANSITION_FORBIDDEN'
    | 'CONNECTSHYFT_THREAD_STATE_INVALID'
    | 'CONNECTSHYFT_THREAD_NEXT_EVALUATION_INVALID'
    | 'CONNECTSHYFT_ESCALATION_AS_OF_INVALID'
    | 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER'
    | 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE'
    | 'CONNECTSHYFT_THREAD_TRANSITION_INVALID'
    | 'CONNECTSHYFT_THREAD_NOT_FOUND'
    | 'CONNECTSHYFT_THREAD_ENSURE_PERSISTENCE_UNAVAILABLE'
    | 'CONNECTSHYFT_THREAD_PERSISTENCE_UNAVAILABLE';
  message: string;
};

export type ConnectShyftEnsureThreadCommand = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  source?: string;
  forcedState?: string | null;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  threadId?: string;
  actorUserId?: string | null;
  nextEvaluationAtUtc?: string;
};

export type ConnectShyftListDueThreadsCommand = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  limit?: number;
};

export type ConnectShyftEvaluateEscalationsCommand = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  asOfUtc?: string;
  limit?: number;
  baselineHours?: number;
  actorUserId?: string | null;
};

export type ConnectShyftTransitionThreadStateCommand = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  threadId: string;
  nextState: ConnectShyftThreadState;
  actorUserId?: string | null;
};

export type ConnectShyftEnsureThreadResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_THREAD_ENSURED';
    httpStatus: 201;
    data: {
      thread: ConnectShyftThread;
    };
  }
  | ThreadRefusalResult;

export type ConnectShyftListDueThreadsResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_DUE_THREADS_LISTED';
    httpStatus: 200;
    data: {
      threads: ConnectShyftThread[];
    };
  }
  | ThreadRefusalResult;

export type ConnectShyftTransitionThreadStateResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_THREAD_TRANSITIONED';
    httpStatus: 200;
    data: {
      thread: ConnectShyftThread;
    };
  }
  | ThreadRefusalResult;

export type ConnectShyftEvaluateEscalationsResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_ESCALATION_EVALUATED';
    httpStatus: 200;
    data: {
      asOfUtc: string;
      baselineHours: number;
      transitions: ConnectShyftEscalationTransition[];
      effects: {
        emittedCount: number;
      };
      replaySafe: boolean;
      skippedAlreadyProcessed: boolean;
    };
  }
  | ThreadRefusalResult;

type DbThreadRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  neighbor_id: string;
  source: string;
  state: ConnectShyftThreadState;
  escalation_stage: number;
  next_evaluation_at_utc: string | Date | null;
  last_inbound_cs_number_id: string;
  preferred_outbound_cs_number_id: string;
  claimed_by_user_id: string | null;
  claimed_at_utc: string | Date | null;
  closed_by_user_id: string | null;
  closed_at_utc: string | Date | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const nowIsoUtc = (): string => new Date().toISOString();

const toIsoUtc = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return value;
};

const toNullableIsoUtc = (value: string | Date | null): string | null => {
  if (!value) {
    return null;
  }

  return toIsoUtc(value);
};

const normalizeUuid = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  if (!normalized || !UUID_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

const isCanonicalThreadState = (value: string): value is ConnectShyftThreadState => {
  return CONNECTSHYFT_CANONICAL_THREAD_STATE_SET.has(value);
};

const normalizeThreadState = (forcedState: string | null | undefined): ConnectShyftThreadState | null => {
  const normalized = normalizeString(forcedState).toUpperCase();
  if (!normalized) {
    return 'UNCLAIMED';
  }

  if (!isCanonicalThreadState(normalized)) {
    return null;
  }

  return normalized;
};

const normalizeDueThreadLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_DUE_THREAD_LIMIT;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_DUE_THREAD_LIMIT;
  }

  return Math.min(normalized, MAX_DUE_THREAD_LIMIT);
};

const normalizeEscalationBaselineHours = (
  value: number | undefined,
): { ok: true; baselineHours: number } | ThreadRefusalResult => {
  if (value === undefined) {
    return {
      ok: true,
      baselineHours: DEFAULT_ESCALATION_BASELINE_HOURS,
    };
  }

  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return buildEscalationBaselineInvalidIntegerRefusal();
  }

  if (value < MIN_ESCALATION_BASELINE_HOURS || value > MAX_ESCALATION_BASELINE_HOURS) {
    return buildEscalationBaselineInvalidRangeRefusal();
  }

  return {
    ok: true,
    baselineHours: value,
  };
};

const resolveEscalationAsOfUtc = (
  value: string | undefined,
): { ok: true; asOfUtc: string } | ThreadRefusalResult => {
  const normalized = normalizeString(value) || nowIsoUtc();
  if (!isStrictUtcIsoTimestamp(normalized)) {
    return buildEscalationAsOfInvalidRefusal();
  }

  return {
    ok: true,
    asOfUtc: normalized,
  };
};

const normalizeEscalationStage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
};

const resolveEscalationDueTimeMs = (dueAtUtc: string, asOfUtc: string): number => {
  const dueAtMs = Date.parse(dueAtUtc);
  if (!Number.isNaN(dueAtMs)) {
    return dueAtMs;
  }

  const asOfMs = Date.parse(asOfUtc);
  if (!Number.isNaN(asOfMs)) {
    return asOfMs;
  }

  return Date.now();
};

const buildEscalationTransition = (input: {
  threadId: string;
  previousStage: number;
  dueAtUtc: string;
  asOfUtc: string;
  baselineHours: number;
}): ThreadEscalationTransition => {
  const nextStage = Math.min(
    Math.max(normalizeEscalationStage(input.previousStage), 0) + 1,
    MAX_ESCALATION_STAGE,
  );
  const nextDueOffsetHours = input.baselineHours * nextStage;
  const nextDueAtUtc = new Date(
    resolveEscalationDueTimeMs(input.dueAtUtc, input.asOfUtc) + (nextDueOffsetHours * HOUR_MS),
  ).toISOString();

  return {
    threadId: input.threadId,
    previousStage: normalizeEscalationStage(input.previousStage),
    stage: nextStage,
    dueAtUtc: input.dueAtUtc,
    nextDueAtUtc,
    nextDueOffsetHours,
  };
};

const compareDueThreads = (left: ConnectShyftThread, right: ConnectShyftThread): number => {
  const leftDue = left.escalation.nextEvaluationAtUtc
    ? new Date(left.escalation.nextEvaluationAtUtc).getTime()
    : Number.POSITIVE_INFINITY;
  const rightDue = right.escalation.nextEvaluationAtUtc
    ? new Date(right.escalation.nextEvaluationAtUtc).getTime()
    : Number.POSITIVE_INFINITY;
  const dueDiff =
    leftDue - rightDue;
  if (dueDiff !== 0) {
    return dueDiff;
  }

  return left.threadId.localeCompare(right.threadId);
};

const buildScopeKey = (tenantId: string, orgUnitId: string, neighborId: string): string =>
  `${tenantId}::${orgUnitId}::${neighborId}`;

const cloneThread = (thread: ConnectShyftThread): ConnectShyftThread => ({
  ...thread,
  escalation: {
    ...thread.escalation,
  },
});

const createLifecycleFieldsForState = (
  state: ConnectShyftThreadState,
  now: string,
  actorUserId: string | null | undefined,
): ThreadLifecycleFields | null => {
  const normalizedActorUserId = normalizeString(actorUserId);

  if (state === 'UNCLAIMED') {
    return {
      claimedByUserId: null,
      claimedAtUtc: null,
      closedByUserId: null,
      closedAtUtc: null,
    };
  }

  if (!normalizedActorUserId) {
    return null;
  }

  if (state === 'CLAIMED') {
    return {
      claimedByUserId: normalizedActorUserId,
      claimedAtUtc: now,
      closedByUserId: null,
      closedAtUtc: null,
    };
  }

  return {
    claimedByUserId: null,
    claimedAtUtc: null,
    closedByUserId: normalizedActorUserId,
    closedAtUtc: now,
  };
};

const transitionLifecycleFields = (
  existing: ConnectShyftThread,
  nextState: ConnectShyftThreadState,
  now: string,
  actorUserId: string | null | undefined,
): ThreadLifecycleFields | null => {
  const normalizedActorUserId = normalizeString(actorUserId);

  if (nextState === 'UNCLAIMED') {
    return {
      claimedByUserId: null,
      claimedAtUtc: null,
      closedByUserId: null,
      closedAtUtc: null,
    };
  }

  if (!normalizedActorUserId) {
    return null;
  }

  if (nextState === 'CLAIMED') {
    return {
      claimedByUserId: normalizedActorUserId,
      claimedAtUtc: now,
      closedByUserId: null,
      closedAtUtc: null,
    };
  }

  return {
    claimedByUserId: existing.claimedByUserId,
    claimedAtUtc: existing.claimedAtUtc,
    closedByUserId: normalizedActorUserId,
    closedAtUtc: now,
  };
};

const mapDbRowToThread = (row: DbThreadRow): ConnectShyftThread => ({
  threadId: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  neighborId: row.neighbor_id,
  source: row.source,
  state: row.state,
  lastInboundCsNumberId: row.last_inbound_cs_number_id,
  preferredOutboundCsNumberId: row.preferred_outbound_cs_number_id,
  claimedByUserId: row.claimed_by_user_id,
  claimedAtUtc: toNullableIsoUtc(row.claimed_at_utc),
  closedByUserId: row.closed_by_user_id,
  closedAtUtc: toNullableIsoUtc(row.closed_at_utc),
  createdAtUtc: toIsoUtc(row.created_at_utc),
  updatedAtUtc: toIsoUtc(row.updated_at_utc),
  escalation: {
    stage: row.escalation_stage,
    nextEvaluationAtUtc: toNullableIsoUtc(row.next_evaluation_at_utc),
  },
});

const hasThreadViewCapability = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_VIEW)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_VIEW_ALL);
};

const hasThreadTransitionCapability = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_CLAIM)
    || hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_TAKEOVER)
    || hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_CLOSE)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL);
};

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

const buildThreadViewCapabilityRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
  message: 'Thread access requires an authorized ConnectShyft role.',
});

const buildThreadTransitionCapabilityRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_TRANSITION_FORBIDDEN',
  message: 'Thread transition requires an authorized ConnectShyft role.',
});

const buildEnsureStateTransitionRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_TRANSITION_FORBIDDEN',
  message: 'POST /threads only supports UNCLAIMED ensures. Use claim/takeover/close lifecycle actions.',
});

const buildThreadStateInvalidRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_STATE_INVALID',
  message: 'Provide a canonical lifecycle state (UNCLAIMED, CLAIMED, CLOSED).',
});

const buildNextEvaluationInvalidRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_NEXT_EVALUATION_INVALID',
  message: 'nextEvaluationAtUtc must be a strict UTC ISO-8601 timestamp.',
});

const buildEscalationAsOfInvalidRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ESCALATION_AS_OF_INVALID',
  message: 'asOfUtc must be a strict UTC ISO-8601 timestamp.',
});

const buildEscalationBaselineInvalidIntegerRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
  message: 'Use whole hours between 1 and 24.',
});

const buildEscalationBaselineInvalidRangeRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
  message: 'Use whole hours between 1 and 24.',
});

const buildTransitionInvalidRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
  message: 'Lifecycle transition requires actor attribution for claimed and closed states.',
});

const buildThreadNotFoundRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
  message: 'Thread not found for this tenant.',
});

const buildEnsurePersistenceUnavailableRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_ENSURE_PERSISTENCE_UNAVAILABLE',
  message: 'Thread persistence is temporarily unavailable. Please retry.',
});

const buildPersistenceUnavailableRefusal = (): ThreadRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_THREAD_PERSISTENCE_UNAVAILABLE',
  message: 'Thread persistence is temporarily unavailable. Please retry.',
});

const resolveLifecycleNextState = (action: ConnectShyftLifecycleAction): ConnectShyftThreadState => {
  if (action === 'close') {
    return 'CLOSED';
  }

  return 'CLAIMED';
};

const isLifecycleTransitionAllowed = (
  action: ConnectShyftLifecycleAction,
  state: ConnectShyftThreadState,
): boolean => {
  if (action === 'claim') {
    return state === 'UNCLAIMED';
  }

  if (action === 'takeover') {
    return state === 'CLAIMED';
  }

  return state === 'CLAIMED';
};

const canBypassCloseOwnership = (actorRoles: Array<string | null | undefined>): boolean => {
  return hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_TAKEOVER)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL);
};

export const evaluateConnectShyftLifecyclePolicy = (input: {
  action: ConnectShyftLifecycleAction;
  currentState: ConnectShyftThreadState;
  claimedByUserId: string | null;
  actorUserId: string | null | undefined;
  actorRoles: Array<string | null | undefined>;
}): ConnectShyftLifecyclePolicyDecision => {
  const actorUserId = normalizeString(input.actorUserId);
  if (!actorUserId) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
      message: 'Lifecycle actions require actor attribution.',
    };
  }

  if (!isLifecycleTransitionAllowed(input.action, input.currentState)) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
      message: `Lifecycle action "${input.action}" is invalid from state ${input.currentState}.`,
    };
  }

  const claimedByUserId = normalizeString(input.claimedByUserId);
  if (
    input.action === 'close'
    && input.currentState === 'CLAIMED'
    && claimedByUserId
    && claimedByUserId !== actorUserId
    && !canBypassCloseOwnership(input.actorRoles)
  ) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_THREAD_OWNERSHIP_REQUIRED',
      message: 'Only the claimed owner or takeover-authorized role may close this thread.',
    };
  }

  return {
    ok: true,
    nextState: resolveLifecycleNextState(input.action),
  };
};

export class InMemoryConnectShyftThreadStore {
  private threadsById = new Map<string, ConnectShyftThread>();

  private activeThreadIdByScope = new Map<string, string>();

  ensureActiveThread(input: ThreadStoreEnsureInput): ThreadPersistenceEnsureResult {
    const scopeKey = buildScopeKey(input.tenantId, input.orgUnitId, input.neighborId);
    const activeThreadId = this.activeThreadIdByScope.get(scopeKey);
    const now = nowIsoUtc();

    if (activeThreadId) {
      const existing = this.threadsById.get(activeThreadId);
      if (existing) {
        const updated: ConnectShyftThread = {
          ...existing,
          source: input.source,
          lastInboundCsNumberId: input.lastInboundCsNumberId,
          preferredOutboundCsNumberId: input.preferredOutboundCsNumberId,
          updatedAtUtc: now,
          escalation: {
            ...existing.escalation,
            nextEvaluationAtUtc: input.nextEvaluationAtUtc ?? existing.escalation.nextEvaluationAtUtc,
          },
        };
        this.threadsById.set(existing.threadId, updated);
        return {
          ok: true,
          thread: cloneThread(updated),
        };
      }
    }

    const lifecycle = createLifecycleFieldsForState(
      input.state,
      now,
      input.actorUserId,
    );
    if (!lifecycle) {
      return {
        ok: false,
        reason: 'TRANSITION_ACTOR_REQUIRED',
      };
    }

    const threadId = normalizeString(input.threadId) || randomUUID();
    const created: ConnectShyftThread = {
      threadId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      neighborId: input.neighborId,
      source: input.source,
      state: input.state,
      lastInboundCsNumberId: input.lastInboundCsNumberId,
      preferredOutboundCsNumberId: input.preferredOutboundCsNumberId,
      claimedByUserId: lifecycle.claimedByUserId,
      claimedAtUtc: lifecycle.claimedAtUtc,
      closedByUserId: lifecycle.closedByUserId,
      closedAtUtc: lifecycle.closedAtUtc,
      createdAtUtc: now,
      updatedAtUtc: now,
      escalation: {
        stage: 0,
        nextEvaluationAtUtc: input.nextEvaluationAtUtc ?? now,
      },
    };

    this.threadsById.set(threadId, created);
    if (created.state !== 'CLOSED') {
      this.activeThreadIdByScope.set(scopeKey, threadId);
    }

    return {
      ok: true,
      thread: cloneThread(created),
    };
  }

  listDueThreads(input: ThreadStoreListDueInput): ConnectShyftThread[] {
    return Array.from(this.threadsById.values())
      .filter((thread) =>
        thread.tenantId === input.tenantId
        && thread.orgUnitId === input.orgUnitId
        && thread.state !== 'CLOSED'
        && thread.escalation.nextEvaluationAtUtc !== null)
      .sort(compareDueThreads)
      .slice(0, input.limit)
      .map(cloneThread);
  }

  transitionThreadState(input: ThreadStoreTransitionInput): ThreadPersistenceTransitionResult {
    const existing = this.threadsById.get(input.threadId);
    if (!existing || existing.tenantId !== input.tenantId) {
      return {
        ok: false,
        reason: 'THREAD_NOT_FOUND',
      };
    }

    const now = nowIsoUtc();
    const lifecycle = transitionLifecycleFields(existing, input.nextState, now, input.actorUserId);
    if (!lifecycle) {
      return {
        ok: false,
        reason: 'TRANSITION_ACTOR_REQUIRED',
      };
    }

    const transitioned: ConnectShyftThread = {
      ...existing,
      state: input.nextState,
      claimedByUserId: lifecycle.claimedByUserId,
      claimedAtUtc: lifecycle.claimedAtUtc,
      closedByUserId: lifecycle.closedByUserId,
      closedAtUtc: lifecycle.closedAtUtc,
      updatedAtUtc: now,
      escalation: {
        ...existing.escalation,
        stage:
          input.nextState === 'CLAIMED'
            ? 0
            : existing.escalation.stage,
        nextEvaluationAtUtc:
          input.nextState === 'UNCLAIMED'
            ? existing.escalation.nextEvaluationAtUtc || now
            : null,
      },
    };

    const scopeKey = buildScopeKey(existing.tenantId, existing.orgUnitId, existing.neighborId);
    if (transitioned.state === 'CLOSED') {
      if (this.activeThreadIdByScope.get(scopeKey) === transitioned.threadId) {
        this.activeThreadIdByScope.delete(scopeKey);
      }
    } else {
      this.activeThreadIdByScope.set(scopeKey, transitioned.threadId);
    }

    this.threadsById.set(transitioned.threadId, transitioned);
    return {
      ok: true,
      thread: cloneThread(transitioned),
    };
  }

  evaluateDueEscalations(input: ThreadStoreEvaluateInput): ThreadEscalationTransition[] {
    const asOfMs = Date.parse(input.asOfUtc);
    if (Number.isNaN(asOfMs)) {
      return [];
    }

    const dueThreads = Array.from(this.threadsById.values())
      .filter((thread) =>
        thread.tenantId === input.tenantId
        && thread.orgUnitId === input.orgUnitId
        && thread.state === 'UNCLAIMED'
        && thread.claimedByUserId === null
        && thread.escalation.nextEvaluationAtUtc !== null)
      .filter((thread) => {
        const dueAtMs = Date.parse(thread.escalation.nextEvaluationAtUtc as string);
        return !Number.isNaN(dueAtMs) && dueAtMs <= asOfMs;
      })
      .sort(compareDueThreads)
      .slice(0, input.limit);

    const now = nowIsoUtc();
    const transitions: ThreadEscalationTransition[] = [];

    dueThreads.forEach((thread) => {
      const dueAtUtc = thread.escalation.nextEvaluationAtUtc as string;
      const transition = buildEscalationTransition({
        threadId: thread.threadId,
        previousStage: thread.escalation.stage,
        dueAtUtc,
        asOfUtc: input.asOfUtc,
        baselineHours: input.baselineHours,
      });

      const updated: ConnectShyftThread = {
        ...thread,
        updatedAtUtc: now,
        escalation: {
          stage: transition.stage,
          nextEvaluationAtUtc: transition.nextDueAtUtc,
        },
      };

      this.threadsById.set(thread.threadId, updated);
      transitions.push(transition);
    });

    return transitions;
  }
}

export class KnexConnectShyftThreadStore {
  constructor(private readonly knexClient: Knex = db) {}

  private threadColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'neighbor_id',
      'source',
      'state',
      'escalation_stage',
      'next_evaluation_at_utc',
      'last_inbound_cs_number_id',
      'preferred_outbound_cs_number_id',
      'claimed_by_user_id',
      'claimed_at_utc',
      'closed_by_user_id',
      'closed_at_utc',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  async ensureActiveThread(input: ThreadStoreEnsureInput): Promise<ThreadPersistenceEnsureResult> {
    const normalizedActorUserId = normalizeUuid(input.actorUserId);
    try {
      return await this.knexClient.transaction(async (trx) => {
        const existing = await trx
          .withSchema('connectshyft')
          .table('cs_threads')
          .where({
            tenant_id: input.tenantId,
            org_unit_id: input.orgUnitId,
            neighbor_id: input.neighborId,
          })
          .whereNot('state', 'CLOSED')
          .first<DbThreadRow>(this.threadColumns());

        if (existing) {
          const updatePayload: Record<string, unknown> = {
            source: input.source,
            last_inbound_cs_number_id: input.lastInboundCsNumberId,
            preferred_outbound_cs_number_id: input.preferredOutboundCsNumberId,
            updated_by_user_id: normalizedActorUserId,
            updated_at_utc: trx.fn.now(),
          };

          if (input.nextEvaluationAtUtc !== undefined) {
            updatePayload.next_evaluation_at_utc = input.nextEvaluationAtUtc;
          }

          const [updated] = await trx
            .withSchema('connectshyft')
            .table('cs_threads')
            .where({
              tenant_id: input.tenantId,
              id: existing.id,
            })
            .update(updatePayload)
            .returning<DbThreadRow[]>(this.threadColumns());

          return {
            ok: true,
            thread: mapDbRowToThread(updated || existing),
          };
        }

        if (input.state !== 'UNCLAIMED' && !normalizedActorUserId) {
          return {
            ok: false,
            reason: 'TRANSITION_ACTOR_REQUIRED',
          } as ThreadPersistenceEnsureResult;
        }

        const insertPayload: Record<string, unknown> = {
          id: normalizeUuid(input.threadId) || randomUUID(),
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId,
          neighbor_id: input.neighborId,
          source: input.source,
          state: input.state,
          escalation_stage: 0,
          next_evaluation_at_utc: input.nextEvaluationAtUtc ?? trx.fn.now(),
          last_inbound_cs_number_id: input.lastInboundCsNumberId,
          preferred_outbound_cs_number_id: input.preferredOutboundCsNumberId,
          created_by_user_id: normalizedActorUserId || null,
          updated_by_user_id: normalizedActorUserId || null,
          created_at_utc: trx.fn.now(),
          updated_at_utc: trx.fn.now(),
          claimed_by_user_id: null,
          claimed_at_utc: null,
          closed_by_user_id: null,
          closed_at_utc: null,
        };

        if (input.state === 'CLAIMED') {
          insertPayload.claimed_by_user_id = normalizedActorUserId;
          insertPayload.claimed_at_utc = trx.fn.now();
        }

        if (input.state === 'CLOSED') {
          insertPayload.closed_by_user_id = normalizedActorUserId;
          insertPayload.closed_at_utc = trx.fn.now();
        }

        const [inserted] = await trx
          .withSchema('connectshyft')
          .table('cs_threads')
          .insert(insertPayload)
          .returning<DbThreadRow[]>(this.threadColumns());

        return {
          ok: true,
          thread: mapDbRowToThread(inserted),
        };
      });
    } catch (error) {
      if (error && typeof error === 'object') {
        const pg = error as { code?: string };
        if (pg.code === '23505') {
          const existing = await this.knexClient
            .withSchema('connectshyft')
            .table('cs_threads')
            .where({
              tenant_id: input.tenantId,
              org_unit_id: input.orgUnitId,
              neighbor_id: input.neighborId,
            })
            .whereNot('state', 'CLOSED')
            .first<DbThreadRow>(this.threadColumns());

          if (existing) {
            const updatePayload: Record<string, unknown> = {
              source: input.source,
              last_inbound_cs_number_id: input.lastInboundCsNumberId,
              preferred_outbound_cs_number_id: input.preferredOutboundCsNumberId,
              updated_by_user_id: normalizedActorUserId,
              updated_at_utc: this.knexClient.fn.now(),
            };

            if (input.nextEvaluationAtUtc !== undefined) {
              updatePayload.next_evaluation_at_utc = input.nextEvaluationAtUtc;
            }

            const [updated] = await this.knexClient
              .withSchema('connectshyft')
              .table('cs_threads')
              .where({
                tenant_id: input.tenantId,
                id: existing.id,
              })
              .whereNot('state', 'CLOSED')
              .update(updatePayload)
              .returning<DbThreadRow[]>(this.threadColumns());

            return {
              ok: true,
              thread: mapDbRowToThread(updated || existing),
            };
          }
        }
      }

      throw error;
    }
  }

  async listDueThreads(input: ThreadStoreListDueInput): Promise<ConnectShyftThread[]> {
    const rows = await this.knexClient
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
      })
      .whereNot('state', 'CLOSED')
      .whereNotNull('next_evaluation_at_utc')
      .orderBy('next_evaluation_at_utc', 'asc')
      .orderBy('id', 'asc')
      .limit(input.limit)
      .select<DbThreadRow[]>(this.threadColumns());

    return rows.map(mapDbRowToThread);
  }

  async transitionThreadState(input: ThreadStoreTransitionInput): Promise<ThreadPersistenceTransitionResult> {
    return this.knexClient.transaction(async (trx) => {
      const existing = await trx
        .withSchema('connectshyft')
        .table('cs_threads')
        .where({
          tenant_id: input.tenantId,
          id: input.threadId,
        })
        .first<DbThreadRow>(this.threadColumns());

      if (!existing) {
        return {
          ok: false,
          reason: 'THREAD_NOT_FOUND',
        } as ThreadPersistenceTransitionResult;
      }

      const normalizedActorUserId = normalizeUuid(input.actorUserId);
      if (input.nextState !== 'UNCLAIMED' && !normalizedActorUserId) {
        return {
          ok: false,
          reason: 'TRANSITION_ACTOR_REQUIRED',
        } as ThreadPersistenceTransitionResult;
      }

      const updatePayload: Record<string, unknown> = {
        state: input.nextState,
        updated_by_user_id: normalizedActorUserId || null,
        updated_at_utc: trx.fn.now(),
      };

      if (input.nextState === 'UNCLAIMED') {
        updatePayload.escalation_stage = existing.escalation_stage;
        updatePayload.claimed_by_user_id = null;
        updatePayload.claimed_at_utc = null;
        updatePayload.closed_by_user_id = null;
        updatePayload.closed_at_utc = null;
        updatePayload.next_evaluation_at_utc = existing.next_evaluation_at_utc || trx.fn.now();
      } else if (input.nextState === 'CLAIMED') {
        updatePayload.escalation_stage = 0;
        updatePayload.claimed_by_user_id = normalizedActorUserId;
        updatePayload.claimed_at_utc = trx.fn.now();
        updatePayload.closed_by_user_id = null;
        updatePayload.closed_at_utc = null;
        updatePayload.next_evaluation_at_utc = null;
      } else {
        updatePayload.closed_by_user_id = normalizedActorUserId;
        updatePayload.closed_at_utc = trx.fn.now();
        updatePayload.next_evaluation_at_utc = null;
      }

      const [updated] = await trx
        .withSchema('connectshyft')
        .table('cs_threads')
        .where({
          tenant_id: input.tenantId,
          id: input.threadId,
        })
        .update(updatePayload)
        .returning<DbThreadRow[]>(this.threadColumns());

      return {
        ok: true,
        thread: mapDbRowToThread(updated),
      };
    });
  }

  async evaluateDueEscalations(input: ThreadStoreEvaluateInput): Promise<ThreadEscalationTransition[]> {
    return this.knexClient.transaction(async (trx) => {
      const dueRows = await trx
        .withSchema('connectshyft')
        .table('cs_threads')
        .where({
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId,
          state: 'UNCLAIMED',
        })
        .whereNull('claimed_by_user_id')
        .whereNotNull('next_evaluation_at_utc')
        .andWhere('next_evaluation_at_utc', '<=', input.asOfUtc)
        .orderBy('next_evaluation_at_utc', 'asc')
        .orderBy('id', 'asc')
        .limit(input.limit)
        .forUpdate()
        .skipLocked()
        .select<DbThreadRow[]>(this.threadColumns());

      const normalizedActorUserId = normalizeUuid(input.actorUserId);
      const transitions: ThreadEscalationTransition[] = [];

      for (const row of dueRows) {
        const dueAtUtc = toNullableIsoUtc(row.next_evaluation_at_utc);
        if (!dueAtUtc) {
          continue;
        }

        const transition = buildEscalationTransition({
          threadId: row.id,
          previousStage: normalizeEscalationStage(row.escalation_stage),
          dueAtUtc,
          asOfUtc: input.asOfUtc,
          baselineHours: input.baselineHours,
        });

        const [updated] = await trx
          .withSchema('connectshyft')
          .table('cs_threads')
          .where({
            tenant_id: input.tenantId,
            id: row.id,
            state: 'UNCLAIMED',
            escalation_stage: row.escalation_stage,
          })
          .whereNull('claimed_by_user_id')
          .where('next_evaluation_at_utc', row.next_evaluation_at_utc as Date | string)
          .update({
            escalation_stage: transition.stage,
            next_evaluation_at_utc: transition.nextDueAtUtc,
            updated_by_user_id: normalizedActorUserId,
            updated_at_utc: trx.fn.now(),
          })
          .returning<DbThreadRow[]>(this.threadColumns());

        if (updated) {
          transitions.push(transition);
        }
      }

      return transitions;
    });
  }
}

export class ConnectShyftThreadService {
  constructor(
    private readonly store: InMemoryConnectShyftThreadStore = defaultThreadStore,
  ) {}

  ensureThread(input: ConnectShyftEnsureThreadCommand): ConnectShyftEnsureThreadResult {
    if (!hasThreadViewCapability(input.actorRoles)) {
      return buildThreadViewCapabilityRefusal();
    }

    const state = normalizeThreadState(input.forcedState);
    if (!state) {
      return buildThreadStateInvalidRefusal();
    }
    if (state !== 'UNCLAIMED') {
      return buildEnsureStateTransitionRefusal();
    }

    const requestedNextEvaluationAtUtc = normalizeString(input.nextEvaluationAtUtc);
    if (
      requestedNextEvaluationAtUtc.length > 0
      && !isStrictUtcIsoTimestamp(requestedNextEvaluationAtUtc)
    ) {
      return buildNextEvaluationInvalidRefusal();
    }

    const persisted = this.store.ensureActiveThread({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      neighborId: input.neighborId,
      source: normalizeString(input.source) || DEFAULT_THREAD_SOURCE,
      state,
      lastInboundCsNumberId: normalizeString(input.lastInboundCsNumberId),
      preferredOutboundCsNumberId: normalizeString(input.preferredOutboundCsNumberId),
      threadId: input.threadId,
      actorUserId: input.actorUserId,
      nextEvaluationAtUtc:
        requestedNextEvaluationAtUtc.length > 0
          ? requestedNextEvaluationAtUtc
          : undefined,
    });

    if (!persisted.ok) {
      return buildTransitionInvalidRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_THREAD_ENSURED',
      httpStatus: 201,
      data: {
        thread: persisted.thread,
      },
    };
  }

  listDueThreads(input: ConnectShyftListDueThreadsCommand): ConnectShyftListDueThreadsResult {
    if (!hasThreadViewCapability(input.actorRoles)) {
      return buildThreadViewCapabilityRefusal();
    }

    const threads = this.store.listDueThreads({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      limit: normalizeDueThreadLimit(input.limit),
    });

    return {
      ok: true,
      code: 'CONNECTSHYFT_DUE_THREADS_LISTED',
      httpStatus: 200,
      data: {
        threads,
      },
    };
  }

  evaluateEscalations(
    input: ConnectShyftEvaluateEscalationsCommand,
  ): ConnectShyftEvaluateEscalationsResult {
    if (!hasThreadViewCapability(input.actorRoles)) {
      return buildThreadViewCapabilityRefusal();
    }

    const asOfResolution = resolveEscalationAsOfUtc(input.asOfUtc);
    if (!asOfResolution.ok) {
      return asOfResolution;
    }

    const baselineResolution = normalizeEscalationBaselineHours(input.baselineHours);
    if (!baselineResolution.ok) {
      return baselineResolution;
    }

    const transitions = this.store.evaluateDueEscalations({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      asOfUtc: asOfResolution.asOfUtc,
      limit: normalizeDueThreadLimit(input.limit),
      baselineHours: baselineResolution.baselineHours,
      actorUserId: input.actorUserId,
    });

    return {
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
      httpStatus: 200,
      data: {
        asOfUtc: asOfResolution.asOfUtc,
        baselineHours: baselineResolution.baselineHours,
        transitions,
        effects: {
          emittedCount: transitions.length,
        },
        replaySafe: transitions.length === 0,
        skippedAlreadyProcessed: transitions.length === 0,
      },
    };
  }

  transitionThreadState(
    input: ConnectShyftTransitionThreadStateCommand,
  ): ConnectShyftTransitionThreadStateResult {
    if (!hasThreadTransitionCapability(input.actorRoles)) {
      return buildThreadTransitionCapabilityRefusal();
    }

    const persisted = this.store.transitionThreadState({
      tenantId: input.tenantId,
      threadId: input.threadId,
      nextState: input.nextState,
      actorUserId: input.actorUserId,
    });

    if (!persisted.ok) {
      if (persisted.reason === 'THREAD_NOT_FOUND') {
        return buildThreadNotFoundRefusal();
      }
      return buildTransitionInvalidRefusal();
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_THREAD_TRANSITIONED',
      httpStatus: 200,
      data: {
        thread: persisted.thread,
      },
    };
  }
}

const defaultThreadStore = new InMemoryConnectShyftThreadStore();
const defaultKnexThreadStore = new KnexConnectShyftThreadStore();

export const connectShyftThreadService = new ConnectShyftThreadService(defaultThreadStore);

export class AsyncConnectShyftThreadService {
  constructor(
    private readonly store: KnexConnectShyftThreadStore = defaultKnexThreadStore,
  ) {}

  async ensureThread(input: ConnectShyftEnsureThreadCommand): Promise<ConnectShyftEnsureThreadResult> {
    if (!hasThreadViewCapability(input.actorRoles)) {
      return buildThreadViewCapabilityRefusal();
    }

    const state = normalizeThreadState(input.forcedState);
    if (!state) {
      return buildThreadStateInvalidRefusal();
    }
    if (state !== 'UNCLAIMED') {
      return buildEnsureStateTransitionRefusal();
    }

    const requestedNextEvaluationAtUtc = normalizeString(input.nextEvaluationAtUtc);
    if (
      requestedNextEvaluationAtUtc.length > 0
      && !isStrictUtcIsoTimestamp(requestedNextEvaluationAtUtc)
    ) {
      return buildNextEvaluationInvalidRefusal();
    }

    try {
      const persisted = await this.store.ensureActiveThread({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        neighborId: input.neighborId,
        source: normalizeString(input.source) || DEFAULT_THREAD_SOURCE,
        state,
        lastInboundCsNumberId: normalizeString(input.lastInboundCsNumberId),
        preferredOutboundCsNumberId: normalizeString(input.preferredOutboundCsNumberId),
        threadId: input.threadId,
        actorUserId: input.actorUserId,
        nextEvaluationAtUtc:
          requestedNextEvaluationAtUtc.length > 0
            ? requestedNextEvaluationAtUtc
            : undefined,
      });

      if (!persisted.ok) {
        return buildTransitionInvalidRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_THREAD_ENSURED',
        httpStatus: 201,
        data: {
          thread: persisted.thread,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildEnsurePersistenceUnavailableRefusal();
    }
  }

  async listDueThreads(
    input: ConnectShyftListDueThreadsCommand,
  ): Promise<ConnectShyftListDueThreadsResult> {
    if (!hasThreadViewCapability(input.actorRoles)) {
      return buildThreadViewCapabilityRefusal();
    }

    try {
      const threads = await this.store.listDueThreads({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        limit: normalizeDueThreadLimit(input.limit),
      });

      return {
        ok: true,
        code: 'CONNECTSHYFT_DUE_THREADS_LISTED',
        httpStatus: 200,
        data: {
          threads: threads.sort(compareDueThreads),
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async evaluateEscalations(
    input: ConnectShyftEvaluateEscalationsCommand,
  ): Promise<ConnectShyftEvaluateEscalationsResult> {
    if (!hasThreadViewCapability(input.actorRoles)) {
      return buildThreadViewCapabilityRefusal();
    }

    const asOfResolution = resolveEscalationAsOfUtc(input.asOfUtc);
    if (!asOfResolution.ok) {
      return asOfResolution;
    }

    const baselineResolution = normalizeEscalationBaselineHours(input.baselineHours);
    if (!baselineResolution.ok) {
      return baselineResolution;
    }

    try {
      const transitions = await this.store.evaluateDueEscalations({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        asOfUtc: asOfResolution.asOfUtc,
        limit: normalizeDueThreadLimit(input.limit),
        baselineHours: baselineResolution.baselineHours,
        actorUserId: input.actorUserId,
      });

      return {
        ok: true,
        code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
        httpStatus: 200,
        data: {
          asOfUtc: asOfResolution.asOfUtc,
          baselineHours: baselineResolution.baselineHours,
          transitions,
          effects: {
            emittedCount: transitions.length,
          },
          replaySafe: transitions.length === 0,
          skippedAlreadyProcessed: transitions.length === 0,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }

  async transitionThreadState(
    input: ConnectShyftTransitionThreadStateCommand,
  ): Promise<ConnectShyftTransitionThreadStateResult> {
    if (!hasThreadTransitionCapability(input.actorRoles)) {
      return buildThreadTransitionCapabilityRefusal();
    }

    try {
      const persisted = await this.store.transitionThreadState({
        tenantId: input.tenantId,
        threadId: input.threadId,
        nextState: input.nextState,
        actorUserId: input.actorUserId,
      });

      if (!persisted.ok) {
        if (persisted.reason === 'THREAD_NOT_FOUND') {
          return buildThreadNotFoundRefusal();
        }
        return buildTransitionInvalidRefusal();
      }

      return {
        ok: true,
        code: 'CONNECTSHYFT_THREAD_TRANSITIONED',
        httpStatus: 200,
        data: {
          thread: persisted.thread,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      return buildPersistenceUnavailableRefusal();
    }
  }
}

export const connectShyftThreadServiceAsync = new AsyncConnectShyftThreadService();
