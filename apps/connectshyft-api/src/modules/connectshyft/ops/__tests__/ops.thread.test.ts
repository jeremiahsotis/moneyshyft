// @ts-nocheck
import request from 'supertest';
import { AsyncConnectShyftThreadService } from '../../threads';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from '../../../../routes/api/v1/__tests__/connectshyft.provider-registry.test.shared';

registerProviderRegistryRouteIntegrationHooks();

describe('connectshyft ops thread visibility route', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('surfaces a found thread through the read-only thread store seam', async () => {
    jest.spyOn(
      AsyncConnectShyftThreadService.prototype,
      'findThreadById',
    ).mockResolvedValue({
      threadId: 'thread-ops-1001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      neighborId: 'neighbor-connectshyft-f1-1001',
      source: 'VOICE',
      state: 'CLAIMED',
      lastInboundCsNumberId: 'cs-number-1001',
      preferredOutboundCsNumberId: 'cs-number-2001',
      claimedByUserId: 'user-connectshyft-f1-operator',
      claimedAtUtc: '2026-03-21T12:00:00.000Z',
      closedByUserId: null,
      closedAtUtc: null,
      createdAtUtc: '2026-03-21T11:55:00.000Z',
      updatedAtUtc: '2026-03-21T12:05:00.000Z',
      escalation: {
        stage: 1,
        nextEvaluationAtUtc: '2026-03-22T12:05:00.000Z',
      },
    });

    const response = await request(buildApp())
      .get('/api/v1/connectshyft/ops/threads/thread-ops-1001')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPS_THREAD_VISIBILITY_LOADED',
      data: {
        threadId: 'thread-ops-1001',
        found: true,
        thread: {
          threadId: 'thread-ops-1001',
          state: 'CLAIMED',
          neighborId: 'neighbor-connectshyft-f1-1001',
        },
      },
    });
  });

  it('surfaces not-found without introducing any thread mutation path', async () => {
    jest.spyOn(
      AsyncConnectShyftThreadService.prototype,
      'findThreadById',
    ).mockResolvedValue(null);

    const response = await request(buildApp())
      .get('/api/v1/connectshyft/ops/threads/thread-ops-missing')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_OPS_THREAD_NOT_FOUND',
      message: 'Thread visibility is unavailable for the requested orgUnit context.',
      refusalType: 'business',
      data: {
        threadId: 'thread-ops-missing',
        orgUnitId: 'org-connectshyft-f1-east',
      },
    });
  });
});
