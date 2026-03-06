import { randomUUID } from 'node:crypto';

type KernelRequestOverrides = {
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
};

export function createKernelRequest(overrides: KernelRequestOverrides = {}) {
  const tenantId = overrides.tenantId ?? `tenant-${randomUUID()}`;
  const correlationId = overrides.correlationId ?? randomUUID();
  const csrfToken = overrides.csrfToken ?? `csrf-${randomUUID()}`;

  return {
    tenantId,
    correlationId,
    csrfToken,
    headers: {
      'x-tenant-id': tenantId,
      'x-correlation-id': correlationId,
      'x-csrf-token': csrfToken,
    },
  };
}
