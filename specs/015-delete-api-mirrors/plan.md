# Implementation Plan: Slice 10 - Delete Stale API Mirror Files After File-Level Reclassification

**Branch**: `015-delete-api-mirrors` | **Date**: 2026-03-16 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/spec.md)
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/spec.md`

## Summary

The smallest safe Slice 10 patch is a file-level deletion pass, not a tree cleanup. The plan is to remove only the `PlatformAdminService.ts` mirror files that remain proven `safe_delete_after_convergence` after blocker review, review each associated stale mirror test file separately before any deletion decision, update `architecture/LANE_INVENTORY.md` with exact per-file outcomes, and explicitly defer the two `converge_first` MoneyShyft route files. Directory-level mirror trees, RouteShyft keepers, and migration-runner work remain outside the slice.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express APIs, Jest/ts-jest, shared primitives under `libs/platform`, repository import scans via `rg`  
**Storage**: Shared PostgreSQL remains unchanged; no new schema work  
**Testing**: `npm run build`, targeted Jest suites, import/reference scans, route/boundary verification  
**Target Platform**: Local and CI validation for the monorepo API services  
**Project Type**: TypeScript monorepo with multiple API services and shared libraries  
**Performance Goals**: No regression to current route ownership, entitlement behavior, or local/CI validation flow  
**Constraints**: No big-bang cleanup; no deletion of `converge_first` routes; no directory/glob deletion without file proof; no RouteShyft cleanup; no migration-runner cutover  
**Scale/Scope**: Two deletion-eligible service files, five associated test files for individual review, two explicitly deferred route files, and file-level inventory updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. Slice 10 does not alter `admin-web`/`admin-api` shell or auth ownership.
- Lane isolation preserved: PASS. Deletion work removes stale mirrors and does not introduce app-to-app feature imports.
- Routing delegation preserved: PASS. `admin-api` remains the owner of `/api/v1/auth/*` and `/api/v1/platform/admin/*`; the two deferred MoneyShyft route mirrors remain in place.
- Deployment topology preserved: PASS. No Nginx, port-binding, static frontend, or container topology changes are planned.
- Database ownership preserved: PASS. No migration authority or schema execution changes are included.
- Security boundaries preserved: PASS. No public-port, ingress, or cross-lane cookie changes are included.
- Workflow compliance: PASS. This plan derives directly from the Slice 10 spec and current file-level inventory evidence.
- Acceptance criteria present: PASS. Plan includes build, test, import-scan, boundary, and explicit deferral verification.

## Project Structure

### Documentation (this feature)

```text
specs/015-delete-api-mirrors/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── moneyshyft-api/
│   ├── src/
│   │   ├── api/
│   │   ├── routes/api/v1/__tests__/
│   │   └── services/
├── connectshyft-api/
│   └── src/
│       ├── routes/api/v1/
│       └── services/
├── admin-api/
│   └── src/
│       └── routes/api/v1/
└── migration-runner/

libs/
└── platform/

architecture/
├── LANE_AUTHORITY.md
└── LANE_INVENTORY.md

specs/
├── 012-platform-lane-separation/
└── 014-break-dependency-anchors/
```

**Structure Decision**: The implementation touches only API service files, associated tests, and inventory/planning documents. No frontend or migration-runner source changes are part of this slice.

## Phase 0: Research

### Research Focus

1. Confirm the exact deletion-ready service files still match current inventory and import evidence.
2. Confirm whether each associated test file is individually delete-safe or still needed.
3. Confirm the exact file-level inventory updates required after deletion or deferral.
4. Confirm the verification sequence that proves deletion stayed inside the slice boundary.

### Research Decisions To Capture

- Minimal deletion scope: delete only the two `PlatformAdminService.ts` mirrors unless new blocking evidence appears.
- Associated tests: decide per file whether deletion is safe now or must be deferred.
- Inventory posture: record final status per file, not per tree.
- Deferral posture: keep `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/routes/api/v1/auth.ts` explicitly deferred as `converge_first`.

## Phase 1: Design

### Minimal Deletion Patch Plan

1. Reconfirm deletion eligibility for:
   - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts`
2. Re-verify whether `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts` is blocked by any retained in-repo importer, including currently unmounted route mirrors.
3. Inspect each associated test file separately:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
4. Delete only the files still supported by current file-level proof.
5. Update `architecture/LANE_INVENTORY.md` with exact deleted, retained, deferred, and blocked file-level outcomes.
6. Update supporting slice evidence to reflect which associated tests were deleted versus deferred.
7. Stop without touching:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`

### Exact Files Eligible For Deletion Now

- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts`

### Exact Files Requiring Re-Verification Before Any Deletion

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
  - blocked unless all remaining in-repo importers are also removed or explicitly rewired within Slice 10

### Exact Files That Still Require Proof

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
  - currently blocked from deletion because it is imported by multiple provider-registry test files that are not yet in Slice 10 scope
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts`

### Inventory Update Actions

1. Update the row for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
   - final state: deleted if proof still holds, otherwise retained with explicit blocker reason
2. Update the row for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts`
   - final state: deleted if proof still holds, otherwise retained with explicit blocker reason
3. Add file-level rows for any reviewed associated test files that currently exist only under a glob or directory-level inventory entry
4. Add or update explicit deferral notes for:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
5. Add a file-level row for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` because it is a current in-repo blocker to deleting the MoneyShyft service mirror

### Verification Order

1. Pre-delete import/reference scan for the two service files and each associated test file
2. Pre-delete proof check that no reviewed file is router-mounted or still required by surviving tests
3. Delete only the files that remain proven safe
4. Run affected application builds:
   - `apps/connectshyft-api`
   - `apps/moneyshyft-api` if any reviewed MoneyShyft file is deleted or rewritten
   - `apps/admin-api` only if shared entitlement parity or surviving admin-boundary verification requires it
5. Run the minimum surviving targeted verification set:
   - retained provider-registry tests that still depend on `connectshyft.provider-registry.test.shared.ts`
   - retained `PlatformAdminService.test.ts` files, if any remain
   - `apps/moneyshyft-api/src/api/__tests__/registerRoutes.test.ts`
   - `apps/admin-api/src/services/__tests__/tenantModuleEntitlements.shared.test.ts`
6. Run post-delete import/reference scans confirming removed files are no longer referenced
7. Verify deferred `converge_first` files remain present and unchanged
8. Verify RouteShyft transitional keepers and migration-runner surfaces remain untouched
9. Update inventory and supporting evidence from final post-delete state

### Explicit Deferral Plan For The Two `converge_first` Route Files

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
  - keep in place
  - record as still `converge_first`
  - do not delete unless a later slice proves the file is individually dead beyond current unmounted status
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
  - keep in place
  - record as still `converge_first`
  - current blocker remains direct test dependency and unresolved convergence closure

## Phase 1 Outputs

- `research.md`: decisions on exact delete-safe versus deferred associated tests
- `data-model.md`: file-review entities and final-state model
- `contracts/file-deletion-boundary.md`: allowed and forbidden deletion scope for Slice 10
- `quickstart.md`: verification sequence and explicit stop-before-converge-first guidance

## Post-Design Constitution Check

- Platform shell authority preserved: PASS
- Lane isolation preserved: PASS
- Routing delegation preserved: PASS
- Deployment topology preserved: PASS
- Database ownership preserved: PASS
- Security boundaries preserved: PASS
- Workflow compliance: PASS
- Acceptance criteria present: PASS

## Complexity Tracking

No constitution violations or justified exceptions are required for this slice.
