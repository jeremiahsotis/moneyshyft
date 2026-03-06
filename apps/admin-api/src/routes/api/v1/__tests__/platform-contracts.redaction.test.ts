import express from 'express';
import request from 'supertest';
import router from '../platform-contracts';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    req.correlationId = 'corr-story16-redaction';
    req.tenantId = 'tenant-story16';
    req.tenantContext = {
      tenantId: 'tenant-story16',
      orgUnitId: null,
      scopeMode: 'TENANT',
      source: 'auth',
    };
    res.locals.responseEnvelope = {
      correlationId: req.correlationId,
      tenantId: req.tenantId,
    };
    next();
  });
  app.use('/api/v1/platform', router);
  return app;
};

describe('platform contracts security redaction verification', () => {
  it('returns validation refusal when required security payload fields are missing', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/platform/_kernel/security/redaction/verify')
      .send({
        scope: {
          tenantId: 'tenant-story16',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'SECURITY_REDACTION_PAYLOAD_INVALID',
      refusalType: 'client',
    });
  });

  it('rejects redaction verification when scope tenant differs from canonical tenancy context', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/platform/_kernel/security/redaction/verify')
      .send({
        scope: {
          tenantId: 'tenant-other',
          actorUserId: 'user-story16',
          correlationId: 'corr-story16-redaction',
        },
        auditEvent: {
          eventName: 'platform.security.redaction-verification',
          action: 'verify-security-redaction',
          sensitive: {
            accessToken: 'plain-access-token-1-6',
          },
        },
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      refusalType: 'security',
    });
  });

  it('redacts sensitive fields and emits policy-compliant verification evidence', async () => {
    const app = buildApp();
    const plaintextAccessToken = 'plain-access-token-1-6';
    const plaintextRefreshToken = 'plain-refresh-token-1-6';
    const plaintextPassword = 'PlaintextPassword!23';
    const plaintextApiKey = 'plain-api-key-1-6';

    const response = await request(app)
      .post('/api/v1/platform/_kernel/security/redaction/verify')
      .send({
        scope: {
          tenantId: 'tenant-story16',
          actorUserId: 'user-story16',
          correlationId: 'corr-story16-redaction',
        },
        auditEvent: {
          eventName: 'platform.security.redaction-verification',
          action: 'verify-security-redaction',
          metadata: {
            source: 'story-1-6',
          },
          sensitive: {
            accessToken: plaintextAccessToken,
            refreshToken: plaintextRefreshToken,
            password: plaintextPassword,
            apiKey: plaintextApiKey,
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'SECURITY_REDACTION_VERIFIED',
      data: {
        redaction: {
          policy: 'deny-list',
          allSensitiveFieldsRedacted: true,
          redactedFields: expect.arrayContaining([
            'accessToken',
            'refreshToken',
            'password',
            'apiKey',
          ]),
          preservedPaths: expect.arrayContaining([
            'scope.tenantId',
            'scope.actorUserId',
            'scope.correlationId',
            'auditEvent.eventName',
            'auditEvent.action',
          ]),
        },
      },
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(plaintextAccessToken);
    expect(serialized).not.toContain(plaintextRefreshToken);
    expect(serialized).not.toContain(plaintextPassword);
    expect(serialized).not.toContain(plaintextApiKey);
  });

  it('redacts sensitive branch values even when child keys are non-marker names', async () => {
    const app = buildApp();
    const plaintextOpaqueValue = 'plain-opaque-value-1-6';
    const plaintextNestedValue = 'plain-nested-value-1-6';

    const response = await request(app)
      .post('/api/v1/platform/_kernel/security/redaction/verify')
      .send({
        scope: {
          tenantId: 'tenant-story16',
          actorUserId: 'user-story16',
          correlationId: 'corr-story16-redaction',
        },
        auditEvent: {
          eventName: 'platform.security.redaction-verification',
          action: 'verify-security-redaction',
          metadata: {
            source: 'story-1-6',
          },
          sensitive: {
            opaqueValue: plaintextOpaqueValue,
            nestedBlob: {
              value: plaintextNestedValue,
            },
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'SECURITY_REDACTION_VERIFIED',
      data: {
        redaction: {
          allSensitiveFieldsRedacted: true,
          redactedFields: expect.arrayContaining(['sensitive', 'opaqueValue', 'nestedBlob']),
          redactedPaths: expect.arrayContaining([
            'auditEvent.sensitive',
            'auditEvent.sensitive.opaqueValue',
            'auditEvent.sensitive.nestedBlob',
          ]),
        },
      },
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(plaintextOpaqueValue);
    expect(serialized).not.toContain(plaintextNestedValue);
  });
});
