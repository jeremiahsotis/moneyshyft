# Feature Specification: ConnectShyft Inbound SMS Identity Resolution

**Feature Branch**: `022-inbound-sms-identity-resolution-and-raw-body-capture`  
**Created**: 2026-03-18  
**Status**: Ready for Planning  
**Input**: User description: "Implement deterministic inbound SMS neighbor resolution using ordered metadata, thread, phone, and new-neighbor fallback, while preserving original webhook bodies for signature validation."

## Scope

- Deterministically associate accepted inbound SMS messages to an existing active neighbor or to a newly created neighbor.
- Preserve the required resolution order across explicit webhook metadata, thread correlation, phone-based subject resolution, and new-neighbor creation.
- Create minimal neighbor records for first-contact inbound SMS senders when no active deterministic match exists.
- Update texting preference only when inbound SMS is the first signal for a neighbor still marked as unknown.
- Preserve the original inbound webhook content so signed webhook requests can be validated before any business side effects occur.
- Keep phone-based subject resolution replaceable so future centralized identity services can adopt the same business contract.

## Non-Goals

- Identity merging across existing neighbor records.
- Duplicate resolution tooling or operator cleanup workflows.
- Outbound sender-number selection or other sender architecture work.
- Timeline projection or other message-history presentation changes beyond deterministic identity resolution.

## Routing Ownership & Lane/API Boundaries

- This feature only changes ConnectShyft inbound SMS handling owned by `connectshyft-api`.
- No Admin or MoneyShyft route ownership, lane delegation, or auth boundaries change.
- The feature continues to use the existing shared Postgres topology and shared migration authority.
- No new hostname, public port, or service-local database is introduced.

## Platform Compatibility Acceptance Scenarios

1. **Given** the existing lane routing contract is in place, **When** this feature is deployed, **Then** inbound SMS continues to be handled by the existing ConnectShyft API ownership path and requires no Admin or MoneyShyft delegation changes.
2. **Given** the existing shared Postgres topology is in place, **When** inbound SMS resolution and neighbor creation run, **Then** they use the existing shared database contract and require no new database host, port, or migration executor.

## Deterministic Resolution Order

1. Explicit webhook neighbor reference
2. Existing thread correlation
3. Tenant-scoped phone subject resolution
4. New neighbor creation

Later steps may run only when earlier steps do not produce a reusable active neighbor. No silent fallbacks or heuristic inference are allowed outside this order.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolve Existing Neighbor Deterministically (Priority: P1)

As a ConnectShyft operator, I need inbound SMS from an existing neighbor to attach to the correct active neighbor record even when webhook metadata is missing, so conversations stay connected to the right person without manual repair.

**Why this priority**: This closes the stated production gap. If existing-neighbor resolution is not deterministic, inbound SMS can be misrouted, dropped into new records unnecessarily, or blocked from normal workflow.

**Independent Test**: This can be fully tested by processing inbound SMS fixtures that separately exercise canonical explicit metadata, metadata aliases, thread correlation, single phone-match, and cross-tenant-only phone scenarios and confirming only the permitted current-tenant signals resolve to the expected existing active neighbor.

**Acceptance Scenarios**:

1. **Given** an accepted inbound SMS includes an explicit neighbor reference for an active neighbor in the current tenant, **When** the message is processed, **Then** the system associates the message to that neighbor and does not evaluate lower-priority resolution steps.
2. **Given** an accepted inbound SMS has no reusable explicit neighbor reference and an existing thread correlation identifies an active neighbor in the current tenant, **When** the message is processed, **Then** the system associates the message to that thread-correlated neighbor and does not evaluate lower-priority resolution steps.
3. **Given** an accepted inbound SMS has no reusable explicit neighbor reference or thread correlation and the sender phone maps to exactly one active neighbor in the current tenant, **When** the message is processed, **Then** the system associates the message to that neighbor.
4. **Given** an accepted inbound SMS has no reusable explicit neighbor reference or thread correlation and the sender phone maps to multiple active neighbors in the current tenant, **When** the message is processed, **Then** the system refuses identity resolution as ambiguous and creates no new neighbor.
5. **Given** an accepted inbound SMS has no reusable explicit neighbor reference or thread correlation and the sender phone matches neighbors only in other tenants, **When** the message is processed, **Then** phone subject resolution returns no active match for the current tenant and the system continues to the next permitted step.
6. **Given** an accepted inbound SMS includes a metadata alias such as `neighbor_id` but omits canonical `neighborId`, **When** the message is processed, **Then** the alias is ignored for explicit neighbor resolution and the system continues to later permitted steps.

---

### User Story 2 - Create a Safe Minimal Neighbor When Needed (Priority: P2)

As a ConnectShyft operator, I need inbound SMS from an unknown or deleted sender to create a usable minimal neighbor record, so the conversation can continue immediately without resurrecting stale identities or requiring manual pre-creation.

**Why this priority**: Once deterministic matching is exhausted, the system still needs a safe and auditable way to continue intake. This protects operations from stalls while avoiding reuse of deleted identities.

**Independent Test**: This can be fully tested by processing inbound SMS fixtures with no active match, with soft-deleted-only matches, with explicit metadata pointing to a deleted neighbor, and with different existing texting-preference states, then verifying new-neighbor creation and preference-upgrade behavior.

**Acceptance Scenarios**:

1. **Given** an accepted inbound SMS yields no active reusable neighbor from explicit metadata, thread correlation, or phone subject resolution, **When** the message is processed, **Then** the system creates a new active neighbor with the sender phone as the primary active valid phone, allows a minimal profile with no required name, initializes texting preference as `UNKNOWN`, and records a neighbor-creation audit entry.
2. **Given** an accepted inbound SMS matches only soft-deleted neighbors through the permitted resolution steps, **When** the message is processed, **Then** the system creates a new neighbor, does not resurrect a deleted neighbor, and does not fail solely because deleted records were found.
3. **Given** an accepted inbound SMS is associated to a neighbor whose texting preference is `UNKNOWN`, **When** processing completes, **Then** the system changes that preference to `YES`.
4. **Given** an accepted inbound SMS is associated to a neighbor whose texting preference is already `YES` or `NO`, **When** processing completes, **Then** the system preserves the existing preference.
5. **Given** an explicit webhook neighbor reference points to a soft-deleted neighbor and no later permitted step finds an active reusable neighbor, **When** the message is processed, **Then** the system creates a new neighbor and does not resurrect the deleted record.

---

### User Story 3 - Validate Webhook Authenticity Against the Exact Request (Priority: P3)

As a platform owner, I need inbound webhook authenticity checks to use the exact request content that was received, so tampered webhook payloads are rejected before they can create messages or alter neighbor state.

**Why this priority**: Deterministic identity resolution is only trustworthy if the inbound webhook itself can be authenticated reliably. Accepting reconstructed or altered payloads would undermine every downstream identity decision.

**Independent Test**: This can be fully tested by submitting valid signed webhook requests and tampered-or-unverifiable signed requests, then confirming only authentic requests are allowed to continue into inbound SMS handling.

**Acceptance Scenarios**:

1. **Given** an inbound SMS webhook has a valid signature for the exact request content received by the system, **When** the request is processed, **Then** signature validation succeeds and normal inbound identity resolution may continue.
2. **Given** an inbound SMS webhook has been altered after signing or otherwise fails signature validation, **When** the request is processed, **Then** the request is rejected before any message append, neighbor creation, or texting-preference update occurs.
3. **Given** the system cannot validate a signed inbound webhook against the exact request content it received, **When** the request is processed, **Then** the request is rejected rather than accepted from reconstructed payload data.

### Edge Cases

- An explicit webhook neighbor reference points to a soft-deleted neighbor.
- Thread correlation points to one active neighbor while phone subject resolution would point to a different active neighbor; the higher-priority active match wins and lower-priority signals are ignored.
- Phone subject resolution finds multiple active neighbors for the same normalized contact point within the tenant.
- Sender phone matches a neighbor in another tenant only; the current tenant still has no match.
- A signed inbound webhook arrives without readable original request content needed for authenticity validation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST determine the neighbor outcome for every accepted inbound SMS using only this ordered chain: explicit webhook neighbor reference, thread correlation, tenant-scoped phone subject resolution, and new-neighbor creation.
- **FR-002**: System MUST stop at the first active reusable neighbor found in that chain and MUST NOT consult lower-priority steps once such a match exists.
- **FR-003**: System MUST treat an explicit webhook neighbor reference as reusable only when it identifies an active neighbor within the current tenant.
- **FR-004**: System MUST use existing thread correlation when no reusable explicit webhook neighbor reference is available and the thread correlation identifies an active neighbor within the current tenant.
- **FR-005**: System MUST provide a replaceable, tenant-scoped phone subject-resolution capability that accepts a normalized E.164 contact point and returns exactly one of three outcomes: single active match, no active match, or multiple active matches.
- **FR-006**: System MUST associate the inbound SMS to the matched neighbor when phone subject resolution returns a single active match.
- **FR-007**: System MUST hard fail inbound identity resolution as ambiguous when phone subject resolution returns multiple active matches, and MUST NOT create a new neighbor or guess among the matches.
- **FR-008**: System MUST create a new active neighbor when the permitted ordered steps do not yield an active reusable match. The new neighbor MUST use the sender phone as its primary phone, mark that phone active and valid, allow a minimal profile without a required name, initialize texting preference as `UNKNOWN`, and record a neighbor-creation audit entry.
- **FR-009**: System MUST treat soft-deleted neighbors as unavailable for reuse. It MUST NOT resurrect them, and when no other active reusable match is found through the permitted chain it MUST create a new neighbor instead.
- **FR-010**: System MUST set a neighbor's texting preference to `YES` when an accepted inbound SMS is processed and the current value is `UNKNOWN`.
- **FR-011**: System MUST preserve the existing texting preference when an accepted inbound SMS is processed and the current value is already `YES` or `NO`.
- **FR-012**: System MUST preserve the exact original inbound webhook request content so webhook signature validation is performed against what was received rather than a reconstructed payload.
- **FR-013**: System MUST reject inbound webhook requests that fail signature validation before they create messages, create neighbors, update texting preference, or write neighbor-creation audit records.
- **FR-014**: System MUST keep phone subject resolution replaceable so a future centralized identity service can provide the same single-match, no-match, and multiple-match contract without changing inbound SMS business behavior.
- **FR-015**: System MUST treat only `neighborId` as the canonical explicit webhook neighbor reference key. Alternate keys such as `neighbor_id`, heuristic guesses, or undocumented fallback paths MUST NOT be used for explicit neighbor resolution.

### Key Entities *(include if feature involves data)*

- **Inbound SMS Intake**: A tenant-scoped inbound message that includes sender phone, recipient phone, optional explicit neighbor reference, optional thread correlation, authenticity status, and the message content to be appended if accepted.
- **Subject Resolution Result**: The ordered phone-based identity decision for a normalized contact point within one tenant, limited to a single active match, no match, or multiple active matches.
- **Neighbor Record**: The active or soft-deleted person record that may be reused for inbound SMS, including primary phone, texting-preference state, and lifecycle state.
- **Neighbor Creation Audit Record**: The auditable record that explains a new neighbor was created from inbound SMS because no active reusable match existed.
- **Webhook Authenticity Decision**: The accept-or-reject outcome that determines whether the inbound request may proceed into message intake and identity resolution.

## Assumptions

- Inbound SMS processing already has sufficient tenant context before identity resolution begins.
- Existing thread correlation, when present, identifies a single historical neighbor relationship within the tenant.
- A soft-deleted neighbor does not qualify as a reusable match and does not block later permitted steps from finding an active reusable match.
- Minimal neighbor creation may omit name and other profile details until later operator enrichment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In regression validation, 100% of accepted inbound SMS scenarios resolve through exactly one of the four permitted outcomes and never through an undocumented fallback path.
- **SC-002**: In regression validation, 100% of inbound SMS scenarios with an active explicit neighbor reference, active thread correlation, or single active phone match associate to the expected existing neighbor on the first processing attempt.
- **SC-003**: In regression validation, 100% of inbound SMS scenarios with no active reusable match or with soft-deleted-only matches create a new minimal neighbor with the sender phone preserved and a neighbor-creation audit record present.
- **SC-004**: In regression validation, 100% of accepted inbound SMS scenarios change texting preference from `UNKNOWN` to `YES`, while 100% of scenarios already set to `YES` or `NO` remain unchanged.
- **SC-005**: In regression validation, 100% of ambiguous phone-match scenarios are refused as ambiguous with zero automatic neighbor selection and zero new-neighbor creation.
- **SC-006**: In webhook authenticity validation, 100% of valid signed inbound requests are accepted and 100% of tampered or unverifiable signed requests are rejected before any message or neighbor side effects occur.
- **SC-007**: In platform contract validation, 100% of release checks confirm ConnectShyft route ownership, API binding, shared Postgres connectivity, and deployment runbook steps remain valid without manual adjustments for this feature.
