import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  ensureConnectShyftDbActorUser,
} from '../../support/helpers/connectShyftDbActor';
import { test, expect } from '../../support/fixtures/connectShyftStoryA2.fixture';
import { createStoryA2Headers } from '../../support/factories/connectShyftStoryA2Factory';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';

test.describe(
  'Story a.2 automate - tenant and orgUnit context enforcement for connectshyft routes API coverage',
  () => {
    test(
      '[P0] refuses orgUnit-scoped inbox access when authenticated context omits orgUnit identity @P0',
      async ({ request, storyA2Context, storyA2MissingOrgUnitHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: storyA2Context.paths.inbox,
          headers: storyA2MissingOrgUnitHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
          refusalType: 'business',
          message: expect.stringContaining('orgUnit'),
        });
        expect(body).not.toHaveProperty('data');
      },
    );

    test(
      '[P0] refuses invalid orgUnit context values before route data can be materialized @P0',
      async ({
        request,
        storyA2Context,
        storyA2InvalidOrgUnitHeaders,
        storyA2InvalidOrgUnitThreadPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA2Context.paths.threadEnsure,
          headers: storyA2InvalidOrgUnitHeaders,
          data: storyA2InvalidOrgUnitThreadPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
        expect(body).not.toHaveProperty('data.neighborId');
      },
    );

    test(
      '[P0] blocks cross-tenant orgUnit spoof attempts with deterministic refusal and no thread leakage @P0',
      async ({
        request,
        storyA2Context,
        storyA2MemberHeaders,
        storyA2CrossTenantThreadPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA2Context.paths.threadEnsure,
          headers: storyA2MemberHeaders,
          data: storyA2CrossTenantThreadPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
        expect(body).not.toHaveProperty('data.neighborId');
      },
    );

    test(
      '[P1] requires orgUnit membership for non-privileged callers even when tenant context is valid @P1',
      async ({ request, storyA2Context, storyA2NonMemberHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: storyA2Context.paths.inbox,
          headers: storyA2NonMemberHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.items');
      },
    );

    test(
      '[P1] rejects spoofed active-org-unit header values when canonical context does not match requested scope @P1',
      async ({ request, storyA2Context, storyA2MemberHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: storyA2Context.paths.inbox,
          headers: {
            ...storyA2MemberHeaders,
            'x-active-org-unit-id': connectShyftContextEnforcementData.orgUnitBravoNorthId,
          },
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          refusalType: 'security',
        });
        expect(String(body.code)).toMatch(/ORG[_]?UNIT/i);
      },
    );

    test(
      '[P1] allows tenant-privileged callers to bypass orgUnit membership while preserving canonical context metadata @P1',
      async ({ request, storyA2Context, storyA2TenantAdminHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: storyA2Context.paths.inbox,
          headers: storyA2TenantAdminHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_INBOX_READY',
          data: {
            context: {
              tenantId: storyA2Context.tenantId,
              orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
              bypassedOrgUnitMembership: true,
            },
          },
        });
      },
    );

    test(
      '[P1] keeps refusal payloads no-leak by excluding thread and neighbor identifiers on blocked requests @P1',
      async ({ request, storyA2Context, storyA2MissingOrgUnitHeaders }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA2Context.paths.threadEnsure,
          headers: storyA2MissingOrgUnitHeaders,
          data: {
            orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaEastId,
            neighborId: 'neighbor-a2-no-leak-check',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
        expect(body).not.toHaveProperty('data.neighborId');
      },
    );

    test(
      '[P1] tenant-admin bypass applies only to same-tenant orgUnits and still rejects cross-tenant overrides @P1',
      async ({ request, storyA2Context }) => {
        const crossTenantAdminHeaders = createStoryA2Headers(storyA2Context, {
          role: 'TENANT_ADMIN',
          userId: connectShyftContextEnforcementData.tenantAdminUserId,
          orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA2Context.paths.threadEnsure,
          headers: crossTenantAdminHeaders,
          data: {
            orgUnitId: connectShyftContextEnforcementData.orgUnitBravoNorthId,
            neighborId: 'neighbor-a2-admin-cross-tenant',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
      },
    );

    test(
      '[P1] enforces membership guardrails on claim route for non-privileged callers @P1',
      async ({ request, storyA2Context, storyA2NonMemberHeaders }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA2Context.paths.threadClaim,
          headers: storyA2NonMemberHeaders,
          data: {
            reason: 'non-member-claim-attempt',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
      },
    );

    test(
      '[P1] enforces orgUnit context requirements on takeover route and keeps no-leak refusal envelope @P1',
      async ({ request, storyA2Context, storyA2MissingOrgUnitHeaders }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA2Context.paths.threadTakeover,
          headers: storyA2MissingOrgUnitHeaders,
          data: {
            reason: 'missing-orgunit-takeover-attempt',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
      },
    );

    test(
      '[P1] permits tenant-privileged callers through takeover route while preserving canonical bypass metadata @P1',
      async ({ request, storyA2Context, storyA2TenantAdminHeaders }) => {
        const lifecycleActorUserId = randomUUID();
        await ensureConnectShyftDbActorUser(lifecycleActorUserId);
        const lifecycleHeaders = {
          ...storyA2TenantAdminHeaders,
          'x-test-connectshyft-user-id': lifecycleActorUserId,
        };
        const neighborId = `neighbor-a2-tenant-admin-${Date.now()}`;
        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: storyA2Context.paths.threadEnsure,
          headers: lifecycleHeaders,
          data: {
            orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
            neighborId,
          },
        });

        expect([200, 201]).toContain(ensureResponse.status());
        const ensureBody = await ensureResponse.json();
        expect(ensureBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_ENSURED',
        });

        const ensuredThreadId = String(ensureBody?.data?.thread?.threadId ?? '');
        expect(ensuredThreadId.length).toBeGreaterThan(0);

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `/api/v1/connectshyft/threads/${encodeURIComponent(ensuredThreadId)}/claim`,
          headers: lifecycleHeaders,
          data: {
            reason: 'tenant-admin-preclaim',
          },
        });

        expect(claimResponse.status()).toBe(200);
        const claimBody = await claimResponse.json();
        expect(claimBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLAIM_READY',
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: `/api/v1/connectshyft/threads/${encodeURIComponent(ensuredThreadId)}/takeover`,
          headers: lifecycleHeaders,
          data: {
            reason: 'tenant-admin-takeover',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_TAKEOVER_READY',
          data: {
            context: {
              tenantId: storyA2Context.tenantId,
              orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
              bypassedOrgUnitMembership: true,
            },
          },
        });
      },
    );
  },
);
