import { test, expect } from '@playwright/test';

test.describe(
  'Story a.2 Tenant and OrgUnit Context Enforcement for ConnectShyft Routes (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] missing orgUnit context renders explainable refusal state and keeps inbox data hidden @P0',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/inbox?flags=module:on,inbox:on,escalation:on,webhooks:on&context=missing-orgunit',
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

    test.skip(
      '[P1] cross-tenant orgUnit deep links surface refusal semantics without exposing thread details @P1',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/inbox?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-bravo-north',
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
      },
    );

    test.skip(
      '[P1] tenant-privileged operators get explicit override visibility while remaining inside tenant boundary @P1',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/inbox?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantRole=TENANT_ADMIN&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-west',
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
  },
);
