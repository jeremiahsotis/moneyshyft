# Tasks: CS-001 Lane Convergence

**Input**: Design documents from `/specs/connectshyft-recovery/issues/cs-001-lane-convergence/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Follow `spec.md` testing requirements for targeted automation, CI evidence, and screenshot matrix validation.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish convergence workspace and inventories

- [X] T001 Create CS-001 migration manifest in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/ui-artifact-manifest.md`
- [X] T002 Capture pre-migration ConnectShyft file inventory in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/pre-migration-inventory.txt`
- [X] T003 [P] Capture pre-migration route ownership snapshot in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/pre-migration-routes.txt`
- [X] T004 [P] Capture pre-migration build/test target snapshot in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/pre-migration-targets.txt`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define reusable guard and migration scaffolding used by all stories

- [X] T005 Add ConnectShyft lane convergence guard script in `scripts/enforce-connectshyft-lane-convergence-guard.sh`
- [X] T006 Wire lane convergence guard into policy pipeline in `scripts/enforce-git-policy.sh`
- [X] T007 [P] Add standalone npm script for lane convergence guard in `package.json`
- [X] T008 Define migration/deletion decision matrix in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/migration-decision-matrix.md`

**Checkpoint**: Guard + migration matrix in place; story work can proceed.

---

## Phase 3: User Story 1 - Single ConnectShyft UI Ownership and Parity (Priority: P1) 🎯 MVP

**Goal**: Move all required ConnectShyft UI primitives into connect lane and remove duplicates from money lane while preserving UX parity.

**Independent Test**: Build and run ConnectShyft UI using only `apps/connectshyft-web` ConnectShyft views/components/features and verify inbox/thread/settings parity.

### Tests for User Story 1

- [X] T009 [P] [US1] Add ConnectShyft UI parity checklist runbook in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/us1-parity-checklist.md`
- [X] T010 [P] [US1] Add/adjust ConnectShyft inbox/thread Playwright assertions for three-column layout in `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.atdd.spec.ts`

### Implementation for User Story 1

- [X] T011 [P] [US1] Migrate `ConnectShyftComposer.vue` into `apps/connectshyft-web/src/components/connectshyft/ConnectShyftComposer.vue`
- [X] T012 [P] [US1] Migrate `ConnectShyftMessageBubble.vue` into `apps/connectshyft-web/src/components/connectshyft/ConnectShyftMessageBubble.vue`
- [X] T013 [P] [US1] Migrate `ConnectShyftPill.vue` into `apps/connectshyft-web/src/components/connectshyft/ConnectShyftPill.vue`
- [X] T014 [P] [US1] Migrate `ConnectShyftQueueCard.vue` into `apps/connectshyft-web/src/components/connectshyft/ConnectShyftQueueCard.vue`
- [X] T015 [P] [US1] Migrate `ConnectShyftThreadActionBar.vue` into `apps/connectshyft-web/src/components/connectshyft/ConnectShyftThreadActionBar.vue`
- [X] T016 [P] [US1] Migrate `ConnectShyftThreadHeader.vue` into `apps/connectshyft-web/src/components/connectshyft/ConnectShyftThreadHeader.vue`
- [X] T017 [P] [US1] Migrate `ConnectShyftVoicemailCard.vue` into `apps/connectshyft-web/src/components/connectshyft/ConnectShyftVoicemailCard.vue`
- [X] T018 [P] [US1] Migrate ConnectShyft design tokens into `apps/connectshyft-web/src/components/connectshyft/connectShyftTokens.ts`
- [X] T019 [P] [US1] Migrate directory view into `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftDirectoryView.vue`
- [X] T020 [P] [US1] Migrate settings access helper into `apps/connectshyft-web/src/features/connectshyft/settingsAccess.ts`
- [X] T021 [US1] Rewire inbox view to migrated component primitives in `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
- [X] T022 [US1] Rewire thread detail view to migrated component primitives in `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- [X] T023 [US1] Rewire more view to use `settingsAccess` behavior in `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- [X] T024 [US1] Delete migrated ConnectShyft component duplicates from `apps/moneyshyft-web/src/components/connectshyft/`
- [X] T025 [US1] Delete migrated ConnectShyft view duplicates from `apps/moneyshyft-web/src/views/ConnectShyft/`
- [X] T026 [US1] Delete migrated ConnectShyft feature duplicates from `apps/moneyshyft-web/src/features/connectshyft/`
- [X] T027 [US1] Record post-migration parity evidence in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/us1-parity-evidence.md`

**Checkpoint**: ConnectShyft UI ownership converged to connect lane and independently testable.

---

## Phase 4: User Story 2 - Route Convergence to ConnectShyft Frontend (Priority: P1)

**Goal**: Ensure ConnectShyft frontend routes exist only in connect lane router.

**Independent Test**: `rg` route scan shows no `/app/connectshyft/*` routes in money router and complete canonical set in connect router.

### Tests for User Story 2

- [X] T028 [P] [US2] Add route ownership verification script in `scripts/verify-connectshyft-route-ownership.sh`
- [X] T029 [P] [US2] Add route ownership verification step in `scripts/ci-local.sh`

### Implementation for User Story 2

- [X] T030 [US2] Add missing canonical ConnectShyft routes (`/settings`, `/directory` as needed) in `apps/connectshyft-web/src/router/index.ts`
- [X] T031 [US2] Remove all `/app/connectshyft/*` route registrations from `apps/moneyshyft-web/src/router/index.ts`
- [X] T032 [US2] Update money lane access fallback away from ConnectShyft path in `apps/moneyshyft-web/src/stores/access.ts`
- [X] T033 [US2] Update route convergence evidence in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/us2-route-evidence.md`

**Checkpoint**: Route ownership converged and verifiable independently.

---

## Phase 5: User Story 3 - Build/Test Target Convergence and Guardrails (Priority: P1)

**Goal**: Retarget ConnectShyft test/build execution to connect lane frontend and enforce anti-regression guardrails.

**Independent Test**: CI stack launches `connectshyft-web` for ConnectShyft UI tests and guard script fails on prohibited money lane ConnectShyft UI paths.

### Tests for User Story 3

- [X] T034 [P] [US3] Add policy test fixture for forbidden money lane ConnectShyft UI paths in `tests/scripts/enforce-connectshyft-lane-convergence-guard.test.sh`
- [X] T035 [P] [US3] Add CI evidence template for frontend target verification in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/us3-ci-evidence-template.md`

### Implementation for User Story 3

- [X] T036 [US3] Retarget Playwright frontend startup from money to connect lane in `scripts/ci-run-playwright-stack.sh`
- [X] T037 [US3] Retarget managed Playwright preflight frontend app resolution in `scripts/run-playwright-with-preflight.sh`
- [X] T038 [US3] Update CI workflow frontend-target assumptions in `.github/workflows/test.yml`
- [X] T039 [US3] Update burn-in workflow frontend-target assumptions in `.github/workflows/burn-in.yml`
- [X] T040 [US3] Set ConnectShyft UI build verification target in `apps/connectshyft-web/project.json`
- [X] T041 [US3] Remove legacy ConnectShyft UI validation dependency from money lane project target in `apps/moneyshyft-web/project.json`
- [X] T042 [US3] Capture CI target convergence evidence in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/us3-ci-target-evidence.md`

**Checkpoint**: Build/test target convergence complete and guardrail enforced.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and PR evidence packaging

- [X] T043 [P] Run CS-001 quickstart validation and record outputs in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/final-quickstart-validation.md`
- [ ] T044 [P] Capture screenshot matrix (desktop inbox three-column, desktop thread action bar, mobile inbox nav, mobile thread full-screen, more/settings entry points) in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/screenshots/`
- [X] T045 Compile CS-001 PR evidence bundle in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/pr-evidence-summary.md`
- [X] T046 Run full policy and CI-local checks and record in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/final-validation-report.md`

---

## Phase 7: Constitution Compliance Validation

**Purpose**: Satisfy constitution-mandated explicit validation tasks for routing, ports, shared DB, and reproducible runbook checks

- [X] T047 Validate Nginx delegation for `/api/v1/auth/*` and `/api/v1/platform/admin/*` to `admin-api` and record evidence in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/constitution-routing-validation.md`
- [X] T048 Validate API bind and canonical localhost ports (`admin-api:3100`, `money-api:3000`, `connect-api:3002`) and record evidence in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/constitution-port-validation.md`
- [X] T049 Validate shared Postgres connectivity assumptions remain unchanged across lanes and record evidence in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/constitution-db-validation.md`
- [X] T050 Validate reproducible deployment/runbook execution path and record evidence in `specs/connectshyft-recovery/issues/cs-001-lane-convergence/artifacts/constitution-runbook-validation.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: starts immediately.
- **Phase 2 (Foundational)**: depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: depends on Phase 2.
- **Phase 4 (US2)**: depends on Phase 2 and US1 migration outcomes for route target completeness.
- **Phase 5 (US3)**: depends on Phases 3 and 4 so CI points at final lane ownership.
- **Phase 6 (Polish)**: depends on all user stories.
- **Phase 7 (Constitution Compliance Validation)**: depends on Phase 6 closeout evidence.

### User Story Dependencies

- **US1**: foundational dependency only.
- **US2**: depends on US1 migrated route targets existing in connect lane.
- **US3**: depends on US1 and US2 convergence to avoid targeting stale paths.

### Dependency Graph

- US1 -> US2 -> US3
- US1 -> US2 -> US3 -> Constitution Validation

---

## Parallel Execution Examples

### User Story 1

```bash
Task: "Migrate ConnectShyftComposer.vue into apps/connectshyft-web/src/components/connectshyft/ConnectShyftComposer.vue"
Task: "Migrate ConnectShyftMessageBubble.vue into apps/connectshyft-web/src/components/connectshyft/ConnectShyftMessageBubble.vue"
Task: "Migrate ConnectShyftQueueCard.vue into apps/connectshyft-web/src/components/connectshyft/ConnectShyftQueueCard.vue"
Task: "Migrate ConnectShyftVoicemailCard.vue into apps/connectshyft-web/src/components/connectshyft/ConnectShyftVoicemailCard.vue"
```

### User Story 2

```bash
Task: "Add route ownership verification script in scripts/verify-connectshyft-route-ownership.sh"
Task: "Add route ownership verification step in scripts/ci-local.sh"
```

### User Story 3

```bash
Task: "Retarget Playwright frontend startup in scripts/ci-run-playwright-stack.sh"
Task: "Update CI workflow assumptions in .github/workflows/test.yml"
Task: "Update burn-in workflow assumptions in .github/workflows/burn-in.yml"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) for single-lane ConnectShyft UI ownership and parity.
3. Validate parity and screenshots before route/CI refactors.

### Incremental Delivery

1. US1: UI ownership and parity.
2. US2: route convergence.
3. US3: build/test target convergence + guardrails.
4. Polish: evidence and final validation.

### Completeness Validation

- Every user story has independent test criteria and dedicated tasks.
- Tasks include exact file paths and executable actions.
- Cross-story dependencies are explicit and minimal.

## Requirement-to-Task Traceability

| Requirement / Acceptance Target | Task IDs | Evidence Artifact |
|---------------------------------|----------|-------------------|
| US1 UI ownership in connect lane | T011-T023 | `artifacts/us1-parity-evidence.md` |
| US1 duplicate removal in money lane | T024-T026, T005 | `artifacts/us1-parity-evidence.md` |
| US1 measurable layout/behavior parity | T009, T010, T021, T022, T027, T044 | `artifacts/us1-parity-evidence.md`, `artifacts/screenshots/` |
| US2 route convergence | T028-T033 | `artifacts/us2-route-evidence.md` |
| US3 CI/build target convergence | T034-T042 | `artifacts/us3-ci-target-evidence.md` |
| Constitution delegation/ports/shared DB/runbook checks | T047-T050 | `artifacts/constitution-*.md` |
