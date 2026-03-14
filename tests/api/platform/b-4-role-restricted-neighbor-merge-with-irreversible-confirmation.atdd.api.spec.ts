import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryB4.fixture';

test.describe(
  'Story b.4 Role-Restricted Neighbor Merge with Irreversible Confirmation (ATDD API RED)',
  () => {
    test.skip(
      '[P0] permits TENANT_ADMIN merge after explicit irreversible confirmation and emits before/after audit metadata @P0',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
        storyB4ValidMergePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4TenantAdminHeaders,
          data: storyB4ValidMergePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
          data: {
            scope: {
              tenantId: storyB4Context.tenantId,
              orgUnitId: storyB4Context.primaryOrgUnitId,
            },
            merge: {
              sourceNeighborId: storyB4Context.sourceNeighborId,
              survivorNeighborId: storyB4Context.survivorNeighborId,
              irreversibleConfirmed: true,
            },
            audit: {
              eventName: 'connectshyft.neighbor.merged',
              metadata: expect.objectContaining({
                before_neighbor_id: storyB4Context.sourceNeighborId,
                after_neighbor_id: storyB4Context.survivorNeighborId,
                actor_user_id: storyB4Context.tenantAdminUserId,
                org_unit_id: storyB4Context.primaryOrgUnitId,
              }),
            },
            outbox: {
              eventName: 'connectshyft.neighbor.merged',
              metadata: expect.objectContaining({
                before_neighbor_id: storyB4Context.sourceNeighborId,
                after_neighbor_id: storyB4Context.survivorNeighborId,
                actor_user_id: storyB4Context.tenantAdminUserId,
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P0] permits ORGUNIT_IDENTITY_LEAD merge with identical irreversible confirmation and auditing contract @P0',
      async ({
        request,
        storyB4Context,
        storyB4IdentityLeadHeaders,
        storyB4ValidMergePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4IdentityLeadHeaders,
          data: storyB4ValidMergePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
          data: {
            merge: {
              sourceNeighborId: storyB4Context.sourceNeighborId,
              survivorNeighborId: storyB4Context.survivorNeighborId,
              irreversibleConfirmed: true,
            },
            audit: {
              metadata: expect.objectContaining({
                before_neighbor_id: storyB4Context.sourceNeighborId,
                after_neighbor_id: storyB4Context.survivorNeighborId,
                actor_user_id: storyB4Context.identityLeadUserId,
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                before_neighbor_id: storyB4Context.sourceNeighborId,
                after_neighbor_id: storyB4Context.survivorNeighborId,
                actor_user_id: storyB4Context.identityLeadUserId,
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P0] refuses ORGUNIT_MEMBER merge requests with deterministic code and no merge side effects @P0',
      async ({
        request,
        storyB4Context,
        storyB4OrgUnitMemberHeaders,
        storyB4ValidMergePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4OrgUnitMemberHeaders,
          data: storyB4ValidMergePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.mergeForbidden,
          refusalType: 'business',
          message: expect.stringContaining('authorized'),
        });
        expect(body).not.toHaveProperty('data.merge');
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );

    test.skip(
      '[P0] refuses merge when irreversible confirmation is missing or invalid @P0',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
        storyB4MissingConfirmationPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4TenantAdminHeaders,
          data: storyB4MissingConfirmationPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.confirmationRequired,
          refusalType: 'business',
          message: expect.stringContaining('irreversible confirmation'),
        });
        expect(body).not.toHaveProperty('data.merge');
      },
    );

    test.skip(
      '[P1] transaction failure path is deterministic and preserves both pre-merge neighbor records without partial writes @P1',
      async ({
        request,
        storyB4Context,
        storyB4IdentityLeadHeaders,
        storyB4RollbackProbePayload,
      }) => {
        const firstAttempt = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4IdentityLeadHeaders,
          data: storyB4RollbackProbePayload,
        });
        const secondAttempt = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4IdentityLeadHeaders,
          data: storyB4RollbackProbePayload,
        });

        expect(firstAttempt.status()).toBe(200);
        expect(secondAttempt.status()).toBe(200);

        const firstBody = await firstAttempt.json();
        const secondBody = await secondAttempt.json();

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
          path: storyB4Context.paths.sourceNeighborById,
          headers: storyB4IdentityLeadHeaders,
        });
        const survivorProbe = await apiRequest(request, {
          method: 'GET',
          path: storyB4Context.paths.survivorNeighborById,
          headers: storyB4IdentityLeadHeaders,
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
              neighborId: storyB4Context.sourceNeighborId,
            },
          },
        });
        expect(survivorBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
          data: {
            neighbor: {
              neighborId: storyB4Context.survivorNeighborId,
            },
          },
        });
      },
    );
  },
);
