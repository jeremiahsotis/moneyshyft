# Feature Specification: Slice 8 Stale Admin Leftovers Cleanup

**Feature Branch**: `013-admin-leftovers-cleanup`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Create a spec for Slice 8: stale unmounted admin-web and admin leftovers cleanup. Context: The lane convergence remediation work is mostly complete, but a fresh inventory-backed review found clearly stale, unmounted admin-lane surfaces still present. Safe next-cleanup candidates identified: - apps/admin-web/src/views/Accounts - apps/admin-web/src/views/Budget - apps/admin-web/src/views/Dashboard - apps/admin-web/src/views/Debts - apps/admin-web/src/views/Goals - apps/admin-web/src/views/Scenarios - apps/admin-web/src/views/Transactions Also likely stale, but must be verified before deletion: - auth.ts - platform-admin.ts Requirements: - remove only clearly dead/unmounted admin-web MoneyShyft leftovers - verify targets are not router-mounted, imported, dynamically referenced, or still needed by tests - do not touch ConnectShyft runtime ownership - do not touch migration-runner cutover - do not touch RouteShyft transitional keepers - do not do blanket cleanup - update inventory/classification docs as needed Stop boundary for this slice: - stale admin-web/unmounted admin leftovers are removed or explicitly proven still needed - admin-web builds - admin routes still work - no API mirror deletion - no migration execution changes Please generate a spec.md that includes: - scope - non-goals - acceptance criteria - verification requirements - explicit stop boundary - risks"

## Scope

This slice removes only stale, unmounted admin-lane leftovers that remain after the lane convergence remediation. The primary focus is the retained MoneyShyft-oriented admin-web view groups that are no longer part of the live admin lane experience, plus a narrow verification pass on the likely stale admin route leftovers currently believed to be dead.

In scope:

- removal of clearly dead, unmounted admin-web leftover surfaces associated with Accounts, Budget, Dashboard, Debts, Goals, Scenarios, and Transactions
- proof-based verification of likely stale admin leftovers currently represented by `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts`
- inventory and authority documentation updates that reflect final classifications after the verification
- build and route verification needed to prove the cleanup is safe

## Non-Goals

- changing ConnectShyft runtime ownership or route authority
- changing migration execution authority, cutover sequencing, or runner governance
- removing RouteShyft transitional keepers
- deleting API mirrors beyond the specifically verified admin leftovers in this slice
- performing broad repo cleanup just because files appear old, duplicated, or low traffic
- redesigning admin user flows, permissions, or navigation

## Routing Ownership and Lane Boundaries

- `admin-web` remains the active platform shell for `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden`.
- `admin-api` remains the owner of `/api/v1/auth/*` and `/api/v1/platform/admin/*`.
- MoneyShyft and ConnectShyft retain their current lane-local API ownership; this slice does not change lane delegation, host Nginx behavior, or shared PostgreSQL compatibility.
- Acceptance for this slice requires confirming that delegated auth/admin ownership and shared-database compatibility remain unchanged after cleanup.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove Dead Admin-Web MoneyShyft Views (Priority: P1)

As a maintainer, I need clearly dead admin-web MoneyShyft leftovers removed so the admin lane only retains live, intentional surfaces and future cleanup work does not have to guess whether those views still matter.

**Why this priority**: These targets are already considered the safest cleanup candidates. Removing them reduces confusion immediately without changing runtime ownership.

**Independent Test**: Can be fully tested by proving the candidate view groups are not router-mounted, not imported, not dynamically referenced, not required by tests, and that admin-web still builds and serves the current admin routes afterward.

**Acceptance Scenarios**:

1. **Given** a candidate admin-web leftover has no live router mount, import chain, dynamic reference, or test dependency, **When** the slice is implemented, **Then** that leftover is removed and documented as a confirmed stale deletion.
2. **Given** the stale admin-web leftovers are removed, **When** admin-web is built and `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` are exercised, **Then** the admin lane still serves those routes without missing-view regressions.

---

### User Story 2 - Verify Likely Stale Admin Leftovers Before Deletion (Priority: P2)

As a maintainer, I need the likely stale admin leftovers checked with evidence before deletion so the cleanup does not remove a surface that is still indirectly used.

**Why this priority**: These targets are suspected to be stale, but they are not yet as clearly safe as the admin-web view groups. Verification must come before deletion.

**Independent Test**: Can be fully tested by producing evidence that `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` are or are not router-mounted, imported, dynamically referenced, or still needed by tests, and then either deleting them or explicitly retaining them with updated classification.

**Acceptance Scenarios**:

1. **Given** `apps/moneyshyft-api/src/routes/api/v1/auth.ts` or `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` is still referenced by routing, imports, dynamic loading, or tests, **When** the verification pass is completed, **Then** that leftover remains in place and is documented as still needed.
2. **Given** `apps/moneyshyft-api/src/routes/api/v1/auth.ts` or `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` has no remaining references or test dependency, **When** the verification pass is completed, **Then** that leftover may be deleted and reclassified as a confirmed stale artifact.

---

### User Story 3 - Preserve Explicit Slice Boundaries (Priority: P3)

As a reviewer, I need this cleanup slice to stop at the agreed boundary so it does not silently widen into broader lane convergence, migration, or RouteShyft work.

**Why this priority**: The main risk of cleanup slices is scope drift. This slice only remains safe if it stays narrow and evidence-based.

**Independent Test**: Can be fully tested by confirming that ConnectShyft runtime ownership, migration execution behavior, RouteShyft keepers, and unrelated API mirrors remain unchanged after the slice is complete.

**Acceptance Scenarios**:

1. **Given** the slice is complete, **When** the changed files and inventory updates are reviewed, **Then** no ConnectShyft runtime ownership, migration execution, or RouteShyft keeper changes are present.
2. **Given** the slice is complete, **When** the cleanup diff is reviewed, **Then** only the targeted stale admin leftovers and supporting documentation updates are included.

## Edge Cases

- A candidate view directory is not router-mounted directly but is still imported by a shared admin component or test helper.
- A likely stale leftover is unmounted in production routes but still used by boundary tests intended to prevent regressions.
- A dynamic import or string-based route reference makes a target appear unused in static import scans.
- Inventory documentation and live code disagree about whether a target is stale, unmounted, or still transitional.
- A cleanup removes a view group safely, but the admin lane still fails because a current route or layout references an asset, type, or test fixture beneath that group.
- A target is safe to remove from admin-web but similar-looking API mirrors remain intentionally out of scope for this slice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST remove only stale, unmounted admin-web MoneyShyft leftovers that are verified to have no live route mount, import chain, dynamic reference, or test dependency.
- **FR-002**: The system MUST verify each likely stale admin leftover before deletion and MUST retain any target that still has a proven dependency.
- **FR-003**: The system MUST record proof for each reviewed target covering route mounts, imports, dynamic references, and test dependencies.
- **FR-004**: The system MUST update lane inventory or classification documents to reflect the post-slice status of every reviewed target.
- **FR-005**: The system MUST preserve successful rendering and navigation for `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` after cleanup.
- **FR-006**: The system MUST leave ConnectShyft runtime ownership unchanged.
- **FR-007**: The system MUST leave migration execution behavior, cutover sequencing, and authority unchanged.
- **FR-008**: The system MUST preserve RouteShyft transitional keepers and MUST NOT reclassify them as safe cleanup under this slice.
- **FR-009**: The system MUST avoid deleting unrelated admin API mirrors, stale feature copies, or other leftovers not explicitly reviewed in this slice.
- **FR-010**: The system MUST assign each reviewed target exactly one final classification: removed as confirmed stale, or retained as still needed.

## Verification Requirements

- Verify each admin-web candidate is not router-mounted in the live admin router.
- Verify each target has no direct or transitive import usage in active admin-web code.
- Verify each target has no dynamic reference pattern that still makes it reachable at runtime.
- Verify each target is not still required by automated tests or smoke checks.
- Verify admin-web builds successfully after cleanup.
- Verify `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` still render and route correctly after cleanup.
- Verify delegated auth/admin route ownership remains with `admin-api`.
- Verify shared-database compatibility remains unchanged for this slice.
- Verify no ConnectShyft runtime ownership changes are introduced.
- Verify no migration execution changes are introduced.
- Verify no RouteShyft transitional keeper is deleted or reclassified.

## Acceptance Criteria

- The identified stale admin-web MoneyShyft leftovers are either removed with proof of non-use or retained with explicit proof of continued need.
- The likely stale `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` leftovers are each either deleted with proof or explicitly documented as still needed.
- Admin-web builds successfully after the cleanup.
- `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` continue to work after the cleanup.
- Delegated auth/admin ownership and shared-database compatibility remain unchanged and explicitly verified.
- Inventory and classification documents reflect the final reviewed status of each target.
- No ConnectShyft runtime, migration authority, RouteShyft keeper, or unrelated API mirror changes are included.

## Explicit Stop Boundary

This slice stops immediately once all targeted stale admin-web leftovers and likely stale admin leftovers have been either removed or explicitly proven still needed, admin-web builds successfully, `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` still work, and delegated auth/admin ownership remains unchanged.

This slice does not continue into:

- ConnectShyft runtime convergence or ownership changes
- migration-runner cutover or production migration authority changes
- RouteShyft cleanup or reclassification
- broad API mirror deletion
- generalized stale-code removal outside the verified target set

## Risks

- A target may look unmounted in the router but still be referenced through a dynamic import path or test harness.
- Removing a stale admin-web group may break a shared layout, type, or fixture dependency that is not obvious from router inspection alone.
- Inventory documentation may lag behind live code and create a false-positive stale classification.
- The likely stale admin leftovers may still be required for admin boundary coverage, which would force retention and reduce deletion scope for the slice.
- Scope drift could turn a safe cleanup pass into broader convergence work if reviewers do not enforce the explicit stop boundary.

## Assumptions

- The current live admin lane is already canonically owned by admin-api and admin-web, and this slice does not need to re-establish that ownership.
- The identified admin-web view groups are cleanup candidates because the fresh inventory-backed review found them unmounted and stale, but deletion still requires direct verification.
- The likely stale `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` leftovers are narrower review targets than the admin-web view groups and therefore require explicit proof before deletion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of targeted stale admin-web view groups are either removed or explicitly retained with documented proof of continued need.
- **SC-002**: 100% of likely stale admin leftovers reviewed in this slice end in a documented final classification of either confirmed stale or still needed.
- **SC-003**: Admin-web completes its standard build successfully after the slice with no cleanup-related build failure.
- **SC-004**: Reviewers can inspect the final slice diff and confirm that all deletions belong only to the verified target set.
- **SC-005**: Post-slice verification confirms `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` remain reachable and render without cleanup-related regressions.
