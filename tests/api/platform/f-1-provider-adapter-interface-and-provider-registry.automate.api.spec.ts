import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryF1Headers } from '../../support/factories/connectShyftStoryF1Factory';
import { test, expect } from '../../support/fixtures/connectShyftStoryF1.fixture';
import { deterministicE164 } from '../../support/utils/deterministicTestIds';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story f.1 Provider Adapter Interface and Provider Registry (Automate API Expansion)',
  () => {

    test(
      '[P0] provider fallback resolves deterministically to the first enabled provider when no provider key is supplied @P0',
      async ({ request, storyF1Context }) => {
        const orderedProviderHeaders = createStoryF1Headers(storyF1Context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [storyF1Context.orgUnitId],
          enabledProviders: [
            storyF1Context.providers.enabledSecondary,
            storyF1Context.providers.enabledPrimary,
          ],
          disabledProviders: [storyF1Context.providers.disabled],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.unclaimed}/call`,
          headers: orderedProviderHeaders,
          data: {
            orgUnitId: storyF1Context.orgUnitId,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            providerResolution: {
              requestedProvider: storyF1Context.providers.enabledSecondary,
              resolvedProvider: storyF1Context.providers.enabledSecondary,
              deterministic: true,
              providerBranchingInDomain: false,
            },
            dispatch: {
              providerKey: storyF1Context.providers.enabledSecondary,
              channel: 'call',
              adapterInvoked: true,
              providerBranchingInDomain: false,
            },
          },
        });
      },
    );

    test(
      '[P0] when all configured providers are disabled the operation fails closed with no-enabled-provider refusal metadata @P0',
      async ({ request, storyF1Context }) => {
        const allDisabledHeaders = createStoryF1Headers(storyF1Context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [storyF1Context.orgUnitId],
          enabledProviders: [storyF1Context.providers.enabledPrimary],
          disabledProviders: [storyF1Context.providers.enabledPrimary],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.unclaimed}/call`,
          headers: allDisabledHeaders,
          data: {
            orgUnitId: storyF1Context.orgUnitId,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: storyF1Context.refusalCodes.unavailable,
          refusalType: 'business',
          data: {
            providerResolution: {
              requestedProvider: null,
              resolvedProvider: null,
              deterministic: true,
              reason: 'no-enabled-provider',
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
      '[P0] explicit provider key in payload overrides test-header requested provider hints for deterministic dispatch @P0',
      async ({ request, storyF1Context }) => {
        const headerRequestedProvider = createStoryF1Headers(storyF1Context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [storyF1Context.orgUnitId],
          requestedProvider: storyF1Context.providers.enabledSecondary,
          enabledProviders: [
            storyF1Context.providers.enabledPrimary,
            storyF1Context.providers.enabledSecondary,
          ],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.unclaimed}/messages`,
          headers: headerRequestedProvider,
          data: {
            orgUnitId: storyF1Context.orgUnitId,
            providerKey: storyF1Context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Body providerKey should win over x-test-connectshyft-provider-requested.',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            providerResolution: {
              requestedProvider: storyF1Context.providers.enabledPrimary,
              resolvedProvider: storyF1Context.providers.enabledPrimary,
              deterministic: true,
            },
            dispatch: {
              providerKey: storyF1Context.providers.enabledPrimary,
              channel: 'message',
              adapterInvoked: true,
              providerBranchingInDomain: false,
            },
          },
        });
      },
    );

    test(
      '[P1] disabled-provider refusal on closed threads keeps lifecycle untouched until a later enabled-provider dispatch explicitly reopens @P1',
      async ({ request, storyF1Context, storyF1OperatorHeaders }) => {
        const disabledResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.closed}/call`,
          headers: storyF1OperatorHeaders,
          data: {
            orgUnitId: storyF1Context.orgUnitId,
            providerKey: storyF1Context.providers.disabled,
          },
        });

        expect(disabledResponse.status()).toBe(200);
        const disabledBody = await disabledResponse.json();
        expect(hasRequiredEnvelopeKeys(disabledBody)).toBe(true);
        expect(disabledBody).toMatchObject({
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

        const recoveryResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF1Context.paths.threads}/${storyF1Context.threadIds.closed}/call`,
          headers: storyF1OperatorHeaders,
          data: {
            orgUnitId: storyF1Context.orgUnitId,
            providerKey: storyF1Context.providers.enabledPrimary,
          },
        });

        expect(recoveryResponse.status()).toBe(200);
        const recoveryBody = await recoveryResponse.json();
        expect(hasRequiredEnvelopeKeys(recoveryBody)).toBe(true);
        expect(recoveryBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            lifecycle: {
              priorState: 'CLOSED',
              reopenedFromClosed: true,
            },
            providerResolution: {
              resolvedProvider: storyF1Context.providers.enabledPrimary,
              deterministic: true,
            },
          },
        });
      },
    );

    test(
      '[P1] number mapping create accepts legacy twilioNumberE164 input while returning provider-neutral providerNumberE164 contract fields @P1',
      async ({ request, storyF1Context }, testInfo) => {
        const adminHeaders = createStoryF1Headers(storyF1Context, {
          role: 'SYSTEM_ADMIN',
          userId: storyF1Context.adminUserId,
          orgUnitMemberships: [storyF1Context.orgUnitId],
        });
        const legacyTwilioNumberE164 = deterministicE164(
          testInfo,
          'f1-number-mapping',
        );

        const response = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/connectshyft/numbers',
          headers: adminHeaders,
          data: {
            orgUnitId: storyF1Context.orgUnitId,
            twilioNumberE164: legacyTwilioNumberE164,
            label: 'F1 legacy number mapping compatibility check',
            isActive: false,
          },
        });

        expect([200, 201]).toContain(response.status());
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
          data: {
            providerNumberE164: legacyTwilioNumberE164,
            twilioNumberE164: legacyTwilioNumberE164,
          },
        });
      },
    );
  },
);
