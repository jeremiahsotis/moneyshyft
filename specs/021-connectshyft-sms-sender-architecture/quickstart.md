# Quickstart: ConnectShyft SMS Sender Architecture

## Goal

Implement the permanent outbound SMS sender fix in three narrow backend slices, verify each slice before moving on, and keep `TELNYX_FROM_NUMBER` as fallback-only adapter behavior instead of the normal sender path.

## Slice Order

1. Shared SMS sender contract and Telnyx support
2. Route-owned sender resolution and dispatch wiring
3. Regression hardening and final verification

## Slice 1: Shared SMS Sender Contract and Telnyx Support

**Source targets**

- `domains/communication/telephony/index.ts`
- `domains/communication/telephony/__tests__/index.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `infrastructure/communications/telnyx/index.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`

**Work**

1. Add `senderPhone` to the shared SMS command only.
2. Add `senderPhone` to replay-key materiality.
3. Keep the provider wrapper transparent and prove it forwards `senderPhone`.
4. Update the Telnyx SMS payload builder to prefer explicit sender, then env fallback, then messaging profile.
5. Leave voice behavior untouched.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand ../../domains/communication/telephony/__tests__/index.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`

**Commit checkpoint**

- Safe to commit once the contract, wrapper, and Telnyx tests pass with no route changes.

## Slice 2: Route-Owned Sender Resolution and Dispatch Wiring

**Source targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`

**Reference-only context holders**

- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`

**Work**

1. Add a route-local sender resolver and export it with a `ForTests` alias.
2. Resolve sender from active orgUnit mappings and fail closed on zero or multiple active mappings.
3. Keep current target resolution intact.
4. Pass `senderPhone` into replay-key construction, request summaries, and `adapter.sendSms(...)`.
5. Add sender-specific pre-dispatch business refusals.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand ../../domains/communication/telephony/__tests__/index.test.ts src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`

**Commit checkpoint**

- Safe to commit once sender resolution is explicit at dispatch, target behavior is unchanged, and the route suite passes.

## Slice 3: Regression Hardening and Final Verification

**Source targets**

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `domains/communication/telephony/__tests__/index.test.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`
- whichever production files were permanently changed in Slices 1 and 2

**Work**

1. Add orgUnit-specific sender-selection regressions.
2. Add sender-required and sender-ambiguous refusal regressions.
3. Prove replay-key materiality includes sender changes.
4. Prove Telnyx explicit-sender precedence and fallback-only behavior.
5. Keep provider-failure tests proving provider failures remain provider failures after valid sender/target handoff.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand ../../domains/communication/telephony/__tests__/index.test.ts src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`

**Final acceptance**

- The normal ConnectShyft outbound SMS path reaches provider dispatch with both sender and target explicitly present.
- Different orgUnits can dispatch from different configured numbers.
- Missing or ambiguous sender ownership refuses before provider dispatch.
- `TELNYX_FROM_NUMBER` remains fallback-only behavior.
- Existing target-resolution behavior remains intact.
