// @ts-nocheck
import request from 'supertest';
import { AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter } from '../../peoplecoreIdentityAdapter';
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
      AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter.prototype,
      'evaluateIdentityCandidatesForContactPoint',
    ).mockResolvedValue({
      normalizedContactPointValue: '+12605551219',
      peopleCoreAvailable: true,
      peopleCoreContactPoints: [
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
      ],
      peopleCoreCurrentLinks: [
        {
          id: 'link-19-a',
          tenantId: 'tenant-connectshyft-f1',
          contactPointId: 'contact-point-19',
          subjectType: 'person',
          subjectId: 'person-19-a',
          relationshipType: 'self',
          isCurrent: true,
          sourceSystem: 'peoplecore',
          sourceRecordId: null,
          effectiveFrom: '2026-03-21T12:00:00.000Z',
          effectiveTo: null,
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
        {
          id: 'link-19-b',
          tenantId: 'tenant-connectshyft-f1',
          contactPointId: 'contact-point-19',
          subjectType: 'person',
          subjectId: 'person-19-b',
          relationshipType: 'self',
          isCurrent: true,
          sourceSystem: 'peoplecore',
          sourceRecordId: null,
          effectiveFrom: '2026-03-21T12:00:00.000Z',
          effectiveTo: null,
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
      ],
      tenantNeighbors: [
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
      ],
      candidateNeighbors: [
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
      ],
    } as any);

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
      AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter.prototype,
      'evaluateIdentityCandidatesForContactPoint',
    ).mockResolvedValue({
      normalizedContactPointValue: '+12605559999',
      peopleCoreAvailable: false,
      peopleCoreContactPoints: [],
      peopleCoreCurrentLinks: [],
      tenantNeighbors: [],
      candidateNeighbors: [],
    } as any);

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
