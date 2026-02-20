import { randomUUID } from 'node:crypto';

type Story14HeaderOverrides = {
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type Story14SuccessProbeOverrides = {
  operationName?: string;
};

type Story14BusinessRefusalProbeOverrides = {
  requestedAmountCents?: number;
  availableAmountCents?: number;
  code?: string;
  message?: string;
  ruleName?: string;
};

type Story14SystemErrorProbeOverrides = {
  code?: string;
  message?: string;
  operationName?: string;
};

export function createStory14SharedEnvelopeHeaders(
  overrides: Story14HeaderOverrides = {},
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

export function createStory14SuccessProbe(
  overrides: Story14SuccessProbeOverrides = {},
) {
  const operationName = overrides.operationName ?? 'story-1-4-success-matrix';

  return {
    payload: {
      action: 'story-1-4-shared-envelope-success',
      operationName,
      requestId: `req-${randomUUID()}`,
    },
    expected: {
      code: 'ENVELOPE_CONTRACT_OK',
      message: 'Shared response envelope emitted success contract',
    },
  };
}

export function createStory14BusinessRefusalProbe(
  overrides: Story14BusinessRefusalProbeOverrides = {},
) {
  const requestedAmountCents = overrides.requestedAmountCents ?? 25_000;
  const availableAmountCents = overrides.availableAmountCents ?? 8_000;
  const code = overrides.code ?? 'ENVELOPE_BUSINESS_REFUSAL';
  const message =
    overrides.message ??
    'Requested amount exceeds available envelope balance';
  const ruleName =
    overrides.ruleName ?? 'available-funds-must-cover-request';

  return {
    payload: {
      action: 'story-1-4-shared-envelope-business-refusal',
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

export function createStory14SystemErrorProbe(
  overrides: Story14SystemErrorProbeOverrides = {},
) {
  const code = overrides.code ?? 'ENVELOPE_SYSTEM_ERROR';
  const message =
    overrides.message ??
    'Shared response envelope emitted system error contract';
  const operationName =
    overrides.operationName ?? 'story-1-4-system-error-matrix';

  return {
    payload: {
      action: 'story-1-4-shared-envelope-system-error',
      operationName,
      requestId: `req-${randomUUID()}`,
    },
    expected: {
      code,
      message,
    },
  };
}
