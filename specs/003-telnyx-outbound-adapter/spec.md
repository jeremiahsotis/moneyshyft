# Feature Spec: CS-003 Telnyx Outbound Adapter

**Feature Branch**: `003-telnyx-outbound-adapter`  
**Canonical Source**: [CS-003_Telnyx_Adapter_Guardrailed_Spec.md](/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-003_Telnyx_Adapter_Guardrailed_Spec.md)

## Scope

Implement a real Telnyx outbound adapter behind a provider-neutral telephony contract so ConnectShyft can send outbound SMS and initiate outbound voice calls without embedding provider-specific behavior in app code or UI.

This feature is limited to:

- a shared telephony contract under `domains/communication/telephony`
- a Telnyx adapter under `infrastructure/communications/telnyx`
- ConnectShyft API adoption of that contract for outbound SMS and outbound call initiation
- provider correlation and webhook compatibility required to keep outbound dispatch truthful and replay-safe

This feature explicitly excludes:

- UI redesign
- bridge-session orchestration and multi-leg bridge control
- new cross-lane APIs or route families
- moving phone identity, idempotency, or audit ownership out of the shared communication architecture

## Routing Ownership and Lane Boundaries

- `connectshyft-api` remains the owner of the ConnectShyft lane routes touched by this feature, including `POST /api/v1/connectshyft/threads/:threadId/messages` and `POST /api/v1/connectshyft/threads/:threadId/call`.
- `admin-api` remains the owner of `/api/v1/auth/*` and `/api/v1/platform/admin/*`; CS-003 must not change that delegation.
- Provider-neutral telephony contracts must live in `domains/communication/telephony`; Telnyx request/response handling must live in `infrastructure/communications/telnyx`.
- No code under `apps/` may contain Telnyx-specific request building, response parsing, or webhook translation logic.
- Shared PostgreSQL compatibility must be preserved, and production migration ownership must remain with `admin-api`.

## User Scenarios & Testing

### User Story 1 - Outbound SMS Through Telnyx (Priority: P1)

As a ConnectShyft operator, I want an outbound message action to dispatch through the real Telnyx adapter so that the thread timeline reflects a real provider-backed message instead of a synthetic dispatch placeholder.

**Why this priority**: SMS dispatch is the smallest user-visible slice that proves the provider boundary is real and that thread messaging can move beyond synthetic adapter behavior.

**Independent Test**: Send an outbound message from an existing ConnectShyft thread against a Telnyx-backed test configuration, verify a provider message ID is returned, and confirm the thread stores a single outbound message plus provider correlation metadata.

**Acceptance Scenarios**:

1. **Given** an operator with access to a ConnectShyft thread and an allowlisted Telnyx provider, **When** the operator sends an outbound message, **Then** the system dispatches via Telnyx, returns a provider message identifier, and records the outbound message in the thread.
2. **Given** the same outbound message request is retried with the same idempotency key, **When** the retry is processed, **Then** the system does not create a duplicate provider dispatch or duplicate thread message.

---

### User Story 2 - Outbound Voice Initiation Through Telnyx (Priority: P2)

As a ConnectShyft operator, I want the call action to initiate a real outbound Telnyx call leg so that the system no longer reports a fake provider dispatch result for voice initiation.

**Why this priority**: Voice initiation is required by the issue outcome, but full bridge orchestration belongs to CS-004 and must not be pulled into this issue.

**Independent Test**: Initiate an outbound call from an existing ConnectShyft thread against a Telnyx-backed test configuration, verify a provider leg identifier is returned, and confirm the dispatch stays within the existing policy guardrails without introducing bridge-session behavior.

**Acceptance Scenarios**:

1. **Given** an operator with access to a ConnectShyft thread and a policy-compliant outbound call request, **When** the operator initiates a call, **Then** the system dispatches a real Telnyx outbound call request and returns a provider leg identifier.
2. **Given** an outbound call request that violates existing bridge/manual-retry guardrails, **When** the request is processed, **Then** the system refuses the request before invoking Telnyx and does not mutate lifecycle state as if a dispatch occurred.

---

### User Story 3 - Provider-Neutral Boundary and Operational Evidence (Priority: P3)

As a maintainer, I want the Telnyx integration to remain isolated behind the shared telephony boundary so that future provider replacement and later bridge/idempotency work can build on the same contract without moving app boundaries.

**Why this priority**: The issue is only valuable if the adapter is real and still architecture-safe; otherwise CS-003 creates new debt instead of enabling CS-004 and CS-005.

**Independent Test**: Inspect the affected source tree and automated tests to verify that provider-specific logic lives only under `infrastructure/communications/telnyx`, the domain exposes the provider-neutral contract, and sandbox validation steps are documented.

**Acceptance Scenarios**:

1. **Given** the CS-003 source tree, **When** the telephony implementation is reviewed, **Then** the domain exposes a provider-neutral interface and app code depends on that interface rather than Telnyx-specific shapes.
2. **Given** the PR evidence for CS-003, **When** maintainers review it, **Then** the evidence includes adapter interface documentation and a Telnyx sandbox integration path.

### Edge Cases

- Missing or invalid `TELNYX_API_KEY` must fail deterministically without reporting a successful dispatch.
- A requested provider that is disabled, unregistered, or outside the rollout allow-list must fail closed without outbound side effects.
- Provider API timeouts or 5xx responses must not create duplicate outbound records when the client retries with the same idempotency key.
- Webhook signature verification must remain fail-closed for invalid Telnyx signatures and must not apply provider events on failed verification.
- This feature must not alter `/api/v1/auth/*` or `/api/v1/platform/admin/*` delegation, nor introduce direct cross-lane service access.

## Requirements

### Functional Requirements

- **FR-001**: System MUST define a provider-neutral telephony contract in `domains/communication/telephony`.
- **FR-002**: System MUST implement the Telnyx adapter in `infrastructure/communications/telnyx`.
- **FR-003**: ConnectShyft outbound SMS dispatch MUST invoke Telnyx only through the provider-neutral telephony contract and adapter boundary.
- **FR-004**: ConnectShyft outbound call initiation MUST invoke Telnyx only through the provider-neutral telephony contract and adapter boundary.
- **FR-005**: The Telnyx adapter MUST authenticate outbound requests with `TELNYX_API_KEY`.
- **FR-006**: Outbound SMS dispatch MUST persist a truthful provider reference/correlation record alongside the thread-visible outbound message.
- **FR-007**: Outbound call initiation MUST return a truthful provider leg reference without introducing bridge-session orchestration into CS-003.
- **FR-008**: Provider-specific identifiers MUST be stored only as provider references/correlation artifacts and MUST NOT become primary app-layer identifiers.
- **FR-009**: System MUST preserve ConnectShyft route ownership and admin-route delegation exactly as defined by the constitution.
- **FR-010**: No provider-specific Telnyx logic MAY be implemented under `apps/`.
- **FR-011**: CS-003 MUST NOT redesign UI or implement call bridging logic.
- **FR-012**: Persistence and service behavior MUST remain compatible with the shared PostgreSQL model and `admin-api` production migration ownership.

### Key Entities

- **TelephonyProviderAdapter**: Provider-neutral domain contract for outbound SMS, outbound call initiation, and webhook verification/translation entry points.
- **ProviderDispatchResult**: Canonical dispatch outcome returned to ConnectShyft after a provider-backed message or call initiation.
- **telephony_provider_reference**: Canonical provider reference concept; currently represented by ConnectShyft correlation mapping records that relate internal thread activity to Telnyx identifiers.
- **communication_message**: Canonical outbound message concept represented in the ConnectShyft thread timeline.
- **communication_webhook_receipt**: Canonical replay-safe webhook receipt concept used to correlate and suppress duplicate provider events.

## Platform Compatibility Scenarios

- No route ownership changes: ConnectShyft thread routes remain in `connectshyft-api`; auth and platform-admin routes remain delegated to `admin-api`.
- No deployment-topology changes: host Nginx, Dockerized APIs with localhost-only bindings, and static frontend serving remain unchanged.
- Shared database compatibility: current ConnectShyft correlation and webhook receipt persistence remains compatible with the shared Postgres model and `admin-api` migration ownership.
- Boundary preservation: provider-neutral contracts live in `domains/communication`, provider-specific code lives in `infrastructure/communications`, and no app-layer Telnyx logic is introduced.

## Evidence Required

- Telnyx sandbox integration test coverage or documented sandbox validation steps for outbound SMS and outbound call initiation
- provider-neutral adapter interface documentation
- ADR/data-model compliance notes in feature documentation and the PR description

## Success Criteria

### Measurable Outcomes

- **SC-001**: A ConnectShyft outbound SMS request returns a real provider message ID from Telnyx and records one outbound thread message for one idempotent request.
- **SC-002**: A ConnectShyft outbound call request returns a real provider leg ID from Telnyx while preserving existing bridge/manual-retry guardrails.
- **SC-003**: Source inspection and automated tests show no Telnyx-specific logic under `apps/` and a provider-neutral telephony contract under `domains/communication/telephony`.
- **SC-004**: Admin, MoneyShyft, and ConnectShyft deployment/routing/database contracts remain unchanged and verifiable after the CS-003 design is applied.
