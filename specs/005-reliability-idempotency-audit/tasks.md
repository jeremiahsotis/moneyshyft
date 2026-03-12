# Tasks: CS-005 Reliability / Idempotency / Audit

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/`  
**Prerequisites**: [plan.md](/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/plan.md), [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/spec.md), [research.md](/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/research.md), [data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/data-model.md), [contracts/communication-reliability-contract.md](/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/contracts/communication-reliability-contract.md), [quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md)

**Tests**: Tests are required for this feature because the specification defines independent test criteria and measurable reliability outcomes for each user story.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently while preserving provider boundaries and bridge state-machine ownership.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the concrete CS-005 persistence and integration file surfaces required for the rest of the work.

- [X] T001 Create the CS-005 reliability migration scaffold in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260312120000_add_connectshyft_communication_reliability.ts`
- [X] T002 [P] Create the ConnectShyft reliability persistence module scaffold in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/communicationReliability.ts`
- [X] T003 [P] Create the ConnectShyft audit persistence module scaffold in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`
- [X] T004 Capture the CS-005 route, webhook, and evidence matrix in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/contracts/communication-reliability-contract.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend shared reliability and audit primitives plus durable persistence foundations before story-specific route integration.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Extend idempotency record types and decisions for durable replay, response snapshots, and retry metadata in `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/idempotencyTypes.ts`
- [X] T006 Extend the shared idempotency service for conflict handling, in-progress handling, and authoritative replay completion in `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/idempotencyService.ts`
- [X] T007 [P] Extend bounded retry decision inputs for persisted retry intent and exhaustion bookkeeping in `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/retryPolicy.ts`
- [X] T008 [P] Extend webhook dedupe contracts for duplicate, retryable-failure, and exhausted receipt handling in `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/eventDeduper.ts`
- [X] T009 [P] Extend append-only audit entry types for duplicate and retry result evidence in `/Users/jeremiahotis/projects/connectshyft/domains/communication/audit/auditTypes.ts`
- [X] T010 Extend audit recording helpers for CS-005 append-only command and webhook entries in `/Users/jeremiahotis/projects/connectshyft/domains/communication/audit/recordCommunicationAudit.ts`
- [X] T011 Implement durable idempotency repository operations in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/communicationReliability.ts`
- [X] T012 [P] Implement append-only communication audit repository operations in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`
- [X] T013 Update shared reliability and audit exports in `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/index.ts` and `/Users/jeremiahotis/projects/connectshyft/domains/communication/audit/index.ts`
- [X] T014 Implement shared Postgres persistence for communication idempotency, communication audit log, and minimal webhook retry metadata in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260312120000_add_connectshyft_communication_reliability.ts`

**Checkpoint**: Shared reliability primitives, durable repositories, and migration scaffolding are ready for story implementation.

---

## Phase 3: User Story 1 - Prevent Duplicate Outbound Side Effects (Priority: P1) 🎯 MVP

**Goal**: Make outbound message, outbound call, and bridge-start requests durable and idempotent before provider side effects happen.

**Independent Test**: Submit the same outbound request twice with the same effective payload and `Idempotency-Key` and verify only one provider action occurs while the second response returns the authoritative existing result. Reuse the same key with a different payload and verify the request is rejected without creating a new side effect.

### Tests for User Story 1 ⚠️

- [X] T015 [P] [US1] Add shared idempotency decision coverage in `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/__tests__/idempotencyService.test.ts`
- [X] T016 [P] [US1] Add outbound replay and conflict route coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- [X] T017 [P] [US1] Add bridge-session idempotency integration coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`

### Implementation for User Story 1

- [X] T018 [US1] Replace the in-memory outbound replay ledger with durable idempotency orchestration in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T019 [US1] Persist idempotency scope, resource bindings, response snapshots, and failure metadata for outbound operations in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/communicationReliability.ts`
- [X] T020 [US1] Integrate bridge-session start and outbound call/message authority with durable idempotency correlation in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- [X] T021 [US1] Align the communication reliability contract and command-side validation notes with the implemented outbound idempotency behavior and materially relevant request fingerprint rules in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/contracts/communication-reliability-contract.md` and `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`

**Checkpoint**: Outbound message/call/bridge-start requests are durable and replay-safe without duplicate provider side effects.

---

## Phase 4: User Story 2 - Keep Webhook Processing Replay-Safe (Priority: P1)

**Goal**: Checkpoint verified provider webhooks, suppress duplicates before event application, and persist bounded retry intent without bypassing bridge or message domain rules.

**Independent Test**: Deliver the same verified provider event multiple times and confirm the first receipt is applied once, later duplicates are ignored without duplicate state changes, and retryable failures persist bounded retry intent and exhaustion evidence.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Add webhook duplicate, retry-state, and signature-verification rejection route coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- [X] T023 [P] [US2] Add webhook receipt replay and retry bookkeeping coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`
- [X] T024 [P] [US2] Add shared dedupe and retry-policy unit coverage in `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/__tests__/eventDeduper.test.ts` and `/Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/__tests__/retryPolicy.test.ts`

### Implementation for User Story 2

- [X] T025 [US2] Extend webhook receipt persistence for duplicate suppression, retry counts, next-attempt timestamps, and exhausted outcomes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`
- [X] T026 [US2] Integrate receipt checkpointing, duplicate suppression, and bounded retry decisions into webhook ingress in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T027 [US2] Preserve bridge-domain ownership while reapplying provider-neutral events against authoritative session state in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- [X] T028 [US2] Document the replay-safe webhook flow, bounded retry evidence, and retry-intent-only execution model in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`

**Checkpoint**: Duplicate or replayed provider webhooks are ignored safely, and retry intent is bounded and durable without bypassing bridge/message domain rules.

---

## Phase 5: User Story 3 - Produce Append-Only Reliability Audit Evidence (Priority: P2)

**Goal**: Append durable audit history for outbound mutations, duplicate suppressions, retry decisions, and webhook outcomes without changing volunteer-facing timeline behavior.

**Independent Test**: Trigger successful, duplicate, retrying, exhausted, and failed communication outcomes and verify append-only audit rows capture actor, operation, target, channel, result state, correlation, idempotency key, and provider references.

### Tests for User Story 3 ⚠️

- [X] T029 [P] [US3] Add shared audit recorder coverage in `/Users/jeremiahotis/projects/connectshyft/domains/communication/audit/__tests__/recordCommunicationAudit.test.ts`
- [X] T030 [P] [US3] Add outbound and duplicate-audit route assertions in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- [X] T031 [P] [US3] Add webhook and bridge-audit assertions in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`

### Implementation for User Story 3

- [X] T032 [US3] Implement append-only command and webhook audit persistence in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`
- [X] T033 [US3] Integrate audit appends for command success, failure, duplicate, retrying, and exhausted outcomes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T034 [US3] Persist bridge and webhook audit correlation/resource evidence without changing bridge state ownership in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`
- [X] T035 [US3] Update the audit contract and recorded evidence expectations in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/contracts/communication-reliability-contract.md` and `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`

**Checkpoint**: Append-only reliability audit evidence exists for command-side and webhook-side communication outcomes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Run end-to-end validation, record constitution evidence, and close documentation for the implemented feature.

- [X] T036 [P] Run the targeted ConnectShyft reliability Jest suites and record the results in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`
- [X] T037 [P] Run the shared domain reliability and audit Jest suites and record the results in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`
- [X] T038 Run the ConnectShyft API build, workspace boundary enforcement, and targeted provider-boundary scans, then record the results in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`
- [X] T039 [P] Record Nginx routing delegation validation for `/api/v1/auth/*`, `/api/v1/platform/admin/*`, and `/api/v1/connectshyft/*` in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`
- [X] T040 [P] Record localhost binding and canonical port validation for `admin-api`, `money-api`, and `connect-api` in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`
- [X] T041 [P] Record shared Postgres compatibility and `admin-api` production migration ownership validation in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`
- [X] T042 Record reproducible deployment runbook validation, persisted durability re-read validation, and final CS-005 evidence summary in `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies; can start immediately.
- **Phase 2: Foundational**: Depends on Setup completion and blocks all user stories.
- **Phase 3: User Story 1**: Depends on Foundational completion.
- **Phase 4: User Story 2**: Depends on Foundational completion and can proceed in parallel with User Story 1 once the shared persistence foundation exists.
- **Phase 5: User Story 3**: Depends on User Story 1 and User Story 2 because audit evidence must cover both outbound and webhook outcomes.
- **Phase 6: Polish**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after Foundational; this is the MVP.
- **User Story 2 (P1)**: No dependency on User Story 1 after Foundational, but shares the same reliability persistence and migration groundwork.
- **User Story 3 (P2)**: Depends on User Story 1 and User Story 2 because append-only audit verification must cover both command-side and webhook-side flows.

### Within Each User Story

- Tests MUST be written and fail before implementation changes for that story.
- Shared domain contracts and repository wiring precede route/application integration.
- Route/application integration precedes documentation evidence capture.
- Story-specific validation must pass before moving to the next dependent story.

### Parallel Opportunities

- Setup tasks marked `[P]` can run in parallel.
- Foundational domain contract tasks `T007` through `T010` and repository task `T012` can run in parallel after `T005` and `T006` establish the shared idempotency shape.
- User Story 1 test tasks `T015` through `T017` can run in parallel.
- User Story 2 test tasks `T022` through `T024` can run in parallel.
- User Story 3 test tasks `T029` through `T031` can run in parallel.
- Final validation tasks `T036`, `T037`, `T039`, `T040`, and `T041` can run in parallel once implementation is complete.

---

## Parallel Example: User Story 1

```bash
# Launch User Story 1 tests together:
Task: "Add shared idempotency decision coverage in /Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/__tests__/idempotencyService.test.ts"
Task: "Add outbound replay and conflict route coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts"
Task: "Add bridge-session idempotency integration coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch User Story 2 tests together:
Task: "Add webhook duplicate and retry-state route coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts"
Task: "Add webhook receipt replay and retry bookkeeping coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts"
Task: "Add shared dedupe and retry-policy unit coverage in /Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/__tests__/eventDeduper.test.ts and /Users/jeremiahotis/projects/connectshyft/domains/communication/reliability/__tests__/retryPolicy.test.ts"
```

---

## Parallel Example: User Story 3

```bash
# Launch User Story 3 tests together:
Task: "Add shared audit recorder coverage in /Users/jeremiahotis/projects/connectshyft/domains/communication/audit/__tests__/recordCommunicationAudit.test.ts"
Task: "Add outbound and duplicate-audit route assertions in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts"
Task: "Add webhook and bridge-audit assertions in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **Stop and validate** the duplicate outbound prevention flow independently.
5. Demo or ship the durable outbound idempotency slice if partial delivery is required.

### Incremental Delivery

1. Finish Setup + Foundational so durable reliability primitives and persistence are in place.
2. Deliver User Story 1 for outbound idempotency.
3. Deliver User Story 2 for replay-safe webhook processing and bounded retry intent.
4. Deliver User Story 3 for append-only audit evidence across both flows.
5. Finish Polish by recording full validation and constitution evidence in `quickstart.md`.

### Parallel Team Strategy

1. One developer completes Setup + Foundational.
2. After Foundational:
   - Developer A: User Story 1 outbound idempotency integration
   - Developer B: User Story 2 webhook replay-safety integration
3. Once both P1 stories stabilize, Developer C or either lane finishes User Story 3 audit integration and the final validation pass.

---

## Notes

- `[P]` tasks touch different files and can proceed in parallel once their prerequisites are met.
- Each user story remains independently testable and maps directly to the CS-005 spec.
- Idempotency must be persisted before side effects in every implementation task that touches outbound commands.
- Retry logic must remain bounded and must not bypass bridge or message domain ownership.
- Constitution-mandated routing, port, shared Postgres, and runbook validation tasks are explicit in the final phase.
