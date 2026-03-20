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
const TAKEOVER_ACTOR_USER_ID = 'user-connectshyft-c5-admin';
const TAKEOVER_SUCCESS_THREAD_ID = 'thread-c5-unclaimed-takeover-characterization-success-1001';
const TAKEOVER_INVALID_STATE_THREAD_ID = 'thread-c5-unclaimed-takeover-characterization-invalid-state-1001';
const NOT_FOUND_THREAD_ID = '22222222-2222-4222-8222-222222222222';

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

const postTakeover = (
  app: ReturnType<typeof buildApp>,
  threadId: string,
  headers: Record<string, string>,
  body: Record<string, unknown> = {},
) => request(app)
  .post(`/api/v1/connectshyft/threads/${threadId}/takeover`)
  .set(headers)
  .send(body);

const postClaim = (
  app: ReturnType<typeof buildApp>,
  threadId: string,
  headers: Record<string, string>,
) => request(app)
  .post(`/api/v1/connectshyft/threads/${threadId}/claim`)
  .set(headers)
  .send({});

describe('connectshyft thread takeover route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the current takeover success envelope and preserves the claimed lifecycle surface', async () => {
    const app = buildApp();
    await postClaim(
      app,
      TAKEOVER_SUCCESS_THREAD_ID,
      buildLifecycleHeaders(),
    );

    const response = await postTakeover(
      app,
      TAKEOVER_SUCCESS_THREAD_ID,
      buildLifecycleHeaders({
        'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
        'x-test-connectshyft-user-id': TAKEOVER_ACTOR_USER_ID,
      }),
      {
        reason: 'Escalation handoff',
        resolution: 'swap_owner',
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_TAKEOVER_READY',
      message: 'ConnectShyft takeover action accepted',
      data: {
        threadId: TAKEOVER_SUCCESS_THREAD_ID,
        reason: 'Escalation handoff',
        resolution: 'swap_owner',
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
          effectiveRoles: ['ORGUNIT_ADMIN'],
        },
        thread: {
          threadId: TAKEOVER_SUCCESS_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          neighborId: `neighbor-${TAKEOVER_SUCCESS_THREAD_ID}`,
          source: 'VOICE',
          state: 'CLAIMED',
          lastInboundCsNumberId: '+12605550179',
          preferredOutboundCsNumberId: '+12605550179',
          claimedByUserId: TAKEOVER_ACTOR_USER_ID,
          claimedAtUtc: expect.any(String),
          closedByUserId: null,
          closedAtUtc: null,
          createdAtUtc: expect.any(String),
          updatedAtUtc: expect.any(String),
          escalation: {
            stage: 0,
            nextEvaluationAtUtc: null,
          },
          escalationStage: 0,
          nextEvaluationAtUtc: null,
        },
        lifecycleEvent: 'connectshyft.thread.taken_over',
        sideEffectsPersisted: false,
        escalation: null,
        audit: {
          eventName: 'connectshyft.thread.taken_over',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TAKEOVER_ACTOR_USER_ID,
            thread_id: TAKEOVER_SUCCESS_THREAD_ID,
            prior_state: 'CLAIMED',
            new_state: 'CLAIMED',
            action: 'takeover',
            reason: 'Escalation handoff',
            resolution: 'swap_owner',
            thread_reopened_by_user: null,
            lifecycle_lineage: null,
          },
        },
        outbox: {
          eventName: 'connectshyft.thread.taken_over',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TAKEOVER_ACTOR_USER_ID,
            thread_id: TAKEOVER_SUCCESS_THREAD_ID,
            prior_state: 'CLAIMED',
            new_state: 'CLAIMED',
            action: 'takeover',
            reason: 'Escalation handoff',
            resolution: 'swap_owner',
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

  it('returns the current policy refusal when takeover is attempted from an unclaimed state', async () => {
    const app = buildApp();
    const response = await postTakeover(
      app,
      TAKEOVER_INVALID_STATE_THREAD_ID,
      buildLifecycleHeaders({
        'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
        'x-test-connectshyft-user-id': TAKEOVER_ACTOR_USER_ID,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
      message: 'Lifecycle action "takeover" is invalid from state UNCLAIMED.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: TAKEOVER_INVALID_STATE_THREAD_ID,
        priorState: 'UNCLAIMED',
      },
    });
  });

  it('returns the current thread-not-found refusal for takeover requests outside the active scope', async () => {
    const app = buildApp();
    const response = await postTakeover(
      app,
      NOT_FOUND_THREAD_ID,
      buildLifecycleHeaders({
        'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
        'x-test-connectshyft-user-id': TAKEOVER_ACTOR_USER_ID,
      }),
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

  it('returns the current missing-orgUnit refusal for takeover requests without orgUnit context', async () => {
    const app = buildLifecycleApp({
      defaultOrgUnitId: null,
      defaultRole: 'ORGUNIT_ADMIN',
      defaultUserId: TAKEOVER_ACTOR_USER_ID,
    });
    const headers = buildLifecycleHeaders({
      'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
      'x-test-connectshyft-user-id': TAKEOVER_ACTOR_USER_ID,
    });
    delete headers['x-test-connectshyft-orgunit-id'];
    delete headers['x-test-connectshyft-orgunit-memberships'];

    const response = await postTakeover(
      app,
      TAKEOVER_SUCCESS_THREAD_ID,
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

  it('returns the current client refusal when takeover receives a blank threadId param', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/%20/takeover')
      .set(buildLifecycleHeaders({
        'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
        'x-test-connectshyft-user-id': TAKEOVER_ACTOR_USER_ID,
      }))
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
