import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR1.fixture';

const UX_R1_API_IMPLEMENTATION_GAP =
  'Story ux-r1 API contract extensions are not fully implemented yet (navigation/card-contract/responsive metadata).';
const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

test.describe(
  'Story ux-r1 automate - mobile-first inbox/mine/thread redesign API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] inbox and mine contracts expose exactly three primary navigation surfaces with no hidden fourth tab @P0',
      async ({
        request,
        storyUxR1Context,
        storyUxR1MemberHeaders,
        storyUxR1InboxQuery,
        storyUxR1MineQuery,
      }) => {
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

        expect(UX_R1_API_IMPLEMENTATION_GAP).toContain('ux-r1');
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
        expect(inboxBody?.data?.navigation?.hiddenPrimaryTabs ?? []).toEqual([]);
        expect(mineBody?.data?.navigation?.hiddenPrimaryTabs ?? []).toEqual([]);
      },
    );

    test.fixme(
      '[P0] inbox and mine card contracts publish readability and tap-target thresholds for large-card hierarchy @P0',
      async ({
        request,
        storyUxR1Context,
        storyUxR1MemberHeaders,
        storyUxR1InboxQuery,
        storyUxR1MineQuery,
      }) => {
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

        const inboxCardContract = inboxBody?.data?.layout?.cardContract;
        const mineCardContract = mineBody?.data?.layout?.cardContract;

        expect(inboxCardContract).toMatchObject({
          hierarchy: 'large-card',
        });
        expect(mineCardContract).toMatchObject({
          hierarchy: 'large-card',
        });

        expect(Number(inboxCardContract?.minBodyTextPx)).toBeGreaterThanOrEqual(
          storyUxR1Context.readability.minBodyTextPx,
        );
        expect(Number(inboxCardContract?.primaryActionMinTapTargetPx)).toBeGreaterThanOrEqual(
          storyUxR1Context.readability.minTapTargetPx,
        );
        expect(Number(mineCardContract?.minBodyTextPx)).toBeGreaterThanOrEqual(
          storyUxR1Context.readability.minBodyTextPx,
        );
        expect(Number(mineCardContract?.primaryActionMinTapTargetPx)).toBeGreaterThanOrEqual(
          storyUxR1Context.readability.minTapTargetPx,
        );
      },
    );

    test.fixme(
      '[P0] thread detail action matrix remains state explicit across UNCLAIMED CLAIMED and CLOSED contracts @P0',
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

    test.fixme(
      '[P1] thread detail and mine contracts preserve neighbor conference voicemail and responsive discoverability metadata @P1',
      async ({
        request,
        storyUxR1Context,
        storyUxR1MemberHeaders,
        storyUxR1MineQuery,
      }) => {
        const mineResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR1Context.paths.inbox}${storyUxR1MineQuery}`,
          headers: storyUxR1MemberHeaders,
        });
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR1Context.paths.threadDetail}/${storyUxR1Context.threadIds.voicemailClaimed}`,
          headers: storyUxR1MemberHeaders,
        });

        expect(mineResponse.status()).toBe(200);
        expect(detailResponse.status()).toBe(200);

        const mineBody = await mineResponse.json();
        const detailBody = await detailResponse.json();

        const voicemailThread = (mineBody?.data?.items ?? []).find(
          (item: { threadId?: string }) =>
            item.threadId === storyUxR1Context.threadIds.voicemailClaimed,
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

    test.fixme(
      '[P1] inbox and thread detail envelopes keep canonical top-level keys during ux-r1 contract responses @P1',
      async ({ request, storyUxR1Context, storyUxR1MemberHeaders, storyUxR1InboxQuery }) => {
        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR1Context.paths.inbox}${storyUxR1InboxQuery}`,
          headers: storyUxR1MemberHeaders,
        });
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR1Context.paths.threadDetail}/${storyUxR1Context.threadIds.claimed}`,
          headers: storyUxR1MemberHeaders,
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
