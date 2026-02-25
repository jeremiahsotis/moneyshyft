import { test, expect, type APIRequestContext } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'] as const;

const routePath = (commitmentId: string): string =>
  `/api/v1/route/commitments/${commitmentId}/transitions`;

const parseCookieValue = (setCookieHeader: string | null, cookieName: string): string => {
  if (!setCookieHeader) {
    return '';
  }

  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedName}=([^;]+)`);
  const match = setCookieHeader.match(pattern);
  return match ? decodeURIComponent(match[1]) : '';
};

const loginAndResolveCsrf = async (request: APIRequestContext): Promise<string> => {
  const email = process.env.TEST_EMAIL || 'test@example.com';
  const password = process.env.TEST_PASSWORD || 'test1234';

  const loginResponse = await apiRequest(request, {
    method: 'POST',
    path: '/api/v1/auth/login',
    data: {
      email,
      password,
      rememberMe: false,
    },
  });

  expect(loginResponse.status()).toBe(200);
  const setCookie = loginResponse.headers()['set-cookie'] ?? null;
  const csrfToken = parseCookieValue(setCookie, 'csrf_token');
  expect(csrfToken).not.toBe('');
  return csrfToken;
};

const createCommitment = async (
  request: APIRequestContext,
  csrfToken: string,
): Promise<string> => {
  const createResponse = await apiRequest(request, {
    method: 'POST',
    path: '/api/v1/route/commitments',
    headers: {
      'x-csrf-token': csrfToken,
    },
    data: {
      sourceType: 'route_request',
      sourceId: `story-2-1-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    },
  });

  expect(createResponse.status()).toBe(201);
  const createBody = await createResponse.json();
  expect(createBody).toMatchObject({
    ok: true,
    code: 'ROUTE_COMMITMENT_CREATED',
    data: {
      commitment: {
        status: 'scheduled',
      },
    },
  });

  const commitmentId = createBody?.data?.commitment?.commitmentId;
  expect(typeof commitmentId).toBe('string');
  return commitmentId as string;
};

test.describe(
  'Story 2.1 automate - commitment domain model and transition rules API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] applies valid scheduled->in_progress transitions with explicit state details @P0',
      async ({ request }) => {
        const csrfToken = await loginAndResolveCsrf(request);
        const commitmentId = await createCommitment(request, csrfToken);

        const response = await apiRequest(request, {
          method: 'POST',
          path: routePath(commitmentId),
          headers: {
            'x-csrf-token': csrfToken,
          },
          data: {
            nextStatus: 'in_progress',
            reason: 'Dispatcher started fulfillment',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
          data: {
            commitment: {
              commitmentId,
              status: 'in_progress',
            },
          },
        });
      },
    );

    test(
      '[P0] refuses invalid scheduled->completed transition with deterministic refusal @P0',
      async ({ request }) => {
        const csrfToken = await loginAndResolveCsrf(request);
        const commitmentId = await createCommitment(request, csrfToken);

        const response = await apiRequest(request, {
          method: 'POST',
          path: routePath(commitmentId),
          headers: {
            'x-csrf-token': csrfToken,
          },
          data: {
            nextStatus: 'completed',
            reason: 'Attempted invalid lifecycle jump',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          refusalType: 'business',
          code: 'ROUTE_COMMITMENT_INVALID_TRANSITION',
          data: {
            currentStatus: 'scheduled',
            attemptedStatus: 'completed',
          },
        });
      },
    );

    test(
      '[P0] blocks post-terminal mutation attempts after completion @P0',
      async ({ request }) => {
        const csrfToken = await loginAndResolveCsrf(request);
        const commitmentId = await createCommitment(request, csrfToken);

        const toInProgress = await apiRequest(request, {
          method: 'POST',
          path: routePath(commitmentId),
          headers: {
            'x-csrf-token': csrfToken,
          },
          data: {
            nextStatus: 'in_progress',
            reason: 'Dispatcher started fulfillment',
          },
        });
        expect(toInProgress.status()).toBe(200);

        const toCompleted = await apiRequest(request, {
          method: 'POST',
          path: routePath(commitmentId),
          headers: {
            'x-csrf-token': csrfToken,
          },
          data: {
            nextStatus: 'completed',
            reason: 'Fulfillment completed',
          },
        });
        expect(toCompleted.status()).toBe(200);

        const terminalMutationResponse = await apiRequest(request, {
          method: 'POST',
          path: routePath(commitmentId),
          headers: {
            'x-csrf-token': csrfToken,
          },
          data: {
            nextStatus: 'canceled',
            reason: 'Attempt to mutate completed commitment',
          },
        });

        expect(terminalMutationResponse.status()).toBe(200);
        const terminalMutationBody = await terminalMutationResponse.json();
        expect(terminalMutationBody).toMatchObject({
          ok: false,
          refusalType: 'business',
          code: 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED',
          data: {
            currentStatus: 'completed',
            attemptedStatus: 'canceled',
          },
        });
      },
    );

    test(
      '[P1] preserves canonical envelope keys on success and refusal paths @P1',
      async ({ request }) => {
        const csrfToken = await loginAndResolveCsrf(request);
        const commitmentId = await createCommitment(request, csrfToken);

        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: routePath(commitmentId),
          headers: {
            'x-csrf-token': csrfToken,
          },
          data: {
            nextStatus: 'in_progress',
            reason: 'Dispatcher started fulfillment',
          },
        });

        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: routePath(commitmentId),
          headers: {
            'x-csrf-token': csrfToken,
          },
          data: {
            nextStatus: 'completed',
            reason: 'Attempted invalid lifecycle jump',
          },
        });

        expect(successResponse.status()).toBe(200);
        expect(refusalResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        REQUIRED_ENVELOPE_KEYS.forEach((key) => {
          expect(Object.prototype.hasOwnProperty.call(successBody, key)).toBe(true);
          expect(Object.prototype.hasOwnProperty.call(refusalBody, key)).toBe(true);
        });
      },
    );
  },
);
