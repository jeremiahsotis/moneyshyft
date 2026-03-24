// @ts-nocheck
import express from 'express';
import request from 'supertest';
import {
  consumeAmbiguityEventsForResolverOutcome,
  createIdentityAmbiguityEvent,
  resetIdentityAmbiguityEventsForTests,
} from '../../../../modules/connectshyft/ambiguityEvents';
import {
  InvalidResolverReviewTransitionError,
  peopleCoreServiceAsync,
  ResolverReviewValidationError,
} from '../../../../modules/peoplecore/service';
import { PeopleCoreScopeViolationError } from '../../../../modules/peoplecore/store';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = 'tenant-connectshyft-ambiguity-ops';
const TEST_ORG_UNIT_ID = 'org-connectshyft-ambiguity-ops-east';
const OTHER_ORG_UNIT_ID = 'org-connectshyft-ambiguity-ops-west';
const OTHER_TENANT_ID = 'tenant-connectshyft-ambiguity-ops-other';
const TEST_USER_ID = 'user-connectshyft-ambiguity-ops';
const CONNECTSHYFT_TEST_FLAGS = JSON.stringify({
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
});

type HarnessOptions = {
  defaultTenantId?: string;
  defaultOrgUnitId?: string | null;
  defaultRole?: string;
  defaultUserId?: string;
};

type HeaderOptions = {
  tenantId?: string;
  orgUnitId?: string | undefined;
  role?: string;
  userId?: string;
  memberships?: string[] | undefined;
  correlationId?: string;
  flags?: string;
};

const buildApp = (options: HarnessOptions = {}) => {
  const {
    defaultTenantId = TEST_TENANT_ID,
    defaultOrgUnitId = TEST_ORG_UNIT_ID,
    defaultRole = 'TENANT_ADMIN',
    defaultUserId = TEST_USER_ID,
  } = options;

  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  app.use((req, _res, next) => {
    const tenantId = req.header('x-test-connectshyft-tenant-id') || defaultTenantId;
    const orgUnitId = req.header('x-test-connectshyft-orgunit-id') || defaultOrgUnitId;
    const role = req.header('x-test-connectshyft-role') || defaultRole;
    const userId = req.header('x-test-connectshyft-user-id') || defaultUserId;

    req.user = {
      userId,
      email: `${String(userId).trim() || 'anonymous'}@connectshyft.test`,
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId: orgUnitId ?? undefined,
      role,
    };
    req.tenantId = tenantId;
    req.orgUnitId = orgUnitId ?? undefined;
    req.tenantContext = tenantId
      ? {
        tenantId,
        orgUnitId: orgUnitId ?? undefined,
        scopeMode: orgUnitId ? 'ORG_UNIT' : 'TENANT',
        source: 'auth',
      }
      : undefined;

    next();
  });

  app.use('/api/v1/connectshyft', connectShyftRouter);
  return app;
};

const buildHeaders = (
  options: HeaderOptions = {},
): Record<string, string> => {
  const tenantId = Object.prototype.hasOwnProperty.call(options, 'tenantId')
    ? options.tenantId
    : TEST_TENANT_ID;
  const orgUnitId = Object.prototype.hasOwnProperty.call(options, 'orgUnitId')
    ? options.orgUnitId
    : TEST_ORG_UNIT_ID;
  const role = Object.prototype.hasOwnProperty.call(options, 'role')
    ? options.role
    : 'TENANT_ADMIN';
  const userId = Object.prototype.hasOwnProperty.call(options, 'userId')
    ? options.userId
    : TEST_USER_ID;
  const memberships = Object.prototype.hasOwnProperty.call(options, 'memberships')
    ? options.memberships
    : (orgUnitId ? [orgUnitId] : undefined);
  const correlationId = Object.prototype.hasOwnProperty.call(options, 'correlationId')
    ? options.correlationId
    : 'corr-connectshyft-identity-ambiguity-ops';
  const flags = Object.prototype.hasOwnProperty.call(options, 'flags')
    ? options.flags
    : CONNECTSHYFT_TEST_FLAGS;

  const headers: Record<string, string> = {
    'x-correlation-id': correlationId,
    'x-test-connectshyft-flags': flags,
    'x-test-connectshyft-tenant-id': tenantId,
    'x-test-connectshyft-role': role,
    'x-test-connectshyft-user-id': userId,
  };

  if (orgUnitId) {
    headers['x-test-connectshyft-orgunit-id'] = orgUnitId;
  }

  if (memberships) {
    headers['x-test-connectshyft-orgunit-memberships'] = JSON.stringify(memberships);
  }

  return headers;
};

const createEvent = async (overrides: Record<string, unknown> = {}) => createIdentityAmbiguityEvent({
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  sourceContext: 'connectshyft_identity_match',
  sourceContextId: 'identity-match:ops-default',
  normalizedContactPoint: '+12605550181',
  candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
  ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
  status: 'pending',
  requestedByUserId: TEST_USER_ID,
  correlationId: 'corr-connectshyft-identity-ambiguity-ops',
  idempotencyKey: 'identity-match:ops-default',
  createdAtUtc: '2026-03-21T12:00:00.000Z',
  updatedAtUtc: '2026-03-21T12:00:00.000Z',
  ...overrides,
});

describe('connectshyft identity ambiguity ops route', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousConnectShyftEnabled = process.env.CONNECTSHYFT_ENABLED;
  const previousConnectShyftInboxEnabled = process.env.CONNECTSHYFT_INBOX_ENABLED;
  const previousConnectShyftEscalationEnabled = process.env.CONNECTSHYFT_ESCALATION_ENABLED;
  const previousConnectShyftWebhooksEnabled = process.env.CONNECTSHYFT_WEBHOOKS_ENABLED;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    process.env.CONNECTSHYFT_ENABLED = 'true';
    process.env.CONNECTSHYFT_INBOX_ENABLED = 'true';
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = 'true';
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = 'true';
  });

  beforeEach(() => {
    resetIdentityAmbiguityEventsForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetIdentityAmbiguityEventsForTests();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
  });

  it('returns tenant-scoped ambiguity events newest first for tenant-privileged reads and supports orgUnit filters', async () => {
    await createEvent({
      id: 'ambiguity-event-east',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
      updatedAtUtc: '2026-03-21T12:00:00.000Z',
    });
    await createEvent({
      id: 'ambiguity-event-west',
      orgUnitId: OTHER_ORG_UNIT_ID,
      sourceContextId: 'identity-match:ops-west',
      normalizedContactPoint: '+12605550182',
      ambiguityReasonCode: 'PEOPLECORE_LEGACY_DISAGREEMENT',
      createdAtUtc: '2026-03-21T12:05:00.000Z',
      updatedAtUtc: '2026-03-21T12:05:00.000Z',
    });
    await createEvent({
      id: 'ambiguity-event-other-tenant',
      tenantId: OTHER_TENANT_ID,
      orgUnitId: OTHER_ORG_UNIT_ID,
      sourceContextId: 'identity-match:ops-other-tenant',
      normalizedContactPoint: '+12605550183',
      createdAtUtc: '2026-03-21T12:10:00.000Z',
      updatedAtUtc: '2026-03-21T12:10:00.000Z',
    });

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITIES_RESOLVED',
      data: {
        events: [
          expect.objectContaining({
            id: 'ambiguity-event-west',
            tenantId: TEST_TENANT_ID,
            orgUnitId: OTHER_ORG_UNIT_ID,
            ambiguityReasonCode: 'PEOPLECORE_LEGACY_DISAGREEMENT',
          }),
          expect.objectContaining({
            id: 'ambiguity-event-east',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          }),
        ],
        nextCursor: null,
      },
    });
    expect(response.body.data.events).toHaveLength(2);
    expect(Object.keys(response.body.data.events[0]).sort()).toEqual([
      'ambiguityReasonCode',
      'candidateCount',
      'candidateNeighborIds',
      'contactPointType',
      'correlationId',
      'createdAtUtc',
      'id',
      'idempotencyKey',
      'normalizedContactPoint',
      'orgUnitId',
      'requestedByUserId',
      'resolverConsumedAtUtc',
      'resolverConsumedByUserId',
      'resolverOutcome',
      'resolverReviewId',
      'sourceContext',
      'sourceContextId',
      'status',
      'tenantId',
      'updatedAtUtc',
    ].sort());

    const filteredResponse = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .query({
        orgUnitId: OTHER_ORG_UNIT_ID,
      })
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.body.data.events).toHaveLength(1);
    expect(filteredResponse.body.data.events[0]).toMatchObject({
      id: 'ambiguity-event-west',
      orgUnitId: OTHER_ORG_UNIT_ID,
    });
  });

  it('keeps org-unit identity reads scoped to the active orgUnit and refuses cross-orgUnit overrides', async () => {
    await createEvent({
      id: 'ambiguity-event-east',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
      updatedAtUtc: '2026-03-21T12:00:00.000Z',
    });
    await createEvent({
      id: 'ambiguity-event-west',
      orgUnitId: OTHER_ORG_UNIT_ID,
      sourceContextId: 'identity-match:ops-west',
      normalizedContactPoint: '+12605550184',
      createdAtUtc: '2026-03-21T12:05:00.000Z',
      updatedAtUtc: '2026-03-21T12:05:00.000Z',
    });

    const app = buildApp({
      defaultRole: 'ORGUNIT_IDENTITY_LEAD',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .set(buildHeaders({
        role: 'ORGUNIT_IDENTITY_LEAD',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body.data.events).toHaveLength(1);
    expect(response.body.data.events[0]).toMatchObject({
      id: 'ambiguity-event-east',
      orgUnitId: TEST_ORG_UNIT_ID,
    });

    const crossOrgUnitResponse = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .query({
        orgUnitId: OTHER_ORG_UNIT_ID,
      })
      .set(buildHeaders({
        role: 'ORGUNIT_IDENTITY_LEAD',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(crossOrgUnitResponse.status).toBe(200);
    expect(crossOrgUnitResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      message: 'Cross-orgUnit context overrides are not allowed for this route',
    });
  });

  it('applies optional status, contact-point, and source-context filters', async () => {
    await createEvent({
      id: 'ambiguity-event-match',
      normalizedContactPoint: '+12605550191',
      sourceContext: 'connectshyft_identity_match',
      status: 'pending',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
      updatedAtUtc: '2026-03-21T12:00:00.000Z',
    });
    await createEvent({
      id: 'ambiguity-event-reviewed',
      normalizedContactPoint: '+12605550191',
      sourceContext: 'connectshyft_identity_match',
      status: 'reviewed',
      createdAtUtc: '2026-03-21T12:01:00.000Z',
      updatedAtUtc: '2026-03-21T12:01:00.000Z',
    });
    await createEvent({
      id: 'ambiguity-event-other-source',
      normalizedContactPoint: '+12605550191',
      sourceContext: 'connectshyft_inbound_subject_resolution',
      status: 'pending',
      createdAtUtc: '2026-03-21T12:02:00.000Z',
      updatedAtUtc: '2026-03-21T12:02:00.000Z',
    });

    const app = buildApp({
      defaultRole: 'ORGUNIT_IDENTITY_LEAD',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .query({
        status: 'pending',
        normalizedContactPoint: '+12605550191',
        sourceContext: 'connectshyft_identity_match',
      })
      .set(buildHeaders({
        role: 'ORGUNIT_IDENTITY_LEAD',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body.data.events).toHaveLength(1);
    expect(response.body.data.events[0]).toMatchObject({
      id: 'ambiguity-event-match',
      normalizedContactPoint: '+12605550191',
      sourceContext: 'connectshyft_identity_match',
      status: 'pending',
    });
  });

  it('caps the read limit and preserves keyset pagination', async () => {
    const baseCreatedAt = Date.parse('2026-03-21T12:00:00.000Z');
    const events = Array.from({ length: 201 }, (_value, index) =>
      createEvent({
        id: `ambiguity-event-${String(index).padStart(3, '0')}`,
        normalizedContactPoint: `+1260555${String(1000 + index).padStart(4, '0')}`,
        sourceContextId: `identity-match:ops-${index}`,
        createdAtUtc: new Date(baseCreatedAt + (index * 1000)).toISOString(),
        updatedAtUtc: new Date(baseCreatedAt + (index * 1000)).toISOString(),
      }));
    await Promise.all(events);

    const app = buildApp();
    const firstPage = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .query({
        limit: '999',
      })
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.events).toHaveLength(200);
    expect(firstPage.body.data.events[0]).toMatchObject({
      id: 'ambiguity-event-200',
      createdAtUtc: new Date(baseCreatedAt + (200 * 1000)).toISOString(),
    });
    expect(firstPage.body.data.events[199]).toMatchObject({
      id: 'ambiguity-event-001',
      createdAtUtc: new Date(baseCreatedAt + 1000).toISOString(),
    });
    expect(firstPage.body.data.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .query({
        limit: '999',
        cursor: firstPage.body.data.nextCursor,
      })
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.events).toHaveLength(1);
    expect(secondPage.body.data.events[0]).toMatchObject({
      id: 'ambiguity-event-000',
      createdAtUtc: new Date(baseCreatedAt).toISOString(),
    });
    expect(secondPage.body.data.nextCursor).toBeNull();
  });

  it('refuses reads for roles without identity-resolution or tenant-privileged access', async () => {
    const app = buildApp({
      defaultRole: 'ORGUNIT_MEMBER',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .set(buildHeaders({
        role: 'ORGUNIT_MEMBER',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_READ_FORBIDDEN',
      message: 'Identity ambiguity access requires an authorized ConnectShyft role.',
    });
  });

  it('marks pending ambiguity events reviewed for tenant-privileged roles', async () => {
    await createEvent({
      id: 'ambiguity-event-review-pending',
      status: 'pending',
      createdAtUtc: '2026-03-21T13:00:00.000Z',
      updatedAtUtc: '2026-03-21T13:00:00.000Z',
    });

    const app = buildApp();
    const response = await request(app)
      .patch('/api/v1/connectshyft/identity-ambiguities/ambiguity-event-review-pending')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        status: 'reviewed',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_REVIEWED',
      data: {
        event: expect.objectContaining({
          id: 'ambiguity-event-review-pending',
          tenantId: TEST_TENANT_ID,
          status: 'reviewed',
        }),
      },
    });
    expect(response.body.data.event.updatedAtUtc).not.toBe('2026-03-21T13:00:00.000Z');
  });

  it('treats repeated reviewed updates as idempotent success', async () => {
    await createEvent({
      id: 'ambiguity-event-review-idempotent',
      status: 'reviewed',
      createdAtUtc: '2026-03-21T13:10:00.000Z',
      updatedAtUtc: '2026-03-21T13:15:00.000Z',
    });

    const app = buildApp();
    const response = await request(app)
      .patch('/api/v1/connectshyft/identity-ambiguities/ambiguity-event-review-idempotent')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        status: 'reviewed',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_REVIEWED',
      data: {
        event: expect.objectContaining({
          id: 'ambiguity-event-review-idempotent',
          status: 'reviewed',
          updatedAtUtc: '2026-03-21T13:15:00.000Z',
        }),
      },
    });
  });

  it('keeps review updates tenant-scoped and returns not found outside the active tenant', async () => {
    await createIdentityAmbiguityEvent({
      id: 'ambiguity-event-other-tenant-review',
      tenantId: OTHER_TENANT_ID,
      orgUnitId: OTHER_ORG_UNIT_ID,
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:ops-other-tenant-review',
      normalizedContactPoint: '+12605550201',
      candidateNeighborIds: ['neighbor-z'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
      status: 'pending',
      requestedByUserId: TEST_USER_ID,
      correlationId: 'corr-connectshyft-identity-ambiguity-ops',
      idempotencyKey: 'identity-match:ops-other-tenant-review',
      createdAtUtc: '2026-03-21T13:20:00.000Z',
      updatedAtUtc: '2026-03-21T13:20:00.000Z',
    });

    const app = buildApp();
    const response = await request(app)
      .patch('/api/v1/connectshyft/identity-ambiguities/ambiguity-event-other-tenant-review')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        status: 'reviewed',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_NOT_FOUND',
      message: 'Identity ambiguity event is unavailable for the active tenant context.',
    });
  });

  it('rejects non-reviewed status payloads', async () => {
    await createEvent({
      id: 'ambiguity-event-invalid-status',
      status: 'pending',
      createdAtUtc: '2026-03-21T13:30:00.000Z',
      updatedAtUtc: '2026-03-21T13:30:00.000Z',
    });

    const app = buildApp();
    const response = await request(app)
      .patch('/api/v1/connectshyft/identity-ambiguities/ambiguity-event-invalid-status')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        status: 'pending',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_STATUS_INVALID',
      message: 'status must be reviewed.',
      data: {
        fieldErrors: [
          {
            field: 'status',
            reason: 'INVALID',
            message: 'status must be reviewed.',
          },
        ],
      },
    });
  });

  it('refuses review updates for roles without tenant-privileged access', async () => {
    await createEvent({
      id: 'ambiguity-event-review-forbidden',
      status: 'pending',
      createdAtUtc: '2026-03-21T13:40:00.000Z',
      updatedAtUtc: '2026-03-21T13:40:00.000Z',
    });

    const app = buildApp({
      defaultRole: 'ORGUNIT_IDENTITY_LEAD',
    });
    const response = await request(app)
      .patch('/api/v1/connectshyft/identity-ambiguities/ambiguity-event-review-forbidden')
      .set(buildHeaders({
        role: 'ORGUNIT_IDENTITY_LEAD',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        status: 'reviewed',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_UPDATE_FORBIDDEN',
      message: 'Identity ambiguity review requires a tenant-privileged ConnectShyft admin role.',
    });
  });

  it('lists only active ambiguity events by default while allowing explicit terminal-status filters', async () => {
    const pending = await createEvent({
      id: 'ambiguity-event-pending-default-list',
      sourceContextId: 'identity-match:pending-default-list',
      createdAtUtc: '2026-03-21T14:00:00.000Z',
      updatedAtUtc: '2026-03-21T14:00:00.000Z',
    });
    await createEvent({
      id: 'ambiguity-event-reviewed-default-list',
      status: 'reviewed',
      sourceContextId: 'identity-match:reviewed-default-list',
      createdAtUtc: '2026-03-21T14:05:00.000Z',
      updatedAtUtc: '2026-03-21T14:05:00.000Z',
    });
    await createEvent({
      id: 'ambiguity-event-resolved-default-list',
      sourceContextId: 'identity-match:resolved-default-list',
      createdAtUtc: '2026-03-21T14:10:00.000Z',
      updatedAtUtc: '2026-03-21T14:10:00.000Z',
    });

    await consumeAmbiguityEventsForResolverOutcome({
      tenantId: TEST_TENANT_ID,
      resolverReviewId: 'review-default-list',
      triggerSourceId: 'identity-match:resolved-default-list',
      outcome: 'resolved',
      consumedByUserId: TEST_USER_ID,
      consumedAtUtc: '2026-03-21T14:15:00.000Z',
      resolverOutcome: {
        reviewId: 'review-default-list',
        action: 'confirm_existing_person',
        reviewStatus: 'resolved_confirmed_existing',
        actorUserId: TEST_USER_ID,
        occurredAtUtc: '2026-03-21T14:15:00.000Z',
        personId: 'person-default-list',
      },
    });

    const app = buildApp();
    const activeResponse = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(activeResponse.status).toBe(200);
    expect(activeResponse.body.data.events).toEqual([
      expect.objectContaining({
        id: pending.id,
        status: 'pending',
      }),
    ]);

    const resolvedResponse = await request(app)
      .get('/api/v1/connectshyft/identity-ambiguities')
      .query({
        status: 'resolved',
      })
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(resolvedResponse.status).toBe(200);
    expect(resolvedResponse.body.data.events).toEqual([
      expect.objectContaining({
        id: 'ambiguity-event-resolved-default-list',
        status: 'resolved',
      }),
    ]);
  });

  it('returns terminal ambiguity detail with resolver-outcome linkage intact', async () => {
    const created = await createEvent({
      id: 'ambiguity-event-detail-terminal',
      sourceContextId: 'identity-match:detail-terminal',
      createdAtUtc: '2026-03-21T14:20:00.000Z',
      updatedAtUtc: '2026-03-21T14:20:00.000Z',
    });

    await consumeAmbiguityEventsForResolverOutcome({
      tenantId: TEST_TENANT_ID,
      resolverReviewId: 'review-detail-terminal',
      triggerSourceId: 'identity-match:detail-terminal',
      outcome: 'dismissed',
      consumedByUserId: TEST_USER_ID,
      consumedAtUtc: '2026-03-21T14:25:00.000Z',
      resolverOutcome: {
        reviewId: 'review-detail-terminal',
        action: 'dismiss_no_action',
        reviewStatus: 'dismissed',
        actorUserId: TEST_USER_ID,
        occurredAtUtc: '2026-03-21T14:25:00.000Z',
        reason: 'No identity change required.',
      },
    });

    const app = buildApp();
    const response = await request(app)
      .get(`/api/v1/connectshyft/identity-ambiguities/${created.id}`)
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_RETRIEVED',
      data: {
        event: {
          id: created.id,
          status: 'dismissed',
          resolverReviewId: 'review-detail-terminal',
          resolverOutcome: {
            action: 'dismiss_no_action',
            reviewStatus: 'dismissed',
          },
        },
      },
    });
  });

  it('delegates resolver decisions to PeopleCore and returns the normalized result envelope', async () => {
    const applySpy = jest.spyOn(peopleCoreServiceAsync, 'applyResolverDecision')
      .mockResolvedValue({
        reviewId: 'review-1',
        status: 'resolved',
        action: 'confirm_existing_person',
        reviewStatus: 'resolved_confirmed_existing',
        resolutionType: 'confirm_existing_person',
        affectedPersonIds: ['person-existing'],
        affectedContactPointIds: ['contact-point-1'],
        ambiguityEventIds: ['ambiguity-event-1'],
        mergeApplied: false,
        rebindTriggered: true,
      });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/resolver-reviews/review-1/decision')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        action: 'confirm_existing_person',
        personId: 'person-existing',
        reason: 'Matched the existing person.',
        ambiguityEventId: 'ambiguity-event-1',
      });

    expect(response.status).toBe(200);
    expect(applySpy).toHaveBeenCalledWith({
      tenantId: TEST_TENANT_ID,
      reviewId: 'review-1',
      actorUserId: TEST_USER_ID,
      action: 'confirm_existing_person',
      reason: 'Matched the existing person.',
      notes: undefined,
      personId: 'person-existing',
      provisionalPersonId: undefined,
      sourcePersonId: undefined,
      targetPersonId: undefined,
      contactPointId: undefined,
      ambiguityEventId: 'ambiguity-event-1',
    });
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_RESOLVER_DECISION_APPLIED',
      data: {
        result: {
          reviewId: 'review-1',
          action: 'confirm_existing_person',
          reviewStatus: 'resolved_confirmed_existing',
          resolutionType: 'confirm_existing_person',
          mergeApplied: false,
          rebindTriggered: true,
        },
      },
    });
  });

  it('maps terminal resolver decisions to a normalized business refusal', async () => {
    jest.spyOn(peopleCoreServiceAsync, 'applyResolverDecision').mockRejectedValue(
      new InvalidResolverReviewTransitionError('Resolver review is already terminal.', [
        {
          field: 'reviewStatus',
          reason: 'INVALID',
          message: 'reviewStatus resolved_confirmed_existing is terminal.',
        },
      ]),
    );

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/resolver-reviews/review-1/decision')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        action: 'dismiss_no_action',
        reason: 'Trying to override a terminal decision.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_RESOLVER_DECISION_TERMINAL',
      refusalType: 'business',
      data: {
        fieldErrors: [
          {
            field: 'reviewStatus',
            reason: 'INVALID',
            message: 'reviewStatus resolved_confirmed_existing is terminal.',
          },
        ],
      },
    });
  });

  it('maps resolver review scope misses to a normalized business refusal', async () => {
    jest.spyOn(peopleCoreServiceAsync, 'applyResolverDecision').mockRejectedValue(
      new PeopleCoreScopeViolationError('Resolver review review-404 is unavailable.'),
    );

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/resolver-reviews/review-404/decision')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        action: 'dismiss_no_action',
        reason: 'No identity change required.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_RESOLVER_REVIEW_NOT_FOUND',
      refusalType: 'business',
      message: 'Resolver review is unavailable for the active tenant context.',
    });
  });

  it('maps resolver validation failures to client refusals', async () => {
    jest.spyOn(peopleCoreServiceAsync, 'applyResolverDecision').mockRejectedValue(
      new ResolverReviewValidationError('personId is required for confirm_existing_person.', [
        {
          field: 'personId',
          reason: 'REQUIRED',
          message: 'personId is required for confirm_existing_person.',
        },
      ]),
    );

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/resolver-reviews/review-1/decision')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
        memberships: [TEST_ORG_UNIT_ID],
      }))
      .send({
        action: 'confirm_existing_person',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_RESOLVER_DECISION_INVALID',
      data: {
        fieldErrors: [
          {
            field: 'personId',
            reason: 'REQUIRED',
            message: 'personId is required for confirm_existing_person.',
          },
        ],
      },
    });
  });
});
