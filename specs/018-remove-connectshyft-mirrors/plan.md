# Implementation Plan: Slice 10c - Final ConnectShyft Mirror Module Tree Removal

**Branch**: `018-remove-connectshyft-mirrors` | **Date**: 2026-03-16 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/spec.md)
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/spec.md`

## Summary

Slice 10c removes the final stale ConnectShyft mirror module trees under MoneyShyft and Admin by clearing the small set of remaining importer anchors, preserving only the canonical ConnectShyft coverage that still matters, and then deleting both trees with explicit inventory updates. The safe execution order is: prove the remaining dependency map, migrate any unique residual identity coverage into canonical ConnectShyft tests, remediate the Admin platform-console dependency on mirror `numberMappings`, delete the now-anchorless top-level mirror tests, remove the two mirror trees, and stop after verification plus `LANE_INVENTORY.md` reconciliation.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20 plus Markdown planning artifacts  
**Primary Dependencies**: Express, Jest, ts-jest, Knex, pg, repo search via `rg`, workspace boundary enforcement, lane inventory governance  
**Storage**: Shared PostgreSQL remains unchanged; no schema or migration work in this slice  
**Testing**: Jest unit and route tests, repository importer scans, app build verification, inventory reconciliation  
**Target Platform**: Monorepo backend services and planning artifacts on macOS/Linux shell environments  
**Project Type**: Multi-lane TypeScript web-service monorepo  
**Performance Goals**: Remove both stale mirror trees in one bounded slice without regressing canonical ConnectShyft, Admin, or MoneyShyft behavior  
**Constraints**: No RouteShyft work; no migration-runner work; no new convergence audit; no broad stale cleanup; no feature work; no deletion without explicit dependency proof; no app-to-app source import workaround that preserves mirror ownership ambiguity  
**Scale/Scope**: Two mirror trees, four named anchor files, their registration and discovery paths, the canonical ConnectShyft tests that may receive retained coverage, and the corresponding `architecture/LANE_INVENTORY.md` rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. `admin-web` and `admin-api` remain the shell and auth authority; this slice removes stale ConnectShyft mirrors only.
- Lane isolation preserved: PASS. The plan removes mirror residue and moves retained coverage to canonical ConnectShyft ownership rather than introducing new cross-lane feature coupling.
- Routing delegation preserved: PASS. Admin continues owning `/api/v1/auth/*` and `/api/v1/platform/admin/*`; MoneyShyft does not regain ConnectShyft runtime ownership.
- Deployment topology preserved: PASS. No Nginx, Docker binding, or shared Postgres topology changes are introduced.
- Database ownership preserved: PASS. No migration authority or schema ownership changes are involved.
- Security boundaries preserved: PASS. No public-port, ingress, or session-boundary changes are introduced.
- Workflow compliance: PASS. This plan is derived from the approved Slice 10c spec, `architecture/LANE_INVENTORY.md`, the Slice 10b detachment ledger, and the closure audit evidence.
- Acceptance criteria present: PASS. The plan includes a dependency map, deletion order, verification steps, and an explicit stop point.

**Post-Design Re-check**: PASS. The designed remediation keeps runtime ownership canonical, keeps Admin and MoneyShyft from reintroducing ConnectShyft mirrors, and does not require a constitution exception.

## Project Structure

### Documentation (this feature)

```text
/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mirror-tree-removal-boundary.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
/Users/jeremiahotis/projects/connectshyft/apps/
├── moneyshyft-api/
│   └── src/
│       ├── __tests__/
│       ├── api/
│       └── modules/connectshyft/
├── admin-api/
│   └── src/
│       ├── __tests__/
│       ├── api/
│       ├── routes/api/v1/
│       │   └── __tests__/
│       └── modules/connectshyft/
└── connectshyft-api/
    └── src/
        ├── modules/connectshyft/
        │   └── __tests__/
        └── routes/api/v1/
            └── __tests__/

/Users/jeremiahotis/projects/connectshyft/architecture/
└── LANE_INVENTORY.md

/Users/jeremiahotis/projects/connectshyft/scripts/
└── enforce-workspace-boundaries.js
```

**Structure Decision**: The slice is bounded to the two stale module trees, the exact Admin and MoneyShyft files that still keep them reachable, the canonical ConnectShyft tests that may receive surviving assertions, and the inventory rows that must reflect the final state.

## Complexity Tracking

No constitution violations or exception requests are required for this plan.

## Phase 0: Research

### Research Questions Resolved

1. Which files still keep `apps/moneyshyft-api/src/modules/connectshyft` alive?
2. Which files still keep `apps/admin-api/src/modules/connectshyft` alive?
3. Which of the remaining top-level identity tests contain legitimate canonical behavior coverage rather than mirror-only duplication?
4. What is the minimum safe remediation for the Admin `platform-admin-console.ts` dependency on the Admin mirror tree?
5. What deletion order clears anchors without breaking active import paths mid-slice?

### Phase 0 Conclusions

- MoneyShyft’s module tree is kept alive only by two top-level tests discovered by Jest:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`
- Admin’s module tree is kept alive by one runtime chain plus three test anchors:
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`
- Canonical ConnectShyft already covers the main identity-boundary and identity-match behaviors in:
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- The only likely residual top-level test coverage to migrate before deletion is:
  - the sync-service failure when wired to an async-only boundary adapter
  - any adapter-class parity assertions present in the top-level boundary tests but absent from canonical class-focused coverage
- `admin-api` cannot simply import arbitrary `apps/connectshyft-api/src/...` source as a cleanup shortcut under its current build layout, so the Admin number-mapping dependency must leave the mirror tree through a bounded canonical/shared contract rather than through another local mirror.

## Phase 1: Design

### Dependency Map For Mirror Trees

#### MoneyShyft module tree

Target tree:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`

Direct importer anchors:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
  - imports `../modules/connectshyft/neighbors`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`
  - imports `../modules/connectshyft/identityBoundary`

Discovery and reachability anchors:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/jest.config.js`
  - discovers `src/**/__tests__/**/*.test.ts`
  - ignores module-tree mirror tests under `src/modules/connectshyft/__tests__/`
  - therefore the top-level identity tests are the meaningful MoneyShyft anchors, not the module-tree test directory

Non-blocking verification edge:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
  - verifies the platform-admin console route is not mounted in MoneyShyft
  - does not import the MoneyShyft mirror tree

#### Admin module tree

Target tree:

- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`

Runtime importer chain:

- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`
  - mounts `/api/v1/platform/admin` via `platform-admin`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts`
  - imports `./platform-admin-console`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
  - imports `../../../modules/connectshyft/numberMappings`
  - uses the mirror `numberMappings` service for integrity listing and number-mapping fix actions

Test importer anchors:

- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
  - mocks `../../../../modules/connectshyft/numberMappings`
  - imports the console router
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
  - imports `../modules/connectshyft/neighbors`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`
  - imports `../modules/connectshyft/identityBoundary`

Discovery anchors:

- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/jest.config.js`
  - discovers all top-level `src/**/__tests__/**/*.test.ts`, so the admin identity tests remain live until removed

### Legitimate Coverage Disposition

- Preserve canonical ConnectShyft coverage already present in:
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- The four top-level identity tests under `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__` do not represent MoneyShyft-specific or Admin-specific runtime behavior.
- Those files are stale-owner duplicates of canonical ConnectShyft identity behavior and must not be recreated under MoneyShyft or Admin.
- Before deleting the four top-level Money/Admin identity tests:
  - compare them against canonical ConnectShyft tests
  - move only the missing residual assertions into canonical ConnectShyft tests
  - do not recreate those tests under MoneyShyft or Admin
- Canonical ConnectShyft already covers the auto-merge, shared-contact refusal, unverified-input refusal, ambiguous manual-resolution, idempotency, and adapter-parity contracts exercised by the stale top-level tests.
- The only expected canonical migration is a service-level assertion proving the synchronous neighbor service refuses an async-only identity boundary adapter.
- No blanket port of the top-level MoneyShyft or Admin identity tests is permitted.

### Admin Console Dependency Resolution

- The Admin mirror tree cannot be deleted while `platform-admin-console.ts` imports mirror `numberMappings`.
- The approved non-mirror boundary for this slice is `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/connectshyftNumberMappings.ts`.
- This shared contract owns the minimal surface currently used by Admin platform console:
  - `listMappingsByPhone`
  - `createMapping`
  - `updateMapping`
  - `ConnectShyftNumberMapping`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts` must consume this shared contract instead of `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/numberMappings`.
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api` may also consume the same shared contract, but `admin-api` must not import raw source from `apps/connectshyft-api`.
- The slice must preserve existing Admin console behavior while removing the dependency on `apps/admin-api/src/modules/connectshyft/numberMappings`, and it must not satisfy that requirement by keeping another Admin-local mirror.
- This resolution remains within slice scope because it is the only runtime edge preventing full deletion of the Admin mirror tree.

### Deletion Order

1. Reconfirm the live importer map with fresh scans and line-level evidence.
2. Compare the four top-level identity tests against canonical ConnectShyft coverage.
3. Move any missing legitimate identity assertions into canonical ConnectShyft tests.
4. Delete the two top-level MoneyShyft identity tests once canonical coverage is complete:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`
5. Detach the Admin runtime chain in this order:
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
   - confirm `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts` no longer transitively reach `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`
6. Delete the two top-level Admin identity tests once canonical coverage is complete:
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`
7. Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`.
8. Delete `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`.
9. Reconcile `architecture/LANE_INVENTORY.md` from the final post-delete state.

### Verification Steps

1. Dependency verification
   - prove that no live import, mock, route registration, or test discovery path still reaches either mirror tree
2. Coverage verification
   - prove canonical ConnectShyft retains all legitimate identity assertions needed after cleanup
3. Admin verification
   - prove the Admin platform console still supports its required ConnectShyft administrative outcomes after dependency remediation
4. Build and boundary verification
   - run bounded builds for Admin, MoneyShyft API, and ConnectShyft API
   - run the relevant Jest suites for canonical ConnectShyft and Admin console behavior
   - run `node scripts/enforce-workspace-boundaries.js`
5. Inventory verification
   - prove `architecture/LANE_INVENTORY.md` matches the final state of the removed or blocked mirror trees

## Planned Artifacts

- `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/research.md`
- `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/data-model.md`
- `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/quickstart.md`
- `/Users/jeremiahotis/projects/connectshyft/specs/018-remove-connectshyft-mirrors/contracts/mirror-tree-removal-boundary.md`

## Final Stop Point

Stop after:

- the dependency map is fully proven
- residual legitimate coverage is migrated to canonical ConnectShyft if needed
- mirror-only tests and helpers are removed
- the Admin console no longer depends on the Admin mirror tree
- both module trees are deleted or explicit blocker evidence is documented
- `architecture/LANE_INVENTORY.md` is updated accordingly

Do not continue into:

- RouteShyft changes
- migration-runner work
- new convergence audit work
- broad stale cleanup outside these two module trees and their exact anchors
- unrelated feature or architecture changes
