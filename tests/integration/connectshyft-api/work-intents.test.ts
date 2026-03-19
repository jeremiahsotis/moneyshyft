import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('connectshyft-api work intents', () => {
  it('creates a work intent stub', async () => {
    const res = await (request(app).post('/work-intents') as any).send({
      intentType: 'needs_follow_up',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('open');
    expect(res.body.intentType).toBe('needs_follow_up');
  });
});
