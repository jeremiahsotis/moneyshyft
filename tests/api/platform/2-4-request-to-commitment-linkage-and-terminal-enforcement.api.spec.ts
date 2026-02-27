import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import type { Story24Payload } from '../../support/factories/routeShyftStory24Factory';
import { createTenantScopeHeaders } from '../../support/factories/tenantRepositoryFactory';

type AuthScope = {
  tenantId: string;
  orgUnitId: string;
  authHeaders: Record<string, string>;
};

const INTAKE_COLLECTION_PATH = '/api/v1/route/intake/requests';
const RECONCILIATION_QUEUE_PATH = '/api/v1/route/intake/reconciliation/unresolved?staleMinutes=60';
const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'] as const;
const RAW_UTC_ISO_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/;

function parseCookieValue(setCookieHeader: string | null, cookieName: string): string {
  if (!setCookieHeader) {
    return '';
  }

  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escapedName + '=([^;]+)');
  const match = setCookieHeader.match(pattern);
  return match ? decodeURIComponent(match[1]) : '';
}

async function resolveOrgUnitIdForTenant(
  request: APIRequestContext,
  tenantId: string,
  authCookie: string,
  csrfToken: string,
): Promise<string> {
  const treeResponse = await apiRequest(request, {
    method: 'GET',
    path: '/api/v1/platform/admin/structure/tree?tenantId=' + encodeURIComponent(tenantId),
    headers: {
      cookie: authCookie,
      'x-correlation-id': 'story24-tree-' + randomUUID().slice(0, 8),
    },
  });

  if (treeResponse.status() !== 200) {
    throw new Error('Story 2.4 API automation failed to resolve org-unit tree context.');
  }

  const treeBody = await treeResponse.json();
  const flatNodes = Array.isArray(treeBody?.data?.flat) ? treeBody.data.flat : [];
  const firstNode = flatNodes.find((node: Record<string, unknown>) => typeof node?.id === 'string');
  if (typeof firstNode?.id === 'string') {
    return firstNode.id;
  }

  const nodeName = 'Route Story 2.4 Ops ' + randomUUID().slice(0, 8);
  const bootstrapResponse = await apiRequest(request, {
    method: 'POST',
    path: '/api/v1/platform/admin/structure/nodes',
    headers: {
      cookie: authCookie,
      'x-csrf-token': csrfToken,
      'x-correlation-id': 'story24-node-' + randomUUID().slice(0, 8),
      'idempotency-key': 'story24-node-' + randomUUID(),
    },
    data: {
      tenantId,
      name: nodeName,
      type: 'ORGUNIT',
      reason: 'story24-test-bootstrap',
    },
  });

  if (bootstrapResponse.status() === 200) {
    const bootstrapBody = await bootstrapResponse.json();
    const nodeId = bootstrapBody?.data?.node?.id;
    if (typeof nodeId === 'string' && nodeId.length > 0) {
      return nodeId;
    }
  }

  // Parallel workers can race creating the first node in a tenant.
  // Re-read tree state before failing to tolerate create conflicts.
  const finalTreeResponse = await apiRequest(request, {
    method: 'GET',
    path: '/api/v1/platform/admin/structure/tree?tenantId=' + encodeURIComponent(tenantId),
    headers: {
      cookie: authCookie,
      'x-correlation-id': 'story24-tree-retry-' + randomUUID().slice(0, 8),
    },
  });
  if (finalTreeResponse.status() === 200) {
    const finalTreeBody = await finalTreeResponse.json();
    const finalFlatNodes = Array.isArray(finalTreeBody?.data?.flat) ? finalTreeBody.data.flat : [];
    const discoveredNode = finalFlatNodes.find((node: Record<string, unknown>) => typeof node?.id === 'string');
    if (typeof discoveredNode?.id === 'string' && discoveredNode.id.length > 0) {
      return discoveredNode.id;
    }
  }

  throw new Error(`Story 2.4 API automation failed to bootstrap org-unit context (status ${bootstrapResponse.status()}).`);
}

async function loginAndResolveScope(request: APIRequestContext): Promise<AuthScope> {
  const email = process.env.TEST_EMAIL || 'operator@example.com';
  const password = process.env.TEST_PASSWORD || 'SecurePass123!';

  const loginResponse = await apiRequest(request, {
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {
      cookie: '',
    },
    data: {
      email,
      password,
      rememberMe: false,
    },
  });

  expect(loginResponse.status()).toBe(200);

  const setCookie = loginResponse.headers()['set-cookie'] ?? null;
  const csrfToken = parseCookieValue(setCookie, 'csrf_token');
  const accessToken = parseCookieValue(setCookie, 'access_token');
  expect(csrfToken).not.toBe('');
  expect(accessToken).not.toBe('');

  const body = await loginResponse.json();
  const user = body?.user ?? body?.data?.user ?? {};
  const userId = typeof user?.userId === 'string'
    ? user.userId
    : (typeof user?.id === 'string' ? user.id : '');
  expect(userId, 'Story 2.4 API automation requires a user id from /auth/login.').toBeTruthy();

  const tenantId = process.env.TEST_ROUTE_TENANT_ID
    || (typeof user?.activeTenantId === 'string'
      ? user.activeTenantId
      : (typeof user?.householdId === 'string' ? user.householdId : ''));
  expect(tenantId, 'Story 2.4 API automation requires tenant scope from login or TEST_ROUTE_TENANT_ID.').toBeTruthy();

  const authCookie = `access_token=${accessToken}; csrf_token=${csrfToken}`;
  const orgUnitId = process.env.TEST_ROUTE_ORG_UNIT_ID
    || (typeof user?.activeOrgUnitId === 'string' && user.activeOrgUnitId.trim().length > 0
      ? user.activeOrgUnitId
      : await resolveOrgUnitIdForTenant(request, tenantId, authCookie, csrfToken));
  const role = typeof user?.role === 'string' ? user.role : 'DISPATCHER';

  return {
    tenantId,
    orgUnitId,
    authHeaders: createTenantScopeHeaders({
      tenantId,
      orgUnitId,
      role,
      userId: userId as string,
      csrfToken,
    }),
  };
}

function requireScopedContext(scope: AuthScope): { tenantId: string; orgUnitId: string; authHeaders: Record<string, string> } {
  expect(scope.tenantId, 'Story 2.4 API automation requires authenticated tenant scope.').toBeTruthy();
  expect(scope.orgUnitId, 'Story 2.4 API automation requires authenticated org-unit scope.').toBeTruthy();

  return {
    tenantId: scope.tenantId,
    orgUnitId: scope.orgUnitId,
    authHeaders: scope.authHeaders,
  };
}

function buildPayload(
  scoped: { tenantId: string; orgUnitId: string },
  forceRefusal: boolean,
): Story24Payload {
  return {
    tenantId: scoped.tenantId,
    orgUnitId: scoped.orgUnitId,
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: forceRefusal
      ? '2026-02-27T02:00:00.000Z'
      : '2026-02-27T14:00:00.000Z',
    requestedWindowEndUtc: forceRefusal
      ? '2026-02-27T02:30:00.000Z'
      : '2026-02-27T16:00:00.000Z',
    channel: '2-4-request-to-commitment-linkage-and-terminal-enforcement',
    notes: 'Story 2.4 automate payload ' + randomUUID().slice(0, 8),
    forceRefusal,
  };
}

function detailPath(requestId: string): string {
  return INTAKE_COLLECTION_PATH + '/' + requestId;
}

function commitmentTransitionPath(commitmentId: string): string {
  return '/api/v1/route/commitments/' + commitmentId + '/transitions';
}

test.describe('Story 2.4 automate - request-to-commitment linkage API coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test('[P0] enforces explicit terminal lifecycle state and canonical linkage for accepted intake @P0', async ({ request }) => {
    const scope = await loginAndResolveScope(request);
    const scoped = requireScopedContext(scope);

    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: INTAKE_COLLECTION_PATH,
      headers: {
        ...scoped.authHeaders,
        'x-correlation-id': 'story24-create-' + randomUUID().slice(0, 8),
      },
      data: buildPayload(scoped, false),
    });

    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_ACCEPTED',
      data: {
        requestId: expect.any(String),
        commitmentId: expect.any(String),
        status: 'Accepted',
      },
    });

    const requestId = createBody?.data?.requestId as string;
    const commitmentId = createBody?.data?.commitmentId as string;

    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(requestId),
      headers: {
        ...scoped.authHeaders,
        'x-correlation-id': 'story24-detail-' + randomUUID().slice(0, 8),
      },
    });

    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId,
        commitmentId,
        requestLifecycleStatus: 'committed',
      },
    });
    expect(typeof detailBody?.data?.commitmentLifecycleStatus).toBe('string');
  });

  test('[P0] preserves independent commitment transitions after request terminalization @P0', async ({ request }) => {
    const scope = await loginAndResolveScope(request);
    const scoped = requireScopedContext(scope);

    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: INTAKE_COLLECTION_PATH,
      headers: {
        ...scoped.authHeaders,
        'x-correlation-id': 'story24-transition-create-' + randomUUID().slice(0, 8),
      },
      data: buildPayload(scoped, false),
    });

    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();

    const requestId = createBody?.data?.requestId as string;
    const commitmentId = createBody?.data?.commitmentId as string;

    const transitionResponse = await apiRequest(request, {
      method: 'POST',
      path: commitmentTransitionPath(commitmentId),
      headers: {
        ...scoped.authHeaders,
        'x-correlation-id': 'story24-transition-' + randomUUID().slice(0, 8),
      },
      data: {
        nextStatus: 'in_progress',
        reason: 'Story 2.4 lifecycle independence check',
      },
    });

    expect(transitionResponse.status()).toBe(200);
    const transitionBody = await transitionResponse.json();
    expect(transitionBody).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
      data: {
        commitment: {
          commitmentId,
          status: 'in_progress',
        },
      },
    });

    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(requestId),
      headers: scoped.authHeaders,
    });

    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId,
        requestLifecycleStatus: 'committed',
        commitmentLifecycleStatus: 'in_progress',
      },
    });
  });

  test('[P0] returns explicit refusal outcomes with terminal lifecycle semantics and no linkage leakage @P0', async ({ request }) => {
    const scope = await loginAndResolveScope(request);
    const scoped = requireScopedContext(scope);

    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: INTAKE_COLLECTION_PATH,
      headers: {
        ...scoped.authHeaders,
        'x-correlation-id': 'story24-refusal-' + randomUUID().slice(0, 8),
      },
      data: buildPayload(scoped, true),
    });

    expect(refusalResponse.status()).toBe(200);
    const refusalBody = await refusalResponse.json();
    expect(refusalBody).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: 'ROUTESHYFT_DONOR_INTAKE_REFUSED',
      data: {
        requestId: expect.any(String),
        alternatives: expect.any(Array),
        nextSteps: expect.any(String),
      },
    });
    expect(refusalBody).not.toHaveProperty('data.commitmentId');

    const requestId = refusalBody?.data?.requestId as string;

    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(requestId),
      headers: scoped.authHeaders,
    });

    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_REFUSED',
      data: {
        requestId,
        commitmentId: null,
        requestLifecycleStatus: expect.stringMatching(/^(refused|cancelled)$/),
      },
    });
  });

  test('[P1] exposes unresolved reconciliation queue shape with lifecycle and action guidance @P1', async ({ request }) => {
    const scope = await loginAndResolveScope(request);
    const scoped = requireScopedContext(scope);

    const response = await apiRequest(request, {
      method: 'GET',
      path: RECONCILIATION_QUEUE_PATH,
      headers: {
        ...scoped.authHeaders,
        'x-correlation-id': 'story24-reconciliation-' + randomUUID().slice(0, 8),
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_INTAKE_RECONCILIATION_QUEUE',
      data: {
        staleThresholdMinutes: 60,
        guardrailStatus: expect.stringMatching(/^(clear|action_required)$/),
        items: expect.any(Array),
      },
    });

    for (const item of body?.data?.items as Array<Record<string, unknown>>) {
      expect(item.tenantId).toBeUndefined();
      expect(item.issueCode).toBe('ROUTESHYFT_REQUEST_TERMINAL_STATE_MISSING');
      expect(typeof item.requestLifecycleStatus).toBe('string');
      expect(Array.isArray(item.reconciliationActions)).toBe(true);
    }

    expect(scoped.tenantId).not.toBe('');
  });

  test('[P1] rejects tenant-scope mismatched intake submissions with security refusal @P1', async ({ request }) => {
    const scope = await loginAndResolveScope(request);
    const scoped = requireScopedContext(scope);

    const response = await apiRequest(request, {
      method: 'POST',
      path: INTAKE_COLLECTION_PATH,
      headers: {
        ...scoped.authHeaders,
      },
      data: {
        ...buildPayload(scoped, false),
        tenantId: 'tenant-routeshyft-bravo',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'ROUTE_TENANT_SCOPE_MISMATCH',
      refusalType: 'security',
    });
  });

  test('[P1] preserves canonical top-level envelope keys across success refusal and detail responses @P1', async ({ request }) => {
    const scope = await loginAndResolveScope(request);
    const scoped = requireScopedContext(scope);

    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: INTAKE_COLLECTION_PATH,
      headers: scoped.authHeaders,
      data: buildPayload(scoped, false),
    });

    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: INTAKE_COLLECTION_PATH,
      headers: scoped.authHeaders,
      data: buildPayload(scoped, true),
    });

    expect(successResponse.status()).toBe(200);
    expect(refusalResponse.status()).toBe(200);

    const successBody = await successResponse.json();
    const refusalBody = await refusalResponse.json();
    const detailRequestId = successBody?.data?.requestId as string;

    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(detailRequestId),
      headers: scoped.authHeaders,
    });

    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();

    for (const payload of [successBody, refusalBody, detailBody]) {
      expect(
        REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(payload, key)),
      ).toBe(true);
    }
  });

  test('[P1] localizes intake and scheduling timestamps with no raw UTC leakage in API payloads @P1', async ({ request }) => {
    const scope = await loginAndResolveScope(request);
    const scoped = requireScopedContext(scope);

    const timezoneHeaders = {
      ...scoped.authHeaders,
      'x-user-timezone': 'America/Los_Angeles',
      'x-tenant-timezone': 'America/Chicago',
      'x-system-timezone': 'UTC',
    };

    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: INTAKE_COLLECTION_PATH,
      headers: timezoneHeaders,
      data: buildPayload(scoped, false),
    });

    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_ACCEPTED',
      data: {
        timezone: 'America/Los_Angeles',
        timezoneSource: 'user',
      },
    });
    expect(JSON.stringify(createBody?.data || {})).not.toMatch(RAW_UTC_ISO_PATTERN);

    const commitmentId = createBody?.data?.commitmentId as string;
    const transitionResponse = await apiRequest(request, {
      method: 'POST',
      path: commitmentTransitionPath(commitmentId),
      headers: timezoneHeaders,
      data: {
        nextStatus: 'in_progress',
        reason: 'story24-timezone-contract',
      },
    });

    expect(transitionResponse.status()).toBe(200);
    const transitionBody = await transitionResponse.json();
    expect(transitionBody).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
      data: {
        timezoneSource: 'user',
        transition: {
          occurredAtLocal: expect.any(String),
        },
      },
    });
    expect(JSON.stringify(transitionBody?.data || {})).not.toMatch(RAW_UTC_ISO_PATTERN);

    const reconciliationResponse = await apiRequest(request, {
      method: 'GET',
      path: RECONCILIATION_QUEUE_PATH,
      headers: timezoneHeaders,
    });

    expect(reconciliationResponse.status()).toBe(200);
    const reconciliationBody = await reconciliationResponse.json();
    expect(reconciliationBody).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_INTAKE_RECONCILIATION_QUEUE',
      data: {
        timezoneSource: 'user',
      },
    });
    expect(reconciliationBody).not.toHaveProperty('data.generatedAtUtc');
    expect(JSON.stringify(reconciliationBody?.data || {})).not.toMatch(RAW_UTC_ISO_PATTERN);
  });
});
