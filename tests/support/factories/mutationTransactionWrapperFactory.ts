import { randomUUID } from 'node:crypto';

type MutationWrapperHeaderOverrides = {
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type AtomicMutationProbeOverrides = {
  aggregateType?: string;
  aggregateId?: string;
  eventType?: string;
};

type MissingWriteProbeOverrides = {
  missingWrite?: 'event' | 'outbox' | 'both';
  aggregateType?: string;
  aggregateId?: string;
  refusalCode?: string;
  refusalMessage?: string;
};

export function createMutationWrapperHeaders(
  overrides: MutationWrapperHeaderOverrides = {},
): Record<string, string> {
  return {
    'x-tenant-id': overrides.tenantId ?? `tenant-${randomUUID()}`,
    'x-correlation-id': overrides.correlationId ?? `corr-${randomUUID()}`,
    'x-csrf-token': overrides.csrfToken ?? `csrf-${randomUUID()}`,
  };
}

export function createAtomicMutationProbe(
  overrides: AtomicMutationProbeOverrides = {},
) {
  const aggregateType = overrides.aggregateType ?? 'ledger_entry';
  const aggregateId = overrides.aggregateId ?? `agg-${randomUUID()}`;
  const eventType = overrides.eventType ?? 'ledger.entry.created';

  return {
    payload: {
      action: 'platform-mutation-transaction-wrapper-atomic-probe',
      aggregateType,
      aggregateId,
      domainWrite: {
        operation: 'insert',
        path: 'platform.ledger_entries',
      },
      eventWrite: {
        eventType,
        eventVersion: 1,
      },
      outboxWrite: {
        destination: 'platform-events',
      },
    },
    expected: {
      code: 'MUTATION_TRANSACTION_WRAPPER_ATOMIC',
      eventOutboxRequired: true,
      missingWrites: [] as string[],
    },
  };
}

export function createMissingWriteProbe(
  overrides: MissingWriteProbeOverrides = {},
) {
  const missingWrite = overrides.missingWrite ?? 'event';
  const aggregateType = overrides.aggregateType ?? 'ledger_entry';
  const aggregateId = overrides.aggregateId ?? `agg-${randomUUID()}`;
  const refusalCode =
    overrides.refusalCode ?? 'MUTATION_EVENT_OUTBOX_WRITE_REQUIRED';
  const refusalMessage =
    overrides.refusalMessage ??
    'Mutation transaction wrapper requires both event and outbox writes';

  const payload = {
    action: 'platform-mutation-transaction-wrapper-missing-write-probe',
    aggregateType,
    aggregateId,
    domainWrite: {
      operation: 'insert',
      path: 'platform.ledger_entries',
    },
    eventWrite:
      missingWrite === 'event' || missingWrite === 'both'
        ? null
        : {
            eventType: 'ledger.entry.created',
            eventVersion: 1,
          },
    outboxWrite:
      missingWrite === 'outbox' || missingWrite === 'both'
        ? null
        : {
            destination: 'platform-events',
          },
  };

  return {
    payload,
    expected: {
      code: refusalCode,
      message: refusalMessage,
      refusalType: 'business' as const,
      missingWrites:
        missingWrite === 'both' ? (['event', 'outbox'] as const) : [missingWrite],
    },
  };
}
