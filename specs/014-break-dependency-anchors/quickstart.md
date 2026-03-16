# Quickstart: Slice 9 Cross-Lane Dependency Anchor Cleanup

## Goal

Verify that Slice 9 removes the live dependency anchors keeping stale mirror service trees alive without performing Slice 10 deletion work.

## Pre-Check

1. Confirm the branch is `014-break-dependency-anchors`.
2. Confirm the known live anchors still exist before implementation:
   - `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
   - `apps/moneyshyft-api/src/api/registerRoutes.ts`
3. Confirm no direct app-to-app feature import is introduced by the planned rewire.

## Suggested Verification Order

1. Run a static import scan for `PlatformAdminService` and the new shared entitlement primitive, and confirm every direct `PlatformAdminService` import is classified as `runtime_live`, `unmounted`, `test_only`, or `tooling_only`.
2. Verify the shared entitlement primitive preserves the admin-owned entitlement semantics defined in `apps/admin-api/src/services/PlatformAdminService.ts`.
3. Run the shared primitive unit coverage.
4. Build the affected APIs:
   - `apps/connectshyft-api`
   - `apps/moneyshyft-api`
   - `apps/admin-api`
5. Run targeted behavior checks:
   - ConnectShyft entitlement-gated route checks
   - MoneyShyft governed-route guard checks
6. Re-run the static import scan to confirm no reviewed live runtime still depends on the explicitly reviewed stale mirror service surfaces covered by Slice 9.
7. Review `architecture/LANE_INVENTORY.md` and `specs/012-platform-lane-separation/remediation-map.md` for correct post-anchor classification on only the explicitly reviewed Slice 9 surfaces.
8. Reconfirm topology invariants:
   - `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain admin-owned
   - lane APIs remain localhost-bound
   - shared Postgres compatibility is unchanged
   - production runbook assumptions remain valid
9. Confirm the rewire introduced no direct app-to-app feature imports and that cross-lane reuse flows only through `libs/*`.

## Expected Outcome

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` no longer imports from a stale local `PlatformAdminService`
- `apps/moneyshyft-api/src/api/registerRoutes.ts` no longer imports from a stale local `PlatformAdminService`
- no reviewed live runtime import remains into the explicitly reviewed stale mirror surfaces targeted by Slice 9
- `apps/connectshyft-api/src/services/PlatformAdminService.ts` and `apps/moneyshyft-api/src/services/PlatformAdminService.ts` remain in-repo only as deferred non-live cleanup surfaces
- affected apps still build successfully
- only explicitly reviewed stale mirror surfaces are reclassified for Slice 10, but not deleted here

## Explicit Stop Point

Stop after the live dependency anchors are removed, builds and targeted verification pass, and inventory reclassification is complete.

Do not continue into:

- deleting `apps/connectshyft-api/src/services/*`
- deleting MoneyShyft ConnectShyft mirror routes or tests
- deleting broader stale mirrors
- RouteShyft cleanup
- migration-runner production cutover
