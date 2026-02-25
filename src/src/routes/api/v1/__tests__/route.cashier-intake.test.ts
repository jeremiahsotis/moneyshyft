import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { CommitmentService } from '../../../../modules/route/application/commitmentService';
import { IntakeService } from '../../../../modules/route/application/intakeService';
import { InMemoryCommitmentRepository } from '../../../../modules/route/infrastructure/commitmentRepository';
import { InMemoryIntakeRequestRepository } from '../../../../modules/route/infrastructure/intakeRequestRepository';
import { createRouteRouter } from '../route';

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: 'user-route-intake-1',
      email: 'cashier@example.com',
      householdId: 'tenant-route-intake-1',
      activeTenantId: 'tenant-route-intake-1',
      activeOrgUnitId: 'org-route-intake-1',
      role: req.header('x-test-route-role') || 'TENANT_STAFF',
    };
    req.tenantId = 'tenant-route-intake-1';
    req.orgUnitId = 'org-route-intake-1';
    req.scopeMode = 'ORG_UNIT';
    next();
  },
}));

const basePayload = {
  tenantId: 'tenant-route-intake-1',
  orgUnitId: 'org-route-intake-1',
  requestedAtUtc: '2026-02-26T14:00:00.000Z',
  requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
  requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
  channel: '2-3-cashier-assisted-intake-and-voucher-delivery-scheduling',
  notes: 'route cashier intake api contract test',
  forceRefusal: false,
  scheduleMode: 'delivery',
};

describe('route cashier-assisted intake api contract', () => {
  const buildApp = (): express.Express => {
    const app = express();
    app.use(express.json());
    app.use(responseEnvelope);

    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    const intakeService = new IntakeService(
      commitmentService,
      new InMemoryIntakeRequestRepository(),
    );

    app.use('/api/v1/route', createRouteRouter(commitmentService, intakeService));

    return app;
  };

  it('applies donor-equivalent validation and capacity rules for cashier-assisted intake', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send(basePayload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_CASHIER_INTAKE_ACCEPTED',
      data: {
        requestId: expect.any(String),
        commitmentId: expect.any(String),
        status: 'Accepted',
      },
    });
  });

  it('returns deterministic refusal alternatives and next-steps for constrained cashier scheduling', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send({
        ...basePayload,
        requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
        requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
        forceRefusal: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ROUTESHYFT_CASHIER_INTAKE_REFUSED',
      refusalType: 'business',
      data: {
        requestId: expect.any(String),
        alternatives: expect.any(Array),
        nextSteps: expect.any(String),
      },
    });
    expect(response.body).not.toHaveProperty('data.commitmentId');
  });

  it('links accepted cashier-assisted requests to commitment identifiers through detail lookup', async () => {
    const app = buildApp();

    const createResponse = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send(basePayload);

    expect(createResponse.status).toBe(200);
    const requestId = createResponse.body?.data?.requestId;

    const detailResponse = await request(app)
      .get(`/api/v1/route/intake/cashier-requests/${requestId}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_CASHIER_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId,
        commitmentId: expect.any(String),
        status: 'Accepted',
      },
    });
  });

  it('enforces pickup-first delivery insertion constraints with business refusal on invalid windows', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send({
        ...basePayload,
        requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
        requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
        forceRefusal: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ROUTESHYFT_CASHIER_INTAKE_REFUSED',
      refusalType: 'business',
      data: {
        reasonCode: 'ROUTESHYFT_DELIVERY_INSERTION_CONSTRAINT',
      },
    });
  });

  it('preserves donor/cashier parity envelope fields for equivalent intake payloads', async () => {
    const app = buildApp();

    const donorResponse = await request(app)
      .post('/api/v1/route/intake/requests')
      .send(basePayload);

    const cashierResponse = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send(basePayload);

    expect(donorResponse.status).toBe(200);
    expect(cashierResponse.status).toBe(200);

    const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(donorResponse.body, key))).toBe(true);
    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(cashierResponse.body, key))).toBe(true);
    expect(donorResponse.body.ok).toBe(cashierResponse.body.ok);
  });

  it('rejects cashier intake when body orgUnitId mismatches active orgUnit context', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send({
        ...basePayload,
        orgUnitId: 'org-route-intake-99',
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ROUTE_ORG_UNIT_SCOPE_MISMATCH',
      refusalType: 'security',
    });
  });
});
