import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('peoplecore identity decision', () => {
  it('returns require_override for a very high confidence candidate', async () => {
    const response = await (request as any)(app).post('/people/identity/decision').send({
      candidates: [
        {
          personId: 'person_very_high',
          score: 140,
          reasons: ['exact phone match'],
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(response.body.confidenceBand).toBe('very_high');
    expect(response.body.decisionType).toBe('require_override');
  });

  it('returns require_confirmation for a medium confidence candidate', async () => {
    const response = await (request as any)(app).post('/people/identity/decision').send({
      candidates: [
        {
          personId: 'person_medium',
          score: 60,
          reasons: ['name similarity'],
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(response.body.confidenceBand).toBe('medium');
    expect(response.body.decisionType).toBe('require_confirmation');
  });
});
