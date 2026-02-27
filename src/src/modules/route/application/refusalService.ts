import {
  type RouteRefusalValidationError,
  validateRouteRefusalPayload,
} from '../domain/refusal';
import {
  InMemoryRouteRefusalStore,
  type RouteRefusalScope,
  type RouteRefusalStore,
} from '../infrastructure/refusalStore';

type RouteRefusalServiceRefusalResult = {
  ok: false;
  code: string;
  message: string;
  refusalType: 'business' | 'client' | 'security';
  httpStatus: number;
  data?: {
    fieldErrors?: RouteRefusalValidationError[];
    [key: string]: unknown;
  };
};

type RouteRefusalServiceSuccessResult = {
  ok: true;
  code:
    | 'ROUTE_REQUEST_REFUSAL_RECORDED'
    | 'ROUTE_COMMITMENT_REFUSAL_RECORDED'
    | 'ROUTE_REQUEST_HISTORY_RESOLVED'
    | 'ROUTE_COMMITMENT_HISTORY_RESOLVED';
  message: string;
  httpStatus: 200 | 201;
  data: Record<string, unknown>;
};

type RouteRefusalServiceResult =
  | RouteRefusalServiceRefusalResult
  | RouteRefusalServiceSuccessResult;

type BaseRefusalCommand = {
  tenantId: string;
  reasonCode: unknown;
  reasonMessage: unknown;
  alternatives: unknown;
  actorUserId: string | null;
  idempotencyKey: string | null;
};

type RequestRefusalCommand = BaseRefusalCommand & {
  requestId: string;
};

type CommitmentRefusalCommand = BaseRefusalCommand & {
  commitmentId: string;
  requestId: string | null;
};

type HistoryQuery = {
  tenantId: string;
  scope: RouteRefusalScope;
  scopeId: string;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toClientRefusal = (
  code: string,
  message: string,
  data?: RouteRefusalServiceRefusalResult['data'],
): RouteRefusalServiceRefusalResult => ({
  ok: false,
  code,
  message,
  refusalType: 'client',
  httpStatus: 400,
  ...(data ? { data } : {}),
});

const validateTenantAndScope = (
  tenantId: string,
  scopeField: 'requestId' | 'commitmentId',
  scopeId: string,
): RouteRefusalServiceRefusalResult | null => {
  if (!tenantId) {
    return toClientRefusal(
      'ROUTE_TENANT_REQUIRED',
      'tenantId is required',
    );
  }

  if (!scopeId) {
    return toClientRefusal(
      'ROUTE_SCOPE_ID_REQUIRED',
      `${scopeField} is required`,
      {
        fieldErrors: [
          {
            field: scopeField,
            message: `${scopeField} is required`,
          },
        ],
      },
    );
  }

  return null;
};

const validateRefusalPayloadByStage = (
  stage: 'intake' | 'execution',
  reasonCode: unknown,
  reasonMessage: unknown,
  alternatives: unknown,
): RouteRefusalServiceRefusalResult | null => {
  const validation = validateRouteRefusalPayload({
    stage,
    reasonCode,
    reasonMessage,
    alternatives,
  });

  if (validation.ok) {
    return null;
  }

  return {
    ok: false,
    code: 'ROUTE_REFUSAL_VALIDATION_FAILED',
    message: 'Refusal payload must include canonical reason and structured alternatives.',
    refusalType: 'business',
    httpStatus: 200,
    data: {
      fieldErrors: validation.errors,
    },
  };
};

export class RouteRefusalService {
  constructor(private readonly store: RouteRefusalStore) {}

  issueRequestRefusal(command: RequestRefusalCommand): RouteRefusalServiceResult {
    const tenantId = normalizeString(command.tenantId);
    const requestId = normalizeString(command.requestId);
    const scopeValidation = validateTenantAndScope(tenantId, 'requestId', requestId);
    if (scopeValidation) {
      return scopeValidation;
    }

    const payloadValidation = validateRefusalPayloadByStage(
      'intake',
      command.reasonCode,
      command.reasonMessage,
      command.alternatives,
    );
    if (payloadValidation) {
      return payloadValidation;
    }

    const parsed = validateRouteRefusalPayload({
      stage: 'intake',
      reasonCode: command.reasonCode,
      reasonMessage: command.reasonMessage,
      alternatives: command.alternatives,
    });
    if (!parsed.ok) {
      return {
        ok: false,
        code: 'ROUTE_REFUSAL_VALIDATION_FAILED',
        message: 'Refusal payload must include canonical reason and structured alternatives.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          fieldErrors: parsed.errors,
        },
      };
    }

    const persisted = this.store.persistRefusal({
      tenantId,
      scope: 'request',
      scopeId: requestId,
      stage: 'intake',
      reasonCode: parsed.value.reasonCode,
      reasonMessage: parsed.value.reasonMessage,
      alternatives: parsed.value.alternatives,
      actorUserId: command.actorUserId,
      requestId,
      commitmentId: null,
      idempotencyKey: normalizeString(command.idempotencyKey) || null,
    });

    return {
      ok: true,
      code: 'ROUTE_REQUEST_REFUSAL_RECORDED',
      message: persisted.replayed
        ? 'Request refusal already recorded for this idempotency context'
        : 'Request refusal recorded with structured alternatives',
      httpStatus: persisted.replayed ? 200 : 201,
      data: {
        requestId,
        replayed: persisted.replayed,
        outcome: persisted.outcome,
      },
    };
  }

  issueCommitmentRefusal(command: CommitmentRefusalCommand): RouteRefusalServiceResult {
    const tenantId = normalizeString(command.tenantId);
    const commitmentId = normalizeString(command.commitmentId);
    const requestId = normalizeString(command.requestId) || null;
    const scopeValidation = validateTenantAndScope(tenantId, 'commitmentId', commitmentId);
    if (scopeValidation) {
      return scopeValidation;
    }

    const payloadValidation = validateRefusalPayloadByStage(
      'execution',
      command.reasonCode,
      command.reasonMessage,
      command.alternatives,
    );
    if (payloadValidation) {
      return payloadValidation;
    }

    const parsed = validateRouteRefusalPayload({
      stage: 'execution',
      reasonCode: command.reasonCode,
      reasonMessage: command.reasonMessage,
      alternatives: command.alternatives,
    });
    if (!parsed.ok) {
      return {
        ok: false,
        code: 'ROUTE_REFUSAL_VALIDATION_FAILED',
        message: 'Refusal payload must include canonical reason and structured alternatives.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          fieldErrors: parsed.errors,
        },
      };
    }

    const persisted = this.store.persistRefusal({
      tenantId,
      scope: 'commitment',
      scopeId: commitmentId,
      stage: 'execution',
      reasonCode: parsed.value.reasonCode,
      reasonMessage: parsed.value.reasonMessage,
      alternatives: parsed.value.alternatives,
      actorUserId: command.actorUserId,
      requestId,
      commitmentId,
      idempotencyKey: normalizeString(command.idempotencyKey) || null,
    });

    return {
      ok: true,
      code: 'ROUTE_COMMITMENT_REFUSAL_RECORDED',
      message: persisted.replayed
        ? 'Commitment refusal already recorded for this idempotency context'
        : 'Commitment refusal recorded with structured alternatives',
      httpStatus: persisted.replayed ? 200 : 201,
      data: {
        commitmentId,
        requestId,
        replayed: persisted.replayed,
        outcome: persisted.outcome,
      },
    };
  }

  getRequestHistory(query: Omit<HistoryQuery, 'scope'>): RouteRefusalServiceResult {
    const tenantId = normalizeString(query.tenantId);
    const requestId = normalizeString(query.scopeId);
    const scopeValidation = validateTenantAndScope(tenantId, 'requestId', requestId);
    if (scopeValidation) {
      return scopeValidation;
    }

    const history = this.store.listHistory(tenantId, 'request', requestId);
    return {
      ok: true,
      code: 'ROUTE_REQUEST_HISTORY_RESOLVED',
      message: 'Route request history resolved',
      httpStatus: 200,
      data: {
        requestId,
        events: history,
      },
    };
  }

  getCommitmentHistory(query: Omit<HistoryQuery, 'scope'>): RouteRefusalServiceResult {
    const tenantId = normalizeString(query.tenantId);
    const commitmentId = normalizeString(query.scopeId);
    const scopeValidation = validateTenantAndScope(tenantId, 'commitmentId', commitmentId);
    if (scopeValidation) {
      return scopeValidation;
    }

    const history = this.store.listHistory(tenantId, 'commitment', commitmentId);
    return {
      ok: true,
      code: 'ROUTE_COMMITMENT_HISTORY_RESOLVED',
      message: 'Route commitment history resolved',
      httpStatus: 200,
      data: {
        commitmentId,
        events: history,
      },
    };
  }
}

const defaultRouteRefusalStore = new InMemoryRouteRefusalStore();

export const routeRefusalService = new RouteRefusalService(defaultRouteRefusalStore);

export const resetRouteRefusalState = (): void => {
  defaultRouteRefusalStore.reset();
};
