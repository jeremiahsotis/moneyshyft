# Tasks: ConnectShyft SMS Target Resolution in the Current Runtime Host

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/`
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/contracts/thread-message-dispatch.md`, `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/quickstart.md`

**Tests**: Jest and Supertest coverage are required because the feature spec explicitly includes tests and the quickstart defines automated regression commands.

**Organization**: Tasks are grouped by the user stories authored in the feature spec so each story can be implemented and tested independently in the current `apps/moneyshyft-api` runtime host.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`)
- Include exact file paths in descriptions

## Path Conventions

- Runtime host: `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/`
- Feature docs: `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the shared regression surfaces that will verify runtime-host-only behavior before implementation.

- [X] T001 Create outbound SMS target-resolution regression scaffolding in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- [X] T002 [P] Create source-fidelity regression scaffolding in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared runtime seams that both user stories depend on before any story-specific behavior is implemented.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 [P] Add `source` support to thread detail record types and selectable columns in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts`
- [X] T004 Define route-local SMS target resolution decision and refusal helper scaffolding in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T005 Add internal neighbor SMS dispatch profile loading and candidate normalization in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Checkpoint**: The current runtime host exposes the shared source and neighbor-resolution seams needed for story delivery.

---

## Phase 3: User Story 1 - Dispatch with a Deterministic SMS Target (Priority: P1) 🎯 MVP

**Goal**: Allow outbound thread-message sends to succeed when an explicit target is supplied or when the linked neighbor has exactly one deterministic SMS target and `prefers_texting = YES`.

**Independent Test**: `POST /api/v1/connectshyft/threads/:threadId/messages` succeeds when given an explicit target or a single deterministic neighbor target, returns the resolved `dispatch.dispatchContext.targetPhone`, and reports `thread.source = "SMS"` for outbound message dispatch.

### Tests for User Story 1

- [X] T006 [P] [US1] Add explicit outbound request-target precedence and deterministic neighbor fallback success cases in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- [X] T007 [P] [US1] Add source-aware thread detail expectations for outbound dispatch context in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`

### Implementation for User Story 1

- [X] T008 [US1] Implement source-aware thread reconstruction for outbound message and call flows in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T009 [US1] Implement deterministic explicit outbound request-target, neighbor-primary, and neighbor-single target selection in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T010 [US1] Wire resolved `targetPhone` and success-path `smsTargetResolution` metadata into outbound message dispatch handling in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Refuse Non-Deterministic or Non-Permitted Sends Explicitly (Priority: P2)

**Goal**: Return explicit business refusals when no deterministic target exists, when multiple target candidates exist, or when `prefers_texting` is not `YES`, without falling through to generic provider dispatch failure.

**Independent Test**: `POST /api/v1/connectshyft/threads/:threadId/messages` returns `CONNECTSHYFT_SMS_TARGET_PHONE_NOT_AVAILABLE`, `CONNECTSHYFT_SMS_MULTIPLE_TARGET_PHONES`, or `CONNECTSHYFT_SMS_TEXTING_NOT_PERMITTED` as appropriate, with `dispatchAttempted: false` and without using `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`.

### Tests for User Story 2

- [X] T011 [P] [US2] Add no-target and multiple-target explicit refusal coverage in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- [X] T012 [P] [US2] Add `prefers_texting` YES/NO/UNKNOWN dispatch-gating coverage in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts`

### Implementation for User Story 2

- [X] T013 [US2] Require `prefers_texting = YES` and bypass override-based send permission for outbound SMS in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T014 [US2] Return `CONNECTSHYFT_SMS_TARGET_PHONE_NOT_AVAILABLE` and `CONNECTSHYFT_SMS_MULTIPLE_TARGET_PHONES` from pre-provider SMS resolution failures in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T015 [US2] Return `CONNECTSHYFT_SMS_TEXTING_NOT_PERMITTED` and preserve non-generic refusal metadata in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Checkpoint**: User Story 2 is fully functional and independently testable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Close documentation, validation, and runtime-host boundary checks across the shipped stories.

- [X] T016 [P] Update outbound SMS validation and regression steps in `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/quickstart.md`
- [X] T017 [P] Create or update feature review guidance in `/Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/connectshyft-sms-target-resolution.md`
- [X] T018 [P] Run the outbound SMS route, read-contract, and SMS preference regression suites defined by `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/package.json`
- [X] T019 [P] Validate current ConnectShyft route ownership against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf`
- [X] T020 [P] Validate localhost-only API binding and port expectations against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/server.ts` and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T021 [P] Validate shared PostgreSQL connectivity and compatibility against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T022 [P] Validate reproducible deployment runbook coverage for this feature in `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/quickstart.md` and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T023 [P] Validate that outbound SMS target resolution does not introduce new cross-service or provider-layer hops in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/providerRegistry.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and can begin immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user stories.
- **Phase 3: User Story 1** depends on Phase 2 and is the recommended MVP slice.
- **Phase 4: User Story 2** depends on Phase 2 and should follow User Story 1 because both stories edit `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`.
- **Phase 5: Polish** depends on the completion of the stories being shipped.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Foundational and delivers the MVP success path.
- **US2 (P2)**: Depends on the same foundational seams as US1 and should build on the resolved success path so refusal coverage is verified against the final dispatch orchestration.

### Within Each User Story

- Write the story tests first and confirm they fail before implementation.
- Apply read-contract and source support before finalizing outbound thread reconstruction.
- Implement target selection before wiring the provider dispatch call to use the resolved phone.
- Add explicit refusal mapping before finalizing the generic provider-dispatch failure path.

### Dependency Graph

```text
Phase 1 Setup
  -> Phase 2 Foundational
    -> US1 (P1 deterministic success path + source fidelity)
      -> US2 (P2 explicit pre-provider refusals)
        -> Phase 5 Polish
```

---

## Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel because they touch different test files.
- **Phase 2**: T003 can run in parallel with T004 because it touches `readContracts.ts` while T004 starts route-local helper scaffolding in `connectshyft.ts`.
- **US1**: T006 and T007 can run in parallel as separate regression files.
- **US2**: T011 and T012 can run in parallel as separate route and module test files.
- **Polish**: T016 through T023 can run in parallel once implementation is complete.

## Parallel Example: User Story 1

```bash
Task: "Add explicit outbound request-target precedence and deterministic neighbor fallback success cases in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts"
Task: "Add source-aware thread detail expectations for outbound dispatch context in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add no-target and multiple-target explicit refusal coverage in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts"
Task: "Add prefers_texting YES/NO/UNKNOWN dispatch-gating coverage in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the US1 independent test for explicit outbound request-target precedence, deterministic neighbor fallback, and `thread.source = "SMS"`.
5. Stop here if the immediate MVP is successful SMS dispatch from the current runtime host.

### Incremental Delivery

1. Deliver US1 to restore deterministic outbound SMS success behavior.
2. Deliver US2 to harden explicit refusal behavior and remove generic pre-provider failure collapse.
3. Finish Phase 5 validation and documentation updates.

### Parallel Team Strategy

1. One developer can prepare route regression coverage while another prepares read-contract/source regression coverage in Phase 1.
2. After Foundational completes, one developer can handle source/read-contract implementation while another authors the US1 route success tests.
3. For US2, route refusal coverage and SMS preference module coverage can be developed in parallel before the final `connectshyft.ts` refusal wiring lands.

---

## Notes

- `US1` and `US2` map directly to the authored user stories in `/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/spec.md`.
- All tasks keep the work inside `apps/moneyshyft-api` and preserve the runtime-host constraint from the design docs.
- No task moves logic into `apps/connectshyft-api` or redesigns provider adapters.
