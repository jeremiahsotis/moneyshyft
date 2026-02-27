import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD.fixture';

const D4_IMPLEMENTATION_GAP =
  'Story d.4 operator interaction safety contracts (accessibility + override-specific contracts) are still in ready-for-dev state.';

const mapActionLabels = (payload: Record<string, unknown>): string[] => {
  const actions = (payload?.data as Record<string, unknown> | undefined)?.thread as
    | { actions?: Array<{ label?: string } | string> }
    | undefined;

  const values = actions?.actions ?? [];
  return values
    .map((value) => {
      if (typeof value === 'string') {
        return value.trim();
      }
      if (typeof value?.label === 'string') {
        return value.label.trim();
      }
      return '';
    })
    .filter((label) => label.length > 0);
};

test.describe(
  'Story d.4 operator interaction contracts for outbound safety (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] thread-detail action sets remain deterministic by state (UNCLAIMED, CLAIMED, CLOSED) @P0',
      async ({ request, storyDContext, storyDMemberHeaders }) => {
        expect(D4_IMPLEMENTATION_GAP).toContain('ready-for-dev');

        const unclaimedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}`,
          headers: storyDMemberHeaders,
        });
        const claimedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.claimed}`,
          headers: storyDMemberHeaders,
        });
        const closedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.closed}`,
          headers: storyDMemberHeaders,
        });

        expect(unclaimedResponse.status()).toBe(200);
        expect(claimedResponse.status()).toBe(200);
        expect(closedResponse.status()).toBe(200);

        const unclaimedBody = await unclaimedResponse.json();
        const claimedBody = await claimedResponse.json();
        const closedBody = await closedResponse.json();

        expect(mapActionLabels(unclaimedBody)).toEqual(storyDContext.actionSets.UNCLAIMED);
        expect(mapActionLabels(claimedBody)).toEqual(storyDContext.actionSets.CLAIMED);
        expect(mapActionLabels(closedBody)).toEqual(storyDContext.actionSets.CLOSED);
      },
    );

    test.fixme(
      '[P0] CLOSED outbound actions expose explicit same-thread reopen contract and deterministic lifecycle feedback metadata @P0',
      async ({ request, storyDContext, storyDMemberHeaders, storyDOutboundMessagePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.closed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOutboundMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId: storyDContext.threadIds.closed,
              state: 'UNCLAIMED',
            },
            lifecycleEvent: storyDContext.eventNames.reopenedByUser,
            operatorFeedback: expect.stringMatching(/reopened/i),
          },
        });
      },
    );

    test.fixme(
      '[P1] prefers_texting=NO contract exposes override requirement and refusal-safe guidance in response data @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOutboundMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/messages`,
          headers: {
            ...storyDMemberHeaders,
            'x-test-connectshyft-prefers-texting': 'NO',
          },
          data: storyDOutboundMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideRequired,
          refusalType: 'business',
          data: {
            feedback: {
              taxonomy: 'refusal',
              message: expect.stringMatching(/override/i),
            },
          },
        });
      },
    );

    test.fixme(
      '[P1] detail/read envelopes include accessibility-safe action labels and policy feedback taxonomy without hidden paths @P1',
      async ({ request, storyDContext, storyDMemberHeaders, storyDViewerHeaders }) => {
        const allowedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.claimed}`,
          headers: storyDMemberHeaders,
        });
        const refusedResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.claimed}`,
          headers: storyDViewerHeaders,
        });

        expect(allowedResponse.status()).toBe(200);
        expect(refusedResponse.status()).toBe(200);

        const allowedBody = await allowedResponse.json();
        const refusedBody = await refusedResponse.json();
        expect(allowedBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              actions: expect.any(Array),
            },
          },
        });
        expect(refusedBody).toMatchObject({
          ok: false,
          refusalType: 'business',
          data: {
            feedback: {
              taxonomy: 'refusal',
            },
          },
        });
      },
    );
  },
);
