import { test, expect, type Page } from '@playwright/test';

const mockUnifiedShellApis = async (page: Page) => {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1/, '');

    if (path === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-shell-smoke-1',
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/context') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            context: {
              tenantId: 'tenant-shell-smoke-1',
              orgUnitId: 'org-east',
              orgUnits: [
                {
                  id: 'org-east',
                  label: 'East Campus',
                  availableModules: {
                    people: true,
                    connect: true,
                    settings: true,
                  },
                },
              ],
              telephony: {
                operatorPhoneSource: 'callback_number',
                voiceReady: true,
                smsReady: true,
                degradedMode: false,
              },
            },
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/resolver-queue') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          code: 'CONNECTSHYFT_RESOLVER_QUEUE_LISTED',
          message: 'ConnectShyft resolver queue listed',
          data: {
            items: [],
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/availability') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            flags: {
              connectshyft_enabled: true,
              connectshyft_inbox_enabled: true,
              connectshyft_escalation_enabled: true,
              connectshyft_webhooks_enabled: true,
            },
            capabilities: {
              module: true,
              inbox: true,
              escalation: true,
              webhooks: true,
            },
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/inbox') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          code: 'CONNECTSHYFT_INBOX_LISTED',
          message: 'ConnectShyft threads loaded',
          data: {
            items: [],
            actions: {
              claim: false,
              takeover: false,
            },
            context: {
              tenantId: 'tenant-shell-smoke-1',
              orgUnitId: 'org-east',
              bypassedOrgUnitMembership: false,
            },
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/neighbors') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED',
          data: {
            scope: {
              tenantId: 'tenant-shell-smoke-1',
              orgUnitId: 'org-east',
            },
            neighbors: [
              {
                neighborId: 'neighbor-1',
                tenantId: 'tenant-shell-smoke-1',
                orgUnitId: 'org-east',
                firstName: 'Ava',
                lastName: 'Neighbor',
                prefersTexting: 'YES',
                phones: [
                  {
                    phoneId: 'phone-1',
                    label: 'Mobile',
                    value: '(555) 123-4567',
                    sortOrder: 0,
                    isPrimary: true,
                    isShared: false,
                    verificationStatus: 'verified',
                    status: 'active_personal',
                  },
                ],
              },
            ],
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/settings/navigation') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            primaryOptions: [
              {
                key: 'settings',
                label: 'Call routing',
                path: '/app/connectshyft/settings',
              },
            ],
            adminOptions: [],
            pathways: [
              {
                path: '/app/connectshyft/settings',
                allowed: true,
              },
            ],
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/operator/callback-number') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            callbackNumber: {
              value: '+15551234567',
              rawInput: '+1 (555) 123-4567',
              createdAtUtc: '2026-03-24T10:00:00.000Z',
              updatedAtUtc: '2026-03-24T10:00:00.000Z',
            },
          },
        }),
      });
      return;
    }

    if (path === '/connectshyft/telephony-readiness') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            providerReady: true,
            providerSelectionPathActive: true,
            webhookSignatureConfigured: true,
            orgUnitNumberMappingReady: true,
            voiceSupported: true,
            callbackNumberConfigured: true,
            callbackNumberNormalized: true,
            voiceReady: true,
            bridgeCallRunnable: true,
            smsReady: true,
            messageDispatchRunnable: true,
            operatorPhoneSource: 'callback_number',
            degradedMode: false,
            callbackNumber: {
              value: '+15551234567',
              rawInput: '+1 (555) 123-4567',
              createdAtUtc: '2026-03-24T10:00:00.000Z',
              updatedAtUtc: '2026-03-24T10:00:00.000Z',
              persistenceAvailable: true,
            },
            blockingReasons: [],
            nextActions: [],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        message: `Unhandled shell smoke API route: ${path}`,
      }),
    });
  });
};

test.describe('ConnectShyft shell smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnifiedShellApis(page);
  });

  test('loads the unified shell routes @P1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-shell-root')).toBeVisible();
    await expect(page.getByTestId('shell-primary-nav')).toBeVisible();
    await expect(page.getByTestId('shell-primary-nav-people')).toBeVisible();
    await expect(page.getByTestId('shell-primary-nav-connect')).toBeVisible();
    await expect(page.getByTestId('shell-primary-nav-settings')).toBeVisible();
    await expect(page.getByText('Resolver workspace')).toBeVisible();
    await expect(page.getByText('Primary queue for identity and rebind reviews')).toBeVisible();

    await page.getByTestId('shell-primary-nav-connect').click();
    await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();
    await expect(page.getByText('1 neighbor is ready to reach out')).toBeVisible();
    await page.getByTestId('connectshyft-section-nav-directory').click();
    await expect(page.getByTestId('connectshyft-section-nav')).toBeVisible();
    await expect(page.getByTestId('connectshyft-directory-surface')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Neighbor Directory' })).toBeVisible();
    await expect(page.getByText('Ava Neighbor')).toBeVisible();

    await page.getByTestId('shell-primary-nav-settings').click();
    await expect(page.getByTestId('shell-settings-nav')).toBeVisible();
    await expect(page.getByTestId('connectshyft-settings-surface')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ConnectShyft Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Callback / forwarding number' })).toBeVisible();
  });
});
