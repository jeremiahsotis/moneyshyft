# Feature Specification: Sender Number Architecture

**Feature Branch**: `[026-sender-number-architecture]`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "Establish a deterministic, centralized model for selecting sender numbers for SMS and voice, eliminating synthetic identifiers and fallback logic. Create branch 026-sender-number-architecture and use folder specs/026-sender-number-architecture. All sender number selection must go through one centralized resolution path using tenant, org unit, thread, and channel context, must use tenant-scoped number mappings, must keep the same sender number for the same thread, must align inbound and outbound behavior, and must refuse deterministically when no mapping exists. Out of scope: number provisioning, number pooling strategies, and regulatory compliance."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep One Sender Per Thread (Priority: P1)

An operator sending outbound communication from an existing thread gets the same sender number every time for that thread and channel, so recipients see a stable number and replies stay attached to the correct conversation.

**Why this priority**: Stable sender identity is the core business outcome. Without it, outbound communication can switch numbers, break continuity, and make replies unreliable.

**Independent Test**: Can be fully tested by sending repeated outbound SMS messages from the same tenant-scoped thread with a valid sender mapping and verifying the selected sender number never changes.

**Acceptance Scenarios**:

1. **Given** a thread has a valid sender mapping for its tenant, org unit, and SMS channel, **When** an operator sends multiple outbound SMS messages from that thread, **Then** each message uses the same sender number and returns the same routing rationale.
2. **Given** a thread previously used a sender number successfully, **When** another outbound SMS is requested from that same thread, **Then** the system reuses the same sender number instead of selecting a different active number.

---

### User Story 2 - Keep Inbound and Outbound Aligned (Priority: P2)

An inbound SMS reply received on a mapped sender number resolves back to the same operating context that was used for the originating thread, so conversations remain correctly scoped to the tenant and org unit that owns the number.

**Why this priority**: Reply continuity is the operational reason the sender number must be deterministic. If inbound SMS traffic cannot align with outbound selection, the architecture does not solve the real routing problem.

**Independent Test**: Can be fully tested by sending outbound communication from a thread, then simulating inbound SMS traffic to the chosen sender number and verifying the same tenant and org-unit context is recovered without guessing.

**Acceptance Scenarios**:

1. **Given** a thread has already used a mapped sender number, **When** an inbound SMS arrives on that same number, **Then** the system aligns it with the same tenant and org-unit context as the originating thread.
2. **Given** an inbound SMS arrives on a number that could belong to more than one possible context, **When** the system cannot establish one deterministic match, **Then** it refuses the routing decision instead of guessing a thread or tenant.

---

### User Story 3 - Refuse Safely When Sender Mapping Is Missing (Priority: P3)

An operator or support user receives a clear refusal when a thread has no valid sender mapping, rather than having the system fabricate or substitute a sender number.

**Why this priority**: Safe refusal is required to eliminate silent misrouting. A failed send is preferable to sending from the wrong number or leaking across tenants.

**Independent Test**: Can be fully tested by removing or invalidating the applicable sender mapping for a thread and verifying that dispatch stops with a deterministic refusal reason.

**Acceptance Scenarios**:

1. **Given** no valid sender mapping exists for a thread's tenant, org unit, and channel, **When** sender resolution is requested, **Then** the system returns a deterministic refusal and does not dispatch communication.
2. **Given** a thread previously aligned to a sender mapping that is no longer valid, **When** a new outbound communication attempt is made, **Then** the system refuses the request instead of switching the thread to another sender number.

### Edge Cases

- A thread's historical sender number is no longer active or has been reassigned, and the system must refuse rather than silently switch numbers.
- More than one mapping could satisfy the same tenant-scoped request, and the system must return a deterministic ambiguity refusal.
- An inbound reply arrives on a provider number that is unmapped, and the system must refuse rather than create a synthetic sender identity.
- An inbound reply arrives on a provider number that matches a different tenant than the current request context, and the system must reject the cross-tenant mismatch.
- A voice sender selection request is made before a valid voice-capable mapping exists, and the system must refuse using the same deterministic rules as SMS.
- A thread exists, but its org-unit scope no longer matches the applicable mapping inventory, and the system must refuse instead of borrowing a number from another scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST route all sender-number decisions through one centralized sender-resolution policy for every supported communication channel.
- **FR-002**: The centralized sender-resolution policy MUST require tenant, org-unit, thread, and channel context for every decision.
- **FR-003**: The sender-resolution outcome MUST provide the selected provider number, a mapping reference when available, and routing metadata that explains the successful decision or refusal.
- **FR-004**: The system MUST use tenant-scoped number mappings as the source of truth for sender eligibility and routing authority.
- **FR-005**: The system MUST NOT derive sender selection from synthetic identifiers, neighbor identifiers, thread identifiers, random choice, or per-message fallback behavior.
- **FR-006**: Repeated sender-resolution requests for the same tenant, org unit, thread, and channel MUST return the same sender number while the aligned mapping remains valid.
- **FR-007**: Inbound and outbound communication for the same thread MUST align to the same sender number so that replies return to the correct operating context.
- **FR-008**: If no valid mapping exists for the requested scope, the system MUST refuse deterministically and MUST NOT dispatch communication using an alternate sender number.
- **FR-009**: If multiple mappings could satisfy the requested scope and no unique deterministic match can be established, the system MUST refuse deterministically rather than guess or switch numbers.
- **FR-010**: The system MUST enforce tenant isolation and MUST NOT expose or select a sender number that belongs to another tenant.
- **FR-011**: When a thread's previously aligned sender mapping becomes invalid, the system MUST preserve thread continuity by refusing further sender selection instead of substituting a different number.
- **FR-012**: The sender-resolution contract MUST support SMS immediately and remain compatible with the same decision rules for future voice sender selection.
- **FR-013**: Operational outputs for sender selection MUST make it possible to distinguish successful resolution from deterministic refusal and explain the routing basis for each outcome.

### Key Entities *(include if feature involves data)*

- **Sender Resolution Context**: The tenant, org unit, thread, and channel scope that defines one sender-selection request.
- **Sender Mapping Record**: The tenant-scoped record that makes a provider number eligible for use in a specific operating context and carries routing details.
- **Thread Sender Alignment**: The durable relationship between a thread and its chosen sender number that ensures repeat sends and inbound replies stay consistent.
- **Sender Resolution Result**: The outcome of sender selection, either a chosen provider number with routing details or a deterministic refusal with a reason.

## Assumptions

- Tenants already maintain sender-eligible number mappings before using this feature.
- Thread context already exists before outbound sender selection is requested.
- Voice must follow the same sender-selection rules when introduced, but this feature does not include voice provisioning work.
- Voice callback alignment is out of scope for this slice; voice support here is limited to outbound sender selection and deterministic refusal behavior.
- Number provisioning, number pooling strategy, and regulatory enrollment remain outside the scope of this feature.

## Platform Boundaries

- Routing ownership remains unchanged: authentication and platform-admin routes stay owned by Admin API, and all sender-number behavior remains ConnectShyft-lane owned.
- Lane and API boundaries remain unchanged: this feature changes ConnectShyft backend behavior only and does not introduce new cross-lane APIs or services.
- Deployment boundaries remain unchanged: host-managed Nginx, localhost-only ConnectShyft API binding, shared Postgres, and Admin-owned production migration authority remain the operating model.

## Platform Compatibility Scenarios

1. **Given** the feature is deployed, **When** route ownership is reviewed, **Then** no authentication or platform-admin delegation changes are introduced and all modified `/api` behavior remains ConnectShyft-lane owned.
2. **Given** deployment validation is run after the feature change, **When** operators verify reverse-proxy, API binding, and database assumptions, **Then** ConnectShyft still runs behind host Nginx, binds only to localhost, and uses the shared Postgres model without new migration authority.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of repeated outbound SMS sends from the same thread with a valid mapping use the same sender number.
- **SC-002**: In acceptance testing, 100% of inbound replies sent to a thread's mapped sender number resolve to the same tenant and org-unit context as the originating thread when valid mapping data exists.
- **SC-003**: 100% of sender-resolution failures return an explicit deterministic refusal, and 0 failures dispatch using substitute, random, or fallback sender numbers.
- **SC-004**: 0 documented acceptance scenarios rely on synthetic identifiers, neighbor IDs, or thread IDs as sender selection inputs.
- **SC-005**: Support and QA reviewers can identify the selected sender number or the refusal cause from routing details alone for 100% of documented scenarios.
