import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryC1Context,
  createStoryC1Headers,
  type StoryC1Context,
} from '../../support/factories/connectShyftStoryC1Factory';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const buildInboxUrl = (context: StoryC1Context, actorUserId: string): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
    actorUserId,
  });

  return context.paths.inboxUi + '?' + params.toString();
};

const ensureThread = async (request: APIRequestContext, context: StoryC1Context): Promise<void> => {
  const operatorHeaders = createStoryC1Headers(context, {
    orgUnitMemberships: [context.orgUnitId],
  });

  const ensureResponse = await apiRequest(request, {
    method: 'POST',
    path: context.paths.threadsCollection,
    headers: operatorHeaders,
    data: {
      orgUnitId: context.orgUnitId,
      neighborId: context.neighborId,
      source: 'VOICE',
      lastInboundCsNumberId: context.inboundCsNumberId,
      preferredOutboundCsNumberId: context.preferredOutboundCsNumberId,
    },
  });

  expect(ensureResponse.status()).toBe(201);
};

test.describe(
  'Story c.1 automate - core thread schema and lifecycle operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] inbox renders canonical UNCLAIMED thread state with required number metadata after ensure flow @P0',
      async ({ page, request }) => {
        const context = createStoryC1Context();
        await ensureThread(request, context);

        await login(page);
        await page.goto(buildInboxUrl(context, context.userId));

        await expect(page.getByRole('heading', { name: 'ConnectShyft Inbox' })).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-card')).toContainText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-last-inbound-number')).toContainText(
          context.inboundCsNumberId,
        );
        await expect(page.getByTestId('connectshyft-thread-preferred-outbound-number')).toContainText(
          context.preferredOutboundCsNumberId,
        );
      },
    );

    test(
      '[P0] duplicate open interactions keep a single active thread card for the same neighbor tuple @P0',
      async ({ page }) => {
        const context = createStoryC1Context();
        await login(page);

        await page.goto(buildInboxUrl(context, context.userId));
        await page.getByRole('button', { name: 'Open Conversation' }).click();
        await page.reload();
        await page.getByRole('button', { name: 'Open Conversation' }).click();

        await expect(page.getByTestId('connectshyft-thread-card')).toHaveCount(1);
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      },
    );

    test(
      '[P1] journey-level contracts keep canonical envelope keys across ensure refusal and due-thread scheduler paths @P1',
      async ({ request }) => {
        const context = createStoryC1Context();

        const operatorHeaders = createStoryC1Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });
        const schedulerHeaders = createStoryC1Headers(context, {
          role: 'TENANT_STAFF',
        });
        const dueQuery = new URLSearchParams({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          limit: '50',
        }).toString();

        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadsCollection,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: context.inboundCsNumberId,
            preferredOutboundCsNumberId: context.preferredOutboundCsNumberId,
          },
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadsCollection,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborId,
            forcedState: 'PAUSED',
            source: 'VOICE',
          },
        });
        const dueResponse = await apiRequest(request, {
          method: 'GET',
          path: context.paths.dueThreads + '?' + dueQuery,
          headers: schedulerHeaders,
        });

        expect(successResponse.status()).toBe(201);
        expect(refusalResponse.status()).toBe(200);
        expect(dueResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        const dueBody = await dueResponse.json();

        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(successBody, key)),
        ).toBe(true);
        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key)),
        ).toBe(true);
        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(dueBody, key)),
        ).toBe(true);
      },
    );
  },
);
