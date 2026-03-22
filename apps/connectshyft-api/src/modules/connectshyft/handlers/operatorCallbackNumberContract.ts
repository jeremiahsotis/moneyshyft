import type { ConnectShyftOperatorCallbackNumber } from '../operatorCallbackNumbers';

export const normalizeConnectShyftOperatorCallbackNumberContract = (
  callbackNumber: ConnectShyftOperatorCallbackNumber | null,
) => ({
  value: callbackNumber?.callbackNumberE164 || null,
  rawInput: callbackNumber?.callbackNumberRawInput || null,
  createdAtUtc: callbackNumber?.createdAtUtc || null,
  updatedAtUtc: callbackNumber?.updatedAtUtc || null,
});
