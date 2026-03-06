import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { CommitmentService } from '../../../../modules/route/application/commitmentService';
import { IntakeService } from '../../../../modules/route/application/intakeService';
import { InMemoryCommitmentRepository } from '../../../../modules/route/infrastructure/commitmentRepository';
import {
  InMemoryIntakeRequestRepository,
  IntakeRequestRepository,
  RouteIntakeRecord,
} from '../../../../modules/route/infrastructure/intakeRequestRepository';
import { createRouteRouter } from '../route';

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const activeOrgUnitOverride = req.header('x-test-route-active-org-unit-id') || 'org-route-intake-1';
    req.user = {
      userId: 'user-route-intake-1',
      email: 'cashier@example.com',
      householdId: 'tenant-route-intake-1',
      activeTenantId: 'tenant-route-intake-1',
      activeOrgUnitId: activeOrgUnitOverride,
      role: req.header('x-test-route-role') || 'TENANT_STAFF',
    };
    req.tenantId = 'tenant-route-intake-1';
    req.orgUnitId = activeOrgUnitOverride;
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
  const buildApp = (requestRepository?: IntakeRequestRepository): express.Express => {
    const app = express();
    app.use(express.json());
    app.use(responseEnvelope);

    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    const intakeService = new IntakeService(
      commitmentService,
      requestRepository || new InMemoryIntakeRequestRepository(),
    );

    app.use('/api/v1/route', createRouteRouter(commitmentService, intakeService));

    return app;
  };

  const unresolvedRecord = (): RouteIntakeRecord => ({
    requestId: 'request-unresolved-api-1',
    tenantId: 'tenant-route-intake-1',
    orgUnitId: 'org-route-intake-1',
    channel: 'cashier',
    requestedAtUtc: '2026-02-26T14:00:00.000Z',
    requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
    requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
    scheduleMode: 'pickup',
    notes: 'unresolved linkage via api test',
    status: 'Accepted',
    requestLifecycleStatus: 'pending',
    commitmentId: null,
    refusal: null,
    createdByUserId: 'user-route-intake-1',
    createdAtUtc: '2026-02-20T14:00:00.000Z',
    updatedAtUtc: '2026-02-20T14:00:00.000Z',
  });

  it('applies donor-equivalent validation and capacity rules for cashier-assisted intake', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send(basePayload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'MONEYSHYFT_CASHIER_INTAKE_ACCEPTED',
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
      code: 'MONEYSHYFT_CASHIER_INTAKE_REFUSED',
      refusalType: 'business',
      data: {
        requestId: expect.any(String),
        alternatives: expect.any(Array),
        nextSteps: expect.any(String),
      },
    });
    expect(response.body).not.toHaveProperty('data.commitmentId');
  });

  it('treats string forceRefusal=false as false and does not coerce to refusal', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send({
        ...basePayload,
        forceRefusal: 'false',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'MONEYSHYFT_CASHIER_INTAKE_ACCEPTED',
    });
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
      code: 'MONEYSHYFT_CASHIER_INTAKE_COMMITMENT_LINKED',
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
      code: 'MONEYSHYFT_CASHIER_INTAKE_REFUSED',
      refusalType: 'business',
      data: {
        reasonCode: 'MONEYSHYFT_DELIVERY_INSERTION_CONSTRAINT',
      },
    });
  });

  it('preserves donor/cashier parity for equivalent acceptance and refusal policy outcomes', async () => {
    const app = buildApp();

    const donorAcceptedResponse = await request(app)
      .post('/api/v1/route/intake/requests')
      .send(basePayload);

    const cashierAcceptedResponse = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send(basePayload);

    expect(donorAcceptedResponse.status).toBe(200);
    expect(cashierAcceptedResponse.status).toBe(200);

    const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(donorAcceptedResponse.body, key))).toBe(true);
    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(cashierAcceptedResponse.body, key))).toBe(true);
    expect(donorAcceptedResponse.body.ok).toBe(true);
    expect(cashierAcceptedResponse.body.ok).toBe(true);
    expect(donorAcceptedResponse.body.data).toMatchObject({
      status: 'Accepted',
      scheduleMode: cashierAcceptedResponse.body.data.scheduleMode,
      availableSlots: cashierAcceptedResponse.body.data.availableSlots,
    });
    expect(cashierAcceptedResponse.body.data).toMatchObject({
      status: 'Accepted',
    });

    const refusalPayload = {
      ...basePayload,
      requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
      requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
      forceRefusal: true,
    };

    const donorRefusalResponse = await request(app)
      .post('/api/v1/route/intake/requests')
      .send(refusalPayload);

    const cashierRefusalResponse = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send(refusalPayload);

    expect(donorRefusalResponse.status).toBe(200);
    expect(cashierRefusalResponse.status).toBe(200);
    expect(donorRefusalResponse.body.ok).toBe(false);
    expect(cashierRefusalResponse.body.ok).toBe(false);

    expect(donorRefusalResponse.body.data).toMatchObject({
      reasonCode: cashierRefusalResponse.body.data.reasonCode,
      alternatives: cashierRefusalResponse.body.data.alternatives,
      nextSteps: cashierRefusalResponse.body.data.nextSteps,
    });
    expect(donorRefusalResponse.body).not.toHaveProperty('data.commitmentId');
    expect(cashierRefusalResponse.body).not.toHaveProperty('data.commitmentId');
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

  it('does not resolve intake details across orgUnit boundaries in the same tenant', async () => {
    const app = buildApp();

    const createResponse = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .set('x-test-route-active-org-unit-id', 'org-route-intake-1')
      .send(basePayload);

    expect(createResponse.status).toBe(200);
    const requestId = createResponse.body?.data?.requestId;

    const scopedMiss = await request(app)
      .get(`/api/v1/route/intake/cashier-requests/${requestId}`)
      .set('x-test-route-active-org-unit-id', 'org-route-intake-2');

    expect(scopedMiss.status).toBe(200);
    expect(scopedMiss.body).toMatchObject({
      ok: false,
      code: 'MONEYSHYFT_INTAKE_REQUEST_NOT_FOUND',
      refusalType: 'business',
    });
  });

  it('exposes reconciliation queue with lifecycle status and operator actions', async () => {
    const requestRepository: IntakeRequestRepository = {
      createAccepted: jest.fn(),
      createRefused: jest.fn(),
      getById: jest.fn(),
      listUnresolved: jest.fn(async () => [unresolvedRecord()]),
    } as never;
    const app = buildApp(requestRepository);

    const response = await request(app)
      .get('/api/v1/route/intake/reconciliation/unresolved?staleMinutes=60');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'MONEYSHYFT_INTAKE_RECONCILIATION_QUEUE',
      data: {
        staleThresholdMinutes: 60,
        guardrailStatus: 'action_required',
        items: [
          expect.objectContaining({
            requestId: 'request-unresolved-api-1',
            requestLifecycleStatus: 'pending',
            issueCode: 'MONEYSHYFT_REQUEST_TERMINAL_STATE_MISSING',
            issueSummary: 'Request has not reached a valid terminal lifecycle state.',
            reconciliationActions: [
              'Link request to a valid commitment or record explicit cancellation/refusal.',
              'Reprocess intake if linkage prerequisites were missing at submission time.',
            ],
            stale: true,
          }),
        ],
      },
    });
  });

  it('maintains committed request terminal state while linked commitment transitions', async () => {
    const app = buildApp();

    const createResponse = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .send(basePayload);

    expect(createResponse.status).toBe(200);
    const requestId = createResponse.body?.data?.requestId as string;
    const commitmentId = createResponse.body?.data?.commitmentId as string;

    await request(app)
      .post(`/api/v1/route/commitments/${commitmentId}/transitions`)
      .send({
        nextStatus: 'in_progress',
        reason: 'Dispatch started from integration test',
      })
      .expect(200);

    const detailResponse = await request(app)
      .get(`/api/v1/route/intake/cashier-requests/${requestId}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      ok: true,
      code: 'MONEYSHYFT_CASHIER_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId,
        requestLifecycleStatus: 'committed',
        commitmentLifecycleStatus: 'in_progress',
      },
    });
  });
});
