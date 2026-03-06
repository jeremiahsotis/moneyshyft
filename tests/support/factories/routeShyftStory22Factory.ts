import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type Story22Payload = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  channel: string;
  notes: string;
  forceRefusal: boolean;
  itemCount?: number;
  itemSummary?: string;
};

type Story22ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  requestId?: string;
};

type Story22HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

export type Story22Context = {
  storyId: '2-2';
  tenantId: string;
  orgUnitId: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  requestId: string;
  commitmentId: string;
  paths: {
    resourceCollection: string;
    detail: (requestId: string) => string;
    ui: string;
  };
  successCode: string;
  refusalCode: string;
  linkageCode: string;
  statusLabel: string;
  requiredTestIds: readonly string[];
};

export function createStory22Context(overrides: Story22ContextOverrides = {}): Story22Context {
  return {
    storyId: '2-2',
    tenantId: overrides.tenantId ?? 'tenant-routeshyft-alpha',
    orgUnitId: overrides.orgUnitId ?? 'org-routeshyft-alpha-ops',
    userId: overrides.userId ?? 'user-routeshyft-22-' + randomUUID().slice(0, 8),
    correlationId: overrides.correlationId ?? 'corr-routeshyft-22-' + randomUUID().slice(0, 8),
    csrfToken: overrides.csrfToken ?? 'csrf-routeshyft-22-' + randomUUID().slice(0, 8),
    requestId: overrides.requestId ?? 'request-' + randomUUID().slice(0, 8),
    commitmentId: 'commitment-' + randomUUID().slice(0, 8),
    paths: {
      resourceCollection: '/api/v1/route/intake/donor-requests',
      detail: (requestId: string) => '/api/v1/route/intake/donor-requests/' + requestId,
      ui: '/app/route/intake/donor',
    },
    successCode: 'ROUTESHYFT_DONOR_INTAKE_SLOTS_AVAILABLE',
    refusalCode: 'ROUTESHYFT_DONOR_INTAKE_REFUSED_CAPACITY',
    linkageCode: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
    statusLabel: 'Schedulable',
    requiredTestIds: [
      'routeshyft-donor-intake-submit',
      'routeshyft-donor-intake-slot-list',
      'routeshyft-donor-intake-refusal-banner',
      'routeshyft-donor-intake-refusal-code',
      'routeshyft-donor-intake-next-steps',
      'routeshyft-donor-intake-alternatives',
    ],
  };
}

export function createStory22Headers(
  context: Story22Context,
  overrides: Story22HeaderOverrides = {},
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

export function createStory22HappyPayload(context: Story22Context): Story22Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
    channel: '2-2-donor-self-service-pickup-intake-with-capacity-check',
    notes: 'ATDD 2-2 happy path payload',
    forceRefusal: false,
    itemCount: 2,
    itemSummary: 'Sofa and coffee table',
  };
}

export function createStory22RefusalPayload(context: Story22Context): Story22Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
    channel: '2-2-donor-self-service-pickup-intake-with-capacity-check',
    notes: 'ATDD 2-2 refusal path payload',
    forceRefusal: true,
    itemCount: 4,
    itemSummary: 'Large sectional and bulky items',
  };
}

export function createStory22InvalidPayloadMissingRequired(context: Story22Context): Story22Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '',
    requestedWindowStartUtc: '',
    requestedWindowEndUtc: '',
    channel: '2-2-donor-self-service-pickup-intake-with-capacity-check',
    notes: '',
    forceRefusal: false,
    itemCount: 0,
    itemSummary: '',
  };
}
