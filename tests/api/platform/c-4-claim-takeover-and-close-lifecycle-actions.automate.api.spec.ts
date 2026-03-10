import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC4.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

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

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const ensureDbActorUser = async (userId: string): Promise<void> => {
  const existingUser = await connectShyftDb('users')
    .where({ id: userId })
    .first<{ id: string }>('id');
  if (existingUser) {
    return;
  }

  await connectShyftDb('users')
    .insert({
      id: userId,
      email: `connectshyft-c4-${userId}@example.test`,
      password_hash: 'test-password-hash',
      first_name: 'ConnectShyft',
      last_name: 'Test Actor',
      role: 'member',
    })
    .onConflict('id')
    .ignore();
};

test.describe(
  'Story c.4 claim, takeover, and close lifecycle actions (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });
    test.afterAll(async () => {
      await connectShyftDb.destroy();
    });

    test(
      '[P0] claim action returns canonical envelope keys and orgUnit-scoped context for authorized members @P0',
      async ({ request, storyC4Context, storyC4MemberHeaders, storyC4ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
          headers: storyC4MemberHeaders,
          data: storyC4ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLAIMED',
          data: {
            threadId: storyC4Context.threadIds.unclaimed,
            context: {
              tenantId: storyC4Context.tenantId,
              orgUnitId: storyC4Context.orgUnitId,
            },
          },
        });
      },
    );

    test(
      '[P0] takeover action returns canonical envelope keys, explicit reason, and takeover-ready context @P0',
      async ({ request, storyC4Context, storyC4AdminHeaders, storyC4TakeoverPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.claimed}/takeover`,
          headers: storyC4AdminHeaders,
          data: storyC4TakeoverPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_TAKEOVER_READY',
          data: {
            threadId: storyC4Context.threadIds.claimed,
            reason: storyC4TakeoverPayload.reason,
            context: {
              tenantId: storyC4Context.tenantId,
              orgUnitId: storyC4Context.orgUnitId,
            },
          },
        });
      },
    );

    test(
      '[P1] tenant-viewer claim attempts are refused with deterministic refusal envelope and no thread mutation payload @P1',
      async ({ request, storyC4Context, storyC4ViewerHeaders, storyC4ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
          headers: storyC4ViewerHeaders,
          data: storyC4ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(body).not.toHaveProperty('data.thread');
      },
    );

    test(
      '[P1] orgUnit admins without membership are refused lifecycle action execution unless tenant-privileged override applies @P1',
      async ({ request, storyC4Context, storyC4AdminHeaders, storyC4ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
          headers: {
            ...storyC4AdminHeaders,
            'x-test-connectshyft-orgunit-memberships': JSON.stringify([]),
          },
          data: storyC4ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
          refusalType: 'business',
          message: expect.any(String),
        });
      },
    );

    test(
      '[P1] lifecycle actions on unknown thread ids are refused with deterministic not-found envelopes @P1',
      async ({ request, storyC4Context, storyC4MemberHeaders, storyC4ClaimPayload }) => {
        const missingThreadId = randomUUID();
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${missingThreadId}/claim`,
          headers: storyC4MemberHeaders,
          data: storyC4ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
          refusalType: 'business',
        });
      },
    );

    test(
      '[P1] close action transitions CLAIMED to CLOSED with audit and outbox provenance metadata when close endpoint lands @P1',
      async ({ request, storyC4Context, storyC4AdminHeaders, storyC4ClosePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.claimed}/close`,
          headers: storyC4AdminHeaders,
          data: storyC4ClosePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLOSED',
          data: {
            thread: {
              threadId: storyC4Context.threadIds.claimed,
              state: 'CLOSED',
            },
            audit: {
              metadata: expect.objectContaining({
                actor_user_id: storyC4Context.adminUserId,
                org_unit_id: storyC4Context.orgUnitId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                actor_user_id: storyC4Context.adminUserId,
                org_unit_id: storyC4Context.orgUnitId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
          },
        });
      },
    );

    test(
      '[P1] db-backed CLOSED reopen transitions reset escalation stage to 0 on the same persisted thread id @P1',
      async ({ request, storyC4Context, storyC4MemberHeaders }) => {
        const neighborId = `neighbor-c4-db-${randomUUID().slice(0, 8)}`;
        const dbActorUserId = randomUUID();
        await ensureDbActorUser(dbActorUserId);
        const dbHeaders = {
          ...storyC4MemberHeaders,
          'x-test-connectshyft-user-id': dbActorUserId,
        };
        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC4Context.paths.threads,
          headers: dbHeaders,
          data: {
            orgUnitId: storyC4Context.orgUnitId,
            neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-number-db-1',
            preferredOutboundCsNumberId: 'cs-number-db-2',
          },
        });
        expect(ensureResponse.status()).toBe(201);
        const ensureBody = await ensureResponse.json();
        const threadId = ensureBody.data.thread.threadId as string;
        expect(typeof threadId).toBe('string');
        expect(threadId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${threadId}/claim`,
          headers: dbHeaders,
          data: {
            orgUnitId: storyC4Context.orgUnitId,
          },
        });
        expect(claimResponse.status()).toBe(200);
        const claimBody = await claimResponse.json();
        expect(claimBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLAIMED',
          data: {
            thread: {
              state: 'CLAIMED',
            },
          },
        });

        const closeResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${threadId}/close`,
          headers: dbHeaders,
          data: {
            orgUnitId: storyC4Context.orgUnitId,
            resolution: 'db-backed-close',
          },
        });
        expect(closeResponse.status()).toBe(200);
        const closeBody = await closeResponse.json();
        expect(closeBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLOSED',
          data: {
            thread: {
              state: 'CLOSED',
            },
          },
        });

        const reopenResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${threadId}/call`,
          headers: dbHeaders,
          data: {
            orgUnitId: storyC4Context.orgUnitId,
          },
        });
        expect(reopenResponse.status()).toBe(200);
        const reopenBody = await reopenResponse.json();
        expect(reopenBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId,
              state: 'UNCLAIMED',
              escalation: {
                stage: 0,
              },
            },
            lifecycleEvent: 'connectshyft.thread_reopened_by_user',
          },
        });
      },
    );

    test(
      '[P1] outbound call and message actions from CLOSED thread reopen same thread to UNCLAIMED and emit thread_reopened_by_user @P1',
      async ({ request, storyC4Context, storyC4MemberHeaders, storyC4OutboundMessagePayload }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.closed}/call`,
          headers: storyC4MemberHeaders,
          data: {
            orgUnitId: storyC4Context.orgUnitId,
          },
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.closed}/messages`,
          headers: storyC4MemberHeaders,
          data: storyC4OutboundMessagePayload,
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);

        const callBody = await callResponse.json();
        const messageBody = await messageResponse.json();

        expect(callBody.data.thread).toMatchObject({
          threadId: storyC4Context.threadIds.closed,
          state: 'UNCLAIMED',
        });
        expect(messageBody.data.thread).toMatchObject({
          threadId: storyC4Context.threadIds.closed,
          state: 'UNCLAIMED',
        });
        expect(callBody.data.lifecycleEvent).toBe(storyC4Context.eventNames.reopenedByUser);
        expect(messageBody.data.lifecycleEvent).toBe(storyC4Context.eventNames.reopenedByUser);
      },
    );

    test(
      '[P2] inbound voice and fallback intake events preserve CLOSED state and do not trigger auto-reopen side effects @P2',
      async ({ request, storyC4Context, storyC4AdminHeaders, storyC4InboundVoicePayload }) => {
        const voiceResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC4Context.paths.inboundWebhook,
          headers: storyC4AdminHeaders,
          data: storyC4InboundVoicePayload,
        });
        const fallbackResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC4Context.paths.inboundWebhook,
          headers: storyC4AdminHeaders,
          data: {
            ...storyC4InboundVoicePayload,
            eventType: 'voice.fallback',
          },
        });

        expect(voiceResponse.status()).toBe(200);
        expect(fallbackResponse.status()).toBe(200);
        const voiceBody = await voiceResponse.json();
        const fallbackBody = await fallbackResponse.json();
        expect(voiceBody.data.timeline).toMatchObject({
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
        });
        expect(fallbackBody.data.timeline).toMatchObject({
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.closed}`,
          headers: storyC4AdminHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(detailBody.data.thread).toMatchObject({
          threadId: storyC4Context.threadIds.closed,
          state: 'CLOSED',
        });
        expect(detailBody.data.thread.lifecycle).not.toMatchObject({
          reopenedByInbound: true,
        });
      },
    );
  },
);
