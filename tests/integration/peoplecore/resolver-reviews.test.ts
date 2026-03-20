import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('peoplecore resolver reviews', () => {
  it('creates and lists resolver reviews', async () => {
    const createResolverReviewResponse = await (request as any)(app).post('/people/resolver-reviews').send({
      reviewType: 'identity_conflict',
      triggerSourceType: 'conversation',
      triggerSourceId: 'conv_1',
      candidatePersonIds: ['person_1', 'person_2'],
      confidenceBand: 'high',
      confidenceReasons: ['exact phone match'],
      riskFlags: ['duplicate_creation_attempt'],
      requestedByUserId: 'user_1',
    });

    expect(createResolverReviewResponse.status).toBe(200);
    expect(createResolverReviewResponse.body.reviewType).toBe('identity_conflict');
    expect(createResolverReviewResponse.body.reviewStatus).toBe('pending');
    expect(createResolverReviewResponse.body.priority).toBe('normal');
    expect(createResolverReviewResponse.body.candidatePersonIds).toEqual(['person_1', 'person_2']);

    const listResolverReviewsResponse = await (request as any)(app).get('/people/resolver-reviews');

    expect(listResolverReviewsResponse.status).toBe(200);
    expect(listResolverReviewsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResolverReviewResponse.body.id,
          reviewType: 'identity_conflict',
          triggerSourceId: 'conv_1',
        }),
      ]),
    );
  });
});
