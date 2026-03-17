# Feature Specification: ConnectShyft Master Debugging

**Feature Branch**: `019-connectshyft-master-debugging`  
**Created**: 2026-03-17  
**Status**: Ready for Implementation  
**Input**: User description: "Refine the ConnectShyft Master Debugging specification in the locked branch and spec location while preserving the existing three-phase framework, the ConnectShyft runtime boundary, the canonical texting preference enum, the refusal envelope contract, and the deterministic SMS target resolution rules."

## Scope

- Define one debugging sequence for the live ConnectShyft runtime that resolves three linked defects without collapsing them into one change.
- Preserve the exact issue order of texting preference persistence/display first, refusal rendering second, and SMS target resolution third.
- Encode patch boundaries, cross-phase bridge rules, regression checkpoints, and test order so each fix can be reviewed and validated independently.
- Keep implementation inside the dedicated ConnectShyft runtime surfaces unless a narrow shared helper already on that runtime path must be adjusted to preserve the locked behavior.

## Non-Goals

- Moving this work into MoneyShyft runtime surfaces.
- Introducing lane-convergence or architecture-remediation work.
- Combining all three issues into a single implementation patch.
- Redesigning provider behavior or provider interfaces.
- Redesigning the payload envelope contract for business refusals.
- Expanding scope into unrelated cleanup, naming cleanup, or platform ownership cleanup.

## Live Runtime Boundary

- The live UI runtime entry for this debugging sequence is the ConnectShyft router.
- The live API runtime entry for this debugging sequence is `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- Supporting adjustments may touch a shared helper only when that helper is already used by the ConnectShyft runtime path being fixed.
- This specification does not authorize behavior moves into `apps/moneyshyft-*` or any lane-convergence remediation.

## Phase Order

1. **Phase 1 - Texting Preference Persistence and Display**
   Restore trustworthy canonical texting preference capture, persistence, and display.
2. **Phase 2 - Refusal Rendering**
   Preserve and surface refusal semantics so business refusals are visible before SMS target work depends on them.
3. **Phase 3 - SMS Target Resolution**
   Replace guess-based SMS target selection with deterministic resolution or explicit refusal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust Saved Texting Preference (Priority: P1)

As a ConnectShyft operator, I need a neighbor's texting preference to save and display consistently so that later communication rules rely on trustworthy data.

**Why this priority**: SMS eligibility depends on this value. If the preference is wrong, later outbound behavior is untrustworthy even when other fixes are correct.

**Independent Test**: This can be tested independently by creating or updating a neighbor, refreshing the relevant views, and confirming the same canonical preference appears everywhere that shows the neighbor.

**Acceptance Scenarios**:

1. **Given** a new neighbor is created without changing the default texting preference, **When** the operator saves the record and reloads the neighbor, **Then** the stored and displayed preference is `YES`.
2. **Given** an existing neighbor is updated from one canonical texting preference to another, **When** the operator revisits the neighbor profile and thread-related summary views, **Then** each view shows the updated canonical value.
3. **Given** the system uses texting preference to decide whether SMS is allowed, **When** outbound SMS policy is evaluated after the save, **Then** the decision uses the same canonical value that the operator sees.

---

### User Story 2 - See Refusal State Clearly (Priority: P2)

As a ConnectShyft operator, I need refused actions to appear as refusals rather than successes so that I can understand what happened and choose the next valid action.

**Why this priority**: Target-resolution work will introduce new valid refusal states. Those states must already be visible before the SMS resolution fix is implemented.

**Independent Test**: This can be tested independently by triggering a known business refusal and confirming that the UI shows refusal feedback, while a transport failure still appears as a separate error condition.

**Acceptance Scenarios**:

1. **Given** a thread action returns a business refusal payload with `ok: false`, **When** the action completes, **Then** the UI renders refusal feedback instead of success.
2. **Given** a refusal includes a code, message, and available details, **When** the refusal is shown to the operator, **Then** those refusal semantics remain visible in the UI.
3. **Given** a request fails because of transport or network problems, **When** the action completes, **Then** the UI shows a transport failure state that remains distinct from a business refusal.

---

### User Story 3 - Send SMS Only When Targeting Is Deterministic (Priority: P3)

As a ConnectShyft operator, I need SMS delivery to use the correct phone or refuse explicitly when the target is ambiguous so that outbound behavior is predictable and auditable.

**Why this priority**: This is the last dependent fix. It relies on trustworthy texting preference state and visible refusal rendering from the earlier phases.

**Independent Test**: This can be tested independently by attempting SMS sends from threads with explicit targets, single deterministic neighbor phones, and ambiguous or missing phone states, then confirming each outcome matches the contract.

**Acceptance Scenarios**:

1. **Given** an outbound SMS request includes an explicit target, **When** the operator sends an SMS, **Then** the message uses that target.
2. **Given** an outbound SMS request has no explicit target and the linked neighbor has one deterministic valid phone candidate, **When** the operator sends an SMS, **Then** the system sends to that phone.
3. **Given** an outbound SMS request has no explicit target and the linked neighbor does not have a deterministic valid phone candidate, **When** the operator sends an SMS, **Then** the system refuses before provider dispatch and explains the refusal.

### Edge Cases

- A new neighbor created with the default texting preference must not be silently persisted as `UNKNOWN`.
- Existing `UNKNOWN` preferences must remain visible and editable until an operator changes them.
- A payload with transport success and `ok: false` must never produce a success state in the UI.
- When multiple active valid phones exist without an explicit outbound SMS target, the system must refuse instead of guessing.
- When Phase 3 introduces new target-resolution refusals, Phase 2 refusal rendering must display them without any envelope redesign.

### Platform Compatibility Acceptance Scenarios

1. **Given** this debugging sequence is deployed, **When** ConnectShyft operators authenticate or reach admin-owned endpoints, **Then** `/api/v1/auth/*` and `/api/v1/platform/admin/*` continue delegating to the existing admin-owned runtime without any routing change from this work.
2. **Given** this debugging sequence is deployed, **When** ConnectShyft reads or writes its lane data, **Then** shared PostgreSQL compatibility and admin-owned migration authority remain unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The debugging sequence MUST remain three separate implementation patches, with one primary defect per patch.
- **FR-002**: The debugging sequence MUST preserve this exact issue order: texting preference persistence/display first, refusal rendering second, and SMS target resolution third.
- **FR-003**: Work authorized by this specification MUST stay inside the live ConnectShyft runtime boundary, except for narrow shared helpers already used by the ConnectShyft runtime flow being corrected.
- **FR-004**: The texting preference phase MUST preserve the canonical texting preference enum values `YES`, `NO`, and `UNKNOWN`.
- **FR-005**: The texting preference phase MUST correct the defect where `prefersTexting` is dropped at the API boundary and later stored as `UNKNOWN` regardless of operator intent.
- **FR-006**: New neighbors MUST default to canonical texting preference `YES` unless the operator explicitly chooses another canonical value.
- **FR-007**: Neighbor create, edit, and display flows MUST return and display the same canonical texting preference value after save and reload.
- **FR-008**: SMS eligibility checks MUST use the same canonical texting preference value that persistence and display use.
- **FR-009**: The refusal rendering phase MUST treat any payload with `ok: false` as a refusal or failure outcome, even when the transport status is successful.
- **FR-010**: The refusal rendering phase MUST keep business refusals distinct from transport or network failures.
- **FR-011**: The refusal rendering phase MUST preserve refusal code, operator-facing message, and available refusal details so later phases can reuse them.
- **FR-012**: The refusal rendering phase MUST correct the defect where inbox-oriented thread action wrappers flatten refusal semantics that thread detail already preserves.
- **FR-013**: The SMS target resolution phase MUST correct the defect where SMS currently uses request `targetPhone` or the first active phone instead of the required deterministic order.
- **FR-014**: Deterministic SMS target resolution in the current runtime MUST use this order: explicit outbound request target if present, linked neighbor primary active valid phone, linked neighbor only active valid phone if exactly one exists, otherwise refusal.
- **FR-015**: SMS target resolution MUST refuse before provider dispatch whenever the target is missing, invalid, or ambiguous.
- **FR-016**: The sequence MUST preserve the existing `ok` and refusal payload handling contract and MUST NOT redesign providers.
- **FR-017**: Phase 1 to Phase 3 bridging MUST follow the locked cross-phase bridge rules in `CBR-001` and `CBR-002`.
- **FR-018**: Phase 2 to Phase 3 bridging MUST follow the locked cross-phase bridge rules in `CBR-003` and `CBR-004`.
- **FR-019**: No phase MAY silently absorb lane-convergence work, runtime moves, or unrelated cleanup under the debugging sequence.
- **FR-020**: The debugging sequence MUST define regression checkpoints that are run after each phase and before any later phase expands scope.
- **FR-021**: The debugging sequence MUST define a test order that validates per-phase correctness before cross-phase regression behavior.

### Patch-Boundary Rules

- **PBR-001**: Phase 1 is limited to canonical texting preference capture, persistence, serialization, display, and the narrow SMS preference gating bridge required to keep later SMS policy aligned with saved state.
- **PBR-002**: Phase 1 MUST NOT redesign refusal rendering, provider behavior, or SMS target selection.
- **PBR-003**: Phase 2 is limited to interpreting and rendering refusal outcomes across ConnectShyft thread action surfaces.
- **PBR-004**: Phase 2 MUST NOT redesign the payload envelope, change texting preference persistence rules, or change SMS target selection rules.
- **PBR-005**: Phase 3 is limited to deterministic SMS target resolution and the minimal UI behavior required to keep explicit phone selection within thread-linked neighbor context.
- **PBR-006**: Phase 3 MUST NOT redesign providers, broaden refusal semantics beyond the established contract, or reopen earlier phase scope except through the locked cross-phase bridges.

### Cross-Phase Bridge Rules

- **CBR-001**: The only Phase 1 to Phase 3 bridge is the canonical texting preference source that SMS gating reads, and when a durable neighbor record can be resolved that neighbor-record value is authoritative for SMS gating.
- **CBR-002**: `smsPreferenceOverrides` is the only named bridge allowed between Phase 1 and Phase 3, and any fallback to non-durable thread-map state is allowed only when no durable neighbor record can be resolved or persistence is unavailable.
- **CBR-003**: The only Phase 2 to Phase 3 bridge is the thread action and result shape that carries refusal semantics from API responses to ConnectShyft UI surfaces.
- **CBR-004**: No serializer, helper, or UI cleanup outside those bridges may be widened into a shared refactor across phases.

### Regression Checkpoints

- **RC-001**: After Phase 1, creating a neighbor with the default texting preference results in visible canonical value `YES` after save and reload.
- **RC-002**: After Phase 1, updating a neighbor across all canonical texting preference values preserves the saved value across profile, directory, and thread-related display surfaces.
- **RC-003**: Before Phase 2 begins, outbound behavior remains unchanged except for the intended alignment between saved texting preference and SMS policy gating.
- **RC-004**: After Phase 2, a business refusal with `ok: false` is rendered as refusal in both inbox and thread-detail flows, while transport failures remain separately identified.
- **RC-005**: After Phase 2, refusal code, operator-safe message, and available details remain visible enough for new SMS target-resolution refusals to surface without envelope changes.
- **RC-006**: After Phase 3, SMS sends use the deterministic target order and refuse before provider dispatch when deterministic targeting is impossible.
- **RC-007**: After Phase 3, the system still blocks SMS when texting preference is not `YES`, using the same canonical value fixed in Phase 1.
- **RC-008**: After all three phases, no earlier phase behavior regresses when executing the final cross-phase regression pass.

### Test Order

1. Validate Phase 1 create and update behavior for canonical texting preference save and reload.
2. Validate Phase 1 display behavior anywhere the neighbor preference is shown to operators.
3. Validate Phase 2 refusal handling for business refusals and transport failures on each thread action surface.
4. Validate that Phase 2 refusal output still preserves code, message, and available details needed by later target-resolution refusals.
5. Validate Phase 3 SMS resolution using explicit outbound request target, single deterministic neighbor target, and refusal on missing or ambiguous targets.
6. Validate that Phase 3 still respects canonical texting preference gating before any provider dispatch attempt.
7. Run a final cross-phase regression pass covering texting preference trust, refusal visibility, and deterministic SMS behavior together.

### Key Entities *(include if feature involves data)*

- **Texting Preference**: The canonical operator-visible communication preference for a neighbor, restricted to `YES`, `NO`, or `UNKNOWN`, and reused by SMS policy gating.
- **Business Refusal Outcome**: A non-transport failure result that must remain visible to the operator through refusal code, message, and available details.
- **SMS Target Candidate**: A thread-linked or neighbor-linked phone option that may be valid, invalid, ambiguous, or deterministically selectable for outbound SMS.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation of the finished sequence, 100% of neighbor create and update checks preserve the operator-selected canonical texting preference after reload.
- **SC-002**: In validation of known refusal scenarios, 100% of business refusals are shown as refusal outcomes rather than success states on the supported ConnectShyft action surfaces.
- **SC-003**: In validation of SMS targeting scenarios, 100% of sends with a deterministic target use the contractually correct phone and 100% of ambiguous or missing-target scenarios refuse before dispatch.
- **SC-004**: Reviewers can evaluate the work as three independently reviewable patches without any patch needing later-phase code to explain its primary defect fix.
- **SC-005**: The final regression pass confirms that texting preference trust, refusal visibility, and deterministic SMS behavior all remain intact together with no previously completed phase regressing.

## Assumptions

- The prior master-debugging framework in `specs/connectshyft-master-debugging/` is the source baseline and is being restated in the locked feature location rather than replaced with a new framework.
- The ConnectShyft router and the dedicated ConnectShyft API route surface remain the authoritative live runtime boundary for this debugging sequence.
- Narrow shared-helper adjustments are allowed only when they are already on the ConnectShyft runtime path and are required to preserve a locked cross-phase bridge.
