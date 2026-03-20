// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as TenantModuleEntitlements from '../../../../platform/tenantModuleEntitlements';
import * as executePlatformMutationModule from '../../../../platform/mutations/executePlatformMutation';
import {
  AsyncConnectShyftNeighborService,
  connectShyftNeighborServiceAsync,
} from '../../../../modules/connectshyft/neighbors';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const TEST_ORG_UNIT_ID = '22222222-2222-4222-8222-222222222222';
const TEST_USER_ID = '33333333-3333-4333-8333-333333333333';
const SOURCE_NEIGHBOR_ID = '44444444-4444-4444-8444-444444444444';
const SURVIVOR_NEIGHBOR_ID = '55555555-5555-4555-8555-555555555555';
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
  idempotencyKey?: string | undefined;
};

const buildApp = (options: HarnessOptions = {}) => {
  const {
    defaultTenantId = TEST_TENANT_ID,
    defaultOrgUnitId = TEST_ORG_UNIT_ID,
    defaultRole = 'ORGUNIT_MEMBER',
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
    : 'ORGUNIT_MEMBER';
  const userId = Object.prototype.hasOwnProperty.call(options, 'userId')
    ? options.userId
    : TEST_USER_ID;
  const memberships = Object.prototype.hasOwnProperty.call(options, 'memberships')
    ? options.memberships
    : (orgUnitId ? [orgUnitId] : undefined);
  const correlationId = Object.prototype.hasOwnProperty.call(options, 'correlationId')
    ? options.correlationId
    : 'corr-connectshyft-neighbor-identity-merge-characterization';
  const flags = Object.prototype.hasOwnProperty.call(options, 'flags')
    ? options.flags
    : CONNECTSHYFT_TEST_FLAGS;
  const idempotencyKey = Object.prototype.hasOwnProperty.call(options, 'idempotencyKey')
    ? options.idempotencyKey
    : undefined;

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

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  return headers;
};

const buildNeighbor = (overrides: Record<string, unknown> = {}) => ({
  neighborId: SURVIVOR_NEIGHBOR_ID,
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  firstName: 'Survivor',
  lastName: 'Neighbor',
  prefersTexting: 'YES',
  isDeleted: false,
  deletedAtUtc: null,
  deletedByUserId: null,
  phones: [
    {
      phoneId: '66666666-6666-4666-8666-666666666666',
      label: 'mobile',
      value: '+12605550199',
      rawInput: '+1 (260) 555-0199',
      displayNational: '(260) 555-0199',
      countryCode: '1',
      nationalNumber: '2605550199',
      extension: null,
      validationStatus: 'valid',
      usageType: 'personal',
      source: 'user_entered',
      sortOrder: 0,
      isPrimary: true,
      isShared: false,
      verificationStatus: 'verified',
      isActive: true,
      createdAtUtc: '2026-03-18T12:00:00.000Z',
      updatedAtUtc: '2026-03-18T12:00:00.000Z',
    },
  ],
  createdAtUtc: '2026-03-18T12:00:00.000Z',
  updatedAtUtc: '2026-03-18T12:00:00.000Z',
  ...overrides,
});

describe('connectshyft neighbor identity-match and merge route characterization', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousConnectShyftEnabled = process.env.CONNECTSHYFT_ENABLED;
  const previousConnectShyftInboxEnabled = process.env.CONNECTSHYFT_INBOX_ENABLED;
  const previousConnectShyftEscalationEnabled = process.env.CONNECTSHYFT_ESCALATION_ENABLED;
  const previousConnectShyftWebhooksEnabled = process.env.CONNECTSHYFT_WEBHOOKS_ENABLED;
  let entitlementSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    process.env.CONNECTSHYFT_ENABLED = 'true';
    process.env.CONNECTSHYFT_INBOX_ENABLED = 'true';
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = 'true';
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = 'true';
    entitlementSpy = jest.spyOn(TenantModuleEntitlements, 'evaluateActorTenantModuleEntitlement').mockResolvedValue({
      tenantId: TEST_TENANT_ID,
      moduleKey: 'connectshyft',
      enabled: true,
      reason: 'enabled',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_ENABLED',
      message: 'ConnectShyft entitlement enabled for tests.',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    entitlementSpy = jest.spyOn(TenantModuleEntitlements, 'evaluateActorTenantModuleEntitlement').mockResolvedValue({
      tenantId: TEST_TENANT_ID,
      moduleKey: 'connectshyft',
      enabled: true,
      reason: 'enabled',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_ENABLED',
      message: 'ConnectShyft entitlement enabled for tests.',
    });
  });

  afterAll(() => {
    entitlementSpy.mockRestore();
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
  });

  it('returns the current auto-merge-allowed identity-match success envelope', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'evaluateIdentityMatch').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      httpStatus: 200,
      data: {
        identityMatch: {
          decision: 'AUTO_MERGE_ALLOWED',
          reason: 'VERIFIED_NON_SHARED_EXACT_CONTACT_POINT',
          autoMergeAllowed: true,
          contactPoint: {
            value: '+12605550199',
            isShared: false,
            verificationStatus: 'verified',
          },
          matchedNeighborId: SURVIVOR_NEIGHBOR_ID,
          candidateCount: 1,
          candidateNeighborIds: [SURVIVOR_NEIGHBOR_ID],
          exactMatches: [
            {
              neighborId: SURVIVOR_NEIGHBOR_ID,
              phoneId: '66666666-6666-4666-8666-666666666666',
              isShared: false,
              verificationStatus: 'verified',
            },
          ],
        },
        idempotency: {
          key: 'identity-replay-key-auto-merge',
          semantics: 'REPLAY_SAFE',
        },
      },
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockResolvedValue({
      persisted: true,
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/identity-match')
      .set(buildHeaders({
        idempotencyKey: 'identity-replay-key-auto-merge',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: {
          label: 'mobile',
          value: '+1 (260) 555-0199',
          isShared: false,
          verificationStatus: 'verified',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      message: 'Identity match permits auto-merge.',
      data: {
        identityMatch: {
          decision: 'AUTO_MERGE_ALLOWED',
          autoMergeAllowed: true,
          matchedNeighborId: SURVIVOR_NEIGHBOR_ID,
        },
        idempotency: {
          key: 'identity-replay-key-auto-merge',
          semantics: 'REPLAY_SAFE',
        },
        sideEffectsPersisted: true,
        sideEffectsPersistenceUnavailable: false,
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'identityMatch',
      'idempotency',
      'scope',
      'sideEffectsPersisted',
      'sideEffectsPersistenceUnavailable',
    ].sort());
  });

  it('returns the current no-match identity-match success envelope', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'evaluateIdentityMatch').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH',
      httpStatus: 200,
      data: {
        identityMatch: {
          decision: 'NO_AUTO_MERGE',
          reason: 'NO_EXACT_CONTACT_POINT_MATCH',
          autoMergeAllowed: false,
          contactPoint: {
            value: '+12605550111',
            isShared: false,
            verificationStatus: 'verified',
          },
          matchedNeighborId: null,
          candidateCount: 0,
          candidateNeighborIds: [],
          exactMatches: [],
        },
        idempotency: {
          key: 'identity-replay-key-no-match',
          semantics: 'REPLAY_SAFE',
        },
      },
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockResolvedValue({
      persisted: true,
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/identity-match')
      .set(buildHeaders({
        idempotencyKey: 'identity-replay-key-no-match',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: {
          label: 'mobile',
          value: '+12605550111',
          isShared: false,
          verificationStatus: 'verified',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH',
      message: 'No exact identity matches found.',
      data: {
        identityMatch: {
          decision: 'NO_AUTO_MERGE',
          matchedNeighborId: null,
          candidateCount: 0,
        },
        idempotency: {
          key: 'identity-replay-key-no-match',
          semantics: 'REPLAY_SAFE',
        },
        sideEffectsPersisted: true,
        sideEffectsPersistenceUnavailable: false,
      },
    });
  });

  it('returns the current ambiguous identity-match refusal envelope', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'evaluateIdentityMatch').mockResolvedValue({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      message: 'Identity match is ambiguous and requires manual resolution.',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          reason: 'MULTIPLE_EXACT_CONTACT_POINT_MATCHES',
          autoMergeAllowed: false,
          contactPoint: {
            value: '+12605550999',
            isShared: false,
            verificationStatus: 'verified',
          },
          matchedNeighborId: null,
          candidateCount: 2,
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
          exactMatches: [
            {
              neighborId: 'neighbor-a',
              phoneId: 'phone-a',
              isShared: false,
              verificationStatus: 'verified',
            },
            {
              neighborId: 'neighbor-b',
              phoneId: 'phone-b',
              isShared: false,
              verificationStatus: 'verified',
            },
          ],
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          nextAction: 'manual-merge',
          mergeEndpoint: '/api/v1/connectshyft/neighbors/merge',
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
          guidance: 'Multiple identities share this contact point. Resolve manually before any merge.',
        },
        idempotency: {
          key: 'identity-replay-key-ambiguous',
          semantics: 'REPLAY_SAFE',
        },
      },
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockRejectedValue(
      new Error('audit persistence unavailable'),
    );

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/identity-match')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: {
          label: 'mobile',
          value: '+12605550999',
          isShared: false,
          verificationStatus: 'verified',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      message: 'Identity match is ambiguous and requires manual resolution.',
      refusalType: 'business',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          candidateCount: 2,
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
        },
        manualResolution: {
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
        },
        idempotency: {
          key: 'identity-replay-key-ambiguous',
          semantics: 'REPLAY_SAFE',
        },
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
        sideEffectsPersisted: false,
        sideEffectsPersistenceUnavailable: true,
      },
    });
  });

  it('returns the current merge success envelope and side-effect provenance', async () => {
    jest.spyOn(AsyncConnectShyftNeighborService.prototype, 'mergeNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
      httpStatus: 200,
      data: {
        merge: {
          sourceNeighborId: SOURCE_NEIGHBOR_ID,
          survivorNeighborId: SURVIVOR_NEIGHBOR_ID,
          irreversibleConfirmed: true,
        },
        neighbor: buildNeighbor(),
      },
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockImplementation(
      async (input: { mutation: (trx: unknown) => Promise<unknown> }) => input.mutation({}),
    );

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/merge')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        sourceNeighborId: SOURCE_NEIGHBOR_ID,
        survivorNeighborId: SURVIVOR_NEIGHBOR_ID,
        irreversibleConfirmation: {
          acknowledged: true,
          phrase: 'IRREVERSIBLE MERGE',
        },
        reason: 'duplicate-identity',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
      message: 'Neighbor merge complete',
      data: {
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
        merge: {
          sourceNeighborId: SOURCE_NEIGHBOR_ID,
          survivorNeighborId: SURVIVOR_NEIGHBOR_ID,
          irreversibleConfirmed: true,
        },
        audit: {
          eventName: 'connectshyft.neighbor.merged',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_USER_ID,
            before_neighbor_id: SOURCE_NEIGHBOR_ID,
            after_neighbor_id: SURVIVOR_NEIGHBOR_ID,
            reason: 'duplicate-identity',
          },
        },
        outbox: {
          eventName: 'connectshyft.neighbor.merged',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_USER_ID,
            before_neighbor_id: SOURCE_NEIGHBOR_ID,
            after_neighbor_id: SURVIVOR_NEIGHBOR_ID,
            reason: 'duplicate-identity',
          },
        },
        sideEffectsPersisted: true,
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'merge',
      'outbox',
      'scope',
      'sideEffectsPersisted',
    ].sort());
  });

  it('returns the current merge-confirmation refusal envelope', async () => {
    jest.spyOn(AsyncConnectShyftNeighborService.prototype, 'mergeNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED',
      message: 'Neighbor merge requires explicit irreversible confirmation.',
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockImplementation(
      async (input: { mutation: (trx: unknown) => Promise<unknown> }) => input.mutation({}),
    );

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/merge')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        sourceNeighborId: SOURCE_NEIGHBOR_ID,
        survivorNeighborId: SURVIVOR_NEIGHBOR_ID,
        irreversibleConfirmation: {
          acknowledged: true,
          phrase: ' irreversible merge ',
        },
        reason: 'duplicate-identity',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED',
      message: 'Neighbor merge requires explicit irreversible confirmation.',
      refusalType: 'business',
      data: {
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
  });

  it('returns the current merge invalid-request refusal before merge logic runs', async () => {
    const mergeSpy = jest.spyOn(AsyncConnectShyftNeighborService.prototype, 'mergeNeighbor');

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/merge')
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        sourceNeighborId: '',
        survivorNeighborId: SURVIVOR_NEIGHBOR_ID,
        irreversibleConfirmation: {
          acknowledged: true,
          phrase: 'IRREVERSIBLE MERGE',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_INVALID',
      message: 'sourceNeighborId and survivorNeighborId are required.',
      refusalType: 'client',
    });
    expect(mergeSpy).not.toHaveBeenCalled();
  });
});
