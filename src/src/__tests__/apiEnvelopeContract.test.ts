import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { registerPlatformMiddleware } from '../api/registerRoutes';
import contractsRouter from '../routes/api/v1/platform-contracts';

describe('Story 0.5 - shared API envelope and business refusal contract', () => {
  const buildApp = () => {
    const testApp = express();
    testApp.use(cookieParser());
    testApp.use(express.json());
    registerPlatformMiddleware(testApp);
    testApp.use('/api/v1/platform', contractsRouter);
    return testApp;
  };

  describe('AC1: shared envelope helpers', () => {
    it('returns canonical success envelope with code/message and request context', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/_kernel/contracts/envelope/success')
        .set('x-correlation-id', 'corr-envelope-alpha')
        .send({
          code: 'ENVELOPE_SUCCESS',
          message: 'Envelope contract success',
          data: { mode: 'success' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'ENVELOPE_SUCCESS',
        message: 'Envelope contract success',
        correlationId: 'corr-envelope-alpha',
        tenantId: 'public',
        data: { mode: 'success' }
      });
    });
  });

  describe('AC2: business refusal contract', () => {
    it('returns HTTP 200 with ok=false and structured code/message for business refusals', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/_kernel/contracts/envelope/business-refusal')
        .set('x-correlation-id', 'corr-envelope-refusal-alpha')
        .send({
          code: 'ENVELOPE_BUSINESS_REFUSAL',
          message: 'Requested amount exceeds available envelope balance',
          data: { available: 42 }
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'ENVELOPE_BUSINESS_REFUSAL',
        message: 'Requested amount exceeds available envelope balance',
        refusalType: 'business',
        correlationId: 'corr-envelope-refusal-alpha',
        tenantId: 'public',
        data: { available: 42 }
      });
      expect(response.body).not.toHaveProperty('stack');
    });
  });
});
