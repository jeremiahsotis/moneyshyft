# Data Model: ConnectShyft SMS Sender Architecture

## Overview

This feature does not add new tables or new public request fields. It tightens the runtime model around existing ConnectShyft thread context, existing orgUnit number mappings, and the shared outbound SMS provider command.

## Entity: Sender Resolution Context

**Purpose**

Represents the ConnectShyft-owned state used to determine outbound SMS sender ownership before provider dispatch.

**Fields**

- `tenantId`: active tenant scope
- `orgUnitId`: active orgUnit scope
- `threadId`: outbound thread identity
- `preferredOutboundCsNumberId`: thread-owned outbound line hint
- `lastInboundCsNumberId`: thread-owned inbound line hint
- `preferredOutboundLabel`: optional read-model label when available
- `activeMappings`: active orgUnit number mappings

**Validation rules**

- `tenantId`, `orgUnitId`, and `threadId` must exist before sender resolution begins.
- Only active orgUnit mappings are eligible sender candidates.
- Thread context is supporting metadata only unless it can be matched deterministically without inventing a new join.

**Relationships**

- Built in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- Uses thread data from `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- Uses mapping data from `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`

## Entity: Owned Sender Resolution

**Purpose**

Represents the route-level outcome of ConnectShyft sender selection before provider dispatch.

**Fields**

- `senderPhone`: explicit outbound sender phone when resolved
- `resolutionOutcome`: `resolved` or `refused`
- `resolutionReason`: `resolved_single_active_mapping`, `missing_sender`, or `ambiguous_sender`
- `activeMappingCount`: number of eligible sender mappings in the active orgUnit
- `mappingLabels`: human-readable mapping labels when available

**Validation rules**

- Resolution succeeds only when exactly one active mapping exists for the active orgUnit.
- Zero active mappings must refuse before provider dispatch.
- More than one active mapping must refuse before provider dispatch.

**Relationships**

- Produced by the route-local sender resolver.
- Consumed by outbound replay-key generation, request summaries, and provider dispatch.

## Entity: Dispatch-Ready SMS Command

**Purpose**

Represents the outbound SMS command that is allowed to cross into provider execution.

**Fields**

- `tenantId`: tenant scope
- `orgUnitId`: orgUnit scope
- `threadId`: thread scope
- `providerKey`: selected provider
- `body`: message body
- `targetPhone`: dispatch-ready SMS destination
- `senderPhone`: dispatch-ready SMS sender
- `idempotencyKey`: idempotency token when present

**Validation rules**

- The normal ConnectShyft path must not dispatch without both `targetPhone` and `senderPhone`.
- `senderPhone` must survive the route boundary, the provider wrapper, and the provider payload builder unchanged.
- The replay-key fingerprint must treat `senderPhone` as material request content.

**Relationships**

- Constructed in `performOutboundAction(...)`
- Forwarded by `providerRegistry.sendSms(...)`
- Consumed by `createTelnyxAdapter().sendSms(...)`

## Entity: Sender Resolution Refusal

**Purpose**

Represents a ConnectShyft business refusal returned when sender ownership cannot be determined safely before provider dispatch.

**Fields**

- `code`: sender-specific refusal code
- `message`: operator-facing refusal message
- `senderResolution.reason`: `missing_sender` or `ambiguous_sender`
- `senderResolution.orgUnitId`: active orgUnit scope
- `senderResolution.threadId`: current thread identity
- `senderResolution.activeMappingCount`: count of eligible sender mappings
- `senderResolution.preferredOutboundCsNumberId`: thread-owned outbound line hint
- `uiFeedback`: refusal presentation metadata

**Validation rules**

- Sender-resolution refusals must remain distinct from target-resolution refusals and provider failures.
- Provider dispatch must not start when this entity is returned.
- Response-envelope shape remains unchanged.

**Relationships**

- Produced by the route-local sender resolver or dispatch-ready sender guard.
- Consumed by existing ConnectShyft refusal rendering.

## Entity: Provider Fallback Sender

**Purpose**

Represents the configured adapter fallback used only when no explicit sender is supplied in the outbound SMS command.

**Fields**

- `configured`: whether fallback exists
- `source`: `TELNYX_FROM_NUMBER`
- `usageMode`: `compatibility_only`

**Validation rules**

- Fallback must never override an explicit `senderPhone`.
- Fallback is not valid as the normal ConnectShyft sender source of truth.
- Provider fallback behavior does not remove the route-owned sender requirement for the normal ConnectShyft path.

## State Transitions

### Sender Resolution

- `sender resolution context -> resolved` when the active orgUnit has exactly one active outbound mapping
- `sender resolution context -> sender refusal` when the active orgUnit has zero or multiple active outbound mappings

### Route Dispatch Readiness

- `resolved sender + resolved target -> dispatch-ready command` when both values are explicit before provider dispatch
- `sender refusal or target refusal -> no dispatch` when either boundary fails before provider execution

### Provider Handoff

- `dispatch-ready command -> wrapper forwarded` when `providerRegistry.sendSms(...)` receives the command unchanged
- `wrapper forwarded -> provider payload built` when the adapter builds the outbound payload with the same sender and target
- `provider payload built -> provider success` when the provider accepts the request
- `provider payload built -> provider failure` when the provider fails after a valid sender/target handoff
