import express from 'express';
import request from 'supertest';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import { buildPostThreadCallHandler } from '../postThreadCallHandler';

describe('postThreadCallHandler', () => {
  it('starts a call and returns the call dto when readiness passes', async () => {
    const startCall = jest.fn(async () => ({
      id: 'call-1001',
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-connectshyft-f1-1001',
      personId: 'person-connectshyft-f1-1001',
      bridgeSessionId: 'bridge-session-1001',
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
    }));

    const app = express();
    app.use(express.json());
    app.use(responseEnvelope);
    app.post('/api/v1/connectshyft/thread/:threadId/call', buildPostThreadCallHandler({
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
      callLifecycleService: {
        startCall,
      } as any,
    }));

    const response = await (request as any)(app)
      .post('/api/v1/connectshyft/thread/thread-connectshyft-f1-1001/call');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_CALL_STARTED',
      data: {
        call: {
          callId: 'call-1001',
          bridgeSessionId: 'bridge-session-1001',
          status: 'operator_dialing',
        },
      },
    });
    expect(startCall).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-connectshyft-f1-1001',
      personId: 'person-connectshyft-f1-1001',
    }));
  });
});
