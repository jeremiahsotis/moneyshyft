import {
  resolveConnectShyftProviderAdapter,
} from '../providerRegistry';
import {
  buildRequest,
  registerProviderRegistryEnvHooks,
} from './providerRegistry.test.shared';

describe('connectshyft provider registry resolution', () => {
  registerProviderRegistryEnvHooks();

  it('resolves deterministic default provider from enabled registry order', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
          'x-test-connectshyft-disabled-providers': JSON.stringify(['twilio']),
        },
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected deterministic provider resolution to succeed');
    }

    expect(result.providerResolution).toEqual({
      requestedProvider: 'telnyx',
      resolvedProvider: 'telnyx',
      deterministic: true,
    });
  });

  it('returns disabled-provider refusal metadata with explicit no-side-effect contract', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
          'x-test-connectshyft-disabled-providers': JSON.stringify(['twilio']),
        },
        body: {
          providerKey: 'twilio',
        },
      }),
      operation: 'message',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected disabled provider resolution refusal');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'twilio',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-disabled',
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: 'connectshyft.provider.disabled',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('returns unavailable-provider refusal with actionable metadata for missing adapters', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
        },
        body: {
          providerKey: 'legacy-provider',
        },
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected unavailable provider refusal');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_UNAVAILABLE',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'legacy-provider',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-registered',
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: 'connectshyft.provider.unavailable',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('fails closed when rollout allow-list excludes the request tenant/orgUnit context', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
          'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
            telnyx: {
              tenantIds: ['tenant-connectshyft-allowed'],
              orgUnitIds: ['org-connectshyft-allowed'],
              tenantOrgUnitPairs: ['tenant-connectshyft-allowed::org-connectshyft-allowed'],
            },
          }),
        },
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-blocked',
        orgUnitId: 'org-connectshyft-blocked',
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected rollout allow-list refusal for excluded tenant/orgUnit');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-allowlisted',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    });
  });

  it('allows resolution when rollout allow-list includes the request tenant/orgUnit context', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
          'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
            telnyx: {
              tenantIds: [],
              orgUnitIds: [],
              tenantOrgUnitPairs: ['tenant-connectshyft-f1::org-connectshyft-f1-east'],
            },
          }),
        },
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
      }),
      operation: 'message',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected allow-listed provider resolution to succeed');
    }

    expect(result.providerResolution).toEqual({
      requestedProvider: 'telnyx',
      resolvedProvider: 'telnyx',
      deterministic: true,
    });
  });

  it('fails closed when rollout allow-list configuration is invalid JSON', () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
          'x-test-connectshyft-provider-rollout-allowlist': '{not-valid-json',
        },
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected invalid rollout allow-list configuration to fail closed');
    }

    expect(result.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-allowlisted',
        },
      },
    });
  });

  it('defers webhook allow-list gating without context and enforces after context is known', () => {
    const headers = {
      'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
      'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
        telnyx: {
          tenantIds: ['tenant-connectshyft-f2'],
          orgUnitIds: ['org-connectshyft-f2-east'],
          tenantOrgUnitPairs: ['tenant-connectshyft-f2::org-connectshyft-f2-east'],
        },
      }),
    };

    const preCorrelation = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers,
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'webhook',
    });

    expect(preCorrelation.ok).toBe(true);
    if (!preCorrelation.ok) {
      throw new Error('Expected webhook provider resolution to defer allow-list gating before correlation context');
    }

    const postCorrelation = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers,
        body: {
          providerKey: 'telnyx',
        },
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
      }),
      operation: 'webhook',
    });

    expect(postCorrelation.ok).toBe(false);
    if (postCorrelation.ok) {
      throw new Error('Expected webhook provider resolution to fail once correlation context is evaluated');
    }

    expect(postCorrelation.refusal).toMatchObject({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: null,
          deterministic: true,
          reason: 'provider-not-allowlisted',
        },
      },
    });
  });
});
