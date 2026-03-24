import type {
  BridgeSessionAggregate,
  ProviderBridgeEvent,
} from '../../../../../domains/communication';
import {
  connectShyftCallServiceAsync,
  ConnectShyftPersistenceUnavailableError,
  type Call,
  type CallStatus,
  type ConnectShyftCallService,
} from './calls';
import {
  connectShyftVoicemailServiceAsync,
  type ConnectShyftVoicemailService,
  type Voicemail,
} from './voicemails';
import {
  connectShyftDeliveryAttemptServiceAsync,
  type ConnectShyftDeliveryAttemptService,
} from './deliveryAttempts';
import {
  connectShyftProviderEventServiceAsync,
  type ConnectShyftProviderEventService,
} from './providerEvents';
import {
  handleConnectShyftBridgeWebhookEvent,
  loadConnectShyftBridgeAggregateByProviderCallId,
  loadConnectShyftBridgeAggregateBySessionId,
  loadConnectShyftBridgeAggregateByThreadId,
  registerConnectShyftBridgeCallStatusHook,
  startConnectShyftBridgeSession,
} from './bridgeSessions';
import {
  connectShyftThreadServiceAsync,
  type AsyncConnectShyftThreadService,
  type ConnectShyftThread,
} from './threads';
import {
  connectShyftNeighborServiceAsync,
  type AsyncConnectShyftNeighborService,
} from './neighbors';
import {
  resolveOperatorDestination,
  type ConnectShyftOperatorDestinationResolution,
} from './operatorDestinationResolver';
import {
  resolveSenderNumber,
  type ResolveSenderNumberResult,
} from './senderNumberResolver';
import {
  resolveConnectShyftProviderAdapter,
  type ConnectShyftOutboundCallDispatchPolicy,
  type ConnectShyftProviderAdapter,
  type ConnectShyftProviderResolutionResult,
} from './providerRegistry';
import {
  buildConnectShyftLifecycleEventPublisher,
  listConnectShyftLifecycleEventsForTests as listLifecycleEventsForTests,
  resetConnectShyftLifecycleEventsForTests as resetLifecycleEventsForTests,
  type ConnectShyftCallLifecycleEventPublisher,
} from './events';

const ACTIVE_CALL_STATUSES = new Set<CallStatus>([
  'operator_dialing',
  'operator_answered',
  'neighbor_dialing',
  'neighbor_answered',
  'bridged',
]);
const TERMINAL_CALL_STATUSES = new Set<CallStatus>([
  'voicemail',
  'completed',
  'failed',
  'canceled',
  'expired',
]);
const CALL_STATUS_ORDER: Record<CallStatus, number> = {
  operator_dialing: 1,
  operator_answered: 2,
  neighbor_dialing: 3,
  neighbor_answered: 4,
  bridged: 5,
  voicemail: 6,
  completed: 7,
  failed: 7,
  canceled: 7,
  expired: 7,
};
const DEFAULT_OUTBOUND_CALL_POLICY: ConnectShyftOutboundCallDispatchPolicy = {
  transport: 'bridge',
  autoRetry: false,
  redialPolicy: 'manual_only',
};

export interface StartCallInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  personId: string;
  idempotencyKey?: string;
  actorRoles: string[];
  actorUserId?: string | null;
  requestedProvider?: string | null;
  providerRegistryHeaders?: Record<string, string | undefined>;
}

export interface HandleProviderEventInput {
  tenantId: string;
  provider: string;
  event: ProviderBridgeEvent;
  eventJson: unknown;
  providerCallId?: string | null;
  occurredAt: Date;
}

export interface HandleVoicemailInput {
  tenantId: string;
  orgUnitId: string;
  callId: string;
  threadId: string;
  personId: string;
  artifactId: string;
  recordingUrl: string | null;
  recordingStatus: 'pending' | 'completed' | 'failed';
  occurredAt: Date;
  transcriptionJson?: unknown;
}

export interface ConnectShyftCallLifecycleService {
  startCall(input: StartCallInput): Promise<Call>;
  handleProviderEvent(input: HandleProviderEventInput): Promise<void>;
  handleVoicemail(input: HandleVoicemailInput): Promise<Voicemail>;
}

export class ConnectShyftCallLifecycleRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly refusalType: 'business' | 'client' = 'business',
    readonly httpStatus = 200,
    readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ConnectShyftCallLifecycleRefusalError';
  }
}

type CallLifecycleDependencies = {
  callService?: ConnectShyftCallService;
  voicemailService?: ConnectShyftVoicemailService;
  deliveryAttemptService?: ConnectShyftDeliveryAttemptService;
  providerEventService?: ConnectShyftProviderEventService;
  threadService?: Pick<AsyncConnectShyftThreadService, 'findThreadById'>;
  neighborService?: Pick<AsyncConnectShyftNeighborService, 'resolveNeighbor'>;
  resolveOperatorDestinationFn?: (input: {
    tenantId: string;
    orgUnitId: string;
    actorUserId?: string | null;
    claimedByUserId?: string | null;
  }) => Promise<ConnectShyftOperatorDestinationResolution>;
  resolveSenderNumberFn?: typeof resolveSenderNumber;
  resolveProviderAdapterFn?: (input: {
    req: {
      header: (name: string) => string | undefined;
      body: Record<string, unknown>;
      headers: Record<string, string>;
      originalUrl: string;
      protocol: string;
      tenantId?: string | null;
      orgUnitId?: string | null;
    };
    requestedProvider?: string | null;
    operation: 'call' | 'webhook';
  }) => ConnectShyftProviderResolutionResult;
  startBridgeSessionFn?: typeof startConnectShyftBridgeSession;
  handleBridgeWebhookEventFn?: typeof handleConnectShyftBridgeWebhookEvent;
  loadBridgeAggregateByThreadIdFn?: typeof loadConnectShyftBridgeAggregateByThreadId;
  loadBridgeAggregateBySessionIdFn?: typeof loadConnectShyftBridgeAggregateBySessionId;
  loadBridgeAggregateByProviderCallIdFn?: typeof loadConnectShyftBridgeAggregateByProviderCallId;
  registerBridgeCallStatusHookFn?: typeof registerConnectShyftBridgeCallStatusHook;
  eventPublisher?: ConnectShyftCallLifecycleEventPublisher;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toIsoString = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  return normalized;
};

const isTerminalCallStatus = (status: CallStatus): boolean => TERMINAL_CALL_STATUSES.has(status);

const mapBridgeStatusToCallStatus = (status: string): CallStatus | null => {
  if (
    status === 'operator_dialing'
    || status === 'operator_answered'
    || status === 'neighbor_dialing'
    || status === 'neighbor_answered'
    || status === 'bridged'
    || status === 'completed'
    || status === 'failed'
    || status === 'canceled'
    || status === 'expired'
  ) {
    return status;
  }

  return null;
};

const resolveCallEndedAtUtc = (
  aggregate: BridgeSessionAggregate,
): string | null => {
  const completedAt = toIsoString(aggregate.session.completedAt);
  if (completedAt) {
    return completedAt;
  }

  return toIsoString(aggregate.neighborLeg.endedAt)
    || toIsoString(aggregate.operatorLeg.endedAt)
    || (
      aggregate.session.status === 'failed'
      || aggregate.session.status === 'canceled'
      || aggregate.session.status === 'expired'
      ? toIsoString(aggregate.session.updatedAt)
      : null
    );
};

const shouldApplyCallUpdate = (
  existingStatus: CallStatus,
  nextStatus: CallStatus,
): boolean => {
  if (existingStatus === nextStatus) {
    return true;
  }

  if (existingStatus === 'failed' && nextStatus === 'voicemail') {
    return true;
  }

  if (existingStatus === 'voicemail' && nextStatus === 'completed') {
    return true;
  }

  if (isTerminalCallStatus(existingStatus)) {
    return false;
  }

  return CALL_STATUS_ORDER[nextStatus] >= CALL_STATUS_ORDER[existingStatus];
};

const buildCallUpdateFromAggregate = (input: {
  aggregate: BridgeSessionAggregate;
  existingCall: Call;
  domainEvent?: ProviderBridgeEvent | null;
}): {
  status: CallStatus;
  bridgeSessionId: string;
  operatorAnsweredAtUtc?: string;
  neighborAnsweredAtUtc?: string;
  bridgedAtUtc?: string;
  endedAtUtc?: string;
  failureCode?: string | null;
  failureMessage?: string | null;
} | null => {
  const statusFromDomainEvent = input.domainEvent?.type === 'operator_answered'
    ? 'operator_answered'
    : null;
  const status = statusFromDomainEvent || mapBridgeStatusToCallStatus(input.aggregate.session.status);
  if (!status) {
    return null;
  }

  if (!shouldApplyCallUpdate(input.existingCall.status, status)) {
    return null;
  }

  const patch: {
    status: CallStatus;
    bridgeSessionId: string;
    operatorAnsweredAtUtc?: string;
    neighborAnsweredAtUtc?: string;
    bridgedAtUtc?: string;
    endedAtUtc?: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  } = {
    status,
    bridgeSessionId: input.aggregate.session.id,
  };

  const operatorAnsweredAtUtc = toIsoString(input.aggregate.operatorLeg.answeredAt);
  if (operatorAnsweredAtUtc) {
    patch.operatorAnsweredAtUtc = operatorAnsweredAtUtc;
  }

  const neighborAnsweredAtUtc = toIsoString(input.aggregate.neighborLeg.answeredAt);
  if (neighborAnsweredAtUtc) {
    patch.neighborAnsweredAtUtc = neighborAnsweredAtUtc;
  }

  if (status === 'bridged' || status === 'completed') {
    patch.bridgedAtUtc = toIsoString(input.aggregate.session.updatedAt) || undefined;
  }

  const endedAtUtc = resolveCallEndedAtUtc(input.aggregate);
  if (endedAtUtc) {
    patch.endedAtUtc = endedAtUtc;
  }

  if (status === 'failed' || status === 'canceled' || status === 'expired') {
    patch.failureCode = normalizeString(input.aggregate.session.failureCode) || null;
    patch.failureMessage = normalizeString(input.aggregate.session.failureMessage) || null;
  }

  return patch;
};

const buildProviderResolutionRequest = (input: {
  tenantId: string;
  orgUnitId: string;
  requestedProvider?: string | null;
  headers?: Record<string, string | undefined>;
  operation: 'call' | 'webhook';
}) => {
  const normalizedHeaders: Record<string, string> = {};

  Object.entries(input.headers || {}).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    normalizedHeaders[key.toLowerCase()] = normalized;
  });

  return {
    req: {
      body: input.requestedProvider ? { providerKey: input.requestedProvider } : {},
      headers: normalizedHeaders,
      originalUrl: input.operation === 'call'
        ? '/api/v1/connectshyft/thread/call'
        : '/api/v1/connectshyft/provider-events',
      protocol: 'https',
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      header(name: string) {
        return normalizedHeaders[name.toLowerCase()];
      },
    },
    requestedProvider: input.requestedProvider,
    operation: input.operation,
  } as const;
};

const findCallForAggregate = (
  calls: Call[],
  aggregate: BridgeSessionAggregate,
): Call | null => {
  const byBridgeSession = calls.find((call) => call.bridgeSessionId === aggregate.session.id);
  if (byBridgeSession) {
    return byBridgeSession;
  }

  const personId = normalizeString((aggregate.session as { personId?: string | null }).personId);
  const unlinkedPending = calls.find((call) => (
    call.bridgeSessionId === null
    && call.status === 'operator_dialing'
    && call.threadId === aggregate.session.threadId
    && (!personId || call.personId === personId)
  ));

  return unlinkedPending || null;
};

export const mapConnectShyftWebhookEventToBridgeEvent = (input: {
  aggregate: BridgeSessionAggregate;
  rawEventType: string;
  providerCallId?: string | null;
  bridgeSessionId?: string | null;
  occurredAt?: Date;
  reason?: string | null;
}): ProviderBridgeEvent | null => {
  const normalizedEventType = normalizeString(input.rawEventType).toLowerCase();
  const providerCallId = normalizeString(input.providerCallId) || null;
  const legRole = providerCallId === input.aggregate.operatorLeg.providerCallId
    ? 'operator'
    : providerCallId === input.aggregate.neighborLeg.providerCallId
      ? 'neighbor'
      : null;

  if (normalizedEventType === 'callanswered' || normalizedEventType === 'voiceanswered') {
    if (legRole === 'operator' && providerCallId) {
      return {
        type: 'operator_answered',
        bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
        providerCallId,
        occurredAt: input.occurredAt,
      };
    }

    if (legRole === 'neighbor' && providerCallId) {
      return {
        type: 'neighbor_answered',
        bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
        providerCallId,
        occurredAt: input.occurredAt,
      };
    }
  }

  if (normalizedEventType === 'callbridged' || normalizedEventType === 'callconnected') {
    return {
      type: 'bridge_connected',
      bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
      occurredAt: input.occurredAt,
    };
  }

  if (
    normalizedEventType === 'callhangup'
    || normalizedEventType === 'callcompleted'
    || normalizedEventType === 'callended'
  ) {
    if (input.aggregate.session.status === 'bridged' || input.aggregate.session.status === 'completed') {
      return {
        type: 'completed',
        bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
        providerCallId: providerCallId || undefined,
        occurredAt: input.occurredAt,
      };
    }

    if (legRole === 'operator') {
      return {
        type: 'operator_failed',
        bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
        providerCallId: providerCallId || undefined,
        reason: input.reason || 'call_hangup',
        occurredAt: input.occurredAt,
      };
    }

    if (legRole === 'neighbor') {
      return {
        type: 'neighbor_failed',
        bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
        providerCallId: providerCallId || undefined,
        reason: input.reason || 'call_hangup',
        occurredAt: input.occurredAt,
      };
    }
  }

  if (
    normalizedEventType === 'callfailed'
    || normalizedEventType === 'callfailure'
    || normalizedEventType === 'callrejected'
  ) {
    if (legRole === 'operator') {
      return {
        type: 'operator_failed',
        bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
        providerCallId: providerCallId || undefined,
        reason: input.reason || 'call_failed',
        occurredAt: input.occurredAt,
      };
    }

    if (legRole === 'neighbor') {
      return {
        type: 'neighbor_failed',
        bridgeSessionId: input.bridgeSessionId || input.aggregate.session.id,
        providerCallId: providerCallId || undefined,
        reason: input.reason || 'call_failed',
        occurredAt: input.occurredAt,
      };
    }
  }

  return null;
};

const resolveBridgeWebhookReplayInput = async (input: {
  event: ProviderBridgeEvent;
  providerCallId?: string | null;
  loadBySessionId: typeof loadConnectShyftBridgeAggregateBySessionId;
  loadByProviderCallId: typeof loadConnectShyftBridgeAggregateByProviderCallId;
}): Promise<{
  aggregate: BridgeSessionAggregate;
  providerLegId: string;
  eventType: string;
  reason?: string | null;
} | null> => {
  const bridgeSessionId = 'bridgeSessionId' in input.event
    ? normalizeString(input.event.bridgeSessionId)
    : '';
  const providerCallId = normalizeString(input.providerCallId)
    || ('providerCallId' in input.event ? normalizeString(input.event.providerCallId) : '');

  const aggregate = bridgeSessionId
    ? await input.loadBySessionId(bridgeSessionId)
    : providerCallId
      ? await input.loadByProviderCallId({
        tenantId: undefined,
        providerCallId,
      })
      : null;
  if (!aggregate) {
    return null;
  }

  const providerLegId = providerCallId
    || aggregate.neighborLeg.providerCallId
    || aggregate.operatorLeg.providerCallId
    || '';
  if (!providerLegId) {
    return null;
  }

  if (input.event.type === 'operator_answered' || input.event.type === 'neighbor_answered') {
    return {
      aggregate,
      providerLegId,
      eventType: 'CallAnswered',
    };
  }

  if (input.event.type === 'bridge_connected') {
    return {
      aggregate,
      providerLegId,
      eventType: 'CallBridged',
    };
  }

  if (input.event.type === 'completed') {
    return {
      aggregate,
      providerLegId,
      eventType: 'CallCompleted',
    };
  }

  if (
    input.event.type === 'operator_failed'
    || input.event.type === 'neighbor_failed'
    || input.event.type === 'bridge_failed'
  ) {
    return {
      aggregate,
      providerLegId,
      eventType: 'CallFailed',
      reason: 'reason' in input.event ? input.event.reason || null : null,
    };
  }

  return null;
};

export const buildConnectShyftCallLifecycleService = (
  dependencies: CallLifecycleDependencies = {},
): ConnectShyftCallLifecycleService => {
  const callService = dependencies.callService || connectShyftCallServiceAsync;
  const voicemailService = dependencies.voicemailService || connectShyftVoicemailServiceAsync;
  const deliveryAttemptService = dependencies.deliveryAttemptService || connectShyftDeliveryAttemptServiceAsync;
  const providerEventService = dependencies.providerEventService || connectShyftProviderEventServiceAsync;
  const threadService = dependencies.threadService || connectShyftThreadServiceAsync;
  const neighborService = dependencies.neighborService || connectShyftNeighborServiceAsync;
  const resolveOperatorDestinationFn =
    dependencies.resolveOperatorDestinationFn || resolveOperatorDestination;
  const resolveSenderNumberFn = dependencies.resolveSenderNumberFn || resolveSenderNumber;
  const resolveProviderAdapterFn =
    dependencies.resolveProviderAdapterFn || resolveConnectShyftProviderAdapter;
  const startBridgeSessionFn =
    dependencies.startBridgeSessionFn || startConnectShyftBridgeSession;
  const handleBridgeWebhookEventFn =
    dependencies.handleBridgeWebhookEventFn || handleConnectShyftBridgeWebhookEvent;
  const loadBridgeAggregateByThreadIdFn =
    dependencies.loadBridgeAggregateByThreadIdFn || loadConnectShyftBridgeAggregateByThreadId;
  const loadBridgeAggregateBySessionIdFn =
    dependencies.loadBridgeAggregateBySessionIdFn || loadConnectShyftBridgeAggregateBySessionId;
  const loadBridgeAggregateByProviderCallIdFn =
    dependencies.loadBridgeAggregateByProviderCallIdFn || loadConnectShyftBridgeAggregateByProviderCallId;
  const registerBridgeCallStatusHookFn =
    dependencies.registerBridgeCallStatusHookFn || registerConnectShyftBridgeCallStatusHook;
  const eventPublisher =
    dependencies.eventPublisher || buildConnectShyftLifecycleEventPublisher();

  const syncCallFromAggregate = async (
    aggregate: BridgeSessionAggregate,
    domainEvent?: ProviderBridgeEvent | null,
  ): Promise<Call | null> => {
    const personId = normalizeString((aggregate.session as { personId?: string | null }).personId);
    if (!personId) {
      return null;
    }

    const threadCalls = await callService.listThreadCalls({
      tenantId: aggregate.session.tenantId,
      orgUnitId: aggregate.session.orgUnitId,
      threadId: aggregate.session.threadId,
    });
    let call = findCallForAggregate(threadCalls, aggregate);
    let created = false;

    if (!call) {
      call = await callService.createCall({
        tenantId: aggregate.session.tenantId,
        orgUnitId: aggregate.session.orgUnitId,
        threadId: aggregate.session.threadId,
        personId,
      });
      created = true;
      await deliveryAttemptService.createAttempt({
        tenantId: call.tenantId,
        orgUnitId: call.orgUnitId,
        threadId: call.threadId,
        personId: call.personId,
        callId: call.id,
        channel: 'voice',
        status: 'pending',
      });
    }

    const patch = buildCallUpdateFromAggregate({
      aggregate,
      existingCall: call,
      domainEvent: domainEvent ?? null,
    });
    if (!patch) {
      return call;
    }

    await callService.updateCallStatus({
      callId: call.id,
      tenantId: call.tenantId,
      ...patch,
    });
    const refreshedCall = await callService.getCallById(call.id, call.tenantId);
    if (!refreshedCall) {
      return call;
    }

    if (created) {
      await eventPublisher.publishCallStarted({
        tenantId: refreshedCall.tenantId,
        call: refreshedCall,
      });
    } else if (refreshedCall.status !== call.status) {
      await eventPublisher.publishCallUpdated({
        tenantId: refreshedCall.tenantId,
        call: refreshedCall,
      });
    }

    return refreshedCall;
  };

  const registerBridgeHook = (): void => {
    registerBridgeCallStatusHookFn(async ({ aggregate, domainEvent }) => {
      await syncCallFromAggregate(aggregate, domainEvent);
    });
  };

  const resolveThreadOrThrow = async (input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
  }): Promise<ConnectShyftThread> => {
    const thread = await threadService.findThreadById({
      tenantId: input.tenantId,
      threadId: input.threadId,
    });
    if (!thread || thread.orgUnitId !== input.orgUnitId) {
      throw new ConnectShyftCallLifecycleRefusalError(
        'CONNECTSHYFT_THREAD_NOT_FOUND',
        'Thread not found for this tenant/orgUnit context.',
        'business',
        404,
      );
    }

    return thread;
  };

  return {
    async startCall(input: StartCallInput): Promise<Call> {
      registerBridgeHook();

      const thread = await resolveThreadOrThrow({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: input.threadId,
      });

      const existingCalls = await callService.listThreadCalls({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: input.threadId,
      });
      const existingAggregate = await loadBridgeAggregateByThreadIdFn({
        tenantId: input.tenantId,
        threadId: input.threadId,
      });

      if (
        input.idempotencyKey
        && existingAggregate
        && normalizeString(existingAggregate.session.idempotencyKey) === input.idempotencyKey
      ) {
        const existingCall = existingCalls.find(
          (call) => call.bridgeSessionId === existingAggregate.session.id,
        );
        if (existingCall) {
          return existingCall;
        }
      }

      const activeCall = existingCalls.find((call) => ACTIVE_CALL_STATUSES.has(call.status));
      if (activeCall) {
        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_CALL_ALREADY_IN_PROGRESS',
          'A call is already in progress for this thread.',
        );
      }

      const operatorDestination = await resolveOperatorDestinationFn({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        actorUserId: input.actorUserId ?? null,
        claimedByUserId: thread.claimedByUserId || null,
      });
      const operatorContactPointId = normalizeString(operatorDestination.phoneNumber) || null;
      if (!operatorContactPointId && operatorDestination.source === 'none') {
        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_OPERATOR_DESTINATION_MISSING',
          'Outbound bridge calls require a resolved operator destination.',
        );
      }
      if (!operatorContactPointId) {
        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_OPERATOR_INVALID_PHONE',
          'Outbound bridge calls require a valid operator destination phone.',
        );
      }

      const resolvedNeighbor = await neighborService.resolveNeighbor({
        tenantId: input.tenantId,
        neighborId: thread.neighborId,
        actorRoles: input.actorRoles,
      });
      if (!resolvedNeighbor.ok) {
        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
          'Outbound bridge calls require a dialable neighbor phone.',
        );
      }

      const neighborContactPointId = resolvedNeighbor.data.neighbor.phones
        .filter((phone) => phone.isActive !== false)
        .sort((left, right) => left.sortOrder - right.sortOrder)[0]?.value || null;
      if (!neighborContactPointId) {
        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
          'Outbound bridge calls require a dialable neighbor phone.',
        );
      }

      const senderResolution = await resolveSenderNumberFn({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: input.threadId,
        channel: 'voice',
      }, {
        loadThread: async () => thread,
      });
      if (!senderResolution.ok) {
        throw new ConnectShyftCallLifecycleRefusalError(
          senderResolution.reason === 'sender_mapping_ambiguous'
            ? 'CONNECTSHYFT_CALL_SENDER_AMBIGUOUS'
            : 'CONNECTSHYFT_CALL_SENDER_REQUIRED',
          senderResolution.reason === 'sender_mapping_ambiguous'
            ? 'Resolve the mapped ConnectShyft outbound line so exactly one active scoped mapping remains before starting a call.'
            : 'Persist one valid mapped ConnectShyft outbound line on the thread before starting a call.',
        );
      }

      const providerResolution = resolveProviderAdapterFn(
        buildProviderResolutionRequest({
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId,
          requestedProvider: input.requestedProvider,
          headers: input.providerRegistryHeaders,
          operation: 'call',
        }),
      );
      if (!providerResolution.ok) {
        throw new ConnectShyftCallLifecycleRefusalError(
          providerResolution.refusal.code,
          providerResolution.refusal.message,
          providerResolution.refusal.refusalType,
          providerResolution.refusal.httpStatus,
          providerResolution.refusal.data,
        );
      }

      const call = await callService.createCall({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: input.threadId,
        personId: input.personId,
        idempotencyKey: input.idempotencyKey,
      });

      await deliveryAttemptService.createAttempt({
        tenantId: call.tenantId,
        orgUnitId: call.orgUnitId,
        threadId: call.threadId,
        personId: call.personId,
        callId: call.id,
        channel: 'voice',
        status: 'pending',
      });

      try {
        const started = await startBridgeSessionFn({
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId,
          threadId: input.threadId,
          personId: input.personId,
          operatorParticipantId: input.actorUserId || 'unknown-operator',
          neighborParticipantId: thread.neighborId,
          operatorContactPointId,
          neighborContactPointId,
          selectedOutboundContactPointId: senderResolution.providerNumberE164,
          providerKey: providerResolution.providerResolution.resolvedProvider,
          providerAdapter: providerResolution.adapter as ConnectShyftProviderAdapter,
          idempotencyKey: input.idempotencyKey,
          auditCorrelationId: input.idempotencyKey,
          callPolicy: DEFAULT_OUTBOUND_CALL_POLICY,
        });

        await callService.updateCallStatus({
          callId: call.id,
          tenantId: call.tenantId,
          status: 'operator_dialing',
          bridgeSessionId: started.aggregate.session.id,
        });

        const refreshed = await callService.getCallById(call.id, call.tenantId);
        if (!refreshed) {
          throw new Error(`Failed to reload call ${call.id} after starting bridge session.`);
        }

        await eventPublisher.publishCallStarted({
          tenantId: refreshed.tenantId,
          call: refreshed,
          actorUserId: input.actorUserId ?? null,
        });

        return refreshed;
      } catch (error) {
        await callService.updateCallStatus({
          callId: call.id,
          tenantId: call.tenantId,
          status: 'failed',
          endedAtUtc: new Date().toISOString(),
          failureCode: 'provider_error',
          failureMessage: error instanceof Error ? error.message : 'provider_error',
        });
        const failedCall = await callService.getCallById(call.id, call.tenantId);
        if (failedCall) {
          await eventPublisher.publishCallUpdated({
            tenantId: failedCall.tenantId,
            call: failedCall,
            actorUserId: input.actorUserId ?? null,
          });
        }

        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_PROVIDER_DISPATCH_FAILED',
          'Provider dispatch failed before persistence.',
        );
      }
    },

    async handleProviderEvent(input: HandleProviderEventInput): Promise<void> {
      registerBridgeHook();

      const replayInput = await resolveBridgeWebhookReplayInput({
        event: input.event,
        providerCallId: input.providerCallId ?? null,
        loadBySessionId: loadBridgeAggregateBySessionIdFn,
        loadByProviderCallId: loadBridgeAggregateByProviderCallIdFn,
      });
      if (!replayInput) {
        return;
      }

      const currentCalls = await callService.listThreadCalls({
        tenantId: replayInput.aggregate.session.tenantId,
        orgUnitId: replayInput.aggregate.session.orgUnitId,
        threadId: replayInput.aggregate.session.threadId,
      });
      const currentCall = currentCalls.find(
        (call) => call.bridgeSessionId === replayInput.aggregate.session.id,
      ) || null;

      await providerEventService.recordEvent({
        tenantId: replayInput.aggregate.session.tenantId,
        provider: input.provider,
        eventType: input.event.type,
        eventJson: input.eventJson,
        callId: currentCall?.id || null,
        bridgeSessionId: replayInput.aggregate.session.id,
        providerCallId: replayInput.providerLegId,
        occurredAtUtc: input.occurredAt.toISOString(),
      });

      const providerResolution = resolveProviderAdapterFn(
        buildProviderResolutionRequest({
          tenantId: replayInput.aggregate.session.tenantId,
          orgUnitId: replayInput.aggregate.session.orgUnitId,
          requestedProvider: input.provider,
          operation: 'webhook',
        }),
      );
      if (!providerResolution.ok) {
        throw new ConnectShyftCallLifecycleRefusalError(
          providerResolution.refusal.code,
          providerResolution.refusal.message,
          providerResolution.refusal.refusalType,
          providerResolution.refusal.httpStatus,
          providerResolution.refusal.data,
        );
      }

      await handleBridgeWebhookEventFn({
        tenantId: replayInput.aggregate.session.tenantId,
        orgUnitId: replayInput.aggregate.session.orgUnitId,
        threadId: replayInput.aggregate.session.threadId,
        providerKey: providerResolution.providerResolution.resolvedProvider,
        providerAdapter: providerResolution.adapter as ConnectShyftProviderAdapter,
        providerLegId: replayInput.providerLegId,
        eventType: replayInput.eventType,
        occurredAt: input.occurredAt,
        reason: replayInput.reason || null,
        callPolicy: DEFAULT_OUTBOUND_CALL_POLICY,
      });
    },

    async handleVoicemail(input: HandleVoicemailInput): Promise<Voicemail> {
      registerBridgeHook();

      const call = await callService.getCallById(input.callId, input.tenantId);
      if (!call) {
        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_CALL_NOT_FOUND',
          'Call not found for this tenant context.',
          'business',
          404,
        );
      }

      let voicemailEligible = call.status === 'failed' || call.status === 'voicemail';
      if (!voicemailEligible && call.bridgeSessionId) {
        const aggregate = await loadBridgeAggregateBySessionIdFn(call.bridgeSessionId);
        voicemailEligible = aggregate?.session.failureCode === 'neighbor_failed';
      }

      if (!voicemailEligible) {
        throw new ConnectShyftCallLifecycleRefusalError(
          'CONNECTSHYFT_VOICEMAIL_NOT_ALLOWED',
          'Voicemail fallback is only allowed after a failed neighbor connection.',
        );
      }

      const voicemail = await voicemailService.createVoicemail({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        callId: input.callId,
        threadId: input.threadId,
        personId: input.personId,
        artifactId: input.artifactId,
        recordingUrl: input.recordingUrl,
        recordingStatus: input.recordingStatus,
        occurredAtUtc: input.occurredAt.toISOString(),
        transcriptionJson: input.transcriptionJson,
      });

      if (shouldApplyCallUpdate(call.status, 'voicemail')) {
        await callService.updateCallStatus({
          callId: call.id,
          tenantId: call.tenantId,
          status: 'voicemail',
          endedAtUtc: call.endedAtUtc || input.occurredAt.toISOString(),
        });
      }

      await eventPublisher.publishVoicemailRecorded({
        tenantId: voicemail.tenantId,
        voicemail,
      });

      return voicemail;
    },
  };
};

export const connectShyftCallLifecycleServiceAsync =
  buildConnectShyftCallLifecycleService();

export const resetConnectShyftCallLifecycleStateForTests = (): void => {
  resetLifecycleEventsForTests();
};

export const listConnectShyftLifecycleEventsForTests = () =>
  listLifecycleEventsForTests();
