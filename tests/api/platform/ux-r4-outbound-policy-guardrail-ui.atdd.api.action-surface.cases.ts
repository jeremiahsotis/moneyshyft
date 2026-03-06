import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR4.fixture';

test.describe('Story ux-r4 Outbound Policy Guardrail UI (ATDD API) - Action Surface', () => {
  test(
    '[UXR4-ATDD-API-001][P0] thread detail contract exposes explicit action controls per lifecycle state with no hidden policy paths @P0',
    async ({ request, storyUxR4Context, storyUxR4OperatorHeaders }) => {
      const [unclaimedResponse, claimedResponse, closedResponse] = await Promise.all([
        apiRequest(request, {
          method: 'GET',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimed}`,
          headers: storyUxR4OperatorHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.claimed}`,
          headers: storyUxR4OperatorHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.closed}`,
          headers: storyUxR4OperatorHeaders,
        }),
      ]);

      expect(unclaimedResponse.status()).toBe(200);
      expect(claimedResponse.status()).toBe(200);
      expect(closedResponse.status()).toBe(200);

      const [unclaimedBody, claimedBody, closedBody] = await Promise.all([
        unclaimedResponse.json(),
        claimedResponse.json(),
        closedResponse.json(),
      ]);

      expect(unclaimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'UNCLAIMED',
          },
          actions: ['Call', 'Text', 'Claim'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
      expect(claimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLAIMED',
          },
          actions: ['Call', 'Text', 'Close'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
      expect(closedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLOSED',
          },
          actions: ['Call', 'Send Message'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
    },
  );

  test(
    '[UXR4-ATDD-API-002][P1] role-admin path preserves explicit action ordering and exposes Take Over on claimed threads @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4TenantAdminHeaders,
    }) => {
      const claimedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.claimed}`,
        headers: storyUxR4TenantAdminHeaders,
      });

      expect(claimedResponse.status()).toBe(200);
      const claimedBody = await claimedResponse.json();
      expect(claimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLAIMED',
          },
          actions: ['Call', 'Take Over', 'Text', 'Close'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
    },
  );
});
