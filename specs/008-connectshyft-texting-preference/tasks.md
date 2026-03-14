# Tasks: ConnectShyft Texting Preference Persistence and Display

**Input**: Design documents from `/specs/008-connectshyft-texting-preference/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Backend Jest and Supertest coverage are required by the feature spec; manual ConnectShyft web verification is required by quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Backend runtime host: `apps/moneyshyft-api/src/`
- Current ConnectShyft web UI: `apps/connectshyft-web/src/`
- Feature docs: `specs/008-connectshyft-texting-preference/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the route-test surface and task-specific verification targets before changing runtime behavior.

- [X] T001 Create the neighbor route regression test file in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared request/DTO boundaries needed by both backend persistence and frontend submission work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Extend shared frontend neighbor create/update input types for `prefersTexting` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/neighbors.ts`
- [X] T003 [P] Add canonical `prefersTexting` input support to backend neighbor command and store types in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T004 Add route body parsing support for `prefersTexting` and `prefers_texting`, including invalid-as-omitted behavior, in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Checkpoint**: Shared DTO and parser boundaries are ready for story implementation.

---

## Phase 3: User Story 1 - Persist Canonical Texting Preference Through the Current Neighbor API (Priority: P1) 🎯 MVP

**Goal**: Ensure create/update requests persist canonical texting preferences, default new neighbors to `YES`, and return the stored enum unchanged in the current runtime host.

**Independent Test**: Creating a neighbor without an explicit preference returns `prefersTexting: "YES"`, creating with explicit `YES|NO|UNKNOWN` returns the same enum, invalid incoming values behave like omission, and updating a neighbor changes or preserves the persisted enum without degrading `YES` to `UNKNOWN`.

### Tests for User Story 1

- [X] T005 [P] [US1] Add create-default, explicit-enum, and invalid-as-omitted persistence regression tests in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- [X] T006 [P] [US1] Add create/update route response and invalid-input regression tests in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

### Implementation for User Story 1

- [X] T007 [US1] Persist default `YES` and explicit canonical create values in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T008 [US1] Persist update-time texting preference changes and omission-preserve behavior in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T009 [US1] Pass canonical texting preference through create and update route handlers in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Checkpoint**: The current ConnectShyft runtime host persists and returns canonical texting preferences correctly without any UI work.

---

## Phase 4: User Story 2 - Submit and Display Exact Contract Labels in the Current ConnectShyft UI (Priority: P2)

**Goal**: Ensure the current ConnectShyft web UI sends the chosen preference on create/update and renders exact contract labels in inbox and thread-detail snapshot chips.

**Independent Test**: Using the current create or profile UI to save `YES`, `NO`, or `UNKNOWN` results in the snapshot chip showing exactly `Prefers Texting`, `Prefers Calls Only`, or `Texting Preference Unknown`.

### Implementation for User Story 2

- [X] T010 [US2] Send `prefersTexting` in create and update API payloads in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/neighbors.ts`
- [X] T011 [P] [US2] Submit the create-view texting preference selector in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
- [X] T012 [P] [US2] Add profile-view texting preference selector load/save wiring in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
- [X] T013 [US2] Update exact contract label mapping for preference chips in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/presentation.ts`

**Checkpoint**: The current ConnectShyft UI round-trips canonical texting preferences and shows exact contract copy on existing snapshot surfaces.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, verification notes, and PR guardrails across the implemented stories.

- [X] T014 [P] Execute and confirm the manual UI verification scenarios documented in `/Users/jeremiahotis/projects/connectshyft/specs/008-connectshyft-texting-preference/quickstart.md`
- [X] T015 [P] Create or update PR validation guidance for this feature in `/Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/connectshyft-texting-preference.md`
- [X] T016 [P] Run the backend neighbor module regression suite defined by `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/package.json`
- [X] T017 [P] Run the backend neighbor route regression suite defined by `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/package.json`
- [X] T018 [P] Validate ConnectShyft lane route ownership remains confined to `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T019 [P] Verify no API binding or port configuration changes were introduced for this feature using `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api` and deployment documentation
- [X] T020 [P] Confirm shared Postgres compatibility for texting-preference persistence against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T021 [P] Verify reproducible validation steps for this feature are captured in `/Users/jeremiahotis/projects/connectshyft/specs/008-connectshyft-texting-preference/quickstart.md`
- [X] T022 [P] Validate host Nginx routing remains correct for ConnectShyft lane traffic using `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf` and deployment routing documentation
- [X] T023 [P] Verify reproducible deployment runbook coverage for this feature using `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks both user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2; delivers the MVP backend fix.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and should follow User Story 1 so UI verification runs against the corrected backend behavior.
- **Polish (Phase 5)**: Depends on completion of the stories being shipped and closes constitution-required validation tasks.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after Phase 2; this is the suggested MVP scope.
- **US2 (P2)**: Depends on US1 for backend round-trip behavior, but remains independently testable once US1 is complete.

### Within Each User Story

- Backend tests for US1 should be written first and fail before implementation.
- Backend persistence changes in `neighbors.ts` must land before route wiring is finalized.
- Shared frontend payload support in `features/connectshyft/neighbors.ts` should land before the create/profile views are wired.
- Exact label mapping should be updated after payload round-trip wiring is in place.

### Dependency Graph

```text
Phase 1 Setup
  -> Phase 2 Foundational
    -> US1 (P1 backend persistence + API round-trip)
      -> US2 (P2 UI submission + exact label display)
        -> Phase 5 Polish
```

---

## Parallel Opportunities

- **Phase 2**: T002 and T003 can run in parallel because they touch separate frontend and backend files.
- **US1**: T005 and T006 can run in parallel as separate backend test files.
- **US2**: After T010, T011 and T012 can run in parallel because they touch different Vue views.
- **Polish**: T014 through T023 can run in parallel once implementation is complete.

## Parallel Example: User Story 1

```bash
# Backend regression tests for US1 in parallel:
Task: "Add create-default, explicit-enum, and invalid-as-omitted persistence regression tests in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts"
Task: "Add create/update route response and invalid-input regression tests in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts"
```

## Parallel Example: User Story 2

```bash
# UI view wiring for US2 in parallel after payload support exists:
Task: "Submit the create-view texting preference selector in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue"
Task: "Add profile-view texting preference selector load/save wiring in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the backend create/update API independently using the new Jest and Supertest coverage
5. Stop here if only the runtime persistence/API fix is needed for the MVP

### Incremental Delivery

1. Finish Setup + Foundational
2. Deliver US1 and validate backend persistence/API round-trip
3. Deliver US2 and validate UI submission/display against the corrected backend
4. Finish Polish tasks and PR validation notes

### Parallel Team Strategy

1. One developer handles backend shared typing/parser work while another handles frontend DTO work in Phase 2.
2. In US1, one developer can author module tests while another authors route tests before backend implementation closes the failures.
3. In US2, create and profile view wiring can proceed in parallel once shared frontend payload support is merged.

---

## Notes

- All tasks follow the required checklist format with task ID, optional `[P]`, required story labels for story phases, and exact file paths.
- No task moves code into `apps/connectshyft-api` or performs lane-convergence refactors.
- The task plan assumes the runtime fix remains centered on `apps/moneyshyft-api` and the current ConnectShyft web UI surfaces only.
