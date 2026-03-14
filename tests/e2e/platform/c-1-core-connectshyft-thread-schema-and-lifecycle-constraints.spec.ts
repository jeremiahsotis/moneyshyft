import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryC1Context,
  createStoryC1Headers,
  type StoryC1Context,
} from '../../support/factories/connectShyftStoryC1Factory';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const createIsolatedStoryC1Context = (): StoryC1Context => {
  const suffix = randomUUID().slice(0, 8);
  return createStoryC1Context({
    neighborId: `neighbor-connectshyft-c1-${suffix}`,
  });
};

const buildInboxUrl = (
  context: StoryC1Context,
  actorUserId: string,
  threadContext?: {
    neighborId: string;
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
    actorUserId,
    neighborId: threadContext?.neighborId || context.neighborId,
    lastInboundCsNumberId: threadContext?.lastInboundCsNumberId || context.inboundCsNumberId,
    preferredOutboundCsNumberId:
      threadContext?.preferredOutboundCsNumberId || context.preferredOutboundCsNumberId,
  });

  return context.paths.inboxUi + '?' + params.toString();
};

const ensureThread = async (
  request: APIRequestContext,
  context: StoryC1Context,
  threadContext?: {
    neighborId?: string;
    lastInboundCsNumberId?: string;
    preferredOutboundCsNumberId?: string;
  },
): Promise<{
  threadId: string;
  neighborId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
}> => {
  const resolvedThreadContext = {
    neighborId: threadContext?.neighborId || context.neighborId,
    lastInboundCsNumberId: threadContext?.lastInboundCsNumberId || context.inboundCsNumberId,
    preferredOutboundCsNumberId:
      threadContext?.preferredOutboundCsNumberId || context.preferredOutboundCsNumberId,
  };

  const operatorHeaders = createStoryC1Headers(context, {
    orgUnitMemberships: [context.orgUnitId],
  });

  const ensureResponse = await apiRequest(request, {
    method: 'POST',
    path: context.paths.threadsCollection,
    headers: operatorHeaders,
    data: {
      orgUnitId: context.orgUnitId,
      neighborId: resolvedThreadContext.neighborId,
      source: 'VOICE',
      lastInboundCsNumberId: resolvedThreadContext.lastInboundCsNumberId,
      preferredOutboundCsNumberId: resolvedThreadContext.preferredOutboundCsNumberId,
    },
  });

  expect(ensureResponse.status()).toBe(201);
  const ensureBody = await ensureResponse.json();
  const threadId = String(ensureBody?.data?.thread?.threadId || '');
  expect(threadId).not.toHaveLength(0);
  return {
    ...resolvedThreadContext,
    threadId,
  };
};

test.describe(
  'Story c.1 automate - core thread schema and lifecycle operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] inbox renders canonical UNCLAIMED thread state with required number metadata after ensure flow @P0',
      async ({ page, request }) => {
        const context = createIsolatedStoryC1Context();
        const suffix = randomUUID().slice(0, 8);
        const threadContext = await ensureThread(request, context, {
          lastInboundCsNumberId: `cs-inbound-c1-${suffix}`,
          preferredOutboundCsNumberId: `cs-outbound-c1-${suffix}`,
        });

        await login(page);
        await page.goto(buildInboxUrl(context, context.userId, threadContext));

        await expect(page.getByRole('heading', { name: 'ConnectShyft Inbox' })).toBeVisible();
        const targetCard = page.getByTestId(`connectshyft-thread-card-${threadContext.threadId}`);
        await expect(targetCard).toHaveCount(1);
        await expect(targetCard).toContainText('Unclaimed');
        await expect(
          targetCard.getByTestId('connectshyft-thread-last-inbound-number'),
        ).toContainText('cs-number inbound line configured');
        await expect(
          targetCard.getByTestId('connectshyft-thread-preferred-outbound-number'),
        ).toContainText('cs-number outbound line configured');
      },
    );

    test(
      '[P0] duplicate open interactions keep a single active thread card for the same neighbor tuple @P0',
      async ({ page, request }) => {
        const context = createIsolatedStoryC1Context();
        const suffix = randomUUID().slice(0, 8);
        const threadContext = await ensureThread(request, context, {
          lastInboundCsNumberId: `cs-inbound-c1-${suffix}`,
          preferredOutboundCsNumberId: `cs-outbound-c1-${suffix}`,
        });
        await login(page);

        await page.goto(buildInboxUrl(context, context.userId, threadContext));
        const openConversationAction = page.getByTestId('connectshyft-open-conversation-action');
        await expect(openConversationAction).toBeVisible();

        const waitForEnsureResponse = () =>
          page.waitForResponse(
            (response) =>
              response.url().includes(context.paths.threadsCollection)
              && response.request().method() === 'POST',
          );

        const firstEnsureResponse = waitForEnsureResponse();
        await openConversationAction.click();
        expect((await firstEnsureResponse).status()).toBe(201);

        await page.reload();
        await expect(openConversationAction).toBeVisible();

        const secondEnsureResponse = waitForEnsureResponse();
        await openConversationAction.click();
        expect((await secondEnsureResponse).status()).toBe(201);

        const targetCard = page.getByTestId(`connectshyft-thread-card-${threadContext.threadId}`);
        await expect(targetCard).toHaveCount(1);
        await expect(
          targetCard.getByTestId('connectshyft-thread-state-chip'),
        ).toHaveText('Unclaimed');
      },
    );

    test(
      '[P1] journey-level contracts keep canonical envelope keys across ensure refusal and due-thread scheduler paths @P1',
      async ({ request }) => {
        const context = createIsolatedStoryC1Context();
        const suffix = randomUUID().slice(0, 8);
        const threadContext = {
          neighborId: context.neighborId,
          lastInboundCsNumberId: `cs-inbound-c1-${suffix}`,
          preferredOutboundCsNumberId: `cs-outbound-c1-${suffix}`,
        };

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
            neighborId: threadContext.neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: threadContext.lastInboundCsNumberId,
            preferredOutboundCsNumberId: threadContext.preferredOutboundCsNumberId,
          },
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadsCollection,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: threadContext.neighborId,
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
