import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../../support/helpers/connectShyftNumberMappingTestHelpers';
import {
  createStoryC4Context,
  createStoryC4Headers,
  type StoryC4Context,
} from '../../support/factories/connectShyftStoryC4Factory';
import { test, expect } from '@playwright/test';

const resolveConnectShyftDbConnection = () => {
  const databaseUrl =
    process.env.MONEYSHYFT_TEST_DATABASE_URL
    || process.env.DATABASE_URL;
  if (databaseUrl) {
    return databaseUrl;
  }

  return {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 5432),
    database: process.env.TEST_DB_NAME || 'moneyshyft',
    user: process.env.TEST_DB_USER || 'jeremiahotis',
    password: process.env.TEST_DB_PASSWORD,
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

type SideEffectCounts = {
  events: number;
  outbox: number;
};

const readCount = async (query: ReturnType<typeof connectShyftDb.withSchema>): Promise<number> => {
  const counted = await query
    .count<{ count: string | number }>({ count: '*' })
    .first();

  return Number(counted?.count ?? 0);
};

const ensureDbTenant = async (tenantId: string): Promise<void> => {
  const invitationCode = tenantId.replace(/-/g, '').slice(0, 10);
  const tenantName = `Story d3 tenant ${tenantId.slice(0, 8)}`;
  await connectShyftDb('households')
    .insert({
      id: tenantId,
      name: tenantName,
      invitation_code: invitationCode,
    })
    .onConflict('id')
    .ignore();

  await connectShyftDb
    .withSchema('platform')
    .table('tenants')
    .insert({
      id: tenantId,
      name: tenantName,
      status: 'active',
    })
    .onConflict('id')
    .ignore();

  await connectShyftDb
    .withSchema('platform')
    .table('tenant_module_entitlements')
    .insert({
      tenant_id: tenantId,
      module_key: 'connectshyft',
      enabled: true,
      reason: 'story-d3-test-seed',
    })
    .onConflict(['tenant_id', 'module_key'])
    .merge({
      enabled: true,
      reason: 'story-d3-test-seed',
      updated_at_utc: connectShyftDb.fn.now(),
    });
};

const ensureDbActorUser = async (userId: string, tenantId: string): Promise<void> => {
  await connectShyftDb('users')
    .insert({
      id: userId,
      email: `connectshyft-d3-${userId}@example.test`,
      password_hash: 'test-password-hash',
      first_name: 'ConnectShyft',
      last_name: 'D3 Operator',
      household_id: tenantId,
      role: 'member',
    })
    .onConflict('id')
    .ignore();
};

const countThreadSideEffects = async (
  tenantId: string,
  threadId: string,
): Promise<SideEffectCounts> => {
  const events = await readCount(
    connectShyftDb
      .withSchema('platform')
      .table('events')
      .where({
        tenant_id: tenantId,
        entity_type: 'connectshyft.thread',
        entity_id: threadId,
      }),
  );

  const outbox = await readCount(
    connectShyftDb
      .withSchema('platform')
      .table('outbox_events')
      .where({
        tenant_id: tenantId,
        entity_type: 'connectshyft.thread',
        entity_id: threadId,
      }),
  );

  return { events, outbox };
};

const listThreadEvents = async (tenantId: string, threadId: string) => {
  return connectShyftDb
    .withSchema('platform')
    .table('events')
    .where({
      tenant_id: tenantId,
      entity_type: 'connectshyft.thread',
      entity_id: threadId,
    })
    .orderBy('occurred_at_utc', 'desc')
    .orderBy('id', 'desc')
    .select<{
      event_name: string;
      payload: Record<string, unknown>;
    }[]>(['event_name', 'payload']);
};

const buildDbBackedContext = () => {
  const tenantId = randomUUID();
  const orgUnitId = randomUUID();
  const actorUserId = randomUUID();

  const context = createStoryC4Context({
    tenantId,
    orgUnitId,
    userId: actorUserId,
    role: 'ORGUNIT_MEMBER',
  });

  const headers = createStoryC4Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: actorUserId,
    orgUnitMemberships: [orgUnitId],
  });
  headers['x-test-connectshyft-tenant-id'] = tenantId;
  headers['x-test-connectshyft-orgunit-id'] = orgUnitId;
  headers['x-test-connectshyft-role'] = 'ORGUNIT_MEMBER';
  headers['x-test-connectshyft-user-id'] = actorUserId;

  return {
    context,
    headers,
    actorUserId,
  };
};

const ensureDbThread = async (
  request: Parameters<typeof apiRequest>[0],
  context: StoryC4Context,
  headers: Record<string, string>,
) => {
  const ensureResponse = await apiRequest(request, {
    method: 'POST',
    path: context.paths.threads,
    headers,
    data: {
      orgUnitId: context.orgUnitId,
      neighborId: `neighbor-d3-${randomUUID().slice(0, 8)}`,
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-number-d3-inbound',
      preferredOutboundCsNumberId: 'cs-number-d3-outbound',
    },
  });

  expect([200, 201]).toContain(ensureResponse.status());
  const ensureBody = await ensureResponse.json();
  if (!ensureBody?.data?.thread?.threadId) {
    throw new Error(`Unable to ensure db-backed thread: ${JSON.stringify(ensureBody)}`);
  }
  const threadId = ensureBody?.data?.thread?.threadId as string;
  expect(threadId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

  return threadId;
};

const ensureDbBackedSmsSenderReady = async (
  request: Parameters<typeof apiRequest>[0],
  context: StoryC4Context,
  actorUserId: string,
) => {
  const preferredNumber = `+1${actorUserId.replace(/\D/g, '').padEnd(10, '0').slice(0, 10)}`;
  const adminHeaders = createStoryC4Headers(context, {
    role: 'ORGUNIT_ADMIN',
    userId: context.adminUserId,
    orgUnitMemberships: [context.orgUnitId],
  });
  await ensureSingleActiveConnectShyftSmsSenderMapping({
    request,
    headers: adminHeaders,
    orgUnitId: context.orgUnitId,
    preferredNumber,
    preferredLabel: 'Story D3 DB-backed SMS sender',
  });
};

test.describe('Story d.3 outbound audit outbox and refusal envelope integration (Automate API Expansion)', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    await connectShyftDb.destroy();
  });

  test(
    '[P0] active-thread outbound message persists atomic audit and outbox records with canonical metadata @P0',
    async ({ request }) => {
      const { context, headers, actorUserId } = buildDbBackedContext();
      await ensureDbTenant(context.tenantId);
      await ensureDbActorUser(actorUserId, context.tenantId);
      await ensureDbBackedSmsSenderReady(request, context, actorUserId);

      const threadId = await ensureDbThread(request, context, headers);
      const beforeCounts = await countThreadSideEffects(context.tenantId, threadId);

      const outboundResponse = await apiRequest(request, {
        method: 'POST',
        path: `${context.paths.threads}/${threadId}/messages`,
        headers,
        data: {
          orgUnitId: context.orgUnitId,
          channel: 'sms',
          body: 'd3 outbound traceability check',
        },
      });

      expect(outboundResponse.status()).toBe(200);
      const outboundBody = await outboundResponse.json();
      expect(outboundBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
        data: {
          threadId,
          sideEffectsPersisted: true,
          audit: {
            metadata: {
              tenant_id: context.tenantId,
              org_unit_id: context.orgUnitId,
              thread_id: threadId,
              actor_user_id: actorUserId,
              action: 'outbound_message',
              prior_state: 'UNCLAIMED',
              new_state: 'UNCLAIMED',
            },
          },
          outbox: {
            metadata: {
              tenant_id: context.tenantId,
              org_unit_id: context.orgUnitId,
              thread_id: threadId,
              actor_user_id: actorUserId,
              action: 'outbound_message',
              prior_state: 'UNCLAIMED',
              new_state: 'UNCLAIMED',
            },
          },
        },
      });

      const afterCounts = await countThreadSideEffects(context.tenantId, threadId);
      // Outbound message writes lifecycle + canonical events and corresponding outbox records.
      expect(afterCounts.events).toBe(beforeCounts.events + 2);
      expect(afterCounts.outbox).toBe(beforeCounts.outbox + 2);
    },
  );

  test(
    '[P0] closed-thread outbound call preserves reopen lineage metadata and persists durable side effects @P0',
    async ({ request }) => {
      const { context, headers, actorUserId } = buildDbBackedContext();
      await ensureDbTenant(context.tenantId);
      await ensureDbActorUser(actorUserId, context.tenantId);

      const threadId = await ensureDbThread(request, context, headers);

      const claimResponse = await apiRequest(request, {
        method: 'POST',
        path: `${context.paths.threads}/${threadId}/claim`,
        headers,
        data: {
          orgUnitId: context.orgUnitId,
        },
      });
      expect(claimResponse.status()).toBe(200);

      const closeResponse = await apiRequest(request, {
        method: 'POST',
        path: `${context.paths.threads}/${threadId}/close`,
        headers,
        data: {
          orgUnitId: context.orgUnitId,
          resolution: 'd3-outbound-reopen-check',
        },
      });
      expect(closeResponse.status()).toBe(200);

      const beforeCounts = await countThreadSideEffects(context.tenantId, threadId);

      const callResponse = await apiRequest(request, {
        method: 'POST',
        path: `${context.paths.threads}/${threadId}/call`,
        headers,
        data: {
          orgUnitId: context.orgUnitId,
        },
      });

      expect(callResponse.status()).toBe(200);
      const callBody = await callResponse.json();
      expect(callBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
        data: {
          thread: {
            threadId,
            state: 'UNCLAIMED',
          },
          lifecycleEvent: 'connectshyft.thread_reopened_by_user',
          sideEffectsPersisted: true,
          audit: {
            metadata: {
              prior_state: 'CLOSED',
              new_state: 'UNCLAIMED',
              action: 'outbound_call',
              thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
            },
          },
          outbox: {
            metadata: {
              prior_state: 'CLOSED',
              new_state: 'UNCLAIMED',
              action: 'outbound_call',
              thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
            },
          },
          outboundDispatch: {
            audit: {
              metadata: {
                prior_state: 'UNCLAIMED',
                new_state: 'UNCLAIMED',
                action: 'outbound_call',
                thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
              },
            },
            outbox: {
              metadata: {
                prior_state: 'UNCLAIMED',
                new_state: 'UNCLAIMED',
                action: 'outbound_call',
                thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
              },
            },
          },
        },
      });

      const afterCounts = await countThreadSideEffects(context.tenantId, threadId);
      // Closed-thread outbound call writes reopen + dispatch + canonical side effects.
      expect(afterCounts.events).toBe(beforeCounts.events + 3);
      expect(afterCounts.outbox).toBe(beforeCounts.outbox + 3);

      const threadEvents = await listThreadEvents(context.tenantId, threadId);
      expect(threadEvents.map((event) => event.event_name)).toEqual(expect.arrayContaining([
        'connectshyft.thread_reopened_by_user',
        'connectshyft.thread.outbound_call_dispatched',
      ]));

      const reopenedEvent = threadEvents.find((event) => event.event_name === 'connectshyft.thread_reopened_by_user');
      expect(reopenedEvent?.payload).toEqual(expect.objectContaining({
        prior_state: 'CLOSED',
        new_state: 'UNCLAIMED',
        action: 'outbound_call',
        thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
      }));

      const dispatchedEvent = threadEvents.find((event) => event.event_name === 'connectshyft.thread.outbound_call_dispatched');
      expect(dispatchedEvent?.payload).toEqual(expect.objectContaining({
        prior_state: 'UNCLAIMED',
        new_state: 'UNCLAIMED',
        action: 'outbound_call',
        thread_reopened_by_user: 'connectshyft.thread_reopened_by_user',
      }));
    },
  );

  test(
    '[P1] outbound not-found refusals remain deterministic and write no audit outbox side effects @P1',
    async ({ request }) => {
      const { context, headers, actorUserId } = buildDbBackedContext();
      await ensureDbTenant(context.tenantId);
      await ensureDbActorUser(actorUserId, context.tenantId);

      const missingThreadId = randomUUID();
      const beforeCounts = await countThreadSideEffects(context.tenantId, missingThreadId);

      const response = await apiRequest(request, {
        method: 'POST',
        path: `${context.paths.threads}/${missingThreadId}/call`,
        headers,
        data: {
          orgUnitId: context.orgUnitId,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
        refusalType: 'business',
      });
      expect(body).not.toHaveProperty('data.audit');
      expect(body).not.toHaveProperty('data.outbox');

      const afterCounts = await countThreadSideEffects(context.tenantId, missingThreadId);
      expect(afterCounts.events).toBe(beforeCounts.events);
      expect(afterCounts.outbox).toBe(beforeCounts.outbox);
    },
  );

  test(
    '[P1] policy refusals on outbound call preserve deterministic envelope and do not write side effects @P1',
    async ({ request }) => {
      const { context, headers, actorUserId } = buildDbBackedContext();
      await ensureDbTenant(context.tenantId);
      await ensureDbActorUser(actorUserId, context.tenantId);

      const threadId = await ensureDbThread(request, context, headers);
      const beforeCounts = await countThreadSideEffects(context.tenantId, threadId);

      const response = await apiRequest(request, {
        method: 'POST',
        path: `${context.paths.threads}/${threadId}/call`,
        headers: {
          ...headers,
          'x-test-connectshyft-orgunit-memberships': JSON.stringify([]),
        },
        data: {
          orgUnitId: context.orgUnitId,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
        refusalType: 'business',
      });

      const afterCounts = await countThreadSideEffects(context.tenantId, threadId);
      expect(afterCounts.events).toBe(beforeCounts.events);
      expect(afterCounts.outbox).toBe(beforeCounts.outbox);
    },
  );
});
