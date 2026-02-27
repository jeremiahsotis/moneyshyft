import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type Story25Payload = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  channel: string;
  notes: string;
  forceRefusal: boolean;
};

type Story25ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  requestId?: string;
};

type Story25HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

export type Story25Context = {
  storyId: '2-5';
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

export function createStory25Context(overrides: Story25ContextOverrides = {}): Story25Context {
  return {
    storyId: '2-5',
    tenantId: overrides.tenantId ?? 'tenant-routeshyft-alpha',
    orgUnitId: overrides.orgUnitId ?? 'org-routeshyft-alpha-ops',
    userId: overrides.userId ?? 'user-routeshyft-25-' + randomUUID().slice(0, 8),
    correlationId: overrides.correlationId ?? 'corr-routeshyft-25-' + randomUUID().slice(0, 8),
    csrfToken: overrides.csrfToken ?? 'csrf-routeshyft-25-' + randomUUID().slice(0, 8),
    requestId: overrides.requestId ?? 'request-' + randomUUID().slice(0, 8),
    commitmentId: 'commitment-' + randomUUID().slice(0, 8),
    paths: {
      resourceCollection: '/api/v1/route/refusals',
      ui: '/app/route/refusals',
    },
    successCode: 'ROUTESHYFT_REFUSAL_RECORDED',
    refusalCode: 'ROUTESHYFT_REFUSAL_REASON_INVALID',
    linkageCode: 'ROUTESHYFT_REFUSAL_HISTORY_UPDATED',
    statusLabel: 'Refused',
    requiredTestIds: [
      'routeshyft-refusal-submit',
      'routeshyft-refusal-outcome-banner',
      'routeshyft-refusal-code',
      'routeshyft-refusal-alternatives-list',
      'routeshyft-refusal-next-steps',
      'routeshyft-refusal-audit-history',
    ],
  };
}

export function createStory25Headers(
  context: Story25Context,
  overrides: Story25HeaderOverrides = {},
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

export function createStory25HappyPayload(context: Story25Context): Story25Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
    channel: '2-5-refusal-outcomes-with-structured-alternatives',
    notes: 'ATDD 2-5 happy path payload',
    forceRefusal: false,
  };
}

export function createStory25RefusalPayload(context: Story25Context): Story25Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
    channel: '2-5-refusal-outcomes-with-structured-alternatives',
    notes: 'ATDD 2-5 refusal path payload',
    forceRefusal: true,
  };
}
