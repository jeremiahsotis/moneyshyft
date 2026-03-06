import {
  ConnectShyftProviderDispatchPolicyError,
  resolveConnectShyftProviderAdapter,
  resolveConnectShyftRequestedProviderKey,
} from '../providerRegistry';
import {
  buildRequest,
  registerProviderRegistryEnvHooks,
} from './providerRegistry.test.shared';

describe('connectshyft provider registry adapter dispatch boundaries', () => {
  registerProviderRegistryEnvHooks();

  it('routes outbound call/message and webhook translation through the adapter interface', async () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        headers: {
          'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
        },
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'webhook',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    const callDispatch = await result.adapter.dispatchOutboundCall({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
    });
    expect(callDispatch).toMatchObject({
      providerKey: 'telnyx',
      channel: 'call',
      providerLegId: 'telnyx-call-leg-thread-f1-unclaimed-1001',
      providerMessageId: null,
      adapterInvoked: true,
      providerBranchingInDomain: false,
    });

    const messageDispatch = await result.adapter.dispatchOutboundMessage({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      body: 'Provider registry dispatch body smoke test.',
    });
    expect(messageDispatch).toMatchObject({
      providerKey: 'telnyx',
      channel: 'message',
      providerLegId: null,
      providerMessageId: 'telnyx-message-thread-f1-unclaimed-1001',
      dispatchContext: {
        targetPhone: null,
        messageBodyProvided: true,
      },
      adapterInvoked: true,
      providerBranchingInDomain: false,
    });

    const signatureDecision = result.adapter.validateInboundWebhookSignature({
      req: buildRequest({
        body: {
          eventType: 'call.connected',
        },
      }),
    });
    expect(signatureDecision).toEqual({ ok: true });

    expect(
      result.adapter.toCanonicalEvent({
        rawEventType: 'call.connected',
        payload: {},
      }),
    ).toEqual({
      eventType: 'CallConnected',
      payload: {},
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    });
  });

  it('enforces bridge-only/manual retry policy at the adapter dispatch boundary', async () => {
    const result = resolveConnectShyftProviderAdapter({
      req: buildRequest({
        body: {
          providerKey: 'telnyx',
        },
      }),
      operation: 'call',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected adapter resolution to succeed');
    }

    await expect(
      result.adapter.dispatchOutboundCall({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        callPolicy: {
          transport: 'sip',
          autoRetry: false,
          redialPolicy: 'manual_only',
        },
      }),
    ).rejects.toMatchObject({
      code: 'CONNECTSHYFT_OUTBOUND_CALL_TRANSPORT_UNSUPPORTED',
    });

    await expect(
      result.adapter.dispatchOutboundCall({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        callPolicy: {
          transport: 'bridge',
          autoRetry: true,
          redialPolicy: 'manual_only',
        },
      }),
    ).rejects.toBeInstanceOf(ConnectShyftProviderDispatchPolicyError);
  });

  it('prefers body providerKey over test header provider request override', () => {
    const requested = resolveConnectShyftRequestedProviderKey(
      buildRequest({
        headers: {
          'x-test-connectshyft-provider-requested': 'mock-sandbox',
        },
        body: {
          providerKey: 'telnyx',
        },
      }),
    );

    expect(requested).toBe('telnyx');
  });
});
