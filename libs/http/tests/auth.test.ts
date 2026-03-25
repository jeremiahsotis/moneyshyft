import { createAuthMiddleware } from '../src/auth';

describe('createAuthMiddleware.authenticateToken', () => {
  const buildResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { status, json };
  };

  it('returns 401 for invalid or expired access tokens', () => {
    const response = buildResponse();
    const next = jest.fn();
    const logError = jest.fn();
    const middleware = createAuthMiddleware({
      verifyAccessToken: () => {
        throw new Error('Invalid or expired access token');
      },
      requireTenantId: (tenantId: string) => tenantId,
      isTenantScopeError: () => false,
      logError,
    });

    middleware.authenticateToken(
      {
        cookies: {
          access_token: 'expired-token',
        },
      },
      response as any,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(logError).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps tenant scope failures as 403 responses', () => {
    const response = buildResponse();
    const next = jest.fn();
    const middleware = createAuthMiddleware({
      verifyAccessToken: () => {
        throw new Error('TENANT_SCOPE_REQUIRED');
      },
      requireTenantId: () => {
        throw new Error('TENANT_SCOPE_REQUIRED');
      },
      isTenantScopeError: (error: unknown) => (
        error instanceof Error && error.message === 'TENANT_SCOPE_REQUIRED'
      ),
      logError: jest.fn(),
    });

    middleware.authenticateToken(
      {
        cookies: {
          access_token: 'tenant-scope-token',
        },
      },
      response as any,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: 'TENANT_SCOPE_REQUIRED' });
    expect(next).not.toHaveBeenCalled();
  });
});
