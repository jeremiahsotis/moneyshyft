import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import {
  listConnectShyftCanonicalEvents,
  type ConnectShyftCanonicalEventRecord,
} from '../canonicalEvents';
import { loadConnectShyftBridgeAggregateByThreadId } from '../bridgeSessions';
import {
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
} from '../inboundVoice';
import {
  resolveConnectShyftThreadActions,
  resolveConnectShyftThreadDetailContract,
  type ConnectShyftThreadDetailRecord,
} from '../readContracts';
import { loadConnectShyftPlatformDb } from '../http/accessContext';
import {
  buildConnectShyftThreadReadResponseContext,
  loadConnectShyftThreadReadContractAsync,
  resolveConnectShyftThreadDetailReadAccessContext,
  sendConnectShyftThreadUnavailableRefusal,
} from '../http/threadReadContext';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONNECTSHYFT_CANONICAL_EVENTS_MAX_LIMIT = 200;
const CONNECTSHYFT_INBOX_P95_BUDGET_MS = 750;
const CONNECTSHYFT_INBOX_P99_BUDGET_MS = 1500;

type ConnectShyftThreadTimelineEvent = ConnectShyftCanonicalEventRecord & {
  eventName: string;
  metadata: Record<string, unknown> | null;
  conversationType: 'message' | 'voicemail' | 'lifecycle';
  renderMode: 'inline';
  firstClass: boolean;
};

type ConnectShyftVoicemailArtifactContract = {
  artifactId: string;
  transcription: {
    available: boolean;
    text: string | null;
  };
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const nowIsoUtc = (): string => new Date().toISOString();

const buildProviderNeutralBridgeSessionState = (aggregate: {
  session: {
    id: string;
    status: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  };
  operatorLeg: {
    id: string;
    status: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  };
  neighborLeg: {
    id: string;
    status: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  };
}) => ({
  bridgeSessionId: aggregate.session.id,
  status: aggregate.session.status,
  sessionState: aggregate.session.status,
  failureCode: normalizeString(aggregate.session.failureCode) || null,
  failureMessage: normalizeString(aggregate.session.failureMessage) || null,
  operatorLegState: aggregate.operatorLeg.status,
  neighborLegState: aggregate.neighborLeg.status,
  operatorLeg: {
    legId: aggregate.operatorLeg.id,
    status: aggregate.operatorLeg.status,
    failureCode: normalizeString(aggregate.operatorLeg.failureCode) || null,
    failureMessage: normalizeString(aggregate.operatorLeg.failureMessage) || null,
  },
  neighborLeg: {
    legId: aggregate.neighborLeg.id,
    status: aggregate.neighborLeg.status,
    failureCode: normalizeString(aggregate.neighborLeg.failureCode) || null,
    failureMessage: normalizeString(aggregate.neighborLeg.failureMessage) || null,
  },
});

const resolveThreadTimelineConversationType = (
  eventName: string,
): 'message' | 'voicemail' | 'lifecycle' => {
  const normalized = normalizeString(eventName).toLowerCase();
  if (
    normalized.includes('voicemail')
    || normalized.includes('transcription')
    || normalized.includes('voice.')
  ) {
    return 'voicemail';
  }

  if (
    normalized.includes('message')
    || normalized.includes('sms')
    || normalized.includes('text')
  ) {
    return 'message';
  }

  return 'lifecycle';
};

const listCanonicalThreadEvents = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  limit?: number;
}): Promise<ConnectShyftThreadTimelineEvent[]> => {
  const events = await listConnectShyftCanonicalEvents({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    aggregateId: input.threadId,
    aggregateType: 'Thread',
    limit: input.limit,
    db: loadConnectShyftPlatformDb(),
  });

  return events.map((event) => {
    const payload = asRecord(event.payload);
    const metadata = asRecord(payload?.metadata);
    const eventName = typeof payload?.eventName === 'string'
      ? payload.eventName
      : event.eventType;
    const conversationType = resolveThreadTimelineConversationType(eventName);

    return {
      ...event,
      eventName,
      metadata: metadata || null,
      conversationType,
      renderMode: 'inline',
      firstClass: conversationType === 'voicemail' || conversationType === 'message',
    };
  });
};

const resolveVoicemailArtifactsFromTimeline = (
  timeline: ConnectShyftThreadTimelineEvent[],
): ConnectShyftVoicemailArtifactContract[] => {
  const artifacts = new Map<string, ConnectShyftVoicemailArtifactContract>();

  const ensureArtifact = (artifactId: string): ConnectShyftVoicemailArtifactContract => {
    const normalizedArtifactId = normalizeString(artifactId);
    const existing = artifacts.get(normalizedArtifactId);
    if (existing) {
      return existing;
    }

    const created: ConnectShyftVoicemailArtifactContract = {
      artifactId: normalizedArtifactId,
      transcription: {
        available: false,
        text: null,
      },
    };
    artifacts.set(normalizedArtifactId, created);
    return created;
  };

  timeline.forEach((event) => {
    const payload = asRecord(event.payload);
    const voicemailArtifact = asRecord(payload?.voicemailArtifact);
    const payloadArtifactId = normalizeString(voicemailArtifact?.artifactId);
    if (payloadArtifactId) {
      const artifact = ensureArtifact(payloadArtifactId);
      const transcription = asRecord(voicemailArtifact?.transcription);
      const available = transcription?.available === true;
      const text = normalizeString(transcription?.text);
      if (available || text) {
        artifact.transcription = {
          available: available || Boolean(text),
          text: text || artifact.transcription.text,
        };
      }
    }

    if (event.eventName !== CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME) {
      return;
    }

    const metadata = asRecord(event.metadata);
    const transcription = asRecord(payload?.transcription);
    const callbackArtifactId = normalizeString(
      metadata?.voicemailArtifactId
      || payload?.voicemailArtifactId
      || voicemailArtifact?.artifactId,
    );
    if (!callbackArtifactId) {
      return;
    }

    const transcriptText = normalizeString(
      metadata?.transcriptText
      || transcription?.text
      || asRecord(voicemailArtifact?.transcription)?.text,
    );
    const artifact = ensureArtifact(callbackArtifactId);
    artifact.transcription = {
      available: true,
      text: transcriptText || null,
    };
  });

  return Array.from(artifacts.values());
};

const resolveFallbackThreadDetail = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId: string | null;
  requestedRole: string | null;
}): ConnectShyftThreadDetailRecord | null => {
  if (UUID_PATTERN.test(input.threadId)) {
    return null;
  }

  return resolveConnectShyftThreadDetailContract({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    actorUserId: input.actorUserId,
    requestedRole: input.requestedRole,
  });
};

const resolveThreadDetailActions = (thread: ConnectShyftThreadDetailRecord) =>
  [...resolveConnectShyftThreadActions(thread.state)];

export const getConnectThreadDetail = async (req: Request, res: Response) => {
  const readContext = await resolveConnectShyftThreadDetailReadAccessContext(req, res);
  if (!readContext) {
    return;
  }

  let thread = await loadConnectShyftThreadReadContractAsync(readContext);
  if (!thread) {
    thread = resolveFallbackThreadDetail({
      tenantId: readContext.context.tenantId,
      orgUnitId: readContext.context.orgUnitId,
      threadId: readContext.threadId,
      actorUserId: readContext.actorUserId,
      requestedRole: readContext.requestedRole,
    });
  }

  if (!thread) {
    sendConnectShyftThreadUnavailableRefusal(res, readContext.context);
    return;
  }

  thread = {
    ...thread,
    actions: thread.neighborDeleted
      ? []
      : resolveThreadDetailActions(thread),
  };

  const timeline = await listCanonicalThreadEvents({
    tenantId: readContext.context.tenantId,
    orgUnitId: readContext.context.orgUnitId,
    threadId: readContext.threadId,
    limit: CONNECTSHYFT_CANONICAL_EVENTS_MAX_LIMIT,
  });
  const shouldSynthesizeVoicemailTimeline = thread.voicemailIndicator
    || readContext.threadId.toLowerCase().includes('voicemail');
  const resolvedTimeline = timeline.length > 0
    ? timeline
    : shouldSynthesizeVoicemailTimeline
      ? [
        {
          eventId: `${thread.threadId}-voicemail-inline`,
          aggregateId: thread.threadId,
          aggregateType: 'Thread' as const,
          eventType: 'connectshyft.voicemail.inline',
          payload: {
            eventName: 'connectshyft.voicemail.inline',
            summary: thread.display?.voicemailLabel || thread.voicemailLabel || 'Voicemail received',
            metadata: {
              firstClass: true,
            },
          },
          occurredAtUtc: thread.lastActivityAtUtc || nowIsoUtc(),
          eventName: 'connectshyft.voicemail.inline',
          metadata: {
            firstClass: true,
          },
          conversationType: 'voicemail' as const,
          renderMode: 'inline' as const,
          firstClass: true,
        },
      ]
      : [];
  const voicemailArtifacts = resolveVoicemailArtifactsFromTimeline(resolvedTimeline);

  const threadWithCanonicalTimeline = {
    ...thread,
    providerNeutral: true as const,
    statusDerivedFromCanonicalEvents: true as const,
    timeline: resolvedTimeline,
  };
  const activeBridgeSession = await loadConnectShyftBridgeAggregateByThreadId({
    tenantId: readContext.context.tenantId,
    threadId: readContext.threadId,
  });

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
    message: 'ConnectShyft thread detail loaded',
    data: {
      context: buildConnectShyftThreadReadResponseContext(readContext.context),
      thread: threadWithCanonicalTimeline,
      bridgeSession: activeBridgeSession
        ? buildProviderNeutralBridgeSessionState(activeBridgeSession)
        : null,
      voicemailArtifacts,
      actions: threadWithCanonicalTimeline.actions,
      actionMatrix: {
        lockedByState: true,
      },
      outboundPolicy: {
        hiddenPolicyPaths: [],
        explicitActionSurface: true,
      },
      latencyBudgetsMs: {
        p95: CONNECTSHYFT_INBOX_P95_BUDGET_MS,
        p99: CONNECTSHYFT_INBOX_P99_BUDGET_MS,
      },
    },
  });
};
