import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('connectshyft identity resolution slice 27', () => {
  it('returns contactPointStatus on the identity decision payload and candidate metadata', async () => {
    const response = await (request as any)(app).post('/people/identity/decision').send({
      candidates: [
        {
          personId: 'person-shared',
          score: 60,
          reasons: ['shared contact point candidate'],
          contactPointStatus: 'active_shared_possible',
        },
        {
          personId: 'person-stale',
          score: 20,
          reasons: ['historical contact point candidate'],
          contactPointStatus: 'stale',
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      confidenceBand: 'medium',
      contactPointStatus: 'active_shared_possible',
      candidates: [
        {
          personId: 'person-shared',
          contactPointStatus: 'active_shared_possible',
        },
        {
          personId: 'person-stale',
          contactPointStatus: 'stale',
        },
      ],
    });
  });
});
