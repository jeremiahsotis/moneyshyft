import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../apps/connectshyft-api/src/platform/middleware/responseEnvelope';
import { buildPostProviderEventHandler } from '../../../apps/connectshyft-api/src/modules/connectshyft/handlers/postProviderEventHandler';
import { buildPostThreadCallHandler } from '../../../apps/connectshyft-api/src/modules/connectshyft/handlers/postThreadCallHandler';
import { buildPostVoicemailHandler } from '../../../apps/connectshyft-api/src/modules/connectshyft/handlers/postVoicemailHandler';
import { buildConnectShyftHttpRouter } from '../../../apps/connectshyft-api/src/modules/connectshyft/http';

describe('connectshyft calls integration', () => {
  it('runs the checkpoint 2 call lifecycle across the mounted api routes', async () => {
    const state = {
      call: null as null | {
        id: string;
        bridgeSessionId: string | null;
        status: string;
      },
      voicemails: [] as Array<{ id: string; artifactId: string }>,
    };

    const lifecycleService = {
      startCall: jest.fn(async () => {
        state.call = {
          id: 'call-integration-1001',
          bridgeSessionId: 'bridge-integration-1001',
          status: 'operator_dialing',
        };

        return {
          id: 'call-integration-1001',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-connectshyft-f1-1001',
          personId: 'person-connectshyft-f1-1001',
          bridgeSessionId: 'bridge-integration-1001',
          status: 'operator_dialing' as const,
          failureCode: null,
          failureMessage: null,
          startedAtUtc: '2026-03-23T12:00:00.000Z',
          operatorAnsweredAtUtc: null,
          neighborAnsweredAtUtc: null,
          bridgedAtUtc: null,
          endedAtUtc: null,
          createdAtUtc: '2026-03-23T12:00:00.000Z',
          updatedAtUtc: '2026-03-23T12:00:00.000Z',
        };
      }),
      handleProviderEvent: jest.fn(async (input: { event: { type: string } }) => {
        if (state.call) {
          state.call.status = input.event.type;
        }
      }),
      handleVoicemail: jest.fn(async () => {
        const voicemail = {
          id: 'voicemail-integration-1001',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          callId: 'call-integration-1001',
          threadId: 'thread-connectshyft-f1-1001',
          personId: 'person-connectshyft-f1-1001',
          artifactId: 'artifact-integration-1001',
          recordingUrl: 'https://example.test/integration-vm.mp3',
          recordingStatus: 'completed' as const,
          occurredAtUtc: '2026-03-23T12:05:00.000Z',
          createdAtUtc: '2026-03-23T12:05:00.000Z',
          updatedAtUtc: '2026-03-23T12:05:00.000Z',
          transcriptionJson: null,
        };
        state.voicemails.push({
          id: voicemail.id,
          artifactId: voicemail.artifactId,
        });
        if (state.call) {
          state.call.status = 'voicemail';
        }
        return voicemail;
      }),
    };

    const app = express();
    app.use(express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }));
    app.use(responseEnvelope);
    app.use('/api/v1/connectshyft', buildConnectShyftHttpRouter({
      postThreadCall: buildPostThreadCallHandler({
        resolveAccessContext: jest.fn(async () => ({
          context: {
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
          },
          threadId: 'thread-connectshyft-f1-1001',
          actorUserId: 'user-connectshyft-f1-operator',
          actorRoles: ['ORGUNIT_MEMBER'],
          lifecycleContext: {
            detail: {
              personId: 'person-connectshyft-f1-1001',
            },
          },
        })) as any,
        readinessService: {
          inspectReadiness: jest.fn(async () => ({
            bridgeCallRunnable: true,
          })),
        } as any,
        callLifecycleService: lifecycleService as any,
      }),
      postProviderEvent: buildPostProviderEventHandler({
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
            id: 'bridge-integration-1001',
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
        callLifecycleService: lifecycleService as any,
      }),
      postVoicemail: buildPostVoicemailHandler({
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
        callLifecycleService: lifecycleService as any,
      }),
    }));

    const startResponse = await (request as any)(app)
      .post('/api/v1/connectshyft/thread/thread-connectshyft-f1-1001/call');
    const providerResponse = await (request as any)(app)
      .post('/api/v1/connectshyft/provider-events')
      .send({
        eventType: 'CallAnswered',
      });
    const voicemailResponse = await (request as any)(app)
      .post('/api/v1/connectshyft/voicemails')
      .send({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        callId: 'call-integration-1001',
        threadId: 'thread-connectshyft-f1-1001',
        personId: 'person-connectshyft-f1-1001',
        artifactId: 'artifact-integration-1001',
        recordingStatus: 'completed',
      });

    expect(startResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_CALL_STARTED',
      data: {
        call: {
          callId: 'call-integration-1001',
          status: 'operator_dialing',
        },
      },
    });
    expect(providerResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_PROVIDER_EVENT_ACCEPTED',
      data: {
        handled: true,
      },
    });
    expect(voicemailResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_VOICEMAIL_ACCEPTED',
      data: {
        voicemail: {
          voicemailId: 'voicemail-integration-1001',
        },
      },
    });
    expect(state.call?.status).toBe('voicemail');
    expect(state.voicemails).toEqual([
      {
        id: 'voicemail-integration-1001',
        artifactId: 'artifact-integration-1001',
      },
    ]);
  });
});
