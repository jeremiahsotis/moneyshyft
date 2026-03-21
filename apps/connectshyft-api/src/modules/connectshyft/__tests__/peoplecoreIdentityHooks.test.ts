import { ConnectShyftPeopleCoreIdentityHooks } from '../peoplecoreIdentityHooks';

const TIMESTAMP = '2026-03-21T12:00:00.000Z';

const buildContactPoint = (contactPointId: string, normalizedValue: string) => ({
  id: contactPointId,
  tenantId: 'tenant-a',
  type: 'phone' as const,
  normalizedValue,
  status: 'active_personal' as const,
  firstSeenAt: TIMESTAMP,
  lastSeenAt: TIMESTAMP,
  suspectedShared: false,
  confirmedShared: false,
  reassignmentSuspected: false,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
});

const buildContactPointLink = (contactPointId: string, subjectId: string) => ({
  id: `${contactPointId}-${subjectId}-link`,
  contactPointId,
  subjectType: 'person' as const,
  subjectId,
  linkType: 'primary' as const,
  confidenceBand: 'high' as const,
  isCurrent: true,
  isPrimary: true,
  manuallyConfirmed: false,
  firstLinkedAt: TIMESTAMP,
  linkedBy: 'system' as const,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
});

describe('connectshyft peoplecore identity hooks', () => {
  it('creates a tenant-scoped provisional person foundation when no PeopleCore person link exists', async () => {
    const service = {
      listContactPointsByNormalizedValue: jest.fn(async () => []),
      listCurrentContactPointLinks: jest.fn(async () => []),
      createContactPoint: jest.fn(async () => buildContactPoint('contact-point-1', '+12605551230')),
      createPerson: jest.fn(async () => ({
        id: 'person-1',
        tenantId: 'tenant-a',
        orgUnitId: 'org-a',
        firstName: 'Unknown',
        lastName: 'Contact',
        status: 'active_provisional',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      })),
      createContactPointLink: jest.fn(async () => ({
        id: 'link-1',
        contactPointId: 'contact-point-1',
        subjectType: 'person',
        subjectId: 'person-1',
        linkType: 'unknown',
        confidenceBand: 'low',
        isCurrent: true,
        isPrimary: true,
        manuallyConfirmed: false,
        firstLinkedAt: TIMESTAMP,
        linkedBy: 'system',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      })),
      listResolverReviews: jest.fn(async () => []),
      createResolverReview: jest.fn(),
    };
    const hooks = new ConnectShyftPeopleCoreIdentityHooks(service as any);

    const result = await hooks.createProvisionalPersonHook({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      normalizedContactPointValue: '+12605551230',
      rawContactPointValue: '(260) 555-1230',
    });

    expect(result).toEqual({
      created: true,
      personId: 'person-1',
      contactPointId: 'contact-point-1',
      linkId: 'link-1',
    });
    expect(service.createPerson).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      status: 'active_provisional',
    }));
    expect(service.createContactPoint).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      normalizedValue: '+12605551230',
      rawValue: '(260) 555-1230',
    }));
  });

  it('creates an org-unit-scoped resolver review with PeopleCore candidate people', async () => {
    const service = {
      listContactPointsByNormalizedValue: jest.fn(async () => [
        buildContactPoint('contact-point-2', '+12605551231'),
      ]),
      listCurrentContactPointLinks: jest.fn(async () => [
        buildContactPointLink('contact-point-2', 'person-2'),
        buildContactPointLink('contact-point-2', 'person-1'),
      ]),
      listResolverReviews: jest.fn(async () => []),
      createResolverReview: jest.fn(async () => ({
        id: 'review-1',
        tenantId: 'tenant-a',
        orgUnitId: 'org-a',
        reviewType: 'shared_contact_ambiguity',
        reviewStatus: 'pending',
        priority: 'high',
        triggerSourceType: 'connectshyft_identity_match',
        triggerSourceId: 'identity-match-123',
        candidatePersonIds: ['person-1', 'person-2'],
        contactPointId: 'contact-point-2',
        confidenceBand: 'high',
        confidenceReasons: ['Multiple exact contact-point matches require resolver review.'],
        riskFlags: ['shared_contact_possible'],
        requestedByUserId: 'user-1',
        requestedAt: TIMESTAMP,
      })),
      createContactPoint: jest.fn(),
      createPerson: jest.fn(),
      createContactPointLink: jest.fn(),
    };
    const hooks = new ConnectShyftPeopleCoreIdentityHooks(service as any);

    const result = await hooks.createResolverReviewHook({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      normalizedContactPointValue: '+12605551231',
      hookContext: {
        triggerSourceType: 'connectshyft_identity_match',
        triggerSourceId: 'identity-match-123',
        requestedByUserId: 'user-1',
      },
    });

    expect(result).toEqual({
      created: true,
      reviewId: 'review-1',
      contactPointId: 'contact-point-2',
    });
    expect(service.listResolverReviews).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
    });
    expect(service.createResolverReview).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      triggerSourceType: 'connectshyft_identity_match',
      triggerSourceId: 'identity-match-123',
      candidatePersonIds: ['person-1', 'person-2'],
      contactPointId: 'contact-point-2',
      requestedByUserId: 'user-1',
    }));
  });
});
