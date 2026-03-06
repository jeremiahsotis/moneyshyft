import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR1.fixture';

test.describe('Story ux-r1 Mobile-First Inbox/Mine/Thread Redesign (ATDD API RED)', () => {
  test.skip(
    '[P0] inbox and mine contracts expose exactly three primary navigation surfaces with no hidden fourth tab @P0',
    async ({ request, storyUxR1Context, storyUxR1MemberHeaders, storyUxR1InboxQuery, storyUxR1MineQuery }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.inbox}${storyUxR1InboxQuery}`,
        headers: storyUxR1MemberHeaders,
      });
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.inbox}${storyUxR1MineQuery}`,
        headers: storyUxR1MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);

      const inboxBody = await inboxResponse.json();
      const mineBody = await mineResponse.json();

      expect(inboxBody).toMatchObject({
        ok: true,
        data: {
          navigation: {
            primaryTabs: [...storyUxR1Context.navModel.primaryTabs],
          },
        },
      });
      expect(mineBody).toMatchObject({
        ok: true,
        data: {
          navigation: {
            primaryTabs: [...storyUxR1Context.navModel.primaryTabs],
          },
        },
      });

      const inboxPrimaryTabs = inboxBody?.data?.navigation?.primaryTabs ?? [];
      const minePrimaryTabs = mineBody?.data?.navigation?.primaryTabs ?? [];
      expect(Array.isArray(inboxPrimaryTabs)).toBe(true);
      expect(Array.isArray(minePrimaryTabs)).toBe(true);
      expect(inboxPrimaryTabs.length).toBe(3);
      expect(minePrimaryTabs.length).toBe(3);
    },
  );

  test.skip(
    '[P0] inbox and mine card contracts publish minimum readability and tap-target thresholds for large-card hierarchy @P0',
    async ({ request, storyUxR1Context, storyUxR1MemberHeaders, storyUxR1InboxQuery }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.inbox}${storyUxR1InboxQuery}`,
        headers: storyUxR1MemberHeaders,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      const cardContract = body?.data?.layout?.cardContract;
      expect(cardContract).toMatchObject({
        hierarchy: 'large-card',
      });
      expect(Number(cardContract?.minBodyTextPx)).toBeGreaterThanOrEqual(
        storyUxR1Context.readability.minBodyTextPx,
      );
      expect(Number(cardContract?.primaryActionMinTapTargetPx)).toBeGreaterThanOrEqual(
        storyUxR1Context.readability.minTapTargetPx,
      );
    },
  );

  test.skip(
    '[P0] thread detail action matrix remains state explicit across unclaimed claimed and closed contracts @P0',
    async ({ request, storyUxR1Context, storyUxR1MemberHeaders }) => {
      const unclaimedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.threadDetail}/${storyUxR1Context.threadIds.unclaimed}`,
        headers: storyUxR1MemberHeaders,
      });
      const claimedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.threadDetail}/${storyUxR1Context.threadIds.claimed}`,
        headers: storyUxR1MemberHeaders,
      });
      const closedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.threadDetail}/${storyUxR1Context.threadIds.closed}`,
        headers: storyUxR1MemberHeaders,
      });

      expect(unclaimedResponse.status()).toBe(200);
      expect(claimedResponse.status()).toBe(200);
      expect(closedResponse.status()).toBe(200);

      const unclaimedBody = await unclaimedResponse.json();
      const claimedBody = await claimedResponse.json();
      const closedBody = await closedResponse.json();

      expect(unclaimedBody?.data?.thread?.actions).toEqual(storyUxR1Context.actionSets.UNCLAIMED);
      expect(claimedBody?.data?.thread?.actions).toEqual(storyUxR1Context.actionSets.CLAIMED);
      expect(closedBody?.data?.thread?.actions).toEqual(storyUxR1Context.actionSets.CLOSED);
    },
  );

  test.skip(
    '[P1] thread detail and mine contracts preserve neighbor conference and voicemail discoverability across responsive modes @P1',
    async ({ request, storyUxR1Context, storyUxR1MemberHeaders, storyUxR1MineQuery }) => {
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.inbox}${storyUxR1MineQuery}`,
        headers: storyUxR1MemberHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR1Context.paths.threadDetail}/${storyUxR1Context.threadIds.claimed}`,
        headers: storyUxR1MemberHeaders,
      });

      expect(mineResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const mineBody = await mineResponse.json();
      const detailBody = await detailResponse.json();

      const voicemailThread = (mineBody?.data?.items ?? []).find(
        (item: { threadId?: string }) => item.threadId === storyUxR1Context.threadIds.voicemailClaimed,
      );

      expect(voicemailThread).toMatchObject({
        threadId: storyUxR1Context.threadIds.voicemailClaimed,
        voicemailIndicator: true,
        bucket: 'mine',
      });
      expect(detailBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            context: {
              neighbor: expect.objectContaining({
                id: expect.any(String),
              }),
              conference: expect.objectContaining({
                id: expect.any(String),
              }),
            },
          },
          responsiveBreakpoints: {
            mobile: expect.objectContaining({
              preservesActionDiscoverability: true,
            }),
            tablet: expect.objectContaining({
              preservesActionDiscoverability: true,
            }),
            desktop: expect.objectContaining({
              preservesActionDiscoverability: true,
            }),
          },
        },
      });
    },
  );
});
