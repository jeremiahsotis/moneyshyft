# Feature Specification: ConnectShyft SMS Sender Architecture

**Feature Branch**: `021-connectshyft-sms-sender-architecture`  
**Created**: 2026-03-18  
**Status**: Ready for Planning  
**Input**: User description: "Build the spec for a permanent architectural fix to ConnectShyft outbound SMS sender-number selection."

## Scope

- Move outbound SMS sender-number ownership to the ConnectShyft route/domain boundary for outbound thread-message dispatch.
- Require ConnectShyft to resolve both the target phone and the sender phone before provider dispatch.
- Extend the outbound SMS handoff contract so provider adapters receive a dispatch-ready command with an explicit sender.
- Preserve the configured Telnyx fallback sender only as subordinate operational behavior in the provider layer.
- Add regression coverage that locks orgUnit-specific sender selection and provider handoff behavior in place.

## Non-Goals

- Rewriting the UI or requiring the composer to submit a sender number.
- Changing voice dispatch, bridge flows, or bridge-session ownership.
- Expanding scope into neighbor CRUD, lane-convergence work, migration-runner work, or broad provider abstraction redesign.
- Reworking provider failure envelopes beyond the sender-selection boundary covered here.

## Sender Ownership

- ConnectShyft owns sender-number selection for outbound SMS.
- Provider adapters do not choose the primary sender for ConnectShyft outbound SMS.
- The sender must be derived from ConnectShyft-owned tenant, orgUnit, thread, and number-mapping state before provider dispatch begins.
- The configured Telnyx fallback sender may remain available, but only when an explicit sender is absent; it cannot be the normal architectural source of truth.
- Real provider failures begin only after a dispatch-ready command with both sender and target has crossed into provider execution.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send SMS From the Correct Owned Number (Priority: P1)

As a ConnectShyft operator, I need outbound SMS to send from the correct orgUnit-owned number for the active thread so replies stay tied to the right ConnectShyft line.

**Why this priority**: This is the core architectural correction. Without owned sender selection, outbound SMS only works by accident through a single global fallback and cannot support orgUnit-specific numbers correctly.

**Independent Test**: This can be tested by sending outbound SMS from thread fixtures in different orgUnits and confirming the provider handoff uses the sender number owned by each thread's ConnectShyft context.

**Acceptance Scenarios**:

1. **Given** a thread has deterministic outbound sender ownership in its active orgUnit context, **When** an operator sends an outbound SMS, **Then** ConnectShyft resolves both target and sender before provider dispatch and sends the message successfully.
2. **Given** two orgUnits own different outbound ConnectShyft numbers, **When** operators send outbound SMS from threads in each orgUnit, **Then** each dispatch uses its own orgUnit-owned sender and never reuses the other orgUnit's sender.
3. **Given** a configured fallback sender exists, **When** ConnectShyft has already resolved an explicit sender for the thread, **Then** the explicit sender remains the sender used for provider dispatch.

---

### User Story 2 - Refuse Missing or Ambiguous Sender Ownership Before Dispatch (Priority: P2)

As a ConnectShyft operator, I need outbound SMS to stop before provider dispatch when ConnectShyft cannot deterministically own the sender number so I do not send from the wrong line or receive a misleading provider failure.

**Why this priority**: The permanent fix is not just "pick some number." It must fail closed when ConnectShyft cannot prove sender ownership from its own state.

**Independent Test**: This can be tested by forcing thread or orgUnit sender context into missing or ambiguous states and confirming the request refuses before any provider SMS call is attempted.

**Acceptance Scenarios**:

1. **Given** the active thread and orgUnit context do not yield a deterministic owned sender number, **When** an operator sends outbound SMS, **Then** the system returns a ConnectShyft business refusal before provider dispatch.
2. **Given** the sender-selection boundary fails before dispatch, **When** the request completes, **Then** no provider SMS call is made.
3. **Given** sender ownership is unresolved or ambiguous, **When** the refusal is returned, **Then** the outcome does not surface as a provider failure.

---

### User Story 3 - Keep Fallback Subordinate and Provider Failures Honest (Priority: P3)

As a platform owner, I need Telnyx fallback behavior to remain subordinate to explicit sender ownership and I need true provider failures to stay provider failures after valid handoff.

**Why this priority**: The fix must preserve operational continuity without letting fallback behavior quietly become the main architecture again.

**Independent Test**: This can be tested by validating Telnyx payload selection with and without an explicit sender and by forcing a provider rejection after a valid sender/target handoff.

**Acceptance Scenarios**:

1. **Given** the provider command includes an explicit sender and a configured fallback sender also exists, **When** the Telnyx SMS payload is built, **Then** the payload uses the explicit sender rather than the fallback sender.
2. **Given** the provider command omits an explicit sender and a configured fallback sender exists, **When** the Telnyx SMS payload is built for fallback-only compatibility behavior, **Then** the fallback sender may still be used.
3. **Given** a dispatch-ready outbound SMS command with both sender and target has crossed into provider execution, **When** the provider rejects the request, **Then** the outcome remains a provider failure rather than a sender-resolution refusal.

### Edge Cases

- The thread's preferred outbound sender context points to a sender that is no longer active or no longer owned by the active orgUnit.
- Multiple active orgUnit-owned sender candidates exist, but the current thread state does not identify one deterministic sender.
- The request supplies an explicit target phone, but ConnectShyft still must resolve the sender from owned state instead of treating the provider as the source of truth.
- A configured fallback sender exists at the same time as an explicit sender; fallback must not override the owned sender.
- No deterministic owned sender exists and no fallback sender is configured.
- The provider rejects an explicit sender after ConnectShyft has already resolved a valid sender/target pair.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST remain narrow to ConnectShyft outbound SMS dispatch for thread-message sends and MUST NOT expand into voice, bridge, neighbor CRUD, lane-convergence, migration-runner, or provider-abstraction redesign work.
- **FR-002**: ConnectShyft outbound SMS dispatch MUST resolve a dispatch-ready target phone and a dispatch-ready sender phone before any provider SMS call begins.
- **FR-003**: Sender-number selection for ConnectShyft outbound SMS MUST be owned by ConnectShyft route/domain logic rather than by provider adapter configuration.
- **FR-004**: Sender-number resolution MUST use ConnectShyft-owned tenant, orgUnit, thread outbound context, and active number-mapping state as its source of truth.
- **FR-005**: When the active thread context deterministically identifies an orgUnit-owned outbound sender, the system MUST use that sender for provider dispatch.
- **FR-006**: Sender resolution MUST remain scoped to the active orgUnit and MUST NOT reuse another orgUnit's sender number during normal outbound SMS operation.
- **FR-007**: The outbound SMS provider handoff contract MUST carry the explicit sender phone together with the target phone, body, and existing dispatch metadata.
- **FR-008**: Provider adapters MUST receive a dispatch-ready outbound SMS command and MUST NOT choose the primary sender on behalf of ConnectShyft during normal operation.
- **FR-009**: Telnyx SMS payload construction MUST prefer the explicit sender in the outbound command over `TELNYX_FROM_NUMBER`.
- **FR-010**: `TELNYX_FROM_NUMBER` MAY remain available as fallback-only provider configuration, but the normal ConnectShyft outbound SMS path MUST NOT depend on it as the primary source of sender ownership.
- **FR-011**: If ConnectShyft cannot resolve a deterministic dispatch-ready sender from owned state for the normal outbound SMS path, the system MUST refuse before provider dispatch.
- **FR-012**: Missing or ambiguous sender ownership before dispatch MUST NOT surface as a provider failure.
- **FR-013**: If fallback behavior is exercised because an explicit sender is absent, fallback MUST never override a sender already resolved by ConnectShyft.
- **FR-014**: Provider failures MUST remain provider failures when they occur after a dispatch-ready outbound SMS command with sender and target has crossed into provider execution.
- **FR-015**: Regression coverage MUST prove orgUnit-specific sender selection, sender ownership at the route boundary, explicit sender handoff into provider dispatch, Telnyx command-sender precedence over fallback, fallback-only compatibility behavior, and true provider failure classification after valid handoff.

### Key Entities *(include if feature involves data)*

- **Sender Resolution Context**: The active tenant, orgUnit, thread outbound state, and number-mapping state used to determine which ConnectShyft number owns an outbound SMS.
- **Owned Sender Phone**: The ConnectShyft phone number that the current thread is allowed to use for outbound SMS within its orgUnit scope.
- **Dispatch-Ready SMS Command**: The outbound SMS command that already contains both sender and target phones before it reaches provider execution.
- **Provider Fallback Sender**: The configured fallback sender that may support compatibility behavior only when no explicit sender is present.
- **Sender Resolution Refusal**: The ConnectShyft business refusal returned when sender ownership cannot be determined safely before provider dispatch.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In regression validation, 100% of outbound SMS scenarios across at least two orgUnit-specific fixtures use the sender number expected for each thread's ConnectShyft context.
- **SC-002**: In regression validation, 100% of normal outbound SMS scenarios reach provider handoff with both sender and target explicitly present in the dispatch command.
- **SC-003**: In regression validation, when an explicit sender and a configured fallback sender are both available, 100% of outbound SMS payloads use the explicit sender.
- **SC-004**: In regression validation, 100% of missing or ambiguous sender-ownership scenarios refuse before provider dispatch with zero provider SMS calls and zero misclassified provider failures.
- **SC-005**: In regression validation, 100% of simulated provider failures after valid sender/target handoff remain classified as provider failures.
- **SC-006**: In compatibility validation, fallback-only provider payload behavior remains available when an explicit sender is absent and a configured fallback sender exists, without changing normal ConnectShyft sender-ownership expectations.

## Assumptions

- Existing ConnectShyft thread state already carries outbound ownership hints that are sufficient to scope sender resolution and to fail closed without requiring a UI contract change.
- Current repository state does not expose a stable join from thread `preferredOutboundCsNumberId` or `lastInboundCsNumberId` to a specific orgUnit number-mapping row; when multiple active orgUnit mappings exist, the normal outbound SMS path must refuse before provider dispatch rather than infer a sender.
- Active orgUnit number-mapping state is the authoritative mapping source for ConnectShyft-owned sender numbers.
- Keeping `TELNYX_FROM_NUMBER` as fallback-only provider configuration is acceptable for operational continuity, but it does not redefine sender ownership for normal ConnectShyft outbound SMS.
