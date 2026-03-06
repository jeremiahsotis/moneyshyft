import type { TestInfo } from '@playwright/test';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import type { StoryUxR3Context } from '../../support/factories/connectShyftStoryUxR3Factory';

type ThreadSummary = {
  threadId?: string;
  state?: string;
  bucket?: string;
  voicemailIndicator?: boolean;
  voicemailLabel?: string | null;
};

type BuildInboundPayloadInput = {
  context: StoryUxR3Context;
  basePayload: Record<string, unknown>;
  testInfo: TestInfo;
  label: string;
  threadId: string;
  neighborId: string;
  eventType?: StoryUxR3Context['events']['inboundVoicemail'] | StoryUxR3Context['events']['inboundMissedCall'];
};

export const findThreadSummary = (
  items: unknown,
  threadId: string,
): ThreadSummary | undefined => {
  if (!Array.isArray(items)) {
    return undefined;
  }

  return items.find((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }
    return (candidate as { threadId?: unknown }).threadId === threadId;
  }) as ThreadSummary | undefined;
};

export const buildInboundPayload = ({
  context,
  basePayload,
  testInfo,
  label,
  threadId,
  neighborId,
  eventType = context.events.inboundVoicemail,
}: BuildInboundPayloadInput): Record<string, unknown> => ({
  ...basePayload,
  providerEventId: deterministicProviderEventId(
    'provider-event-uxr3-atdd-api',
    testInfo,
    `${label}-event`,
  ),
  providerLegId: `leg-uxr3-atdd-api-${deterministicToken(testInfo, `${label}-leg`)}`,
  threadId,
  neighborId,
  eventType,
});
