# Tasks: Final Lane Convergence Closure Audit

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/`  
**Prerequisites**: [plan.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/plan.md) (required), [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/spec.md) (required for user stories), [research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md), [data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/data-model.md), [contracts/closure-audit-decision-contract.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/contracts/closure-audit-decision-contract.md)

**Tests**: Verification tasks are included because the spec requires evidence from inventory scans, importer scans, route ownership checks, build checks, and deployment-topology validation.

**Organization**: Tasks are grouped by user story so the audit first establishes lane status, then isolates exact loose ends, then makes the final convergence decision.

## Phase 1: Setup

**Purpose**: Prepare the audit workspace and capture the authoritative inputs before any lane decision work begins.

- [X] T001 Create the closure-audit evidence log in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T002 Capture the current lane authority baseline from [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md)
- [X] T003 Capture the current non-final inventory posture from [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T004 Confirm the closure-audit stop boundary in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/spec.md)

---

## Phase 2: Foundational

**Purpose**: Gather the shared evidence that blocks all lane-level closure decisions.

**CRITICAL**: No lane may be marked complete until the foundational evidence set covers inventory, runtime ownership, mirror-tree state, importer anchors, and deployment-topology checks.

- [X] T005 Run the non-final inventory row scan against [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T006 [P] Verify directory existence for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft)
- [X] T007 [P] Verify directory existence for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__)
- [X] T008 [P] Verify directory existence for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft)
- [X] T009 [P] Verify directory existence for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__)
- [X] T010 [P] Verify absence or presence of [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/Admin](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/Admin)
- [X] T011 Run workspace-boundary enforcement with [/Users/jeremiahotis/projects/connectshyft/scripts/enforce-workspace-boundaries.js](/Users/jeremiahotis/projects/connectshyft/scripts/enforce-workspace-boundaries.js)
- [X] T012 Run route-ownership verification with [/Users/jeremiahotis/projects/connectshyft/scripts/verify-connectshyft-route-ownership.sh](/Users/jeremiahotis/projects/connectshyft/scripts/verify-connectshyft-route-ownership.sh)
- [X] T013 [P] Capture runtime route registrations from [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts)
- [X] T014 [P] Capture runtime route registrations from [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts)
- [X] T015 [P] Capture runtime route registrations from [/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts](/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts)
- [X] T016 [P] Capture web route ownership evidence from [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts)
- [X] T017 [P] Capture web route ownership evidence from [/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/router/index.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/router/index.ts)
- [X] T018 [P] Capture web route ownership evidence from [/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/router/index.ts](/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/router/index.ts)
- [X] T019 Capture MoneyShyft admin redirect delegation evidence from [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/utils/adminAppUrl.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/utils/adminAppUrl.ts)
- [X] T020 [P] Compare [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft) against [/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft)
- [X] T021 [P] Compare [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft) against [/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft)
- [X] T022 [P] Capture importer evidence for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts)
- [X] T023 [P] Capture importer evidence for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts)
- [X] T024 [P] Capture importer evidence for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts)
- [X] T025 [P] Capture importer evidence for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts)
- [X] T026 [P] Capture importer evidence for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts)
- [X] T027 [P] Capture importer evidence for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts)
- [X] T028 Run the targeted cross-app import scan described in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/plan.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/plan.md)
- [X] T029 Record the foundational evidence set in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)

**Checkpoint**: The audit now has the exact non-final rows, directory state, runtime ownership evidence, importer evidence, and boundary-script evidence needed to evaluate each lane.

---

## Phase 3: User Story 1 - Determine Lane Closure Status (Priority: P1)

**Goal**: Produce an evidence-backed provisional closure status for ConnectShyft, MoneyShyft, and Admin.

**Independent Test**: This story is complete when all in-scope non-final rows have been reconciled against actual repository state and each lane has a provisional status that respects the mirror-tree and importer rules.

### Verification for User Story 1

- [X] T030 [P] [US1] Reconcile the inventory row for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft) in [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T031 [P] [US1] Reconcile the inventory row for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__) in [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T032 [P] [US1] Reconcile the inventory row for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts except route-ownership](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__) in [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T033 [P] [US1] Reconcile the inventory row for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft) in [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T034 [P] [US1] Reconcile the inventory row for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__) in [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T035 [P] [US1] Reconcile the inventory row for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts) `/admin/*` in [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T036 [P] [US1] Record whether [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft) still blocks a complete MoneyShyft closure in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T037 [P] [US1] Record whether [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft) still blocks a complete Admin closure in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)

### Implementation for User Story 1

- [X] T038 [US1] Record the provisional ConnectShyft lane closure status in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T039 [US1] Record the provisional MoneyShyft lane closure status in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T040 [US1] Record the provisional Admin lane closure status in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T041 [US1] Summarize the provisional lane-status evidence in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)

**Checkpoint**: The audit has provisional lane statuses that cannot declare MoneyShyft or Admin complete while their divergent mirror trees remain actively anchored.

---

## Phase 4: User Story 2 - Isolate Exact Loose Ends (Priority: P2)

**Goal**: Identify and classify every exact remaining loose end as resolved, small final cleanup, or blocked.

**Independent Test**: This story is complete when every in-scope concern has one exact path or row, one justification, and one allowed decision label.

### Verification for User Story 2

- [X] T042 [P] [US2] Inspect the importer edge in [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts)
- [X] T043 [P] [US2] Inspect the importer edge in [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts)
- [X] T044 [P] [US2] Inspect the importer edge in [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts)
- [X] T045 [P] [US2] Inspect the importer edge in [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts)
- [X] T046 [P] [US2] Inspect the importer edge in [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts)
- [X] T047 [P] [US2] Inspect the importer edge in [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts)
- [X] T048 [P] [US2] Confirm redirect-only `/admin/*` handling in [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts)
- [X] T049 [P] [US2] Confirm Admin target generation in [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/utils/adminAppUrl.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/utils/adminAppUrl.ts)
- [X] T050 [P] [US2] Confirm that no local admin mirror view tree remains under [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src)

### Implementation for User Story 2

- [X] T051 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft) in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T052 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__) in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T053 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts except route-ownership](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__) in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T054 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft) in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T055 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__) in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T056 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts) in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T057 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts](/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts) in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T058 [US2] Classify the loose end for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts) `/admin/*` in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/research.md)
- [X] T059 [US2] Record the exact loose-end list and decision labels in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)

**Checkpoint**: Every remaining concern now has an exact path or row, a justification, and one allowed decision label.

---

## Phase 5: User Story 3 - Decide Whether Convergence Is Complete (Priority: P3)

**Goal**: Produce the final repository-level convergence decision apart from migration-runner cutover.

**Independent Test**: This story is complete when the audit contains the 3 lane statuses, the exact loose-end list, the explicit migration-runner residual note, and one final decision written against the spec decision matrix.

### Verification for User Story 3

- [X] T060 [P] [US3] Verify the out-of-scope migration authority residual at [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md)
- [X] T061 [P] [US3] Run the build verification for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api)
- [X] T062 [P] [US3] Run the build verification for [/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api](/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api)
- [X] T063 [P] [US3] Run the build verification for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api](/Users/jeremiahotis/projects/connectshyft/apps/admin-api)
- [X] T064 [P] [US3] Run the build verification for [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web)
- [X] T065 [P] [US3] Run the build verification for [/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web](/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web)
- [X] T066 [P] [US3] Run the build verification for [/Users/jeremiahotis/projects/connectshyft/apps/admin-web](/Users/jeremiahotis/projects/connectshyft/apps/admin-web)

### Implementation for User Story 3

- [X] T067 [US3] Write the final ConnectShyft closure status in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)
- [X] T068 [US3] Write the final MoneyShyft closure status in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)
- [X] T069 [US3] Write the final Admin closure status in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)
- [X] T070 [US3] Write the final convergence decision matrix outcome in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)

**Checkpoint**: The audit has the three lane statuses, the exact loose-end list, the explicit migration-runner residual note, and the final convergence decision.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize the audit record and satisfy the constitution-required topology and runbook validation checks.

- [X] T071 Validate the final decision output structure against [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/contracts/closure-audit-decision-contract.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/contracts/closure-audit-decision-contract.md)
- [X] T072 Validate host Nginx lane routing against [/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf](/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf) and record results in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)
- [X] T073 Validate app port and binding ownership for [/Users/jeremiahotis/projects/connectshyft/apps/admin-api](/Users/jeremiahotis/projects/connectshyft/apps/admin-api), [/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api](/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api), and [/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api](/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api) and record results in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)
- [X] T074 Validate shared Postgres topology assumptions against [/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md](/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md) and [/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml](/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml) and record results in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)
- [X] T075 Validate deployment runbook reproducibility against [/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md](/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md) and record results in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)
- [X] T076 Confirm the audit findings still align with [/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md)
- [X] T077 Confirm the audit task list stayed within the stop boundary defined in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/spec.md)
- [X] T078 Record the final verification summary in [/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Setup and blocks all lane-level decision work
- **User Story 1 (Phase 3)**: depends on Foundational completion
- **User Story 2 (Phase 4)**: depends on User Story 1 because loose-end classification uses the provisional lane status work
- **User Story 3 (Phase 5)**: depends on User Story 2 because the final decision requires the exact loose-end list
- **Polish (Phase 6)**: depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: first executable audit slice and MVP; establishes lane-by-lane status
- **User Story 2 (P2)**: depends on US1 status evidence; refines remaining exact loose ends
- **User Story 3 (P3)**: depends on US2 classifications; produces the final convergence decision

### Parallel Opportunities

- Foundational evidence capture tasks `T006`-`T028` marked `[P]` can run in parallel where they inspect different files or trees
- User Story 1 reconciliation tasks `T030`-`T037` can run in parallel
- User Story 2 inspection tasks `T042`-`T050` can run in parallel
- User Story 3 build verification tasks `T060`-`T066` can run in parallel if environment capacity allows

## Parallel Example: User Story 2

```bash
# Inspect the remaining importer anchors together:
Task: "Inspect the importer edge in apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts"
Task: "Inspect the importer edge in apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts"
Task: "Inspect the importer edge in apps/admin-api/src/routes/api/v1/platform-admin-console.ts"
Task: "Inspect the importer edge in apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts"
Task: "Inspect the importer edge in apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts"
Task: "Inspect the importer edge in apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup
2. Complete Foundational evidence gathering
3. Complete User Story 1
4. Stop and verify that each lane has a provisional closure status that respects the mirror-tree rules

### Incremental Delivery

1. Establish exact inventory, runtime, mirror-tree, and importer evidence
2. Assign provisional lane statuses
3. Classify exact remaining loose ends
4. Make the final convergence decision against the decision matrix
5. Complete topology and runbook verification before closing the audit

### Audit Discipline

1. Do not convert audit findings into refactor tasks inside this list
2. Keep RouteShyft and migration-runner cutover out of the task set
3. Do not mark a lane complete while a divergent in-scope mirror tree still has active importers
4. Treat redirect-only delegation without local mirror views as closure-compatible

## Notes

- All tasks use exact file paths so an LLM can execute the audit without extra context.
- The build checks and topology checks are verification tasks, not feature-work tasks.
- The final decision task is `T070`, with contract, topology, and stop-boundary validation in `T071`-`T078`.
