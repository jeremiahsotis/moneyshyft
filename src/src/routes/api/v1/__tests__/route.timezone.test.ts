import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { CommitmentService } from '../../../../modules/route/application/commitmentService';
import { IntakeService } from '../../../../modules/route/application/intakeService';
import {
  InMemoryCommitmentRepository,
} from '../../../../modules/route/infrastructure/commitmentRepository';
import {
  InMemoryIntakeRequestRepository,
} from '../../../../modules/route/infrastructure/intakeRequestRepository';
import { createRouteRouter } from '../route';

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const tenantId = 'tenant-route-timezone-1';
    const orgUnitId = 'org-route-timezone-1';

    req.user = {
      userId: 'user-route-timezone-1',
      email: 'dispatcher@example.com',
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId: orgUnitId,
      role: 'TENANT_STAFF',
    };
    req.tenantId = tenantId;
    req.orgUnitId = orgUnitId;
    req.scopeMode = 'ORG_UNIT';
    next();
  },
}));

const STRICT_UTC_ISO_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/;

const basePayload = {
  tenantId: 'tenant-route-timezone-1',
  orgUnitId: 'org-route-timezone-1',
  requestedAtUtc: '2026-02-26T14:00:00.000Z',
  requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
  requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
  channel: '2-6-canonical-timezone-processing',
  notes: 'Route timezone contract coverage',
  forceRefusal: false,
  scheduleMode: 'pickup',
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  const commitmentRepository = new InMemoryCommitmentRepository();
  const intakeRepository = new InMemoryIntakeRequestRepository();
  const commitmentService = new CommitmentService(commitmentRepository);
  const intakeService = new IntakeService(commitmentService, intakeRepository);

  app.use('/api/v1/route', createRouteRouter(commitmentService, intakeService));
  return { app, intakeRepository };
};

describe('route timezone presentation contract', () => {
  it('resolves timezone fallback in strict order user -> tenant -> system for intake responses', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/cashier-requests')
      .set('x-user-timezone', 'Invalid/Timezone')
      .set('x-tenant-timezone', 'America/Chicago')
      .set('x-system-timezone', 'UTC')
      .send(basePayload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_CASHIER_INTAKE_ACCEPTED',
      data: {
        timezone: 'America/Chicago',
        timezoneSource: 'tenant',
        availableSlots: expect.any(Array),
      },
    });
    expect(JSON.stringify(response.body?.data || {})).not.toMatch(STRICT_UTC_ISO_PATTERN);
  });

  it('uses system fallback and omits raw utc keys in reconciliation payloads', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .get('/api/v1/route/intake/reconciliation/unresolved?staleMinutes=60')
      .set('x-user-timezone', '')
      .set('x-tenant-timezone', '')
      .set('x-system-timezone', 'America/New_York');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_INTAKE_RECONCILIATION_QUEUE',
      data: {
        timezone: 'UTC',
        timezoneSource: 'system',
        generatedAtLocal: expect.any(String),
      },
    });
    expect(response.body?.data).not.toHaveProperty('generatedAtUtc');
    expect(JSON.stringify(response.body?.data || {})).not.toMatch(STRICT_UTC_ISO_PATTERN);
  });

  it('localizes DST boundary slots without raw UTC leakage', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/requests')
      .set('x-user-timezone', 'America/Los_Angeles')
      .send({
        ...basePayload,
        requestedAtUtc: '2026-03-08T09:00:00.000Z',
        requestedWindowStartUtc: '2026-03-08T09:30:00.000Z',
        requestedWindowEndUtc: '2026-03-08T11:30:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_ACCEPTED',
      data: {
        timezone: 'America/Los_Angeles',
        timezoneSource: 'user',
      },
    });

    const slots = response.body?.data?.availableSlots as string[];
    expect(slots[0]).toMatch(/03\/08\/2026, 01:30 AM/);
    expect(slots[1]).toMatch(/03\/08\/2026, 04:30 AM/);
    expect(JSON.stringify(response.body?.data || {})).not.toMatch(STRICT_UTC_ISO_PATTERN);
  });

  it('localizes half-hour offset timezones deterministically', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post('/api/v1/route/intake/requests')
      .set('x-user-timezone', 'Asia/Kolkata')
      .send({
        ...basePayload,
        requestedAtUtc: '2026-02-27T13:30:00.000Z',
        requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
        requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_ACCEPTED',
      data: {
        timezone: 'Asia/Kolkata',
        timezoneSource: 'user',
      },
    });

    const slots = response.body?.data?.availableSlots as string[];
    expect(slots[0]).toMatch(/02\/27\/2026, 07:30 PM/);
    expect(slots[1]).toMatch(/02\/27\/2026, 09:30 PM/);
    expect(JSON.stringify(response.body?.data || {})).not.toMatch(STRICT_UTC_ISO_PATTERN);
  });

  it('serializes commitment scheduling timestamps as local fields only', async () => {
    const { app } = buildApp();

    const created = await request(app)
      .post('/api/v1/route/commitments')
      .set('x-user-timezone', 'America/Los_Angeles')
      .send({
        sourceType: 'route_request',
        sourceId: 'timezone-commitment-1',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_CREATED',
      data: {
        timezone: 'America/Los_Angeles',
        timezoneSource: 'user',
        commitment: {
          createdAtLocal: expect.any(String),
          updatedAtLocal: expect.any(String),
        },
      },
    });
    expect(created.body?.data?.commitment).not.toHaveProperty('createdAtUtc');
    expect(created.body?.data?.commitment).not.toHaveProperty('updatedAtUtc');

    const commitmentId = created.body?.data?.commitment?.commitmentId as string;
    const transitioned = await request(app)
      .post(`/api/v1/route/commitments/${commitmentId}/transitions`)
      .set('x-user-timezone', 'America/Los_Angeles')
      .send({
        nextStatus: 'in_progress',
        reason: 'Timezone serialization coverage',
      });

    expect(transitioned.status).toBe(200);
    expect(transitioned.body).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
      data: {
        transition: {
          occurredAtLocal: expect.any(String),
        },
      },
    });
    expect(transitioned.body?.data?.transition).not.toHaveProperty('occurredAtUtc');
    expect(JSON.stringify(transitioned.body?.data || {})).not.toMatch(STRICT_UTC_ISO_PATTERN);
  });

  it('keeps intake persistence timestamps in canonical UTC-at-rest format', async () => {
    const { app, intakeRepository } = buildApp();

    const createResponse = await request(app)
      .post('/api/v1/route/intake/requests')
      .send(basePayload);

    expect(createResponse.status).toBe(200);
    const requestId = createResponse.body?.data?.requestId as string;
    const persisted = await intakeRepository.getById(
      basePayload.tenantId,
      basePayload.orgUnitId,
      requestId,
    );

    expect(persisted).not.toBeNull();
    expect(persisted?.requestedAtUtc).toBe(basePayload.requestedAtUtc);
    expect(persisted?.requestedWindowStartUtc).toBe(basePayload.requestedWindowStartUtc);
    expect(persisted?.requestedWindowEndUtc).toBe(basePayload.requestedWindowEndUtc);
    expect(persisted?.createdAtUtc).toMatch(STRICT_UTC_ISO_PATTERN);
    expect(persisted?.updatedAtUtc).toMatch(STRICT_UTC_ISO_PATTERN);
  });
});
