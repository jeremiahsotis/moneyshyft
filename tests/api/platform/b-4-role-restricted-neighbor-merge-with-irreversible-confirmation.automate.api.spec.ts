import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryB4Headers } from '../../support/factories/connectShyftStoryB4Factory';
import { test, expect } from '../../support/fixtures/connectShyftStoryB4.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story b.4 role-restricted neighbor merge with irreversible confirmation (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] refuses merge when source and survivor neighbor ids match, with deterministic no-side-effect envelope @P0',
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
          data: {
            ...storyB4ValidMergePayload,
            sourceNeighborId: storyB4Context.survivorNeighborId,
            reason: 'invalid-self-merge',
          },
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

    test.fixme(
      '[P1] cross-tenant merge attempts are deterministically refused with no before/after identity leakage @P1',
      async ({ request, storyB4Context, storyB4ValidMergePayload }) => {
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
          data: {
            ...storyB4ValidMergePayload,
            orgUnitId: storyB4Context.crossTenantOrgUnitId,
            reason: 'cross-tenant-merge-probe',
          },
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

    test.fixme(
      '[P1] canonical envelope keys remain stable across authorized success and unauthorized refusal merge paths @P1',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
        storyB4OrgUnitMemberHeaders,
        storyB4ValidMergePayload,
      }) => {
        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4TenantAdminHeaders,
          data: {
            ...storyB4ValidMergePayload,
            reason: 'envelope-success-path',
          },
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4OrgUnitMemberHeaders,
          data: {
            ...storyB4ValidMergePayload,
            reason: 'envelope-refusal-path',
          },
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
        expect(refusalBody).toMatchObject({
          ok: false,
          code: storyB4Context.refusalCodes.mergeForbidden,
          refusalType: 'business',
        });
      },
    );

    test.fixme(
      '[P1] successful merge includes reason metadata in audit/outbox and redacts irreversible phrase from response payload @P1',
      async ({
        request,
        storyB4Context,
        storyB4IdentityLeadHeaders,
        storyB4ValidMergePayload,
      }) => {
        const reason = 'duplicate-household-identity-resolution';
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB4Context.paths.neighborMerge,
          headers: storyB4IdentityLeadHeaders,
          data: {
            ...storyB4ValidMergePayload,
            reason,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
          data: {
            audit: {
              metadata: expect.objectContaining({
                before_neighbor_id: storyB4Context.sourceNeighborId,
                after_neighbor_id: storyB4Context.survivorNeighborId,
                actor_user_id: storyB4Context.identityLeadUserId,
                reason,
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                before_neighbor_id: storyB4Context.sourceNeighborId,
                after_neighbor_id: storyB4Context.survivorNeighborId,
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

    test.fixme(
      '[P1] malformed irreversible phrases are refused deterministically across repeated attempts with no merge payload writes @P1',
      async ({
        request,
        storyB4Context,
        storyB4TenantAdminHeaders,
        storyB4ValidMergePayload,
      }) => {
        const malformedPayload = {
          ...storyB4ValidMergePayload,
          irreversibleConfirmation: {
            acknowledged: true,
            phrase: ` ${storyB4Context.irreversibleConfirmationPhrase.toLowerCase()} `,
          },
          reason: 'phrase-normalization-probe',
        };

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
  },
);
