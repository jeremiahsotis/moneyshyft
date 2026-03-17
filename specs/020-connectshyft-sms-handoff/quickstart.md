# Quickstart: ConnectShyft SMS Dispatch Handoff

## Goal

Implement the permanent outbound SMS handoff fix in three narrow slices, verify each slice before moving on, and remove temporary instrumentation before final closure.

## Slice Order

1. Route-level invariant hardening
2. Temporary handoff instrumentation and first-divergence verification
3. Regression coverage and instrumentation removal

## Slice 1: Route-Level Invariant Hardening

**Source target**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

**Work**

1. Add the route-local dispatch-ready SMS target helper.
2. Reuse the existing SMS-target refusal family for invariant failure.
3. Call the helper in `performOutboundAction` before `adapter.sendSms(...)`.
4. Export the helper with a `ForTests` alias.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`

**Commit checkpoint**

- Safe to commit once the route file builds and the targeted route suite passes.

## Slice 2: Temporary Handoff Instrumentation

**Source targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `infrastructure/communications/telnyx/index.ts`

**Work**

1. Add temporary logs only at the six approved handoff points.
2. Build the ConnectShyft API again.
3. Reproduce exactly one composer-origin SMS send for the known failing thread from the `020` handoff context.
4. Compare the six-log chain and identify the first divergent boundary, if any.
5. Apply a permanent fix only at that first divergent boundary.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`

**Verification checkpoint**

- Rebuild/restart the ConnectShyft API runtime used for manual verification.
- Trigger one composer send.
- Capture:
  - `SMS_TARGET_AFTER_RESOLUTION`
  - `SMS_DISPATCH_COMMAND`
  - `CONNECTSHYFT_PROVIDER_WRAPPER_SENDSMS`
  - `TELNYX_SENDSMS_COMMAND`
  - `TELNYX_SENDSMS_REQUEST_PAYLOAD`
  - `TELNYX_SENDSMS_ERROR` if present

**Commit checkpoint**

- Do not make a final commit here.
- If a temporary verification commit is required, it must be removed or superseded in Slice 3.

## Slice 3: Regression Coverage and Instrumentation Removal

**Source targets**

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`
- whichever single production file or files were permanently changed in Slices 1 and 2

**Work**

1. Add the composer success-path route regression.
2. Add the invariant-refusal regression through the exported route-local helper.
3. Tighten the provider-failure regression so it still proves provider failures remain provider failures only after a valid handoff.
4. Add the provider-wrapper pass-through regression.
5. Keep Telnyx defensive validation coverage passing after any send-path refactor.
6. Remove all temporary instrumentation.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`
- `rg -n "SMS_TARGET_AFTER_RESOLUTION|SMS_DISPATCH_COMMAND|CONNECTSHYFT_PROVIDER_WRAPPER_SENDSMS|TELNYX_SENDSMS_COMMAND|TELNYX_SENDSMS_REQUEST_PAYLOAD|TELNYX_SENDSMS_ERROR" /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`

**Final acceptance**

- Composer-origin SMS remains server-resolved.
- No missing-target condition surfaces as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`.
- `adapter.sendSms()` is never invoked without a dispatch-ready `targetPhone`.
- True provider failures still surface as provider failures.
- The final `rg` check returns no matches unless temporary retention was explicitly approved for short-lived verification.
