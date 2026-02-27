import express from 'express';
import request from 'supertest';
import routeRouter from '../route';
import { resetRouteRefusalState } from '../../../../modules/route/application/refusalService';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.locals.responseEnvelope = {
      correlationId: 'corr-route-refusal-test',
      tenantId: req.header('x-tenant-id') || null,
    };
    next();
  });
  app.use('/api/v1/route', routeRouter);
  return app;
};

describe('route refusal outcomes API', () => {
  beforeEach(() => {
    resetRouteRefusalState();
  });

  it('records pre-commitment request refusal with structured alternatives and exposes history', async () => {
    const app = createApp();

    const refusalResponse = await request(app)
      .post('/api/v1/route/staff/requests/request-pre-101/refuse')
      .set('x-tenant-id', 'tenant-route-alpha')
      .send({
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

    const historyResponse = await request(app)
      .get('/api/v1/route/staff/requests/request-pre-101/history')
      .set('x-tenant-id', 'tenant-route-alpha');

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

    const refusalResponse = await request(app)
      .post('/api/v1/route/staff/commitments/commitment-post-201/refuse')
      .set('x-tenant-id', 'tenant-route-alpha')
      .send({
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

    const commitmentHistory = await request(app)
      .get('/api/v1/route/staff/commitments/commitment-post-201/history')
      .set('x-tenant-id', 'tenant-route-alpha');
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

    const requestHistory = await request(app)
      .get('/api/v1/route/staff/requests/request-post-201/history')
      .set('x-tenant-id', 'tenant-route-alpha');
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

    const response = await request(app)
      .post('/api/v1/route/staff/commitments/commitment-post-202/refuse')
      .set('x-tenant-id', 'tenant-route-alpha')
      .send({
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

  it('applies idempotent refusal writes using Idempotency-Key', async () => {
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

    const first = await request(app)
      .post('/api/v1/route/staff/requests/request-idem-301/refuse')
      .set('x-tenant-id', 'tenant-route-alpha')
      .set('idempotency-key', 'idem-route-301')
      .send(requestPayload);

    const second = await request(app)
      .post('/api/v1/route/staff/requests/request-idem-301/refuse')
      .set('x-tenant-id', 'tenant-route-alpha')
      .set('idempotency-key', 'idem-route-301')
      .send(requestPayload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({
      ok: true,
      data: {
        replayed: true,
      },
    });

    const history = await request(app)
      .get('/api/v1/route/staff/requests/request-idem-301/history')
      .set('x-tenant-id', 'tenant-route-alpha');

    expect(history.status).toBe(200);
    expect(history.body.data.events).toHaveLength(1);
  });
});
