# Tasks: CS-004 Call Bridge Flow

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/contracts/`

**Tests**: Jest coverage is required because the feature spec explicitly calls for domain, persistence, route, and webhook automation for bridge-session orchestration.

**Organization**: Tasks are grouped by user story so each bridge-flow slice remains independently implementable and testable while preserving the ADR boundaries.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the bridge issue workspace and test harnesses before bridge behavior is implemented.

- [x] T001 Create bridge domain test scaffolding in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts`
- [x] T002 [P] Create bridge orchestration test scaffolding in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`
- [x] T003 [P] Create ConnectShyft bridge persistence test scaffolding in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- [x] T004 [P] Create call-route and webhook bridge integration test scaffolding in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- [x] T005 [P] Create bridge migration test scaffolding in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftBridgeSessionsMigration.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared bridge contract, persistence, and provider boundary required by every user story.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T006 Extend bridge command, aggregate, repository, and provider-event types in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/bridgeSessionTypes.ts`
- [x] T007 [P] Make bridge session and leg transitions replay-tolerant in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/bridgeStateMachine.ts`
- [x] T008 [P] Define typed bridge telephony command/result contracts in `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts`
- [x] T009 Export the bridge domain surface from `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/index.ts` and `/Users/jeremiahotis/projects/connectshyft/domains/communication/index.ts`
- [x] T010 Create persisted bridge session and bridge leg storage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260311110000_create_connectshyft_bridge_sessions.ts`
- [x] T011 Create the ConnectShyft bridge session repository and persistence adapter in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- [x] T012 Update provider call-leg correlation persistence to map provider identifiers to bridge-leg records in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`
- [x] T013 Extend ConnectShyft provider registry wiring for typed bridge-control methods in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- [x] T014 Implement the typed Telnyx bridge-capable adapter surface in `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`

**Checkpoint**: Shared bridge types, persistence scaffolding, and provider-neutral bridge capabilities exist and compile.

---

## Phase 3: User Story 1 - Start a Persisted Bridge Session (Priority: P1) 🎯 MVP

**Goal**: Replace direct call dispatch with persisted bridge-session creation plus operator-leg initiation.

**Independent Test**: Call `POST /api/v1/connectshyft/threads/:threadId/call` and verify one bridge session plus two bridge legs are persisted, the session is in `operator_dialing`, and the operator leg is in `dialing` or `ringing`.

### Tests for User Story 1

- [x] T015 [P] [US1] Add bridge-session initialization and operator-leg transition coverage in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts`
- [x] T016 [P] [US1] Add start-bridge-session orchestration tests in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`
- [x] T017 [P] [US1] Add persistence tests for created session and two created legs in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- [x] T018 [P] [US1] Add route contract coverage for persisted bridge-session creation and provider-neutral response fields (`bridgeSessionId`, `sessionState`, `operatorLegState`, `neighborLegState`, `failureCode`, `failureMessage`) in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`

### Implementation for User Story 1

- [x] T019 [US1] Update bridge-session startup orchestration in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/startBridgeSession.ts`
- [x] T020 [US1] Persist created bridge aggregates and operator-leg startup updates in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- [x] T021 [US1] Update the thread call route to create a bridge session instead of dispatching a one-off call leg in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [x] T022 [US1] Persist operator-leg provider call mappings to bridge-leg IDs in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`

**Checkpoint**: User Story 1 is complete with persisted bridge-session creation, provider-neutral route payload coverage, and operator-leg initiation validation.

---

## Phase 4: User Story 2 - Advance the Bridge via Provider-Neutral Events (Priority: P1)

**Goal**: Progress operator answer -> neighbor dialing -> bridged through translated provider events and persisted orchestration.

**Independent Test**: Rehydrate a persisted aggregate, apply translated `operator_answered` and `neighbor_answered` events, and verify neighbor dialing and bridge control each happen exactly once.

### Tests for User Story 2

- [x] T023 [P] [US2] Add operator-answered and neighbor-answered progression tests in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`
- [x] T024 [P] [US2] Add persistence tests for provider-leg lookup and aggregate save-after-event in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- [x] T025 [P] [US2] Add webhook integration tests for operator answered -> neighbor dialing -> bridged and verify duplicate webhook receipts are ignored before bridge orchestration in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- [x] T026 [P] [US2] Add Telnyx bridge-control and translated bridge-event tests in `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`

### Implementation for User Story 2

- [x] T027 [US2] Create provider-event bridge orchestration in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/handleProviderBridgeEvent.ts`
- [x] T028 [US2] Update bridge-state transitions for neighbor dialing and bridge connection in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/bridgeStateMachine.ts`
- [x] T029 [US2] Add aggregate lookup by provider leg and save-after-event semantics in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- [x] T030 [US2] Route translated bridge webhook events into the bridge application flow in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [x] T031 [US2] Implement Telnyx bridge control and bridge-event translation in `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`
- [x] T032 [US2] Pass bridge-capable provider methods through the guardrailed provider registry in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`

**Checkpoint**: User Story 2 is complete with provider-neutral webhook progression, duplicate-receipt suppression, and single-fire bridge control validation.

---

## Phase 5: User Story 3 - Persist Terminal Bridge Outcomes (Priority: P2)

**Goal**: Persist authoritative completion and failure states that survive refreshes and webhook retries.

**Independent Test**: Apply `completed`, `operator_failed`, `neighbor_failed`, and `bridge_failed` events to persisted bridge aggregates and verify terminal states are durable and duplicate terminal events are suppressed.

### Tests for User Story 3

- [x] T033 [P] [US3] Add completion and failure transition coverage in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts`
- [x] T034 [P] [US3] Add terminal-state replay-suppression tests in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`
- [x] T035 [P] [US3] Add terminal persistence tests for completed and failed sessions, including canonical `failureCode` mapping (`operator_failed`, `neighbor_failed`, `bridge_failed`), in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- [x] T036 [P] [US3] Add route/webhook integration tests for completion, failure handling, duplicate terminal-webhook suppression, and reload-after-refresh state rehydration in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- [x] T037 [P] [US3] Add migration assertions for bridge table constraints and indexes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftBridgeSessionsMigration.test.ts`
- [x] T049 [P] [US3] Add integration coverage proving a fresh API read returns persisted bridge state after simulated refresh, so the frontend is not the source of truth, in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`

### Implementation for User Story 3

- [x] T038 [US3] Persist terminal bridge session and leg timestamps plus failure metadata in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/bridgeStateMachine.ts`
- [x] T039 [US3] Finalize terminal-event orchestration and duplicate suppression in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/handleProviderBridgeEvent.ts`
- [x] T040 [US3] Persist terminal bridge aggregate updates and bridge-leg reconciliation in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- [x] T041 [US3] Update webhook handling to report terminal bridge outcomes without duplicate side effects in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [x] T042 [US3] Finalize bridge-session schema constraints and indexes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260311110000_create_connectshyft_bridge_sessions.ts`

**Checkpoint**: User Story 3 is complete with canonical failure-code persistence, duplicate terminal-webhook suppression, and refresh-safe thread readback validation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Capture final bridge contracts, validation steps, and no-regression evidence.

- [x] T043 [P] Update bridge domain contract details in `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/contracts/bridge-domain-service.md`
- [x] T044 [P] Update call-route bridge contract details, including the authoritative provider-neutral bridge-state payload returned to the UI, in `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/contracts/connectshyft-call-route.md`
- [x] T045 [P] Update provider-neutral bridge interface details in `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/contracts/telephony-bridge-provider-interface.md`
- [x] T046 [P] Record Nginx routing delegation validation for `/api/v1/auth/*`, `/api/v1/platform/admin/*`, and `/api/v1/connectshyft/*` in `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/quickstart.md`
- [x] T047 [P] Record ConnectShyft API localhost-only binding / canonical port validation and shared Postgres connectivity plus production migration ownership evidence in `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/quickstart.md`
- [x] T048 Run targeted CS-004 build and Jest suites, then record reproducible deployment/runbook verification with no manual adjustments in `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and can begin immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all story work.
- **Phase 3: User Story 1** depends on Phase 2 and delivers the MVP bridge-session start flow.
- **Phase 4: User Story 2** depends on Phase 3 because provider-event progression requires persisted session and leg creation to exist first.
- **Phase 5: User Story 3** depends on Phase 4 because terminal outcomes rely on the event-handling and bridge-control path already being in place.
- **Phase 6: Polish** depends on the stories intended for shipment and the resulting validation evidence.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Foundational and is the MVP slice.
- **US2 (P1)**: Depends on US1 because bridge progression cannot happen before bridge-session startup exists.
- **US3 (P2)**: Depends on US2 because terminal outcome handling builds on the same webhook-driven progression path.

### Within Each User Story

- Write the story tests first and confirm they fail before implementation.
- Complete domain transition logic before route or webhook wiring that depends on it.
- Complete persistence support before provider-correlation changes that rely on persisted bridge-leg IDs.
- Keep raw Telnyx handling confined to infrastructure during every story.

### Recommended Completion Order

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1
4. Phase 4: US2
5. Phase 5: US3
6. Phase 6: Polish

---

## Parallel Execution Examples

### User Story 1

```bash
Task: "T015 [US1] Add bridge-session initialization and operator-leg transition coverage in /Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts"
Task: "T017 [US1] Add persistence tests for created session and two created legs in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts"
Task: "T018 [US1] Add route contract coverage for persisted bridge-session creation in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts"
```

### User Story 2

```bash
Task: "T023 [US2] Add operator-answered and neighbor-answered progression tests in /Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts"
Task: "T025 [US2] Add webhook integration tests for operator answered -> neighbor dialing -> bridged in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts"
Task: "T026 [US2] Add Telnyx bridge-control and translated bridge-event tests in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts"
```

### User Story 3

```bash
Task: "T033 [US3] Add completion and failure transition coverage in /Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts"
Task: "T035 [US3] Add terminal persistence tests for completed and failed sessions in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts"
Task: "T037 [US3] Add migration assertions for bridge table constraints and indexes in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftBridgeSessionsMigration.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the US1 independent test before advancing to webhook-driven progression.

### Incremental Delivery

1. Deliver US1 to create authoritative persisted bridge sessions.
2. Add US2 to progress the bridge from translated provider events.
3. Add US3 to finalize durable completion and failure handling.
4. Finish with the Phase 6 validation and documentation evidence.

### Parallel Team Strategy

1. One developer completes the shared domain and persistence foundation.
2. After Phase 2, one developer can focus on domain tests and orchestration while another prepares route and infrastructure tests.
3. Serialize edits to `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts` to avoid conflicts.

---

## Notes

- `[P]` means the task is parallelizable because it targets a different file or documentation artifact with no incomplete upstream dependency.
- No tasks modify `apps/connectshyft-web` or introduce provider-specific code under `apps/`.
- No tasks turn CS-004 into the full CS-005 reliability or audit epic; they stay limited to persisted bridge orchestration, bridge control, and replay-safe progression already required by the issue.
