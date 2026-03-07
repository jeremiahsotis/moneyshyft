import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  cleanupConnectShyftThreadAndNeighborState,
  destroyConnectShyftDbActorClient,
} from '../../support/helpers/connectShyftDbActor';
import {
  buildStoryG4AddNeighborUrl,
  buildStoryG4DirectoryUrl,
  createStoryG4NeighborSeed,
  ensureStoryG4ThreadSeed,
} from '../../support/helpers/connectShyftStoryG4TestHelpers';
import { createStoryG4Context } from '../../support/factories/connectShyftStoryG4Factory';

const context = createStoryG4Context();

test.describe('Story g.4 Add Neighbor and Directory Rebuild (ATDD E2E)', () => {
  let createdNeighborIds: string[] = [];
  let createdThreadIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    createdNeighborIds = [];
    createdThreadIds = [];
    await login(page);
  });

  test.afterEach(async () => {
    await cleanupConnectShyftThreadAndNeighborState({
      tenantId: context.tenantId,
      neighborIds: createdNeighborIds,
      threadIds: createdThreadIds,
    });
  });

  test.afterAll(async () => {
    await destroyConnectShyftDbActorClient();
  });

  test(
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

  test(
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

  test(
    '[G4-ATDD-E2E-003][P0] directory search supports name and phone modes and keeps conference-scoped results for volunteer workflows @P0',
    async ({ page, request }) => {
      const byNameSeed = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'DirectoryNameScoped',
        primaryPhone: '+12605550199',
      });
      createdNeighborIds.push(byNameSeed.neighborId);

      const byPhoneSeed = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'DirectoryPhoneScoped',
        primaryPhone: '+12605550120',
      });
      createdNeighborIds.push(byPhoneSeed.neighborId);

      const crossScopeSeed = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'DirectoryCrossScope',
        primaryPhone: '+12605550999',
        orgUnitId: context.crossScopeOrgUnitId,
        orgUnitMemberships: [context.crossScopeOrgUnitId],
      });
      createdNeighborIds.push(crossScopeSeed.neighborId);

      // Given volunteer opens Directory
      await page.goto(buildStoryG4DirectoryUrl(context));
      await expect(page.getByTestId('connectshyft-directory-surface')).toBeVisible();

      // When searching by name
      await page.getByTestId('connectshyft-directory-search-mode-name').click();
      await page.getByTestId('connectshyft-directory-search-input').fill(context.searchTerms.byName);
      await expect(page.getByTestId('connectshyft-directory-result-card').first()).toBeVisible();

      // Then results stay conference scoped
      await expect(page.getByTestId('connectshyft-directory-surface')).not.toContainText('DirectoryCrossScope');
      const byNameScopeBadges = await page
        .getByTestId('connectshyft-directory-result-conference-chip')
        .allTextContents();
      for (const badge of byNameScopeBadges) {
        expect(badge).toContain('Conference scoped');
      }

      // When searching by phone
      await page.getByTestId('connectshyft-directory-search-mode-phone').click();
      await page.getByTestId('connectshyft-directory-search-input').fill(context.searchTerms.byPhone);
      await expect(page.getByTestId('connectshyft-directory-result-card').first()).toBeVisible();

      // Then phone-mode results remain conference scoped too
      await expect(page.getByTestId('connectshyft-directory-surface')).not.toContainText('DirectoryCrossScope');
      const byPhoneScopeBadges = await page
        .getByTestId('connectshyft-directory-result-conference-chip')
        .allTextContents();
      for (const badge of byPhoneScopeBadges) {
        expect(badge).toContain('Conference scoped');
      }
    },
  );

  test(
    '[G4-ATDD-E2E-004][P0] selecting a directory entry with an active thread opens that thread via deterministic ensure behavior and shows contextual reuse notice @P0',
    async ({ page, request }) => {
      const existingNeighbor = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'DirectoryExistingThread',
        primaryPhone: '+12605550199',
      });
      createdNeighborIds.push(existingNeighbor.neighborId);

      const existingThreadId = await ensureStoryG4ThreadSeed(
        request,
        context,
        existingNeighbor.neighborId,
      );
      createdThreadIds.push(existingThreadId);

      // Given a directory entry known to have an active thread
      await page.goto(buildStoryG4DirectoryUrl(context));
      const existingCard = page.getByTestId(`connectshyft-directory-result-card-${existingNeighbor.neighborId}`);
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
      await expect(page).toHaveURL(new RegExp(`/app/connectshyft/threads/${existingThreadId}`));
      await expect(page.getByTestId('connectshyft-directory-existing-thread-notice')).toBeVisible();
    },
  );

  test(
    '[G4-ATDD-E2E-005][P1] selecting a directory entry without an active thread starts a new conversation and surfaces deterministic creation feedback @P1',
    async ({ page, request }) => {
      const newCandidate = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'DirectoryNoThread',
        primaryPhone: '+12605550133',
      });
      createdNeighborIds.push(newCandidate.neighborId);

      // Given a directory entry without an active thread
      await page.goto(buildStoryG4DirectoryUrl(context));
      const newCandidateCard = page.getByTestId(`connectshyft-directory-result-card-${newCandidate.neighborId}`);
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

  test(
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
