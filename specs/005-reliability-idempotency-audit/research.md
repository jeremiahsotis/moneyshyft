# Research: CS-005 Reliability / Idempotency / Audit

## Decision 1: Use durable idempotency records in ConnectShyft persistence before outbound side effects

- **Decision**: Implement command-side idempotency with a durable `communication_idempotency_record`-equivalent persistence adapter in `apps/connectshyft-api`, backed by the shared domain service in `domains/communication/reliability/idempotencyService.ts`.
- **Rationale**: The current route-level replay ledger in `connectshyft.ts` is in-memory and cannot survive process restarts or realistic client retry windows. The ADR and execution packet require idempotency before side effects and durable request safety.
- **Alternatives considered**:
  - Keep the existing in-memory replay ledger: rejected because it is not durable and cannot satisfy CS-005.
  - Push idempotency into the provider adapter: rejected because idempotency scope includes actor, operation, and authoritative application result, which belongs above infrastructure.

## Decision 2: Keep audit append-only and separate from the volunteer-facing timeline

- **Decision**: Persist a dedicated `communication_audit_log`-equivalent append-only record for command outcomes, duplicate suppression outcomes, retry decisions, and webhook processing outcomes using the shared audit contract in `domains/communication/audit`.
- **Rationale**: The ADR and internal event note require durable audit evidence that is distinct from the user-facing timeline and captures result states such as `ignored_duplicate`, `retrying`, and `exhausted`.
- **Alternatives considered**:
  - Reuse thread timeline records as audit evidence: rejected because timeline content is user-facing and not append-only operational history.
  - Store audit metadata only inside existing message or bridge rows: rejected because it would overwrite history and fail the append-only requirement.

## Decision 3: Use bounded retry metadata on reliability-owned records, not a new retry subsystem

- **Decision**: Persist bounded retry intent and exhaustion state on reliability-owned records already involved in the operation path, primarily idempotency records and webhook receipts, and use `domains/communication/reliability/retryPolicy.ts` for classification-driven retry decisions.
- **Rationale**: CS-005 requires bounded retry only and explicitly forbids a broad retry subsystem redesign. Storing minimal retry metadata next to existing reliability records keeps the scope surgical while preserving replay safety.
- **Alternatives considered**:
  - Introduce a standalone retry jobs/work queue subsystem: rejected as broader than CS-005 allows.
  - Avoid persisting retry intent at all: rejected because retry scheduling/exhaustion must be durable and auditable.

## Decision 4: Reuse existing bridge-session ownership and webhook receipt flow

- **Decision**: Keep bridge lifecycle authority in the existing bridge domain and `bridgeSessions.ts`, and keep provider ingress dedupe centered on `cs_webhook_receipts` / provider-correlation mapping flow while extending it for clearer duplicate, retryable failure, and exhausted outcomes.
- **Rationale**: The ADR requires persisted bridge-session state and replay-safe webhook processing, but CS-005 must not redesign bridge orchestration or move provider logic upward.
- **Alternatives considered**:
  - Redesign the bridge state machine to absorb retry orchestration: rejected because CS-005 is hardening, not bridge redesign.
  - Move webhook duplicate suppression into raw provider adapter code only: rejected because authoritative processing state must remain visible to application persistence.

## Decision 5: Treat existing ConnectShyft HTTP routes as the external contract surface

- **Decision**: Define CS-005 around the existing ConnectShyft lane-owned mutation and webhook routes, specifically outbound message/call initiation and provider webhook ingress, rather than introducing new reliability-specific endpoints.
- **Rationale**: The repo already exposes these route surfaces, and CS-005 is meant to harden them in place while preserving routing delegation and lane boundaries.
- **Alternatives considered**:
  - Introduce separate reliability endpoints: rejected because that would expand scope and risk route-boundary drift.
  - Restrict reliability handling to internal services only with no HTTP contract updates: rejected because the execution packet explicitly requires `Idempotency-Key` support on outbound communication endpoints.
