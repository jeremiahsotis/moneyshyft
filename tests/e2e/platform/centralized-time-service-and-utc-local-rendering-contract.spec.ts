import { test, expect } from '../../support/fixtures/timezoneContext.fixture';

test.describe('Story 0.8 atdd - centralized time service and utc/local rendering contract', () => {
  test.skip('[P0] renders localized operation time from utc in operational grid @P0', async ({ page }) => {
    // Given the operations page receives UTC data and timezone contract values
    await page.route('**/api/v1/platform/operations/feed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: [
            {
              id: 'op-001',
              occurredAtUtc: '2026-02-17T15:30:00.000Z',
              occurredAtLocal: '2026-02-17 10:30 AM',
              timezoneSource: 'user',
            },
          ],
        }),
      });
    });

    // When the user opens the operations view
    await page.goto('/operations');

    // Then localized operational timestamp should be visible
    await expect(page.getByTestId('operations-time-cell')).toHaveText('2026-02-17 10:30 AM');
    await expect(page.getByTestId('timezone-source-badge')).toHaveText('user');
  });

  test.skip('[P1] shows tenant fallback indicator when user timezone is unavailable @P1', async ({ page }) => {
    // Given user timezone is absent and tenant timezone fallback is returned
    await page.route('**/api/v1/platform/time/render-context', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          timezone: 'America/Chicago',
          timezoneSource: 'tenant',
        }),
      });
    });

    // When loading the operations screen
    await page.goto('/operations');

    // Then tenant fallback indicator should be shown
    await expect(page.getByTestId('timezone-source-badge')).toHaveText('tenant');
  });

  test.skip('[P1] never surfaces raw utc iso text in operational ui elements @P1', async ({ page }) => {
    // Given backend sends both utc and localized values
    await page.route('**/api/v1/platform/operations/feed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: [
            {
              id: 'op-002',
              occurredAtUtc: '2026-02-17T18:45:00.000Z',
              occurredAtLocal: '2026-02-17 01:45 PM',
              timezoneSource: 'user',
            },
          ],
        }),
      });
    });

    // When user reviews operational rows
    await page.goto('/operations');

    // Then raw UTC ISO should not appear in the rendered UI
    await expect(page.getByText('2026-02-17T18:45:00.000Z')).toHaveCount(0);
    await expect(page.getByTestId('operations-time-cell')).toHaveText('2026-02-17 01:45 PM');
  });

  test.skip('[P1] shows system timezone source when user and tenant preferences are unavailable @P1', async ({
    page,
  }) => {
    // Given render-context endpoint reports system fallback
    await page.route('**/api/v1/platform/time/render-context', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          timezone: 'UTC',
          timezoneSource: 'system',
        }),
      });
    });

    // When operations page is loaded
    await page.goto('/operations');

    // Then system timezone source should be explicitly displayed
    await expect(page.getByTestId('timezone-source-badge')).toHaveText('system');
  });

  test.skip('[P1] keeps operational rows stable while rendering timezone-specific local values @P1', async ({
    page,
  }) => {
    // Given backend returns multiple rows with timezone-aware local render fields
    await page.route('**/api/v1/platform/operations/feed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: [
            {
              id: 'op-010',
              occurredAtUtc: '2026-02-17T15:30:00.000Z',
              occurredAtLocal: '2026-02-17 10:30 AM',
              timezoneSource: 'user',
            },
            {
              id: 'op-011',
              occurredAtUtc: '2026-02-17T21:15:00.000Z',
              occurredAtLocal: '2026-02-17 04:15 PM',
              timezoneSource: 'user',
            },
          ],
        }),
      });
    });

    // When operations page is loaded
    await page.goto('/operations');

    // Then operation row count and localized values should render deterministically
    await expect(page.getByTestId('operations-row')).toHaveCount(2);
    await expect(page.getByTestId('operations-time-cell').first()).toHaveText('2026-02-17 10:30 AM');
    await expect(page.getByTestId('operations-time-cell').last()).toHaveText('2026-02-17 04:15 PM');
  });
});
