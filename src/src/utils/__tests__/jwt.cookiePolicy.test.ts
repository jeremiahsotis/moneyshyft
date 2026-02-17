import type { Response } from 'express';
import { clearAuthCookies, setAuthCookies } from '../jwt';

type CookieCall = [string, string, Record<string, unknown>];

describe('jwt cookie policy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createResponseDouble = () => {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
  };

  it('applies development-safe cookie policy without domain scoping', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_DOMAIN = 'example.com';

    const res = createResponseDouble();
    setAuthCookies(res, 'access-token', 'refresh-token', false);

    const calls = (res.cookie as jest.Mock).mock.calls as CookieCall[];

    const accessCall = calls.find(([name]) => name === 'access_token');
    const refreshCall = calls.find(([name]) => name === 'refresh_token');
    const csrfCall = calls.find(([name]) => name === 'csrf_token');

    expect(accessCall).toBeDefined();
    expect(refreshCall).toBeDefined();
    expect(csrfCall).toBeDefined();

    expect(accessCall?.[2]).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    expect(refreshCall?.[2]).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    expect(csrfCall?.[2]).toMatchObject({
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
    });
    expect(accessCall?.[2]).not.toHaveProperty('domain');
    expect(refreshCall?.[2]).not.toHaveProperty('domain');
    expect(csrfCall?.[2]).not.toHaveProperty('domain');
  });

  it('applies production parent-domain cookie policy', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = 'example.com';

    const res = createResponseDouble();
    setAuthCookies(res, 'access-token', 'refresh-token', true);

    const calls = (res.cookie as jest.Mock).mock.calls as CookieCall[];

    const accessCall = calls.find(([name]) => name === 'access_token');
    const refreshCall = calls.find(([name]) => name === 'refresh_token');
    const csrfCall = calls.find(([name]) => name === 'csrf_token');

    expect(accessCall?.[2]).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.example.com',
    });
    expect(refreshCall?.[2]).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.example.com',
    });
    expect(csrfCall?.[2]).toMatchObject({
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      domain: '.example.com',
    });
  });

  it('clears access, refresh, and CSRF cookies on logout', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = 'example.com';

    const res = createResponseDouble();

    clearAuthCookies(res);

    expect((res.clearCookie as jest.Mock).mock.calls).toEqual([
      ['access_token', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.example.com',
      }],
      ['refresh_token', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.example.com',
      }],
      ['csrf_token', {
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        domain: '.example.com',
      }],
    ]);
  });
});
