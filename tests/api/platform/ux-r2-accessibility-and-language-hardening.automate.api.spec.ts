import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR2.fixture';
import { createStoryUxR2Headers } from '../../support/factories/connectShyftStoryUxR2Factory';
import {
  createStory14BusinessRefusalProbe,
  createStory14SharedEnvelopeHeaders,
  createStory14SuccessProbe,
  createStory14SystemErrorProbe,
} from '../../support/factories/sharedResponseEnvelopeStory14Factory';

const UX_R2_API_IMPLEMENTATION_GAP =
  'Story ux-r2 accessibility and language contracts are not fully implemented yet (a11y metadata, copy taxonomy, role-safe labels).';
const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const hasForbiddenToken = (
  payload: unknown,
  forbiddenTokens: readonly string[],
): boolean => {
  const serialized = JSON.stringify(payload ?? {}).toLowerCase();
  return forbiddenTokens.some((token) => serialized.includes(token.toLowerCase()));
};

const readFeedbackMessage = (payload: Record<string, unknown>): string => {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const feedback = (data.feedback ?? {}) as Record<string, unknown>;
  return String(feedback.message ?? payload.message ?? '').trim();
};

const resolveEnvelopeTaxonomy = (statusCode: number, payload: Record<string, unknown>): 'success' | 'refusal' | 'error' => {
  if (payload.ok === true) {
    return 'success';
  }

  if (statusCode >= 500 || payload.errorType === 'system') {
    return 'error';
  }

  return 'refusal';
};

test.describe(
  'Story ux-r2 automate - accessibility and language hardening API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] inbox and mine readability contracts stay locked and drift-free for body and tap-target thresholds @P0',
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

        expect(UX_R2_API_IMPLEMENTATION_GAP).toContain('ux-r2');
        expect(inboxResponse.status()).toBe(200);
        expect(mineResponse.status()).toBe(200);

        const inboxBody = await inboxResponse.json();
        const mineBody = await mineResponse.json();
        expect(hasRequiredEnvelopeKeys(inboxBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(mineBody)).toBe(true);

        const inboxCard = inboxBody?.data?.accessibility?.surfaces?.inboxCard;
        const mineCard = mineBody?.data?.accessibility?.surfaces?.mineCard;

        expect(Number(inboxCard?.minBodyTextPx)).toBeGreaterThanOrEqual(
          storyUxR2Context.readability.minBodyTextPx,
        );
        expect(Number(mineCard?.minBodyTextPx)).toBeGreaterThanOrEqual(
          storyUxR2Context.readability.minBodyTextPx,
        );
        expect(Number(inboxCard?.minTapTargetPx)).toBeGreaterThanOrEqual(
          storyUxR2Context.readability.minTapTargetPx,
        );
        expect(Number(mineCard?.minTapTargetPx)).toBeGreaterThanOrEqual(
          storyUxR2Context.readability.minTapTargetPx,
        );

        expect(Number(inboxCard?.minBodyTextPx)).toBe(Number(mineCard?.minBodyTextPx));
        expect(Number(inboxCard?.minTapTargetPx)).toBe(Number(mineCard?.minTapTargetPx));
      },
    );

    test.fixme(
      '[P0] action labels remain verb-first and thread copy stays free of RBAC/internal identifiers across detail contracts @P0',
      async ({ request, storyUxR2Context, storyUxR2MemberHeaders }) => {
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR2Context.paths.threadDetail}/${storyUxR2Context.threadIds.claimed}`,
          headers: storyUxR2MemberHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);

        const actions: Array<{ label?: string }> = detailBody?.data?.thread?.actions ?? [];
        const actionLabels = actions
          .map((action) => String(action.label ?? '').trim())
          .filter(Boolean);

        expect(actionLabels.length).toBeGreaterThan(0);
        for (const label of actionLabels) {
          const [verb = ''] = label.split(/\s+/);
          expect(storyUxR2Context.actionVerbSet).toContain(verb);
        }

        expect(hasForbiddenToken(detailBody?.data, storyUxR2Context.forbiddenCopyTokens)).toBe(false);
        expect(JSON.stringify(detailBody?.data ?? {})).not.toMatch(
          /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
        );
      },
    );

    test.fixme(
      '[P1] focus-order and announcement metadata stay deterministic with unique tab stops and accessible-name coverage @P1',
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
        expect(new Set(focusOrder).size).toBe(focusOrder.length);

        for (const testId of storyUxR2Context.focusOrder) {
          expect(String(accessibleNames[testId] ?? '').trim()).toBeTruthy();
        }

        for (const taxonomy of storyUxR2Context.outcomeTaxonomy) {
          expect(String(announcements[taxonomy] ?? '')).toMatch(/.+/);
        }

        expect(hasForbiddenToken(announcements, storyUxR2Context.forbiddenCopyTokens)).toBe(false);
      },
    );

    test.fixme(
      '[P1] tenant-viewer detail contracts return refusal-safe guidance and never expose privileged action labels @P1',
      async ({ request, storyUxR2Context }) => {
        const viewerHeaders = createStoryUxR2Headers(storyUxR2Context, {
          role: 'TENANT_VIEWER',
          userId: `${storyUxR2Context.userId}-viewer`,
          orgUnitMemberships: [],
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR2Context.paths.threadDetail}/${storyUxR2Context.threadIds.claimed}`,
          headers: viewerHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: false,
          refusalType: 'business',
          data: {
            feedback: {
              taxonomy: 'refusal',
            },
          },
        });

        const actions: Array<{ label?: string }> = detailBody?.data?.thread?.actions ?? [];
        const actionLabels = actions
          .map((action) => String(action.label ?? '').trim())
          .filter(Boolean);
        expect(actionLabels).not.toContain('Claim');
        expect(actionLabels).not.toContain('Close');
        expect(hasForbiddenToken(detailBody?.data, storyUxR2Context.forbiddenCopyTokens)).toBe(false);
      },
    );

    test.fixme(
      '[P1] close and add-neighbor outcomes keep success-refusal-error taxonomy with plain-language feedback prefixes @P1',
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
          path: `${storyUxR2Context.paths.threadDetail}/thread-ux-r2-missing/close`,
          headers: storyUxR2AdminHeaders,
          data: storyUxR2ClosePayload,
        });

        expect(closeSuccessResponse.status()).toBe(200);
        expect(addNeighborRefusalResponse.status()).toBe(200);
        expect(closeErrorResponse.status()).toBe(200);

        const closeSuccessBody = await closeSuccessResponse.json();
        const addNeighborRefusalBody = await addNeighborRefusalResponse.json();
        const closeErrorBody = await closeErrorResponse.json();

        expect(hasRequiredEnvelopeKeys(closeSuccessBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(addNeighborRefusalBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(closeErrorBody)).toBe(true);

        expect(closeSuccessBody?.data?.feedback?.taxonomy).toBe(storyUxR2Context.outcomeTaxonomy[0]);
        expect(addNeighborRefusalBody?.data?.feedback?.taxonomy).toBe(
          storyUxR2Context.outcomeTaxonomy[1],
        );
        expect(closeErrorBody?.data?.feedback?.taxonomy).toBe(storyUxR2Context.outcomeTaxonomy[2]);

        const feedbackMessages = [
          readFeedbackMessage(closeSuccessBody),
          readFeedbackMessage(addNeighborRefusalBody),
          readFeedbackMessage(closeErrorBody),
        ];

        expect(feedbackMessages[0]).toMatch(/^Success:/i);
        expect(feedbackMessages[1]).toMatch(/^Refusal:/i);
        expect(feedbackMessages[2]).toMatch(/^Error:/i);

        for (const message of feedbackMessages) {
          expect(hasForbiddenToken(message, storyUxR2Context.forbiddenCopyTokens)).toBe(false);
        }
      },
    );

    test(
      '[P1] api envelopes deterministically map to success refusal error taxonomy for ux-r2 feedback contracts @P1',
      async ({
        request,
        storyUxR2Context,
      }) => {
        const envelopeHeaders = createStory14SharedEnvelopeHeaders({
          tenantId: storyUxR2Context.tenantId,
          correlationId: storyUxR2Context.correlationId,
          csrfToken: storyUxR2Context.csrfToken,
        });

        const closeSuccessResponse = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/success',
          headers: envelopeHeaders,
          data: createStory14SuccessProbe({
            operationName: 'ux-r2-envelope-success-mapping',
          }).payload,
        });
        const addNeighborRefusalResponse = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/business-refusal',
          headers: envelopeHeaders,
          data: createStory14BusinessRefusalProbe({
            code: 'UX_R2_PLAIN_LANGUAGE_REFUSAL',
            message: 'Action could not be completed. Try a different option.',
          }).payload,
        });
        const systemErrorResponse = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
          headers: envelopeHeaders,
          data: createStory14SystemErrorProbe({
            operationName: 'ux-r2-envelope-system-error-mapping',
          }).payload,
        });

        expect(closeSuccessResponse.status()).toBe(200);
        expect(addNeighborRefusalResponse.status()).toBe(200);
        expect(systemErrorResponse.status()).toBeGreaterThanOrEqual(500);

        const closeSuccessBody = await closeSuccessResponse.json();
        const addNeighborRefusalBody = await addNeighborRefusalResponse.json();
        const systemErrorBody = await systemErrorResponse.json();

        expect(hasRequiredEnvelopeKeys(closeSuccessBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(addNeighborRefusalBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(systemErrorBody)).toBe(true);

        expect(
          resolveEnvelopeTaxonomy(closeSuccessResponse.status(), closeSuccessBody),
        ).toBe(storyUxR2Context.outcomeTaxonomy[0]);
        expect(
          resolveEnvelopeTaxonomy(addNeighborRefusalResponse.status(), addNeighborRefusalBody),
        ).toBe(storyUxR2Context.outcomeTaxonomy[1]);
        expect(
          resolveEnvelopeTaxonomy(systemErrorResponse.status(), systemErrorBody),
        ).toBe(storyUxR2Context.outcomeTaxonomy[2]);

        const messages = [
          String(closeSuccessBody.message ?? ''),
          String(addNeighborRefusalBody.message ?? ''),
          String(systemErrorBody.message ?? ''),
        ];

        for (const message of messages) {
          expect(message.trim().length).toBeGreaterThan(0);
          expect(hasForbiddenToken(message, storyUxR2Context.forbiddenCopyTokens)).toBe(false);
        }
      },
    );
  },
);
