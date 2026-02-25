import { test, expect } from '../../support/fixtures/routeShyftStory21.fixture';
import { login } from '../../helpers/auth';

function buildCommitmentsUiUrl(story21Context: {
  paths: { commitmentsUi: string };
  tenantId: string;
  orgUnitId: string;
}): string {
  const params = new URLSearchParams({
    tenantId: story21Context.tenantId,
    orgUnitId: story21Context.orgUnitId,
  });

  return story21Context.paths.commitmentsUi + '?' + params.toString();
}

test.describe(
  'Story 2.1 automate - commitment domain model and transition rules operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] dispatcher sees explicit lifecycle state and only valid transition options for draft commitments @P0',
      async ({ page, story21Context }) => {
        await page.route(/\/api\/v1\/route\/commitments(?:\?.*)?$/, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              code: 'ROUTESHYFT_COMMITMENTS_RESOLVED',
              data: {
                commitments: [
                  {
                    id: story21Context.commitmentId,
                    status: 'draft',
                    actionableState: 'Awaiting dispatch scheduling',
                    allowedTransitions: ['scheduled'],
                  },
                ],
              },
            }),
          });
        });

        await login(page);
        await page.goto(buildCommitmentsUiUrl(story21Context));

        await expect(page.getByRole('heading', { name: 'Commitments' })).toBeVisible();
        await expect(page.getByTestId('routeshyft-commitment-status-badge')).toContainText('Draft');
        await expect(page.getByTestId('routeshyft-commitment-transition-select')).toBeVisible();
        await expect(page.getByTestId('routeshyft-commitment-transition-submit')).toBeEnabled();
        await expect(page.getByTestId('routeshyft-commitment-transition-select')).not.toContainText('Completed');
      },
    );

    test.fixme(
      '[P0] dispatcher receives deterministic refusal code and actionable guidance for invalid transition attempts @P0',
      async ({ page, story21Context }) => {
        await page.route(/\/api\/v1\/route\/commitments(?:\?.*)?$/, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              code: 'ROUTESHYFT_COMMITMENTS_RESOLVED',
              data: {
                commitments: [
                  {
                    id: story21Context.commitmentId,
                    status: 'draft',
                    actionableState: 'Awaiting dispatch scheduling',
                    allowedTransitions: ['scheduled'],
                  },
                ],
              },
            }),
          });
        });

        await page.route(/\/api\/v1\/route\/commitments\/[^/]+\/transition(?:\?.*)?$/, async (route) => {
          if (route.request().method() !== 'POST') {
            await route.fallback();
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: false,
              refusalType: 'business',
              code: 'ROUTESHYFT_COMMITMENT_TRANSITION_INVALID',
              message: 'Invalid transition requested',
              data: {
                commitmentId: story21Context.commitmentId,
                actionableState: 'Use allowed transition path: draft -> scheduled',
                refusalDetails: {
                  fromStatus: 'draft',
                  toStatus: 'completed',
                },
              },
            }),
          });
        });

        await login(page);
        await page.goto(buildCommitmentsUiUrl(story21Context));

        await page.getByTestId('routeshyft-commitment-transition-select').selectOption('completed');
        await page.getByTestId('routeshyft-commitment-transition-reason-input').fill('Attempt invalid transition');
        await page.getByTestId('routeshyft-commitment-transition-submit').click();

        await expect(page.getByTestId('routeshyft-commitment-refusal-banner')).toBeVisible();
        await expect(page.getByTestId('routeshyft-commitment-refusal-code')).toHaveText(
          'ROUTESHYFT_COMMITMENT_TRANSITION_INVALID',
        );
        await expect(page.getByTestId('routeshyft-commitment-refusal-details')).toContainText(
          'Use allowed transition path: draft -> scheduled',
        );
      },
    );

    test.fixme(
      '[P1] terminal commitments render explicit immutable state and disable transition submission controls @P1',
      async ({ page, story21Context }) => {
        await page.route(/\/api\/v1\/route\/commitments(?:\?.*)?$/, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              code: 'ROUTESHYFT_COMMITMENTS_RESOLVED',
              data: {
                commitments: [
                  {
                    id: story21Context.commitmentId,
                    status: 'completed',
                    actionableState: 'Terminal state reached; commitment is immutable',
                    allowedTransitions: [],
                  },
                ],
              },
            }),
          });
        });

        await login(page);
        await page.goto(buildCommitmentsUiUrl(story21Context));

        await expect(page.getByTestId('routeshyft-commitment-status-badge')).toContainText('Completed');
        await expect(page.getByTestId('routeshyft-commitment-transition-submit')).toBeDisabled();
      },
    );

    test.fixme(
      '[P1] valid dispatcher transition submissions post structured payload with status, actor, and reason fields @P1',
      async ({ page, story21Context }) => {
        let capturedRequestPayload: Record<string, unknown> | null = null;

        await page.route(/\/api\/v1\/route\/commitments(?:\?.*)?$/, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              code: 'ROUTESHYFT_COMMITMENTS_RESOLVED',
              data: {
                commitments: [
                  {
                    id: story21Context.commitmentId,
                    status: 'draft',
                    actionableState: 'Awaiting dispatch scheduling',
                    allowedTransitions: ['scheduled'],
                  },
                ],
              },
            }),
          });
        });

        await page.route(/\/api\/v1\/route\/commitments\/[^/]+\/transition(?:\?.*)?$/, async (route) => {
          if (route.request().method() !== 'POST') {
            await route.fallback();
            return;
          }

          const body = route.request().postDataJSON() as Record<string, unknown>;
          capturedRequestPayload = body;

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              code: 'ROUTESHYFT_COMMITMENT_TRANSITION_APPLIED',
              data: {
                commitment: {
                  id: story21Context.commitmentId,
                  previousStatus: 'draft',
                  status: 'scheduled',
                  actionableState: 'Dispatch window confirmed',
                },
              },
            }),
          });
        });

        await login(page);
        await page.goto(buildCommitmentsUiUrl(story21Context));

        await page.getByTestId('routeshyft-commitment-transition-select').selectOption('scheduled');
        await page.getByTestId('routeshyft-commitment-transition-reason-input').fill(
          'Dispatcher confirmed assignment',
        );
        await page.getByTestId('routeshyft-commitment-transition-submit').click();

        expect(capturedRequestPayload).toMatchObject({
          toStatus: 'scheduled',
          actorType: 'dispatcher',
          reason: 'Dispatcher confirmed assignment',
        });
      },
    );
  },
);
