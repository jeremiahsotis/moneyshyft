import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('connectshyft contact point lifecycle integration', () => {
  it('surfaces the persisted contact point status through the people shell endpoint', async () => {
    const created = await (request as any)(app).post('/people/contact-points').send({
      type: 'phone',
      normalizedValue: '+12605559991',
      rawValue: '(260) 555-9991',
    });

    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      type: 'phone',
      normalizedValue: '+12605559991',
      status: 'active_personal',
    });

    const listed = await (request as any)(app).get('/people/contact-points');

    expect(listed.status).toBe(200);
    expect(listed.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: created.body.id,
        status: 'active_personal',
      }),
    ]));
  });
});
