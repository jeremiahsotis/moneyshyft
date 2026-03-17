# Contract: ConnectShyft Outbound SMS Dispatch Boundary

## Objective

Make the ConnectShyft outbound SMS composer path fail closed before provider dispatch whenever the route cannot hold a dispatch-ready `targetPhone`, while preserving true provider failures after a valid handoff.

## Allowed runtime surface

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `resolveConnectShyftSmsTarget`
  - route-local dispatch-ready SMS target helper
  - `performOutboundAction`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
  - `sendSms(command)` pass-through only
- `infrastructure/communications/telnyx/index.ts`
  - `sendSms(command)`
- Existing related tests only:
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
  - `infrastructure/communications/telnyx/__tests__/index.test.ts`

## Request contract

- Composer-origin requests to `POST /api/v1/connectshyft/threads/:threadId/messages` continue sending message `body` without `targetPhone`.
- Explicit-target SMS flows may continue to send `targetPhone`; this feature does not remove that compatibility path.
- No frontend contract change is authorized by this feature.

## Boundary rules

1. `resolveConnectShyftSmsTarget` remains the only server-side SMS target resolver for composer-origin sends.
2. A successful resolver result is not sufficient to call the provider. The route must still confirm that it holds a dispatch-ready, non-empty `targetPhone`.
3. If the route fails that invariant, it must return a ConnectShyft business refusal in the existing SMS-target refusal family and must not call `adapter.sendSms()`.
4. `providerRegistry.sendSms()` must forward the SMS command unchanged and must not normalize, replace, or clear `targetPhone`.
5. The Telnyx adapter may continue to defensively reject missing `targetPhone`, but that rejection is a last-resort guard and not the intended domain failure path.
6. A true provider failure may be surfaced as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED` only after the route has already handed off a dispatch-ready SMS command.

## Error-semantics rules

- Missing-target domain conditions must map to the SMS-target refusal family, not a provider failure.
- Provider failures remain provider failures when the route hands off a valid SMS command and the provider layer then fails.
- The refusal envelope contract remains unchanged.

## Temporary instrumentation contract

Temporary instrumentation is allowed only at these six points:

1. immediately after SMS target resolution in `performOutboundAction`
2. immediately before `adapter.sendSms()`
3. `providerRegistry.sendSms()` entry
4. Telnyx `sendSms()` entry
5. immediately before Telnyx payload dispatch
6. Telnyx adapter error catch

The instrumentation must:

- log only the fields needed to correlate handoff integrity,
- stay local to these boundaries,
- be removed before final closure unless explicitly retained for a short-lived verification window.

## Must hold constant

- Composer request shape
- Provider abstraction design
- Shared telephony command contracts in `domains/communication/telephony/index.ts`
- Frontend source files
- Auth/admin routing and deployment/database contracts outside this ConnectShyft SMS path
