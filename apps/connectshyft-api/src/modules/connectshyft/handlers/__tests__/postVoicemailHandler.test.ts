import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { buildPostVoicemailHandler } from '../postVoicemailHandler';

describe('postVoicemailHandler', () => {
  it('creates voicemail records after signature verification succeeds', async () => {
    const handleVoicemail = jest.fn(async () => ({
      id: 'voicemail-1001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      callId: 'call-1001',
      threadId: 'thread-connectshyft-f1-1001',
      personId: 'person-connectshyft-f1-1001',
      artifactId: 'artifact-1001',
      recordingUrl: 'https://example.test/vm-1001.mp3',
      recordingStatus: 'completed' as const,
      occurredAtUtc: '2026-03-23T12:05:00.000Z',
      createdAtUtc: '2026-03-23T12:05:00.000Z',
      updatedAtUtc: '2026-03-23T12:05:00.000Z',
      transcriptionJson: null,
    }));

    const app = express();
    app.use(express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }));
    app.use(responseEnvelope);
    app.post('/api/v1/connectshyft/voicemails', buildPostVoicemailHandler({
      enforceCapability: jest.fn(async () => ({} as any)),
      resolveProviderAdapterFn: jest.fn(() => ({
        ok: true,
        adapter: {
          verifyWebhook: jest.fn(() => ({ ok: true })),
        },
        providerResolution: {
          requestedProvider: 'mock-sandbox',
          resolvedProvider: 'mock-sandbox',
          deterministic: true,
        },
      })) as any,
      callLifecycleService: {
        handleVoicemail,
      } as any,
    }));

    const response = await (request as any)(app)
      .post('/api/v1/connectshyft/voicemails')
      .send({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        callId: 'call-1001',
        threadId: 'thread-connectshyft-f1-1001',
        personId: 'person-connectshyft-f1-1001',
        artifactId: 'artifact-1001',
        recordingStatus: 'completed',
        recordingUrl: 'https://example.test/vm-1001.mp3',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_VOICEMAIL_ACCEPTED',
      data: {
        voicemail: {
          voicemailId: 'voicemail-1001',
          artifactId: 'artifact-1001',
        },
      },
    });
    expect(handleVoicemail).toHaveBeenCalledWith(expect.objectContaining({
      callId: 'call-1001',
      artifactId: 'artifact-1001',
    }));
  });
});
