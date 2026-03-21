// @ts-nocheck
import request from 'supertest';
import { AsyncPeopleCoreService } from '../../../peoplecore/service';
import { KnexConnectShyftNeighborStore } from '../../neighbors';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from '../../../../routes/api/v1/__tests__/connectshyft.provider-registry.test.shared';

registerProviderRegistryRouteIntegrationHooks();

describe('connectshyft ops identity visibility route', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('surfaces identity ambiguity when PeopleCore current links disagree with the legacy winner', async () => {
    jest.spyOn(
      AsyncPeopleCoreService.prototype,
      'listContactPointsByNormalizedValue',
    ).mockResolvedValue([
        {
          id: 'contact-point-19',
          tenantId: 'tenant-connectshyft-f1',
          type: 'phone',
          value: '+12605551219',
          normalizedValue: '+12605551219',
          label: 'mobile',
          verificationStatus: 'verified',
          isShared: false,
          status: 'active',
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
      ]);
    jest.spyOn(
      AsyncPeopleCoreService.prototype,
      'listCurrentContactPointLinks',
    ).mockResolvedValue([
        {
          id: 'link-19-a',
          contactPointId: 'contact-point-19',
          subjectType: 'person',
          subjectId: 'person-19-a',
          linkType: 'self',
          confidenceBand: 'high',
          isCurrent: true,
          isPrimary: true,
          manuallyConfirmed: false,
          confirmationSource: undefined,
          firstLinkedAt: '2026-03-21T12:00:00.000Z',
          lastConfirmedAt: undefined,
          lastUsedAt: undefined,
          linkedBy: 'system',
          linkedByUserId: undefined,
          unlinkReason: undefined,
          unlinkedAt: undefined,
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
        {
          id: 'link-19-b',
          contactPointId: 'contact-point-19',
          subjectType: 'person',
          subjectId: 'person-19-b',
          linkType: 'self',
          confidenceBand: 'high',
          isCurrent: true,
          isPrimary: false,
          manuallyConfirmed: false,
          confirmationSource: undefined,
          firstLinkedAt: '2026-03-21T12:00:00.000Z',
          lastConfirmedAt: undefined,
          lastUsedAt: undefined,
          linkedBy: 'system',
          linkedByUserId: undefined,
          unlinkReason: undefined,
          unlinkedAt: undefined,
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
      ]);
    jest.spyOn(
      KnexConnectShyftNeighborStore.prototype,
      'listActiveIdentityBoundaryNeighborsByTenant',
    ).mockResolvedValue([
        {
          neighborId: 'neighbor-legacy-19',
          phones: [
            {
              phoneId: 'phone-19',
              value: '+12605551219',
              isShared: false,
              verificationStatus: 'verified',
            },
          ],
        },
      ]);
    jest.spyOn(
      KnexConnectShyftNeighborStore.prototype,
      'listActiveIdentityBoundaryNeighborsByPhoneValue',
    ).mockResolvedValue([
        {
          neighborId: 'neighbor-legacy-19',
          phones: [
            {
              phoneId: 'phone-19',
              value: '+12605551219',
              isShared: false,
              verificationStatus: 'verified',
            },
          ],
        },
      ]);

    const response = await request(buildApp())
      .get('/api/v1/connectshyft/ops/identity/%2B12605551219')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPS_IDENTITY_VISIBILITY_LOADED',
      data: {
        phone: '+12605551219',
        resolution: 'ambiguous',
        source: 'peoplecore',
        candidates: [
          {
            id: 'neighbor-legacy-19',
            confidence: 1,
          },
        ],
      },
    });
  });

  it('surfaces the no-match path without creating any write-side identity behavior', async () => {
    jest.spyOn(
      AsyncPeopleCoreService.prototype,
      'listContactPointsByNormalizedValue',
    ).mockResolvedValue([]);
    jest.spyOn(
      KnexConnectShyftNeighborStore.prototype,
      'listActiveIdentityBoundaryNeighborsByTenant',
    ).mockResolvedValue([]);
    jest.spyOn(
      KnexConnectShyftNeighborStore.prototype,
      'listActiveIdentityBoundaryNeighborsByPhoneValue',
    ).mockResolvedValue([]);

    const response = await request(buildApp())
      .get('/api/v1/connectshyft/ops/identity/%2B12605559999')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPS_IDENTITY_VISIBILITY_LOADED',
      data: {
        phone: '+12605559999',
        resolution: 'no_match',
        source: 'legacy',
      },
    });
  });
});
