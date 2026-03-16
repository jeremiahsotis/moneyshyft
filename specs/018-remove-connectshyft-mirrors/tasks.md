# Tasks: Slice 10c - Final ConnectShyft Mirror Module Tree Removal

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/mirror-tree-removal-boundary.md`, `quickstart.md`

**Tests**: Verification is required for this slice. Tasks include targeted Jest suites, importer scans, workspace-boundary checks, and bounded app builds.

**Organization**: Tasks are grouped by independently executable story increments: MoneyShyft mirror-tree removal first, Admin mirror-tree removal second, then inventory closure and final verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Execution Context)

**Purpose**: Reconfirm the bounded slice scope and capture the exact live dependency map before changing code.

- [ ] T001 Reconfirm the Slice 10c stop boundary in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/spec.md` and `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/plan.md`
- [ ] T002 Capture the current module-tree importer scan results for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft` in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the file-specific dependency trace and decide which top-level identity assertions must survive under canonical ConnectShyft ownership.

**⚠️ CRITICAL**: No mirror-tree deletion starts until this phase is complete.

- [ ] T003 [P] Trace the MoneyShyft mirror-tree dependency edges from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/jest.config.js` into `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/research.md`
- [ ] T004 [P] Trace the Admin mirror-tree dependency edges from `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/jest.config.js` into `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/research.md`
- [ ] T005 Compare `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`, then classify each assertion in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/research.md` and `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/data-model.md` as already-covered canonical behavior, missing canonical behavior to migrate, or stale-owner duplicate

**Checkpoint**: The exact dependency map and residual coverage decisions are proven; implementation can proceed safely.

---

## Phase 3: User Story 1 - Remove the MoneyShyft Mirror Tree (Priority: P1) 🎯 MVP

**Goal**: Remove `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft` after migrating any legitimate residual identity assertions to canonical ConnectShyft tests.

**Independent Test**: MoneyShyft no longer contains a ConnectShyft module tree, canonical ConnectShyft identity tests still cover the needed behavior, and the MoneyShyft route-ownership test still passes.

- [ ] T006 [P] [US1] Add a canonical service-level assertion to `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` proving the synchronous neighbor service refuses an async-only identity boundary adapter
- [ ] T007 [P] [US1] Reconfirm that `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts` already covers in-process and async in-process adapter parity, and add a parity assertion only if T005 identifies a specific missing canonical case
- [ ] T008 [US1] Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts` after any missing canonical assertions are migrated, and do not recreate these tests under MoneyShyft
- [ ] T009 [US1] Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft` after confirming no remaining importer edges from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src`
- [ ] T010 [US1] Verify the MoneyShyft cleanup by running the targeted importer scan against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src` and the route-ownership suite at `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.route-ownership.test.ts`

**Checkpoint**: MoneyShyft’s stale ConnectShyft mirror tree is gone and the repository still preserves the required canonical identity behavior.

---

## Phase 4: User Story 2 - Remove the Admin Mirror Tree Without Breaking Admin Runtime Behavior (Priority: P2)

**Goal**: Remove `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft` after detaching the Admin platform console from mirror `numberMappings` and clearing the remaining Admin top-level identity tests.

**Independent Test**: Admin platform console behavior still works through `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`, but no Admin runtime or test file imports `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`.

- [ ] T011 [US2] Replace the mirror `numberMappings` dependency in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts` with `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/connectshyftNumberMappings.ts`
- [ ] T012 [US2] Update `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts` to mock and verify `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/connectshyftNumberMappings.ts` instead of `../../../../modules/connectshyft/numberMappings`
- [ ] T013 [P] [US2] Delete `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts` after any missing canonical assertions are migrated, and do not recreate these tests under Admin
- [ ] T014 [US2] Confirm with a targeted importer scan that `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts` no longer transitively reach `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`, and record the clean edge state in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/research.md`
- [ ] T015 [US2] Delete `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft` after the console route, console route test, and top-level Admin identity tests no longer reference it
- [ ] T016 [US2] Verify the Admin cleanup by running the targeted importer scan against `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src` and the suite at `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`

**Checkpoint**: Admin’s stale ConnectShyft mirror tree is gone and Admin platform console behavior remains intact.

---

## Phase 5: User Story 3 - Close the Inventory Record and Finalize Verification (Priority: P3)

**Goal**: Update the inventory to match the post-delete repository state and run the bounded verification suite for ConnectShyft, Admin, and MoneyShyft.

**Independent Test**: `architecture/LANE_INVENTORY.md` reflects the final deletion status, importer scans are clean, workspace boundaries still pass, and the bounded build/test commands succeed.

- [ ] T017 [US3] Update the rows for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`, and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__` in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` to reflect final deletion or explicit blockage
- [ ] T018 [US3] Run the post-delete importer scans for `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src`, then record the clean results in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`
- [ ] T019 [P] [US3] Run the bounded verification suites for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.route-ownership.test.ts`
- [ ] T020 [P] [US3] Run the bounded builds defined by `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/package.json`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/package.json`
- [ ] T021 [US3] Verify routing ownership remains unchanged by checking `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/api/registerRoutes.ts`, and `/Users/jeremiahotis/projects/connectshyft/scripts/verify-connectshyft-route-ownership.sh`, then record the result in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`
- [ ] T022 [P] [US3] Verify API binding and port contracts remain unchanged by confirming no Slice 10c edits touch `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, or `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf`, then record the result in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`
- [ ] T023 [P] [US3] Verify shared PostgreSQL ownership and connectivity assumptions remain unchanged by confirming no Slice 10c edits touch `/Users/jeremiahotis/projects/connectshyft/shared/database/migrations`, app-local migration directories, or Knex configuration files, then record the result in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`
- [ ] T024 [US3] Verify production runbook impact is nil by confirming no Slice 10c edits touch deployment or setup runbooks and recording the no-runbook-change result in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`
- [ ] T025 [US3] Run `/Users/jeremiahotis/projects/connectshyft/scripts/enforce-workspace-boundaries.js` and record the final stop-point verification in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`

**Checkpoint**: Inventory, verification evidence, and final stop conditions all match the completed mirror-tree removal.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final proof packaging without widening the slice.

- [ ] T026 Summarize the final dependency map, deletion order completion, and verification outcome in `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/research.md` and `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies; start immediately.
- **Phase 2: Foundational**: Depends on Phase 1; blocks all deletion work.
- **Phase 3: US1**: Depends on Phase 2.
- **Phase 4: US2**: Depends on Phase 2 and on any canonical test additions from Phase 3 that preserve shared identity coverage.
- **Phase 5: US3**: Depends on US1 and US2 completion.
- **Phase 6: Polish**: Depends on all story phases completing.

### User Story Dependencies

- **US1**: Can start after the dependency map and coverage-disposition proof are complete.
- **US2**: Can start after the dependency map is complete, but deletion of the Admin identity tests depends on the canonical coverage work finished in US1.
- **US3**: Starts only after both mirror trees are deleted or an explicit blocker is documented.

### Within Each User Story

- Compare and migrate legitimate coverage before deleting top-level mirror tests.
- Remove test anchors before deleting the corresponding mirror tree.
- For the Admin tree, detach `platform-admin-console.ts` and its test from mirror `numberMappings` before tree deletion.
- Update inventory only from the final post-delete or blocked state.

## Parallel Opportunities

- `T003` and `T004` can run in parallel because they trace different app surfaces.
- `T006` and `T007` can run in parallel because they update different canonical ConnectShyft test files.
- `T013` can run in parallel with `T011` and `T012` once canonical coverage migration is complete.
- `T019` and `T020` can run in parallel during final verification.
- `T022` and `T023` can run in parallel during final verification because they inspect different unchanged infrastructure surfaces.

## Parallel Example: User Story 1

```bash
Task: "Add a canonical service-level assertion to /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts proving the synchronous neighbor service refuses an async-only identity boundary adapter"
Task: "Reconfirm /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts already covers adapter parity and add a parity assertion only if T005 identifies a specific missing canonical case"
```

## Parallel Example: User Story 2

```bash
Task: "Replace the mirror numberMappings dependency in /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts with /Users/jeremiahotis/projects/connectshyft/libs/platform/src/connectshyftNumberMappings.ts"
Task: "Delete /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts after any missing canonical assertions are migrated, and do not recreate those tests under Admin"
```

## Parallel Example: User Story 3

```bash
Task: "Run the bounded verification suites for /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts, and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.route-ownership.test.ts"
Task: "Run the bounded builds defined by /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json, /Users/jeremiahotis/projects/connectshyft/apps/admin-api/package.json, and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/package.json"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 to remove the MoneyShyft mirror tree.
3. Validate canonical ConnectShyft identity coverage plus the MoneyShyft route-ownership check.
4. Stop and confirm the first half of the mirror cleanup is clean before starting Admin runtime detachment.

### Incremental Delivery

1. Build the dependency map and coverage disposition once.
2. Remove the MoneyShyft mirror tree and validate it.
3. Remove the Admin mirror tree while preserving platform-console behavior and validate it.
4. Update inventory and run the bounded repo verification set.

### Final Stop Point

Stop after:

- dependency tracing is complete
- anchor detachment is complete
- both mirror trees are deleted or explicit blocker evidence is recorded
- `architecture/LANE_INVENTORY.md` reflects the result
- bounded builds and test suites have been run

Do not continue into RouteShyft, migration-runner, or unrelated cleanup.

## Notes

- All tasks are file-specific and stay within the two mirror trees and their exact anchors.
- No RouteShyft tasks are included.
- No migration-runner tasks are included.
- No unrelated stale cleanup is included.
