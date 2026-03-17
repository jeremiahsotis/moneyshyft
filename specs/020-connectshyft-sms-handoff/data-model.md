# Data Model: ConnectShyft SMS Dispatch Handoff

## Overview

This feature does not add new persisted tables or new public request fields. It tightens behavior around existing runtime concepts that already exist in the ConnectShyft outbound SMS path.

## Entity: Resolved SMS Target

**Purpose**

Represents the route-level outcome of server-side SMS target resolution for composer-origin sends.

**Fields**

- `threadId`: outbound thread identity
- `neighborId`: linked neighbor identity when available
- `requestedTargetPhone`: explicit outbound request target when present
- `resolvedTargetPhone`: server-resolved SMS target when deterministic
- `source`: `explicit_request`, `primary_active_valid_phone`, `only_active_valid_phone`, or `test_override_fallback`
- `resolutionOutcome`: `resolved` or `refused`

**Validation rules**

- Composer-origin sends may omit `requestedTargetPhone`.
- A resolved target must be valid for SMS delivery.
- A refusal must occur when deterministic targeting is not available.

**Relationships**

- Produced by `resolveConnectShyftSmsTarget`.
- Consumed by `performOutboundAction`.

## Entity: Dispatch-Ready SMS Target

**Purpose**

Represents the route-owned SMS target state that is allowed to cross into provider dispatch.

**Fields**

- `targetPhone`: normalized non-empty SMS destination
- `normalized`: boolean indicator that route-level normalization has been applied
- `dispatchAllowed`: boolean indicator that provider dispatch may proceed

**Validation rules**

- `targetPhone` must be non-empty after normalization.
- `dispatchAllowed` is true only when `targetPhone` is present and dispatch-ready.
- `adapter.sendSms()` must never be called when this entity is absent.

**Relationships**

- Derived from a `Resolved SMS Target`.
- Consumed by `providerRegistry.sendSms()` and the Telnyx adapter only after the route invariant passes.

## Entity: Domain SMS Refusal

**Purpose**

Represents a ConnectShyft business refusal returned before provider dispatch when the system cannot safely send SMS.

**Fields**

- `code`: SMS-target refusal code
- `message`: operator-facing refusal message
- `targetResolution.reason`: reason for refusal
- `targetResolution.source`: explicit-request or neighbor-record origin
- `targetResolution.candidatePhones`: deterministic candidate set when relevant
- `uiFeedback`: refusal presentation metadata

**Validation rules**

- Missing-target domain conditions must use the SMS-target refusal family.
- Domain SMS refusals must remain distinct from provider failures.
- The refusal envelope shape remains unchanged.

**Relationships**

- Produced by the resolver or the route-level invariant guard.
- Consumed by existing ConnectShyft refusal rendering.

## Entity: Provider SMS Handoff

**Purpose**

Represents the outbound SMS command as it crosses the route, wrapper, and Telnyx boundaries.

**Fields**

- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `threadId`: thread scope
- `providerKey`: selected provider
- `body`: SMS body
- `targetPhone`: dispatch-ready target
- `idempotencyKey`: idempotency token when present

**Validation rules**

- `targetPhone` must remain unchanged across the route handoff, wrapper handoff, and Telnyx entry boundary.
- Provider failure classification is valid only after a handoff with a dispatch-ready `targetPhone`.

**Relationships**

- Constructed in `performOutboundAction`.
- Forwarded by `providerRegistry.sendSms()`.
- Consumed by `createTelnyxAdapter().sendSms()`.

## Entity: Temporary Handoff Instrumentation Snapshot

**Purpose**

Represents the short-lived diagnostic record used during verification to prove where `targetPhone` remains intact or diverges.

**Fields**

- `logPoint`: one of the six approved instrumentation locations
- `threadId`: correlated thread identifier
- `providerKey`: correlated provider key
- `body`: correlated body or body-presence signal
- `targetPhone`: observed target value at that boundary
- `idempotencyKey`: correlated idempotency key when present

**Validation rules**

- Instrumentation exists only during verification.
- Instrumentation must not alter runtime behavior.
- Instrumentation must be removed before final closure unless explicitly retained for short-lived verification.

## State Transitions

### SMS Target Resolution

- `composer request -> resolved` when the server finds one deterministic valid SMS target
- `composer request -> refused` when the server cannot resolve a deterministic valid target

### Route Dispatch Invariant

- `resolved -> dispatch-ready` when the route normalizes and confirms a non-empty target
- `resolved -> domain refusal` when the route cannot hold a dispatch-ready target before provider dispatch

### Provider Handoff

- `dispatch-ready -> wrapper forwarded` when `providerRegistry.sendSms()` receives the command
- `wrapper forwarded -> adapter payload built` when the Telnyx adapter preserves the same `targetPhone`
- `adapter payload built -> provider success` when Telnyx accepts the request
- `adapter payload built -> provider failure` when Telnyx or transport fails after a valid handoff
