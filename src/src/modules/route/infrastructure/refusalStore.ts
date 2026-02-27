import { createHash, randomUUID } from 'node:crypto';
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
  persistRefusal(command: PersistRouteRefusalCommand): PersistRouteRefusalResult;
  listHistory(tenantId: string, scope: RouteRefusalScope, scopeId: string): RouteLifecycleHistoryEvent[];
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

export class InMemoryRouteRefusalStore implements RouteRefusalStore {
  private refusalById = new Map<string, RouteRefusalOutcome>();

  private historyByScope = new Map<string, RouteLifecycleHistoryEvent[]>();

  private refusalIdByIdempotencyKey = new Map<string, string>();

  private refusalIdByFingerprint = new Map<string, string>();

  persistRefusal(command: PersistRouteRefusalCommand): PersistRouteRefusalResult {
    if (command.idempotencyKey) {
      const idempotencyLookupKey = buildIdempotencyLookupKey(
        command.tenantId,
        command.scope,
        command.scopeId,
        command.idempotencyKey,
      );
      const existingRefusalId = this.refusalIdByIdempotencyKey.get(idempotencyLookupKey);
      if (existingRefusalId) {
        const existingOutcome = this.refusalById.get(existingRefusalId);
        if (existingOutcome) {
          return {
            outcome: existingOutcome,
            replayed: true,
          };
        }
      }
    }

    const fingerprint = buildFingerprint(command);
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
      this.refusalIdByIdempotencyKey.set(idempotencyLookupKey, outcome.refusalId);
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

  listHistory(tenantId: string, scope: RouteRefusalScope, scopeId: string): RouteLifecycleHistoryEvent[] {
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
