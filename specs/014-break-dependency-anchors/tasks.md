# Tasks: Slice 9 Cross-Lane Dependency Anchor Cleanup

**Input**: Design documents from `/specs/014-break-dependency-anchors/`
**Prerequisites**: [plan.md](/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/plan.md), [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/spec.md), [research.md](/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md), [data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/data-model.md), [dependency-anchor-boundary-contract.md](/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/contracts/dependency-anchor-boundary-contract.md)

**Tests**: Include targeted unit, route, build, import-scan, and topology verification because the spec explicitly requires verification after implementation.

**Organization**: Tasks are grouped by user story so each slice of dependency-anchor cleanup can be implemented and validated independently.

## Phase 1: Setup (Shared Context)

**Purpose**: Capture the live anchor baseline and lock the allowed replacement boundary before code changes.

- [X] T001 Capture the current live `PlatformAdminService` dependency anchors in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md`
- [X] T002 Capture the approved replacement-boundary summary in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/contracts/dependency-anchor-boundary-contract.md`
- [X] T003 [P] Capture the current stale-mirror classifications that Slice 9 may update in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`
- [X] T004 [P] Capture the current convergence notes for `apps/connectshyft-api/src/services/*` and related mirror rows in `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [X] T005 [P] Record every direct `PlatformAdminService` import site and classify it as `runtime_live`, `unmounted`, `test_only`, or `tooling_only` in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared entitlement primitive and baseline proof before any story-level rewires.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create the shared tenant-module entitlement primitive in `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/tenantModuleEntitlements.ts`
- [X] T007 Export the shared entitlement primitive from `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/index.ts`
- [X] T008 [P] Add unit coverage for the shared entitlement primitive in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/tenantModuleEntitlements.shared.test.ts`
- [X] T009 Document the exact in-scope runtime anchors and out-of-scope test/unmounted anchors in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/plan.md`
- [X] T010 Compare the proposed shared entitlement primitive against `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/PlatformAdminService.ts` and record admin-semantic parity proof in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md`

**Checkpoint**: Shared entitlement boundary is ready, the live anchor scope is locked, and admin-semantic parity is proven.

---

## Phase 3: User Story 1 - Break the Known PlatformAdminService Anchor (Priority: P1) 🎯 MVP

**Goal**: Remove the known live `PlatformAdminService` anchor from the canonical ConnectShyft runtime route.

**Independent Test**: `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` imports only the shared entitlement primitive, `apps/connectshyft-api` builds successfully, and targeted ConnectShyft entitlement behavior still passes.

### Tests for User Story 1

- [X] T011 [P] [US1] Validate shared-boundary coverage for ConnectShyft entitlement-gated route behavior in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Rewire `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to import the entitlement types and functions from `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/tenantModuleEntitlements.ts`
- [X] T013 [US1] Remove the live wrong-lane `PlatformAdminService` import usage from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T014 [US1] Verify `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts` is no longer imported by live ConnectShyft runtime code using the Slice 9 proof notes in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md`

### Verification for User Story 1

- [X] T015 [US1] Run targeted ConnectShyft route tests covering the rewired entitlement path from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- [X] T016 [US1] Run the standard build for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`
- [X] T017 [US1] Record the post-rewire import-scan proof for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md`

**Checkpoint**: The primary Slice 9 blocker is removed and ConnectShyft no longer anchors the wrong tree through its live route.

---

## Phase 4: User Story 2 - Remove Other Live Cross-Lane Service Anchors (Priority: P2)

**Goal**: Remove the remaining reviewed live runtime anchors that keep explicitly reviewed stale mirror surfaces patch-relevant without widening into broad cleanup.

**Independent Test**: The reviewed live runtime anchors are either rewired to the shared entitlement primitive or explicitly documented as out of scope, and no reviewed live runtime import remains into the targeted explicitly reviewed stale mirror surfaces.

### Tests for User Story 2

- [X] T018 [P] [US2] Update or add governed-route guard coverage for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/__tests__/registerRoutes.test.ts`

### Implementation for User Story 2

- [X] T019 [US2] Rewire `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts` to import the entitlement types and functions from `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/tenantModuleEntitlements.ts`
- [X] T020 [US2] Remove the live wrong-lane `PlatformAdminService` import usage from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts`
- [X] T021 [US2] Record any remaining non-runtime `PlatformAdminService` anchors as deferred or blocked in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md`
- [X] T022 [US2] Confirm the approved shared boundary remains limited to the entitlement subset in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/contracts/dependency-anchor-boundary-contract.md`

### Verification for User Story 2

- [X] T023 [US2] Run targeted guard or route-registration tests covering `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/__tests__/registerRoutes.test.ts`
- [X] T024 [US2] Run the standard build for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`
- [X] T025 [US2] Record proof that no reviewed live runtime still imports from the explicitly reviewed stale mirror surfaces in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md`

**Checkpoint**: All reviewed live runtime anchors in scope are rewired or explicitly documented, and explicitly reviewed stale mirror surfaces are no longer live dependencies.

---

## Phase 5: User Story 3 - Preserve Slice Boundaries for Later Mirror Deletion (Priority: P3)

**Goal**: Reclassify only the explicitly reviewed mirror surfaces and stop before Slice 10 deletion work.

**Independent Test**: Inventory and remediation docs reflect the removed runtime anchors for explicitly reviewed surfaces, and the final diff proves no RouteShyft deletion, migration-runner cutover, or broad stale cleanup was included.

### Implementation for User Story 3

- [X] T026 [US3] Update classifications only for `apps/connectshyft-api/src/services/PlatformAdminService.ts` and other explicitly reviewed Slice 9 surfaces in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`
- [X] T027 [US3] Update the post-anchor remediation notes for explicitly reviewed stale service surfaces in `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [X] T028 [US3] Add or update the shared entitlement primitive inventory row in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`
- [X] T029 [US3] Record the explicit Slice 9 stop-before-deletion state in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/quickstart.md`

### Verification for User Story 3

- [X] T030 [US3] Verify `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` matches the final post-anchor state for only the explicitly reviewed Slice 9 surfaces
- [X] T031 [US3] Verify `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md` reflects deferred Slice 10 deletion rather than current deletion work
- [X] T032 [US3] Review the Slice 9 diff and record proof in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md` that no RouteShyft deletion, migration-runner cutover, or broad stale cleanup was included

**Checkpoint**: Slice 9 is fully documented, narrowly reclassified, and explicitly stopped before stale mirror deletion.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end verification, topology checks, import-boundary checks, and explicit stop-boundary confirmation.

- [X] T033 [P] Run the shared entitlement primitive parity test suite in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/tenantModuleEntitlements.shared.test.ts`
- [X] T034 [P] Run a repository import scan proving no reviewed live runtime still imports `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts` or `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- [X] T035 [P] Run a repository import scan proving no new app-to-app feature imports were introduced between `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`
- [X] T036 Run the standard build for `/Users/jeremiahotis/projects/connectshyft/apps/admin-api` after the shared entitlement primitive extraction
- [X] T037 Validate auth/platform-admin delegation, localhost API binding, shared Postgres compatibility, and runbook invariants using `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md`, `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/quickstart.md`
- [X] T038 Run the full Slice 9 quickstart verification in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/quickstart.md`
- [X] T039 Execute the explicit “stop here” review in `/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/quickstart.md` and confirm no stale mirror deletion work begins in this slice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: no dependencies
- **Phase 2: Foundational**: depends on Phase 1 and blocks all story work
- **Phase 3: US1**: depends on Phase 2
- **Phase 4: US2**: depends on Phase 3 because the shared entitlement boundary and the primary live anchor proof should be established first
- **Phase 5: US3**: depends on Phases 3 and 4 because reclassification must follow the live anchor rewires
- **Phase 6: Polish**: depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: first MVP slice; no dependency on other user stories
- **US2 (P2)**: depends on the US1 shared-boundary and anchor-removal pattern
- **US3 (P3)**: depends on US1 and US2 because reclassification only makes sense after rewiring proof exists

### Within Each User Story

- Test-update tasks come before implementation rewires
- Rewire tasks come before verification tasks
- Reclassification tasks come before final stop-boundary verification

## Parallel Opportunities

- T003, T004, and T005 can run in parallel during setup
- T008 can run in parallel with T009 after the shared primitive file exists
- T011 can run in parallel with T012 only if the test change is isolated from the import rewrite
- T018 can run in parallel with T022 once the shared primitive interface is fixed
- T033, T034, and T035 can run in parallel during final verification

## Parallel Example: User Story 1

```bash
# Once the shared primitive exists, these can proceed in parallel:
Task: "Update or add shared-boundary coverage for apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts"
Task: "Rewire apps/connectshyft-api/src/routes/api/v1/connectshyft.ts to import the entitlement types and functions from libs/platform/src/tenantModuleEntitlements.ts"
```

## Parallel Example: User Story 2

```bash
# After US1 establishes the shared boundary, these can proceed in parallel:
Task: "Update or add governed-route guard coverage for apps/moneyshyft-api/src/api/registerRoutes.ts"
Task: "Record any remaining non-runtime PlatformAdminService anchors as deferred or blocked in specs/014-break-dependency-anchors/research.md"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3
3. Stop and verify that the known `PlatformAdminService` anchor is gone from the live ConnectShyft route

### Incremental Delivery

1. Establish the reviewed-anchor ledger and shared entitlement primitive
2. Rewire the known ConnectShyft live anchor
3. Rewire the remaining reviewed MoneyShyft live anchor
4. Reclassify only explicitly reviewed mirror surfaces
5. Run final verification and stop before deletion

### Stop Boundary Reminder

Slice 9 ends after dependency-anchor cleanup, verification, and reclassification.
Do not delete stale mirror trees, RouteShyft keepers, or migration-runner surfaces in this task set.

## Notes

- Every task is intentionally scoped to dependency-anchor cleanup only.
- Verification tasks come after implementation tasks within each story.
- The final polish phase includes explicit no-app-to-app-import and stop-boundary tasks so Slice 10 deletion work cannot start accidentally.
