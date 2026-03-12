# Tasks: CS-004b Bridge Test Fixture Normalization

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/contracts/`, `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`

**Tests**: Targeted Jest validation and repository scans are required because the feature spec explicitly requires bridge-related suites to pass, vendor-labeled bridge fixtures to be removed, and boundary enforcement to remain green.

**Organization**: Tasks are grouped by user story so the bridge-facing fixture cleanup can be delivered as one independently testable normalization slice followed by one independently testable exception-preservation slice.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock the normalization contract and evidence workflow before editing bridge-related tests.

- [X] T001 Capture baseline before/after evidence placeholders and validation command targets in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`
- [X] T002 Align the normalized field set, neutral identifier examples, and allowed exception notes in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/contracts/bridge-test-fixture-contract.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the exact in-scope bridge-facing test files and current vendor-labeled fixture surfaces before any cleanup begins.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 [P] Review the current vendor-labeled bridge route fixture inventory in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- [X] T004 [P] Review the current vendor-labeled outbound dispatch fixture inventory in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- [X] T005 [P] Review the current vendor-labeled bridge-session fixture inventory in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- [X] T006 [P] Review the current vendor-labeled provider-correlation fixture inventory in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`

**Checkpoint**: The in-scope bridge-facing files and exception boundaries are confirmed and ready for targeted normalization.

---

## Phase 3: User Story 1 - Normalize Bridge Route and Module Fixtures (Priority: P1) 🎯 MVP

**Goal**: Replace vendor-labeled bridge-facing fixture names and shapes with provider-neutral values while preserving existing route, bridge-session, and provider-correlation test intent.

**Independent Test**: Run the targeted bridge Jest suites and confirm the bridge route, bridge session, and provider-correlation tests still pass while using provider-neutral identifiers and normalized correlation fields.

### Tests for User Story 1

- [X] T007 [P] [US1] Normalize bridge route fixture identifiers and correlation field names in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- [X] T008 [P] [US1] Normalize outbound dispatch fixture identifiers and correlation field names in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- [X] T009 [P] [US1] Normalize bridge-session adapter fixture values and persisted-state expectations in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- [X] T010 [P] [US1] Normalize provider-correlation fixture identifiers and neutral provider labels in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Run the targeted bridge Jest suites documented in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`

**Checkpoint**: User Story 1 is complete when the four bridge-facing Jest files use provider-neutral fixture names and all targeted suites still pass.

---

## Phase 4: User Story 2 - Preserve Allowed Provider-Native Translation Coverage (Priority: P2)

**Goal**: Keep provider-native payloads only where translation or signature verification is the thing being tested, while confirming bridge-domain and app-layer tests remain provider-neutral.

**Independent Test**: Run the targeted vendor-label scans and confirm any remaining provider-native payloads live only in infrastructure translation or signature-verification coverage, not in bridge-facing app or domain tests.

### Tests for User Story 2

- [X] T012 [P] [US2] Verify and, if needed, clarify the allowed provider-native webhook-signature exception in `/Users/jeremiahotis/projects/connectshyft/tests/support/helpers/connectShyftWebhookTestHelpers.ts`
- [X] T013 [P] [US2] Verify bridge-domain state-machine coverage remains provider-neutral in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts`
- [X] T014 [P] [US2] Verify bridge-domain event-handling coverage remains provider-neutral in `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`

### Implementation for User Story 2

- [X] T015 [US2] Run vendor-label scans across `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`, `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts`, `/Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/tests/support/helpers/connectShyftWebhookTestHelpers.ts`, then record which remaining provider-native fields are allowed exception surfaces in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`

**Checkpoint**: User Story 2 is complete when bridge-facing tests are clean and any remaining provider-native payloads are confined to explicit infrastructure-edge exception surfaces.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Capture final evidence and no-regression validation for the test-only cleanup.

- [X] T016 [P] Capture the final updated file list and before/after fixture naming examples in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`
- [X] T017 [P] Run `node scripts/enforce-workspace-boundaries.js` and record the result in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`
- [X] T018 Run the touched-file guard checks from `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md` and confirm no runtime deploy, routing, database, UI, or adapter files changed in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`
- [X] T019 [P] Record no-op Nginx routing delegation validation for `/api/v1/auth/*`, `/api/v1/platform/admin/*`, and `/api/v1/connectshyft/*` in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`
- [X] T020 [P] Record no-op localhost binding and canonical port validation for `admin-api`, `money-api`, and `connect-api` in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`
- [X] T021 [P] Record shared Postgres compatibility and `admin-api` production migration ownership validation in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`
- [X] T022 Record reproducible runbook validation for CS-004b as a no-runtime-change cleanup in `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and can begin immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all story work.
- **Phase 3: User Story 1** depends on Phase 2 and delivers the MVP bridge-facing fixture cleanup.
- **Phase 4: User Story 2** depends on Phase 3 because exception-surface validation assumes the bridge-facing normalization is already complete.
- **Phase 5: Polish** depends on the completion of both user stories and captures final evidence plus constitution-mandated no-op deployment validations.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Foundational and is the MVP slice.
- **US2 (P2)**: Depends on US1 because the exception scan only makes sense after bridge-facing fixture cleanup lands.

### Within Each User Story

- Review the in-scope file inventory before editing any bridge-facing test.
- Normalize bridge-facing fixture values and field names before running validation.
- Keep provider-specific `providerKey` values only where classification or provider selection itself is the behavior under test.
- Do not modify runtime production files unless a minimal type-alignment fix is strictly required.

### Recommended Completion Order

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1
4. Phase 4: US2
5. Phase 5: Polish

---

## Parallel Execution Examples

### User Story 1

```bash
Task: "T007 [US1] Normalize bridge route fixture identifiers and correlation field names in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts"
Task: "T008 [US1] Normalize outbound dispatch fixture identifiers and correlation field names in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts"
Task: "T009 [US1] Normalize bridge-session adapter fixture values and persisted-state expectations in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts"
Task: "T010 [US1] Normalize provider-correlation fixture identifiers and neutral provider labels in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts"
```

### User Story 2

```bash
Task: "T012 [US2] Verify and, if needed, clarify the allowed provider-native webhook-signature exception in /Users/jeremiahotis/projects/connectshyft/tests/support/helpers/connectShyftWebhookTestHelpers.ts"
Task: "T013 [US2] Verify bridge-domain state-machine coverage remains provider-neutral in /Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/bridgeStateMachine.test.ts"
Task: "T014 [US2] Verify bridge-domain event-handling coverage remains provider-neutral in /Users/jeremiahotis/projects/connectshyft/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the US1 independent test before advancing to exception-surface verification.

### Incremental Delivery

1. Deliver US1 to clean the four bridge-facing Jest files and keep them passing.
2. Add US2 to confirm the remaining provider-native payloads are limited to allowed infrastructure-edge coverage.
3. Finish with Phase 5 evidence capture, constitution no-op validation, and no-regression validation.

### Parallel Team Strategy

1. One developer can handle the two route test files while another handles the module test files in US1.
2. After US1 is complete, one developer can verify infrastructure-edge exceptions while another records evidence and boundary-validation output.
3. Serialize any repeated edits to `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/quickstart.md` and `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/contracts/bridge-test-fixture-contract.md` to avoid conflicts.

---

## Notes

- `[P]` means the task is parallelizable because it targets a separate file or independent validation surface with no incomplete upstream dependency.
- This task list is intentionally test-centric because CS-004b is a test-only normalization issue.
- The suggested MVP scope is **User Story 1 only**.
- No tasks modify UI files, schema files, runtime bridge orchestration code, or provider adapter implementation files.
