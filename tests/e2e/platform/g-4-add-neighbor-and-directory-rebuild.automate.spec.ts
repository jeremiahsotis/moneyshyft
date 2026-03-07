import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryG4Context,
  createStoryG4Headers,
  createStoryG4NeighborCreatePayload,
  createStoryG4ThreadEnsurePayload,
  type StoryG4Context,
} from '../../support/factories/connectShyftStoryG4Factory';

type ConnectShyftCreateNeighborEnvelope = {
  ok?: boolean;
  data?: {
    neighbor?: {
      neighborId?: string;
    };
  };
};

type ConnectShyftEnsureThreadEnvelope = {
  ok?: boolean;
  data?: {
    thread?: {
      threadId?: string;
    };
  };
};

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

const buildUniquePhone = (suffixSeed: string): string => {
  const digits = suffixSeed.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `+1260555${digits}`;
};

const createNeighborSeed = async (
  request: APIRequestContext,
  context: StoryG4Context,
  input: {
    firstName: string;
    lastName: string;
    primaryPhone: string;
    additionalPhone?: string;
    orgUnitId?: string;
    orgUnitMemberships?: string[];
  },
): Promise<string> => {
  const headers = createStoryG4Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: context.userId,
    orgUnitId: input.orgUnitId ?? context.orgUnitId,
    orgUnitMemberships: input.orgUnitMemberships ?? [input.orgUnitId ?? context.orgUnitId],
  });

  const response = await apiRequest(request, {
    method: 'POST',
    path: context.paths.neighborsCollection,
    headers,
    data: createStoryG4NeighborCreatePayload(context, {
      orgUnitId: input.orgUnitId ?? context.orgUnitId,
      firstName: input.firstName,
      lastName: input.lastName,
      phones: [
        {
          label: 'mobile',
          value: input.primaryPhone,
          isShared: false,
        },
        ...(input.additionalPhone
          ? [
            {
              label: 'home',
              value: input.additionalPhone,
              isShared: true,
            },
          ]
          : []),
      ],
    }),
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ConnectShyftCreateNeighborEnvelope;
  expect(body.ok).toBe(true);

  const neighborId = String(body.data?.neighbor?.neighborId ?? '').trim();
  expect(neighborId.length).toBeGreaterThan(0);

  return neighborId;
};

const ensureExistingThreadSeed = async (
  request: APIRequestContext,
  context: StoryG4Context,
  neighborId: string,
): Promise<string> => {
  const headers = createStoryG4Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: context.userId,
    orgUnitMemberships: [context.orgUnitId],
  });

  const payload = createStoryG4ThreadEnsurePayload(context, {
    neighborId,
  });

  const response = await apiRequest(request, {
    method: 'POST',
    path: context.paths.threadsCollection,
    headers,
    data: payload,
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ConnectShyftEnsureThreadEnvelope;
  expect(body.ok).toBe(true);

  const threadId = String(body.data?.thread?.threadId ?? '').trim();
  expect(threadId.length).toBeGreaterThan(0);
  return threadId;
};

const context = createStoryG4Context();

test.describe('Story g.4 Add Neighbor and Directory Rebuild (Automate E2E Expansion)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test(
    '[G4-AUTO-E2E-301][P0] directory search input updates trigger backend refresh with mode and query parameters before rendering filtered results @P0',
    async ({ page, request }) => {
      await createNeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'AutoReloadDirectory',
        primaryPhone: buildUniquePhone(Date.now().toString()),
      });

      await page.goto(buildStoryG4DirectoryUrl(context));
      await expect(page.getByTestId('connectshyft-directory-surface')).toBeVisible();

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

      const formattedPhoneQuery = '(260) 555-0199';
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

      await expect(page.getByTestId('connectshyft-directory-result-card').first()).toBeVisible();
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
    async ({ page, request }) => {
      const neighborId = await createNeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'AutoExistingNotice',
        primaryPhone: buildUniquePhone((Date.now() + 11).toString()),
      });
      const existingThreadId = await ensureExistingThreadSeed(request, context, neighborId);

      await page.goto(buildStoryG4DirectoryUrl(context));
      const existingCard = page.getByTestId(`connectshyft-directory-result-card-${neighborId}`);
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
    async ({ page, request }) => {
      const neighborId = await createNeighborSeed(request, context, {
        firstName: context.searchTerms.byName,
        lastName: 'AutoNewNotice',
        primaryPhone: buildUniquePhone((Date.now() + 23).toString()),
      });

      await page.goto(buildStoryG4DirectoryUrl(context));
      const newCard = page.getByTestId(`connectshyft-directory-result-card-${neighborId}`);
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
