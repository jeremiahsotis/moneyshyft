# Feature Specification: ConnectShyft Message Timeline Projection

**Feature Branch**: `025-message-timeline-persistence-and-projection`  
**Created**: 2026-03-19  
**Status**: Ready for Planning  
**Input**: User description: "Provide a unified, ordered timeline per thread that includes inbound and outbound SMS as first-class artifacts, with a projection model derived from canonical events. Establish a forward-compatible contract for voice events and voicemails."

## Scope

- Deliver a unified per-thread timeline retrieval contract that elevates inbound and outbound SMS into first-class timeline items instead of exposing only raw event history.
- Keep canonical events as the sole source of truth and treat the timeline as a read projection derived from those events.
- Preserve a stable contract that can later represent voice call lifecycle events and voicemail artifacts in the same ordered thread history.
- Keep deleted-neighbor history available to authorized admin/debug review through tenant-scoped retrieval while excluding deleted-neighbor threads from standard non-admin timeline reads.
- Introduce bounded most-recent retrieval through an optional `limit` without changing item identity or ordering semantics.

## Projection Principles

- Canonical events are the source of truth for thread-history changes, and the timeline is a read model derived exclusively from them.
- No UI surface or out-of-band process may write directly to timeline state or mutate it outside the canonical event pipeline.
- Timeline ordering is oldest to newest using `(occurred_at_utc, canonical_event_id)` as the deterministic sort key.

## Operational Boundaries

- This feature adds ConnectShyft-owned thread history retrieval and projection behavior only; consumer UI adoption is deferred to a later slice.
- Existing raw canonical event retrieval remains available during rollout for rollback and debug.
- Existing admin authentication and non-ConnectShyft lane ownership remain unchanged.
- This feature does not introduce a user-editable history source, a manual timeline repair tool, or a second source of truth for conversation history.

## Non-Goals

- Rewriting or manually correcting canonical events.
- Cursor pagination, channel filtering, attachments or MMS, or read receipts.
- New soft-delete, restore, or hard-delete workflows beyond honoring the existing deleted-neighbor contract.
- Separate inboxes or operator workflows for voice or voicemail; only the forward-compatible timeline contract is required now.
- Composer placement or call-control layout changes in any ConnectShyft client UI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review a Complete SMS Thread in Order (Priority: P1)

As a ConnectShyft operator, I need the thread timeline API to return inbound and outbound SMS in one unified history ordered from oldest to newest, so any client can present the conversation consistently without re-projecting raw events.

**Why this priority**: This is the core delivery outcome for the slice. Without a unified ordered API response, downstream clients must keep translating raw event history themselves.

**Independent Test**: This can be fully tested by requesting the timeline endpoint for threads with mixed inbound and outbound SMS canonical events and confirming that the projected response returns the expected items in ascending order, uses deterministic tie-breaking, supports bounded retrieval through `limit`, and returns an empty `items` array when no eligible events exist.

**Acceptance Scenarios**:

1. **Given** a thread has canonical inbound and outbound SMS events, **When** the timeline endpoint is requested, **Then** the response shows both directions as first-class items in oldest-to-newest order.
2. **Given** two canonical events in the same thread share the same event time, **When** the timeline is projected, **Then** their order remains stable using event time followed by canonical event identifier.
3. **Given** a canonical SMS event carries provider-specific metadata, **When** the timeline item is projected, **Then** the metadata appears only in the optional provider metadata field and the required item fields still appear normally.
4. **Given** a thread has no timeline-eligible canonical events yet, **When** the timeline endpoint is requested, **Then** the response returns an empty `items` array rather than inventing SMS items.
5. **Given** a thread has more eligible canonical events than the requested `limit`, **When** the timeline endpoint is requested with that `limit`, **Then** the response returns the most recent eligible items only and preserves oldest-to-newest ordering within the returned window.

---

### User Story 2 - Review Deleted-Neighbor History Without Reintroducing It to Operations (Priority: P2)

As an authorized admin or support reviewer, I need timelines for threads linked to soft-deleted neighbors to remain available in debug or review contexts while staying hidden from standard non-admin retrieval, so history remains auditable without returning deleted records to day-to-day workflows.

**Why this priority**: Deleted-neighbor behavior is a hard business constraint. The feature must preserve history for investigation while keeping standard operations clean and safe.

**Independent Test**: This can be fully tested by requesting timelines for active and soft-deleted-neighbor threads in both authorized admin/debug review and standard non-admin contexts, then confirming only the authorized review path can see deleted-neighbor timelines and no cross-tenant data appears.

**Acceptance Scenarios**:

1. **Given** a thread is linked to a soft-deleted neighbor, **When** an authorized admin/debug reviewer requests the deleted-aware timeline retrieval path, **Then** the thread remains queryable and its timeline is returned from canonical events.
2. **Given** a thread is linked to a soft-deleted neighbor, **When** a standard non-admin timeline retrieval path is used, **Then** that deleted-neighbor thread is excluded entirely from that retrieval path.
3. **Given** a requester attempts to load a thread outside the current tenant scope, **When** the timeline read is evaluated, **Then** no thread existence, message content, or timeline metadata is revealed.

---

### User Story 3 - Extend the Same Timeline Contract to Voice and Voicemail Later (Priority: P3)

As a product or platform owner, I need the timeline contract to remain compatible with future voice call and voicemail history, so later channel expansion does not require a second conversation model or break existing SMS timeline consumers.

**Why this priority**: The current slice focuses on SMS, but the contract must avoid boxing the product into an SMS-only history model that becomes expensive to replace later.

**Independent Test**: This can be fully tested by validating sample future voice-started, voice-connected, voice-ended, and voicemail canonical events against the declared timeline contract and confirming they fit without breaking current SMS item ordering or identity behavior.

**Acceptance Scenarios**:

1. **Given** future canonical voice call events exist for call started, connected, and ended, **When** they are projected into the timeline, **Then** they can appear in the same thread history without changing the ordering rules used for SMS items.
2. **Given** a future canonical voicemail event exists, **When** it is projected into the timeline, **Then** the timeline contract can represent it as `type = voicemail` with reserved recording and duration fields even when those values are not yet populated.
3. **Given** a thread eventually contains SMS items plus future voice or voicemail items, **When** the timeline is projected, **Then** all items still share one per-thread identity model and one deterministic ordering rule.

### Edge Cases

- A thread has no canonical events eligible for timeline rendering yet.
- Multiple canonical events share the same `occurred_at_utc` and must still render in a deterministic order.
- An SMS canonical event omits optional provider metadata or a future delivery status value.
- An authorized admin/debug reviewer can inspect a deleted-neighbor thread, but standard non-admin retrieval cannot discover or reopen it.
- A future voicemail item has no recording URL or transcript yet and still must remain representable in the contract.
- A thread identifier or canonical event identifier exists in another tenant, and the current tenant must learn nothing from that overlap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST derive thread timeline content exclusively from canonical thread events and MUST NOT allow direct timeline writes or edits from UI surfaces or any mutation path outside the canonical event pipeline.
- **FR-002**: The system MUST provide a unified thread timeline that includes inbound SMS and outbound SMS as first-class timeline items.
- **FR-003**: The system MUST order timeline items in ascending event-time order and MUST use `(event_time, canonical_event_id)` as the stable deterministic tie-breaker.
- **FR-004**: Every timeline item MUST include `id`, `thread_id`, `direction`, `channel`, `occurred_at_utc`, and `actor`. SMS items MUST also include `body`. Timeline items MAY include `provider_metadata` and `delivery_status` when canonical source data exists.
- **FR-005**: For the current SMS slice, the system MUST project `channel = sms` and MUST preserve whether each item is inbound or outbound.
- **FR-006**: The system MUST derive `actor` as one of `system`, `user`, or `neighbor` from canonical event context and preserve that value in the projection.
- **FR-007**: The timeline retrieval contract MUST return items in stable ascending order so a consuming client can render the newest returned item last without client-side reordering.
- **FR-008**: The system MUST NOT invent, reorder, or backfill timeline items beyond what the canonical event record authorizes, except to show an empty history when no eligible canonical events exist.
- **FR-009**: Authorized admin or debug reads for threads linked to soft-deleted neighbors MUST continue to return the thread timeline without resurrecting or reactivating the deleted neighbor.
- **FR-010**: Non-admin retrieval paths for the timeline MUST exclude soft-deleted-neighbor threads entirely. Admin/debug retrieval paths MAY return them only when explicitly authorized and MUST surface deletion metadata.
- **FR-011**: Timeline queries MUST be strictly tenant-scoped and MUST NOT reveal thread existence, item content, provider metadata, or any other timeline detail across tenants.
- **FR-012**: The timeline contract MUST remain forward-compatible with voice call lifecycle items that use the same per-thread identity and ordering rules and can represent call started, call connected, and call ended activity under `channel = voice`.
- **FR-013**: The timeline contract MUST support voicemail items under `channel = voicemail` and `type = voicemail`, and it MUST reserve `recording_url`, `duration_seconds`, and optional `transcript` fields for voicemail items even when those values are not yet populated.
- **FR-014**: The timeline retrieval contract MUST accept an optional `limit` parameter. When `limit` is omitted, the response MUST return up to the default maximum of 200 most recent eligible timeline items. When `limit` is provided, the response MUST return up to that many most recent eligible timeline items, ordered oldest-to-newest within the returned window, with a maximum effective value of 200 items per response.
- **FR-015**: Filtering by channel, attachments or MMS, and read receipts MUST NOT be required for this feature to be considered complete.

### Key Entities *(include if feature involves data)*

- **Canonical Thread Event**: The immutable recorded event that represents a thread activity and remains the source of truth for message, voice, or voicemail history.
- **Timeline Item Projection**: The read-only item shown in thread history, derived from one canonical event and shaped for stable display and future channel expansion.
- **Thread Timeline**: The ordered collection of projected timeline items for one thread within one tenant and one access context.
- **Timeline Access Context**: The authorization and visibility context that distinguishes standard operational views from authorized admin or debug review.
- **Voicemail Timeline Item**: A future-compatible first-class timeline item representing voicemail content plus reserved recording and transcript metadata.

## Dependencies

- Existing canonical event capture remains the authoritative feed for inbound and outbound SMS thread history.
- Existing deleted-neighbor access rules continue to distinguish standard non-admin retrieval from authorized admin/debug review.
- Existing tenant context remains available before any thread timeline read is evaluated.

## Assumptions

- Current acceptance requires first-class SMS timeline items now; voice call and voicemail support are contract commitments for later slices rather than fully implemented behaviors in this slice.
- The timeline item contract may introduce a `type` discriminator for future non-SMS items without changing the required SMS fields in this slice.
- Future non-SMS items may omit `body` while still conforming to the same identity and ordering rules.
- Consumer UI adoption is deferred; this slice defines and verifies the retrieval contract only.
- `limit` applies to the most recent eligible timeline items and preserves oldest-to-newest ordering within the returned window.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance validation, 100% of sampled threads with mixed inbound and outbound SMS canonical events render oldest to newest with stable ordering that matches `(occurred_at_utc, canonical_event_id)`.
- **SC-002**: In contract validation, 100% of SMS timeline items expose the required identity, thread, direction, channel, body, `occurred_at_utc`, and actor fields, and optional provider metadata appears only when canonical source data exists.
- **SC-003**: In API-consumer validation, 100% of clients that render the response array top-to-bottom display the newest returned item last without additional client-side sorting.
- **SC-004**: In admin/debug validation, 100% of sampled threads linked to soft-deleted neighbors remain reviewable with their timelines intact, while 100% of equivalent non-admin retrieval attempts exclude those deleted-neighbor threads.
- **SC-005**: In tenant-isolation validation, 0 cross-tenant timeline reads reveal thread existence, item content, provider metadata, or any other timeline detail to the wrong tenant.
- **SC-006**: In governance validation, 100% of accepted timeline changes appear only after their canonical events exist, and 0 accepted scenarios rely on direct UI-authored timeline writes or out-of-band timeline mutation.
- **SC-007**: In contract review, 100% of sample future voice-started, voice-connected, voice-ended, and voicemail events fit the declared timeline item contract without changing the identity or ordering rules used by current SMS timeline items.
- **SC-008**: In bounded-retrieval validation, 100% of sampled threads with more than 200 eligible canonical events return exactly the requested most recent window when `limit` is provided, and every returned window remains in stable ascending order.
