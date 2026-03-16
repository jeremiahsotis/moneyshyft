# Tasks: Slice 8 Stale Admin Leftovers Cleanup

**Input**: Design documents from `/specs/013-admin-leftovers-cleanup/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include targeted verification tasks because the specification explicitly requires proof that cleanup targets are not router-mounted, imported, dynamically referenced, or still needed by tests, and requires admin-web build plus admin route verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Evidence Baseline)

**Purpose**: Establish the current cleanup target set and evidence baseline before deleting anything.

- [X] T001 Capture the current target inventory and stale classifications from `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [X] T002 [P] Record current admin-web router mounts from `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/router/index.ts`
- [X] T003 [P] Record current admin-web navigation references from `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/components/layout/AppHeader.vue` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/components/layout/AppMobileNav.vue`
- [X] T004 Record current likely stale admin leftover evidence for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts`

---

## Phase 2: Foundational (Blocking Verification Preconditions)

**Purpose**: Gather the proof required before any cleanup task can proceed.

**⚠️ CRITICAL**: No deletion work can begin until this phase is complete.

- [X] T005 Run reference scans for `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/{Accounts,Budget,Dashboard,Debts,Goals,Scenarios,Transactions}` and record import and dynamic-reference evidence in `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/research.md`
- [X] T006 Run reference scans for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` and record import/test-dependency evidence in `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/research.md`
- [X] T007 Verify the canonical admin route surface still resides in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/router/index.ts`
- [X] T008 Confirm RouteShyft, ConnectShyft ownership, and migration-runner boundaries remain out of scope by reconciling `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` with `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/contracts/stale-admin-cleanup-contract.md`

**Checkpoint**: Cleanup targets have proof baselines and scope boundaries are locked.

---

## Phase 3: User Story 1 - Remove Dead Admin-Web MoneyShyft Views (Priority: P1) 🎯 MVP

**Goal**: Remove the clearly stale, unmounted MoneyShyft-era admin-web view groups and any minimal stale admin-web navigation references required to keep admin-web coherent afterward.

**Independent Test**: `apps/admin-web` builds successfully, its router still serves only the canonical admin routes, and no stale MoneyShyft view groups or broken admin-web navigation references remain.

### Tests for User Story 1

- [X] T009 [P] [US1] Re-run static reference verification for `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/{Accounts,Budget,Dashboard,Debts,Goals,Scenarios,Transactions}` before deletion and capture results in `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/research.md`
- [X] T010 [P] [US1] Verify admin-web navigation references to stale MoneyShyft paths in `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/components/layout/AppHeader.vue` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/components/layout/AppMobileNav.vue`

### Implementation for User Story 1

- [X] T011 [US1] Remove stale MoneyShyft view group files under `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/Accounts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/Budget`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/Debts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/Goals`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/Scenarios`, and `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/Transactions`
- [X] T012 [US1] Remove the stale dashboard view at `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/DashboardView.vue` if its verification remains clean
- [X] T013 [US1] Remove or update stale MoneyShyft navigation entries in `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/components/layout/AppHeader.vue`
- [X] T014 [US1] Remove or update stale MoneyShyft navigation entries in `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/components/layout/AppMobileNav.vue`
- [X] T015 [US1] Update stale admin-web classifications in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [X] T016 [US1] Verify `apps/admin-web` still exposes only the canonical admin route surface in `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/router/index.ts`

**Checkpoint**: The stale admin-web MoneyShyft view groups are removed, stale nav references are handled, and admin-web remains independently buildable.

---

## Phase 4: User Story 2 - Verify Likely Stale Admin Leftovers Before Deletion (Priority: P2)

**Goal**: Decide the final fate of `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` using proof, retaining targets that are still needed and deleting only those proven dead.

**Independent Test**: Each likely stale admin leftover ends with an explicit retained-or-deleted classification backed by import, route, and test evidence, while admin boundary tests still pass.

### Tests for User Story 2

- [X] T017 [P] [US2] Verify direct test dependency on `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts` from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`
- [X] T018 [P] [US2] Verify import, route, and test references for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts`

### Implementation for User Story 2

- [X] T019 [US2] Reclassify `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts` as retained-still-needed or confirmed-stale in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` based on the verified dependency evidence
- [X] T020 [US2] Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` only if its reference proof is clean; otherwise retain it and document why in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`
- [X] T021 [US2] Update `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md` to reflect the final retained-or-deleted state of `auth.ts` and `platform-admin.ts`

**Checkpoint**: The two likely stale leftovers are no longer ambiguous; each is either removed or explicitly retained with proof.

---

## Phase 5: User Story 3 - Preserve Explicit Slice Boundaries (Priority: P3)

**Goal**: Prove the cleanup stayed within the Slice 8 boundary and did not change admin ownership, ConnectShyft runtime, migration authority, or RouteShyft transitional handling.

**Independent Test**: Build, boundary tests, and diff review confirm that only the intended stale admin leftovers and related documentation were changed.

### Tests for User Story 3

- [X] T022 [P] [US3] Run `npm run build` in `/Users/jeremiahotis/projects/connectshyft/apps/admin-web`
- [X] T023 [P] [US3] Run `npx jest --runInBand src/__tests__/app-entrypoint-kernel.test.ts` in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`
- [X] T024 [P] [US3] Run `npx jest --runInBand src/routes/api/v1/__tests__/auth.refresh.test.ts src/routes/api/v1/__tests__/platform-admin.test.ts src/routes/api/v1/__tests__/platform-admin-console.test.ts` in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`
- [X] T025 [P] [US3] Run final scope-protection scans against `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`, `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup`, and affected lane apps
- [X] T026 [P] [US3] Verify `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` still render correctly in `/Users/jeremiahotis/projects/connectshyft/apps/admin-web` after cleanup
- [X] T027 [P] [US3] Verify host Nginx delegation remains unchanged against `/Users/jeremiahotis/projects/connectshyft/nginx/host-managed-subdomains.example.conf` and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T028 [P] [US3] Verify canonical API bindings remain localhost-only on admin-api:3100, money-api:3000, and connect-api:3002 using `/Users/jeremiahotis/projects/connectshyft/docker-compose.production.example.yml` and lane runtime configs
- [X] T029 [P] [US3] Verify this slice introduces no shared PostgreSQL connectivity or migration-authority changes by reviewing `/Users/jeremiahotis/projects/connectshyft/shared/database`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.production.example.yml`, and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T030 [US3] Re-run deployment runbook verification against `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md` and record that this slice requires no manual deployment adjustments

### Implementation for User Story 3

- [X] T031 [US3] Update `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/quickstart.md` with the final verification commands and expected outcomes from the completed slice
- [X] T032 [US3] Summarize final target outcomes and stop-boundary proof in `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/research.md`

**Checkpoint**: The slice is fully verified and explicitly bounded.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation consistency and cleanup closure.

- [X] T033 [P] Confirm `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/plan.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/tasks.md` remain aligned after implementation
- [X] T034 Run the full quickstart validation from `/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all cleanup work
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can proceed after US1 or in parallel once admin-web stale proof is collected, but should land after US1 to avoid mixed-scope cleanup churn
- **User Story 3 (Phase 5)**: Depends on completion of the desired cleanup work from US1 and US2
- **Polish (Phase 6)**: Depends on all prior phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - MVP slice for clearly stale admin-web leftovers
- **User Story 2 (P2)**: Depends on the same evidence baseline as US1 and should follow once likely stale API leftover proof is ready
- **User Story 3 (P3)**: Depends on US1 and US2 outcomes because it verifies final scope boundaries and closure

### Within Each User Story

- Verification tasks run before deletion or retention decisions
- Documentation updates follow the actual cleanup outcome, not assumptions
- Build and boundary validation complete before final closure

### Parallel Opportunities

- T002 and T003 can run in parallel
- T005 and T006 can run in parallel
- T009 and T010 can run in parallel
- T017 and T018 can run in parallel
- T022, T023, T024, T025, T026, T027, T028, and T029 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch cleanup proof checks for stale admin-web surfaces together:
Task: "T009 [US1] Re-run static reference verification for apps/admin-web stale view groups"
Task: "T010 [US1] Verify admin-web navigation references in AppHeader.vue and AppMobileNav.vue"
```

## Parallel Example: User Story 2

```bash
# Verify the two likely stale leftovers independently:
Task: "T017 [US2] Verify direct test dependency on apps/moneyshyft-api/src/routes/api/v1/auth.ts"
Task: "T018 [US2] Verify import, route, and test references for apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts"
```

## Parallel Example: User Story 3

```bash
# Run build and boundary verification together:
Task: "T022 [US3] Run admin-web build"
Task: "T023 [US3] Run admin-api app-entrypoint boundary test"
Task: "T024 [US3] Run moneyshyft-api admin boundary tests"
Task: "T025 [US3] Run final scope-protection scans"
Task: "T026 [US3] Verify canonical admin-web routes still render"
Task: "T027 [US3] Verify host Nginx delegation remains unchanged"
Task: "T028 [US3] Verify canonical API bindings remain localhost-only"
Task: "T029 [US3] Verify no shared PostgreSQL or migration-authority changes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational proof gathering
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm stale admin-web leftovers are removed safely and admin-web still builds

### Incremental Delivery

1. Establish evidence baseline and scope locks
2. Remove clearly stale admin-web leftovers and supporting stale nav references
3. Verify and classify likely stale `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` leftovers
4. Run bounded verification and documentation closure

### Suggested MVP Scope

- **User Story 1 only**: stale admin-web MoneyShyft leftovers plus any minimal admin-web navigation cleanup required to keep the admin lane coherent afterward

---

## Notes

- All tasks follow the required checklist format with Task ID, optional `[P]`, optional `[US#]`, action, and file path
- The cleanup is intentionally not a blanket repo sweep
- `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` are intentionally split because current evidence shows different dependency risk
