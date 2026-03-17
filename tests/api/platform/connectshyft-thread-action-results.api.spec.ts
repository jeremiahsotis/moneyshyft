import { test, expect } from '@playwright/test';
import {
  createConnectShyftThreadActionRefusal,
  createConnectShyftThreadActionTransportFailure,
} from '../../../apps/connectshyft-web/src/features/connectshyft/threadActionResults';

test.describe('ConnectShyft thread action result normalization', () => {
  test(
    '[P1] preserves refusal code, message, and structured data through wrapper normalization @P1',
    async () => {
      const result = createConnectShyftThreadActionRefusal(
        {
          ok: false,
          code: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
          refusalType: 'business',
          message: 'Override reason is required before sending SMS.',
          data: {
            uiFeedback: {
              message: 'Override reason is required before sending SMS.',
              severity: 'warning',
            },
            preferencePolicy: {
              overrideRequired: true,
              allowedOverrideReasons: ['safety-follow-up'],
            },
          },
        },
        'CONNECTSHYFT_THREAD_MESSAGE_DISPATCH_REFUSED',
        'Unable to send the message right now.',
      );

      expect(result).toMatchObject({
        ok: false,
        failureKind: 'refusal',
        code: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
        message: 'Override reason is required before sending SMS.',
        refusalType: 'business',
        data: {
          uiFeedback: {
            message: 'Override reason is required before sending SMS.',
            severity: 'warning',
          },
          preferencePolicy: {
            overrideRequired: true,
            allowedOverrideReasons: ['safety-follow-up'],
          },
        },
      });
    },
  );

  test(
    '[P1] transport failures stay distinct from business refusals during wrapper normalization @P1',
    async () => {
      const result = createConnectShyftThreadActionTransportFailure(
        {
          errorType: 'transport',
          data: {
            uiFeedback: {
              message: 'The request timed out before ConnectShyft could respond.',
            },
          },
        },
        'CONNECTSHYFT_THREAD_MESSAGE_DISPATCH_REFUSED',
        'Unable to send the message right now.',
      );

      expect(result).toMatchObject({
        ok: false,
        failureKind: 'error',
        code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCH_REFUSED_REQUEST_FAILED',
        message: 'The request timed out before ConnectShyft could respond.',
        errorType: 'transport',
      });
      expect(result.refusalType).toBeNull();
    },
  );
});
