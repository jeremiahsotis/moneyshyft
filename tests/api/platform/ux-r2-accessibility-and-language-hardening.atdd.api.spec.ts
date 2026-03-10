import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR2.fixture';
import { randomUUID } from 'node:crypto';

test.describe('Story ux-r2 Accessibility and Language Hardening (ATDD API RED)', () => {
  test.skip(
    '[P0] core read contracts publish minimum 16px body copy and 44px control targets for inbox mine thread add-neighbor and close surfaces @P0',
    async ({
      request,
      storyUxR2Context,
      storyUxR2MemberHeaders,
      storyUxR2InboxQuery,
      storyUxR2MineQuery,
    }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR2Context.paths.inbox}${storyUxR2InboxQuery}`,
        headers: storyUxR2MemberHeaders,
      });
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR2Context.paths.inbox}${storyUxR2MineQuery}`,
        headers: storyUxR2MemberHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR2Context.paths.threadDetail}/${storyUxR2Context.threadIds.claimed}`,
        headers: storyUxR2MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const inboxBody = await inboxResponse.json();
      const mineBody = await mineResponse.json();
      const detailBody = await detailResponse.json();

      const inboxCardA11y = inboxBody?.data?.accessibility?.surfaces?.inboxCard;
      const mineCardA11y = mineBody?.data?.accessibility?.surfaces?.mineCard;
      const detailA11y = detailBody?.data?.accessibility?.surfaces?.threadDetail;
      const addNeighborA11y = detailBody?.data?.accessibility?.surfaces?.addNeighbor;
      const closeA11y = detailBody?.data?.accessibility?.surfaces?.closeAction;

      for (const candidate of [inboxCardA11y, mineCardA11y, detailA11y, addNeighborA11y, closeA11y]) {
        expect(Number(candidate?.minBodyTextPx)).toBeGreaterThanOrEqual(
          storyUxR2Context.readability.minBodyTextPx,
        );
        expect(Number(candidate?.minTapTargetPx)).toBeGreaterThanOrEqual(
          storyUxR2Context.readability.minTapTargetPx,
        );
      }
    },
  );

  test.skip(
    '[P0] action labels are verb-first and copy contracts do not leak RBAC or UUID internal jargon @P0',
    async ({ request, storyUxR2Context, storyUxR2MemberHeaders }) => {
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR2Context.paths.threadDetail}/${storyUxR2Context.threadIds.claimed}`,
        headers: storyUxR2MemberHeaders,
      });

      expect(detailResponse.status()).toBe(200);
      const detailBody = await detailResponse.json();
      const actions: Array<{ label?: string }> = detailBody?.data?.thread?.actions ?? [];
      const actionLabels = actions.map((action) => String(action.label ?? '').trim()).filter(Boolean);

      expect(actionLabels.length).toBeGreaterThan(0);
      for (const label of actionLabels) {
        const [verb = ''] = label.split(/\s+/);
        expect(storyUxR2Context.actionVerbSet).toContain(verb);
      }

      const copyBlob = JSON.stringify(detailBody?.data ?? {}).toLowerCase();
      for (const forbiddenToken of storyUxR2Context.forbiddenCopyTokens) {
        expect(copyBlob).not.toContain(forbiddenToken);
      }
      expect(copyBlob).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
      );
    },
  );

  test.skip(
    '[P1] accessibility metadata publishes deterministic focus order accessible names and screen-reader announcement contracts across core paths @P1',
    async ({ request, storyUxR2Context, storyUxR2MemberHeaders, storyUxR2InboxQuery }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR2Context.paths.inbox}${storyUxR2InboxQuery}`,
        headers: storyUxR2MemberHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR2Context.paths.threadDetail}/${storyUxR2Context.threadIds.claimed}`,
        headers: storyUxR2MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const inboxBody = await inboxResponse.json();
      const detailBody = await detailResponse.json();

      const focusOrder: string[] = detailBody?.data?.accessibility?.focusOrder ?? [];
      const accessibleNames: Record<string, string> =
        detailBody?.data?.accessibility?.accessibleNames ?? {};
      const announcements: Record<string, string> =
        inboxBody?.data?.accessibility?.announcements ?? {};

      expect(focusOrder).toEqual([...storyUxR2Context.focusOrder]);
      for (const testId of storyUxR2Context.focusOrder) {
        expect(accessibleNames[testId]).toBeTruthy();
      }
      expect(announcements.success).toMatch(/success/i);
      expect(announcements.refusal).toMatch(/refusal/i);
      expect(announcements.error).toMatch(/error/i);
    },
  );

  test.skip(
    '[P1] close and add-neighbor feedback contracts map explicitly to success refusal and error taxonomy values @P1',
    async ({
      request,
      storyUxR2Context,
      storyUxR2MemberHeaders,
      storyUxR2AdminHeaders,
      storyUxR2ClosePayload,
      storyUxR2AddNeighborPayload,
    }) => {
      const closeSuccessResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR2Context.paths.threadDetail}/${storyUxR2Context.threadIds.claimed}/close`,
        headers: storyUxR2AdminHeaders,
        data: storyUxR2ClosePayload,
      });
      const addNeighborRefusalResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR2Context.paths.addNeighbor,
        headers: storyUxR2MemberHeaders,
        data: {
          ...storyUxR2AddNeighborPayload,
          phone: '',
        },
      });
      const closeErrorResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR2Context.paths.threadDetail}/${randomUUID()}/close`,
        headers: storyUxR2AdminHeaders,
        data: storyUxR2ClosePayload,
      });

      expect(closeSuccessResponse.status()).toBe(200);
      expect(addNeighborRefusalResponse.status()).toBe(200);
      expect(closeErrorResponse.status()).toBe(200);

      const closeSuccessBody = await closeSuccessResponse.json();
      const addNeighborRefusalBody = await addNeighborRefusalResponse.json();
      const closeErrorBody = await closeErrorResponse.json();

      expect(closeSuccessBody).toMatchObject({
        ok: true,
        data: {
          feedback: {
            taxonomy: storyUxR2Context.outcomeTaxonomy[0],
          },
        },
      });
      expect(addNeighborRefusalBody).toMatchObject({
        ok: false,
        refusalType: 'business',
        data: {
          feedback: {
            taxonomy: storyUxR2Context.outcomeTaxonomy[1],
          },
        },
      });
      expect(closeErrorBody).toMatchObject({
        ok: false,
        data: {
          feedback: {
            taxonomy: storyUxR2Context.outcomeTaxonomy[2],
          },
        },
      });
    },
  );
});
