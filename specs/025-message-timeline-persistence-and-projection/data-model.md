# Data Model: ConnectShyft Message Timeline Persistence and Projection

## Overview

Feature `025` introduces a read-only message timeline derived from canonical thread events. The design does not create timeline persistence. Instead, it formalizes the canonical event fields required for projection, the response envelope used by the new route, and the future-compatible shapes needed for voice and voicemail expansion.

## Naming Convention

- Internal module, service, and data-model fields use camelCase.
- External HTTP DTO fields use snake_case.
- `threadTimelineDto.ts` performs the camelCase-to-snake_case translation for route responses.

## Entity: Canonical Thread Event

**Purpose**

Represents the immutable source-of-truth record for a thread activity. Timeline items are derived from these events and never persisted separately.

**Fields**

- `eventId`: canonical event identifier used as the stable item `id`
- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `aggregateId`: thread identifier
- `aggregateType`: `Thread`
- `eventType`: canonical event type such as `MessageDelivered` or `MessageQueued`
- `eventName`: provider-neutral timeline-facing event name when present
- `occurredAtUtc`: event timestamp used for primary ordering
- `channel`: `sms`, `voice`, or `voicemail`
- `direction`: `inbound` or `outbound`
- `actor`: `system`, `user`, or `neighbor`
- `providerMetadata`: optional provider-neutral metadata retained for debugging or future delivery state
- `inboundMessageArtifact`: optional inbound SMS artifact with `body`, `from`, and `to`
- `outboundMessageArtifact`: optional outbound SMS artifact with `body`, `from`, and `to`
- `voicemailArtifact`: optional future voicemail artifact with recording or transcript metadata

**Validation rules**

- Canonical events remain the only source of truth for timeline content.
- `aggregateId` must identify exactly one thread within one tenant scope.
- `occurredAtUtc` plus `eventId` defines deterministic ordering.
- SMS timeline-eligible canonical events must expose a message body through the canonical payload.
- Actor semantics used by the projection must be available from canonical data rather than reconstructed from non-canonical sources.

**Relationships**

- One `Canonical Thread Event` may project into zero or one `Timeline Item Projection`.
- Many canonical events belong to one `Thread Timeline Response`.

## Entity: Timeline Access Context

**Purpose**

Represents the authorization and visibility rules applied when reading a projected timeline.

**Fields**

- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `threadId`: requested thread
- `includeDeleted`: whether deleted-neighbor review is requested
- `accessMode`: `standard` or `admin_debug`
- `neighborDeleted`: internal deleted-neighbor status used while assembling the response
- `neighborDeletedAtUtc`: internal deleted-neighbor timestamp used while assembling the response

**Validation rules**

- Every timeline read must be tenant-scoped.
- `includeDeleted = true` requires the same tenant-privileged admin/debug authorization used by deleted-aware thread detail.
- Standard operational access must exclude deleted neighbors and their threads entirely.
- Cross-tenant requests must not reveal thread existence or timeline content.

**Relationships**

- One access context yields one `Thread Timeline Response` or one refusal.
- Access context reads deleted-neighbor metadata from existing thread read contracts rather than from timeline item storage.

## Entity: Timeline Item Projection

**Purpose**

Represents the read-only first-class artifact rendered in thread history.

**Fields**

- `id`: canonical event identifier
- `threadId`: thread identifier
- `type`: `message`, future `voice_event`, or future `voicemail`
- `direction`: `inbound` or `outbound`
- `channel`: `sms`, future `voice`, or future `voicemail`
- `body`: SMS body text; optional for future non-SMS items
- `occurredAtUtc`: canonical event timestamp
- `actor`: `system`, `user`, or `neighbor`
- `providerMetadata`: optional provider-neutral metadata
- `deliveryStatus`: optional future delivery-state field

**Validation rules**

- Each item must be derived from exactly one canonical event.
- SMS items must include `body`.
- Items must sort in ascending `(occurred_at_utc, id)` order.
- Projection must not invent fields or item order outside canonical source data.
- Projection must remain stable even when multiple events share the same timestamp.
- The HTTP DTO converts these fields to `thread_id`, `occurred_at_utc`, `provider_metadata`, and `delivery_status`.

**Relationships**

- Belongs to one `Thread Timeline Response`.
- Is derived from one `Canonical Thread Event`.

## Entity: Voicemail Timeline Item

**Purpose**

Represents the forward-compatible placeholder for voicemail artifacts inside the same ordered thread history.

**Fields**

- All `Timeline Item Projection` identity fields
- `type`: `voicemail`
- `channel`: `voicemail`
- `recording_url`: optional future recording location
- `duration_seconds`: optional future voicemail duration
- `transcript`: optional future transcription text

**Validation rules**

- Voicemail items must remain representable even when recording URL, duration, or transcript are not yet populated.
- Voicemail items must follow the same deterministic ordering rules as SMS items.
- Voicemail support remains contract-first in this slice; no separate voicemail-only timeline model is allowed.

**Relationships**

- A voicemail item is a specialized `Timeline Item Projection`.
- It is derived from a canonical voicemail event or voicemail artifact event.

## Entity: Thread Timeline Response

**Purpose**

Represents the route-level response returned by the new timeline endpoint.

**Fields**

- `threadId`: requested thread identifier
- `neighborDeleted`: boolean thread-level deleted-neighbor flag exposed by the route
- `neighborDeletedAtUtc`: deleted-neighbor timestamp exposed by the route
- `deterministic`: `true` to indicate stable ordering
- `items`: ordered array of `Timeline Item Projection`
- `source`: canonical event source marker
- `limitApplied`: effective maximum number of canonical events projected for the current read

**Validation rules**

- Response order must already be oldest-to-newest.
- Response must not include items from another tenant.
- Deleted-neighbor flags must come from existing deleted-aware thread metadata and not be duplicated onto every item.
- The response remains read-only and does not acknowledge any timeline mutation path.
- The HTTP DTO converts `neighborDeleted`, `neighborDeletedAtUtc`, and `limitApplied` into `neighbor_deleted`, `neighbor_deleted_at_utc`, and `limit_applied`.

**Relationships**

- Contains many `Timeline Item Projection` records.
- Uses one `Timeline Access Context`.

## State Transitions

### Projection Visibility

- `canonical event recorded -> projected item visible on subsequent timeline reads`
- `no canonical events -> empty timeline response`

### Deleted-Neighbor Visibility

- `active neighbor thread -> standard-visible`
- `soft-deleted neighbor thread -> hidden from standard access`
- `soft-deleted neighbor thread -> visible in admin_debug access with deleted flags`

### Future Channel Expansion

- `sms item -> current first-class implementation`
- `voice lifecycle event -> future first-class item under the same ordering contract`
- `voicemail artifact event -> future first-class voicemail item under the same ordering contract`
