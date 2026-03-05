import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { CommitmentService } from '../../../../modules/route/application/commitmentService';
import { InMemoryCommitmentRepository } from '../../../../modules/route/infrastructure/commitmentRepository';
import { createRouteBridgeRouter } from '../route-bridge';

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const activeOrgUnitOverride = req.header('x-test-route-active-org-unit-id') || 'org-route-bridge-1';
    req.user = {
      userId: 'user-route-bridge-1',
      email: 'bridge@example.com',
      householdId: 'tenant-route-bridge-1',
      activeTenantId: 'tenant-route-bridge-1',
      activeOrgUnitId: activeOrgUnitOverride,
      role: 'TENANT_STAFF',
    };
    req.tenantId = 'tenant-route-bridge-1';
    req.orgUnitId = activeOrgUnitOverride;
    req.scopeMode = 'ORG_UNIT';
    next();
  },
}));

describe('route bridge api contract', () => {
  const buildApp = (): { app: express.Express; commitmentService: CommitmentService } => {
    const app = express();
    app.use(express.json());
    app.use(responseEnvelope);

    const commitmentService = new CommitmentService(new InMemoryCommitmentRepository());
    app.use('/api/v1/route-bridge', createRouteBridgeRouter(commitmentService));
    return { app, commitmentService };
  };

  it('creates fulfillment commitments through bridge endpoint with canonical lifecycle data', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post('/api/v1/route-bridge/fulfillment')
      .send({
        sourceType: 'wordpress_fulfillment',
        sourceId: 'wp-fulfillment-1',
        orgUnitId: 'org-route-bridge-1',
        externalRef: 'wp-lineage-1',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTE_BRIDGE_FULFILLMENT_CREATED',
      data: {
        bridge: {
          integration: 'wordpress',
          stateAuthority: 'monolith',
        },
        canonicalLifecycle: {
          commitment: {
            sourceType: 'wordpress_fulfillment',
            sourceId: 'wp-fulfillment-1',
            externalRef: 'wp-lineage-1',
            status: 'scheduled',
          },
          state: {
            status: 'scheduled',
            isTerminal: false,
            availableTransitions: ['in_progress', 'canceled', 'refused'],
          },
        },
      },
    });
  });

  it('resolves pending commitments and excludes terminal commitments from bridge fetch', async () => {
    const { app, commitmentService } = buildApp();

    const pendingCreate = await commitmentService.createCommitment({
      tenantId: 'tenant-route-bridge-1',
      actorId: 'user-route-bridge-1',
      sourceType: 'wordpress_fulfillment',
      sourceId: 'wp-fulfillment-pending',
      orgUnitId: 'org-route-bridge-1',
      externalRef: 'wp-lineage-pending',
    });

    const terminalCreate = await commitmentService.createCommitment({
      tenantId: 'tenant-route-bridge-1',
      actorId: 'user-route-bridge-1',
      sourceType: 'wordpress_fulfillment',
      sourceId: 'wp-fulfillment-terminal',
      orgUnitId: 'org-route-bridge-1',
      externalRef: 'wp-lineage-terminal',
    });

    expect(pendingCreate.ok).toBe(true);
    expect(terminalCreate.ok).toBe(true);
    if (!pendingCreate.ok || !terminalCreate.ok) {
      throw new Error('Expected setup commitments to be created');
    }

    await commitmentService.transitionCommitment({
      tenantId: 'tenant-route-bridge-1',
      commitmentId: terminalCreate.data.commitment.commitmentId,
      actorId: 'user-route-bridge-1',
      nextStatus: 'in_progress',
      reason: 'Driver started fulfillment',
    });

    await commitmentService.transitionCommitment({
      tenantId: 'tenant-route-bridge-1',
      commitmentId: terminalCreate.data.commitment.commitmentId,
      actorId: 'user-route-bridge-1',
      nextStatus: 'completed',
      reason: 'Fulfillment completed',
    });

    const response = await request(app)
      .get('/api/v1/route-bridge/pending')
      .query({ orgUnitId: 'org-route-bridge-1' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTE_BRIDGE_PENDING_FETCH_RESOLVED',
      data: {
        bridge: {
          integration: 'wordpress',
          stateAuthority: 'monolith',
        },
        canonicalLifecycle: {
          total: 1,
          items: [
            {
              commitment: {
                commitmentId: pendingCreate.data.commitment.commitmentId,
                sourceId: 'wp-fulfillment-pending',
                status: 'scheduled',
              },
              state: {
                status: 'scheduled',
                isTerminal: false,
              },
            },
          ],
        },
      },
    });
  });

  it('rejects fulfillment creation when orgUnit scope mismatches active context', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post('/api/v1/route-bridge/fulfillment')
      .send({
        sourceType: 'wordpress_fulfillment',
        sourceId: 'wp-fulfillment-2',
        orgUnitId: 'org-route-bridge-999',
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ROUTE_ORG_UNIT_SCOPE_MISMATCH',
      refusalType: 'security',
    });
  });

  it('returns explicit refusal when fulfillment sourceId is missing', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post('/api/v1/route-bridge/fulfillment')
      .send({
        sourceType: 'wordpress_fulfillment',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ROUTE_COMMITMENT_SOURCE_ID_REQUIRED',
      refusalType: 'business',
    });
  });
});
