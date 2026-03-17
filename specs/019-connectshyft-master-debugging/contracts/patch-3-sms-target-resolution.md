# Contract: Patch 3 SMS Target Resolution

## Objective

Replace non-deterministic SMS targeting with the locked resolution order and explicit refusal-before-provider behavior.

## Allowed runtime surface

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `performOutboundAction`
  - the outbound SMS target selection block
  - thread-context helpers only if existing runtime metadata must be preserved without introducing a new thread-target architecture
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - explicit phone-option filtering and defaulting for inbox actions
- `apps/connectshyft-web/src/features/connectshyft/threads.ts`
  - consume refusal data already exposed by Patch 2 without redefining the contract

## Required behavior

- Resolution order is fixed:
  1. explicit outbound request target
  2. linked neighbor primary active valid phone
  3. linked neighbor only active valid phone if exactly one exists
  4. refusal otherwise
- Provider dispatch happens only after deterministic resolution succeeds.
- Inbox explicit-phone UI cannot offer unrelated neighbor phones.
- Existing refusal envelope semantics remain unchanged.

## Must hold constant

- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/platform/envelopes/response.ts`
- `libs/platform/src/envelopes/response.ts`
- provider contract ownership in `domains/communication/telephony/index.ts`
- outbound call target fallback in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
