# Data Model

## Entity: ConnectShyftThreadDispatchContext

**Source of truth**: Current outbound thread runtime state assembled in `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Fields**
- `threadId`
- `tenantId`
- `orgUnitId`
- `neighborId`
- `source`
- `state`
- `lastInboundCsNumberId`
- `preferredOutboundCsNumberId`

**Validation rules**
- `neighborId` must resolve from the current thread correlation path before neighbor-based SMS resolution can run
- `source` must reflect the communication method used for the outbound operation and must not be hard-coded to `VOICE` for thread-message sends

**State transitions**
- Outbound message dispatch reconstructs or reuses thread context with `source = SMS`
- Outbound call dispatch reconstructs or reuses thread context with `source = VOICE`

## Entity: ConnectShyftOutboundMessageRequest

**Used by**
- `POST /api/v1/connectshyft/threads/:threadId/messages`

**Fields**
- `body`
- `targetPhone`
- `targetPhoneE164`
- `recipientPhone`
- `target.phone`
- `providerKey`

**Validation rules**
- `body` follows the existing route contract
- Explicit target fields are optional
- If any explicit target field resolves to a non-empty normalized value, that value is treated as the explicit target for the current dispatch and wins over neighbor fallback

## Entity: ConnectShyftNeighborSmsDispatchProfile

**Source of truth**: `connectshyft.cs_neighbors` joined to `connectshyft.cs_neighbor_phones`

**Fields**
- `neighborId`
- `prefersTexting`
- `phones`

**Validation rules**
- `prefersTexting` must be one of `YES`, `NO`, `UNKNOWN`
- Outbound SMS dispatch is allowed only when `prefersTexting = YES`
- Missing neighbor profile or empty phone set prevents deterministic SMS resolution

**Relationships**
- One `ConnectShyftNeighborSmsDispatchProfile` belongs to one linked thread neighbor
- One profile has many `ConnectShyftNeighborPhoneCandidate` records

## Entity: ConnectShyftNeighborPhoneCandidate

**Source of truth**: `connectshyft.cs_neighbor_phones`

**Fields**
- `phoneId`
- `value`
- `sortOrder`
- `isPrimary`
- `isShared`
- `verificationStatus`

**Validation rules**
- `value` must be a non-empty canonical E.164 string to qualify as a candidate
- The current host has no `is_active` field; for this feature, persisted in-scope rows are treated as active candidates
- `isPrimary = true` is used only for deterministic selection priority, not as a standalone send-permission rule

## Entity: ConnectShyftSmsTargetResolutionDecision

**Produced by**
- New route-local SMS resolution helper in `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Fields**
- `resolutionSource`: `explicit-request` | `neighbor-primary` | `neighbor-single` | `none` | `ambiguous`
- `targetPhone`
- `prefersTexting`
- `candidatePhones`
- `deterministic`

**Validation rules**
- `explicit-request` is deterministic when exactly one normalized explicit target is present
- `neighbor-primary` is deterministic only when exactly one primary candidate exists
- `neighbor-single` is deterministic only when exactly one total candidate exists
- `none` and `ambiguous` must map to explicit business refusals before provider dispatch

## Entity: ConnectShyftOutboundSmsRefusal

**Returned by**
- `performOutboundAction()` for pre-provider SMS failures

**Fields**
- `code`
- `message`
- `threadId`
- `neighborId`
- `threadSource`
- `prefersTexting`
- `candidatePhones`
- `explicitTargetProvided`
- `dispatchAttempted`

**Validation rules**
- `dispatchAttempted` must be `false`
- Refusal code must distinguish:
  - no deterministic target phone
  - multiple candidate phones
  - texting not permitted

## Resolution Order

1. Explicit outbound target from the current request
2. Linked neighbor primary phone when exactly one primary candidate exists
3. Linked neighbor only phone when exactly one candidate exists
4. Explicit refusal

## Dispatch Invariants

- Provider adapters receive an already-resolved deterministic `targetPhone`
- Known pre-provider SMS failures never use `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`
- Success responses include a thread object whose `source` matches the outbound communication method
