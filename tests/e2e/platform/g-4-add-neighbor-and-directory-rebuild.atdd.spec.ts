import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryG4Context,
  type StoryG4Context,
} from '../../support/factories/connectShyftStoryG4Factory';

const buildStoryG4UrlParams = (
  context: StoryG4Context,
  options: {
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
  });

  return params.toString();
};

const buildStoryG4AddNeighborUrl = (context: StoryG4Context): string => {
  return `${context.paths.addNeighborUi}?${buildStoryG4UrlParams(context, {
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: [context.orgUnitId],
  })}`;
};

const buildStoryG4DirectoryUrl = (context: StoryG4Context): string => {
  return `${context.paths.directoryUi}?${buildStoryG4UrlParams(context, {
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: [context.orgUnitId],
  })}`;
};

const readDirectoryScopeBadges = async (page: Page): Promise<string[]> => {
  return page.getByTestId('connectshyft-directory-result-conference-chip').allTextContents();
};

const context = createStoryG4Context();

test.describe('Story g.4 Add Neighbor and Directory Rebuild (ATDD E2E RED)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.skip(
    '[G4-ATDD-E2E-001][P0] add-neighbor flow exposes all required intake fields and actions for volunteer conversation-first onboarding @P0',
    async ({ page }) => {
      // Given the volunteer opens Add Neighbor
      await page.goto(buildStoryG4AddNeighborUrl(context));

      // When the form loads
      await expect(page.getByTestId('connectshyft-add-neighbor-surface')).toBeVisible();

      // Then all required inputs and controls are available
      for (const requiredTestId of context.requiredAddNeighborTestIds) {
        await expect(page.getByTestId(requiredTestId)).toBeVisible();
      }
    },
  );

  test.skip(
    '[G4-ATDD-E2E-002][P0] validation refusal for missing required contact constraints is clear actionable and blocks partial writes @P0',
    async ({ page }) => {
      // Given Add Neighbor with missing required contact input
      await page.goto(buildStoryG4AddNeighborUrl(context));
      await page.getByTestId('connectshyft-neighbor-first-name-input').fill('Mina');
      await page.getByTestId('connectshyft-neighbor-last-name-input').fill('Lopez');

      // When the create action is submitted
      await page.getByTestId('connectshyft-neighbor-submit-action').click();

      // Then refusal feedback is explicit and success state is absent
      await expect(page.getByTestId('connectshyft-neighbor-validation-error')).toBeVisible();
      await expect(page.getByTestId('connectshyft-neighbor-validation-error')).toContainText(
        /phone|contact|required/i,
      );
      await expect(page.getByTestId('connectshyft-neighbor-create-success')).toHaveCount(0);
    },
  );

  test.skip(
    '[G4-ATDD-E2E-003][P0] directory search supports name and phone modes and keeps conference-scoped results for volunteer workflows @P0',
    async ({ page }) => {
      // Given volunteer opens Directory
      await page.goto(buildStoryG4DirectoryUrl(context));
      await expect(page.getByTestId('connectshyft-directory-surface')).toBeVisible();

      // When searching by name
      await page.getByTestId('connectshyft-directory-search-mode-name').click();
      await page.getByTestId('connectshyft-directory-search-input').fill(context.searchTerms.byName);
      await expect(page.getByTestId('connectshyft-directory-result-card').first()).toBeVisible();

      // Then results stay conference scoped
      const byNameScopeBadges = await readDirectoryScopeBadges(page);
      for (const badge of byNameScopeBadges) {
        expect(badge).toContain(context.orgUnitId);
        expect(badge).not.toContain(context.crossScopeOrgUnitId);
      }

      // When searching by phone
      await page.getByTestId('connectshyft-directory-search-mode-phone').click();
      await page.getByTestId('connectshyft-directory-search-input').fill(context.searchTerms.byPhone);
      await expect(page.getByTestId('connectshyft-directory-result-card').first()).toBeVisible();

      // Then phone-mode results remain conference scoped too
      const byPhoneScopeBadges = await readDirectoryScopeBadges(page);
      for (const badge of byPhoneScopeBadges) {
        expect(badge).toContain(context.orgUnitId);
        expect(badge).not.toContain(context.crossScopeOrgUnitId);
      }
    },
  );

  test.skip(
    '[G4-ATDD-E2E-004][P0] selecting a directory entry with an active thread opens that thread via deterministic ensure behavior and shows contextual reuse notice @P0',
    async ({ page }) => {
      // Given a directory entry known to have an active thread
      await page.goto(buildStoryG4DirectoryUrl(context));
      const existingCard = page.getByTestId(`connectshyft-directory-result-card-${context.neighborIds.existing}`);
      await expect(existingCard).toBeVisible();

      const ensureResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/threads')
          && response.request().method() === 'POST',
      );

      // When start conversation is clicked
      await existingCard.getByTestId('connectshyft-directory-start-conversation-action').click();
      const ensured = await ensureResponse;

      // Then deterministic ensure route is used and UI routes to the existing thread
      expect(ensured.status()).toBe(201);
      await expect(page).toHaveURL(new RegExp(`/app/connectshyft/threads/${context.threadIds.existingActive}`));
      await expect(page.getByTestId('connectshyft-directory-existing-thread-notice')).toBeVisible();
    },
  );

  test.skip(
    '[G4-ATDD-E2E-005][P1] selecting a directory entry without an active thread starts a new conversation and surfaces deterministic creation feedback @P1',
    async ({ page }) => {
      // Given a directory entry without an active thread
      await page.goto(buildStoryG4DirectoryUrl(context));
      const newCandidateCard = page.getByTestId(`connectshyft-directory-result-card-${context.neighborIds.newCandidate}`);
      await expect(newCandidateCard).toBeVisible();

      const ensureResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/threads')
          && response.request().method() === 'POST',
      );

      // When start conversation is clicked
      await newCandidateCard.getByTestId('connectshyft-directory-start-conversation-action').click();
      const ensured = await ensureResponse;
      expect(ensured.status()).toBe(201);

      // Then app routes to a thread detail and surfaces new-thread feedback
      await expect(page).toHaveURL(/\/app\/connectshyft\/threads\//i);
      await expect(page.getByTestId('connectshyft-directory-new-thread-notice')).toBeVisible();
    },
  );

  test.skip(
    '[G4-ATDD-E2E-006][P1] mobile and tablet layouts remain touch-friendly while preserving add-neighbor and directory context visibility @P1',
    async ({ page }) => {
      const viewports: Array<{
        mode: 'mobile' | 'tablet';
        width: number;
        height: number;
        expectedAddLayoutTestId: string;
        expectedDirectoryLayoutTestId: string;
      }> = [
        {
          mode: 'mobile',
          width: context.breakpoints.mobile.width,
          height: context.breakpoints.mobile.height,
          expectedAddLayoutTestId: 'connectshyft-add-neighbor-layout-mobile',
          expectedDirectoryLayoutTestId: 'connectshyft-directory-layout-mobile',
        },
        {
          mode: 'tablet',
          width: context.breakpoints.tablet.width,
          height: context.breakpoints.tablet.height,
          expectedAddLayoutTestId: 'connectshyft-add-neighbor-layout-tablet',
          expectedDirectoryLayoutTestId: 'connectshyft-directory-layout-tablet',
        },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        await page.goto(buildStoryG4AddNeighborUrl(context));
        await expect(page.getByTestId(viewport.expectedAddLayoutTestId)).toBeVisible();
        await expect(page.getByTestId('connectshyft-add-neighbor-context-panel')).toBeVisible();

        await page.goto(buildStoryG4DirectoryUrl(context));
        await expect(page.getByTestId(viewport.expectedDirectoryLayoutTestId)).toBeVisible();
        await expect(page.getByTestId('connectshyft-directory-context-panel')).toBeVisible();
      }
    },
  );
});
