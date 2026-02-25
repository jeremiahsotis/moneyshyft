import express from 'express';
import request from 'supertest';
import { registerPlatformMiddleware } from '../../../../api/registerRoutes';
import router from '../route';
import { resetRouteIntakeStoreForTests } from '../../../../modules/route/infrastructure/inMemoryRouteIntakeStore';

type BuildAppOptions = {
  injectUser?: boolean;
  includeOrgUnitInUser?: boolean;
};

const buildApp = ({
  injectUser = true,
  includeOrgUnitInUser = true,
}: BuildAppOptions = {}) => {
  const app = express();
  app.use(express.json());

  if (injectUser) {
    app.use((req, _res, next) => {
      const tenantId = req.header('x-tenant-id') || 'tenant-routeshyft-alpha';
      const orgUnitId = req.header('x-org-unit-id') || 'org-routeshyft-alpha-ops';

      req.user = {
        userId: 'user-routeshyft-dispatcher',
        email: 'dispatcher@example.com',
        householdId: tenantId,
        activeTenantId: tenantId,
        ...(includeOrgUnitInUser ? { activeOrgUnitId: orgUnitId } : {}),
        role: 'DISPATCHER',
      };

      next();
    });
  }

  registerPlatformMiddleware(app);
  app.use('/api/v1/route', router);
  return app;
};

const buildHappyPayload = () => ({
  tenantId: 'tenant-routeshyft-alpha',
  orgUnitId: 'org-routeshyft-alpha-ops',
  requestedAtUtc: '2026-02-26T14:00:00.000Z',
  requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
  requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
  donorEligibilityConfirmed: true,
  pickupAddress: '1600 S Calhoun St, Fort Wayne, IN',
  zipCode: '46802',
  channel: 'donor-self-service',
  notes: 'Sofa and coffee table',
  forceRefusal: false,
  itemCount: 2,
  itemSummary: 'Sofa and coffee table',
});

describe('RouteShyft donor intake routes', () => {
  beforeEach(() => {
    resetRouteIntakeStoreForTests();
  });

  it('returns schedulable slots and linked commitment for accepted requests', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .set('x-correlation-id', 'corr-route-22-accepted')
      .send(buildHappyPayload());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_SLOTS_AVAILABLE',
      data: {
        requestId: expect.any(String),
        commitmentId: expect.any(String),
        status: 'Schedulable',
        slots: expect.any(Array),
      },
    });

    const slots = response.body.data.slots as Array<{ slotStartUtc: string }>;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].slotStartUtc <= slots[slots.length - 1].slotStartUtc).toBe(true);
  });

  it('returns capacity refusal envelope with structured alternatives', async () => {
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
      code: 'ROUTESHYFT_DONOR_INTAKE_REFUSED_CAPACITY',
      data: {
        requestId: expect.any(String),
        refusalReason: expect.any(String),
        alternatives: expect.any(Array),
        nextSteps: expect.any(Array),
      },
    });

    const alternatives = response.body?.data?.alternatives as Array<{
      type: string;
      label: string;
      windowStartUtc?: string;
      windowEndUtc?: string;
    }>;
    expect(alternatives.length).toBeGreaterThan(0);
    alternatives.forEach((alternative) => {
      expect(alternative).toEqual(expect.objectContaining({
        type: expect.any(String),
        label: expect.any(String),
      }));
    });

    const slotAlternatives = alternatives.filter((alternative) => alternative.type === 'slot');
    expect(slotAlternatives.length).toBeGreaterThan(0);
    slotAlternatives.forEach((alternative) => {
      expect(typeof alternative.windowStartUtc).toBe('string');
      expect(typeof alternative.windowEndUtc).toBe('string');
    });
  });

  it('returns linked request and commitment lineage by request detail endpoint', async () => {
    const app = buildApp();

    const createResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send(buildHappyPayload());

    const requestId = createResponse.body?.data?.requestId as string;

    const detailResponse = await request(app)
      .get(`/api/v1/route/intake/donor-requests/${requestId}`)
      .set('x-correlation-id', 'corr-route-22-detail');

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
      data: {
        requestId,
        commitmentId: expect.any(String),
        lineage: {
          requestId,
          commitmentId: expect.any(String),
        },
      },
    });
  });

  it('returns deterministic validation refusal for missing required fields', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send({
        ...buildHappyPayload(),
        requestedAtUtc: '',
        requestedWindowStartUtc: '',
        requestedWindowEndUtc: '',
        donorEligibilityConfirmed: false,
        pickupAddress: '',
        zipCode: '',
        itemSummary: '',
        itemCount: 0,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: 'ROUTESHYFT_DONOR_INTAKE_VALIDATION_FAILED',
      data: {
        fieldErrors: expect.any(Array),
      },
    });

    const fieldErrors = response.body?.data?.fieldErrors as Array<{ field: string }>;
    expect(fieldErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'donorEligibilityConfirmed' }),
      expect.objectContaining({ field: 'pickupAddress' }),
      expect.objectContaining({ field: 'zipCode' }),
    ]));
  });

  it('blocks cross-tenant request detail access without leaking commitment linkage', async () => {
    const app = buildApp();

    const createResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .set('x-tenant-id', 'tenant-routeshyft-alpha')
      .set('x-org-unit-id', 'org-routeshyft-alpha-ops')
      .send(buildHappyPayload());

    const requestId = createResponse.body?.data?.requestId as string;

    const crossTenantResponse = await request(app)
      .get(`/api/v1/route/intake/donor-requests/${requestId}`)
      .set('x-tenant-id', 'tenant-routeshyft-bravo')
      .set('x-org-unit-id', 'org-routeshyft-bravo-ops');

    expect(crossTenantResponse.status).toBe(200);
    expect(crossTenantResponse.body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: 'ROUTESHYFT_DONOR_INTAKE_SCOPE_MISMATCH',
    });
    expect(crossTenantResponse.body?.data?.commitmentId).toBeUndefined();
  });

  it('preserves request and commitment lineage for repeated idempotent accepted submissions', async () => {
    const app = buildApp();

    const firstResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .set('x-idempotency-key', 'route-story-22-idempotency-key')
      .send(buildHappyPayload());

    const secondResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .set('x-idempotency-key', 'route-story-22-idempotency-key')
      .send(buildHappyPayload());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    expect(firstResponse.body?.data?.requestId).toBe(secondResponse.body?.data?.requestId);
    expect(firstResponse.body?.data?.commitmentId).toBe(secondResponse.body?.data?.commitmentId);
  });

  it('rejects unknown orgUnit scope for unauthenticated donor intake requests', async () => {
    const app = buildApp({ injectUser: false });

    const response = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .send({
        ...buildHappyPayload(),
        tenantId: 'public',
        orgUnitId: 'org-not-configured',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: 'ROUTESHYFT_DONOR_INTAKE_VALIDATION_FAILED',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'orgUnitId',
            reason: 'unknown_org_unit',
          }),
        ]),
      },
    });
  });

  it('replays idempotency correctly when tenant context has no active orgUnit', async () => {
    const app = buildApp({ includeOrgUnitInUser: false });

    const firstResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .set('x-idempotency-key', 'route-story-22-tenant-scope-idempotency')
      .send(buildHappyPayload());

    const secondResponse = await request(app)
      .post('/api/v1/route/intake/donor-requests')
      .set('x-idempotency-key', 'route-story-22-tenant-scope-idempotency')
      .send(buildHappyPayload());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstResponse.body?.ok).toBe(true);
    expect(secondResponse.body?.ok).toBe(true);
    expect(firstResponse.body?.data?.requestId).toBe(secondResponse.body?.data?.requestId);
    expect(firstResponse.body?.data?.commitmentId).toBe(secondResponse.body?.data?.commitmentId);
  });
});
