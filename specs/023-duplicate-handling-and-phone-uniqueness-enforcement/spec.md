# Feature Specification: ConnectShyft Duplicate Phone Handling

**Feature Branch**: `023-duplicate-handling-and-phone-uniqueness-enforcement`  
**Created**: 2026-03-18  
**Status**: Ready for Planning  
**Input**: User description: "Stop creation of duplicate phone assignments across neighbors and enforce deterministic identity behavior when duplicates exist. This PR prevents further data corruption while tolerating existing legacy duplicates until cleanup."

## Scope

- Stop new duplicate normalized phone assignments from being created for current neighbors within the existing ConnectShyft identity boundary.
- Apply the same duplicate-prevention rule to neighbor creation, neighbor updates, and phone add or replace actions.
- Preserve existing legacy duplicate records without automatically merging, deleting, or rewriting them.
- Make phone-based identity resolution fail closed when legacy duplicate records make the result ambiguous.
- Allow phone numbers held only by soft-deleted neighbors to be reused safely.

## Non-Goals

- Background deduplication or automated cleanup of existing duplicate records.
- Identity merging workflows or silent reassignment of phone ownership.
- Household or shared-phone modeling changes beyond the existing current-neighbor rules.
- PeopleCore integration or new cross-system identity orchestration.
- Cleanup tooling, operator merge tools, or other follow-up remediation work planned for PR 024.

## Operational Boundaries

- This feature changes existing ConnectShyft neighbor-management and phone-based identity behaviors only.
- No Admin or MoneyShyft ownership boundaries change.
- No new background jobs, manual cleanup workflows, or operator decision trees are introduced.

## Routing Ownership & Shared-Database Compatibility

- `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain owned by `admin-api`.
- ConnectShyft neighbor-management and phone-identity routes remain owned by the ConnectShyft API lane.
- Shared PostgreSQL remains the only production data store for this feature, and production schema changes continue to run through canonical shared migration authority rather than a lane-owned production migration path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reject Duplicate Assignment Attempts (Priority: P1)

As a ConnectShyft operator, I need phone assignment to stop when a number is already attached to another current neighbor, so I do not create additional identity corruption while editing neighbor records.

**Why this priority**: Preventing new duplicate assignments is the core safety outcome. If this fails, legacy ambiguity keeps growing and downstream identity behavior becomes harder to trust.

**Independent Test**: This can be tested by creating neighbors, updating neighbors, and adding or replacing phones with both unique and already-used phone inputs, then confirming only unique current assignments are accepted and duplicate attempts fail without changing prior ownership.

**Acceptance Scenarios**:

1. **Given** no other current non-deleted neighbor already owns a phone's canonical normalized value, **When** an operator creates a neighbor with that phone, **Then** the create succeeds and the phone remains assigned to the new neighbor.
2. **Given** another current non-deleted neighbor already owns a phone's canonical normalized value in any formatting variant, **When** an operator creates a new neighbor with that phone, **Then** the system refuses the write with a structured duplicate-phone refusal and leaves the existing assignment unchanged.
3. **Given** another current non-deleted neighbor already owns a phone's canonical normalized value, **When** an operator updates a neighbor or adds or replaces a phone with that value, **Then** the system refuses the write with the same duplicate-phone refusal and does not move or merge the phone assignment.
4. **Given** a neighbor already owns a phone's canonical normalized value, **When** the operator saves that same phone for the same neighbor during an edit, **Then** the system treats the phone as unchanged rather than as a duplicate collision.

---

### User Story 2 - Refuse Ambiguous Phone Identity Resolution (Priority: P2)

As a ConnectShyft operator, I need phone lookup to fail clearly when legacy duplicates already exist, so messages and other identity-driven actions never attach to the wrong neighbor.

**Why this priority**: Existing duplicate data cannot be trusted to produce a single owner. The feature must fail deterministically instead of guessing and causing silent misrouting.

**Independent Test**: This can be tested by running phone-based lookup flows with one current match, no current match, and multiple current matches and confirming the result is always a single deterministic outcome with no arbitrary selection.

**Acceptance Scenarios**:

1. **Given** a phone lookup finds exactly one current eligible neighbor for a canonical normalized phone value, **When** identity resolution runs, **Then** the system returns that neighbor as the single match.
2. **Given** a phone lookup finds multiple current eligible neighbors for the same canonical normalized phone value, **When** identity resolution runs, **Then** the system hard fails with an explicit ambiguity refusal and does not select any neighbor.
3. **Given** an upstream workflow depends on phone-based identity resolution and the lookup is ambiguous, **When** the workflow completes, **Then** it returns the ambiguity refusal without creating a new identity, merging records, or attaching the action to any neighbor.

---

### User Story 3 - Reuse Numbers Released by Soft Deletion (Priority: P3)

As a ConnectShyft operator, I need phone numbers from soft-deleted neighbors to be available for reuse, so deleted history does not block valid current neighbor records.

**Why this priority**: Operators still need to recover from ordinary lifecycle changes while the system tightens identity safety. Deleted records should not permanently reserve a phone number.

**Independent Test**: This can be tested by soft-deleting a neighbor that owns a phone, reusing that phone on a different current neighbor, and running phone lookup flows that include deleted-only matches.

**Acceptance Scenarios**:

1. **Given** a phone number is owned only by soft-deleted neighbors, **When** an operator assigns that phone to a current neighbor, **Then** the assignment succeeds and the deleted neighbors remain deleted.
2. **Given** phone lookup finds one current eligible neighbor and one or more soft-deleted neighbors with the same canonical normalized phone value, **When** identity resolution runs, **Then** the deleted neighbors are ignored and the current eligible neighbor is returned as the single match.
3. **Given** phone lookup finds only soft-deleted neighbors for a canonical normalized phone value, **When** identity resolution runs, **Then** the system returns no current match rather than an ambiguity refusal or a resurrected deleted neighbor.

### Edge Cases

- The same phone is entered in different raw formats; all duplicate checks and lookups must still resolve from the same canonical normalized E.164 value.
- A current neighbor edit keeps the same canonical phone value already owned by that same neighbor; the save must not fail as a self-duplicate.
- A legacy duplicate set contains both current and soft-deleted neighbors; ambiguity still applies whenever more than one current eligible neighbor remains after deleted neighbors are excluded.
- A phone number owned by a soft-deleted neighbor is also still owned by a different current neighbor; reuse must still be refused because a current eligible owner exists.
- Legacy duplicate records remain in place during this feature; unrelated reads and writes must not auto-merge, auto-delete, or silently rewrite those records.

### Platform Compatibility Scenarios

1. **Given** the platform routing delegation contract is already in place, **When** this feature is exercised through ConnectShyft neighbor and identity routes, **Then** `/api/v1/auth/*` and `/api/v1/platform/admin/*` continue delegating to `admin-api` and only ConnectShyft-owned routes change behavior.
2. **Given** production uses shared PostgreSQL with canonical migration authority, **When** this feature is rolled out, **Then** the schema change remains compatible with shared Postgres and does not require a ConnectShyft-owned production migration path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST evaluate phone uniqueness and phone-based identity resolution using canonical normalized E.164 values only.
- **FR-002**: Within the existing tenant-scoped ConnectShyft identity boundary, the system MUST allow at most one current active phone assignment for a canonical normalized E.164 value across non-deleted neighbors.
- **FR-003**: The system MUST enforce the uniqueness rule during neighbor creation.
- **FR-004**: The system MUST enforce the uniqueness rule during neighbor updates and during phone add or replace actions.
- **FR-005**: The system MUST exclude soft-deleted neighbors from duplicate-assignment enforcement so their phone numbers can be reused.
- **FR-006**: If a write operation attempts to assign a canonical normalized phone value that is already owned by another current non-deleted neighbor, the system MUST fail deterministically and return a structured refusal that identifies the outcome as a duplicate-phone refusal.
- **FR-007**: A duplicate-phone refusal MUST leave all existing phone ownership unchanged and MUST NOT silently override, merge, transfer, or reactivate any neighbor identity.
- **FR-008**: Existing duplicate phone assignments already present in stored data MUST be tolerated temporarily and MUST NOT be auto-resolved by this feature.
- **FR-009**: Phone-based identity resolution MUST return one and only one of these deterministic outcomes for a canonical normalized phone value: single current match, no current match, or structured ambiguity refusal.
- **FR-010**: If phone-based identity resolution finds multiple current eligible neighbors for the same canonical normalized phone value, the system MUST hard fail with a structured ambiguity refusal and MUST NOT select a neighbor arbitrarily.
- **FR-011**: Workflows that depend on phone-based identity resolution MUST propagate ambiguity refusal as a refusal outcome and MUST NOT convert it into a successful association, a new identity, or a silent fallback.
- **FR-012**: If a phone number is held only by soft-deleted neighbors, the system MUST allow the number to be assigned to a current neighbor and MUST continue to treat deleted neighbors as unavailable for identity reuse.
- **FR-013**: If a phone value already belongs to the same current neighbor after canonical normalization, the system MUST treat the write as retaining the same ownership rather than as a duplicate conflict.
- **FR-014**: This feature MUST remain limited to duplicate-prevention and deterministic ambiguity behavior and MUST NOT introduce background deduplication, merge tooling, heuristic resolution, household or shared-phone modeling changes, PeopleCore integration, or cleanup tooling.

### Key Entities *(include if feature involves data)*

- **Neighbor Record**: A ConnectShyft person record that can be current or soft-deleted and can hold one or more phone assignments.
- **Current Phone Assignment**: A phone value that is still active for a non-deleted neighbor and therefore participates in uniqueness checks and identity resolution.
- **Duplicate-Phone Refusal**: The deterministic structured refusal returned when a write attempts to assign a phone already owned by another current non-deleted neighbor.
- **Identity Resolution Outcome**: The phone-lookup result for a canonical normalized phone value, limited to a single current match, no current match, or ambiguity refusal.

## Dependencies

- Existing canonical phone normalization remains the source of truth for comparing differently formatted phone inputs.
- Existing ConnectShyft workflows that resolve neighbor identity by phone continue to consume a single-match, no-match, or ambiguity outcome without inventing extra fallback paths.

## Assumptions

- Phone uniqueness and phone-based identity resolution remain tenant-scoped, consistent with the current ConnectShyft identity boundary.
- Only current active phone assignments on non-deleted neighbors participate in uniqueness enforcement and lookup ambiguity; inactive phone history does not block reuse unless it becomes current again.
- Structured refusals provide a stable outcome category that calling surfaces can handle consistently, while exact presentation wording may vary by surface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In regression validation, 100% of create, update, and phone add or replace attempts using a unique canonical normalized phone value succeed without changing any other neighbor's phone ownership.
- **SC-002**: In regression validation, 100% of duplicate assignment attempts against a phone already owned by another current non-deleted neighbor return a duplicate-phone refusal on the first attempt and make zero ownership changes.
- **SC-003**: In regression validation, 100% of formatting variants for the same phone value are treated as the same canonical identity for both duplicate enforcement and lookup behavior.
- **SC-004**: In regression validation, 100% of phone-based identity lookups with exactly one current eligible match return that match, and 100% of lookups with multiple current eligible matches return ambiguity refusal with zero arbitrary selections.
- **SC-005**: In regression validation, 100% of assignment attempts involving phone numbers owned only by soft-deleted neighbors succeed without reviving deleted records, and 100% of deleted-only phone lookups return no current match.
- **SC-006**: During rollout validation, 0 legacy duplicate phone assignments are auto-merged, auto-deleted, or silently rewritten by this feature.
