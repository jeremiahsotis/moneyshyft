import { test as base, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { apiRequest } from '../helpers/apiClient';
import { createTenantScopeHeaders } from '../factories/tenantRepositoryFactory';
import {
  createStory24Context,
  createStory24HappyPayload,
  createStory24RefusalPayload,
  type Story24Context,
  type Story24Payload,
} from '../factories/routeShyftStory24Factory';

type Story24AuthScope = {
  userId: string;
  tenantId: string;
  orgUnitId: string;
  role: string;
};

type Story24Fixtures = {
  story24Context: Story24Context;
  story24Headers: Record<string, string>;
  story24HappyPayload: Story24Payload;
  story24RefusalPayload: Story24Payload;
};

function parseCookieValue(setCookieHeader: string | null, cookieName: string): string {
  if (!setCookieHeader) {
    return '';
  }

  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escapedName + '=([^;]+)');
  const match = setCookieHeader.match(pattern);
  return match ? decodeURIComponent(match[1]) : '';
}

async function loginStory24Scope(
  request: APIRequestContext,
): Promise<Story24AuthScope> {
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

  if (loginResponse.status() !== 200) {
    throw new Error(`Story 2.4 fixture login failed with status ${loginResponse.status()}.`);
  }

  const setCookie = loginResponse.headers()['set-cookie'] ?? null;
  const csrfToken = parseCookieValue(setCookie, 'csrf_token');
  const accessToken = parseCookieValue(setCookie, 'access_token');
  if (!csrfToken || !accessToken) {
    throw new Error('Story 2.4 fixture login missing access_token or csrf_token cookie.');
  }

  const body = await loginResponse.json();
  const user = body?.user ?? body?.data?.user ?? {};
  const userId = typeof user?.userId === 'string'
    ? user.userId
    : (typeof user?.id === 'string' ? user.id : '');
  const tenantId = typeof user?.activeTenantId === 'string'
    ? user.activeTenantId
    : (typeof user?.householdId === 'string' ? user.householdId : '');
  const role = typeof user?.role === 'string' ? user.role : 'DISPATCHER';

  if (!tenantId) {
    throw new Error('Story 2.4 fixture login did not return tenant scope.');
  }
  if (!userId) {
    throw new Error('Story 2.4 fixture login did not return user scope.');
  }

  const authCookie = `access_token=${accessToken}; csrf_token=${csrfToken}`;
  const treeResponse = await apiRequest(request, {
    method: 'GET',
    path: '/api/v1/platform/admin/structure/tree?tenantId=' + encodeURIComponent(tenantId),
    headers: {
      cookie: authCookie,
      'x-correlation-id': 'corr-routeshyft-24-tree-' + randomUUID().slice(0, 8),
    },
  });

  if (treeResponse.status() !== 200) {
    throw new Error(`Story 2.4 fixture org-unit discovery failed with status ${treeResponse.status()}.`);
  }

  const treeBody = await treeResponse.json();
  const flatNodes = Array.isArray(treeBody?.data?.flat) ? treeBody.data.flat : [];
  let orgUnitId = '';
  if (flatNodes.length > 0) {
    const firstNode = flatNodes.find((node: Record<string, unknown>) => typeof node?.id === 'string');
    orgUnitId = typeof firstNode?.id === 'string' ? firstNode.id : '';
  }

  if (!orgUnitId) {
    const nodeName = 'Route Story 2.4 Ops ' + randomUUID().slice(0, 8);
    const bootstrapResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/structure/nodes',
      headers: {
        cookie: authCookie,
        'x-csrf-token': csrfToken,
        'x-correlation-id': 'corr-routeshyft-24-node-' + randomUUID().slice(0, 8),
        'idempotency-key': 'story24-structure-node-' + randomUUID(),
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
      orgUnitId = typeof bootstrapBody?.data?.node?.id === 'string' ? bootstrapBody.data.node.id : '';
    }

    if (!orgUnitId) {
      const finalTreeResponse = await apiRequest(request, {
        method: 'GET',
        path: '/api/v1/platform/admin/structure/tree?tenantId=' + encodeURIComponent(tenantId),
        headers: {
          cookie: authCookie,
          'x-correlation-id': 'corr-routeshyft-24-tree-retry-' + randomUUID().slice(0, 8),
        },
      });

      if (finalTreeResponse.status() === 200) {
        const finalTreeBody = await finalTreeResponse.json();
        const finalFlatNodes = Array.isArray(finalTreeBody?.data?.flat) ? finalTreeBody.data.flat : [];
        const discoveredNode = finalFlatNodes.find((node: Record<string, unknown>) => typeof node?.id === 'string');
        orgUnitId = typeof discoveredNode?.id === 'string' ? discoveredNode.id : '';
      }
    }

    if (!orgUnitId) {
      throw new Error(`Story 2.4 fixture org-unit bootstrap failed with status ${bootstrapResponse.status()}.`);
    }
  }

  if (!orgUnitId) {
    throw new Error('Story 2.4 fixture could not resolve a valid orgUnit scope.');
  }

  return {
    userId,
    tenantId,
    orgUnitId,
    role,
  };
}

export const test = base.extend<Story24Fixtures>({
  story24Context: async ({ request }, use) => {
    const scope = await loginStory24Scope(request);
    await use(createStory24Context({
      tenantId: process.env.TEST_ROUTE_TENANT_ID || scope.tenantId,
      orgUnitId: process.env.TEST_ROUTE_ORG_UNIT_ID || scope.orgUnitId,
      userId: scope.userId,
      correlationId: 'corr-routeshyft-24-' + randomUUID().slice(0, 8),
      csrfToken: 'csrf-routeshyft-24-' + randomUUID().slice(0, 8),
    }));
  },
  story24Headers: async ({ request, story24Context }, use) => {
    const scope = await loginStory24Scope(request);
    await use(createTenantScopeHeaders({
      tenantId: story24Context.tenantId,
      orgUnitId: story24Context.orgUnitId,
      role: scope.role,
      userId: scope.userId,
      correlationId: story24Context.correlationId,
      csrfToken: story24Context.csrfToken,
    }));
  },
  story24HappyPayload: async ({ story24Context }, use) => {
    await use(createStory24HappyPayload(story24Context));
  },
  story24RefusalPayload: async ({ story24Context }, use) => {
    await use(createStory24RefusalPayload(story24Context));
  },
});

export { expect } from '@playwright/test';
