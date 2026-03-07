import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';

type QueueItem = {
  threadId?: string;
  bucket?: string;
  state?: string;
  voicemailIndicator?: boolean;
  display?: {
    title?: string;
    preview?: string;
    timestampLabel?: string;
    urgencyLabel?: string;
    stateLabel?: string;
    contextPills?: string[];
    voicemailLabel?: string;
    inboundContext?: string;
    outboundContext?: string;
    neighborContext?: string;
    conferenceContext?: string;
    threadId?: string;
    priorityRank?: number;
    rawStateChip?: string;
    routingMetadata?: unknown;
    webhookMetadata?: unknown;
    systemMetadata?: unknown;
  };
};

type QueueEnvelope = {
  ok?: boolean;
  code?: string;
  data?: {
    items?: QueueItem[];
  };
};

type ThreadDetailEnvelope = {
  ok?: boolean;
  code?: string;
  errorType?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
      timeline?: Array<{
        conversationType?: string;
        renderMode?: string;
        firstClass?: boolean;
      }>;
    };
    lifecycle?: {
      priorState?: string;
      nextState?: string;
      reopenedByInbound?: boolean;
      reopenedFromClosed?: boolean;
      sameThreadId?: boolean;
      noInboundAutoReopenSideEffects?: boolean;
    };
    uiFeedback?: {
      severity?: string;
      ariaLive?: string;
      presentation?: string;
      message?: string;
    };
    feedback?: {
      taxonomy?: string;
    };
  };
  refusalType?: string;
};

type InboundWebhookEnvelope = {
  ok?: boolean;
  code?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
    };
    lifecycle?: {
      reopenedByInbound?: boolean;
    };
    timeline?: {
      routingDecision?: string;
    };
  };
};

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const collectPrimaryCopy = (item: QueueItem): string[] => {
  const fields: string[] = [];

  const collect = (value: unknown): void => {
    if (typeof value !== 'string') {
      return;
    }

    const normalized = value.trim();
    if (normalized.length > 0) {
      fields.push(normalized);
    }
  };

  collect(item.display?.title);
  collect(item.display?.preview);
  collect(item.display?.timestampLabel);
  collect(item.display?.urgencyLabel);
  collect(item.display?.stateLabel);
  collect(item.display?.voicemailLabel);
  collect(item.display?.inboundContext);
  collect(item.display?.outboundContext);
  collect(item.display?.neighborContext);
  collect(item.display?.conferenceContext);

  if (Array.isArray(item.display?.contextPills)) {
    for (const pill of item.display.contextPills) {
      collect(pill);
    }
  }

  return fields;
};

const readItems = (body: QueueEnvelope): QueueItem[] => {
  if (!Array.isArray(body.data?.items)) {
    return [];
  }

  return body.data.items;
};

const resolveFeedbackTaxonomy = (
  body: ThreadDetailEnvelope,
): 'success' | 'refusal' | 'error' | null => {
  const explicitTaxonomy = body.data?.feedback?.taxonomy ?? body.data?.uiFeedback?.severity;
  if (explicitTaxonomy === 'success' || explicitTaxonomy === 'refusal' || explicitTaxonomy === 'error') {
    return explicitTaxonomy;
  }

  if (body.ok === true) {
    return 'success';
  }

  if (body.refusalType === 'business') {
    return 'refusal';
  }

  if (body.ok === false || body.errorType === 'system') {
    return 'error';
  }

  return null;
};

test.describe('Story g.6 Volunteer Contract Boundary and Regression Hardening (ATDD API RED)', () => {
  test(
    '[G6-ATDD-API-001][P0] volunteer queue display contracts suppress raw internal metadata and only expose display-safe fields @P0',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6InboxQuery,
      storyG6MineQuery,
    }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6InboxQuery}`,
        headers: storyG6VolunteerHeaders,
      });
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6MineQuery}`,
        headers: storyG6VolunteerHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as QueueEnvelope;
      const mineBody = (await mineResponse.json()) as QueueEnvelope;
      const items = [...readItems(inboxBody), ...readItems(mineBody)];

      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        expect(item.display).toBeDefined();

        for (const forbiddenField of storyG6Context.forbiddenDisplayFields) {
          expect(item.display).not.toHaveProperty(forbiddenField);
        }

        const loweredCopy = collectPrimaryCopy(item).join(' ').toLowerCase();
        expect(loweredCopy.length).toBeGreaterThan(0);

        for (const token of storyG6Context.forbiddenPrimaryCopyTokens) {
          expect(loweredCopy).not.toContain(token);
        }

        expect(loweredCopy).not.toMatch(UUID_PATTERN);
      }
    },
  );

  test(
    '[G6-ATDD-API-002][P0] voicemail behavior lock keeps claimed voicemail thread in Mine and renders voicemail as first-class timeline content @P0',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6InboxQuery,
      storyG6MineQuery,
    }) => {
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6MineQuery}`,
        headers: storyG6VolunteerHeaders,
      });
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6InboxQuery}`,
        headers: storyG6VolunteerHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.mineVoicemail}`,
        headers: storyG6VolunteerHeaders,
      });

      expect(mineResponse.status()).toBe(200);
      expect(inboxResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const mineBody = (await mineResponse.json()) as QueueEnvelope;
      const inboxBody = (await inboxResponse.json()) as QueueEnvelope;
      const detailBody = (await detailResponse.json()) as ThreadDetailEnvelope;

      const mineVoicemail = readItems(mineBody).find(
        (item) => item.threadId === storyG6Context.threadIds.mineVoicemail,
      );
      const inboxVoicemail = readItems(inboxBody).find(
        (item) => item.threadId === storyG6Context.threadIds.mineVoicemail,
      );

      expect(mineVoicemail).toBeDefined();
      expect(mineVoicemail?.bucket).toBe('mine');
      expect(mineVoicemail?.voicemailIndicator).toBe(true);
      expect(inboxVoicemail).toBeUndefined();

      const timeline = Array.isArray(detailBody.data?.thread?.timeline)
        ? detailBody.data.thread.timeline
        : [];
      expect(timeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            conversationType: 'voicemail',
            renderMode: 'inline',
            firstClass: true,
          }),
        ]),
      );
    },
  );

  test(
    '[G6-ATDD-API-003][P0] CLOSED outbound actions preserve same-thread reopen lifecycle semantics and deterministic feedback contracts @P0',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6OutboundCallPayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
        headers: storyG6VolunteerHeaders,
        data: storyG6OutboundCallPayload,
      });

      expect(response.status()).toBe(200);

      const body = (await response.json()) as ThreadDetailEnvelope;
      expect(body.ok).toBe(true);
      expect(body.data?.thread).toMatchObject({
        threadId: storyG6Context.threadIds.closedOutbound,
        state: 'UNCLAIMED',
      });
      expect(body.data?.lifecycle).toMatchObject({
        priorState: 'CLOSED',
        nextState: 'UNCLAIMED',
        reopenedFromClosed: true,
        reopenedByInbound: false,
        sameThreadId: true,
        noInboundAutoReopenSideEffects: true,
      });
      expect(body.data?.uiFeedback).toMatchObject({
        severity: 'success',
        ariaLive: 'polite',
        presentation: 'contextual-action-feedback',
      });
    },
  );

  test(
    '[G6-ATDD-API-004][P0] inbound webhook activity on CLOSED threads keeps state locked and routes fallback without auto-reopen @P0',
    async ({
      request,
      storyG6Context,
      storyG6AdminHeaders,
      storyG6InboundClosedPayload,
    }) => {
      const webhookResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG6Context.paths.inboundWebhook,
        headers: storyG6AdminHeaders,
        data: storyG6InboundClosedPayload,
      });

      expect(webhookResponse.status()).toBe(200);
      const webhookBody = (await webhookResponse.json()) as InboundWebhookEnvelope;
      expect(webhookBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          thread: {
            threadId: storyG6Context.threadIds.closedInbound,
            state: 'CLOSED',
          },
          lifecycle: {
            reopenedByInbound: false,
          },
          timeline: {
            routingDecision: 'intake_fallback',
          },
        },
      });

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedInbound}`,
        headers: storyG6AdminHeaders,
      });

      expect(detailResponse.status()).toBe(200);
      const detailBody = (await detailResponse.json()) as ThreadDetailEnvelope;
      expect(detailBody.data?.thread?.state).toBe('CLOSED');
    },
  );

  test(
    '[G6-ATDD-API-005][P1] volunteer action feedback contracts publish explicit success/refusal/error taxonomy without contradictory messaging @P1',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6OutboundCallPayload,
    }) => {
      const successResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
        headers: storyG6VolunteerHeaders,
        data: storyG6OutboundCallPayload,
      });
      const refusalResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyG6VolunteerHeaders,
        data: {
          orgUnitId: storyG6Context.orgUnitId,
          channel: 'sms',
          body: 'Outbound attempt without override metadata',
        },
      });
      const errorResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG6Context.paths.threads,
        headers: storyG6VolunteerHeaders,
        data: {
          orgUnitId: storyG6Context.orgUnitId,
          neighborId: storyG6Context.neighborIds.closedInbound,
          source: 'VOICE',
          threadId: 'thread-g6-client-forbidden',
          lastInboundCsNumberId: 'cs-number-ux-r4-403',
          preferredOutboundCsNumberId: 'cs-number-ux-r4-503',
        },
      });

      expect(successResponse.status()).toBe(200);
      expect(refusalResponse.status()).toBe(200);
      expect(errorResponse.status()).toBe(400);

      const successBody = (await successResponse.json()) as ThreadDetailEnvelope;
      const refusalBody = (await refusalResponse.json()) as ThreadDetailEnvelope;
      const errorBody = (await errorResponse.json()) as ThreadDetailEnvelope;

      expect(resolveFeedbackTaxonomy(successBody)).toBe('success');
      expect(refusalBody.refusalType).toBe('business');
      expect(resolveFeedbackTaxonomy(refusalBody)).toBe('refusal');
      expect(errorBody.refusalType).toBe('client');
      expect(resolveFeedbackTaxonomy(errorBody)).toBe('error');
      expect(String(refusalBody.data?.uiFeedback?.message ?? '')).not.toMatch(/reopened|auto-reopen/i);
      expect(String(errorBody.data?.uiFeedback?.message ?? '')).not.toMatch(/reopened|auto-reopen/i);
    },
  );
});
