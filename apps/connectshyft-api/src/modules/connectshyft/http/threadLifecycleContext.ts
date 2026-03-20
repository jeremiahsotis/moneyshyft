import { Request, Response } from 'express';
import type { Knex } from 'knex';
import { refusal, success } from '../../../platform/envelopes/response';
import { executePlatformMutation } from '../../../platform/mutations/executePlatformMutation';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import { isConnectShyftTestOverrideEnabled } from '../featureFlags';
import {
  resolveConnectShyftThreadDetailContract,
  resolveConnectShyftThreadDetailContractAsync,
} from '../readContracts';
import {
  AsyncConnectShyftThreadService,
  KnexConnectShyftThreadStore,
  connectShyftThreadServiceAsync,
  evaluateConnectShyftLifecyclePolicy,
  type ConnectShyftLifecycleAction,
  type ConnectShyftThread,
  type ConnectShyftThreadState,
} from '../threads';
import {
  enforceConnectShyftCapability,
  loadConnectShyftPlatformDb,
  requestHasAnyCapability,
  resolveConnectShyftActorRoles,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONNECTSHYFT_LIFECYCLE_EVENT_NAMES = {
  claimed: 'connectshyft.thread.claimed',
  takenOver: 'connectshyft.thread.taken_over',
  closed: 'connectshyft.thread.closed',
} as const;
const CONNECTSHYFT_ESCALATION_NOTIFICATION_EVENT_PREFIXES = [
  'connectshyft.thread.escalation.',
  'connectshyft.escalation.',
] as const;

type ConnectShyftSyntheticThreadDescriptor = {
  tenantId: string;
  orgUnitId: string;
  state: ConnectShyftThreadState;
  claimedByUserId: string | null;
  escalationStage: number;
  nextEvaluationAtUtc: string | null;
  neighborId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  summary: string;
};

const CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS: Record<string, ConnectShyftSyntheticThreadDescriptor> = {
  '483a4c51-e677-422a-8bc6-faeea89c6dcf': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 2,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-c4-1001',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Unclaimed intake ready for assignment',
  },
  '6fb01cbc-069d-485a-86f7-ee72359543b9': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-c4-other-operator',
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-c4-1002',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Claimed thread eligible for takeover/close',
  },
  '2f6bbd34-49c7-4400-8982-889c996ab87b': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-c4-1003',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Closed thread awaiting explicit outbound reopen',
  },
  '4332bb8e-940f-4927-8320-a8d3f3093d72': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 2,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-d4-1001',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Unclaimed intake ready for policy-safe outbound action',
  },
  '0b3060e8-d0e1-4366-8655-8c7ec44cf0ee': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-d4-other-operator',
    escalationStage: 1,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-d4-1002',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Claimed thread eligible for close action',
  },
  '20ab942f-27c6-4ae5-8af2-06b727c36b2a': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-d4-1003',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Closed thread awaiting explicit same-thread reopen',
  },
  '06a77807-6575-4c63-8824-38a89f9dae12': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-d4-pref-no-1005',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Closed thread with prefers_texting=NO policy.',
  },
  '59b44eb4-c8e7-4cd1-8a22-bbeceb871dd7': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-d4-pref-no-1004',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Unclaimed thread with prefers_texting=NO policy.',
  },
  '1641c3dd-4d4c-4997-8b72-ae4876649b37': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 2,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-ux-r4-1001',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Unclaimed thread with explicit outbound guardrail controls.',
  },
  '69c239d2-8f02-4202-8cec-a7f0de61cbf7': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-ux-r4-other-operator',
    escalationStage: 1,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-ux-r4-1002',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Claimed thread with deterministic policy-safe outbound controls.',
  },
  'aedcda71-42b7-4857-8a0a-70013e01d4cd': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-ux-r4-1003',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Closed thread requiring explicit same-thread reopen before outbound.',
  },
  '21f2866f-37ff-42da-80fc-0b5d2c3bc09d': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-ux-r4-pref-no-1004',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Unclaimed thread with prefers_texting=NO policy.',
  },
  'e37b00e0-228f-43c0-8c70-b3d0a5bfad40': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-ux-r4-pref-no-1005',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Closed thread with prefers_texting=NO policy.',
  },
  'thread-c5-unclaimed-1001': {
    tenantId: 'tenant-connectshyft-c5',
    orgUnitId: 'org-connectshyft-c5-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-c5-1001',
    lastInboundCsNumberId: '+12605550179',
    preferredOutboundCsNumberId: '+12605550179',
    summary: 'Unclaimed thread pending deterministic escalation evaluation',
  },
  'cc9bb30e-4b36-4419-8563-819432f4ba14': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-c4-pref-no-1004',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Unclaimed thread with prefers_texting=NO policy.',
  },
  '935eed99-c710-49e8-838d-ab25d02ca821': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-c4-pref-no-1005',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Closed thread with prefers_texting=NO policy.',
  },
  'thread-f1-unclaimed-1001': {
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-f1-1001',
    lastInboundCsNumberId: '+12605550191',
    preferredOutboundCsNumberId: '+12605550191',
    summary: 'F1 unclaimed thread for provider adapter registry contracts.',
  },
  'thread-f1-claimed-1002': {
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-f1-other-operator',
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f1-1002',
    lastInboundCsNumberId: '+12605550191',
    preferredOutboundCsNumberId: '+12605550191',
    summary: 'F1 claimed thread for provider disabled refusal validation.',
  },
  'thread-f1-closed-1003': {
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f1-1003',
    lastInboundCsNumberId: '+12605550191',
    preferredOutboundCsNumberId: '+12605550191',
    summary: 'F1 closed thread for same-thread reopen provider dispatch validation.',
  },
  'thread-f2-unclaimed-1001': {
    tenantId: 'tenant-connectshyft-f2',
    orgUnitId: 'org-connectshyft-f2-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-f2-1001',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'F2 unclaimed thread for canonical event model contracts.',
  },
  'thread-f2-claimed-1002': {
    tenantId: 'tenant-connectshyft-f2',
    orgUnitId: 'org-connectshyft-f2-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-f2-other-operator',
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f2-1002',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'F2 claimed thread for canonical timeline validation.',
  },
  'thread-f2-closed-1003': {
    tenantId: 'tenant-connectshyft-f2',
    orgUnitId: 'org-connectshyft-f2-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f2-1003',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'F2 closed thread for canonical timeline validation.',
  },
};

const CONNECTSHYFT_DYNAMIC_C5_THREAD_PREFIX = 'thread-c5-unclaimed-';
const CONNECTSHYFT_DYNAMIC_C5_THREAD_TEMPLATE_ID = 'thread-c5-unclaimed-1001';

type ResolvedLifecycleContext = {
  syntheticThread: ConnectShyftSyntheticThreadDescriptor | null;
  currentState: ConnectShyftThreadState | null;
  claimedByUserId: string | null;
};

type LifecycleTransitionSideEffects = {
  eventName: string;
  metadata: Record<string, unknown>;
};

type LifecycleTransitionSideEffectInput =
  | LifecycleTransitionSideEffects
  | LifecycleTransitionSideEffects[];

type ConnectShyftThreadLifecycleAccessContext = {
  action: ConnectShyftLifecycleAction;
  context: ResolvedConnectShyftContext;
  threadId: string;
  actorUserId: string | null;
  actorRoles: string[];
  reason: string | null;
  resolution: string | null;
  lifecycleContext: ResolvedLifecycleContext;
  nextState: ConnectShyftThreadState;
};

class LifecycleTransitionRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LifecycleTransitionRefusalError';
  }
}

const nowIsoUtc = (): string => new Date().toISOString();

const normalizeLifecycleString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const parseThreadIdParam = (req: Request): string => {
  if (typeof req.params.threadId !== 'string') {
    return '';
  }

  return req.params.threadId.trim();
};

const parseLifecycleReason = (req: Request): string | null => {
  const reason = normalizeLifecycleString(req.body?.reason);
  return reason || null;
};

const parseLifecycleResolution = (req: Request): string | null => {
  const resolution = normalizeLifecycleString(req.body?.resolution);
  return resolution || null;
};

const resolveLifecycleEventName = (action: ConnectShyftLifecycleAction): string => {
  if (action === 'claim') {
    return CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.claimed;
  }

  if (action === 'takeover') {
    return CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.takenOver;
  }

  return CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.closed;
};

const buildLifecycleMetadata = (input: {
  tenantId: string;
  orgUnitId: string;
  actorUserId: string | null;
  threadId: string;
  priorState: ConnectShyftThreadState;
  newState: ConnectShyftThreadState;
  action: string;
  reason?: string | null;
  resolution?: string | null;
  threadReopenedByUser?: string | null;
  lifecycleLineage?: Record<string, unknown> | null;
}): Record<string, unknown> => ({
  tenant_id: input.tenantId,
  org_unit_id: input.orgUnitId,
  actor_user_id: normalizeLifecycleString(input.actorUserId) || 'unknown',
  thread_id: input.threadId,
  prior_state: input.priorState,
  new_state: input.newState,
  action: input.action,
  reason: input.reason || null,
  resolution: input.resolution || null,
  thread_reopened_by_user: input.threadReopenedByUser || null,
  lifecycle_lineage: input.lifecycleLineage || null,
});

const buildLifecycleSideEffects = (input: {
  eventName: string;
  metadata: Record<string, unknown>;
}) => ({
  audit: {
    eventName: input.eventName,
    metadata: input.metadata,
  },
  outbox: {
    eventName: input.eventName,
    metadata: input.metadata,
  },
});

const buildLifecycleThreadResponse = (
  thread: ConnectShyftThread,
): ConnectShyftThread & { escalationStage: number; nextEvaluationAtUtc: string | null } => ({
  ...thread,
  escalationStage: thread.escalation.stage,
  nextEvaluationAtUtc: thread.escalation.nextEvaluationAtUtc,
});

const resolveMutationActorUserId = (actorUserId: string | null): string | null => {
  const normalized = normalizeLifecycleString(actorUserId);
  if (!normalized) {
    return null;
  }

  return UUID_PATTERN.test(normalized) ? normalized : null;
};

const resolveSyntheticLifecycleThread = (input: {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
}): ConnectShyftSyntheticThreadDescriptor | null => {
  const existing = CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[input.threadId];
  if (existing) {
    if (existing.tenantId !== input.tenantId || existing.orgUnitId !== input.orgUnitId) {
      return null;
    }

    return existing;
  }

  if (!UUID_PATTERN.test(input.threadId)) {
    const seededThreadDetail = resolveConnectShyftThreadDetailContract({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
    });

    if (seededThreadDetail) {
      const seededDescriptor: ConnectShyftSyntheticThreadDescriptor = {
        tenantId: seededThreadDetail.tenantId,
        orgUnitId: seededThreadDetail.orgUnitId,
        state: seededThreadDetail.state,
        claimedByUserId: seededThreadDetail.claimedByUserId,
        escalationStage: seededThreadDetail.escalationStage,
        nextEvaluationAtUtc: seededThreadDetail.state === 'UNCLAIMED'
          ? seededThreadDetail.lastActivityAtUtc
          : null,
        neighborId: `neighbor-${seededThreadDetail.threadId}`,
        lastInboundCsNumberId: seededThreadDetail.lastInboundCsNumberId,
        preferredOutboundCsNumberId: seededThreadDetail.preferredOutboundCsNumberId,
        summary: seededThreadDetail.summary,
      };

      CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[input.threadId] = seededDescriptor;
      return seededDescriptor;
    }
  }

  if (!input.threadId.startsWith(CONNECTSHYFT_DYNAMIC_C5_THREAD_PREFIX)) {
    return null;
  }

  const template = CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[CONNECTSHYFT_DYNAMIC_C5_THREAD_TEMPLATE_ID];
  if (!template) {
    return null;
  }

  const dynamicDescriptor: ConnectShyftSyntheticThreadDescriptor = {
    ...template,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: template.nextEvaluationAtUtc,
    neighborId: `neighbor-${input.threadId}`,
  };

  CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[input.threadId] = dynamicDescriptor;
  return dynamicDescriptor;
};

const updateSyntheticLifecycleThread = (thread: ConnectShyftThread): void => {
  if (isConnectShyftTestOverrideEnabled() && !thread.threadId.startsWith('thread-c5-')) {
    return;
  }

  const descriptor = CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[thread.threadId];
  if (!descriptor) {
    return;
  }

  descriptor.state = thread.state;
  descriptor.claimedByUserId = thread.claimedByUserId;
  descriptor.escalationStage = thread.escalation.stage;
  descriptor.nextEvaluationAtUtc = thread.escalation.nextEvaluationAtUtc;
  descriptor.neighborId = thread.neighborId;
  descriptor.lastInboundCsNumberId = thread.lastInboundCsNumberId;
  descriptor.preferredOutboundCsNumberId = thread.preferredOutboundCsNumberId;
};

const buildSyntheticThread = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  currentState: ConnectShyftThreadState;
  nextState: ConnectShyftThreadState;
  actorUserId: string | null;
  fallbackNeighborId?: string;
  fallbackLastInboundCsNumberId?: string;
  fallbackPreferredOutboundCsNumberId?: string;
  fallbackEscalationStage?: number;
  fallbackNextEvaluationAtUtc?: string | null;
}): ConnectShyftThread => {
  const now = nowIsoUtc();
  const actorUserId = normalizeLifecycleString(input.actorUserId) || null;
  const fallbackEscalationStage = Number.isFinite(input.fallbackEscalationStage)
    ? Math.max(0, Math.trunc(input.fallbackEscalationStage as number))
    : 0;
  const fallbackNextEvaluationAtUtc = normalizeLifecycleString(input.fallbackNextEvaluationAtUtc || null) || null;
  const isReopened = input.currentState === 'CLOSED' && input.nextState === 'UNCLAIMED';
  const isNoopState = input.currentState === input.nextState;
  const escalationStage = isReopened
    ? 0
    : isNoopState
      ? fallbackEscalationStage
      : input.nextState === 'UNCLAIMED' || input.nextState === 'CLAIMED'
        ? 0
        : fallbackEscalationStage;
  const nextEvaluationAtUtc = input.nextState === 'UNCLAIMED'
    ? (isNoopState ? (fallbackNextEvaluationAtUtc || now) : now)
    : null;

  return {
    threadId: input.threadId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    neighborId: input.fallbackNeighborId || `neighbor-${input.threadId}`,
    source: 'VOICE',
    state: input.nextState,
    lastInboundCsNumberId: input.fallbackLastInboundCsNumberId || '',
    preferredOutboundCsNumberId: input.fallbackPreferredOutboundCsNumberId || '',
    claimedByUserId: input.nextState === 'CLAIMED' ? actorUserId : null,
    claimedAtUtc: input.nextState === 'CLAIMED' ? now : null,
    closedByUserId: input.nextState === 'CLOSED' ? actorUserId : null,
    closedAtUtc: input.nextState === 'CLOSED' ? now : null,
    createdAtUtc: now,
    updatedAtUtc: now,
    escalation: {
      stage: escalationStage,
      nextEvaluationAtUtc,
    },
  };
};

const canPersistLifecycleSideEffects = (input: {
  tenantId: string;
  threadId: string;
  syntheticThread: ConnectShyftSyntheticThreadDescriptor | null;
  sideEffects?: LifecycleTransitionSideEffectInput;
}): boolean => {
  if (!input.sideEffects) {
    return false;
  }

  if (input.syntheticThread) {
    return false;
  }

  return UUID_PATTERN.test(input.tenantId) && UUID_PATTERN.test(input.threadId);
};

const resolveLifecycleContext = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId: string | null;
}): Promise<ResolvedLifecycleContext> => {
  const syntheticThread = resolveSyntheticLifecycleThread({
    threadId: input.threadId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
  });
  if (syntheticThread) {
    return {
      syntheticThread,
      currentState: syntheticThread.state,
      claimedByUserId: syntheticThread.claimedByUserId,
    };
  }

  const detail = await resolveConnectShyftThreadDetailContractAsync({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    actorUserId: input.actorUserId,
    db: loadConnectShyftPlatformDb(),
  });

  if (detail) {
    return {
      syntheticThread: null,
      currentState: detail.state,
      claimedByUserId: detail.claimedByUserId || null,
    };
  }

  return {
    syntheticThread: null,
    currentState: null,
    claimedByUserId: null,
  };
};

const transitionThreadWithSideEffects = async (input: {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId: string | null;
  currentState: ConnectShyftThreadState;
  nextState: ConnectShyftThreadState;
  syntheticThread: ConnectShyftSyntheticThreadDescriptor | null;
  sideEffects?: LifecycleTransitionSideEffectInput;
}): Promise<
  | { ok: true; thread: ConnectShyftThread; sideEffectsPersisted: boolean }
  | { ok: false; code: string; message: string }
> => {
  if (canPersistLifecycleSideEffects({
    tenantId: input.tenantId,
    threadId: input.threadId,
    syntheticThread: input.syntheticThread,
    sideEffects: input.sideEffects,
  })) {
    try {
      const lifecycleSideEffects = Array.isArray(input.sideEffects)
        ? input.sideEffects
        : [input.sideEffects!];
      const thread = await executePlatformMutation({
        mutation: async (trx) => {
          const txThreadService = new AsyncConnectShyftThreadService(
            new KnexConnectShyftThreadStore(trx as unknown as Knex),
          );
          const transitioned = await txThreadService.transitionThreadState({
            actorRoles: input.actorRoles,
            tenantId: input.tenantId,
            threadId: input.threadId,
            nextState: input.nextState,
            actorUserId: input.actorUserId,
          });
          if (!transitioned.ok) {
            throw new LifecycleTransitionRefusalError(transitioned.code, transitioned.message);
          }

          return transitioned.data.thread;
        },
        event: lifecycleSideEffects.map((sideEffect) => ({
          tenantId: input.tenantId,
          actorId: resolveMutationActorUserId(input.actorUserId),
          eventName: sideEffect.eventName,
          entityType: 'connectshyft.thread',
          entityId: input.threadId,
          payload: sideEffect.metadata,
        })),
      }, loadConnectShyftPlatformDb());

      return {
        ok: true,
        thread,
        sideEffectsPersisted: true,
      };
    } catch (error: unknown) {
      if (error instanceof LifecycleTransitionRefusalError) {
        return {
          ok: false,
          code: error.code,
          message: error.message,
        };
      }

      return {
        ok: false,
        code: 'CONNECTSHYFT_LIFECYCLE_SIDE_EFFECTS_UNAVAILABLE',
        message: 'Lifecycle transition side effects are temporarily unavailable. Please retry.',
      };
    }
  }

  if (!UUID_PATTERN.test(input.threadId) && input.syntheticThread) {
    const thread = buildSyntheticThread({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      currentState: input.currentState,
      nextState: input.nextState,
      actorUserId: input.actorUserId,
      fallbackNeighborId: input.syntheticThread.neighborId,
      fallbackLastInboundCsNumberId: input.syntheticThread.lastInboundCsNumberId,
      fallbackPreferredOutboundCsNumberId: input.syntheticThread.preferredOutboundCsNumberId,
      fallbackEscalationStage: input.syntheticThread.escalationStage,
      fallbackNextEvaluationAtUtc: input.syntheticThread.nextEvaluationAtUtc,
    });
    updateSyntheticLifecycleThread(thread);

    return {
      ok: true,
      thread,
      sideEffectsPersisted: false,
    };
  }

  const transitioned = await connectShyftThreadServiceAsync.transitionThreadState({
    actorRoles: input.actorRoles,
    tenantId: input.tenantId,
    threadId: input.threadId,
    nextState: input.nextState,
    actorUserId: input.actorUserId,
  });

  if (transitioned.ok) {
    return {
      ok: true,
      thread: transitioned.data.thread,
      sideEffectsPersisted: false,
    };
  }

  if (transitioned.code !== 'CONNECTSHYFT_THREAD_NOT_FOUND' || !input.syntheticThread) {
    return {
      ok: false,
      code: transitioned.code,
      message: transitioned.message,
    };
  }

  const thread = buildSyntheticThread({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    currentState: input.currentState,
    nextState: input.nextState,
    actorUserId: input.actorUserId,
    fallbackNeighborId: input.syntheticThread.neighborId,
    fallbackLastInboundCsNumberId: input.syntheticThread.lastInboundCsNumberId,
    fallbackPreferredOutboundCsNumberId: input.syntheticThread.preferredOutboundCsNumberId,
    fallbackEscalationStage: input.syntheticThread.escalationStage,
    fallbackNextEvaluationAtUtc: input.syntheticThread.nextEvaluationAtUtc,
  });
  updateSyntheticLifecycleThread(thread);

  return {
    ok: true,
    thread,
    sideEffectsPersisted: false,
  };
};

const cancelPendingEscalationNotifications = async (input: {
  tenantId: string;
  threadId: string;
}): Promise<number> => {
  if (!UUID_PATTERN.test(input.tenantId) || !UUID_PATTERN.test(input.threadId)) {
    return 0;
  }

  try {
    const platformDb = loadConnectShyftPlatformDb();
    const canceled = await platformDb
      .withSchema('platform')
      .table('outbox_events')
      .where({
        tenant_id: input.tenantId,
        entity_type: 'connectshyft.thread',
        entity_id: input.threadId,
        delivery_status: 'pending',
      })
      .andWhere((queryBuilder) => {
        CONNECTSHYFT_ESCALATION_NOTIFICATION_EVENT_PREFIXES.forEach((prefix, index) => {
          if (index === 0) {
            queryBuilder.where('event_name', 'like', `${prefix}%`);
            return;
          }

          queryBuilder.orWhere('event_name', 'like', `${prefix}%`);
        });
      })
      .update({
        delivery_status: 'failed',
        last_delivery_error: 'Canceled after explicit claim transition.',
        available_at_utc: platformDb.fn.now(),
      });

    if (typeof canceled !== 'number' || !Number.isFinite(canceled)) {
      return 0;
    }

    return Math.max(0, Math.trunc(canceled));
  } catch (_error) {
    return 0;
  }
};

const sendLifecycleCapabilityRefusal = (
  res: Response,
  action: ConnectShyftLifecycleAction,
): void => {
  if (action === 'claim') {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
      message: 'Thread claim requires an authorized orgUnit role.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  if (action === 'takeover') {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_THREAD_TAKEOVER_FORBIDDEN',
      message: 'Thread takeover requires an authorized orgUnit role.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_THREAD_CLOSE_FORBIDDEN',
    message: 'Thread close requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
};

const requestHasLifecycleActionCapability = (
  req: Request,
  action: ConnectShyftLifecycleAction,
  context: Pick<ResolvedConnectShyftContext, 'effectiveRoles'>,
): boolean => {
  if (action === 'claim') {
    return requestHasAnyCapability(req, [
      CAPABILITIES.ORG_UNIT_THREAD_CLAIM,
      CAPABILITIES.THREAD_TAKEOVER_ALL,
    ], context);
  }

  if (action === 'takeover') {
    return requestHasAnyCapability(req, [
      CAPABILITIES.ORG_UNIT_THREAD_TAKEOVER,
      CAPABILITIES.THREAD_TAKEOVER_ALL,
    ], context);
  }

  return requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_CLOSE,
    CAPABILITIES.THREAD_TAKEOVER_ALL,
  ], context);
};

const resolveLifecycleSuccessResponse = (action: ConnectShyftLifecycleAction) => {
  if (action === 'claim') {
    return {
      code: 'CONNECTSHYFT_THREAD_CLAIMED',
      message: 'ConnectShyft claim action accepted',
    };
  }

  if (action === 'takeover') {
    return {
      code: 'CONNECTSHYFT_THREAD_TAKEOVER_READY',
      message: 'ConnectShyft takeover action accepted',
    };
  }

  return {
    code: 'CONNECTSHYFT_THREAD_CLOSED',
    message: 'ConnectShyft thread closed',
  };
};

export const resolveConnectShyftThreadLifecycleAccessContext = async (
  req: Request,
  res: Response,
  action: ConnectShyftLifecycleAction,
): Promise<ConnectShyftThreadLifecycleAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'escalation')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  if (!requestHasLifecycleActionCapability(req, action, contextDecision.context)) {
    sendLifecycleCapabilityRefusal(res, action);
    return null;
  }

  if (
    contextDecision.context.bypassedOrgUnitMembership
    && !requestHasAnyCapability(req, [CAPABILITIES.THREAD_TAKEOVER_ALL], contextDecision.context)
  ) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
      message: 'orgUnit membership is required for this ConnectShyft route',
      refusalType: 'business',
      httpStatus: 200,
    });
    return null;
  }

  const threadId = parseThreadIdParam(req);
  if (!threadId) {
    refusal(res, {
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return null;
  }

  const actorRoles = resolveConnectShyftActorRoles(req, contextDecision.context);
  const actorUserId = resolveConnectShyftRequestedActorUserId(req);
  const lifecycleContext = await resolveLifecycleContext({
    tenantId: contextDecision.context.tenantId,
    orgUnitId: contextDecision.context.orgUnitId,
    threadId,
    actorUserId,
  });

  if (!lifecycleContext.currentState) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      message: 'Thread not found for this tenant/orgUnit context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: contextDecision.context,
        threadId,
      },
    });
    return null;
  }

  const policyDecision = evaluateConnectShyftLifecyclePolicy({
    action,
    currentState: lifecycleContext.currentState,
    claimedByUserId: lifecycleContext.claimedByUserId,
    actorUserId,
    actorRoles,
  });
  if (!policyDecision.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: policyDecision.code,
      message: policyDecision.message,
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: contextDecision.context,
        threadId,
        priorState: lifecycleContext.currentState,
      },
    });
    return null;
  }

  return {
    action,
    context: contextDecision.context,
    threadId,
    actorUserId,
    actorRoles,
    reason: parseLifecycleReason(req),
    resolution: parseLifecycleResolution(req),
    lifecycleContext,
    nextState: policyDecision.nextState,
  };
};

export const executeConnectShyftThreadLifecycleAction = async (
  req: Request,
  res: Response,
  action: ConnectShyftLifecycleAction,
): Promise<void> => {
  const lifecycleRequest = await resolveConnectShyftThreadLifecycleAccessContext(req, res, action);
  if (!lifecycleRequest || !lifecycleRequest.lifecycleContext.currentState) {
    return;
  }

  const eventName = resolveLifecycleEventName(action);
  const metadata = buildLifecycleMetadata({
    tenantId: lifecycleRequest.context.tenantId,
    orgUnitId: lifecycleRequest.context.orgUnitId,
    actorUserId: lifecycleRequest.actorUserId,
    threadId: lifecycleRequest.threadId,
    priorState: lifecycleRequest.lifecycleContext.currentState,
    newState: lifecycleRequest.nextState,
    action,
    reason: lifecycleRequest.reason,
    resolution: lifecycleRequest.resolution,
  });
  const transitioned = await transitionThreadWithSideEffects({
    actorRoles: lifecycleRequest.actorRoles,
    tenantId: lifecycleRequest.context.tenantId,
    orgUnitId: lifecycleRequest.context.orgUnitId,
    threadId: lifecycleRequest.threadId,
    actorUserId: lifecycleRequest.actorUserId,
    currentState: lifecycleRequest.lifecycleContext.currentState,
    nextState: lifecycleRequest.nextState,
    syntheticThread: lifecycleRequest.lifecycleContext.syntheticThread,
    sideEffects: {
      eventName,
      metadata,
    },
  });

  if (!transitioned.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: transitioned.code,
      message: transitioned.message,
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: lifecycleRequest.context,
        threadId: lifecycleRequest.threadId,
      },
    });
    return;
  }

  const sideEffects = buildLifecycleSideEffects({
    eventName,
    metadata,
  });
  const notificationsCanceled = action === 'claim'
    ? await cancelPendingEscalationNotifications({
      tenantId: lifecycleRequest.context.tenantId,
      threadId: lifecycleRequest.threadId,
    })
    : 0;
  const responseContract = resolveLifecycleSuccessResponse(action);

  success(res, {
    code: responseContract.code,
    message: responseContract.message,
    data: {
      threadId: lifecycleRequest.threadId,
      context: lifecycleRequest.context,
      reason: lifecycleRequest.reason,
      resolution: lifecycleRequest.resolution,
      thread: buildLifecycleThreadResponse(transitioned.thread),
      lifecycleEvent: eventName,
      sideEffectsPersisted: transitioned.sideEffectsPersisted,
      escalation: action === 'claim'
        ? {
          resetReason: 'claimed' as const,
          notificationsCanceled,
        }
        : null,
      ...sideEffects,
    },
  });
};
