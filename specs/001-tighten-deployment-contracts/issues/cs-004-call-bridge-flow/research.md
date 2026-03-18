# Research: CS-004 Call Bridge Flow

## Decision 1

- **Decision**: Keep bridge orchestration in `domains/communication/bridge` and extend the starter scaffold into an authoritative domain service surface with `startBridgeSession(...)` and provider-event handling that returns provider-neutral side effects.
- **Rationale**: The ADR and issue spec both require bridge orchestration to live in the communication domain rather than in UI or provider adapters. The current starter files are the correct location, but they stop after initial operator dialing and do not yet model full progression or replay-safe event handling.
- **Alternatives considered**: Put bridge progression in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` or provider registry code. Rejected because that would collapse domain boundaries and reintroduce app-local orchestration logic.

## Decision 2

- **Decision**: Persist bridge session state in dedicated `bridge_session` and `bridge_leg` equivalents in the shared Postgres `connectshyft` schema, with one session and exactly two leg records per call attempt.
- **Rationale**: CS-004 requires persisted bridge-session orchestration outside frontend state. The canonical data model explicitly requires authoritative persisted session and leg state, and the current repo has no bridge persistence yet.
- **Alternatives considered**: Keep bridge state only in memory or only in the UI. Rejected because it violates both the ADR and the issue guardrails and cannot survive retries, reloads, or webhook races.

## Decision 3

- **Decision**: Reuse existing provider correlation and webhook receipt persistence (`connectshyft.cs_provider_identifier_mappings` and `connectshyft.cs_webhook_receipts`) for bridge-event correlation and replay suppression, while changing bridge-leg correlation to point provider call identifiers at persisted bridge-leg IDs.
- **Rationale**: The repo already has replay-safe webhook receipts and provider identifier mapping primitives that fit CS-004. Reusing them keeps bridge event correlation consistent with existing infrastructure and avoids inventing a second replay store. Mapping bridge provider call IDs to bridge-leg records also aligns provider reconciliation with the new persisted state model.
- **Alternatives considered**: Build a new bridge-only provider correlation table or keep mapping call-leg identifiers to canonical event IDs from the old direct-dispatch flow. Rejected because the former is redundant for CS-004 and the latter makes bridge webhook reconciliation ambiguous once provider leg IDs represent durable bridge legs instead of a one-off dispatch event.

## Decision 4

- **Decision**: Keep the existing `POST /api/v1/connectshyft/threads/:threadId/call` route as the user action entry point, but change its behavior from direct single-leg provider dispatch to bridge-session creation plus operator-leg initiation.
- **Rationale**: The user interaction does not need a new route, and the issue explicitly excludes UI redesign. Reusing the current call action entry point limits blast radius while letting the backend move from synthetic or single-leg semantics to persisted bridge orchestration.
- **Alternatives considered**: Introduce a brand-new bridge route or keep the existing route performing only a direct call-leg dispatch. Rejected because the former is unnecessary API churn for CS-004 and the latter fails the issue objective.

## Decision 5

- **Decision**: Route bridge-relevant provider events through the existing webhook verification and receipt-processing path, then hand them to a bridge application service after provider event translation and correlation resolution.
- **Rationale**: The current inbound webhook flow already verifies signatures, resolves correlation, and persists replay-safe receipts. Bridge progression needs those same safety properties. The missing piece is the application/domain handoff that applies translated bridge events to persisted bridge aggregates.
- **Alternatives considered**: Let provider adapters update bridge state directly or bolt bridge updates onto generic inbound voice logic. Rejected because provider adapters must not own business workflow state, and the voice timeline flow is not the same concern as bridge orchestration.

## Decision 6

- **Decision**: Extend the provider-neutral telephony contract with typed bridge-control inputs and outputs for bridge leg creation and bridge connection, while keeping raw Telnyx call-control identifiers inside infrastructure and persistence layers only.
- **Rationale**: CS-004 needs real provider-backed operator leg creation, neighbor leg creation, and bridge control. The telephony boundary already anticipates `startBridgeSession(...)`, but it is still untyped and unimplemented. Typing it now keeps provider specifics isolated and gives the bridge domain a stable capability surface.
- **Alternatives considered**: Call Telnyx bridge-control APIs directly from route handlers or domain code. Rejected because it violates the architecture contract and couples domain behavior to a provider implementation.

## Decision 7

- **Decision**: Make bridge state transitions replay-tolerant rather than purely strict forward-only assertions by separating event normalization from transition validation and by suppressing duplicate terminal or already-applied events.
- **Rationale**: The starter state machine currently assumes ideal in-order transitions. The issue and ADR both require repeated or out-of-order provider events to be safe to replay. CS-004 therefore needs transition logic that can recognize already-applied state and avoid double side effects.
- **Alternatives considered**: Keep only strict transition assertions and rely on providers to deliver perfect ordering. Rejected because webhook ordering is not guaranteed and this would fail the guardrails immediately.

## Decision 8

- **Decision**: Keep CS-004’s audit and idempotency scope minimal: carry `idempotencyKey` and `auditCorrelationId` through session creation, reuse existing replay-safe webhook receipts, and defer full communication-domain audit ledger work to CS-005.
- **Rationale**: The ADR requires bridge sessions to carry idempotency and audit identifiers, but the issue explicitly says not to turn this work into the full reliability epic. CS-004 only needs enough structure to keep bridge orchestration compatible with later reliability work.
- **Alternatives considered**: Implement the full `communication_idempotency_record` and `communication_audit_log` stack in this issue. Rejected because it expands scope beyond CS-004 and duplicates work reserved for CS-005.
