# Tasks: ConnectShyft Master Debugging

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/`
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/contracts/`

**Tests**: Included because the user explicitly required build, test, manual smoke, regression, and stop-point tasks for each patch boundary.

**Organization**: Tasks are grouped by the locked patch order and mapped to the corresponding user stories from the feature spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Maps to the locked user stories and patch order
- **All task descriptions include exact file paths**

## Phase 1: Setup (Shared Constraints)

**Purpose**: Load and confirm the locked ConnectShyft-only execution boundaries before touching code

- [x] T001 Review scope, phase order, and no-touch rules in /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/spec.md before editing any runtime file
- [x] T002 Review exact patch boundaries and stop points in /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/plan.md and /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/implementation-checklist.md before implementation starts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Capture the current ConnectShyft baseline and lock the active runtime entry points before Patch 1

**⚠️ CRITICAL**: No patch work should begin until this phase is complete

- [x] T003 [P] Run the baseline ConnectShyft backend test suite from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json before Patch 1 changes
- [x] T004 [P] Run the baseline ConnectShyft frontend build from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/package.json before Patch 1 changes
- [x] T005 Confirm the live runtime entry points in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/router/index.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts and keep all later tasks inside those ConnectShyft surfaces

**Checkpoint**: Baseline captured and runtime boundary locked

---

## Phase 3: User Story 1 - Trust Saved Texting Preference (Priority: P1) 🎯 MVP

**Patch**: Patch 1 - texting preference persistence and display

**Goal**: Fix the data-loss defect where `prefersTexting` is dropped at the API boundary and persisted as `UNKNOWN`, while keeping the patch independently reviewable and mergeable

**Independent Test**: Create and update a neighbor, reload the profile and summary surfaces, and confirm the same canonical texting preference is persisted, returned, displayed, and reused by SMS gating

### Tests and verification for User Story 1

- [x] T006 [P] [US1] Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts for new-neighbor default `YES`, explicit create values, route-through update behavior, and canonical serializer output
- [x] T007 [P] [US1] Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts for authoritative neighbor-record SMS gating and permitted fallback behavior in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts

### Implementation for User Story 1

- [x] T008 [US1] Update request parsing, POST/PUT handlers, and route-local neighbor update forwarding including /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts and `updateNeighborWithSideEffects` in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts to accept and forward canonical `prefersTexting`
- [x] T009 [US1] Update create/update input shapes, in-memory persistence, Knex persistence, defaults, and serializer mapping in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts so new neighbors default to `YES` and updates persist canonical values
- [x] T010 [US1] Align /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts so durable neighbor-record preference is authoritative for SMS gating when resolvable and fallback only covers non-durable or unavailable cases
- [x] T011 [US1] Adjust /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/neighbors.ts only if T008-T010 require narrow payload or parsing alignment for ConnectShyft neighbor requests and responses
- [x] T012 [US1] Run the post-implementation backend verification from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json and confirm T006 and T007 pass after T008-T011
- [ ] T013 [US1] Run the post-implementation frontend build from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/package.json and manually smoke /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/components/connectshyft/ConnectShyftNeighborSnapshot.vue, and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/presentation.ts against /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/quickstart.md
- [ ] T014 [US1] Stop here after Patch 1, verify mergeable scope and regression readiness against /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/plan.md, and commit before opening Patch 2

**Checkpoint**: Patch 1 is complete, independently testable, and safe to merge before any refusal or SMS target work begins

---

## Phase 4: User Story 2 - See Refusal State Clearly (Priority: P2)

**Patch**: Patch 2 - refusal rendering

**Goal**: Preserve business refusal code, message, and structured data through the shared thread action wrapper and inbox rendering path without redesigning the backend envelope

**Independent Test**: Trigger a known business refusal and a transport failure, then confirm inbox and thread detail keep them distinct and do not treat `ok: false` as success

### Implementation and verification for User Story 2

- [X] T015 [US2] Update shared action and result wrappers in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/threads.ts so business refusals preserve `code`, `message`, and structured `data` instead of flattening them
- [X] T016 [US2] Update refusal state and submit handlers in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue so inbox actions render business refusals distinctly from transport failures
- [X] T017 [US2] Normalize /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue only if needed so refusal semantics stay aligned with T015 and T016 without reducing the richer thread-detail behavior
- [X] T018 [US2] Adjust operator-safe refusal copy helpers in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/uiContracts.ts only if needed so T015-T017 preserve refusal message and data semantics
- [X] T019 [US2] Add a focused refusal-shape guardrail in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/threads.ts that proves `code`, `message`, `data.uiFeedback`, and `data.preferencePolicy` survive wrapper normalization for future Patch 3 refusals
- [ ] T020 [US2] Run the post-implementation frontend build from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/package.json and manually smoke refusal and transport-failure flows in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- [ ] T021 [US2] Run the Patch 1 regression check from /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/quickstart.md and confirm texting preference persistence, display, and SMS gating alignment still pass after T015-T020
- [ ] T022 [US2] Stop here after Patch 2, verify mergeable scope and refusal-contract parity against /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/plan.md, and commit before opening Patch 3

**Checkpoint**: Patch 2 is complete, independently testable, and refusal semantics are ready for Patch 3 to depend on

---

## Phase 5: User Story 3 - Send SMS Only When Targeting Is Deterministic (Priority: P3)

**Patch**: Patch 3 - SMS target resolution

**Goal**: Replace guess-based SMS target selection with the locked deterministic order and explicit refusal-before-provider behavior while keeping thread-detail SMS sends implicit on the backend and outbound call behavior unchanged

**Independent Test**: Send SMS with an explicit request target, a deterministic implicit target, and an ambiguous or missing target and confirm each outcome matches the locked contract

### Tests and implementation for User Story 3

- [ ] T023 [P] [US3] Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts for explicit outbound request target precedence, primary active valid target selection, only-active-valid target selection, refusal on ambiguity, refusal on missing target, and refusal-before-provider behavior
- [ ] T024 [US3] Update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts so `performOutboundAction` and any route-local helper it needs enforce deterministic SMS target order with explicit outbound request target first and refusal-before-provider behavior
- [ ] T025 [US3] Tighten explicit phone options and defaulting in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue so inbox actions cannot offer unrelated neighbor phones
- [ ] T026 [US3] Use the refusal result contract already established in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/features/connectshyft/threads.ts only if T024 and T025 need additional Patch 2 refusal fields surfaced to inbox actions, without redesigning the wrapper shape
- [ ] T027 [US3] Run the post-implementation backend verification from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json and confirm T023 passes after T024-T026
- [ ] T028 [US3] Run the post-implementation frontend build from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/package.json and manually smoke explicit-target, deterministic implicit-target, refusal-on-ambiguity, preview-composer send, modal send, and implicit thread-detail SMS send flows in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue against /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/quickstart.md
- [ ] T029 [US3] Run the Patch 1 and Patch 2 regression checks from /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/quickstart.md and confirm canonical texting gating, refusal rendering, and unchanged outbound call behavior still pass after T024-T028
- [ ] T030 [US3] Stop here after Patch 3, verify mergeable scope and final patch readiness against /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/plan.md, and commit when the final patch is ready

**Checkpoint**: All three patches are independently functional and the final patch remains reviewable without reopening earlier scope

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Final regression and constitution-required verification after all three patches are complete

- [ ] T031 [P] Run the final ConnectShyft backend regression from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json after T030
- [ ] T032 [P] Run the final ConnectShyft frontend build from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/package.json after T030
- [ ] T033 Run the full cross-phase smoke pass in /Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/quickstart.md covering trustworthy texting preference state, visible refusal state, and deterministic SMS behavior together
- [ ] T034 Verify unchanged auth and admin delegation expectations against /Users/jeremiahotis/projects/connectshyft/.specify/memory/constitution.md, /Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf, and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/router/index.ts after T030
- [ ] T035 Verify unchanged ConnectShyft API binding and port expectations against /Users/jeremiahotis/projects/connectshyft/.specify/memory/constitution.md, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production, and /Users/jeremiahotis/projects/connectshyft/docker-compose.production.example.yml after T030
- [ ] T036 Verify shared PostgreSQL connectivity and admin-owned migration authority remain unchanged against /Users/jeremiahotis/projects/connectshyft/.specify/memory/constitution.md, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/knexfile.js, and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json after T030
- [ ] T037 Verify reproducible deployment and runbook expectations remain unchanged against /Users/jeremiahotis/projects/connectshyft/.specify/memory/constitution.md, /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md, and /Users/jeremiahotis/projects/connectshyft/docker-compose.production.example.yml after T030

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on T001-T002 and blocks all patch work
- **User Story 1 / Patch 1 (Phase 3)**: Depends on T003-T005 and must end at T014 before Patch 2 starts
- **User Story 2 / Patch 2 (Phase 4)**: Depends on T014 and must end at T022 before Patch 3 starts
- **User Story 3 / Patch 3 (Phase 5)**: Depends on T022 and must end at T030 before final regression starts
- **Polish (Phase 6)**: Depends on T030

### User Story Dependencies

- **US1 (Patch 1)**: No dependency on other user stories; it is the MVP and the required first merge candidate
- **US2 (Patch 2)**: Depends on US1 completion because refusal regression checks must confirm Patch 1 still passes
- **US3 (Patch 3)**: Depends on US2 completion because target-resolution refusals rely on the refusal contract preserved in US2

### Dependency Markers

- **Patch 1 stop marker**: T014
- **Patch 2 start marker**: T015 depends on T014
- **Patch 2 stop marker**: T022
- **Patch 3 start marker**: T023 depends on T022
- **Patch 3 stop marker**: T030
- **Final regression start marker**: T031-T037 depend on T030

### Within Each User Story

- Write or extend the requested automated coverage before or alongside implementation
- Keep each patch inside the file boundaries listed in `/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/plan.md`
- Run build, test, and manual smoke verification before each stop marker
- Do not open the next patch until the prior stop marker is complete

### Parallel Opportunities

- T003 and T004 can run in parallel during baseline capture
- T006 and T007 can run in parallel for Patch 1 automated coverage preparation
- T031 and T032 can run in parallel during final regression

---

## Parallel Example: User Story 1

```bash
Task: "Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts for Patch 1 coverage"
Task: "Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts for authoritative gating parity"
```

---

## Parallel Example: Final Regression

```bash
Task: "Run the final ConnectShyft backend regression from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json"
Task: "Run the final ConnectShyft frontend build from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/package.json"
```

---

## Implementation Strategy

### MVP First (Patch 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 through T014
3. Stop and validate Patch 1 independently
4. Commit Patch 1 before opening Patch 2

### Incremental Delivery

1. Complete Patch 1 and stop at T014
2. Complete Patch 2 and stop at T022
3. Complete Patch 3 and stop at T030
4. Finish final regression in T031-T037

### Notes

- No task should introduce lane-convergence work
- No task should move behavior into `apps/moneyshyft-*`
- No task should redesign providers
- No task should redesign the refusal envelope
