import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { csrfProtection } from '../csrfProtection';

describe('csrfProtection middleware', () => {
  const buildApp = () => {
    const app = express();
    app.use(cookieParser());
    app.use(csrfProtection);
    app.get('/resource', (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.post('/resource', (_req, res) => {
      res.status(200).json({ ok: true });
    });
    return app;
  };

  it('rejects authenticated state-changing requests without CSRF token', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/resource')
      .set('Cookie', ['access_token=access-token']);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_REQUIRED',
      refusalType: 'security',
    });
  });

  it('rejects authenticated state-changing requests with invalid CSRF token', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/resource')
      .set('Cookie', ['access_token=access-token', 'csrf_token=cookie-token'])
      .set('X-CSRF-Token', 'header-token');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_INVALID',
      refusalType: 'security',
    });
  });

  it('allows authenticated state-changing requests with matching CSRF token', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/resource')
      .set('Cookie', ['access_token=access-token', 'csrf_token=csrf-token'])
      .set('X-CSRF-Token', 'csrf-token');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('does not enforce CSRF on safe methods', async () => {
    const app = buildApp();

    const response = await request(app)
      .get('/resource')
      .set('Cookie', ['access_token=access-token']);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
