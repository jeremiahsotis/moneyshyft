// @ts-nocheck
import { createHash } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import * as executePlatformMutationModule from '../../../../platform/mutations/executePlatformMutation';
import { connectShyftNeighborServiceAsync } from '../../../../modules/connectshyft/neighbors';
import * as TenantModuleEntitlements from '../../../../platform/tenantModuleEntitlements';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const TEST_ORG_UNIT_ID = '22222222-2222-4222-8222-222222222222';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  app.use((req, _res, next) => {
    const tenantId = req.header('x-test-connectshyft-tenant-id') || TEST_TENANT_ID;
    const orgUnitId = req.header('x-test-connectshyft-orgunit-id') || TEST_ORG_UNIT_ID;
    const role = req.header('x-test-connectshyft-role') || 'ORGUNIT_MEMBER';
    const userId = req.header('x-test-connectshyft-user-id') || 'user-connectshyft-identity-match';

    req.user = {
      userId,
      email: `${userId}@connectshyft.test`,
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId: orgUnitId,
      role,
    };
    req.tenantId = tenantId;
    req.orgUnitId = orgUnitId;
    req.tenantContext = {
      tenantId,
      orgUnitId,
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    };

    next();
  });

  app.use('/api/v1/connectshyft', connectShyftRouter);
  return app;
};

const buildHeaders = (overrides: Record<string, string> = {}): Record<string, string> => ({
  'x-correlation-id': 'corr-connectshyft-identity-match',
  'x-test-connectshyft-flags': JSON.stringify({
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  }),
  'x-test-connectshyft-tenant-id': TEST_TENANT_ID,
  'x-test-connectshyft-orgunit-id': TEST_ORG_UNIT_ID,
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-identity-match',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify([TEST_ORG_UNIT_ID]),
  ...overrides,
});

describe('connectshyft identity-match route', () => {
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

  it('preserves IDENTITY_MATCH_AMBIGUOUS even when audit side-effects cannot persist', async () => {
    const manualResolution = {
      required: true as const,
      reasonCode: 'IDENTITY_MATCH_AMBIGUOUS' as const,
      nextAction: 'manual-merge' as const,
      mergeEndpoint: '/api/v1/connectshyft/neighbors/merge' as const,
      candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
      guidance: 'Multiple identities share this contact point. Resolve manually before any merge.',
    };

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
          manualResolution,
        },
        manualResolution,
        idempotency: {
          key: 'identity-replay-key-ambiguous',
          semantics: 'REPLAY_SAFE',
        },
      },
    });

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
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
        },
        manualResolution: {
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
        },
        idempotency: {
          key: 'identity-replay-key-ambiguous',
          semantics: 'REPLAY_SAFE',
        },
        sideEffectsPersisted: false,
        sideEffectsPersistenceUnavailable: true,
      },
    });
  });

  it('returns ambiguity without selecting a winner when multiple current neighbors share the phone', async () => {
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
            value: '+12605550998',
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
          key: 'identity-replay-key-ambiguous-no-winner',
          semantics: 'REPLAY_SAFE',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/identity-match')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: {
          label: 'mobile',
          value: '(260) 555-0998',
          isShared: false,
          verificationStatus: 'verified',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          matchedNeighborId: null,
          candidateCount: 2,
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
          contactPoint: {
            value: '+12605550998',
          },
        },
        manualResolution: {
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
        },
      },
    });
  });

  it('returns IDENTITY_MATCH_AMBIGUOUS with deterministic manual resolution for PeopleCore disagreement', async () => {
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
            value: '+12605550997',
            isShared: false,
            verificationStatus: 'verified',
          },
          matchedNeighborId: null,
          candidateCount: 1,
          candidateNeighborIds: ['neighbor-legacy-conflict'],
          exactMatches: [
            {
              neighborId: 'neighbor-legacy-conflict',
              phoneId: 'phone-legacy-conflict',
              isShared: false,
              verificationStatus: 'verified',
            },
          ],
          manualResolution: {
            required: true,
            reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
            nextAction: 'manual-merge',
            mergeEndpoint: '/api/v1/connectshyft/neighbors/merge',
            candidateNeighborIds: ['neighbor-legacy-conflict'],
            guidance: 'Multiple identities share this contact point. Resolve manually before any merge.',
          },
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          nextAction: 'manual-merge',
          mergeEndpoint: '/api/v1/connectshyft/neighbors/merge',
          candidateNeighborIds: ['neighbor-legacy-conflict'],
          guidance: 'Multiple identities share this contact point. Resolve manually before any merge.',
        },
        idempotency: {
          key: 'identity-replay-key-peoplecore-disagreement',
          semantics: 'REPLAY_SAFE',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/identity-match')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: {
          label: 'mobile',
          value: '(260) 555-0997',
          isShared: false,
          verificationStatus: 'verified',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          matchedNeighborId: null,
          candidateCount: 1,
          candidateNeighborIds: ['neighbor-legacy-conflict'],
          contactPoint: {
            value: '+12605550997',
          },
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          candidateNeighborIds: ['neighbor-legacy-conflict'],
        },
        idempotency: {
          key: 'identity-replay-key-peoplecore-disagreement',
          semantics: 'REPLAY_SAFE',
        },
      },
    });
  });

  it('records identity-match audit hash as keyed hmac output', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'evaluateIdentityMatch').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE',
      httpStatus: 200,
      data: {
        identityMatch: {
          decision: 'NO_AUTO_MERGE',
          reason: 'MATCH_CONTACT_SHARED',
          autoMergeAllowed: false,
          contactPoint: {
            value: '+12605550123',
            isShared: false,
            verificationStatus: 'verified',
          },
          matchedNeighborId: 'neighbor-a',
          candidateCount: 1,
          candidateNeighborIds: ['neighbor-a'],
          exactMatches: [
            {
              neighborId: 'neighbor-a',
              phoneId: 'phone-a',
              isShared: true,
              verificationStatus: 'verified',
            },
          ],
        },
        idempotency: {
          key: 'identity-replay-key-no-auto-merge',
          semantics: 'REPLAY_SAFE',
        },
      },
    });

    const executeMutationSpy = jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockResolvedValue({
      persisted: true,
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/identity-match')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        contactPoint: {
          label: 'mobile',
          value: '+12605550123',
          isShared: false,
          verificationStatus: 'verified',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE',
      data: {
        idempotency: {
          key: 'identity-replay-key-no-auto-merge',
          semantics: 'REPLAY_SAFE',
        },
        sideEffectsPersisted: true,
        sideEffectsPersistenceUnavailable: false,
      },
    });

    expect(executeMutationSpy).toHaveBeenCalledTimes(1);
    const mutationInput = executeMutationSpy.mock.calls[0]?.[0] as unknown as {
      event: {
        payload: {
          contact_point: {
            value_hash: string;
          };
        };
      };
    };
    const observedHash = mutationInput.event.payload.contact_point.value_hash;
    const unsaltedHash = `sha256:${createHash('sha256').update('+12605550123').digest('hex')}`;

    expect(observedHash).toMatch(/^hmac-sha256:/);
    expect(observedHash).not.toBe(unsaltedHash);
  });

  it('forwards Idempotency-Key header to identity-match evaluation input', async () => {
    const evaluateSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'evaluateIdentityMatch').mockResolvedValue({
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
          key: 'identity-replay-key-header',
          semantics: 'REPLAY_SAFE',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors/identity-match')
      .set(buildHeaders({
        'Idempotency-Key': 'identity-replay-key-header',
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
      data: {
        idempotency: {
          key: 'identity-replay-key-header',
          semantics: 'REPLAY_SAFE',
        },
      },
    });
    expect(evaluateSpy).toHaveBeenCalledWith(expect.objectContaining({
      orgUnitId: TEST_ORG_UNIT_ID,
      idempotencyKey: 'identity-replay-key-header',
      hookContext: expect.objectContaining({
        createResolverReviewOnAmbiguous: true,
        triggerSourceType: 'connectshyft_identity_match',
      }),
    }));
  });

  it('does not expose the identity ambiguity reviewed-status route before the checkpoint 5 implementation lands', async () => {
    const app = buildApp();
    const response = await request(app)
      .patch('/api/v1/connectshyft/identity-ambiguities/ambiguity-event-1')
      .set(buildHeaders())
      .send({
        status: 'reviewed',
      });

    expect(response.status).toBe(404);
  });

});
