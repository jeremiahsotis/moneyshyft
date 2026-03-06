import express from 'express';
import request, { Test } from 'supertest';
import { createRouteRouter } from '../../../../modules/route/api/router';
import {
  createRouteRefusalService,
  type RouteRefusalService,
} from '../../../../modules/route/application/refusalService';
import { InMemoryRouteRefusalStore } from '../../../../modules/route/infrastructure/refusalStore';

type TestAuthHeaders = {
  userId?: string;
  role?: string;
  tenantId?: string;
};

const applyStaffHeaders = (req: Test, headers: TestAuthHeaders = {}): Test => {
  const userId = headers.userId || 'user-staff-1';
  const role = headers.role || 'ORGUNIT_MEMBER';
  const tenantId = headers.tenantId || 'tenant-route-alpha';
  return req
    .set('x-test-user-id', userId)
    .set('x-test-user-role', role)
    .set('x-test-tenant-id', tenantId);
};

const createApp = (
  service: RouteRefusalService = createRouteRefusalService(new InMemoryRouteRefusalStore()),
) => {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const userId = req.header('x-test-user-id');
    const role = req.header('x-test-user-role');
    const tenantId = req.header('x-test-tenant-id');

    if (userId && role && tenantId) {
      req.user = {
        userId,
        email: `${userId}@example.test`,
        householdId: tenantId,
        activeTenantId: tenantId,
        role,
      };
    }

    res.locals.responseEnvelope = {
      correlationId: 'corr-route-refusal-test',
      tenantId: req.user?.activeTenantId || req.user?.householdId || null,
    };
    next();
  });

  app.use('/api/v1/route', createRouteRouter(service));
  return app;
};

describe('route refusal outcomes API', () => {
  it('records pre-commitment request refusal with structured alternatives and exposes history', async () => {
    const app = createApp();

    const refusalResponse = await applyStaffHeaders(
      request(app)
        .post('/api/v1/route/staff/requests/request-pre-101/refuse'),
    ).send({
      reasonCode: 'CAPACITY_FULL',
      reasonMessage: 'Requested day part is full.',
      alternatives: [
        {
          type: 'RESCHEDULE_WINDOW',
          dateLocal: '2026-03-08',
          dayPart: 'morning',
          status: 'open',
        },
        {
          type: 'CALLBACK_PATH',
          queue: 'dispatcher-callback',
          expectedWithinHours: 48,
        },
      ],
    });

    expect(refusalResponse.status).toBe(201);
    expect(refusalResponse.body).toMatchObject({
      ok: true,
      code: 'ROUTE_REQUEST_REFUSAL_RECORDED',
      data: {
        requestId: 'request-pre-101',
        replayed: false,
        outcome: expect.objectContaining({
          stage: 'intake',
          reasonCode: 'CAPACITY_FULL',
        }),
      },
    });

    const historyResponse = await applyStaffHeaders(
      request(app)
        .get('/api/v1/route/staff/requests/request-pre-101/history'),
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toMatchObject({
      ok: true,
      code: 'ROUTE_REQUEST_HISTORY_RESOLVED',
      data: {
        requestId: 'request-pre-101',
        events: [
          expect.objectContaining({
            eventType: 'ROUTE_REFUSAL_RECORDED',
            stage: 'intake',
            reasonCode: 'CAPACITY_FULL',
          }),
        ],
      },
    });
  });

  it('records post-commitment refusal and keeps metadata visible in commitment and request history', async () => {
    const app = createApp();

    const refusalResponse = await applyStaffHeaders(
      request(app)
        .post('/api/v1/route/staff/commitments/commitment-post-201/refuse'),
    ).send({
      requestId: 'request-post-201',
      reasonCode: 'RESOURCE_UNAVAILABLE',
      reasonMessage: 'Required team is unavailable.',
      alternatives: [
        {
          type: 'PARTNER_REFERRAL',
          partnerName: 'Partner Program',
          contactPhone: '+12605550166',
        },
      ],
    });

    expect(refusalResponse.status).toBe(201);
    expect(refusalResponse.body).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_REFUSAL_RECORDED',
      data: {
        commitmentId: 'commitment-post-201',
        requestId: 'request-post-201',
      },
    });

    const commitmentHistory = await applyStaffHeaders(
      request(app)
        .get('/api/v1/route/staff/commitments/commitment-post-201/history'),
    );
    expect(commitmentHistory.status).toBe(200);
    expect(commitmentHistory.body).toMatchObject({
      ok: true,
      data: {
        events: [
          expect.objectContaining({
            eventType: 'ROUTE_REFUSAL_RECORDED',
            reasonCode: 'RESOURCE_UNAVAILABLE',
          }),
        ],
      },
    });

    const requestHistory = await applyStaffHeaders(
      request(app)
        .get('/api/v1/route/staff/requests/request-post-201/history'),
    );
    expect(requestHistory.status).toBe(200);
    expect(requestHistory.body).toMatchObject({
      ok: true,
      data: {
        events: [
          expect.objectContaining({
            eventType: 'ROUTE_COMMITMENT_REFUSAL_LINKED',
            commitmentId: 'commitment-post-201',
          }),
        ],
      },
    });
  });

  it('preserves refusal envelope semantics for invalid refusal payloads', async () => {
    const app = createApp();

    const response = await applyStaffHeaders(
      request(app)
        .post('/api/v1/route/staff/commitments/commitment-post-202/refuse'),
    ).send({
      reasonCode: 'NOT_ELIGIBLE_ZIP',
      reasonMessage: 'This code should not be valid for execution stage.',
      alternatives: [
        {
          type: 'PARTNER_REFERRAL',
          partnerName: 'Partner Program',
          contactPhone: '+12605550166',
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ROUTE_REFUSAL_VALIDATION_FAILED',
      refusalType: 'business',
    });
  });

  it('applies idempotent refusal writes using Idempotency-Key and rejects payload drift', async () => {
    const app = createApp();

    const requestPayload = {
      reasonCode: 'DAY_PART_NOT_AVAILABLE',
      reasonMessage: 'Requested window is unavailable.',
      alternatives: [
        {
          type: 'RESCHEDULE_WINDOW',
          dateLocal: '2026-03-09',
          dayPart: 'afternoon',
          status: 'open',
        },
      ],
    };

    const first = await applyStaffHeaders(
      request(app)
        .post('/api/v1/route/staff/requests/request-idem-301/refuse')
        .set('idempotency-key', 'idem-route-301'),
    ).send(requestPayload);

    const second = await applyStaffHeaders(
      request(app)
        .post('/api/v1/route/staff/requests/request-idem-301/refuse')
        .set('idempotency-key', 'idem-route-301'),
    ).send(requestPayload);

    const mismatched = await applyStaffHeaders(
      request(app)
        .post('/api/v1/route/staff/requests/request-idem-301/refuse')
        .set('idempotency-key', 'idem-route-301'),
    ).send({
      reasonCode: 'CAPACITY_FULL',
      reasonMessage: 'Different payload',
      alternatives: [
        {
          type: 'CALLBACK_PATH',
          queue: 'dispatch-review',
          expectedWithinHours: 24,
        },
      ],
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({
      ok: true,
      data: {
        replayed: true,
      },
    });

    expect(mismatched.status).toBe(409);
    expect(mismatched.body).toMatchObject({
      ok: false,
      code: 'ROUTE_IDEMPOTENCY_KEY_PAYLOAD_CONFLICT',
      refusalType: 'client',
    });

    const history = await applyStaffHeaders(
      request(app)
        .get('/api/v1/route/staff/requests/request-idem-301/history'),
    );

    expect(history.status).toBe(200);
    expect(history.body.data.events).toHaveLength(1);
  });

  it('rejects unauthenticated refusal attempts', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/route/staff/requests/request-auth-401/refuse')
      .send({
        reasonCode: 'CAPACITY_FULL',
        reasonMessage: 'Requested day part is full.',
        alternatives: [
          {
            type: 'CALLBACK_PATH',
            queue: 'dispatch-review',
            expectedWithinHours: 24,
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'AUTH_REQUIRED',
      refusalType: 'security',
    });
  });

  it('ignores x-tenant-id spoof attempts and uses authenticated tenant context', async () => {
    const app = createApp();

    const response = await applyStaffHeaders(
      request(app)
        .post('/api/v1/route/staff/requests/request-tenant-701/refuse')
        .set('x-tenant-id', 'tenant-spoofed'),
      { tenantId: 'tenant-route-authenticated' },
    ).send({
      reasonCode: 'CAPACITY_FULL',
      reasonMessage: 'Requested day part is full.',
      alternatives: [
        {
          type: 'CALLBACK_PATH',
          queue: 'dispatch-review',
          expectedWithinHours: 24,
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      data: {
        outcome: expect.objectContaining({
          tenantId: 'tenant-route-authenticated',
        }),
      },
      tenantId: 'tenant-route-authenticated',
    });
  });
});
