# Tasks: CS-003 Telnyx Outbound Adapter

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/`
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/contracts/`

**Tests**: Jest and sandbox-validation tasks are required because the feature spec explicitly calls for automated coverage and Telnyx sandbox evidence.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently while preserving the ADR telephony boundary.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the shared telephony and Telnyx adapter scaffolding before contract work begins.

- [X] T001 Create shared telephony scaffolding in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts and /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts
- [X] T002 [P] Create Telnyx adapter test scaffolding in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts
- [X] T003 [P] Document Telnyx outbound environment requirements in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/.env.example
- [X] T004 [P] Expand the connect-api production build context to include /Users/jeremiahotis/projects/connectshyft/infrastructure/communications in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the provider-neutral telephony boundary and adapter wiring that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 Define provider-neutral telephony command/result types and the adapter interface in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts
- [X] T006 [P] Export the shared telephony contract from /Users/jeremiahotis/projects/connectshyft/domains/communication/index.ts
- [X] T007 [P] Expand ConnectShyft TypeScript compilation roots for shared infrastructure imports in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/tsconfig.json
- [X] T008 Replace the Telnyx stub with a contract-conformant adapter factory skeleton in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts
- [X] T009 Refactor ConnectShyft provider resolution to consume the shared telephony contract in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts

**Checkpoint**: Shared telephony and adapter boundaries exist, compile, and are ready for story-specific behavior.

---

## Phase 3: User Story 1 - Outbound SMS Through Telnyx (Priority: P1) 🎯 MVP

**Goal**: Dispatch real outbound SMS through Telnyx while keeping app code provider-neutral and persisting truthful message correlation.

**Independent Test**: Send an outbound message from an existing ConnectShyft thread against a Telnyx-backed test configuration, verify `data.dispatch.providerMessageId`, and confirm one outbound thread message plus provider correlation metadata is stored for one idempotent request.

### Tests for User Story 1

- [X] T010 [P] [US1] Add SMS contract assertions for the shared telephony interface in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts
- [X] T011 [P] [US1] Add Telnyx SMS adapter tests for auth headers, request payloads, and failure mapping in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts
- [X] T012 [P] [US1] Add outbound SMS provider-resolution regression coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- [X] T013 [P] [US1] Add outbound SMS route contract coverage for real providerMessageId values and idempotent retries in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts

### Implementation for User Story 1

- [X] T014 [US1] Implement Telnyx SMS dispatch and provider-neutral result mapping in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts
- [X] T015 [US1] Persist truthful SMS provider reference mappings for idempotent dispatches in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts
- [X] T016 [US1] Integrate outbound SMS provider resolution through the shared telephony contract in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts
- [X] T017 [US1] Wire the outbound message route to return real providerMessageId values and single-write thread persistence in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Outbound Voice Initiation Through Telnyx (Priority: P2)

**Goal**: Initiate a real Telnyx outbound call leg while preserving existing ConnectShyft bridge/manual-retry guardrails and avoiding bridge-session behavior.

**Independent Test**: Initiate an outbound call from an existing ConnectShyft thread against a Telnyx-backed test configuration, verify `data.dispatch.providerLegId`, and confirm the request respects existing guardrails without introducing bridge-session state.

### Tests for User Story 2

- [X] T018 [P] [US2] Add outbound voice contract assertions for the shared telephony interface in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts
- [X] T019 [P] [US2] Add Telnyx outbound call tests for auth headers, request payloads, and failure mapping in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts
- [X] T020 [P] [US2] Add outbound call guardrail coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- [X] T021 [P] [US2] Add outbound call route contract coverage for real providerLegId values and no bridge-session leakage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts

### Implementation for User Story 2

- [X] T022 [US2] Implement Telnyx outbound call initiation with provider-neutral leg results in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts
- [X] T023 [US2] Persist truthful call-leg provider correlation mappings for later webhook reconciliation in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts
- [X] T024 [US2] Enforce bridge/manual-retry call guardrails through the shared telephony contract in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts
- [X] T025 [US2] Wire the outbound call route to return real providerLegId values without bridge-session orchestration in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts

**Checkpoint**: User Story 2 is fully functional and independently testable.

---

## Phase 5: User Story 3 - Provider-Neutral Boundary and Operational Evidence (Priority: P3)

**Goal**: Keep Telnyx isolated behind the shared telephony contract and provide the operational evidence required to prove the boundary is real and maintainable.

**Independent Test**: Inspect the affected source tree and automated tests to verify provider-specific logic remains only under `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx`, the shared contract is exported from `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony`, and sandbox validation steps are documented.

### Tests for User Story 3

- [X] T026 [P] [US3] Add Telnyx webhook verification and provider-event translation tests in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts
- [X] T027 [P] [US3] Add provider-neutral boundary regression coverage for ConnectShyft adapter consumption in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- [X] T028 [P] [US3] Add root-domain export coverage for telephony imports through /Users/jeremiahotis/projects/connectshyft/domains/communication/index.ts in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts

### Implementation for User Story 3

- [X] T029 [US3] Implement Telnyx webhook signature verification and provider-event translation behind the shared contract in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts
- [X] T030 [P] [US3] Update provider-neutral telephony interface documentation in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/contracts/telephony-provider-interface.md
- [X] T031 [P] [US3] Update ConnectShyft outbound dispatch contract evidence for SMS and voice results in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/contracts/connectshyft-outbound-dispatch.md
- [X] T032 [P] [US3] Record Telnyx sandbox validation steps and ADR/data-model compliance evidence in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/quickstart.md

**Checkpoint**: User Story 3 is fully functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate constitution-required no-regression checks and capture the final execution runbook.

- [X] T033 [P] Validate unchanged ConnectShyft and admin route ownership against /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts and /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts, then record the result in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/quickstart.md
- [X] T034 [P] Validate connect-api localhost binding and production build inputs against /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/server.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production, then record the result in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/quickstart.md
- [X] T035 [P] Validate shared Postgres compatibility and `admin-api` migration ownership against /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/knexfile.ts, /Users/jeremiahotis/projects/connectshyft/apps/admin-api/package.json, and /Users/jeremiahotis/projects/connectshyft/docs/DEPLOYMENT_CHECKLIST.md, then record the result in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/quickstart.md
- [X] T036 [P] Record final build, Jest, workspace-boundary, and Telnyx sandbox validation commands for /Users/jeremiahotis/projects/connectshyft/scripts/enforce-workspace-boundaries.js in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and can begin immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks every user story.
- **Phase 3: User Story 1** depends on Phase 2 and is the recommended MVP slice.
- **Phase 4: User Story 2** depends on Phase 2; if staffed in parallel with User Story 1, tasks touching `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` must be sequenced.
- **Phase 5: User Story 3** depends on Phase 2 and should complete after the SMS and voice adapter surfaces are real enough to document and validate.
- **Phase 6: Polish** depends on the stories you intend to ship and records the final no-regression evidence.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Foundational and delivers the MVP.
- **US2 (P2)**: Can start after Foundational, but it extends the same Telnyx adapter and registry files used by US1, so the recommended completion order is US1 → US2.
- **US3 (P3)**: Can start after Foundational for documentation/test work, but its implementation evidence depends on the real adapter behavior from US1 and US2.

### Within Each User Story

- Write the story tests first and confirm they fail before implementation.
- Implement infrastructure adapter behavior before app-layer provider integration.
- Update provider correlation persistence before final route wiring when a story requires truthful provider IDs.
- Do not mark a story complete until its independent test passes and its documentation evidence is updated where required.

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
Task: "T010 [US1] Add SMS contract assertions for the shared telephony interface in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts"
Task: "T011 [US1] Add Telnyx SMS adapter tests for auth headers, request payloads, and failure mapping in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts"
Task: "T012 [US1] Add outbound SMS provider-resolution regression coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts"
Task: "T013 [US1] Add outbound SMS route contract coverage for real providerMessageId values and idempotent retries in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts"
```

### User Story 2

```bash
Task: "T018 [US2] Add outbound voice contract assertions for the shared telephony interface in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts"
Task: "T019 [US2] Add Telnyx outbound call tests for auth headers, request payloads, and failure mapping in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts"
Task: "T020 [US2] Add outbound call guardrail coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts"
Task: "T021 [US2] Add outbound call route contract coverage for real providerLegId values and no bridge-session leakage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts"
```

### User Story 3

```bash
Task: "T026 [US3] Add Telnyx webhook verification and provider-event translation tests in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts"
Task: "T027 [US3] Add provider-neutral boundary regression coverage for ConnectShyft adapter consumption in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts"
Task: "T030 [US3] Update provider-neutral telephony interface documentation in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/contracts/telephony-provider-interface.md"
Task: "T032 [US3] Record Telnyx sandbox validation steps and ADR/data-model compliance evidence in /Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/quickstart.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the US1 independent test and the required build/test evidence in `/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/quickstart.md`.

### Incremental Delivery

1. Deliver US1 to replace synthetic outbound SMS with a real Telnyx-backed dispatch path.
2. Add US2 to replace synthetic outbound call initiation while keeping bridge-session work deferred.
3. Add US3 to harden webhook translation/verification and complete the boundary and sandbox evidence.
4. Finish with Phase 6 no-regression checks before merge or deployment.

### Parallel Team Strategy

1. One developer completes Phase 1 and Phase 2.
2. After Phase 2, one developer can own infrastructure tests and adapter work while another prepares route and registry tests.
3. Serialize edits to `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to avoid conflicts.

---

## Notes

- `[P]` means the task is parallelizable because it targets a different file or documentation artifact with no incomplete upstream dependency.
- Every user story includes explicit tests because the spec requires automated coverage and Telnyx sandbox evidence.
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts` is intentionally introduced as a dedicated outbound-route regression harness for CS-003.
- No tasks add UI work, cross-lane APIs, or bridge-session persistence because those are explicitly out of scope for CS-003.
