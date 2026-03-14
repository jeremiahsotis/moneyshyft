import { test, expect } from '../../support/fixtures/connectShyftStoryA2.fixture';

test.describe(
  'Story a.2 automate - tenant and orgUnit context enforcement for connectshyft routes operator journeys',
  () => {
    test.fixme(
      '[P0] missing orgUnit context renders explainable refusal state and keeps inbox data hidden @P0',
      async ({ page, storyA2Context }) => {
        await page.goto(
          `${storyA2Context.paths.inboxUi}?flags=module:on,inbox:on,escalation:on,webhooks:on&context=missing-orgunit`,
        );

        await expect(
          page.getByTestId('connectshyft-context-refusal-state'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-context-refusal-code'),
        ).toHaveText('CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED');
        await expect(
          page.getByText('Select an orgUnit context to continue.'),
        ).toBeVisible();
        await expect(page.getByTestId('connectshyft-inbox-list')).toBeHidden();
      },
    );

    test.fixme(
      '[P0] invalid orgUnit deep links surface deterministic refusal semantics and keep action controls hidden @P0',
      async ({ page, storyA2Context }) => {
        await page.goto(
          `${storyA2Context.paths.inboxUi}?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=invalid-orgunit-context`,
        );

        await expect(
          page.getByTestId('connectshyft-context-refusal-state'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-context-refusal-code'),
        ).toHaveText('CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID');
        await expect(page.getByRole('button', { name: 'Claim thread' })).toBeHidden();
        await expect(page.getByRole('button', { name: 'Take over thread' })).toBeHidden();
      },
    );

    test.fixme(
      '[P1] cross-tenant orgUnit deep links surface refusal semantics without exposing thread details @P1',
      async ({ page, storyA2Context }) => {
        await page.goto(
          `${storyA2Context.paths.inboxUi}?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-bravo-north`,
        );

        await expect(
          page.getByTestId('connectshyft-context-refusal-state'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-context-refusal-code'),
        ).toHaveText('CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH');
        await expect(
          page.getByText('The selected orgUnit is outside your active tenant boundary.'),
        ).toBeVisible();
        await expect(page.getByTestId('connectshyft-inbox-list')).toBeHidden();
        await expect(page.getByTestId('connectshyft-thread-detail')).toBeHidden();
      },
    );

    test.fixme(
      '[P1] tenant-privileged operators get explicit override visibility while remaining inside tenant boundary @P1',
      async ({ page, storyA2Context }) => {
        await page.goto(
          `${storyA2Context.paths.inboxUi}?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantRole=TENANT_ADMIN&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-west`,
        );

        await expect(
          page.getByRole('heading', { name: 'ConnectShyft Inbox' }),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-context-override-notice'),
        ).toContainText('OrgUnit membership bypassed under tenant-privileged scope');
        await expect(page.getByTestId('connectshyft-inbox-list')).toBeVisible();
      },
    );

    test.fixme(
      '[P1] refusal journeys provide operator-facing copy without disclosing protected tenant or orgUnit identifiers @P1',
      async ({ page, storyA2Context }) => {
        await page.goto(
          `${storyA2Context.paths.inboxUi}?flags=module:on,inbox:on,escalation:on,webhooks:on&context=missing-orgunit`,
        );

        const refusalText = page.getByTestId('connectshyft-context-refusal-message');
        await expect(refusalText).toBeVisible();
        await expect(refusalText).toContainText('Select an orgUnit context to continue.');
        await expect(refusalText).not.toContainText('tenant-connectshyft-alpha');
        await expect(refusalText).not.toContainText('org-connectshyft-alpha-east');
      },
    );
  },
);
