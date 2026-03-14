import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  cleanupConnectShyftThreadAndNeighborState,
  destroyConnectShyftDbActorClient,
} from '../../support/helpers/connectShyftDbActor';
import {
  buildStoryG4DeterministicPhone,
  buildStoryG4AddNeighborUrl,
  buildStoryG4DirectoryUrl,
  createStoryG4NeighborSeed,
  ensureStoryG4ThreadSeed,
} from '../../support/helpers/connectShyftStoryG4TestHelpers';
import { createStoryG4Context } from '../../support/factories/connectShyftStoryG4Factory';

const context = createStoryG4Context();

const formatDirectoryPhoneQuery = (rawPhone: string): string => {
  const digits = rawPhone.replace(/\D/g, '').replace(/^1/, '');
  return digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');
};

test.describe('Story g.4 Add Neighbor and Directory Rebuild (Automate E2E Expansion)', () => {
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
    '[G4-AUTO-E2E-301][P0] directory search input updates trigger backend refresh with mode and query parameters before rendering filtered results @P0',
    async ({ page, request }, testInfo) => {
      const primaryPhone = buildStoryG4DeterministicPhone(testInfo, 'g4-auto-e2e-301-primary-phone');
      const seededNeighbor = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'AutoReloadDirectory',
        primaryPhone,
      });
      createdNeighborIds.push(seededNeighbor.neighborId);

      await page.goto(buildStoryG4DirectoryUrl(context));
      await expect(page.getByTestId('connectshyft-directory-surface')).toBeVisible();
      const seededCard = page.getByTestId(`connectshyft-directory-result-card-${seededNeighbor.neighborId}`);

      const expectedNameQuery = context.searchTerms.byName;
      const waitForNameRefresh = page.waitForResponse((response) => {
        if (!response.url().includes('/api/v1/connectshyft/neighbors')) {
          return false;
        }

        if (response.request().method() !== 'GET') {
          return false;
        }

        const url = new URL(response.url());
        return url.searchParams.get('mode') === 'name'
          && url.searchParams.get('query') === expectedNameQuery;
      });

      await page.getByTestId('connectshyft-directory-search-mode-name').click();
      await page.getByTestId('connectshyft-directory-search-input').fill(expectedNameQuery);
      const nameRefreshResponse = await waitForNameRefresh;
      expect(nameRefreshResponse.status()).toBe(200);
      await expect(seededCard).toBeVisible();

      const formattedPhoneQuery = formatDirectoryPhoneQuery(primaryPhone);
      const waitForPhoneRefresh = page.waitForResponse((response) => {
        if (!response.url().includes('/api/v1/connectshyft/neighbors')) {
          return false;
        }

        if (response.request().method() !== 'GET') {
          return false;
        }

        const url = new URL(response.url());
        return url.searchParams.get('mode') === 'phone'
          && url.searchParams.get('query') === formattedPhoneQuery;
      });

      await page.getByTestId('connectshyft-directory-search-mode-phone').click();
      await page.getByTestId('connectshyft-directory-search-input').fill(formattedPhoneQuery);
      const phoneRefreshResponse = await waitForPhoneRefresh;
      expect(phoneRefreshResponse.status()).toBe(200);

      await expect(seededCard).toBeVisible();
    },
  );

  test(
    '[G4-AUTO-E2E-302][P1] add-neighbor submit with only additional phone preserves clear refusal messaging and blocks create success state @P1',
    async ({ page }) => {
      await page.goto(buildStoryG4AddNeighborUrl(context));
      await expect(page.getByTestId('connectshyft-add-neighbor-surface')).toBeVisible();

      await page.getByTestId('connectshyft-neighbor-first-name-input').fill('Casey');
      await page.getByTestId('connectshyft-neighbor-last-name-input').fill('OnlyAdditional');
      await page
        .getByTestId('connectshyft-neighbor-additional-phone-input')
        .fill('(260) 555-0133');
      await page.getByTestId('connectshyft-neighbor-submit-action').click();

      await expect(page.getByTestId('connectshyft-neighbor-validation-error')).toBeVisible();
      await expect(page.getByTestId('connectshyft-neighbor-validation-error')).toContainText(
        /phone|contact|required/i,
      );
      await expect(page.getByTestId('connectshyft-neighbor-create-success')).toHaveCount(0);
    },
  );

  test(
    '[G4-AUTO-E2E-303][P1] existing-thread notice after directory start remains volunteer-safe and excludes tenant or conference identifiers @P1',
    async ({ page, request }, testInfo) => {
      const seededNeighbor = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'AutoExistingNotice',
        primaryPhone: buildStoryG4DeterministicPhone(testInfo, 'g4-auto-e2e-303-primary-phone'),
      });
      createdNeighborIds.push(seededNeighbor.neighborId);

      const existingThreadId = await ensureStoryG4ThreadSeed(
        request,
        context,
        seededNeighbor.neighborId,
      );
      createdThreadIds.push(existingThreadId);

      await page.goto(buildStoryG4DirectoryUrl(context));
      const existingCard = page.getByTestId(`connectshyft-directory-result-card-${seededNeighbor.neighborId}`);
      await expect(existingCard).toBeVisible();

      await existingCard.getByTestId('connectshyft-directory-start-conversation-action').click();
      await expect(page).toHaveURL(new RegExp(`/app/connectshyft/threads/${existingThreadId}`));

      const notice = page.getByTestId('connectshyft-directory-existing-thread-notice');
      await expect(notice).toBeVisible();
      await expect(notice).toContainText(/existing active conversation/i);
      await expect(notice).not.toContainText(context.tenantId);
      await expect(notice).not.toContainText(context.orgUnitId);
      await expect(notice).not.toContainText(/tenant|orgunit|org unit/i);
    },
  );

  test(
    '[G4-AUTO-E2E-304][P1] new-thread notice after directory start remains volunteer-safe and excludes tenant or conference identifiers @P1',
    async ({ page, request }, testInfo) => {
      const seededNeighbor = await createStoryG4NeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'AutoNewNotice',
        primaryPhone: buildStoryG4DeterministicPhone(testInfo, 'g4-auto-e2e-304-primary-phone'),
      });
      createdNeighborIds.push(seededNeighbor.neighborId);

      await page.goto(buildStoryG4DirectoryUrl(context));
      const newCard = page.getByTestId(`connectshyft-directory-result-card-${seededNeighbor.neighborId}`);
      await expect(newCard).toBeVisible();

      await newCard.getByTestId('connectshyft-directory-start-conversation-action').click();
      await expect(page).toHaveURL(/\/app\/connectshyft\/threads\//i);

      const notice = page.getByTestId('connectshyft-directory-new-thread-notice');
      await expect(notice).toBeVisible();
      await expect(notice).toContainText(/started a new conversation/i);
      await expect(notice).not.toContainText(context.tenantId);
      await expect(notice).not.toContainText(context.orgUnitId);
      await expect(notice).not.toContainText(/tenant|orgunit|org unit/i);
    },
  );
});
