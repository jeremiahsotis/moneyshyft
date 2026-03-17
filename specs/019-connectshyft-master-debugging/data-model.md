# Data Model: ConnectShyft Master Debugging

## Overview

The debugging sequence does not add new persisted entities. It tightens behavior around three existing runtime concepts that already participate in the ConnectShyft lane.

## Entity: Neighbor Preference State

**Purpose**

Represents the canonical texting preference saved for a ConnectShyft neighbor and reused by UI display and SMS policy gating.

**Fields**

- `neighborId`: stable neighbor identity
- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `prefersTexting`: canonical enum `YES | NO | UNKNOWN`
- `source`: persisted neighbor record or approved narrow bridge source
- `updatedAtUtc`: last persisted update time

**Validation rules**

- `prefersTexting` must always be one of `YES`, `NO`, or `UNKNOWN`.
- New neighbor default is `YES`.
- A saved canonical value must not be silently coerced to `UNKNOWN`.
- Any SMS gating decision must read the same canonical value shown to operators.

**Relationships**

- Referenced by neighbor create, update, profile, directory, and snapshot display flows.
- Referenced by SMS preference gating as the only allowed Patch 1 to Patch 3 bridge.

## Entity: Thread Action Outcome

**Purpose**

Represents the result of a ConnectShyft thread action as interpreted by the frontend, including success, business refusal, and transport failure separation.

**Fields**

- `ok`: success flag from the response envelope
- `code`: stable outcome or refusal code
- `message`: operator-facing safe message
- `data`: structured details for refusal rendering or success feedback
- `thread`: updated thread payload when present
- `failureKind`: implicit classification of `business-refusal` versus `transport-failure`

**Validation rules**

- HTTP transport success does not imply action success.
- `ok: false` must be treated as a business refusal.
- Business refusal details must remain available to the UI.
- Transport failures must stay distinct from business refusals.

**Relationships**

- Produced by shared thread action wrappers and consumed by inbox and thread-detail surfaces.
- Acts as the only allowed Patch 2 to Patch 3 bridge.

## Entity: SMS Target Resolution Context

**Purpose**

Represents the candidate inputs and outcome for outbound SMS targeting.

**Fields**

- `threadId`: outbound thread identity
- `neighborId`: linked neighbor identity, if any
- `explicitTargetPhone`: explicit outbound request target if present
- `candidatePhones`: linked neighbor phone candidates visible to runtime resolution
- `primaryActiveValidPhone`: designated primary candidate when active and valid
- `onlyActiveValidPhone`: sole deterministic candidate when exactly one exists
- `resolvedTargetPhone`: final dispatch target when deterministic
- `resolutionOutcome`: `resolved` or `refused`
- `refusalCode`: refusal reason when resolution is not deterministic

**Validation rules**

- Resolution order is fixed: explicit outbound request target, then primary active valid, then only active valid, else refusal.
- Provider dispatch is allowed only when `resolvedTargetPhone` is deterministic.
- SMS send is allowed only when canonical texting preference is `YES`.

**Relationships**

- Consumed inside `performOutboundAction`.
- Surfaced through Patch 2 refusal rendering when resolution fails.

## State Transitions

### Neighbor Preference State

- `create -> YES` when the operator accepts the default
- `create -> explicit canonical value` when the operator selects one
- `update -> canonical value` on profile or related edits
- `persisted value -> gating value` through the locked preference bridge

### Thread Action Outcome

- `request sent -> success` when `ok: true`
- `request sent -> business refusal` when `ok: false`
- `request sent -> transport failure` when the request itself fails

### SMS Target Resolution Context

- `unresolved -> resolved` when an explicit outbound request target or deterministic neighbor target is found
- `unresolved -> refused` when no deterministic target exists
- `resolved -> dispatched` only after texting preference gating allows SMS
