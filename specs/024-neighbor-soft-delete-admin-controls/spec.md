# Feature Specification: ConnectShyft Neighbor Soft Delete Controls

**Feature Branch**: `024-neighbor-soft-delete-admin-controls`  
**Created**: 2026-03-18  
**Status**: Ready for Planning  
**Input**: User description: "Enable safe removal of neighbors from operational use without destroying data, while preserving auditability and allowing controlled reuse of phone numbers. This PR introduces soft delete as the only supported deletion mechanism."

## Scope

- Replace operational neighbor deletion with an auditable soft-delete lifecycle.
- Remove soft-deleted neighbors from standard operational flows while preserving their history.
- Release deleted neighbors' phone numbers for future valid reuse by deactivating those phone assignments.
- Preserve historical threads and expose deleted-state context in admin/debug review flows.
- Ensure inbound SMS to deleted-only phone ownership creates a new neighbor instead of resurrecting the deleted one.

## Routing Ownership & Lane Boundaries

- `DELETE /api/v1/connectshyft/neighbors/:neighborId` and deleted-aware neighbor/thread detail reads remain ConnectShyft-lane owned under `/api/v1/connectshyft/*`.
- `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain `admin-api` owned and are unchanged by this feature.
- The feature uses the shared Postgres `connectshyft` schema and the existing neighbor lifecycle columns already owned by canonical production migrations under `shared/database/migrations`.
- This feature does not introduce a ConnectShyft-owned production migration executor or any new cross-lane API dependency.

## Non-Goals

- Hard deletion of neighbors or related records.
- Restore or undo flows for deleted neighbors.
- Cascade deletion of threads, messages, or phone history.
- Merge workflows, permanent deletion pipelines, retention policy decisions, or UI implementation details.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safely Remove a Neighbor from Operations (Priority: P1)

As an authorized administrator, I need to remove a neighbor from active operational use without erasing history, so staff can stop messaging, calling, or selecting the record while the system keeps an auditable record of what happened.

**Why this priority**: This is the core business outcome. Without a safe soft-delete flow, staff either keep invalid neighbors active or risk destructive data loss.

**Independent Test**: This can be fully tested by submitting an authorized soft-delete request with irreversible confirmation and verifying the neighbor is marked deleted, phones are deactivated, standard operational flows exclude the neighbor, and an audit record exists.

**Acceptance Scenarios**:

1. **Given** an active neighbor and an authorized administrator with elevated capability, **When** the administrator submits a soft-delete request with irreversible confirmation, **Then** the neighbor is marked deleted, the deletion actor and timestamp are recorded, all associated phones become inactive, an audit event is created for that deletion, and no historical neighbor data is physically removed.
2. **Given** a soft-deleted neighbor, **When** standard list, search, messaging-selection, or calling-selection flows run, **Then** the deleted neighbor is excluded from those operational results.
3. **Given** a soft-delete request is submitted without irreversible confirmation, **When** the request is evaluated, **Then** the request fails and the neighbor plus associated phones remain unchanged.
4. **Given** a soft-delete request is submitted by a user without the required elevated administrative capability, **When** the request is evaluated, **Then** the request fails and no deletion or phone deactivation occurs.
5. **Given** a soft-delete request targets a neighbor who is already soft-deleted, **When** the request is evaluated, **Then** the existing deleted state and prior audit history remain preserved, no additional phone changes occur, and no second soft-delete audit event is created.

---

### User Story 2 - Review Deleted Neighbor History in Admin Context (Priority: P2)

As an administrator or support reviewer, I need deleted neighbors and their historical threads to remain available in admin/debug review flows, so I can investigate prior activity and confirm who deleted the record and when.

**Why this priority**: Auditability is a stated requirement. Deleted neighbors must disappear from normal operations without becoming invisible to authorized internal review.

**Independent Test**: This can be fully tested by retrieving a soft-deleted neighbor and related threads through the existing ConnectShyft detail routes with `includeDeleted=true` and confirming deletion metadata is visible while the same records stay hidden from normal operational flows.

**Acceptance Scenarios**:

1. **Given** a neighbor has been soft-deleted, **When** an authorized administrator requests the existing neighbor detail route with `includeDeleted=true`, **Then** the deleted neighbor remains queryable and clearly shows `is_deleted`, `deleted_at_utc`, and `deleted_by_user_id`.
2. **Given** a thread belongs to a soft-deleted neighbor, **When** an authorized administrator requests the existing thread detail route with `includeDeleted=true`, **Then** the thread remains available and includes `neighbor_deleted = true` plus the neighbor deletion timestamp.
3. **Given** a thread belongs to a soft-deleted neighbor, **When** normal operational thread flows are used, **Then** that thread is excluded from those normal flows.

---

### User Story 3 - Continue Intake After a Deleted Neighbor's Phone Is Reused (Priority: P3)

As an operator handling inbound SMS, I need messages sent to a phone previously owned only by a soft-deleted neighbor to continue intake without reviving the deleted record, so new conversations can start cleanly and safely.

**Why this priority**: Soft delete is incomplete if released phone numbers cannot be reused safely or if inbound intake revives records that were intentionally retired from operations.

**Independent Test**: This can be fully tested by processing inbound SMS for a phone held only by a soft-deleted neighbor and verifying the system creates a new neighbor, leaves the deleted record unchanged, and preserves the historical deleted neighbor data for admin review.

**Acceptance Scenarios**:

1. **Given** a phone is associated only with a soft-deleted neighbor and is no longer active for that deleted record, **When** inbound SMS arrives for that phone, **Then** the system creates a new neighbor instead of resurrecting the deleted neighbor.
2. **Given** inbound SMS arrives for a phone associated only with a soft-deleted neighbor, **When** the message is processed, **Then** processing succeeds without failing solely because the historical deleted neighbor still exists.
3. **Given** a phone released by soft delete has already been reassigned to a new active neighbor, **When** later operational flows or inbound messaging use that phone, **Then** the active current owner is treated as the reusable operational record and the deleted historical owner remains preserved only for admin/debug review.

### Edge Cases

- A soft-delete request targets a neighbor who is already soft-deleted; the system should avoid creating duplicate deletion side effects while still preserving the existing deleted state and audit history.
- A soft-delete request targets a neighbor with no associated phones; the deletion still succeeds and records deletion metadata.
- A deleted neighbor still has historical threads or messages; those records remain preserved for admin/debug review but stay out of normal operational flows.
- A phone released by soft delete is later reassigned to a new active neighbor; the deleted historical owner must not block valid reuse.

### Platform Compatibility Scenarios

1. **Given** host Nginx delegates lane routes by path, **When** an authorized caller submits `DELETE /api/v1/connectshyft/neighbors/:neighborId`, **Then** the request resolves to the ConnectShyft API and `/api/v1/auth/*` plus `/api/v1/platform/admin/*` continue resolving to `admin-api`.
2. **Given** the shared Postgres schema already contains the neighbor lifecycle fields under canonical migration ownership, **When** this feature is deployed, **Then** soft-delete reads and writes remain compatible with the shared schema and no ConnectShyft-owned production migration executor is introduced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support soft delete as the only deletion mechanism for neighbors covered by this feature.
- **FR-002**: A successful soft delete MUST mark the neighbor as deleted, set `is_deleted` to true, set `deleted_at_utc`, set `deleted_by_user_id`, and preserve all pre-existing neighbor data.
- **FR-003**: The system MUST allow soft delete only for users with elevated administrative capability.
- **FR-004**: The soft-delete request MUST require an `irreversibleConfirmation` flag. If that flag is absent or false, the request MUST fail without changing the neighbor or associated phones.
- **FR-005**: A successful soft delete MUST set every phone associated with the deleted neighbor to inactive so that the released phone numbers can be reused in future valid neighbor records.
- **FR-006**: Soft-deleted neighbors MUST NOT appear in standard UI queries, standard list/search results, or standard operational selection flows for messaging or calling.
- **FR-007**: Soft-deleted neighbors MUST remain queryable through the existing ConnectShyft detail routes when an authorized admin/debug caller supplies `includeDeleted=true`, and those responses MUST clearly expose `is_deleted`, `deleted_at_utc`, and `deleted_by_user_id`.
- **FR-008**: Threads and related historical conversation records for a soft-deleted neighbor MUST remain preserved and MUST NOT be cascade-deleted.
- **FR-009**: Threads associated with a soft-deleted neighbor MUST remain queryable through the existing ConnectShyft thread detail routes when an authorized admin/debug caller supplies `includeDeleted=true`, and they MUST be excluded from normal operational UI flows.
- **FR-010**: Any thread response returned for a soft-deleted neighbor in an authorized context MUST include `neighbor_deleted = true` and `neighbor_deleted_at_utc`.
- **FR-011**: A first-time successful soft delete MUST create an audit event that includes the deleted neighbor identifier, the actor user identifier, and the deletion timestamp.
- **FR-012**: If inbound SMS arrives for a phone whose only prior ownership is tied to a soft-deleted neighbor, the system MUST create a new neighbor, MUST NOT resurrect the deleted neighbor, and MUST NOT fail solely because the deleted record exists.
- **FR-013**: Phone-number reuse released by soft delete MUST remain compatible with the existing active-phone uniqueness rules so only valid active ownership can block reuse.
- **FR-014**: The system MUST NOT provide hard delete, restore/undo, or cascade deletion behavior as part of this feature.
- **FR-015**: A repeated delete attempt against an already soft-deleted neighbor MUST leave the preserved data and prior deletion history intact and MUST NOT destroy the existing audit trail.

### Key Entities *(include if feature involves data)*

- **Neighbor Record**: The person record used in ConnectShyft operations, including lifecycle state, deletion metadata, and preserved historical profile data.
- **Neighbor Phone Assignment**: The phone ownership record linked to a neighbor that determines whether the number is active for operational use or released for future reuse.
- **Neighbor Thread History**: The preserved conversation history tied to a neighbor, which may remain visible in admin/debug review even after the neighbor leaves normal operations.
- **Neighbor Soft Delete Audit Event**: The internal record showing who performed a soft delete, when it occurred, and which neighbor was affected.

## Assumptions

- Elevated administrative capability already exists or will be defined by the owning team outside this specification.
- Standard operational flows consume list/search and messaging/calling selection behavior separately from admin/debug review flows.
- Messaging-selection and calling-selection flows are served by the same active-neighbor read surfaces covered by this feature, so excluding deleted neighbors from those selector paths removes them from both selector experiences.
- Authorized admin/debug deleted-neighbor review uses the existing ConnectShyft detail routes with `includeDeleted=true` rather than a separate lane or platform-admin route.
- A soft-deleted neighbor's preserved history remains important for support, compliance, and operational investigation even though the record is no longer active.
- When a released phone number is later assigned to a new active neighbor, the active current owner is the only operationally reusable owner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance validation, 100% of authorized soft-delete attempts completed with irreversible confirmation mark the neighbor deleted, capture deletion actor and timestamp, deactivate all associated phones, and preserve historical neighbor data.
- **SC-002**: In regression validation, 100% of soft-deleted neighbors are excluded from standard list, search, messaging-selection, and calling-selection flows.
- **SC-003**: In regression validation, 100% of unauthorized soft-delete attempts or attempts missing irreversible confirmation fail without changing deletion state, phone activity, or audit history.
- **SC-004**: In scripted admin-review validation, reviewers can determine whether a neighbor was deleted, when the deletion occurred, and who performed it for 100% of sampled deleted-neighbor records using the existing ConnectShyft detail routes with `includeDeleted=true` alone.
- **SC-005**: In regression validation, 100% of deleted-neighbor thread reviews performed through the existing ConnectShyft detail routes with `includeDeleted=true` show `neighbor_deleted` and the deletion timestamp, while 100% of equivalent normal operational flows exclude those threads.
- **SC-006**: In inbound messaging validation, 100% of inbound SMS scenarios involving phones owned only by soft-deleted neighbors create a new active neighbor, and 0% resurrect the deleted neighbor or fail solely because the deleted record exists.
- **SC-007**: In phone-reuse validation, 100% of phone numbers released by soft delete can be reassigned to a new valid active neighbor without manual cleanup and without losing the deleted neighbor's historical audit trail.
- **SC-008**: In deployment validation, 100% of soft-delete requests continue to resolve through the ConnectShyft lane route surface, while `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api`, and 100% of sampled soft-delete reads and writes remain compatible with the shared Postgres lifecycle schema without lane-owned production migrations.
