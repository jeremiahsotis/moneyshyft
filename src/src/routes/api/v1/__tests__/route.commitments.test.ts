import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { CommitmentService } from '../../../../modules/route/application/commitmentService';
import { InMemoryCommitmentRepository } from '../../../../modules/route/infrastructure/commitmentRepository';
import { createRouteRouter } from '../route';

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: 'user-route-1',
      email: 'dispatcher@example.com',
      householdId: 'tenant-route-1',
      activeTenantId: 'tenant-route-1',
      activeOrgUnitId: 'org-route-1',
      role: 'TENANT_STAFF',
    };
    req.tenantId = 'tenant-route-1';
    req.orgUnitId = 'org-route-1';
    req.scopeMode = 'ORG_UNIT';
    next();
  },
}));

describe('route commitment api contract', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use(responseEnvelope);
    const service = new CommitmentService(new InMemoryCommitmentRepository());
    app.use('/api/v1/route', createRouteRouter(service));
    return app;
  };

  it('supports valid commitment transitions', async () => {
    const app = buildApp();

    const created = await request(app)
      .post('/api/v1/route/commitments')
      .send({
        sourceType: 'route_request',
        sourceId: 'request-api-1',
        orgUnitId: 'org-route-1',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_CREATED',
      data: {
        commitment: {
          status: 'scheduled',
        },
      },
    });

    const commitmentId = created.body.data.commitment.commitmentId as string;

    const transitioned = await request(app)
      .post(`/api/v1/route/commitments/${commitmentId}/transitions`)
      .send({
        nextStatus: 'in_progress',
        reason: 'Driver assigned',
      });

    expect(transitioned.status).toBe(200);
    expect(transitioned.body).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
      data: {
        commitment: {
          commitmentId,
          status: 'in_progress',
        },
        transition: {
          previousStatus: 'scheduled',
          newStatus: 'in_progress',
          reason: 'Driver assigned',
        },
      },
    });
  });

  it('returns explicit refusal details for invalid transitions', async () => {
    const app = buildApp();

    const created = await request(app)
      .post('/api/v1/route/commitments')
      .send({
        sourceType: 'route_request',
        sourceId: 'request-api-2',
      });
    const commitmentId = created.body.data.commitment.commitmentId as string;

    const refused = await request(app)
      .post(`/api/v1/route/commitments/${commitmentId}/transitions`)
      .send({
        nextStatus: 'completed',
        reason: 'Skipping in_progress',
      });

    expect(refused.status).toBe(200);
    expect(refused.body).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_INVALID_TRANSITION',
      refusalType: 'business',
      data: {
        currentStatus: 'scheduled',
        attemptedStatus: 'completed',
        allowedTransitions: ['in_progress', 'canceled', 'refused'],
      },
    });
  });

  it('blocks transitions after terminal state and surfaces policy-exception path', async () => {
    const app = buildApp();

    const created = await request(app)
      .post('/api/v1/route/commitments')
      .send({
        sourceType: 'route_request',
        sourceId: 'request-api-3',
      });
    const commitmentId = created.body.data.commitment.commitmentId as string;

    await request(app)
      .post(`/api/v1/route/commitments/${commitmentId}/transitions`)
      .send({
        nextStatus: 'in_progress',
        reason: 'Driver started run',
      })
      .expect(200);

    await request(app)
      .post(`/api/v1/route/commitments/${commitmentId}/transitions`)
      .send({
        nextStatus: 'completed',
        reason: 'Proof captured',
      })
      .expect(200);

    const locked = await request(app)
      .post(`/api/v1/route/commitments/${commitmentId}/transitions`)
      .send({
        nextStatus: 'canceled',
        reason: 'Post-completion correction without exception',
      });

    expect(locked.status).toBe(200);
    expect(locked.body).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED',
      refusalType: 'business',
      data: {
        currentStatus: 'completed',
        attemptedStatus: 'canceled',
        isTerminal: true,
        allowedWithPolicyExceptionTransitions: ['canceled', 'refused'],
      },
    });
  });
});
