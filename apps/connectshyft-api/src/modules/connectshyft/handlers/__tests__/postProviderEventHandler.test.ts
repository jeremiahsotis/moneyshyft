import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { buildPostProviderEventHandler } from '../postProviderEventHandler';

describe('postProviderEventHandler', () => {
  it('maps a provider event into bridge lifecycle handling and acknowledges success', async () => {
    const handleProviderEvent = jest.fn(async () => undefined);

    const app = express();
    app.use(express.json());
    app.use(responseEnvelope);
    app.post('/api/v1/connectshyft/provider-events', buildPostProviderEventHandler({
      resolveWebhookAccessContext: jest.fn(async () => ({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-connectshyft-f1-1001',
        eventType: 'CallAnswered',
        normalizedEventType: 'callanswered',
        providerSelection: {
          providerResolution: {
            requestedProvider: 'mock-sandbox',
            resolvedProvider: 'mock-sandbox',
            deterministic: true,
          },
        },
        canonicalTranslation: {
          eventType: 'CallAnswered',
        },
        correlation: {
          ok: true,
          source: 'provider_fallback',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-connectshyft-f1-1001',
          providerLegId: 'provider-leg-operator-1001',
          providerMessageId: null,
          providerEventId: null,
          providerNumberE164: null,
        },
      })) as any,
      loadAggregateByProviderCallId: jest.fn(async () => ({
        session: {
          id: 'bridge-session-1001',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-connectshyft-f1-1001',
          status: 'operator_dialing',
        },
        operatorLeg: {
          providerCallId: 'provider-leg-operator-1001',
        },
        neighborLeg: {
          providerCallId: 'provider-leg-neighbor-1001',
        },
      })) as any,
      callLifecycleService: {
        handleProviderEvent,
      } as any,
    }));

    const response = await (request as any)(app)
      .post('/api/v1/connectshyft/provider-events')
      .send({
        eventType: 'CallAnswered',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_PROVIDER_EVENT_ACCEPTED',
      data: {
        handled: true,
      },
    });
    expect(handleProviderEvent).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'mock-sandbox',
      providerCallId: 'provider-leg-operator-1001',
      event: expect.objectContaining({
        type: 'operator_answered',
      }),
    }));
  });
});
