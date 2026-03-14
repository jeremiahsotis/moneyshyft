import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';
import { createStoryG6Headers } from '../../support/factories/connectShyftStoryG6Factory';
import {
  collectPrimaryCopy,
  type QueueEnvelope,
  readItems,
  type ThreadDetailEnvelope,
  UUID_PATTERN,
} from './g-6-volunteer-contract-boundary-and-regression-hardening.shared';
import './g-6-volunteer-contract-boundary-and-regression-hardening.automate.api.lifecycle-and-replay.cases';

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
  },
);
