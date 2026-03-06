import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR4.fixture';

test.describe('Story ux-r4 Outbound Policy Guardrail UI (ATDD API) - Envelope Contracts', () => {
  test(
    '[UXR4-ATDD-API-008][P1] success and refusal envelopes expose deterministic accessible feedback metadata @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithoutOverridePayload,
    }) => {
      const [successResponse, refusalResponse] = await Promise.all([
        apiRequest(request, {
          method: 'POST',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.claimed}/messages`,
          headers: storyUxR4OperatorHeaders,
          data: {
            orgUnitId: storyUxR4Context.orgUnitId,
            channel: 'sms',
            body: 'Deterministic policy-safe outbound follow-up.',
          },
        }),
        apiRequest(request, {
          method: 'POST',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimedPrefersNo}/messages`,
          headers: storyUxR4OperatorHeaders,
          data: storyUxR4MessageWithoutOverridePayload,
        }),
      ]);

      expect(successResponse.status()).toBe(200);
      expect(refusalResponse.status()).toBe(200);

      const [successBody, refusalBody] = await Promise.all([
        successResponse.json(),
        refusalResponse.json(),
      ]);

      expect(successBody).toMatchObject({
        ok: true,
        data: {
          uiFeedback: {
            severity: 'success',
            ariaLive: 'polite',
            messageKey: expect.any(String),
            hiddenTransition: false,
          },
        },
      });
      expect(refusalBody).toMatchObject({
        ok: false,
        refusalType: 'business',
        data: {
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: expect.any(String),
          },
        },
      });
    },
  );

  test(
    '[UXR4-ATDD-API-009][P1] canonical system error envelopes remain deterministic and stack-safe for outbound feedback mapping @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
        headers: storyUxR4OperatorHeaders,
        data: {
          reason: 'uxr4-outbound-policy-system-error-probe',
        },
      });

      expect(response.status()).toBe(500);
      const body = await response.json();

      expect(body).toMatchObject({
        ok: false,
        errorType: 'system',
        code: 'ENVELOPE_SYSTEM_ERROR',
        message: expect.any(String),
        correlationId: expect.any(String),
        tenantId: storyUxR4Context.tenantId,
      });
      expect(body).not.toHaveProperty('stack');
    },
  );
});
