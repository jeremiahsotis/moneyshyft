# Implementation Plan: Slice 9 Cross-Lane Dependency Anchor Cleanup

**Branch**: `014-break-dependency-anchors` | **Date**: 2026-03-16 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/spec.md)
**Input**: Feature specification from `/specs/014-break-dependency-anchors/spec.md`

## Summary

The smallest safe Slice 9 patch is a narrow dependency-boundary correction, not a tree cleanup. The plan is to build a reviewed-anchor ledger, extract the tenant-module entitlement primitive currently mirrored inside `PlatformAdminService` into an approved shared boundary, rewire the two live runtime imports that still anchor explicitly reviewed stale surfaces, and then reclassify only those reviewed surfaces for deferred Slice 10 deletion. This keeps ConnectShyft and MoneyShyft behavior intact while eliminating the remaining live dependency anchors that keep wrong-lane service trees patch-relevant.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, pg, Jest/ts-jest, existing `libs/platform`, existing `libs/auth`, existing shared communication domain modules under `domains/communication`  
**Storage**: Shared PostgreSQL (`platform` schema plus existing lane data tables)  
**Testing**: `npm run build`, targeted Jest/ts-jest route and unit suites, static import scans, topology/runbook verification  
**Target Platform**: Host-managed Nginx with Dockerized lane APIs bound to localhost and static SPA frontends  
**Project Type**: Monorepo web platform with lane-specific SPAs and Express APIs  
**Performance Goals**: No regression to current ConnectShyft and MoneyShyft route availability; no new cross-lane runtime hop introduced for entitlement checks  
**Constraints**: No big bang rewrite; no direct app-to-app feature imports; apps may import only true shared primitives from `libs/`; no RouteShyft removal; no migration-runner production cutover; no feature redesign; no broad stale-tree deletion  
**Scale/Scope**: One shared entitlement primitive extraction, two live runtime import rewires, narrow supporting classification updates, and verification across Admin, MoneyShyft, and ConnectShyft

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: `admin-web`/`admin-api` remain the platform shell and auth authority; no alternate admin owner is introduced.
- Lane isolation preserved: No direct feature import from one app into another app is introduced; only a true shared primitive becomes cross-lane.
- Routing delegation preserved: `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api`; ConnectShyft and MoneyShyft lane routes keep existing ownership.
- Deployment topology preserved: Host Nginx, localhost-only Docker API bindings, static frontend serving, and shared Postgres topology remain unchanged.
- Database ownership preserved: Shared Postgres compatibility remains intact and no migration authority changes are included.
- Security boundaries preserved: No public API port exposure or new cross-lane ingress path is introduced.
- Workflow compliance: The patch plan is derived directly from the Slice 9 spec and can be translated into tasks without widening scope.
- Acceptance criteria present: The plan includes build, route, topology, and inventory verification for Admin, MoneyShyft, and ConnectShyft.

Result: PASS before Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/014-break-dependency-anchors/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dependency-anchor-boundary-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── admin-api/
│   └── src/
│       ├── routes/api/v1/
│       ├── services/
│       └── platform/
├── connectshyft-api/
│   └── src/
│       ├── routes/api/v1/
│       ├── services/
│       └── modules/connectshyft/
└── moneyshyft-api/
    └── src/
        ├── api/
        ├── routes/api/v1/
        ├── services/
        └── platform/

libs/
└── platform/
    └── src/

architecture/
├── LANE_AUTHORITY.md
└── LANE_INVENTORY.md

specs/012-platform-lane-separation/
└── remediation-map.md
```

**Structure Decision**: The implementation stays inside the existing lane APIs plus `libs/platform`. No new app or runtime boundary is introduced. The only new shared location is a narrow entitlement primitive extracted into `libs/platform` because that is already the approved home for true shared platform primitives.

## Minimal Patch Plan

1. Build a reviewed-anchor ledger for every current direct `PlatformAdminService` dependency edge relevant to the explicitly reviewed Slice 9 surfaces.
2. Extract the narrow tenant-module entitlement primitive currently mirrored across `apps/admin-api`, `apps/moneyshyft-api`, and `apps/connectshyft-api` into `libs/platform`.
3. Rewire the live `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` dependency from `../../../services/PlatformAdminService` to the new shared primitive.
4. Rewire the live `apps/moneyshyft-api/src/api/registerRoutes.ts` dependency from `../services/PlatformAdminService` to the new shared primitive.
5. Leave the larger `PlatformAdminService` files in place for app-owned admin behavior and deferred cleanup; do not delete mirrored service trees in this slice.
6. Reclassify only the explicitly reviewed affected mirror surfaces in `architecture/LANE_INVENTORY.md` and update the convergence remediation notes in `specs/012-platform-lane-separation/remediation-map.md`.

## Exact Files/Modules To Touch

### Implementation files

- `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/index.ts`
- `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/tenantModuleEntitlements.ts` or equivalent new shared primitive module
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts`

### Verification-oriented source/test files

- `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/__tests__/tenantModuleEntitlements.test.ts` or equivalent shared primitive coverage
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/*` only if existing route tests must update import mocks or assertions
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/__tests__/*` only if existing register-route guard tests exist and need import-path updates

### Documentation and reclassification files

- `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`
- `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`

### Explicitly not touched in Slice 9 unless evidence forces it

- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/PlatformAdminService.ts`
- any large mirrored service tree deletion target
- RouteShyft keepers
- migration-runner cutover files

## Dependency Blockers

### Confirmed live anchors keeping stale mirror trees alive

1. `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
   - Current edge: imports `evaluateActorTenantModuleEntitlement` and `PlatformAdminActorContext` from `../../../services/PlatformAdminService`
   - Why it blocks cleanup: it keeps `apps/connectshyft-api/src/services/PlatformAdminService.ts` runtime-live even though the surrounding `src/services/*` tree is otherwise stale mirror baggage.

2. `apps/moneyshyft-api/src/api/registerRoutes.ts`
   - Current edge: imports `evaluateActorTenantModuleEntitlement` and `PlatformAdminActorContext` from `../services/PlatformAdminService`
   - Why it matters in Slice 9: it keeps the MoneyShyft copy of the entitlement logic patch-relevant for live route registration even though admin entitlement authority is conceptually outside MoneyShyft ownership.

### Required reviewed-anchor ledger before reclassification

Every current direct `PlatformAdminService` import site relevant to Slice 9 must be classified as one of:

- `runtime_live`
- `unmounted`
- `test_only`
- `tooling_only`

Slice 9 reclassification may rely only on surfaces explicitly covered by this ledger.

### Non-runtime or deferred anchors that should not widen Slice 9

- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
  - unmounted ConnectShyft mirror route; keep documented but do not make it the primary live anchor patch target
- `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
  - wrong-lane admin mirror but not part of the minimum live runtime anchor slice
- `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts`
  - test-only mirror users of `PlatformAdminService`
- `apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
  - test-only copy; deletion belongs to a later cleanup slice

### Replacement-boundary decision

- Direct import from `apps/admin-api/src/services/PlatformAdminService.ts` is rejected because apps may import only true shared primitives and the full admin service contains broader app-owned behavior that diverges from the stale copies.
- The smallest approved replacement boundary is a shared primitive containing only:
  - `PlatformAdminActorContext`
  - `GovernedModuleKey`
  - `TenantModuleEntitlementDecision`
  - `evaluateTenantModuleEntitlement`
  - `evaluateActorTenantModuleEntitlement`
- This primitive is allowed in `libs/platform` because it is a narrow cross-lane platform entitlement concern already consumed by multiple lanes, not a dump of full admin business logic.
- The shared entitlement primitive must preserve the admin-owned entitlement semantics currently defined by `apps/admin-api/src/services/PlatformAdminService.ts`.
- Slice 9 must stop and defer if the extracted entitlement subset cannot be proven equivalent to the admin-owned behavior without widening into feature redesign.

## Reclassification Actions Required After The Patch

1. Add or update inventory rows for `apps/connectshyft-api/src/services/PlatformAdminService.ts` and any other explicitly reviewed stale mirror surfaces proven by the Slice 9 anchor ledger.
   - Post-patch expected state: no live runtime import anchor remains
   - Expected classification: retain as stale mirror or non-runtime test-only support, with recommendation moving toward `safe_delete_after_convergence` for Slice 10
   - Do not reclassify the entire `apps/connectshyft-api/src/services/*` tree unless each surface is individually reviewed.

2. Update the inventory note for `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and related explicitly reviewed stale ConnectShyft mirror rows to reflect that the shared entitlement primitive removed a remaining wrong-lane dependency anchor, even though the mirror route itself stays deferred.

3. Add or update an inventory row for the new shared entitlement primitive under `libs/platform/*`.
   - Expected classification: `SHARED`
   - Expected duplication state: `canonical`
   - Expected recommendation: `safe_to_patch_live_authority_now` or equivalent shared-platform-safe classification

4. Update `specs/012-platform-lane-separation/remediation-map.md` so the previous note "`apps/connectshyft-api/src/services/*` money-domain service tree | unmounted stale mirror" is refined with the reviewed post-Slice-9 anchor status:
   - the explicitly reviewed stale surfaces are no longer runtime-anchored by `PlatformAdminService`
   - large deletion remains deferred to Slice 10

## Verification Order

1. Static dependency proof
   - confirm current import edges before patch
   - confirm post-patch that no reviewed live runtime imports remain into the explicitly reviewed stale mirror surfaces

2. Shared primitive correctness
   - run the new or relocated unit coverage for the shared entitlement primitive

3. Affected app builds
   - `apps/connectshyft-api`
   - `apps/moneyshyft-api`
   - `apps/admin-api` to prove the admin-owned source remains compatible with the extracted shared entitlement primitive

4. Runtime behavior verification
   - targeted ConnectShyft route tests exercising entitlement-gated behavior
   - MoneyShyft route-registration or governed-route guard verification

5. Boundary and topology verification
   - confirm `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain admin-owned
   - confirm localhost binding, shared Postgres compatibility, and runbook assumptions remain unchanged

6. Cross-app import boundary verification
   - confirm no new direct imports from one app into another app were introduced
   - confirm all new cross-lane reuse flows only through `libs/*`

7. Reclassification verification
   - confirm `architecture/LANE_INVENTORY.md` and `specs/012-platform-lane-separation/remediation-map.md` match the final anchor state for only the explicitly reviewed Slice 9 surfaces

## Explicit Stop Point Before Slice 10 Deletion Work

Stop after:

- the reviewed live runtime anchors are rewired to the shared entitlement primitive
- `PlatformAdminService` no longer anchors `apps/connectshyft-api/src/services/*`
- affected apps build and targeted verification passes
- only the explicitly reviewed stale mirror surfaces are reclassified to reflect the removed live anchors

Do not continue into:

- deleting `apps/connectshyft-api/src/services/*`
- deleting MoneyShyft ConnectShyft mirror routes or tests
- deleting admin or money mirror trees broadly
- RouteShyft cleanup
- migration-runner production cutover

## Phase 0 Research Plan

Research outputs must settle:

- why the full `PlatformAdminService` cannot become the cross-lane boundary
- why the entitlement subset is the minimal allowed shared primitive
- which current imports are genuinely live runtime anchors versus unmounted or test-only residue

## Phase 1 Design Plan

Design outputs must define:

- the shared entitlement primitive interface and ownership contract
- the exact import rewires in `connectshyft-api` and `moneyshyft-api`
- the inventory reclassification changes triggered by anchor removal
- the build/test/runbook verification sequence

## Post-Design Constitution Check

- Platform shell authority preserved: PASS
- Lane isolation preserved: PASS if only `libs/platform` becomes the new boundary
- Routing delegation preserved: PASS
- Deployment topology preserved: PASS
- Database ownership preserved: PASS
- Security boundaries preserved: PASS
- Workflow compliance: PASS
- Acceptance criteria present: PASS

Result: PASS after Phase 1 design.

## Complexity Tracking

No constitution violations are required for this slice. The selected design is the smallest compliant patch because it extracts only the cross-lane entitlement primitive and defers all large mirror deletion to Slice 10.
