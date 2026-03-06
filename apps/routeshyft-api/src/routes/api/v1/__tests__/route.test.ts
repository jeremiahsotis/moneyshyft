import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { CommitmentService } from '../../../../modules/route/application/commitmentService';
import { IntakeService } from '../../../../modules/route/application/intakeService';
import { InMemoryCommitmentRepository } from '../../../../modules/route/infrastructure/commitmentRepository';
import { InMemoryIntakeRequestRepository } from '../../../../modules/route/infrastructure/intakeRequestRepository';
import { createRouteRouter } from '../route';

type BuildAppOptions = {
  injectUser?: boolean;
};

const buildApp = ({
  injectUser = true,
}: BuildAppOptions = {}) => {
  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  if (injectUser) {
    app.use((req, _res, next) => {
      const tenantId = req.header('x-tenant-id') || 'tenant-routeshyft-alpha';
      const orgUnitId = req.header('x-org-unit-id') || 'org-routeshyft-alpha-ops';

      req.user = {
        userId: 'user-routeshyft-dispatcher',
        email: 'dispatcher@example.com',
        householdId: tenantId,
        activeTenantId: tenantId,
        activeOrgUnitId: orgUnitId,
        role: 'DISPATCHER',
      };

      next();
    });
  }

  const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
  const intakeService = new IntakeService(
    commitmentService,
    new InMemoryIntakeRequestRepository(),
  );
  app.use('/api/v1/route', createRouteRouter(commitmentService, intakeService));
  return app;
};

const buildHappyPayload = () => ({
  tenantId: 'tenant-routeshyft-alpha',
  orgUnitId: 'org-routeshyft-alpha-ops',
  requestedAtUtc: '2026-02-26T14:00:00.000Z',
  requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
  requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
  channel: 'donor-self-service',
  notes: 'Route donor intake lifecycle coverage',
  forceRefusal: false,
  scheduleMode: 'pickup',
});

describe('RouteShyft donor intake lifecycle routes', () => {
  it('accepts donor intake and links a commitment through the shared lifecycle service', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .set('x-correlation-id', 'corr-route-24-donor-accepted')
      .send(buildHappyPayload());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_ACCEPTED',
      data: {
        requestId: expect.any(String),
        commitmentId: expect.any(String),
        status: 'Accepted',
      },
    });
  });

  it('resolves donor intake detail with request and commitment lifecycle statuses', async () => {
    const app = buildApp();

    const createResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send(buildHappyPayload());

    const requestId = createResponse.body?.data?.requestId as string;

    const detailResponse = await request(app)
      .get(`/api/v1/route/intake/donor-requests/${requestId}`)
      .query({
        tenantId: 'tenant-routeshyft-alpha',
        orgUnitId: 'org-routeshyft-alpha-ops',
      });

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId,
        commitmentId: expect.any(String),
        requestLifecycleStatus: 'committed',
        commitmentLifecycleStatus: 'scheduled',
      },
    });
  });

  it('returns deterministic refusal alternatives for forced donor intake capacity failure', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send({
        ...buildHappyPayload(),
        forceRefusal: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: 'ROUTESHYFT_DONOR_INTAKE_REFUSED',
      data: {
        requestId: expect.any(String),
        alternatives: expect.any(Array),
        nextSteps: expect.any(String),
      },
    });
    expect(response.body).not.toHaveProperty('data.commitmentId');
  });

  it('rejects donor intake when body orgUnitId mismatches active orgUnit context', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send({
        ...buildHappyPayload(),
        orgUnitId: 'org-route-intake-mismatch',
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ROUTE_ORG_UNIT_SCOPE_MISMATCH',
      refusalType: 'security',
    });
  });

  it('supports unauthenticated donor detail lookups when tenant and orgUnit query scope is provided', async () => {
    const app = buildApp({ injectUser: false });

    const createResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send(buildHappyPayload());
    expect(createResponse.status).toBe(200);
    const requestId = createResponse.body?.data?.requestId as string;

    const detailResponse = await request(app)
      .get(`/api/v1/route/intake/donor-requests/${requestId}`)
      .query({
        tenantId: 'tenant-routeshyft-alpha',
        orgUnitId: 'org-routeshyft-alpha-ops',
      });

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId,
        requestLifecycleStatus: 'committed',
      },
    });
  });

  it('requires explicit tenant/orgUnit scope for unauthenticated donor detail lookups', async () => {
    const app = buildApp({ injectUser: false });

    const createResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send(buildHappyPayload());
    expect(createResponse.status).toBe(200);
    const requestId = createResponse.body?.data?.requestId as string;

    const detailResponse = await request(app)
      .get(`/api/v1/route/intake/donor-requests/${requestId}`);

    expect(detailResponse.status).toBe(403);
    expect(detailResponse.body).toMatchObject({
      ok: false,
      code: 'ROUTE_TENANT_CONTEXT_REQUIRED',
      refusalType: 'security',
    });
  });
});
