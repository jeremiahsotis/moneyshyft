import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryB3.fixture';

test.describe(
  'Story b.3 Relationship-Gated Neighbor Edits with Provenance Audit (ATDD API RED)',
  () => {
    test.skip(
      '[P0] permits related identity leads to edit neighbors and emits org_unit_id provenance in audit and outbox metadata @P0',
      async ({
        request,
        storyB3Context,
        storyB3RelatedActorHeaders,
        storyB3RelatedUpdatePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyB3Context.paths.neighborById,
          headers: storyB3RelatedActorHeaders,
          data: storyB3RelatedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
          data: {
            scope: {
              tenantId: storyB3Context.tenantId,
              orgUnitId: storyB3Context.primaryOrgUnitId,
            },
            neighbor: {
              neighborId: storyB3Context.neighborId,
              tenantId: storyB3Context.tenantId,
              firstName: storyB3Context.relatedUpdateFirstName,
              lastName: storyB3Context.relatedUpdateLastName,
            },
            audit: {
              eventName: 'connectshyft.neighbor.updated',
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.primaryOrgUnitId,
                actor_user_id: storyB3Context.relatedActorUserId,
                mutation_context: expect.objectContaining({
                  policy_path: 'relationship-gated',
                  neighbor_id: storyB3Context.neighborId,
                }),
              }),
            },
            outbox: {
              eventName: 'connectshyft.neighbor.updated',
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.primaryOrgUnitId,
                actor_user_id: storyB3Context.relatedActorUserId,
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P0] permits tenant-privileged roles to bypass relationship checks and still records provenance metadata @P0',
      async ({
        request,
        storyB3Context,
        storyB3TenantPrivilegedHeaders,
        storyB3TenantPrivilegedUpdatePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyB3Context.paths.neighborById,
          headers: storyB3TenantPrivilegedHeaders,
          data: storyB3TenantPrivilegedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
          data: {
            scope: {
              tenantId: storyB3Context.tenantId,
              orgUnitId: storyB3Context.peerOrgUnitId,
            },
            neighbor: {
              neighborId: storyB3Context.neighborId,
              firstName: storyB3Context.tenantPrivilegedUpdateFirstName,
              lastName: storyB3Context.tenantPrivilegedUpdateLastName,
            },
            audit: {
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.peerOrgUnitId,
                actor_user_id: storyB3Context.tenantPrivilegedUserId,
                policy_path: 'tenant-privileged',
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.peerOrgUnitId,
                actor_user_id: storyB3Context.tenantPrivilegedUserId,
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P0] refuses unrelated callers with deterministic policy messaging and no neighbor or provenance leakage @P0',
      async ({
        request,
        storyB3Context,
        storyB3UnrelatedActorHeaders,
        storyB3RelatedUpdatePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyB3Context.paths.neighborById,
          headers: storyB3UnrelatedActorHeaders,
          data: storyB3RelatedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyB3Context.refusalCodes.relationshipRequired,
          refusalType: 'business',
          message: expect.stringContaining('active thread relationship'),
        });
        expect(body).not.toHaveProperty('data.neighbor');
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );

    test.skip(
      '[P1] keeps refusal code and policy message stable across repeated unauthorized edit attempts @P1',
      async ({
        request,
        storyB3Context,
        storyB3UnrelatedActorHeaders,
        storyB3RelatedUpdatePayload,
      }) => {
        const firstResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyB3Context.paths.neighborById,
          headers: storyB3UnrelatedActorHeaders,
          data: storyB3RelatedUpdatePayload,
        });
        const secondResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyB3Context.paths.neighborById,
          headers: storyB3UnrelatedActorHeaders,
          data: storyB3RelatedUpdatePayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(secondResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();

        expect(firstBody).toMatchObject({
          ok: false,
          code: storyB3Context.refusalCodes.relationshipRequired,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(secondBody).toMatchObject({
          ok: false,
          code: storyB3Context.refusalCodes.relationshipRequired,
          refusalType: 'business',
          message: firstBody.message,
        });
        expect(firstBody).not.toHaveProperty('data.neighbor');
        expect(firstBody).not.toHaveProperty('data.audit');
        expect(firstBody).not.toHaveProperty('data.outbox');
        expect(secondBody).not.toHaveProperty('data.neighbor');
        expect(secondBody).not.toHaveProperty('data.audit');
        expect(secondBody).not.toHaveProperty('data.outbox');
      },
    );
  },
);
