import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC3.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

test.describe(
  'Story c.3 automate - inbox and thread detail read contracts API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] inbox responses enforce deterministic priority ordering with thread-id tie break and orgUnit-scoped metadata @P0',
      async ({ request, storyC3Context, storyC3MemberHeaders, storyC3InboxQuery }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.inbox}${storyC3InboxQuery}`,
          headers: storyC3MemberHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_INBOX_LISTED',
          data: {
            context: {
              tenantId: storyC3Context.tenantId,
              orgUnitId: storyC3Context.orgUnitId,
            },
            items: expect.any(Array),
          },
        });

        const items: Array<{
          threadId: string;
          priorityRank: number;
          lastActivityAtUtc: string;
          lastInboundCsNumberId: string;
          preferredOutboundCsNumberId: string;
        }> = body.data.items;

        const sorted = [...items].sort((a, b) => {
          if (a.priorityRank !== b.priorityRank) {
            return a.priorityRank - b.priorityRank;
          }
          const timeDelta =
            new Date(b.lastActivityAtUtc).getTime() -
            new Date(a.lastActivityAtUtc).getTime();
          return timeDelta !== 0 ? timeDelta : a.threadId.localeCompare(b.threadId);
        });

        expect(items).toEqual(sorted);
        for (const item of items) {
          expect(item.lastInboundCsNumberId).toEqual(expect.any(String));
          expect(item.preferredOutboundCsNumberId).toEqual(expect.any(String));
        }
      },
    );

    test.fixme(
      '[P0] thread detail payloads include canonical action sets for UNCLAIMED CLAIMED and CLOSED states @P0',
      async ({ request, storyC3Context, storyC3MemberHeaders }) => {
        const unclaimedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.threadDetail}/${storyC3Context.threadIds.unclaimed}`,
          headers: storyC3MemberHeaders,
        });
        const claimedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.threadDetail}/${storyC3Context.threadIds.claimed}`,
          headers: storyC3MemberHeaders,
        });
        const closedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.threadDetail}/${storyC3Context.threadIds.closed}`,
          headers: storyC3MemberHeaders,
        });

        expect(unclaimedResponse.status()).toBe(200);
        expect(claimedResponse.status()).toBe(200);
        expect(closedResponse.status()).toBe(200);

        const unclaimedBody = await unclaimedResponse.json();
        const claimedBody = await claimedResponse.json();
        const closedBody = await closedResponse.json();

        expect(unclaimedBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            thread: {
              threadId: storyC3Context.threadIds.unclaimed,
              orgUnitId: storyC3Context.orgUnitId,
              actions: storyC3Context.actionSets.UNCLAIMED,
            },
          },
        });
        expect(claimedBody.data.thread.actions).toEqual(storyC3Context.actionSets.CLAIMED);
        expect(closedBody.data.thread.actions).toEqual(storyC3Context.actionSets.CLOSED);
      },
    );

    test.fixme(
      '[P1] urgency labels map to operator-safe language and never leak raw stage internals @P1',
      async ({ request, storyC3Context, storyC3MemberHeaders, storyC3InboxQuery }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.inbox}${storyC3InboxQuery}`,
          headers: storyC3MemberHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        const items: Array<{ escalationStage: number; urgencyLabel: string }> = body.data.items;

        for (const item of items) {
          if (item.escalationStage === 0) {
            expect(item.urgencyLabel).toBe(storyC3Context.urgencyLabels.stage0);
          } else if (item.escalationStage === 1) {
            expect(item.urgencyLabel).toBe(storyC3Context.urgencyLabels.stage1);
          } else {
            expect(item.urgencyLabel).toBe(storyC3Context.urgencyLabels.stage2Plus);
          }
          expect(item.urgencyLabel).not.toMatch(/stage/i);
        }
      },
    );

    test.fixme(
      '[P1] voicemail on claimed threads remains in Mine with voicemail indicator and no inbox bounce @P1',
      async ({ request, storyC3Context, storyC3MemberHeaders, storyC3MineQuery }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.inbox}${storyC3MineQuery}`,
          headers: storyC3MemberHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_MINE_LISTED',
          data: {
            items: expect.any(Array),
          },
        });

        const voicemailThread = body.data.items.find(
          (item: { threadId: string }) => item.threadId === storyC3Context.threadIds.voicemailClaimed,
        );

        expect(voicemailThread).toMatchObject({
          threadId: storyC3Context.threadIds.voicemailClaimed,
          state: 'CLAIMED',
          voicemailIndicator: true,
          bucket: 'mine',
        });
      },
    );

    test.fixme(
      '[P1] inbox and thread detail success envelopes preserve canonical top-level keys @P1',
      async ({ request, storyC3Context, storyC3MemberHeaders, storyC3InboxQuery }) => {
        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.inbox}${storyC3InboxQuery}`,
          headers: storyC3MemberHeaders,
        });
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.threadDetail}/${storyC3Context.threadIds.claimed}`,
          headers: storyC3MemberHeaders,
        });

        expect(inboxResponse.status()).toBe(200);
        expect(detailResponse.status()).toBe(200);

        const inboxBody = await inboxResponse.json();
        const detailBody = await detailResponse.json();

        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) =>
            Object.prototype.hasOwnProperty.call(inboxBody, key),
          ),
        ).toBe(true);
        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) =>
            Object.prototype.hasOwnProperty.call(detailBody, key),
          ),
        ).toBe(true);
      },
    );
  },
);
