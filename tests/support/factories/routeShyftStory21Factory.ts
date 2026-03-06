import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type Story21CommitmentStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type Story21CreatePayload = {
  tenantId: string;
  orgUnitId: string;
  pickupRequestId: string;
  scheduledWindowStartUtc: string;
  scheduledWindowEndUtc: string;
  notes: string;
};

export type Story21TransitionPayload = {
  toStatus: Story21CommitmentStatus;
  reason: string;
  actorType: 'dispatcher' | 'system';
};

type Story21ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  commitmentId?: string;
};

type Story21HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

export type Story21Context = {
  storyId: '2-1';
  tenantId: string;
  orgUnitId: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  commitmentId: string;
  paths: {
    commitmentsCollection: string;
    commitmentsUi: string;
  };
  validTransition: {
    from: Story21CommitmentStatus;
    to: Story21CommitmentStatus;
  };
  invalidTransition: {
    from: Story21CommitmentStatus;
    to: Story21CommitmentStatus;
  };
  terminalStatus: Story21CommitmentStatus;
  requiredTestIds: string[];
};

export function createStory21Context(overrides: Story21ContextOverrides = {}): Story21Context {
  return {
    storyId: '2-1',
    tenantId: overrides.tenantId ?? 'tenant-routeshyft-alpha',
    orgUnitId: overrides.orgUnitId ?? 'org-routeshyft-alpha-dispatch',
    userId: overrides.userId ?? `user-routeshyft-21-${randomUUID().slice(0, 8)}`,
    correlationId: overrides.correlationId ?? `corr-routeshyft-21-${randomUUID().slice(0, 8)}`,
    csrfToken: overrides.csrfToken ?? `csrf-routeshyft-21-${randomUUID().slice(0, 8)}`,
    commitmentId: overrides.commitmentId ?? `commitment-${randomUUID().slice(0, 8)}`,
    paths: {
      commitmentsCollection: '/api/v1/route/commitments',
      commitmentsUi: '/app/route/commitments',
    },
    validTransition: {
      from: 'draft',
      to: 'scheduled',
    },
    invalidTransition: {
      from: 'draft',
      to: 'completed',
    },
    terminalStatus: 'completed',
    requiredTestIds: [
      'routeshyft-commitment-status-badge',
      'routeshyft-commitment-transition-select',
      'routeshyft-commitment-transition-submit',
      'routeshyft-commitment-refusal-banner',
      'routeshyft-commitment-refusal-code',
      'routeshyft-commitment-refusal-details',
    ],
  };
}

export function createStory21Headers(
  context: Story21Context,
  overrides: Story21HeaderOverrides = {},
): Record<string, string> {
  return createTenantScopeHeaders({
    tenantId: overrides.tenantId ?? context.tenantId,
    orgUnitId: overrides.orgUnitId === undefined ? context.orgUnitId : overrides.orgUnitId,
    role: overrides.role ?? 'DISPATCHER',
    userId: overrides.userId ?? context.userId,
    correlationId: overrides.correlationId ?? context.correlationId,
    csrfToken: overrides.csrfToken ?? context.csrfToken,
  });
}

export function createStory21CreatePayload(context: Story21Context): Story21CreatePayload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    pickupRequestId: `pickup-${randomUUID().slice(0, 8)}`,
    scheduledWindowStartUtc: '2026-02-25T14:00:00.000Z',
    scheduledWindowEndUtc: '2026-02-25T16:00:00.000Z',
    notes: 'ATDD story 2.1 commitment creation payload',
  };
}

export function createStory21ValidTransitionPayload(): Story21TransitionPayload {
  return {
    toStatus: 'scheduled',
    reason: 'Dispatcher confirmed assignment',
    actorType: 'dispatcher',
  };
}

export function createStory21InvalidTransitionPayload(): Story21TransitionPayload {
  return {
    toStatus: 'completed',
    reason: 'Attempt to skip required lifecycle steps',
    actorType: 'dispatcher',
  };
}

export function createStory21TerminalTransitionPayload(): Story21TransitionPayload {
  return {
    toStatus: 'cancelled',
    reason: 'Attempt to mutate terminal commitment',
    actorType: 'dispatcher',
  };
}
