import { test } from '@playwright/test';
import {
  expect,
  createStoryG2Context,
  openStoryG2Surface,
} from './g-2-inbox-and-mine-surface-rebuild.automate.shared';

test.describe('Story g.2 Inbox and Mine Surface Rebuild (Automate E2E Expansion) - Dispatch & Ownership', () => {
  test(
    '[G2-AUTO-E2E-204][P1] claimed voicemail thread stays in mine with visible indicator across navigation refresh and queue-thread transitions @P1',
    async ({ page }) => {
      const context = createStoryG2Context();
      await openStoryG2Surface({
        page,
        context,
        bucket: 'mine',
        queueSearch: context.searchTerms.voicemail,
      });

      const voicemailCard = page.getByTestId(
        `connectshyft-thread-card-${context.threadIds.voicemailClaimed}`,
      );
      await expect(voicemailCard).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${context.threadIds.voicemailClaimed}`),
      ).toBeVisible();

      await voicemailCard.getByTestId('connectshyft-queue-card-tap-target').click();
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

      await page.getByTestId('connectshyft-bottom-nav-mine').click();
      await expect(voicemailCard).toBeVisible();
      await page.reload();
      await expect(voicemailCard).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${context.threadIds.voicemailClaimed}`),
      ).toBeVisible();

      await page.getByTestId('connectshyft-bottom-nav-inbox').click();
      await expect(
        page.getByTestId(`connectshyft-thread-card-${context.threadIds.voicemailClaimed}`),
      ).toHaveCount(0);
    },
  );

  test(
    '[G2-AUTO-E2E-205][P1] inbox send-message and make-call actions launch neighbor workflows and submit outbound requests with deterministic phone selection @P1',
    async ({ page }) => {
      const context = createStoryG2Context();
      await page.route('**/api/v1/connectshyft/neighbors*', async (route) => {
        const response = await route.fetch();
        const payload = await response.json() as {
          data?: {
            neighbors?: Array<Record<string, unknown>>;
          };
        };

        const existingNeighbors = Array.isArray(payload?.data?.neighbors)
          ? payload.data.neighbors
          : [];
        const neighbors = existingNeighbors.length > 0
          ? existingNeighbors
          : [
            {
              neighborId: 'neighbor-g2-route-fixture-1',
              tenantId: context.tenantId,
              orgUnitId: context.orgUnitId,
              firstName: 'Route',
              lastName: 'Fixture',
              phones: [],
            },
          ];
        const textingEligibleNeighbors = neighbors.map((neighbor, index) => {
          const existingPhones = Array.isArray(neighbor.phones)
            ? (neighbor.phones as Array<Record<string, unknown>>)
            : [];
          const phones = existingPhones.length > 0
            ? existingPhones
            : [
              {
                phoneId: `route-fixture-phone-${index + 1}`,
                label: 'mobile',
                value: `+12605550${String(110 + index).padStart(3, '0')}`,
                sortOrder: 0,
                isPrimary: true,
                isShared: false,
                verificationStatus: 'verified',
              },
            ];

          return {
            ...neighbor,
            prefersTexting: 'YES',
            phones,
          };
        });

        await route.fulfill({
          response,
          json: {
            ...payload,
            data: {
              ...(payload?.data ?? {}),
              neighbors: textingEligibleNeighbors,
            },
          },
        });
      });
      await openStoryG2Surface({
        page,
        context,
        bucket: 'inbox',
      });

      const actionBar = page.getByTestId('connectshyft-inbox-action-bar');
      await expect(actionBar).toBeVisible();
      await expect(actionBar.getByTestId('connectshyft-claim-thread-action')).toHaveCount(0);
      await expect(actionBar.getByTestId('connectshyft-take-over-thread-action')).toHaveCount(0);

      await page.getByTestId('connectshyft-compose-message-action').click();
      await expect(page.getByTestId('connectshyft-send-message-modal')).toBeVisible();

      const messagePhoneOptions = page.getByTestId('connectshyft-send-message-phone-option');
      await expect(messagePhoneOptions.first()).toBeVisible();
      await messagePhoneOptions.first().check();
      await page.getByTestId('connectshyft-send-message-body-input').fill(
        'Automated g.2 outbound message smoke test.',
      );
      const messageDispatchResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/threads/')
          && response.url().includes('/messages')
          && response.request().method() === 'POST',
      );
      await page.getByTestId('connectshyft-send-message-modal-submit').click();
      await expect(page.getByTestId('connectshyft-send-message-modal')).toBeHidden();
      const messageDispatch = await messageDispatchResponse;
      expect(messageDispatch.ok()).toBeTruthy();
      const messagePayload = messageDispatch.request().postDataJSON() as {
        body?: unknown;
        targetPhone?: unknown;
      };
      expect(messagePayload.body).toBe('Automated g.2 outbound message smoke test.');
      expect(typeof messagePayload.targetPhone).toBe('string');
      expect((messagePayload.targetPhone as string).trim().length).toBeGreaterThan(0);

      await page.getByTestId('connectshyft-make-call-action').click();
      await expect(page.getByTestId('connectshyft-make-call-modal')).toBeVisible();

      const callablePhoneOptions = page.getByTestId('connectshyft-make-call-phone-option');
      await expect(callablePhoneOptions.first()).toBeVisible();
      await callablePhoneOptions.first().check();
      const callDispatchResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/threads/')
          && response.url().includes('/call')
          && response.request().method() === 'POST',
      );
      await page.getByTestId('connectshyft-make-call-modal-submit').click();
      await expect(page.getByTestId('connectshyft-make-call-modal')).toBeHidden();
      const callDispatch = await callDispatchResponse;
      expect(callDispatch.ok()).toBeTruthy();
      const callPayload = callDispatch.request().postDataJSON() as {
        targetPhone?: unknown;
      };
      expect(typeof callPayload.targetPhone).toBe('string');
      expect((callPayload.targetPhone as string).trim().length).toBeGreaterThan(0);
    },
  );

  test(
    '[G2-AUTO-E2E-206][P1] thread-surface composer dispatches outbound message through the selected thread endpoint with deterministic payload body @P1',
    async ({ page }) => {
      const context = createStoryG2Context();
      await openStoryG2Surface({
        page,
        context,
        bucket: 'inbox',
      });

      const firstTapTarget = page.getByTestId('connectshyft-queue-card-tap-target').first();
      await expect(firstTapTarget).toBeVisible();
      await firstTapTarget.click();
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

      const messageBody = 'Automated g.2 thread composer dispatch verification.';
      const composerInput = page.getByTestId('connectshyft-composer-input');
      await expect(composerInput).toBeVisible();
      await composerInput.fill(messageBody);

      const dispatchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/threads/')
          && response.url().includes('/messages')
          && response.request().method() === 'POST',
      );
      await page.getByTestId('connectshyft-composer-submit').click();
      const dispatchResponse = await dispatchResponsePromise;
      expect(dispatchResponse.ok()).toBeTruthy();

      const dispatchPayload = dispatchResponse.request().postDataJSON() as {
        body?: unknown;
        targetPhone?: unknown;
      };
      expect(dispatchPayload.body).toBe(messageBody);
      expect(dispatchPayload.targetPhone).toBeUndefined();

      const dispatchBody = await dispatchResponse.json();
      expect(dispatchBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      });
    },
  );
});
