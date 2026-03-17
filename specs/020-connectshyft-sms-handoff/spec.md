# Feature Specification: ConnectShyft SMS Dispatch Handoff

**Feature Branch**: `020-connectshyft-sms-handoff`  
**Created**: 2026-03-17  
**Status**: Ready for Planning  
**Input**: User description: "Build the spec for a narrow permanent architectural fix to ConnectShyft outbound SMS dispatch in the dedicated ConnectShyft lane."

## Scope

- Harden the dedicated ConnectShyft outbound SMS composer path so it never reaches provider dispatch without a dispatch-ready target phone.
- Preserve server-side target resolution as the source of truth for composer sends that omit `targetPhone`.
- Separate domain SMS-target failures from provider failures so operators receive the correct outcome semantics.
- Allow temporary handoff instrumentation only long enough to verify the fix, then remove it.
- Add regression coverage that locks the corrected boundary behavior in place.

## Non-Goals

- Redesigning provider abstractions, provider selection, or provider payload contracts.
- Rewriting the thread composer UI or requiring the composer to submit `targetPhone`.
- Broad communication-system refactors, lane-convergence work, RouteShyft work, or migration-runner work.
- Expanding scope into duplicate-refusal rendering cleanup unless the verified root cause is inside this dispatch boundary.

## Boundary Ownership

- `resolveConnectShyftSmsTarget` owns server-side resolution of the SMS target for composer-origin sends.
- `performOutboundAction` owns the dispatch-ready `targetPhone` invariant for outbound SMS before any provider handoff occurs.
- `providerRegistry.sendSms()` remains a transparent pass-through boundary and must not reinterpret, replace, or clear `targetPhone`.
- The Telnyx adapter keeps defensive command validation, but it does not own domain-level missing-target decisions.

## Failure Semantics

- A missing, empty, or otherwise non-dispatchable SMS target after successful route-level resolution is a ConnectShyft domain refusal.
- A provider dispatch failure is reserved for failures that occur only after a provider-ready SMS command has crossed the route boundary.
- Missing-target domain conditions must never surface to operators as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`.
- Temporary instrumentation may prove handoff integrity, but it must not become a permanent architectural dependency.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Composer SMS With Server-Resolved Target (Priority: P1)

As a ConnectShyft operator, I need the normal thread composer to send SMS successfully without manually selecting a phone when the linked neighbor has one deterministic valid SMS target.

**Why this priority**: This is the primary broken production path. Restoring this behavior fixes the operator-visible failure without changing the established composer contract.

**Independent Test**: This can be tested by submitting one composer message on a thread whose request omits `targetPhone` and whose linked neighbor has one deterministic valid SMS target, then confirming the message dispatch succeeds.

**Acceptance Scenarios**:

1. **Given** a composer-origin SMS request omits `targetPhone` and the linked neighbor has one deterministic valid SMS target, **When** the operator sends the message, **Then** the system resolves the target server-side and completes outbound dispatch successfully.
2. **Given** a composer-origin SMS request omits `targetPhone`, **When** the operator sends the message, **Then** the system does not require the UI to change its request contract in order to dispatch successfully.
3. **Given** the SMS target resolver returns a valid target for the thread, **When** the outbound SMS is handed from route logic to provider logic, **Then** the same target remains intact across each validated handoff boundary.

---

### User Story 2 - Refuse Before Provider Dispatch When Target Invariant Breaks (Priority: P2)

As a ConnectShyft operator, I need missing-target SMS problems to stop as business refusals before provider dispatch so that I receive accurate guidance instead of a misleading provider error.

**Why this priority**: The core architectural defect is incorrect boundary ownership. Even when provider configuration is healthy, operators currently see a provider failure for a domain missing-target condition.

**Independent Test**: This can be tested by forcing the route into a state where it cannot hold a dispatch-ready SMS target immediately before dispatch, then confirming the outcome is a refusal and that no provider SMS call occurs.

**Acceptance Scenarios**:

1. **Given** the route does not hold a dispatch-ready SMS target immediately before provider dispatch, **When** the operator submits the composer send, **Then** the system returns a ConnectShyft business refusal and does not call `adapter.sendSms()`.
2. **Given** the route-level SMS target invariant fails, **When** the action completes, **Then** the operator does not receive `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED` for that request.
3. **Given** the system refuses the send because the SMS target is missing or non-dispatchable at the route boundary, **When** the refusal is returned, **Then** refusal semantics remain distinct from transport and provider failures.

---

### User Story 3 - Keep True Provider Failures Distinct (Priority: P3)

As a ConnectShyft operator, I need real provider failures to remain visible as provider failures once the route has already prepared a valid SMS command so that retry and escalation decisions remain accurate.

**Why this priority**: Fixing the domain boundary must not hide or relabel real provider failures that happen after a valid handoff.

**Independent Test**: This can be tested by handing a valid SMS command through the route and forcing a provider-layer failure, then confirming the system reports a provider failure rather than a target-resolution refusal.

**Acceptance Scenarios**:

1. **Given** the route holds a dispatch-ready SMS target and hands a valid command to provider logic, **When** the provider layer fails, **Then** the system surfaces a provider failure outcome rather than a domain SMS-target refusal.
2. **Given** `providerRegistry.sendSms()` receives a valid SMS command, **When** it forwards that command, **Then** `targetPhone` is preserved unchanged across the wrapper boundary.
3. **Given** temporary handoff instrumentation is enabled during verification, **When** the permanent fix is confirmed, **Then** the instrumentation can be removed without changing runtime behavior or regression expectations.

### Edge Cases

- The normal composer request omits `targetPhone`; the system must still dispatch successfully when the server can resolve one deterministic valid target.
- If the resolved SMS target becomes empty or otherwise non-dispatchable after resolution but before provider dispatch, the request must refuse before any provider SMS call is attempted.
- If the wrapper receives a valid SMS command, it must pass the same `targetPhone` through unchanged.
- If the provider layer fails after receiving a valid SMS command, the outcome must remain a provider failure and must not be rewritten into a target-resolution refusal.
- If temporary instrumentation is active during verification, it must not change outcome semantics, dispatch decisions, or long-term architecture.
- If duplicate requests occur for one operator action, each request must independently enforce the same pre-dispatch target invariant and must not convert a domain missing-target problem into a provider failure.

### Platform Compatibility Acceptance Scenarios

1. **Given** this feature is deployed, **When** ConnectShyft operators authenticate or reach admin-owned platform endpoints, **Then** `/api/v1/auth/*` and `/api/v1/platform/admin/*` continue using their existing ownership and routing behavior with no change from this feature.
2. **Given** this feature is deployed, **When** the ConnectShyft lane processes outbound SMS through the corrected boundary, **Then** shared PostgreSQL compatibility, current deployment topology, and existing lane ownership outside this SMS path remain unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST apply to the dedicated ConnectShyft outbound SMS path behind `POST /api/v1/connectshyft/threads/:threadId/messages` and MUST remain narrow to that dispatch boundary.
- **FR-002**: Composer-origin SMS sends MUST continue to omit `targetPhone` from the request body and rely on server-side target resolution.
- **FR-003**: `resolveConnectShyftSmsTarget` MUST remain the single source of truth for server-side SMS target resolution on composer-origin sends.
- **FR-004**: `performOutboundAction` MUST own the requirement that outbound SMS may cross into provider dispatch only when the route holds a dispatch-ready, non-empty `targetPhone`.
- **FR-005**: After successful SMS target resolution, the route MUST preserve the resolved `targetPhone` intact through command construction and up to the provider handoff boundary.
- **FR-006**: If the route does not hold a dispatch-ready `targetPhone` immediately before SMS provider dispatch, the system MUST return a ConnectShyft business refusal and MUST NOT call `adapter.sendSms()`.
- **FR-007**: A domain-level missing-target or non-dispatchable-target condition MUST NOT surface as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`.
- **FR-008**: Provider failure semantics MUST be reserved for failures that occur only after a provider-ready SMS command has been handed off from route logic.
- **FR-009**: `providerRegistry.sendSms()` MUST remain a transparent pass-through and MUST preserve `targetPhone` unchanged.
- **FR-010**: Telnyx SMS validation MAY continue to defensively reject malformed provider commands, but that defensive validation MUST NOT be the primary mechanism for domain-level missing-target handling.
- **FR-011**: Temporary instrumentation MAY be added only at the validated handoff points between route, wrapper, and adapter boundaries.
- **FR-012**: Temporary instrumentation MUST be removable after verification and MUST NOT be required for normal runtime behavior, refusal semantics, or test correctness.
- **FR-013**: Regression coverage MUST prove the composer success path using server-side resolution, the invariant refusal path, the true provider failure path, and wrapper `targetPhone` pass-through.
- **FR-014**: The feature MUST NOT require a UI rewrite, a provider redesign, a broader communication refactor, a lane-convergence change, a RouteShyft change, or a migration-authority change.
- **FR-015**: Existing auth, platform-admin, and shared-topology behavior outside this ConnectShyft outbound SMS boundary MUST remain unchanged.

### Key Entities *(include if feature involves data)*

- **Resolved SMS Target**: The server-derived phone number that is eligible for outbound SMS delivery when the composer request does not supply one.
- **Dispatch-Ready SMS Command**: The outbound SMS command state in which the route holds a non-empty target phone and a message body that can legitimately cross into provider dispatch.
- **Domain SMS Refusal**: A ConnectShyft business refusal returned when the system cannot safely dispatch outbound SMS before provider handoff.
- **Provider Dispatch Failure**: A failure state that occurs only after a valid outbound SMS command has crossed the route boundary into provider-owned execution.
- **Temporary Handoff Instrumentation**: Short-lived diagnostic logging at validated handoff points used only to confirm target preservation and removed after verification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In regression validation, 100% of composer-origin SMS scenarios with one deterministic valid target and no request `targetPhone` complete successfully without requiring a UI contract change.
- **SC-002**: In regression validation, 100% of simulated pre-dispatch invariant failures return a ConnectShyft business refusal and result in zero provider SMS calls for that scenario.
- **SC-003**: In regression validation, 0 domain missing-target scenarios surface as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`.
- **SC-004**: In regression validation, 100% of simulated provider-layer failures that occur after a valid SMS handoff remain classified as provider failures rather than target-resolution refusals.
- **SC-005**: Verification concludes with temporary instrumentation removed and all required regression scenarios still passing.

## Assumptions

- The existing resolver contract is already correct for deterministic composer-origin SMS target resolution and does not need redesign in this feature.
- The existing refusal envelope contract is sufficient for domain SMS-target refusals and does not require a new envelope shape.
- The dedicated ConnectShyft lane remains the only runtime surface changed by this feature.
- Duplicate request or duplicate UI rendering behavior is outside this feature unless the verified root cause is inside the outbound SMS handoff boundary covered here.
