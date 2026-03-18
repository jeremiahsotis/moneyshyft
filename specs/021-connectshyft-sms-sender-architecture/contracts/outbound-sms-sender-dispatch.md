# Contract: ConnectShyft Outbound SMS Sender Dispatch

## Objective

Make sender ownership explicit before ConnectShyft outbound SMS reaches provider dispatch, while keeping target resolution intact and preserving `TELNYX_FROM_NUMBER` as fallback-only adapter behavior.

## Allowed runtime surface

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - route-local sender resolver
  - current SMS target-resolution block
  - `performOutboundAction(...)`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
  - `sendSms(command)` pass-through only
- `domains/communication/telephony/index.ts`
  - `TelephonySendSmsCommand`
  - `TelephonyDispatchReplayKeyInput`
  - `buildTelephonyDispatchReplayKey(...)`
- `infrastructure/communications/telnyx/index.ts`
  - `buildSmsPayload(...)`
  - `sendSms(command)`
- Existing related tests only:
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
  - `domains/communication/telephony/__tests__/index.test.ts`
  - `infrastructure/communications/telnyx/__tests__/index.test.ts`

## Request contract

- Composer-origin requests to `POST /api/v1/connectshyft/threads/:threadId/messages` continue sending message `body` without a sender field.
- Explicit-target SMS flows may continue to send `targetPhone`.
- No frontend request-contract change is authorized by this feature.

## Dispatch command contract

### `TelephonySendSmsCommand`

**Required fields for the normal ConnectShyft path**

- `tenantId`
- `orgUnitId`
- `threadId`
- `providerKey`
- `body`
- `targetPhone`
- `senderPhone`

**Compatibility behavior**

- `senderPhone` may be omitted only for fallback-only adapter behavior outside the normal ConnectShyft sender-owned path.

## Boundary rules

1. ConnectShyft route logic owns outbound SMS sender selection.
2. The normal ConnectShyft outbound SMS path must resolve both `targetPhone` and `senderPhone` before calling `adapter.sendSms(...)`.
3. `connectShyftNumberMappingServiceAsync.listMappings(tenantId, orgUnitId)` is the active configured sender source. Exactly one active mapping is dispatchable; zero or multiple active mappings must refuse.
4. Current thread outbound context such as `preferredOutboundCsNumberId` may inform metadata and future join work, but this feature may not invent a new persistence join to number mappings.
5. `providerRegistry.sendSms()` must forward `senderPhone` and `targetPhone` unchanged.
6. Telnyx payload building must prefer `senderPhone` over `TELNYX_FROM_NUMBER`.
7. `TELNYX_FROM_NUMBER` may still support fallback-only adapter behavior when `senderPhone` is absent, but it is not the primary sender source of truth for the normal ConnectShyft route.
8. Existing target-resolution behavior remains intact.

## Error-semantics rules

- Missing or ambiguous sender ownership must return ConnectShyft business refusals before provider dispatch.
- Sender-resolution refusals must not be reported as target-resolution refusals or provider failures.
- True provider failures remain provider failures only after a dispatch-ready command with both sender and target has crossed into provider execution.
- Response-envelope shape remains unchanged.

## Idempotency rules

- `buildTelephonyDispatchReplayKey(...)` must include `senderPhone` in the material request fingerprint.
- Route-level outbound request summaries must include `senderPhone`.
- Reusing the same idempotency key with a different sender is a materially different request.

## Must hold constant

- Voice and bridge dispatch behavior
- Neighbor CRUD behavior
- User-settings behavior
- Frontend request shape
- Auth/admin routing and deployment/database contracts outside this ConnectShyft SMS path
