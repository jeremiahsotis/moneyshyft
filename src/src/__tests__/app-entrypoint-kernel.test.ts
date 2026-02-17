import express from 'express';
import request from 'supertest';
import {
  PLATFORM_MIDDLEWARE_CHAIN,
  PLATFORM_MIDDLEWARE_ORDER,
  V1_ROUTE_REGISTRATIONS
} from '../api/registerRoutes';

describe('Story 0.1 - canonical app entrypoint and kernel middleware', () => {
  describe('AC1: ordered platform middleware chain', () => {
    it('applies correlation, tenancy, auth-context, and envelope in order', async () => {
      const testApp = express();
      PLATFORM_MIDDLEWARE_CHAIN.forEach((middleware) => testApp.use(middleware));
      testApp.get('/_test/health', (_req, res) => {
        res.status(200).json({ ok: true });
      });

      const response = await request(testApp)
        .get('/_test/health')
        .set('X-Tenant-Id', 'tenant-123');

      expect(response.status).toBe(200);
      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-tenant-id']).toBe('tenant-123');
      expect(response.headers['x-platform-middleware-chain']).toBe(
        PLATFORM_MIDDLEWARE_ORDER.join(',')
      );
    });
  });

  describe('AC2: shared route registration', () => {
    it('registers all v1 module routes through a shared registry', () => {
      const registeredPaths = V1_ROUTE_REGISTRATIONS.map(
        (registration) => registration.path
      );

      expect(registeredPaths).toEqual([
        '/api/v1/auth',
        '/api/v1/accounts',
        '/api/v1/transactions',
        '/api/v1/transactions',
        '/api/v1/categories',
        '/api/v1/goals',
        '/api/v1/budgets',
        '/api/v1/income',
        '/api/v1/debts',
        '/api/v1/assignments',
        '/api/v1/households',
        '/api/v1/recurring-transactions',
        '/api/v1/extra-money',
        '/api/v1/settings',
        '/api/v1/scenarios',
        '/api/v1/tags'
      ]);
    });
  });
});
