import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC3.fixture';

test.describe('Story c.3 Inbox and Thread Detail Read Contracts (ATDD API RED)', () => {
  test.skip(
    '[P0] inbox endpoint enforces deterministic priority ordering with priority_rank and thread_id tie-break semantics @P0',
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
          items: expect.any(Array),
        },
      });

      const items: Array<{
        threadId: string;
        priorityRank: number;
        lastActivityAtUtc: string;
      }> = body.data.items;

      const sorted = [...items].sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) {
          return a.priorityRank - b.priorityRank;
        }
        const activityDelta =
          new Date(b.lastActivityAtUtc).getTime() -
          new Date(a.lastActivityAtUtc).getTime();
        return activityDelta !== 0
          ? activityDelta
          : a.threadId.localeCompare(b.threadId);
      });

      expect(items).toEqual(sorted);
    },
  );

  test.skip(
    '[P0] inbox and detail payloads include orgUnit-scoped number metadata required for operator outbound context @P0',
    async ({ request, storyC3Context, storyC3MemberHeaders, storyC3InboxQuery }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyC3Context.paths.inbox}${storyC3InboxQuery}`,
        headers: storyC3MemberHeaders,
      });
      expect(inboxResponse.status()).toBe(200);

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyC3Context.paths.threadDetail}/${storyC3Context.threadIds.claimed}`,
        headers: storyC3MemberHeaders,
      });
      expect(detailResponse.status()).toBe(200);

      const detailBody = await detailResponse.json();
      expect(detailBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
        data: {
          thread: {
            threadId: storyC3Context.threadIds.claimed,
            orgUnitId: storyC3Context.orgUnitId,
            lastInboundCsNumberId: expect.any(String),
            preferredOutboundCsNumberId: expect.any(String),
          },
        },
      });
    },
  );

  test.skip(
    '[P1] urgency labels map from stage values to operator-safe language and never expose raw stage internals @P1',
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
      }
    },
  );

  test.skip(
    '[P0] thread detail action sets match canonical lifecycle state contracts for UNCLAIMED CLAIMED and CLOSED @P0',
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

      expect(unclaimedBody.data.thread.actions).toEqual(storyC3Context.actionSets.UNCLAIMED);
      expect(claimedBody.data.thread.actions).toEqual(storyC3Context.actionSets.CLAIMED);
      expect(closedBody.data.thread.actions).toEqual(storyC3Context.actionSets.CLOSED);
    },
  );

  test.skip(
    '[P1] voicemail on claimed thread remains in mine list with voicemail indicator and does not force inbox reclassification @P1',
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
});
