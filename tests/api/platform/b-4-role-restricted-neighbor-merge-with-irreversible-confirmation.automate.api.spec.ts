import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryB4Headers } from '../../support/factories/connectShyftStoryB4Factory';
import { ensureConnectShyftDbHousehold } from '../../support/helpers/connectShyftDbActor';
import { test, expect } from '../../support/fixtures/connectShyftStoryB4.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

type SeededNeighborPair = {
  sourceNeighborId: string;
  survivorNeighborId: string;
};

const seedNeighbor = async (
  request: Parameters<typeof apiRequest>[0],
  path: string,
  headers: Record<string, string>,
  firstName: string,
  lastName: string,
): Promise<string> => {
  const response = await apiRequest(request, {
    method: 'POST',
    path,
    headers,
    data: {
      firstName,
      lastName,
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: true,
          verificationStatus: 'verified',
        },
      ],
    },
  });

  expect([200, 201]).toContain(response.status());
  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
  });
  const neighborId = body?.data?.neighbor?.neighborId;
  expect(typeof neighborId).toBe('string');
  return neighborId as string;
};

const seedNeighborPair = async (
  request: Parameters<typeof apiRequest>[0],
  context: Parameters<typeof createStoryB4Headers>[0],
  headers: Record<string, string>,
): Promise<SeededNeighborPair> => {
  await ensureConnectShyftDbHousehold(context.tenantId);
  const suffix = Date.now().toString(36);
  const sourceNeighborId = await seedNeighbor(
    request,
    context.paths.neighborsCollection,
    headers,
    `Source-${suffix}`,
    'Neighbor',
  );
  const survivorNeighborId = await seedNeighbor(
    request,
    context.paths.neighborsCollection,
    headers,
    `Survivor-${suffix}`,
    'Neighbor',
  );

  return {
    sourceNeighborId,
    survivorNeighborId,
  };
};

const buildMergePayload = (
  context: Parameters<typeof createStoryB4Headers>[0],
  seeded: SeededNeighborPair,
  overrides: Record<string, unknown> = {},
) => ({
  orgUnitId: context.primaryOrgUnitId,
  sourceNeighborId: seeded.sourceNeighborId,
  survivorNeighborId: seeded.survivorNeighborId,
  irreversibleConfirmation: {
    acknowledged: true,
    phrase: context.irreversibleConfirmationPhrase,
  },
  reason: 'duplicate-identity-resolution',
  ...overrides,
});

test.describe(
  'Story b.4 role-restricted neighbor merge with irreversible confirmation (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] refuses merge when source and survivor neighbor ids match, with deterministic no-side-effect envelope @P0',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
      }) => {
        const seeded = await seedNeighborPair(
          request,
          storyB4Context,
          storyB4TenantAdminHeaders,
        );
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4TenantAdminHeaders,
          data: buildMergePayload(storyB4Context, seeded, {
            sourceNeighborId: seeded.survivorNeighborId,
            reason: 'invalid-self-merge',
          }),
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(body.code).not.toBe('CONNECTSHYFT_NEIGHBOR_MERGED');
        expect(body).not.toHaveProperty('data.merge');
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );

    test(
      '[P1] cross-tenant merge attempts are deterministically refused with no before/after identity leakage @P1',
      async ({ request, storyB4Context, storyB4TenantAdminHeaders }) => {
        const seeded = await seedNeighborPair(
          request,
          storyB4Context,
          storyB4TenantAdminHeaders,
        );
        const crossTenantHeaders = createStoryB4Headers(storyB4Context, {
          tenantId: storyB4Context.crossTenantId,
          orgUnitId: storyB4Context.crossTenantOrgUnitId,
          role: 'TENANT_ADMIN',
          userId: storyB4Context.tenantAdminUserId,
          orgUnitMemberships: [storyB4Context.crossTenantOrgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: crossTenantHeaders,
          data: buildMergePayload(storyB4Context, seeded, {
            orgUnitId: storyB4Context.crossTenantOrgUnitId,
            reason: 'cross-tenant-merge-probe',
          }),
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(body).not.toHaveProperty('data.merge');
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );

    test(
      '[P1] canonical envelope keys remain stable across authorized success and unauthorized refusal merge paths @P1',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
        storyB4OrgUnitMemberHeaders,
      }) => {
        const seeded = await seedNeighborPair(
          request,
          storyB4Context,
          storyB4TenantAdminHeaders,
        );
        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4TenantAdminHeaders,
          data: buildMergePayload(storyB4Context, seeded, {
            reason: 'envelope-success-path',
          }),
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4OrgUnitMemberHeaders,
          data: buildMergePayload(storyB4Context, seeded, {
            reason: 'envelope-refusal-path',
          }),
        });

        expect(successResponse.status()).toBe(200);
        expect(refusalResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();

        expect(hasRequiredEnvelopeKeys(successBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(refusalBody)).toBe(true);

        expect(successBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
        });
        expect(successBody?.data?.sideEffectsPersisted).toBe(true);
        expect(refusalBody).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.mergeForbidden,
          refusalType: 'business',
        });
      },
    );

    test(
      '[P1] tenant staff role is refused for merge with deterministic forbidden code @P1',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
      }) => {
        const seeded = await seedNeighborPair(
          request,
          storyB4Context,
          storyB4TenantAdminHeaders,
        );
        const tenantStaffHeaders = createStoryB4Headers(storyB4Context, {
          role: 'TENANT_STAFF',
          userId: `user-story-b4-tenant-staff-${Date.now().toString(36)}`,
          orgUnitId: storyB4Context.primaryOrgUnitId,
          orgUnitMemberships: [storyB4Context.primaryOrgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: tenantStaffHeaders,
          data: buildMergePayload(storyB4Context, seeded, {
            reason: 'tenant-staff-role-probe',
          }),
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.mergeForbidden,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(body).not.toHaveProperty('data.merge');
      },
    );

    test(
      '[P1] successful merge includes reason metadata in audit/outbox and redacts irreversible phrase from response payload @P1',
      async ({
        request,
        storyB4Context,
        storyB4IdentityLeadHeaders,
        storyB4TenantAdminHeaders,
      }) => {
        const seeded = await seedNeighborPair(
          request,
          storyB4Context,
          storyB4TenantAdminHeaders,
        );
        const reason = 'duplicate-household-identity-resolution';
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4IdentityLeadHeaders,
          data: buildMergePayload(storyB4Context, seeded, {
            reason,
          }),
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
          data: {
            sideEffectsPersisted: true,
            audit: {
              metadata: expect.objectContaining({
                before_neighbor_id: seeded.sourceNeighborId,
                after_neighbor_id: seeded.survivorNeighborId,
                actor_user_id: storyB4Context.identityLeadUserId,
                reason,
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                before_neighbor_id: seeded.sourceNeighborId,
                after_neighbor_id: seeded.survivorNeighborId,
                actor_user_id: storyB4Context.identityLeadUserId,
                reason,
              }),
            },
          },
        });

        const serializedBody = JSON.stringify(body);
        expect(serializedBody).not.toContain(storyB4Context.irreversibleConfirmationPhrase);
      },
    );

    test(
      '[P1] malformed irreversible phrases are refused deterministically across repeated attempts with no merge payload writes @P1',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
      }) => {
        const seeded = await seedNeighborPair(
          request,
          storyB4Context,
          storyB4TenantAdminHeaders,
        );
        const malformedPayload = buildMergePayload(storyB4Context, seeded, {
          irreversibleConfirmation: {
            acknowledged: true,
            phrase: ` ${storyB4Context.irreversibleConfirmationPhrase.toLowerCase()} `,
          },
          reason: 'phrase-normalization-probe',
        });

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4TenantAdminHeaders,
          data: malformedPayload,
        });
        const secondResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4TenantAdminHeaders,
          data: malformedPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(secondResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();

        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(secondBody)).toBe(true);
        expect(firstBody).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.confirmationRequired,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(secondBody).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.confirmationRequired,
          refusalType: 'business',
          message: firstBody.message,
        });
        expect(firstBody).not.toHaveProperty('data.merge');
        expect(secondBody).not.toHaveProperty('data.merge');
      },
    );

    test(
      '[P1] rollback simulation after dependent repoint is deterministic and preserves both neighbors @P1',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
        storyB4IdentityLeadHeaders,
      }) => {
        const seeded = await seedNeighborPair(
          request,
          storyB4Context,
          storyB4TenantAdminHeaders,
        );

        const rollbackPayload = buildMergePayload(storyB4Context, seeded, {
          reason: 'rollback-verification',
          simulateFailureStage: 'after-dependent-repoint',
        });

        const firstAttempt = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4IdentityLeadHeaders,
          data: rollbackPayload,
        });
        const secondAttempt = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4IdentityLeadHeaders,
          data: rollbackPayload,
        });

        expect(firstAttempt.status()).toBe(200);
        expect(secondAttempt.status()).toBe(200);

        const firstBody = await firstAttempt.json();
        const secondBody = await secondAttempt.json();

        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(secondBody)).toBe(true);
        expect(firstBody).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.transactionAborted,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(secondBody).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.transactionAborted,
          refusalType: 'business',
          message: firstBody.message,
        });
        expect(firstBody).not.toHaveProperty('data.merge');
        expect(secondBody).not.toHaveProperty('data.merge');

        const sourceProbe = await apiRequest(request, {
          method: 'GET',
          path: `${storyB4Context.paths.neighborsCollection}/${seeded.sourceNeighborId}`,
          headers: storyB4TenantAdminHeaders,
        });
        const survivorProbe = await apiRequest(request, {
          method: 'GET',
          path: `${storyB4Context.paths.neighborsCollection}/${seeded.survivorNeighborId}`,
          headers: storyB4TenantAdminHeaders,
        });

        expect(sourceProbe.status()).toBe(200);
        expect(survivorProbe.status()).toBe(200);
        const sourceBody = await sourceProbe.json();
        const survivorBody = await survivorProbe.json();
        expect(sourceBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
          data: {
            neighbor: {
              neighborId: seeded.sourceNeighborId,
            },
          },
        });
        expect(survivorBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
          data: {
            neighbor: {
              neighborId: seeded.survivorNeighborId,
            },
          },
        });
      },
    );
  },
);
