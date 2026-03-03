import { createHash, randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import type {
  RouteRefusalReasonCode,
  RouteRefusalStage,
  RouteStructuredAlternative,
} from '../domain/refusal';

export type RouteRefusalScope = 'request' | 'commitment';

export type RouteRefusalOutcome = {
  refusalId: string;
  tenantId: string;
  scope: RouteRefusalScope;
  scopeId: string;
  stage: RouteRefusalStage;
  reasonCode: RouteRefusalReasonCode;
  reasonMessage: string;
  alternatives: RouteStructuredAlternative[];
  requestId: string | null;
  commitmentId: string | null;
  actorUserId: string | null;
  createdAtUtc: string;
};

export type RouteLifecycleHistoryEvent = {
  eventId: string;
  tenantId: string;
  scope: RouteRefusalScope;
  scopeId: string;
  eventType: 'ROUTE_REFUSAL_RECORDED' | 'ROUTE_COMMITMENT_REFUSAL_LINKED';
  refusalId: string;
  stage: RouteRefusalStage;
  reasonCode: RouteRefusalReasonCode;
  reasonMessage: string;
  alternatives: RouteStructuredAlternative[];
  requestId: string | null;
  commitmentId: string | null;
  actorUserId: string | null;
  occurredAtUtc: string;
};

export type PersistRouteRefusalCommand = {
  tenantId: string;
  scope: RouteRefusalScope;
  scopeId: string;
  stage: RouteRefusalStage;
  reasonCode: RouteRefusalReasonCode;
  reasonMessage: string;
  alternatives: RouteStructuredAlternative[];
  actorUserId: string | null;
  requestId: string | null;
  commitmentId: string | null;
  idempotencyKey: string | null;
};

export type PersistRouteRefusalResult = {
  outcome: RouteRefusalOutcome;
  replayed: boolean;
};

export interface RouteRefusalStore {
  persistRefusal(command: PersistRouteRefusalCommand): Promise<PersistRouteRefusalResult>;
  listHistory(tenantId: string, scope: RouteRefusalScope, scopeId: string): Promise<RouteLifecycleHistoryEvent[]>;
}

export class RouteIdempotencyKeyConflictError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super('Idempotency key was reused with a different refusal payload');
    this.name = 'RouteIdempotencyKeyConflictError';
  }
}

const nowUtc = (): string => new Date().toISOString();

const buildScopeKey = (tenantId: string, scope: RouteRefusalScope, scopeId: string): string =>
  `${tenantId}::${scope}::${scopeId}`;

const buildIdempotencyLookupKey = (
  tenantId: string,
  scope: RouteRefusalScope,
  scopeId: string,
  idempotencyKey: string,
): string => `${tenantId}::${scope}::${scopeId}::${idempotencyKey}`;

const buildFingerprint = (command: PersistRouteRefusalCommand): string => {
  const payload = JSON.stringify({
    stage: command.stage,
    reasonCode: command.reasonCode,
    reasonMessage: command.reasonMessage,
    alternatives: command.alternatives,
    requestId: command.requestId,
    commitmentId: command.commitmentId,
  });
  return createHash('sha256').update(payload).digest('hex');
};

const buildFingerprintLookupKey = (
  tenantId: string,
  scope: RouteRefusalScope,
  scopeId: string,
  fingerprint: string,
): string => `${tenantId}::${scope}::${scopeId}::${fingerprint}`;

const parseAlternatives = (value: unknown): RouteStructuredAlternative[] => {
  if (Array.isArray(value)) {
    return value as RouteStructuredAlternative[];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as RouteStructuredAlternative[];
      }
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const toIsoUtc = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return nowUtc();
};

const ROUTE_SCHEMA = 'route';
const REFUSAL_OUTCOMES_TABLE = 'refusal_outcomes';
const REFUSAL_EVENTS_TABLE = 'refusal_lifecycle_events';
const REFUSAL_OUTBOX_TABLE = 'refusal_outbox_events';
const REFUSAL_IDEMPOTENCY_TABLE = 'refusal_idempotency_keys';

type RefusalOutcomeRow = {
  id: string;
  tenant_id: string;
  scope: RouteRefusalScope;
  scope_id: string;
  stage: RouteRefusalStage;
  reason_code: RouteRefusalReasonCode;
  reason_message: string;
  alternatives: unknown;
  request_id: string | null;
  commitment_id: string | null;
  actor_user_id: string | null;
  created_at_utc: unknown;
};

type RefusalEventRow = {
  id: string;
  tenant_id: string;
  scope: RouteRefusalScope;
  scope_id: string;
  event_type: 'ROUTE_REFUSAL_RECORDED' | 'ROUTE_COMMITMENT_REFUSAL_LINKED';
  refusal_outcome_id: string;
  stage: RouteRefusalStage;
  reason_code: RouteRefusalReasonCode;
  reason_message: string;
  alternatives: unknown;
  request_id: string | null;
  commitment_id: string | null;
  actor_user_id: string | null;
  occurred_at_utc: unknown;
};

type RefusalIdempotencyRow = {
  refusal_outcome_id: string;
  request_fingerprint: string;
};

const mapOutcomeRow = (row: RefusalOutcomeRow): RouteRefusalOutcome => ({
  refusalId: row.id,
  tenantId: row.tenant_id,
  scope: row.scope,
  scopeId: row.scope_id,
  stage: row.stage,
  reasonCode: row.reason_code,
  reasonMessage: row.reason_message,
  alternatives: parseAlternatives(row.alternatives),
  requestId: row.request_id,
  commitmentId: row.commitment_id,
  actorUserId: row.actor_user_id,
  createdAtUtc: toIsoUtc(row.created_at_utc),
});

const mapEventRow = (row: RefusalEventRow): RouteLifecycleHistoryEvent => ({
  eventId: row.id,
  tenantId: row.tenant_id,
  scope: row.scope,
  scopeId: row.scope_id,
  eventType: row.event_type,
  refusalId: row.refusal_outcome_id,
  stage: row.stage,
  reasonCode: row.reason_code,
  reasonMessage: row.reason_message,
  alternatives: parseAlternatives(row.alternatives),
  requestId: row.request_id,
  commitmentId: row.commitment_id,
  actorUserId: row.actor_user_id,
  occurredAtUtc: toIsoUtc(row.occurred_at_utc),
});

const loadPlatformDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

export class KnexRouteRefusalStore implements RouteRefusalStore {
  constructor(private readonly resolveDb: () => Knex = loadPlatformDb) {}

  async persistRefusal(command: PersistRouteRefusalCommand): Promise<PersistRouteRefusalResult> {
    const db = this.resolveDb();
    const fingerprint = buildFingerprint(command);
    const occurredAtUtc = nowUtc();

    return db.transaction(async (trx) => {
      let outcomeRow = await this.findOutcomeByFingerprint(trx, command, fingerprint);
      let replayed = Boolean(outcomeRow);

      if (!outcomeRow) {
        const inserted = await this.insertOutcomeOrLoadExisting(trx, command, fingerprint, occurredAtUtc);
        outcomeRow = inserted.row;
        replayed = inserted.replayed;
      }

      if (command.idempotencyKey) {
        const linkedOutcomeId = await this.linkOrValidateIdempotencyKey(
          trx,
          command,
          fingerprint,
          outcomeRow.id,
          occurredAtUtc,
        );
        if (linkedOutcomeId !== outcomeRow.id) {
          const linkedOutcome = await this.findOutcomeById(trx, linkedOutcomeId);
          if (!linkedOutcome) {
            throw new Error('Route refusal persistence corrupted: linked idempotency outcome not found');
          }
          outcomeRow = linkedOutcome;
          replayed = true;
        }
      }

      if (!replayed) {
        await this.appendDurableHistoryAndOutbox(trx, command, outcomeRow, occurredAtUtc);
      }

      return {
        outcome: mapOutcomeRow(outcomeRow),
        replayed,
      };
    });
  }

  async listHistory(
    tenantId: string,
    scope: RouteRefusalScope,
    scopeId: string,
  ): Promise<RouteLifecycleHistoryEvent[]> {
    const db = this.resolveDb();
    const rows = await db
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_EVENTS_TABLE)
      .where({
        tenant_id: tenantId,
        scope,
        scope_id: scopeId,
      })
      .orderBy('occurred_at_utc', 'asc')
      .orderBy('id', 'asc') as RefusalEventRow[];

    return rows.map(mapEventRow);
  }

  private async findOutcomeById(
    trx: Knex.Transaction,
    refusalId: string,
  ): Promise<RefusalOutcomeRow | null> {
    const row = await trx
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_OUTCOMES_TABLE)
      .where({ id: refusalId })
      .first() as RefusalOutcomeRow | undefined;
    return row || null;
  }

  private async findOutcomeByFingerprint(
    trx: Knex.Transaction,
    command: PersistRouteRefusalCommand,
    fingerprint: string,
  ): Promise<RefusalOutcomeRow | null> {
    const row = await trx
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_OUTCOMES_TABLE)
      .where({
        tenant_id: command.tenantId,
        scope: command.scope,
        scope_id: command.scopeId,
        fingerprint,
      })
      .first() as RefusalOutcomeRow | undefined;
    return row || null;
  }

  private async insertOutcomeOrLoadExisting(
    trx: Knex.Transaction,
    command: PersistRouteRefusalCommand,
    fingerprint: string,
    occurredAtUtc: string,
  ): Promise<{ row: RefusalOutcomeRow; replayed: boolean }> {
    const id = randomUUID();
    const inserted = await trx
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_OUTCOMES_TABLE)
      .insert({
        id,
        tenant_id: command.tenantId,
        scope: command.scope,
        scope_id: command.scopeId,
        stage: command.stage,
        reason_code: command.reasonCode,
        reason_message: command.reasonMessage,
        alternatives: JSON.stringify(command.alternatives),
        request_id: command.requestId,
        commitment_id: command.commitmentId,
        actor_user_id: command.actorUserId,
        fingerprint,
        created_at_utc: occurredAtUtc,
      })
      .onConflict(['tenant_id', 'scope', 'scope_id', 'fingerprint'])
      .ignore()
      .returning('*') as RefusalOutcomeRow[];

    if (inserted.length > 0) {
      return {
        row: inserted[0],
        replayed: false,
      };
    }

    const existing = await this.findOutcomeByFingerprint(trx, command, fingerprint);
    if (!existing) {
      throw new Error('Route refusal persistence failed: fingerprint conflict without existing outcome');
    }

    return {
      row: existing,
      replayed: true,
    };
  }

  private async linkOrValidateIdempotencyKey(
    trx: Knex.Transaction,
    command: PersistRouteRefusalCommand,
    fingerprint: string,
    refusalOutcomeId: string,
    occurredAtUtc: string,
  ): Promise<string> {
    const idempotencyKey = command.idempotencyKey;
    if (!idempotencyKey) {
      return refusalOutcomeId;
    }

    const lookupWhere = {
      tenant_id: command.tenantId,
      scope: command.scope,
      scope_id: command.scopeId,
      idempotency_key: idempotencyKey,
    };

    const inserted = await trx
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_IDEMPOTENCY_TABLE)
      .insert({
        id: randomUUID(),
        ...lookupWhere,
        request_fingerprint: fingerprint,
        refusal_outcome_id: refusalOutcomeId,
        created_at_utc: occurredAtUtc,
      })
      .onConflict(['tenant_id', 'scope', 'scope_id', 'idempotency_key'])
      .ignore()
      .returning(['refusal_outcome_id', 'request_fingerprint']) as RefusalIdempotencyRow[];

    if (inserted.length > 0) {
      return refusalOutcomeId;
    }

    const existing = await trx
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_IDEMPOTENCY_TABLE)
      .select(['refusal_outcome_id', 'request_fingerprint'])
      .where(lookupWhere)
      .first() as RefusalIdempotencyRow | undefined;

    if (!existing) {
      throw new Error('Route refusal idempotency lookup failed after uniqueness conflict');
    }

    if (existing.request_fingerprint !== fingerprint) {
      throw new RouteIdempotencyKeyConflictError(idempotencyKey);
    }

    return existing.refusal_outcome_id;
  }

  private async appendDurableHistoryAndOutbox(
    trx: Knex.Transaction,
    command: PersistRouteRefusalCommand,
    outcome: RefusalOutcomeRow,
    occurredAtUtc: string,
  ): Promise<void> {
    await this.insertEventWithOutbox(trx, {
      tenantId: command.tenantId,
      scope: command.scope,
      scopeId: command.scopeId,
      eventType: 'ROUTE_REFUSAL_RECORDED',
      eventName: 'route.refusal.recorded',
      outcome,
      occurredAtUtc,
    });

    if (command.scope === 'commitment' && command.requestId) {
      await this.insertEventWithOutbox(trx, {
        tenantId: command.tenantId,
        scope: 'request',
        scopeId: command.requestId,
        eventType: 'ROUTE_COMMITMENT_REFUSAL_LINKED',
        eventName: 'route.refusal.commitment_linked',
        outcome,
        occurredAtUtc,
      });
    }
  }

  private async insertEventWithOutbox(
    trx: Knex.Transaction,
    params: {
      tenantId: string;
      scope: RouteRefusalScope;
      scopeId: string;
      eventType: 'ROUTE_REFUSAL_RECORDED' | 'ROUTE_COMMITMENT_REFUSAL_LINKED';
      eventName: 'route.refusal.recorded' | 'route.refusal.commitment_linked';
      outcome: RefusalOutcomeRow;
      occurredAtUtc: string;
    },
  ): Promise<void> {
    // JSONB columns in Postgres expect valid JSON, not driver-level array literals.
    const normalizedAlternatives = parseAlternatives(params.outcome.alternatives);
    const eventId = randomUUID();
    await trx
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_EVENTS_TABLE)
      .insert({
        id: eventId,
        tenant_id: params.tenantId,
        scope: params.scope,
        scope_id: params.scopeId,
        event_type: params.eventType,
        refusal_outcome_id: params.outcome.id,
        stage: params.outcome.stage,
        reason_code: params.outcome.reason_code,
        reason_message: params.outcome.reason_message,
        alternatives: JSON.stringify(normalizedAlternatives),
        request_id: params.outcome.request_id,
        commitment_id: params.outcome.commitment_id,
        actor_user_id: params.outcome.actor_user_id,
        occurred_at_utc: params.occurredAtUtc,
      });

    await trx
      .withSchema(ROUTE_SCHEMA)
      .table(REFUSAL_OUTBOX_TABLE)
      .insert({
        id: randomUUID(),
        event_id: eventId,
        tenant_id: params.tenantId,
        event_name: params.eventName,
        entity_type: params.scope === 'request' ? 'route_request' : 'route_commitment',
        entity_id: params.scopeId,
        occurred_at_utc: params.occurredAtUtc,
        payload: JSON.stringify({
          eventType: params.eventType,
          refusalId: params.outcome.id,
          scope: params.scope,
          scopeId: params.scopeId,
          stage: params.outcome.stage,
          reasonCode: params.outcome.reason_code,
          reasonMessage: params.outcome.reason_message,
          alternatives: normalizedAlternatives,
          requestId: params.outcome.request_id,
          commitmentId: params.outcome.commitment_id,
          actorUserId: params.outcome.actor_user_id,
        }),
        delivery_status: 'pending',
        delivery_attempts: 0,
        available_at_utc: params.occurredAtUtc,
      });
  }
}

export class InMemoryRouteRefusalStore implements RouteRefusalStore {
  private refusalById = new Map<string, RouteRefusalOutcome>();

  private historyByScope = new Map<string, RouteLifecycleHistoryEvent[]>();

  private refusalIdByIdempotencyKey = new Map<string, { refusalId: string; fingerprint: string }>();

  private refusalIdByFingerprint = new Map<string, string>();

  async persistRefusal(command: PersistRouteRefusalCommand): Promise<PersistRouteRefusalResult> {
    const fingerprint = buildFingerprint(command);

    if (command.idempotencyKey) {
      const idempotencyLookupKey = buildIdempotencyLookupKey(
        command.tenantId,
        command.scope,
        command.scopeId,
        command.idempotencyKey,
      );
      const existingByIdempotencyKey = this.refusalIdByIdempotencyKey.get(idempotencyLookupKey);
      if (existingByIdempotencyKey) {
        if (existingByIdempotencyKey.fingerprint !== fingerprint) {
          throw new RouteIdempotencyKeyConflictError(command.idempotencyKey);
        }
        const existingOutcome = this.refusalById.get(existingByIdempotencyKey.refusalId);
        if (existingOutcome) {
          return {
            outcome: existingOutcome,
            replayed: true,
          };
        }
      }
    }

    const fingerprintLookupKey = buildFingerprintLookupKey(
      command.tenantId,
      command.scope,
      command.scopeId,
      fingerprint,
    );
    const fingerprintRefusalId = this.refusalIdByFingerprint.get(fingerprintLookupKey);
    if (fingerprintRefusalId) {
      const existingOutcome = this.refusalById.get(fingerprintRefusalId);
      if (existingOutcome) {
        if (command.idempotencyKey) {
          const idempotencyLookupKey = buildIdempotencyLookupKey(
            command.tenantId,
            command.scope,
            command.scopeId,
            command.idempotencyKey,
          );
          this.refusalIdByIdempotencyKey.set(idempotencyLookupKey, {
            refusalId: existingOutcome.refusalId,
            fingerprint,
          });
        }

        return {
          outcome: existingOutcome,
          replayed: true,
        };
      }
    }

    const createdAtUtc = nowUtc();
    const outcome: RouteRefusalOutcome = {
      refusalId: randomUUID(),
      tenantId: command.tenantId,
      scope: command.scope,
      scopeId: command.scopeId,
      stage: command.stage,
      reasonCode: command.reasonCode,
      reasonMessage: command.reasonMessage,
      alternatives: command.alternatives,
      requestId: command.requestId,
      commitmentId: command.commitmentId,
      actorUserId: command.actorUserId,
      createdAtUtc,
    };

    this.refusalById.set(outcome.refusalId, outcome);
    this.refusalIdByFingerprint.set(fingerprintLookupKey, outcome.refusalId);

    if (command.idempotencyKey) {
      const idempotencyLookupKey = buildIdempotencyLookupKey(
        command.tenantId,
        command.scope,
        command.scopeId,
        command.idempotencyKey,
      );
      this.refusalIdByIdempotencyKey.set(idempotencyLookupKey, {
        refusalId: outcome.refusalId,
        fingerprint,
      });
    }

    this.appendHistoryEvent({
      eventId: randomUUID(),
      tenantId: command.tenantId,
      scope: command.scope,
      scopeId: command.scopeId,
      eventType: 'ROUTE_REFUSAL_RECORDED',
      refusalId: outcome.refusalId,
      stage: command.stage,
      reasonCode: command.reasonCode,
      reasonMessage: command.reasonMessage,
      alternatives: command.alternatives,
      requestId: command.requestId,
      commitmentId: command.commitmentId,
      actorUserId: command.actorUserId,
      occurredAtUtc: createdAtUtc,
    });

    if (command.scope === 'commitment' && command.requestId) {
      this.appendHistoryEvent({
        eventId: randomUUID(),
        tenantId: command.tenantId,
        scope: 'request',
        scopeId: command.requestId,
        eventType: 'ROUTE_COMMITMENT_REFUSAL_LINKED',
        refusalId: outcome.refusalId,
        stage: command.stage,
        reasonCode: command.reasonCode,
        reasonMessage: command.reasonMessage,
        alternatives: command.alternatives,
        requestId: command.requestId,
        commitmentId: command.scopeId,
        actorUserId: command.actorUserId,
        occurredAtUtc: createdAtUtc,
      });
    }

    return {
      outcome,
      replayed: false,
    };
  }

  async listHistory(
    tenantId: string,
    scope: RouteRefusalScope,
    scopeId: string,
  ): Promise<RouteLifecycleHistoryEvent[]> {
    const scopeKey = buildScopeKey(tenantId, scope, scopeId);
    const scopedEvents = this.historyByScope.get(scopeKey) || [];
    return scopedEvents.slice().sort((a, b) => a.occurredAtUtc.localeCompare(b.occurredAtUtc));
  }

  reset(): void {
    this.refusalById.clear();
    this.historyByScope.clear();
    this.refusalIdByIdempotencyKey.clear();
    this.refusalIdByFingerprint.clear();
  }

  private appendHistoryEvent(event: RouteLifecycleHistoryEvent): void {
    const scopeKey = buildScopeKey(event.tenantId, event.scope, event.scopeId);
    const scopedEvents = this.historyByScope.get(scopeKey) || [];
    scopedEvents.push(event);
    this.historyByScope.set(scopeKey, scopedEvents);
  }
}
