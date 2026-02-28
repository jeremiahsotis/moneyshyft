import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryF1.fixture';

test.describe(
  'Story f.1 Provider Adapter Interface and Provider Registry (ATDD API RED)',
  () => {
    test(
      '[P0] outbound call dispatch resolves enabled provider deterministically through adapter registry @P0',
      async ({
        request,
        storyF1Context,
        storyF1OperatorHeaders,
        storyF1EnabledProviderCallPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.unclaimed}/call`,
          headers: storyF1OperatorHeaders,
          data: storyF1EnabledProviderCallPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            providerResolution: {
              requestedProvider: storyF1Context.providers.enabledPrimary,
              resolvedProvider: storyF1Context.providers.enabledPrimary,
              deterministic: true,
              adapterInterfaceVersion: 'v1',
            },
            dispatch: {
              channel: 'call',
              adapterInvoked: true,
              providerBranchingInDomain: false,
            },
          },
        });
      },
    );

    test(
      '[P0] inbound webhook processing routes through provider adapter translation with deterministic provider resolution @P0',
      async ({
        request,
        storyF1Context,
        storyF1AdminHeaders,
        storyF1InboundWebhookPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyF1Context.paths.inboundWebhook,
          headers: storyF1AdminHeaders,
          data: storyF1InboundWebhookPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            providerResolution: {
              requestedProvider: storyF1Context.providers.enabledPrimary,
              resolvedProvider: storyF1Context.providers.enabledPrimary,
              deterministic: true,
              adapterInvoked: true,
            },
            canonicalTranslation: {
              providerBranchingInDomain: false,
              eventType: 'voice.connected',
            },
          },
        });
      },
    );

    test(
      '[P0] disabled provider requests fail closed with refusal and no partial writes @P0',
      async ({
        request,
        storyF1Context,
        storyF1OperatorHeaders,
        storyF1DisabledProviderCallPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.claimed}/call`,
          headers: storyF1OperatorHeaders,
          data: storyF1DisabledProviderCallPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyF1Context.refusalCodes.disabled,
          refusalType: 'business',
          data: {
            providerResolution: {
              requestedProvider: storyF1Context.providers.disabled,
              resolvedProvider: null,
              deterministic: true,
              reason: 'provider-disabled',
            },
            sideEffects: {
              dispatchAttempted: false,
              lifecycleMutationApplied: false,
              auditPersisted: false,
            },
          },
        });
      },
    );

    test(
      '[P1] missing provider requests return actionable refusal metadata with explicit no-hidden-mutation evidence @P1',
      async ({
        request,
        storyF1Context,
        storyF1OperatorHeaders,
        storyF1MissingProviderMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.unclaimed}/messages`,
          headers: storyF1OperatorHeaders,
          data: storyF1MissingProviderMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyF1Context.refusalCodes.unavailable,
          refusalType: 'business',
          data: {
            providerResolution: {
              requestedProvider: storyF1Context.providers.missing,
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
      },
    );

    test(
      '[P1] outbound response contracts remain provider-neutral and do not leak twilio-specific branch fields @P1',
      async ({
        request,
        storyF1Context,
        storyF1OperatorHeaders,
        storyF1EnabledProviderMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.claimed}/messages`,
          headers: storyF1OperatorHeaders,
          data: storyF1EnabledProviderMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            providerResolution: {
              resolvedProvider: storyF1Context.providers.enabledPrimary,
              providerBranchingInDomain: false,
            },
          },
        });
        expect(body?.data).not.toHaveProperty('twilioNumberE164');
        expect(body?.data).not.toHaveProperty('twilioBranch');
      },
    );
  },
);
