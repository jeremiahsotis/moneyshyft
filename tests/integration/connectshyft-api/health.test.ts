import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('connectshyft-api health', () => {
  it('returns ok status', async () => {
    const res = await (request as any)(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
