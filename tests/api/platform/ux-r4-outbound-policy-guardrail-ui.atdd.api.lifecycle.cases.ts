import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR4.fixture';

test.describe('Story ux-r4 Outbound Policy Guardrail UI (ATDD API) - Lifecycle Reopen', () => {
  test(
    '[UXR4-ATDD-API-007][P0] outbound action from CLOSED thread reopens the same thread to UNCLAIMED before dispatch @P0',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4OutboundCallPayload,
    }) => {
      // Use a dedicated CLOSED fixture thread for mutation to reduce cross-test coupling.
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.closedPrefersNo}/call`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4OutboundCallPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toMatchObject({
        ok: true,
        code: storyUxR4Context.envelopeCodes.callSuccess,
        data: {
          thread: {
            threadId: storyUxR4Context.threadIds.closedPrefersNo,
            state: 'UNCLAIMED',
          },
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
          },
          lifecycleEvent: storyUxR4Context.eventNames.reopenedByUser,
          uiFeedback: {
            severity: 'success',
            ariaLive: 'polite',
            hiddenTransition: false,
          },
        },
      });
    },
  );
});
