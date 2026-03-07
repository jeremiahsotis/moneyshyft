import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';
import { createStoryG6Headers } from '../../support/factories/connectShyftStoryG6Factory';

type QueueItem = {
  threadId?: string;
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
  refusalType?: string;
  data?: {
    context?: {
      tenantId?: string;
      orgUnitId?: string;
      bypassedOrgUnitMembership?: boolean;
    };
    items?: QueueItem[];
  };
};

type ThreadDetailEnvelope = {
  ok?: boolean;
  code?: string;
  refusalType?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
    };
    lifecycle?: {
      priorState?: string;
      nextState?: string;
      reopenedFromClosed?: boolean;
      reopenedByInbound?: boolean;
      sameThreadId?: boolean;
      noInboundAutoReopenSideEffects?: boolean;
    };
    uiFeedback?: {
      severity?: string;
      ariaLive?: string;
      presentation?: string;
    };
  };
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
    replaySafe?: {
      duplicate?: boolean;
      suppressedDomainWrites?: boolean;
      dedupeKey?: string | null;
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

test.describe(
  'Story g.6 Volunteer Contract Boundary and Regression Hardening (Automate API Expansion)',
  () => {
    test(
      '[G6-AUTO-API-301][P0] tenant-privileged volunteer read contracts preserve membership-bypass context without leaking internal display metadata @P0',
      async ({
        request,
        storyG6Context,
        storyG6InboxQuery,
        storyG6MineQuery,
      }) => {
        const tenantViewerHeaders = createStoryG6Headers(storyG6Context, {
          role: 'TENANT_VIEWER',
          userId: storyG6Context.viewerUserId,
          orgUnitMemberships: [],
        });

        const [inboxResponse, mineResponse] = await Promise.all([
          apiRequest(request, {
            method: 'GET',
            path: `${storyG6Context.paths.inbox}${storyG6InboxQuery}`,
            headers: tenantViewerHeaders,
          }),
          apiRequest(request, {
            method: 'GET',
            path: `${storyG6Context.paths.inbox}${storyG6MineQuery}`,
            headers: tenantViewerHeaders,
          }),
        ]);

        expect(inboxResponse.status()).toBe(200);
        expect(mineResponse.status()).toBe(200);

        const inboxBody = (await inboxResponse.json()) as QueueEnvelope;
        const mineBody = (await mineResponse.json()) as QueueEnvelope;

        expect(inboxBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_INBOX_LISTED',
          data: {
            context: {
              tenantId: storyG6Context.tenantId,
              orgUnitId: storyG6Context.orgUnitId,
              bypassedOrgUnitMembership: true,
            },
          },
        });
        expect(mineBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_MINE_LISTED',
          data: {
            context: {
              tenantId: storyG6Context.tenantId,
              orgUnitId: storyG6Context.orgUnitId,
              bypassedOrgUnitMembership: true,
            },
          },
        });

        const inboxItems = readItems(inboxBody);
        expect(inboxItems.length).toBeGreaterThan(0);

        for (const item of inboxItems) {
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
      '[G6-AUTO-API-302][P0] non-capability actor receives deterministic thread-view refusal for inbox and thread detail routes @P0',
      async ({ request, storyG6Context, storyG6InboxQuery }) => {
        const restrictedHeaders = createStoryG6Headers(storyG6Context, {
          role: 'CONNECTSHYFT_GUEST',
          userId: 'user-connectshyft-g6-guest',
          orgUnitMemberships: [storyG6Context.orgUnitId],
        });

        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyG6Context.paths.inbox}${storyG6InboxQuery}`,
          headers: restrictedHeaders,
        });
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}`,
          headers: restrictedHeaders,
        });

        expect(inboxResponse.status()).toBe(200);
        expect(detailResponse.status()).toBe(200);

        const inboxBody = (await inboxResponse.json()) as QueueEnvelope;
        const detailBody = (await detailResponse.json()) as ThreadDetailEnvelope;

        expect(inboxBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
          refusalType: 'business',
        });
        expect(detailBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
          refusalType: 'business',
        });
      },
    );

    test(
      '[G6-AUTO-API-303][P0] repeated CLOSED outbound call dispatches keep same-thread reopen lifecycle semantics deterministic across requests @P0',
      async ({
        request,
        storyG6Context,
        storyG6VolunteerHeaders,
        storyG6OutboundCallPayload,
      }) => {
        const firstDispatch = await apiRequest(request, {
          method: 'POST',
          path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
          headers: storyG6VolunteerHeaders,
          data: storyG6OutboundCallPayload,
        });
        const secondDispatch = await apiRequest(request, {
          method: 'POST',
          path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
          headers: storyG6VolunteerHeaders,
          data: storyG6OutboundCallPayload,
        });

        expect(firstDispatch.status()).toBe(200);
        expect(secondDispatch.status()).toBe(200);

        const firstBody = (await firstDispatch.json()) as ThreadDetailEnvelope;
        const secondBody = (await secondDispatch.json()) as ThreadDetailEnvelope;

        for (const body of [firstBody, secondBody]) {
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
        }
      },
    );

    test(
      '[G6-AUTO-API-304][P1] duplicate inbound events on CLOSED thread are replay-safe and keep state locked with no auto-reopen side effects @P1',
      async ({
        request,
        storyG6Context,
        storyG6AdminHeaders,
        storyG6InboundClosedPayload,
      }) => {
        const duplicatePayload = {
          ...storyG6InboundClosedPayload,
        };

        const firstWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyG6Context.paths.inboundWebhook,
          headers: storyG6AdminHeaders,
          data: duplicatePayload,
        });
        const duplicateWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyG6Context.paths.inboundWebhook,
          headers: storyG6AdminHeaders,
          data: duplicatePayload,
        });

        expect(firstWebhookResponse.status()).toBe(200);
        expect(duplicateWebhookResponse.status()).toBe(200);

        const firstBody = (await firstWebhookResponse.json()) as InboundWebhookEnvelope;
        const duplicateBody = (await duplicateWebhookResponse.json()) as InboundWebhookEnvelope;

        expect(firstBody).toMatchObject({
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
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });
        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
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
  },
);
