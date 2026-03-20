// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TENANT_ID = 'tenant-connectshyft-c5';
const TEST_ORG_UNIT_ID = 'org-connectshyft-c5-east';
const INITIAL_ACTOR_USER_ID = 'user-connectshyft-c5-operator';
const SECOND_ACTOR_USER_ID = 'user-connectshyft-c5-second-operator';
const CLOSE_SUCCESS_THREAD_ID = 'thread-c5-unclaimed-close-characterization-success-1001';
const CLOSE_OWNERSHIP_THREAD_ID = 'thread-c5-unclaimed-close-characterization-ownership-1001';
const NOT_FOUND_THREAD_ID = '33333333-3333-4333-8333-333333333333';

const buildLifecycleHeaders = (
  overrides: Record<string, string> = {},
): Record<string, string> => buildHeaders({
  'x-test-connectshyft-tenant-id': TEST_TENANT_ID,
  'x-test-connectshyft-orgunit-id': TEST_ORG_UNIT_ID,
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': INITIAL_ACTOR_USER_ID,
  'x-test-connectshyft-orgunit-memberships': JSON.stringify([TEST_ORG_UNIT_ID]),
  ...overrides,
});

const buildLifecycleApp = (options: {
  defaultOrgUnitId?: string | null;
  defaultRole?: string;
  defaultUserId?: string;
} = {}) => {
  const {
    defaultOrgUnitId = TEST_ORG_UNIT_ID,
    defaultRole = 'ORGUNIT_MEMBER',
    defaultUserId = INITIAL_ACTOR_USER_ID,
  } = options;

  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  app.use((req, _res, next) => {
    req.user = {
      userId: defaultUserId,
      email: `${defaultUserId}@connectshyft.test`,
      householdId: TEST_TENANT_ID,
      activeTenantId: TEST_TENANT_ID,
      activeOrgUnitId: defaultOrgUnitId ?? undefined,
      role: defaultRole,
    };
    req.tenantId = TEST_TENANT_ID;
    req.orgUnitId = defaultOrgUnitId ?? undefined;
    req.tenantContext = {
      tenantId: TEST_TENANT_ID,
      orgUnitId: defaultOrgUnitId ?? undefined,
      scopeMode: defaultOrgUnitId ? 'ORG_UNIT' : 'TENANT',
      source: 'auth',
    };

    next();
  });

  app.use('/api/v1/connectshyft', connectShyftRouter);
  return app;
};

const postClaim = (
  app: ReturnType<typeof buildApp>,
  threadId: string,
  headers: Record<string, string>,
) => request(app)
  .post(`/api/v1/connectshyft/threads/${threadId}/claim`)
  .set(headers)
  .send({});

const postClose = (
  app: ReturnType<typeof buildApp>,
  threadId: string,
  headers: Record<string, string>,
  body: Record<string, unknown> = {},
) => request(app)
  .post(`/api/v1/connectshyft/threads/${threadId}/close`)
  .set(headers)
  .send(body);

describe('connectshyft thread close route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the current close success envelope and closed thread shape', async () => {
    const app = buildApp();
    await postClaim(
      app,
      CLOSE_SUCCESS_THREAD_ID,
      buildLifecycleHeaders(),
    );

    const response = await postClose(
      app,
      CLOSE_SUCCESS_THREAD_ID,
      buildLifecycleHeaders(),
      {
        reason: 'Resident issue resolved',
        resolution: 'closed_after_follow_up',
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CLOSED',
      message: 'ConnectShyft thread closed',
      data: {
        threadId: CLOSE_SUCCESS_THREAD_ID,
        reason: 'Resident issue resolved',
        resolution: 'closed_after_follow_up',
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
          effectiveRoles: ['ORGUNIT_MEMBER'],
        },
        thread: {
          threadId: CLOSE_SUCCESS_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          neighborId: `neighbor-${CLOSE_SUCCESS_THREAD_ID}`,
          source: 'VOICE',
          state: 'CLOSED',
          lastInboundCsNumberId: '+12605550179',
          preferredOutboundCsNumberId: '+12605550179',
          claimedByUserId: null,
          claimedAtUtc: null,
          closedByUserId: INITIAL_ACTOR_USER_ID,
          closedAtUtc: expect.any(String),
          createdAtUtc: expect.any(String),
          updatedAtUtc: expect.any(String),
          escalation: {
            stage: 0,
            nextEvaluationAtUtc: null,
          },
          escalationStage: 0,
          nextEvaluationAtUtc: null,
        },
        lifecycleEvent: 'connectshyft.thread.closed',
        sideEffectsPersisted: false,
        escalation: null,
        audit: {
          eventName: 'connectshyft.thread.closed',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: INITIAL_ACTOR_USER_ID,
            thread_id: CLOSE_SUCCESS_THREAD_ID,
            prior_state: 'CLAIMED',
            new_state: 'CLOSED',
            action: 'close',
            reason: 'Resident issue resolved',
            resolution: 'closed_after_follow_up',
            thread_reopened_by_user: null,
            lifecycle_lineage: null,
          },
        },
        outbox: {
          eventName: 'connectshyft.thread.closed',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: INITIAL_ACTOR_USER_ID,
            thread_id: CLOSE_SUCCESS_THREAD_ID,
            prior_state: 'CLAIMED',
            new_state: 'CLOSED',
            action: 'close',
            reason: 'Resident issue resolved',
            resolution: 'closed_after_follow_up',
            thread_reopened_by_user: null,
            lifecycle_lineage: null,
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'context',
      'escalation',
      'lifecycleEvent',
      'outbox',
      'reason',
      'resolution',
      'sideEffectsPersisted',
      'thread',
      'threadId',
    ].sort());
    expect(Object.keys(response.body.data.thread).sort()).toEqual([
      'claimedAtUtc',
      'claimedByUserId',
      'closedAtUtc',
      'closedByUserId',
      'createdAtUtc',
      'escalation',
      'escalationStage',
      'lastInboundCsNumberId',
      'neighborId',
      'nextEvaluationAtUtc',
      'orgUnitId',
      'preferredOutboundCsNumberId',
      'source',
      'state',
      'tenantId',
      'threadId',
      'updatedAtUtc',
    ].sort());
    expect(response.body.data.audit).toEqual(response.body.data.outbox);
  });

  it('returns the current ownership-policy refusal when a different non-takeover actor closes the claimed thread', async () => {
    const app = buildApp();
    await postClaim(
      app,
      CLOSE_OWNERSHIP_THREAD_ID,
      buildLifecycleHeaders(),
    );

    const response = await postClose(
      app,
      CLOSE_OWNERSHIP_THREAD_ID,
      buildLifecycleHeaders({
        'x-test-connectshyft-user-id': SECOND_ACTOR_USER_ID,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_OWNERSHIP_REQUIRED',
      message: 'Only the claimed owner or takeover-authorized role may close this thread.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: CLOSE_OWNERSHIP_THREAD_ID,
        priorState: 'CLAIMED',
      },
    });
  });

  it('returns the current thread-not-found refusal for close requests outside the active scope', async () => {
    const app = buildApp();
    const response = await postClose(
      app,
      NOT_FOUND_THREAD_ID,
      buildLifecycleHeaders(),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      message: 'Thread not found for this tenant/orgUnit context.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: NOT_FOUND_THREAD_ID,
      },
    });
  });

  it('returns the current missing-orgUnit refusal for close requests without orgUnit context', async () => {
    const app = buildLifecycleApp({
      defaultOrgUnitId: null,
    });
    const headers = buildLifecycleHeaders();
    delete headers['x-test-connectshyft-orgunit-id'];
    delete headers['x-test-connectshyft-orgunit-memberships'];

    const response = await postClose(
      app,
      CLOSE_SUCCESS_THREAD_ID,
      headers,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      message: 'orgUnit context is required for ConnectShyft orgUnit-scoped routes',
      refusalType: 'business',
    });
  });

  it('returns the current client refusal when close receives a blank threadId param', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/%20/close')
      .set(buildLifecycleHeaders())
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
    });
  });
});
