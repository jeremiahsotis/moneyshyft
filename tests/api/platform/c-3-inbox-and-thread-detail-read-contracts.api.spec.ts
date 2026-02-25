import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC3.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

test.describe(
  'Story c.3 automate - inbox and thread detail read contracts API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
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
          tenantId: string;
          orgUnitId: string;
          priorityRank: number;
          lastActivityAtUtc: string;
          lastInboundCsNumberId?: string;
          last_inbound_cs_number_id?: string;
          preferredOutboundCsNumberId?: string;
          preferred_outbound_cs_number_id?: string;
          preferredOutboundContext?: {
            csNumberId?: string;
            cs_number_id?: string;
            label?: string;
          };
          preferred_outbound_context?: {
            csNumberId?: string;
            cs_number_id?: string;
            label?: string;
          };
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
          expect(item.tenantId).toBe(storyC3Context.tenantId);
          expect(item.orgUnitId).toBe(storyC3Context.orgUnitId);

          const lastInboundCsNumberId = item.lastInboundCsNumberId
            || item.last_inbound_cs_number_id
            || '';
          const preferredOutboundCsNumberId = item.preferredOutboundCsNumberId
            || item.preferred_outbound_cs_number_id
            || '';
          const preferredOutboundContext = item.preferredOutboundContext
            || item.preferred_outbound_context;
          const preferredOutboundContextNumberId = preferredOutboundContext?.csNumberId
            || preferredOutboundContext?.cs_number_id
            || '';
          const preferredOutboundContextLabel = preferredOutboundContext?.label || '';

          expect(lastInboundCsNumberId).toEqual(expect.any(String));
          expect(lastInboundCsNumberId.length).toBeGreaterThan(0);
          expect(preferredOutboundCsNumberId).toEqual(expect.any(String));
          expect(preferredOutboundCsNumberId.length).toBeGreaterThan(0);
          expect(preferredOutboundContextNumberId).toEqual(expect.any(String));
          expect(preferredOutboundContextNumberId.length).toBeGreaterThan(0);
          expect(preferredOutboundContextLabel).toEqual(expect.any(String));
          expect(preferredOutboundContextLabel.length).toBeGreaterThan(0);
        }
      },
    );

    test(
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

        for (const payload of [unclaimedBody, claimedBody, closedBody]) {
          const thread = payload.data.thread as {
            tenantId: string;
            orgUnitId: string;
            lastInboundCsNumberId?: string;
            last_inbound_cs_number_id?: string;
            preferredOutboundCsNumberId?: string;
            preferred_outbound_cs_number_id?: string;
            preferredOutboundContext?: {
              csNumberId?: string;
              cs_number_id?: string;
              label?: string;
            };
            preferred_outbound_context?: {
              csNumberId?: string;
              cs_number_id?: string;
              label?: string;
            };
          };

          const lastInboundCsNumberId = thread.lastInboundCsNumberId
            || thread.last_inbound_cs_number_id
            || '';
          const preferredOutboundCsNumberId = thread.preferredOutboundCsNumberId
            || thread.preferred_outbound_cs_number_id
            || '';
          const preferredOutboundContext = thread.preferredOutboundContext
            || thread.preferred_outbound_context;
          const preferredOutboundContextNumberId = preferredOutboundContext?.csNumberId
            || preferredOutboundContext?.cs_number_id
            || '';
          const preferredOutboundContextLabel = preferredOutboundContext?.label || '';

          expect(thread.tenantId).toBe(storyC3Context.tenantId);
          expect(thread.orgUnitId).toBe(storyC3Context.orgUnitId);
          expect(lastInboundCsNumberId).toEqual(expect.any(String));
          expect(lastInboundCsNumberId.length).toBeGreaterThan(0);
          expect(preferredOutboundCsNumberId).toEqual(expect.any(String));
          expect(preferredOutboundCsNumberId.length).toBeGreaterThan(0);
          expect(preferredOutboundContextNumberId).toEqual(expect.any(String));
          expect(preferredOutboundContextNumberId.length).toBeGreaterThan(0);
          expect(preferredOutboundContextLabel).toEqual(expect.any(String));
          expect(preferredOutboundContextLabel.length).toBeGreaterThan(0);
        }
      },
    );

    test(
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

    test(
      '[P1] voicemail on claimed threads remains in Mine with voicemail indicator and no inbox bounce @P1',
      async ({
        request,
        storyC3Context,
        storyC3MemberHeaders,
        storyC3MineQuery,
        storyC3InboxQuery,
      }) => {
        const mineResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.inbox}${storyC3MineQuery}`,
          headers: storyC3MemberHeaders,
        });

        expect(mineResponse.status()).toBe(200);
        const mineBody = await mineResponse.json();
        expect(mineBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_MINE_LISTED',
          data: {
            items: expect.any(Array),
          },
        });

        const voicemailThread = mineBody.data.items.find(
          (item: { threadId: string }) => item.threadId === storyC3Context.threadIds.voicemailClaimed,
        );

        expect(voicemailThread).toMatchObject({
          threadId: storyC3Context.threadIds.voicemailClaimed,
          state: 'CLAIMED',
          voicemailIndicator: true,
          bucket: 'mine',
        });

        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC3Context.paths.inbox}${storyC3InboxQuery}`,
          headers: storyC3MemberHeaders,
        });

        expect(inboxResponse.status()).toBe(200);
        const inboxBody = await inboxResponse.json();
        const inboxVoicemailThread = inboxBody.data.items.find(
          (item: { threadId: string }) => item.threadId === storyC3Context.threadIds.voicemailClaimed,
        );
        expect(inboxVoicemailThread).toBeUndefined();
      },
    );

    test(
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

    test(
      '[P1] inbox and thread detail stay within hardened latency budgets when measured in the API harness @P1',
      async ({ request, storyC3Context, storyC3MemberHeaders, storyC3InboxQuery }) => {
        // Warm-up calls avoid one-time runtime costs (startup/JIT/metadata caches) in measured samples.
        for (let warmup = 0; warmup < 3; warmup += 1) {
          const warmupInbox = await apiRequest(request, {
            method: 'GET',
            path: `${storyC3Context.paths.inbox}${storyC3InboxQuery}`,
            headers: storyC3MemberHeaders,
          });
          expect(warmupInbox.status()).toBe(200);

          const warmupDetail = await apiRequest(request, {
            method: 'GET',
            path: `${storyC3Context.paths.threadDetail}/${storyC3Context.threadIds.claimed}`,
            headers: storyC3MemberHeaders,
          });
          expect(warmupDetail.status()).toBe(200);
        }

        const inboxDurations: number[] = [];
        const detailDurations: number[] = [];

        for (let run = 0; run < 20; run += 1) {
          const inboxStartedAt = Date.now();
          const inboxResponse = await apiRequest(request, {
            method: 'GET',
            path: `${storyC3Context.paths.inbox}${storyC3InboxQuery}`,
            headers: storyC3MemberHeaders,
          });
          inboxDurations.push(Date.now() - inboxStartedAt);
          expect(inboxResponse.status()).toBe(200);

          const detailStartedAt = Date.now();
          const detailResponse = await apiRequest(request, {
            method: 'GET',
            path: `${storyC3Context.paths.threadDetail}/${storyC3Context.threadIds.claimed}`,
            headers: storyC3MemberHeaders,
          });
          detailDurations.push(Date.now() - detailStartedAt);
          expect(detailResponse.status()).toBe(200);
        }

        const resolvePercentile = (durations: number[], percentile: number): number => {
          const sorted = [...durations].sort((a, b) => a - b);
          const index = Math.max(0, Math.ceil(percentile * sorted.length) - 1);
          return sorted[index] ?? Number.MAX_SAFE_INTEGER;
        };

        const inboxP95 = resolvePercentile(inboxDurations, 0.95);
        const inboxP99 = resolvePercentile(inboxDurations, 0.99);
        const detailP95 = resolvePercentile(detailDurations, 0.95);
        const detailP99 = resolvePercentile(detailDurations, 0.99);

        expect(inboxP95).toBeLessThanOrEqual(750);
        expect(inboxP99).toBeLessThanOrEqual(1500);
        expect(detailP95).toBeLessThanOrEqual(750);
        expect(detailP99).toBeLessThanOrEqual(1500);
      },
    );
  },
);
