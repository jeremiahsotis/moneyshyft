# Tasks: Slice 10 - Delete Stale API Mirror Files After File-Level Reclassification

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/`
**Prerequisites**: [plan.md](/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/plan.md), [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/spec.md), [research.md](/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md), [data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/data-model.md), [file-deletion-boundary.md](/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/contracts/file-deletion-boundary.md), [quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/quickstart.md)

**Tests**: Verification is required for this slice. Use builds, targeted Jest suites, import/reference scans, and stop-boundary checks after implementation work.

**Organization**: Tasks are grouped by user story so each story remains independently testable while the slice stays bounded to exact file-level deletion work.

## Phase 1: Setup (Shared Preparation)

**Purpose**: Normalize the exact in-scope file set and deletion boundary before any code removal.

- [X] T001 Reconfirm the exact Slice 10 deletion candidate and deferred-file matrix in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T002 Reconfirm the current file-level and glob-level baseline rows for reviewed files in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T003 Sync the exact allowed and forbidden deletion scope in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/contracts/file-deletion-boundary.md
- [X] T004 [P] Sync the stop-boundary verification checklist for reviewed and deferred files in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/quickstart.md

---

## Phase 2: Foundational (Blocking Proof Work)

**Purpose**: Gather the file-level proof that must exist before any deletion can happen.

**⚠️ CRITICAL**: No file deletion can begin until this phase is complete.

- [X] T005 [P] Record current import/reference proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T006 [P] Record current import/reference proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T007 [P] Record current import/reference proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts, and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T008 Determine the delete-versus-defer decision for each associated test candidate, including locking service-test keep-or-delete decisions before any service-file deletion, in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T009 Prepare the file-level inventory row update plan for reviewed associated tests and current blockers, including /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts, in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md

**Checkpoint**: Exact file-level deletion eligibility and test-proof decisions are now locked.

---

## Phase 3: User Story 1 - Remove Individually Proven Service Mirrors (Priority: P1) 🎯 MVP

**Goal**: Delete only the service mirror files that remain proven `safe_delete_after_convergence` after blocker and paired-test decisions are locked.

**Independent Test**: The story is complete when each reviewed service mirror file ends with an explicit deleted-or-retained outcome, no surviving file still references any deleted service file, and the affected apps still build and pass targeted boundary verification.

- [X] T010 [US1] Lock the keep-or-delete decision for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T011 [P] [US1] Delete /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts only if its paired service test has been deleted or independently resolved in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T012 [US1] Retain or delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts only if no reviewed retained source or test file still imports it, and record the result in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T013 [US1] Run post-decision reference verification for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts and record the result in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T014 [US1] Run affected build verification across /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api, and /Users/jeremiahotis/projects/connectshyft/apps/admin-api as required by the locked Slice 10 decisions
- [X] T015 [US1] Run targeted entitlement and boundary regression verification tied to the reviewed service-file decisions using /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/__tests__/registerRoutes.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/tenantModuleEntitlements.shared.test.ts

**Checkpoint**: Every reviewed service mirror now has an explicit deleted-or-retained outcome and the repo still passes the required build and targeted verification for those decisions.

---

## Phase 4: User Story 2 - Verify and Remove Associated Stale Test Files Individually (Priority: P2)

**Goal**: Delete only those associated test files that are individually proven redundant, and retain any still-needed proof files.

**Independent Test**: The story is complete when every associated test file in scope has an explicit deleted-or-retained outcome and the surviving targeted test surface still passes.

- [X] T016 [US2] Record /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts as retained unless its dependent provider-registry tests are explicitly reviewed in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T017 [P] [US2] Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T018 [P] [US2] Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T019 [P] [US2] Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T020 [P] [US2] Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T021 [US2] Add or refine file-level inventory rows for the reviewed associated tests and current provider-helper blockers in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T022 [US2] Record the final deleted-versus-retained rationale for all reviewed associated test files in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T023 [US2] Run the minimum surviving targeted test verification for all retained reviewed tests, including retained provider-registry dependents and retained /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts or /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts

**Checkpoint**: Every associated stale test file now has a file-level final state, and surviving targeted verification still passes.

---

## Phase 5: User Story 3 - Record Exact File-Level Status and Deferrals (Priority: P3)

**Goal**: Update the inventory and slice evidence so the exact deleted, retained, and deferred file-level state is documented.

**Independent Test**: The story is complete when the inventory and slice evidence accurately distinguish deleted service mirrors, deleted-or-retained associated tests, and the explicitly deferred `converge_first` route files.

- [X] T024 [US3] Update the final row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T025 [US3] Update the final row for /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T026 [US3] Add or update the file-level blocker row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T027 [US3] Update the supporting stale-mirror cleanup status for reviewed Slice 10 files in /Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md
- [X] T028 [US3] Record the explicit deferral for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T029 [US3] Record the explicit deferral for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T030 [US3] Verify /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts remains present and unchanged, then record the result in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/quickstart.md
- [X] T031 [US3] Verify /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts remains present and unchanged, then record the result in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/quickstart.md
- [X] T032 [US3] Update the final stop-boundary evidence for deleted, retained, and deferred exact files in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/quickstart.md

**Checkpoint**: The repository records now show exact file-level deletion and deferral status, with the two `converge_first` routes explicitly held out of this slice.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Run final verification and stop the slice before route-convergence work.

- [X] T033 [P] Validate unchanged routing delegation and Nginx/runbook posture against /Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md and /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md
- [X] T034 [P] Validate unchanged localhost API binding expectations and shared Postgres ownership against /Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T035 [P] Verify RouteShyft transitional keepers remain untouched at /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts, and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/route
- [X] T036 [P] Verify no directory-level mirror deletion was performed for /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft
- [X] T037 Run the final no-deleted-file-reference and no-new-app-import scan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts, and /Users/jeremiahotis/projects/connectshyft/libs/platform/src/tenantModuleEntitlements.ts
- [X] T038 Run the final stop-here audit and record that Slice 10 ends before converge-first route remediation in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Setup and blocks all deletion work
- **User Story 1 (Phase 3)**: depends on Foundational completion
- **User Story 2 (Phase 4)**: depends on Foundational completion and should follow User Story 1 if service deletions affect the reviewed tests
- **User Story 3 (Phase 5)**: depends on the outcomes from User Stories 1 and 2
- **Polish (Phase 6)**: depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: can begin once file-level proof is locked in Phase 2
- **User Story 2 (P2)**: depends on the Phase 2 file-by-file proof and should use the post-service-deletion state from US1 where relevant
- **User Story 3 (P3)**: depends on the final delete/retain decisions from US1 and US2

### Parallel Opportunities

- T004 can run in parallel with T001-T003
- T005, T006, and T007 can run in parallel
- T011 can run after T010 is locked
- T017 through T020 can run in parallel
- T033 through T036 can run in parallel

---

## Parallel Example: User Story 2

```bash
# Review associated test files in parallel once foundational proof is complete:
Task: "Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md"
Task: "Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md"
Task: "Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md"
Task: "Delete or explicitly retain /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts based on the file-level proof captured in /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Finish Setup and Foundational proof tasks.
2. Delete only the `PlatformAdminService.ts` mirror files that remain proven safe after blocker and paired-test review.
3. Run post-delete scans, builds, and targeted regression verification.

### Incremental Delivery

1. Deliver US1 to remove the highest-confidence stale mirrors.
2. Deliver US2 only after each associated test file is individually proven stale or retained.
3. Deliver US3 to lock inventory truth and explicit route deferrals.
4. Finish with Phase 6 stop-here verification so the slice cannot drift into remaining route convergence.
