import type { ResolverReview } from '../../src/people';

describe('resolver review contracts', () => {
  it('supports a first-class resolver review object', () => {
    const review: ResolverReview = {
      id: 'rr_1',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      reviewType: 'identity_conflict',
      reviewStatus: 'pending',
      priority: 'normal',
      triggerSourceType: 'conversation',
      triggerSourceId: 'conv_1',
      candidatePersonIds: ['person_1', 'person_2'],
      confidenceBand: 'very_high',
      confidenceReasons: ['Exact phone + DOB'],
      riskFlags: ['high_confidence_override_attempt'],
      requestedByUserId: 'user_1',
      requestedAt: new Date().toISOString(),
    };

    expect(review.reviewType).toBe('identity_conflict');
  });
});
