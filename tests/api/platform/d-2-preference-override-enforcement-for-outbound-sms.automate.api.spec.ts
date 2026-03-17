import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD.fixture';

const resolveConnectShyftDbConnection = () => {
  const databaseUrl =
    process.env.MONEYSHYFT_TEST_DATABASE_URL
    || process.env.DATABASE_URL;
  if (databaseUrl) {
    return databaseUrl;
  }

  const resolvedUser = process.env.TEST_DB_USER || process.env.USER;
  const resolvedPassword = process.env.TEST_DB_PASSWORD;

  return {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 5432),
    database: process.env.TEST_DB_NAME || 'moneyshyft',
    ...(resolvedUser ? { user: resolvedUser } : {}),
    ...(resolvedPassword ? { password: resolvedPassword } : {}),
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

test.describe(
  'Story d.2 preference override enforcement for outbound sms (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });
    test.afterAll(async () => {
      await connectShyftDb.destroy();
    });

    test(
      '[P0] refuses outbound sms when prefers_texting=NO and override reason is missing with no partial side effects @P0',
      async ({ request, storyDContext, storyDMemberHeaders, storyDOutboundMessagePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoClosed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOutboundMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideRequired,
          data: {
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: false,
            },
            sideEffects: {
              messageDispatched: false,
              lifecycleMutationApplied: true,
              auditPersisted: false,
            },
          },
        });
      },
    );

    test(
      '[P0] refuses outbound sms for invalid override reason and preserves refusal-only envelope semantics @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDInvalidOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoUnclaimed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDInvalidOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideInvalid,
          data: {
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: false,
            },
            sideEffects: {
              messageDispatched: false,
              lifecycleMutationApplied: false,
              auditPersisted: false,
            },
          },
        });
      },
    );

    test(
      '[P0] accepts valid override, persists override+audit metadata, and dispatches outbound sms when prefers_texting=NO @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoUnclaimed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: true,
              override: {
                reason: storyDOverrideMessagePayload.overrideReason,
                note: storyDOverrideMessagePayload.overrideNote,
              },
            },
            sideEffects: {
              messageDispatched: true,
              auditPersisted: true,
            },
          },
        });
      },
    );

    test(
      '[P1] db-backed UUID thread+neighbor path enforces override requirements and persists approved override metadata @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOutboundMessagePayload,
        storyDOverrideMessagePayload,
      }) => {
        const neighborId = randomUUID();
        const targetPhone = `+1${neighborId.replace(/\D/g, '').padEnd(10, '0').slice(0, 10)}`;
        let threadId = '';

        await connectShyftDb
          .withSchema('connectshyft')
          .table('cs_neighbors')
          .insert({
            id: neighborId,
            tenant_id: storyDContext.tenantId,
            org_unit_id: storyDContext.orgUnitId,
            first_name: 'StoryD',
            last_name: 'Neighbor',
            prefers_texting: 'NO',
          })
          .onConflict('id')
          .merge({
            tenant_id: storyDContext.tenantId,
            org_unit_id: storyDContext.orgUnitId,
            prefers_texting: 'NO',
          });

        await connectShyftDb
          .withSchema('connectshyft')
          .table('cs_neighbor_phones')
          .insert({
            id: randomUUID(),
            neighbor_id: neighborId,
            tenant_id: storyDContext.tenantId,
            label: 'Mobile',
            value_e164: targetPhone,
            raw_input: targetPhone,
            normalized_e164: targetPhone,
            display_national: '(000) 000-0000',
            country_code: '1',
            national_number: targetPhone.slice(2),
            sort_order: 0,
            is_primary: true,
            is_active: true,
            validation_status: 'valid',
            usage_type: 'mobile',
            source: 'user_entered',
            is_shared: false,
            verification_status: 'verified',
          });

        try {
          const ensureResponse = await apiRequest(request, {
            method: 'POST',
            path: storyDContext.paths.threads,
            headers: storyDMemberHeaders,
            data: {
              orgUnitId: storyDContext.orgUnitId,
              neighborId,
              source: 'VOICE',
              lastInboundCsNumberId: 'cs-number-d2-db-1',
              preferredOutboundCsNumberId: 'cs-number-d2-db-2',
            },
          });

          expect(ensureResponse.status()).toBe(201);
          const ensureBody = await ensureResponse.json();
          threadId = ensureBody.data.thread.threadId as string;
          expect(threadId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );

          const refusalResponse = await apiRequest(request, {
            method: 'POST',
            path: `${storyDContext.paths.threads}/${threadId}/messages`,
            headers: storyDMemberHeaders,
            data: storyDOutboundMessagePayload,
          });

          expect(refusalResponse.status()).toBe(200);
          const refusalBody = await refusalResponse.json();
          expect(refusalBody).toMatchObject({
            ok: false,
            code: storyDContext.refusalCodes.smsOverrideRequired,
            data: {
              preferencePolicy: {
                prefersTexting: 'NO',
                source: 'neighbor-record',
                overrideRequired: true,
                overrideAccepted: false,
              },
            },
          });

          const successResponse = await apiRequest(request, {
            method: 'POST',
            path: `${storyDContext.paths.threads}/${threadId}/messages`,
            headers: storyDMemberHeaders,
            data: storyDOverrideMessagePayload,
          });

          expect(successResponse.status()).toBe(200);
          const successBody = await successResponse.json();
          expect(successBody).toMatchObject({
            ok: true,
            code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
            data: {
              preferencePolicy: {
                prefersTexting: 'NO',
                source: 'neighbor-record',
                overrideRequired: true,
                overrideAccepted: true,
                override: {
                  reason: storyDOverrideMessagePayload.overrideReason,
                  note: storyDOverrideMessagePayload.overrideNote,
                  durability: 'database',
                },
              },
              sideEffects: {
                messageDispatched: true,
                auditPersisted: true,
              },
            },
          });

          const persistedOverride = await connectShyftDb
            .withSchema('connectshyft')
            .table('cs_sms_preference_overrides')
            .where({
              tenant_id: storyDContext.tenantId,
              thread_id: threadId,
            })
            .orderBy('created_at_utc', 'desc')
            .first<{
              preference_value: string;
              override_reason: string;
            }>('preference_value', 'override_reason');

          expect(persistedOverride).toMatchObject({
            preference_value: 'NO',
            override_reason: storyDOverrideMessagePayload.overrideReason,
          });
        } finally {
          if (threadId) {
            await connectShyftDb
              .withSchema('connectshyft')
              .table('cs_sms_preference_overrides')
              .where({ thread_id: threadId })
              .delete();
            await connectShyftDb
              .withSchema('connectshyft')
              .table('cs_threads')
              .where({ id: threadId })
              .delete();
          }

          await connectShyftDb
            .withSchema('connectshyft')
            .table('cs_neighbor_phones')
            .where({ neighbor_id: neighborId })
            .delete();

          await connectShyftDb
            .withSchema('connectshyft')
            .table('cs_neighbors')
            .where({ id: neighborId })
            .delete();
        }
      },
    );

    test(
      '[P1] CLOSED outbound sms with valid override reopens same thread before dispatch and still enforces override policy @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoClosed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            thread: {
              threadId: storyDContext.threadIds.prefersNoClosed,
              state: 'UNCLAIMED',
            },
            lifecycle: {
              priorState: 'CLOSED',
              reopenedFromClosed: true,
            },
            lifecycleEvent: storyDContext.eventNames.reopenedByUser,
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: true,
            },
            sideEffects: {
              messageDispatched: true,
              lifecycleMutationApplied: true,
            },
          },
        });
      },
    );
  },
);
