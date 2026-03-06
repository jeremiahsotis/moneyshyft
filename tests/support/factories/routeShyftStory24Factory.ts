import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type Story24Payload = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  channel: string;
  notes: string;
  forceRefusal: boolean;
};

type Story24ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  requestId?: string;
};

type Story24HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

export type Story24Context = {
  storyId: '2-4';
  tenantId: string;
  orgUnitId: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  requestId: string;
  commitmentId: string;
  paths: {
    resourceCollection: string;
    ui: string;
  };
  successCode: string;
  refusalCode: string;
  linkageCode: string;
  statusLabel: string;
  requiredTestIds: readonly string[];
};

export function createStory24Context(overrides: Story24ContextOverrides = {}): Story24Context {
  return {
    storyId: '2-4',
    tenantId: overrides.tenantId ?? 'tenant-routeshyft-alpha',
    orgUnitId: overrides.orgUnitId ?? 'org-routeshyft-alpha-ops',
    userId: overrides.userId ?? randomUUID(),
    correlationId: overrides.correlationId ?? 'corr-routeshyft-24-' + randomUUID().slice(0, 8),
    csrfToken: overrides.csrfToken ?? 'csrf-routeshyft-24-' + randomUUID().slice(0, 8),
    requestId: overrides.requestId ?? randomUUID(),
    commitmentId: randomUUID(),
    paths: {
      resourceCollection: '/api/v1/route/intake/requests',
      ui: '/app/route/requests',
    },
    successCode: 'ROUTESHYFT_DONOR_INTAKE_ACCEPTED',
    refusalCode: 'ROUTESHYFT_DONOR_INTAKE_REFUSED',
    linkageCode: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
    statusLabel: 'Accepted',
    requiredTestIds: [
      'routeshyft-request-finalize-submit',
      'routeshyft-request-terminal-status',
      'routeshyft-request-refusal-banner',
      'routeshyft-request-refusal-code',
      'routeshyft-request-reconciliation-actions',
      'routeshyft-request-lifecycle-details',
    ],
  };
}

export function createStory24Headers(
  context: Story24Context,
  overrides: Story24HeaderOverrides = {},
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

export function createStory24HappyPayload(context: Story24Context): Story24Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
    channel: '2-4-request-to-commitment-linkage-and-terminal-enforcement',
    notes: 'ATDD 2-4 happy path payload',
    forceRefusal: false,
  };
}

export function createStory24RefusalPayload(context: Story24Context): Story24Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
    channel: '2-4-request-to-commitment-linkage-and-terminal-enforcement',
    notes: 'ATDD 2-4 refusal path payload',
    forceRefusal: true,
  };
}
