import { test, expect } from '@playwright/test';

test.describe('Story 1.2 Tenant and Module Entitlement Administration (ATDD API RED)', () => {
  test.skip('[P0] applies module entitlement toggle immediately for protected actions @P0', async ({ request }) => {
    const response = await request.patch('/api/v1/platform/tenants/tenant-a/modules/payroll/entitlement', {
      data: {
        enabled: false,
        reason: 'suspend-module',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({
      tenantId: 'tenant-a',
      moduleKey: 'payroll',
      enabled: false,
      authorizationUpdated: true,
    });
  });

  test.skip('[P0] creates and updates orgUnit scope with immediate authorization effect @P0', async ({ request }) => {
    const createResponse = await request.post('/api/v1/platform/tenants/tenant-a/org-units', {
      data: {
        name: 'Regional Ops',
        code: 'regional-ops',
      },
    });

    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created.ok).toBe(true);
    expect(created.data.orgUnit).toMatchObject({
      tenantId: 'tenant-a',
      name: 'Regional Ops',
      code: 'regional-ops',
    });

    const updateResponse = await request.put(`/api/v1/platform/tenants/tenant-a/org-units/${created.data.orgUnit.id}`, {
      data: {
        name: 'Regional Operations',
      },
    });

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.ok).toBe(true);
    expect(updated.data.authorizationUpdated).toBe(true);
  });

  test.skip('[P0] emits event + outbox rows atomically for entitlement and role mutations @P0', async ({ request }) => {
    const response = await request.post('/api/v1/platform/tenants/tenant-a/role-assignments', {
      data: {
        userId: 'user-123',
        role: 'ORGUNIT_ADMIN',
        orgUnitId: 'org-1',
        reason: 'operations-coverage',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.audit).toMatchObject({
      actorUserId: expect.any(String),
      tenantId: 'tenant-a',
      scopeLayer: 'ORGUNIT',
      reason: 'operations-coverage',
    });
    expect(body.data.outbox).toMatchObject({
      persisted: true,
      eventType: 'platform.tenant.role-assignment.changed',
    });
  });

  test.skip('[P1] blocks non-system users from assigning initial tenant admin @P1', async ({ request }) => {
    const response = await request.post('/api/v1/platform/tenants/tenant-a/initial-tenant-admin', {
      data: {
        assigneeUserId: 'user-234',
      },
      headers: {
        'x-test-actor-role': 'TENANT_ADMIN',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.refusal).toMatchObject({
      code: 'INITIAL_TENANT_ADMIN_REQUIRES_SYSTEM_ADMIN',
      layer: 'AUTHORIZATION',
    });
  });
});
