import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory25.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const assertStructuredAlternatives = (alternatives: unknown): void => {
  expect(Array.isArray(alternatives)).toBe(true);
  const typedAlternatives = alternatives as Array<Record<string, unknown>>;
  expect(typedAlternatives.length).toBeGreaterThan(0);
  expect(typedAlternatives[0]).toEqual(
    expect.objectContaining({
      type: expect.any(String),
      label: expect.any(String),
      action: expect.any(String),
    }),
  );
};

const detailPath = (resourceCollection: string, requestId: string): string =>
  resourceCollection + '/' + requestId;

test.describe('Story 2.5 automate - refusal outcomes API coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test.fixme(
    '[P0] persists refusal reason taxonomy and structured alternatives on refusal issuance @P0',
    async ({ request, story25Context, story25Headers, story25RefusalPayload }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: story25Context.paths.resourceCollection,
        headers: story25Headers,
        data: {
          ...story25RefusalPayload,
          refusalReasonCode: story25Context.refusalCode,
          alternatives: [
            {
              type: 'reschedule_window',
              label: 'Offer next available slot',
              action: 'RESCHEDULE',
            },
          ],
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: story25Context.refusalCode,
        refusalType: 'business',
        data: {
          requestId: expect.any(String),
          alternatives: expect.any(Array),
        },
      });
      assertStructuredAlternatives(body?.data?.alternatives);
    },
  );

  test.fixme(
    '[P0] supports refusal persistence before and after commitment lifecycle stages @P0',
    async ({ request, story25Context, story25Headers, story25RefusalPayload }) => {
      const preCommitmentResponse = await apiRequest(request, {
        method: 'POST',
        path: story25Context.paths.resourceCollection,
        headers: story25Headers,
        data: {
          ...story25RefusalPayload,
          lifecycleStage: 'pre_commitment',
        },
      });

      const postCommitmentResponse = await apiRequest(request, {
        method: 'POST',
        path: story25Context.paths.resourceCollection,
        headers: story25Headers,
        data: {
          ...story25RefusalPayload,
          lifecycleStage: 'post_commitment',
          commitmentId: story25Context.commitmentId,
        },
      });

      expect(preCommitmentResponse.status()).toBe(200);
      expect(postCommitmentResponse.status()).toBe(200);

      const preCommitmentBody = await preCommitmentResponse.json();
      const postCommitmentBody = await postCommitmentResponse.json();

      expect(preCommitmentBody).toMatchObject({
        ok: false,
        code: story25Context.refusalCode,
        data: {
          requestId: expect.any(String),
        },
      });
      expect(postCommitmentBody).toMatchObject({
        ok: false,
        code: story25Context.refusalCode,
        data: {
          requestId: expect.any(String),
          commitmentId: expect.any(String),
        },
      });
    },
  );

  test.fixme(
    '[P0] exposes refusal history events in lifecycle detail responses @P0',
    async ({ request, story25Context, story25Headers, story25RefusalPayload }) => {
      const refusalResponse = await apiRequest(request, {
        method: 'POST',
        path: story25Context.paths.resourceCollection,
        headers: story25Headers,
        data: story25RefusalPayload,
      });

      expect(refusalResponse.status()).toBe(200);
      const refusalBody = await refusalResponse.json();
      const requestId = refusalBody?.data?.requestId ?? story25Context.requestId;

      const historyResponse = await apiRequest(request, {
        method: 'GET',
        path: detailPath(story25Context.paths.resourceCollection, requestId),
        headers: story25Headers,
      });

      expect(historyResponse.status()).toBe(200);
      const historyBody = await historyResponse.json();
      expect(historyBody).toMatchObject({
        ok: true,
        data: {
          requestId,
          history: expect.arrayContaining([
            expect.objectContaining({
              eventType: 'refusal',
              code: story25Context.refusalCode,
            }),
          ]),
        },
      });
    },
  );

  test.fixme(
    '[P1] returns explicit actionable alternatives with stable machine-readable fields @P1',
    async ({ request, story25Context, story25Headers, story25RefusalPayload }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: story25Context.paths.resourceCollection,
        headers: story25Headers,
        data: {
          ...story25RefusalPayload,
          alternatives: [
            {
              type: 'partner_referral',
              label: 'Refer to partner service area',
              action: 'REFER_PARTNER',
            },
            {
              type: 'callback',
              label: 'Offer callback window',
              action: 'SCHEDULE_CALLBACK',
            },
          ],
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: story25Context.refusalCode,
      });
      assertStructuredAlternatives(body?.data?.alternatives);
    },
  );

  test.fixme(
    '[P1] keeps canonical envelope keys stable across refusal and refusal-history paths @P1',
    async ({ request, story25Context, story25Headers, story25RefusalPayload }) => {
      const refusalResponse = await apiRequest(request, {
        method: 'POST',
        path: story25Context.paths.resourceCollection,
        headers: story25Headers,
        data: story25RefusalPayload,
      });

      expect(refusalResponse.status()).toBe(200);
      const refusalBody = await refusalResponse.json();
      const requestId = refusalBody?.data?.requestId ?? story25Context.requestId;

      const historyResponse = await apiRequest(request, {
        method: 'GET',
        path: detailPath(story25Context.paths.resourceCollection, requestId),
        headers: story25Headers,
      });

      expect(historyResponse.status()).toBe(200);
      const historyBody = await historyResponse.json();

      expect(
        REQUIRED_ENVELOPE_KEYS.every((key) =>
          Object.prototype.hasOwnProperty.call(refusalBody, key),
        ),
      ).toBe(true);
      expect(
        REQUIRED_ENVELOPE_KEYS.every((key) =>
          Object.prototype.hasOwnProperty.call(historyBody, key),
        ),
      ).toBe(true);
    },
  );
});
