import {
  REDACTED_VALUE,
  containsPlaintextMarkers,
  isSensitiveKey,
  redactSensitivePayload,
} from '../redaction';

describe('platform audit redaction utility', () => {
  it('redacts nested sensitive fields and reports deterministic field metadata', () => {
    const payload = {
      scope: {
        tenantId: 'tenant-123',
      },
      auditEvent: {
        action: 'security-check',
        sensitive: {
          accessToken: 'plain-access-token',
          refreshToken: 'plain-refresh-token',
          password: 'PlaintextPassword!23',
          apiKey: 'plain-api-key',
        },
      },
    };

    const result = redactSensitivePayload(payload);

    expect(result.redactedPayload).toEqual({
      scope: {
        tenantId: 'tenant-123',
      },
      auditEvent: {
        action: 'security-check',
        sensitive: {
          accessToken: REDACTED_VALUE,
          refreshToken: REDACTED_VALUE,
          password: REDACTED_VALUE,
          apiKey: REDACTED_VALUE,
        },
      },
    });
    expect(result.redactedFields).toEqual(
      expect.arrayContaining(['accessToken', 'refreshToken', 'password', 'apiKey']),
    );
    expect(result.redactedPaths).toEqual(
      expect.arrayContaining([
        'auditEvent.sensitive.accessToken',
        'auditEvent.sensitive.refreshToken',
        'auditEvent.sensitive.password',
        'auditEvent.sensitive.apiKey',
      ]),
    );
    expect(result.sensitiveMarkers).toEqual(
      expect.arrayContaining([
        'plain-access-token',
        'plain-refresh-token',
        'PlaintextPassword!23',
        'plain-api-key',
      ]),
    );
  });

  it('treats token/secret/password variants as sensitive keys', () => {
    expect(isSensitiveKey('accessToken')).toBe(true);
    expect(isSensitiveKey('refresh_token')).toBe(true);
    expect(isSensitiveKey('client-secret')).toBe(true);
    expect(isSensitiveKey('apiKey')).toBe(true);
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('sensitive')).toBe(true);
    expect(isSensitiveKey('tenantId')).toBe(false);
    expect(isSensitiveKey('eventName')).toBe(false);
  });

  it('redacts sensitive branches even when nested child keys are not marker-based', () => {
    const payload = {
      auditEvent: {
        sensitive: {
          opaqueValue: 'plain-opaque-secret',
          nestedBlob: {
            value: 'plain-nested-secret',
          },
        },
      },
    };

    const result = redactSensitivePayload(payload);

    expect(result.redactedPayload).toEqual({
      auditEvent: {
        sensitive: {
          opaqueValue: REDACTED_VALUE,
          nestedBlob: REDACTED_VALUE,
        },
      },
    });
    expect(result.redactedFields).toEqual(expect.arrayContaining(['sensitive', 'opaqueValue', 'nestedBlob']));
    expect(result.redactedPaths).toEqual(
      expect.arrayContaining([
        'auditEvent.sensitive',
        'auditEvent.sensitive.opaqueValue',
        'auditEvent.sensitive.nestedBlob',
      ]),
    );
    expect(result.sensitiveMarkers).toEqual(expect.arrayContaining(['plain-opaque-secret', 'plain-nested-secret']));
    expect(containsPlaintextMarkers(result.redactedPayload, result.sensitiveMarkers)).toBe(false);
  });

  it('detects plaintext leaks against collected sensitive markers', () => {
    const safePayload = {
      token: REDACTED_VALUE,
      nested: {
        password: REDACTED_VALUE,
      },
    };
    const leakingPayload = {
      token: 'plain-access-token',
    };

    expect(containsPlaintextMarkers(safePayload, ['plain-access-token', 'PlaintextPassword!23'])).toBe(false);
    expect(containsPlaintextMarkers(leakingPayload, ['plain-access-token'])).toBe(true);
  });
});
