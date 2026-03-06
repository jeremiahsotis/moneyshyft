import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { registerPlatformMiddleware } from '../api/registerRoutes';
import contractsRouter from '../routes/api/v1/platform-contracts';

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Story 0.8 - centralized time service and utc/local rendering contract', () => {
  const buildApp = () => {
    const testApp = express();
    testApp.use(cookieParser());
    testApp.use(express.json());
    registerPlatformMiddleware(testApp);
    testApp.use('/api/v1/platform', contractsRouter);
    return testApp;
  };

  describe('AC1: fallback order user -> tenant -> system', () => {
    it('resolves tenant timezone when user timezone is unavailable', async () => {
      const app = buildApp();

      const response = await request(app)
        .get('/api/v1/platform/time/render-context')
        .set('x-correlation-id', 'corr-time-tenant-alpha')
        .set('x-user-timezone', '')
        .set('x-tenant-timezone', 'America/Chicago')
        .set('x-system-timezone', 'UTC');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'TIMEZONE_CONTEXT_RESOLVED',
        data: {
          timezone: 'America/Chicago',
          timezoneSource: 'tenant'
        }
      });
    });

    it('falls back to system timezone when user and tenant are unavailable', async () => {
      const app = buildApp();

      const response = await request(app)
        .get('/api/v1/platform/time/render-context')
        .set('x-correlation-id', 'corr-time-system-alpha')
        .set('x-user-timezone', '')
        .set('x-tenant-timezone', '')
        .set('x-system-timezone', 'UTC');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'TIMEZONE_CONTEXT_RESOLVED',
        data: {
          timezone: 'UTC',
          timezoneSource: 'system'
        }
      });
    });
  });

  describe('AC2: no raw UTC in operational UI response contract', () => {
    it('returns localized render contract payload without raw UTC timestamp field', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/time/render-contract')
        .set('x-correlation-id', 'corr-time-render-alpha')
        .set('x-user-timezone', 'America/New_York')
        .set('x-tenant-timezone', 'America/Chicago')
        .set('x-system-timezone', 'UTC')
        .send({
          utcTimestamp: '2026-02-17T15:30:00.000Z',
          purpose: 'operations-ui'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'TIMEZONE_RENDER_CONTRACT_READY',
        data: {
          rendered: expect.any(String),
          timezone: 'America/New_York',
          timezoneSource: 'user',
          purpose: 'operations-ui'
        }
      });
      expect(response.body?.data).not.toHaveProperty('utcTimestamp');
      expect(response.body).not.toHaveProperty('utcTimestamp');
    });

    it('returns business refusal for non-UTC timestamp inputs', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/time/render-contract')
        .set('x-correlation-id', 'corr-time-render-invalid-alpha')
        .set('x-user-timezone', 'America/New_York')
        .set('x-tenant-timezone', 'America/Chicago')
        .set('x-system-timezone', 'UTC')
        .send({
          utcTimestamp: '2026-02-17T15:30:00-05:00'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'INVALID_UTC_TIMESTAMP',
        refusalType: 'business'
      });
    });

    it('returns localized values and omits UTC ISO in operations feed payload', async () => {
      const app = buildApp();

      const response = await request(app)
        .get('/api/v1/platform/operations/feed')
        .set('x-correlation-id', 'corr-time-feed-alpha')
        .set('x-user-timezone', 'America/New_York')
        .set('x-tenant-timezone', 'America/Chicago')
        .set('x-system-timezone', 'UTC');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'OPERATIONS_FEED_READY',
        data: {
          rows: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              occurredAtLocal: expect.any(String),
              timezoneSource: 'user'
            })
          ])
        }
      });

      const rows = response.body?.data?.rows ?? [];
      rows.forEach((row: Record<string, unknown>) => {
        expect(row).not.toHaveProperty('occurredAtUtc');
      });
    });

    it('returns business refusal when timezone context cannot be resolved', async () => {
      const app = buildApp();

      const response = await request(app)
        .get('/api/v1/platform/time/render-context')
        .set('x-correlation-id', 'corr-time-refusal-alpha')
        .set('x-user-timezone', '')
        .set('x-tenant-timezone', '')
        .set('x-system-timezone', '');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'TIMEZONE_CONTEXT_UNRESOLVED',
        refusalType: 'business'
      });
    });
  });
});
