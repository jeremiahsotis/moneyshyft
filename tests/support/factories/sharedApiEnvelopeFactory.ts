import { randomUUID } from 'node:crypto';

type SharedEnvelopeHeaderOverrides = {
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type SuccessProbeOverrides = {
  operationName?: string;
};

type BusinessRefusalProbeOverrides = {
  requestedAmountCents?: number;
  availableAmountCents?: number;
  ruleName?: string;
  code?: string;
  message?: string;
};

export function createSharedEnvelopeHeaders(
  overrides: SharedEnvelopeHeaderOverrides = {},
): Record<string, string> {
  const tenantId = overrides.tenantId ?? `tenant-${randomUUID()}`;
  const correlationId = overrides.correlationId ?? `corr-${randomUUID()}`;
  const csrfToken = overrides.csrfToken ?? `csrf-${randomUUID()}`;

  return {
    'x-tenant-id': tenantId,
    'x-correlation-id': correlationId,
    'x-csrf-token': csrfToken,
  };
}

export function createSharedEnvelopeSuccessProbe(
  overrides: SuccessProbeOverrides = {},
) {
  const operationName = overrides.operationName ?? 'contract-health-check';

  return {
    payload: {
      action: 'platform-envelope-success-probe',
      operationName,
      requestId: `req-${randomUUID()}`,
    },
    expected: {
      code: 'ENVELOPE_CONTRACT_OK',
      message: 'Shared envelope helper returned success contract',
    },
  };
}

export function createBusinessRefusalProbe(
  overrides: BusinessRefusalProbeOverrides = {},
) {
  const requestedAmountCents = overrides.requestedAmountCents ?? 15_000;
  const availableAmountCents = overrides.availableAmountCents ?? 5_000;
  const ruleName = overrides.ruleName ?? 'available-funds-must-cover-request';
  const code = overrides.code ?? 'ENVELOPE_BUSINESS_REFUSAL';
  const message =
    overrides.message ??
    'Requested amount exceeds available envelope balance';

  return {
    payload: {
      action: 'platform-envelope-business-refusal-probe',
      requestedAmountCents,
      availableAmountCents,
      ruleName,
    },
    expected: {
      code,
      message,
      refusalType: 'business' as const,
    },
  };
}
