import { Request, Response } from 'express';
import {
  error as errorEnvelope,
  refusal,
  success,
} from '../../../platform/envelopes/response';
import { PeopleCorePersistenceUnavailableError } from '../../peoplecore/service';
import {
  enforceConnectShyftCapability,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
} from '../http/accessContext';
import {
  personRebindServiceAsync,
  type UnifiedPersonTimeline,
  type UnifiedPersonTimelineItem,
} from '../personRebind';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnifiedPersonTimelineItemDto = {
  id: string;
  thread_id: string;
  type: 'message' | 'voice_event' | 'voicemail';
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'voice' | 'voicemail';
  body: string | null;
  occurred_at_utc: string;
  actor: 'system' | 'user' | 'neighbor';
  provider_metadata: Record<string, unknown> | null;
  delivery_status: string | null;
  person_context: {
    person_id: string;
    origin_person_id: string | null;
  };
  recording_url?: string | null;
  duration_seconds?: number | null;
  transcript?: string | null;
};

type UnifiedPersonTimelineDto = {
  person_id: string;
  merged_person_ids: string[];
  items: UnifiedPersonTimelineItemDto[];
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const serializeUnifiedTimelineItem = (
  item: UnifiedPersonTimelineItem,
): UnifiedPersonTimelineItemDto => {
  const base = {
    id: item.id,
    thread_id: item.threadId,
    type: item.type,
    direction: item.direction,
    channel: item.channel,
    body: item.body,
    occurred_at_utc: item.occurredAtUtc,
    actor: item.actor,
    provider_metadata: item.providerMetadata,
    delivery_status: item.deliveryStatus,
    person_context: {
      person_id: item.personContext.personId,
      origin_person_id: item.personContext.originPersonId,
    },
  } satisfies UnifiedPersonTimelineItemDto;

  if (item.type !== 'voicemail') {
    return base;
  }

  return {
    ...base,
    recording_url: item.recordingUrl,
    duration_seconds: item.durationSeconds,
    transcript: item.transcript,
  };
};

const serializeUnifiedTimeline = (
  timeline: UnifiedPersonTimeline,
): UnifiedPersonTimelineDto => ({
  person_id: timeline.personId,
  merged_person_ids: [...timeline.mergedPersonIds],
  items: timeline.items.map(serializeUnifiedTimelineItem),
});

export const getUnifiedTimeline = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const personId = normalizeString(req.params?.personId);
  if (!UUID_PATTERN.test(personId)) {
    refusal(res, {
      code: 'CONNECTSHYFT_PERSON_ID_INVALID',
      message: 'personId must be a non-empty UUID.',
      refusalType: 'client',
      httpStatus: 400,
      data: {
        fieldErrors: [
          {
            field: 'personId',
            reason: 'INVALID',
            message: 'personId must be a non-empty UUID.',
          },
        ],
      },
    });
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  try {
    const timeline = await personRebindServiceAsync.projectUnifiedTimeline({
      tenantId: contextDecision.context.tenantId,
      personId,
    });

    return success(res, {
      code: 'CONNECTSHYFT_UNIFIED_TIMELINE_LOADED',
      message: 'ConnectShyft unified timeline loaded',
      httpStatus: 200,
      data: serializeUnifiedTimeline(timeline),
    });
  } catch (error) {
    if (error instanceof PeopleCorePersistenceUnavailableError) {
      errorEnvelope(res, {
        code: error.code,
        message: error.message,
        httpStatus: 503,
      });
      return;
    }

    throw error;
  }
};
