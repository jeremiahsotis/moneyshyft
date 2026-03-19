import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('connectshyft-api health', () => {
  it('returns ok status', async () => {
    const res = await (request(app).get('/health') as any);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
