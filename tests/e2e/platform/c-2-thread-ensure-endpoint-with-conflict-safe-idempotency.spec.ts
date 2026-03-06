import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryC1Context,
  createStoryC1Headers,
  type StoryC1Context,
} from '../../support/factories/connectShyftStoryC1Factory';

const resolveConnectShyftDbConnection = () => {
  const databaseUrl =
    process.env.MONEYSHYFT_TEST_DATABASE_URL
    || (process.env.CI === 'true' ? process.env.DATABASE_URL : undefined);
  if (databaseUrl) {
    return databaseUrl;
  }

  return {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 5432),
    database: process.env.TEST_DB_NAME || 'moneyshyft',
    user: process.env.TEST_DB_USER || 'jeremiahotis',
    password: process.env.TEST_DB_PASSWORD || 'Oiurueu12',
  };
};

const createConnectShyftDbClient = () => {
  const knexFactory = require('../../../apps/moneyshyft-api/node_modules/knex');
  return knexFactory({
    client: 'postgresql',
    connection: resolveConnectShyftDbConnection(),
    pool: {
      min: 0,
      max: 2,
    },
  });
};

const connectShyftDb = createConnectShyftDbClient();

const cleanupEnsuredThread = async (input: {
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
}) => {
  await connectShyftDb
    .withSchema('connectshyft')
    .table('cs_threads')
    .where({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId,
      neighbor_id: input.neighborId,
    })
    .del();
};

const buildInboxUrl = (
  context: StoryC1Context,
  actorUserId: string,
  threadContext: {
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
    neighborId: threadContext.neighborId,
    lastInboundCsNumberId: threadContext.lastInboundCsNumberId,
    preferredOutboundCsNumberId: threadContext.preferredOutboundCsNumberId,
  });

  return `${context.paths.inboxUi}?${params.toString()}`;
};

test.describe(
  'Story c.2 automate - thread ensure endpoint conflict-safe idempotency operator journey',
  () => {
    test.describe.configure({ mode: 'serial' });
    test.afterAll(async () => {
      await connectShyftDb.destroy();
    });

    test(
      '[P0] operator sees one card and enters the same ensured thread context after concurrent ensure calls @P0',
      async ({ page, request }) => {
        const suffix = randomUUID().slice(0, 8);
        const context = createStoryC1Context({
          neighborId: `neighbor-connectshyft-c2-${suffix}`,
        });
        const operatorHeaders = createStoryC1Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });
        const ensurePayload = {
          orgUnitId: context.orgUnitId,
          neighborId: context.neighborId,
          source: 'VOICE',
          lastInboundCsNumberId: `cs-inbound-c2-${suffix}`,
          preferredOutboundCsNumberId: `cs-outbound-c2-${suffix}`,
        };

        try {
          const [firstResponse, secondResponse] = await Promise.all([
            apiRequest(request, {
              method: 'POST',
              path: context.paths.threadsCollection,
              headers: operatorHeaders,
              data: ensurePayload,
            }),
            apiRequest(request, {
              method: 'POST',
              path: context.paths.threadsCollection,
              headers: operatorHeaders,
              data: ensurePayload,
            }),
          ]);

          expect(firstResponse.status()).toBe(201);
          expect(secondResponse.status()).toBe(201);

          const firstBody = await firstResponse.json();
          const secondBody = await secondResponse.json();
          const threadId = firstBody?.data?.thread?.threadId as string;
          expect(threadId).toBeTruthy();
          expect(secondBody?.data?.thread?.threadId).toBe(threadId);

          await login(page);
          await page.goto(buildInboxUrl(context, context.userId, ensurePayload));

          await expect(page.getByRole('heading', { name: 'ConnectShyft Inbox' })).toBeVisible();

          const targetCard = page
            .getByTestId('connectshyft-thread-card')
            .filter({ hasText: ensurePayload.lastInboundCsNumberId });
          await expect(targetCard).toHaveCount(1);

          await targetCard.getByTestId('connectshyft-thread-card-primary-action').click();
          await expect(page).toHaveURL(new RegExp(`/app/connectshyft/threads/${threadId}`));
          await expect(page.getByTestId('connectshyft-thread-id-chip')).toContainText(threadId);
        } finally {
          await cleanupEnsuredThread({
            tenantId: context.tenantId,
            orgUnitId: context.orgUnitId,
            neighborId: ensurePayload.neighborId,
          });
        }
      },
    );
  },
);
