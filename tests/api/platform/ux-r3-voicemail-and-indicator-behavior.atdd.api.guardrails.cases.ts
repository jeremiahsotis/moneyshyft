import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';

test.describe(
  'Story ux-r3 Voicemail and Indicator Behavior (ATDD API RED) - Guardrails',
  () => {
    test(
      '[UXR3-ATDD-API-005][P2] unauthenticated inbox reads are refused with auth-context security envelope @P2',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3InboxQuery,
      }) => {
        const unauthenticatedHeaders: Record<string, string> = {
          ...storyUxR3AdminHeaders,
          'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
        };
        delete unauthenticatedHeaders.cookie;

        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3InboxQuery}`,
          headers: unauthenticatedHeaders,
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_AUTH_CONTEXT_REQUIRED',
          refusalType: 'security',
        });
        expect(body).not.toHaveProperty('data.items');
      },
    );
  },
);
