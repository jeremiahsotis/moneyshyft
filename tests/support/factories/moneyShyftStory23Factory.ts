import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type Story23Payload = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  channel: string;
  notes: string;
  forceRefusal: boolean;
};

type Story23ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  requestId?: string;
};

type Story23HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

export type Story23Context = {
  storyId: '2-3';
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

export function createStory23Context(overrides: Story23ContextOverrides = {}): Story23Context {
  return {
    storyId: '2-3',
    tenantId: overrides.tenantId ?? 'tenant-moneyshyft-alpha',
    orgUnitId: overrides.orgUnitId ?? 'org-moneyshyft-alpha-ops',
    userId: overrides.userId ?? 'user-moneyshyft-23-' + randomUUID().slice(0, 8),
    correlationId: overrides.correlationId ?? 'corr-moneyshyft-23-' + randomUUID().slice(0, 8),
    csrfToken: overrides.csrfToken ?? 'csrf-moneyshyft-23-' + randomUUID().slice(0, 8),
    requestId: overrides.requestId ?? 'request-' + randomUUID().slice(0, 8),
    commitmentId: 'commitment-' + randomUUID().slice(0, 8),
    paths: {
      resourceCollection: '/api/v1/route/intake/cashier-requests',
      ui: '/app/route/intake/cashier',
    },
    successCode: 'MONEYSHYFT_CASHIER_INTAKE_ACCEPTED',
    refusalCode: 'MONEYSHYFT_CASHIER_INTAKE_REFUSED',
    linkageCode: 'MONEYSHYFT_CASHIER_INTAKE_COMMITMENT_LINKED',
    statusLabel: 'Accepted',
    requiredTestIds: [
      'moneyshyft-cashier-intake-submit',
      'moneyshyft-cashier-intake-outcome',
      'moneyshyft-cashier-intake-refusal-banner',
      'moneyshyft-cashier-intake-refusal-code',
      'moneyshyft-cashier-intake-next-steps',
      'moneyshyft-cashier-intake-alternatives',
    ],
  };
}

export function createStory23Headers(
  context: Story23Context,
  overrides: Story23HeaderOverrides = {},
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

export function createStory23HappyPayload(context: Story23Context): Story23Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
    channel: '2-3-cashier-assisted-intake-and-voucher-delivery-scheduling',
    notes: 'ATDD 2-3 happy path payload',
    forceRefusal: false,
  };
}

export function createStory23RefusalPayload(context: Story23Context): Story23Payload {
  return {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
    channel: '2-3-cashier-assisted-intake-and-voucher-delivery-scheduling',
    notes: 'ATDD 2-3 refusal path payload',
    forceRefusal: true,
  };
}
