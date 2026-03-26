// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import * as readContractsModule from '../../../../modules/connectshyft/readContracts';
import * as threadsModule from '../../../../modules/connectshyft/threads';
import connectShyftRouter from '../connectshyft';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TENANT_ID = 'tenant-connectshyft-c5';
const TEST_ORG_UNIT_ID = 'org-connectshyft-c5-east';
const TEST_ACTOR_USER_ID = 'user-connectshyft-c5-operator';
const UUID_ACTOR_USER_ID = 'f3bb331f-8adb-4664-926b-66e01c1881a7';
const CLAIM_SUCCESS_THREAD_ID = 'thread-c5-unclaimed-claim-characterization-success-1001';
const CLAIM_INVALID_STATE_THREAD_ID = 'thread-c5-unclaimed-claim-characterization-invalid-state-1001';
const CLAIM_UUID_THREAD_ID = 'f3fe1191-f90a-4c7d-82ef-f77ce5dff8ba';
const NOT_FOUND_THREAD_ID = '11111111-1111-4111-8111-111111111111';

const buildLifecycleHeaders = (
  overrides: Record<string, string> = {},
): Record<string, string> => buildHeaders({
  'x-test-connectshyft-tenant-id': TEST_TENANT_ID,
  'x-test-connectshyft-orgunit-id': TEST_ORG_UNIT_ID,
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': TEST_ACTOR_USER_ID,
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
    defaultUserId = TEST_ACTOR_USER_ID,
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
  body: Record<string, unknown> = {},
) => request(app)
  .post(`/api/v1/connectshyft/threads/${threadId}/claim`)
  .set(headers)
  .send(body);

describe('connectshyft thread claim route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the current claim success envelope, lifecycle side-effects, and claimed thread shape', async () => {
    const app = buildApp();
    const response = await postClaim(
      app,
      CLAIM_SUCCESS_THREAD_ID,
      buildLifecycleHeaders(),
      {
        reason: 'Operator accepted ownership',
        resolution: 'needs_follow_up',
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CLAIMED',
      message: 'ConnectShyft claim action accepted',
      data: {
        threadId: CLAIM_SUCCESS_THREAD_ID,
        reason: 'Operator accepted ownership',
        resolution: 'needs_follow_up',
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
          effectiveRoles: ['ORGUNIT_MEMBER'],
        },
        thread: {
          threadId: CLAIM_SUCCESS_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          neighborId: `neighbor-${CLAIM_SUCCESS_THREAD_ID}`,
          source: 'VOICE',
          state: 'CLAIMED',
          lastInboundCsNumberId: '+12605550179',
          preferredOutboundCsNumberId: '+12605550179',
          claimedByUserId: TEST_ACTOR_USER_ID,
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
        lifecycleEvent: 'connectshyft.thread.claimed',
        sideEffectsPersisted: false,
        escalation: {
          resetReason: 'claimed',
          notificationsCanceled: 0,
        },
        audit: {
          eventName: 'connectshyft.thread.claimed',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_ACTOR_USER_ID,
            thread_id: CLAIM_SUCCESS_THREAD_ID,
            prior_state: 'UNCLAIMED',
            new_state: 'CLAIMED',
            action: 'claim',
            reason: 'Operator accepted ownership',
            resolution: 'needs_follow_up',
            thread_reopened_by_user: null,
            lifecycle_lineage: null,
          },
        },
        outbox: {
          eventName: 'connectshyft.thread.claimed',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_ACTOR_USER_ID,
            thread_id: CLAIM_SUCCESS_THREAD_ID,
            prior_state: 'UNCLAIMED',
            new_state: 'CLAIMED',
            action: 'claim',
            reason: 'Operator accepted ownership',
            resolution: 'needs_follow_up',
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
    expect(Object.keys(response.body.data.context).sort()).toEqual([
      'bypassedOrgUnitMembership',
      'effectiveRoles',
      'orgUnitId',
      'tenantId',
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

  it('routes UUID-backed claim requests through the async thread transition write path', async () => {
    const app = buildApp();
    const detailSpy = jest.spyOn(
      readContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue({
      threadId: CLAIM_UUID_THREAD_ID,
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      state: 'UNCLAIMED',
      claimedByUserId: null,
      claimed_by_user_id: null,
    } as any);
    const transitionSpy = jest.spyOn(
      threadsModule.connectShyftThreadServiceAsync,
      'transitionThreadState',
    ).mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_TRANSITIONED',
      httpStatus: 200,
      data: {
        thread: {
          threadId: CLAIM_UUID_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          neighborId: `neighbor-${CLAIM_UUID_THREAD_ID}`,
          source: 'VOICE',
          state: 'CLAIMED',
          lastInboundCsNumberId: '+12605550179',
          preferredOutboundCsNumberId: '+12605550179',
          claimedByUserId: UUID_ACTOR_USER_ID,
          claimedAtUtc: '2026-03-26T12:00:00.000Z',
          closedByUserId: null,
          closedAtUtc: null,
          createdAtUtc: '2026-03-25T12:00:00.000Z',
          updatedAtUtc: '2026-03-26T12:00:00.000Z',
          escalation: {
            stage: 0,
            nextEvaluationAtUtc: null,
          },
        },
      },
    } as any);

    const response = await postClaim(
      app,
      CLAIM_UUID_THREAD_ID,
      buildLifecycleHeaders({
        'x-test-connectshyft-user-id': UUID_ACTOR_USER_ID,
      }),
      {
        reason: 'Operator accepted ownership',
        resolution: 'needs_follow_up',
      },
    );

    expect(response.status).toBe(200);
    expect(detailSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: CLAIM_UUID_THREAD_ID,
      actorUserId: UUID_ACTOR_USER_ID,
    }));
    expect(transitionSpy).toHaveBeenCalledWith({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: TEST_TENANT_ID,
      threadId: CLAIM_UUID_THREAD_ID,
      nextState: 'CLAIMED',
      actorUserId: UUID_ACTOR_USER_ID,
    });
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CLAIMED',
      message: 'ConnectShyft claim action accepted',
      data: {
        threadId: CLAIM_UUID_THREAD_ID,
        sideEffectsPersisted: false,
        thread: {
          threadId: CLAIM_UUID_THREAD_ID,
          state: 'CLAIMED',
          claimedByUserId: UUID_ACTOR_USER_ID,
          claimedAtUtc: '2026-03-26T12:00:00.000Z',
        },
        audit: {
          eventName: 'connectshyft.thread.claimed',
          metadata: expect.objectContaining({
            actor_user_id: UUID_ACTOR_USER_ID,
            thread_id: CLAIM_UUID_THREAD_ID,
            new_state: 'CLAIMED',
            action: 'claim',
          }),
        },
      },
    });
  });

  it('returns the current invalid-state refusal when claim is retried on an already claimed thread', async () => {
    const app = buildApp();

    await postClaim(
      app,
      CLAIM_INVALID_STATE_THREAD_ID,
      buildLifecycleHeaders(),
      {
        reason: 'Initial owner assignment',
      },
    );

    const response = await postClaim(
      app,
      CLAIM_INVALID_STATE_THREAD_ID,
      buildLifecycleHeaders(),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
      message: 'Lifecycle action "claim" is invalid from state CLAIMED.',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        threadId: CLAIM_INVALID_STATE_THREAD_ID,
        priorState: 'CLAIMED',
      },
    });
  });

  it('returns the current thread-not-found refusal for a claim outside the current tenant and orgUnit scope', async () => {
    const app = buildApp();
    const response = await postClaim(
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

  it('returns the current orgUnit-membership refusal before claim evaluation', async () => {
    const app = buildApp();
    const response = await postClaim(
      app,
      CLAIM_SUCCESS_THREAD_ID,
      buildLifecycleHeaders({
        'x-test-connectshyft-orgunit-memberships': JSON.stringify([]),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
      message: 'orgUnit membership is required for this ConnectShyft route',
      refusalType: 'business',
    });
  });

  it('returns the current claim capability refusal for roles without claim access', async () => {
    const app = buildApp();
    const response = await postClaim(
      app,
      CLAIM_SUCCESS_THREAD_ID,
      buildLifecycleHeaders({
        'x-test-connectshyft-role': 'ORGUNIT_IDENTITY_LEAD',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
      message: 'Thread claim requires an authorized orgUnit role.',
      refusalType: 'business',
    });
  });

  it('returns the current missing-orgUnit refusal for claim requests without orgUnit context', async () => {
    const app = buildLifecycleApp({
      defaultOrgUnitId: null,
    });
    const headers = buildLifecycleHeaders();
    delete headers['x-test-connectshyft-orgunit-id'];
    delete headers['x-test-connectshyft-orgunit-memberships'];

    const response = await postClaim(
      app,
      CLAIM_SUCCESS_THREAD_ID,
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

  it('returns the current client refusal when claim receives a blank threadId param', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/%20/claim')
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
