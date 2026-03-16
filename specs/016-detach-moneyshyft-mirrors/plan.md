# Implementation Plan: Slice 10b - Final MoneyShyft Route-and-Service Mirror Detachment and Removal

**Branch**: `016-detach-moneyshyft-mirrors` | **Date**: 2026-03-16 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/spec.md)
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/spec.md`

## Summary

Slice 10b closes the last retained MoneyShyft API mirrors by proving and detaching every remaining repo dependency that still points at them, then deleting only the mirrors whose blocker graph is fully resolved. The smallest safe path is to treat the work as two bounded closure tracks: first detach the isolated MoneyShyft `auth.ts` mirror from its direct test importer and path-based contract probe, then close the larger ConnectShyft and platform-admin mirror chain by removing or relocating the MoneyShyft-only tests and helpers that still mount `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`, clearing `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, and deleting `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts` only after all route and test anchors are gone.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, pg, Jest, ts-jest, shared entitlement primitive under `libs/platform/src/tenantModuleEntitlements.ts`  
**Storage**: Shared PostgreSQL; no schema or migration changes in this slice  
**Testing**: Jest route and service tests, repository `rg` reference scans, app builds  
**Target Platform**: Monorepo API services for local and CI validation on macOS/Linux shell environments  
**Project Type**: Multi-lane TypeScript web-service monorepo  
**Performance Goals**: No regression to canonical route ownership, shared entitlement behavior, or existing verification flow  
**Constraints**: No RouteShyft work, no migration-runner cutover, no broad tree cleanup, no feature redesign, no deletion without explicit proof, no cross-lane feature imports  
**Scale/Scope**: Four MoneyShyft mirror targets, the listed MoneyShyft mirror tests/helpers, every exact blocker file discovered during proof including wrapper entrypoints and non-import contract anchors, and exact `LANE_INVENTORY.md` row updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. `admin-web` and `admin-api` remain the shell and auth authority; the plan removes only stale MoneyShyft mirrors.
- Lane isolation preserved: PASS. The plan moves surviving assertions to canonical owners or shared primitives only; it does not introduce app-to-app feature imports.
- Routing delegation preserved: PASS. `/api/v1/auth/*` and `/api/v1/platform/admin/*` stay admin-owned, while ConnectShyft route coverage moves to the canonical ConnectShyft API owner.
- Deployment topology preserved: PASS pending explicit Phase 6 validation tasks that confirm Nginx delegation, localhost-only API binding, canonical ports, shared Postgres assumptions, and runbook reproducibility remain unchanged.
- Database ownership preserved: PASS. No migration authority, schema, or production DB ownership changes are included.
- Security boundaries preserved: PASS. No public-port or ingress changes are introduced.
- Workflow compliance: PASS. This plan derives directly from the Slice 10b spec, `architecture/LANE_INVENTORY.md`, and prior reviewed-anchor research.
- Acceptance criteria present: PASS. The plan defines exact dependency proof, deletion order, reclassification steps, and verification order.

## Project Structure

### Documentation (this feature)

```text
/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mirror-detachment-boundary.md
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
│       ├── routes/api/v1/
│       │   └── __tests__/
│       └── services/
├── connectshyft-api/
│   └── src/
│       └── routes/api/v1/
│           └── __tests__/
├── admin-api/
│   └── src/
│       ├── __tests__/
│       ├── api/
│       ├── routes/api/v1/
│       └── services/__tests__/
└── migration-runner/

/Users/jeremiahotis/projects/connectshyft/libs/
└── platform/

/Users/jeremiahotis/projects/connectshyft/architecture/
└── LANE_INVENTORY.md
```

**Structure Decision**: The slice is constrained to MoneyShyft API mirrors, their direct and indirect repo blockers, canonical owner tests that may receive transferred assertions, and the inventory/planning documents that prove file-level deletion safety.

## Phase 0: Research

### Research Focus

1. Confirm the exact direct and indirect blocker graph for each retained MoneyShyft mirror target.
2. Determine which MoneyShyft tests are pure stale-mirror coverage versus carrying assertions that must survive under canonical owners.
3. Define the minimum ordering that permits deletion without breaking retained blockers mid-slice.
4. Define exact inventory row mutations required to prove deletion safety or exact continued blockage.

### Research Decisions To Capture

- Treat test-mounted route mirrors as deletion blockers, even when the route is not mounted live.
- Treat path-based contract evidence as a blocker equal to an import.
- Close the isolated `auth.ts` mirror independently from the larger ConnectShyft and platform-admin mirror chain.
- Delete blocker files only after their dependents are removed, repointed, or explicitly retained with proof.

## Phase 1: Design

### 1. Exact Dependency Map

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

- Inventory posture:
  - lane: `CONNECTSHYFT`
  - actual runtime authority: `unmounted_in_moneyshyft`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Live mount status:
  - not present in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts`
- Direct repo dependents:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- Indirect dependents through the shared helper:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts`
- Wrapper entrypoint dependent:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`
- Blocking condition:
  - route file cannot be deleted until every dependent MoneyShyft test, including the wrapper entrypoint, is either removed or rewritten to mount `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`

- Inventory posture:
  - lane: `ADMIN`
  - actual runtime authority: `non_runtime_test_only`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Live mount status:
  - not present in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts`
  - canonical mount exists in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`
- Direct repo dependents:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`
- Indirect non-import blocker:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts` via `authRoutePath`
- Blocking condition:
  - file cannot be deleted until the contract and envelope assertions point at the canonical admin auth owner or otherwise stop requiring the MoneyShyft path

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`

- Inventory posture:
  - lane: `ADMIN entitlement mirror`
  - actual runtime authority: `unmounted_and_test_only`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Direct repo dependents:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- Indirect dependents:
  - the five provider-registry tests listed above through `connectshyft.provider-registry.test.shared.ts`
- Blocking condition:
  - service cannot be deleted until both route mirrors and all service- or route-mirror tests/helpers stop importing it

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`

- Inventory posture:
  - lane: `ADMIN entitlement mirror`
  - actual runtime authority: `non_runtime_test_only`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Direct dependency:
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- Canonical comparison target:
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts`
- Blocking condition:
  - file cannot be deleted until any still-needed assertion is duplicated or intentionally superseded in the canonical admin test surface

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`

- Inventory posture:
  - lane: `CONNECTSHYFT`
  - actual runtime authority: `non_runtime_test_only`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Direct dependencies:
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- Direct dependents:
  - the five provider-registry tests listed above
- Blocking condition:
  - helper cannot be deleted until all five dependent tests are individually deleted, rewritten, or moved to canonical ConnectShyft coverage

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

- Inventory posture:
  - lane: `CONNECTSHYFT`
  - actual runtime authority: `non_runtime_test_only`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Direct dependencies:
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- Blocking condition:
  - file must either move its surviving assertions to canonical ConnectShyft tests or be deleted as mirror-only coverage before `connectshyft.ts` and `PlatformAdminService.ts` can be deleted

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`

- Inventory posture:
  - lane: `CONNECTSHYFT`
  - actual runtime authority: `non_runtime_test_only`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Direct dependencies:
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- Blocking condition:
  - file must either move its surviving assertions to canonical ConnectShyft tests or be deleted as mirror-only coverage before `connectshyft.ts` and `PlatformAdminService.ts` can be deleted

#### `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`

- Inventory posture:
  - lane: `ADMIN entitlement mirror`
  - actual runtime authority: `unmounted_in_moneyshyft`
  - duplication state: `transitional`
  - recommendation: `converge_first`
- Live mount status:
  - no current importer or route registration found in MoneyShyft
- Direct dependency:
  - imports `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- Blocking condition:
  - route can be deleted once repo scans confirm no hidden importer or test still requires it; it is otherwise a pure blocker on service deletion

### 2. Minimal Safe Implementation Sequence

1. Reconfirm the current blocker graph with fresh `rg` scans and record line-level evidence in the implementation notes.
2. Close the isolated auth mirror track first:
   - repoint or replace assertions in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`
   - repoint or replace the MoneyShyft auth path evidence in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`
   - delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
3. Remove the standalone platform-admin blocker:
   - confirm no remaining importer for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
   - delete that route mirror
4. Review and close the provider-registry helper chain:
   - inspect each of the five dependent provider-registry tests
   - inspect `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts` as the wrapper entrypoint for that family
   - move any surviving assertions to canonical ConnectShyft tests or rewrite them to mount canonical ConnectShyft routes
   - delete the dependent MoneyShyft provider-registry tests that only validate stale mirror behavior
   - delete the wrapper entrypoint once the focused provider-registry files are removed or intentionally retained with proof
   - delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
5. Review and close the two direct route-mirror tests:
   - move surviving assertions from `connectshyft.neighbors.test.ts` and `connectshyft.identity-match.test.ts` to canonical ConnectShyft coverage if still needed
   - delete the MoneyShyft mirror tests
6. Review and close the MoneyShyft service mirror test:
   - compare `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts` against `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts`
   - move or duplicate any surviving assertion into the canonical admin owner
   - delete the MoneyShyft service mirror test
7. Delete the now-unblocked route mirror:
   - delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
8. Delete the now-unblocked service mirror:
   - delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
9. Update `architecture/LANE_INVENTORY.md` from the final post-delete state, adding exact blocker rows wherever broad rows were previously too coarse.
10. Stop immediately if any step reveals a surviving blocker that cannot be resolved within these exact files; record the blocker and do not widen scope.

### 3. Coverage Transfer Decision Matrix

1. Migrate to canonical ConnectShyft coverage only when the surviving assertion exercises live `/api/v1/connectshyft` behavior that still belongs to `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
2. Migrate to canonical admin coverage only when the surviving assertion exercises auth envelope behavior or platform-admin service behavior that belongs to `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`.
3. Delete outright when the assertion only proves stale MoneyShyft mirror wiring, unmounted route behavior, or parity with a mirror that no longer owns runtime traffic.
4. Record the decision per reviewed file in `research.md` before any MoneyShyft mirror test or helper is deleted.

### 4. Reclassification Sequence For Each File

1. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`
   - add or update an exact inventory blocker row if needed
   - note whether coverage moved to canonical admin auth or was removed as MoneyShyft-local harness coverage
2. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`
   - add or update an exact inventory blocker row if needed
   - note that MoneyShyft auth path evidence was removed or replaced
3. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
   - transition from `transitional` + `converge_first` to deleted stale posture only after both blockers are closed
4. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
   - transition from `transitional` + `converge_first` to deleted stale posture once scans confirm no importer remains
5. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
   - add or update an exact inventory row and mark it as deleted stale or retained with named blocker
6. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
   - add or update an exact inventory row and mark it as deleted stale or retained with named blocker
7. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts`
   - add or update an exact inventory row and mark it as deleted stale or retained with named blocker
8. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts`
   - add or update an exact inventory row and mark it as deleted stale or retained with named blocker
9. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts`
   - add or update an exact inventory row and mark it as deleted stale or retained with named blocker
10. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`
   - add or update an exact inventory row and mark it as deleted stale or retained with named blocker
11. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
   - add or update an exact inventory row and mark it as deleted stale or retained with named blocker
12. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
   - update from retained mirror test to deleted stale or retained with exact blocker
13. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
   - update from retained mirror test to deleted stale or retained with exact blocker
14. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
   - update from retained mirror test to deleted stale or retained with exact blocker
15. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
   - transition from `transitional` + `converge_first` to deleted stale posture only after all test-mounted blockers are gone
16. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
   - transition from `transitional` + `converge_first` to deleted stale posture only after both route blockers and all test/helper blockers are gone

### 5. Exact Deletion Order

1. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
   - only after `apiEnvelopeContract.test.ts` and `platform-contracts.ts` no longer depend on it
2. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
   - only after confirming it has no surviving importer or test role
3. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
   - only after its surviving assertions are moved or proven stale
4. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
   - only after its surviving assertions are moved or proven stale
5. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts`
   - only after its surviving assertions are moved or proven stale
6. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts`
   - only after its surviving assertions are moved or proven stale
7. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts`
   - only after its surviving assertions are moved or proven stale
8. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`
   - only after the five focused provider-registry files are removed or explicitly retained with proof
9. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
   - only after all focused provider-registry dependents and the wrapper entrypoint are closed
10. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
11. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
12. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
13. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
14. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`

Deletion order rule:
- never delete a provider before all reviewed dependents are removed or repointed
- never delete a mirror route before all test mounts of that route are removed or repointed
- never delete the service mirror before every route, helper, and test importer is closed

### 6. Verification Order

1. Pre-change inventory verification:
   - confirm the current `LANE_INVENTORY.md` rows still match the repo
2. Pre-change reference scan:
   - run exact repo scans for each target and blocker file
3. Canonical coverage verification:
   - confirm every moved assertion now executes through `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` or `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/auth.ts`
4. Post-edit reference scan:
   - confirm no surviving import, helper chain, or file-path contract reference still targets a deleted MoneyShyft mirror
5. Build verification:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`
   - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api` whenever canonical coverage or platform-contract checks change
6. Targeted test verification:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/auth.refresh.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/platform-admin.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.route-ownership.test.ts`
   - every updated canonical ConnectShyft provider-registry, neighbors, and identity-match test file
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/apiEnvelopeContract.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts` when service assertions move there
7. Final inventory verification:
   - confirm every reviewed exact file row matches final repository state and blocker notes
8. Topology and runbook verification:
   - confirm host Nginx routing delegation remains unchanged
   - confirm API binding remains localhost-only on canonical ports
   - confirm shared Postgres connectivity assumptions remain unchanged
   - confirm the deployment runbook remains reproducible with no slice-specific manual adjustments
9. Scope guard verification:
   - confirm no RouteShyft, migration-runner, or broad tree cleanup changes were introduced

### 7. Explicit Stop Point

Stop only when one of these two states is true for every targeted MoneyShyft mirror:

1. the mirror is deleted and all direct and indirect blocker evidence is cleared, or
2. the mirror remains in place and the exact unresolved blocker is documented in both the implementation notes and `LANE_INVENTORY.md`

Do not stop at:

- "looks unused"
- "not mounted live"
- "only tests import it"
- tree-level assumptions based on sibling files

Do not continue into:

- RouteShyft work
- migration-runner cutover
- broad directory deletion
- unrelated stale tree cleanup
- feature redesign

## Phase 1 Outputs

- `research.md`: decisions for blocker treatment, canonical coverage movement, and deletion ordering
- `data-model.md`: mirror target, blocker edge, coverage disposition, and inventory mutation model
- `contracts/mirror-detachment-boundary.md`: exact allowed mutation and deletion boundary for Slice 10b
- `quickstart.md`: ordered execution and verification runbook for implementation

## Post-Design Constitution Check

- Platform shell authority preserved: PASS
- Lane isolation preserved: PASS
- Routing delegation preserved: PASS
- Deployment topology preserved: PASS pending explicit Phase 6 validation against Nginx delegation, localhost-only bindings, canonical ports, shared Postgres assumptions, and runbook reproducibility
- Database ownership preserved: PASS
- Security boundaries preserved: PASS
- Workflow compliance: PASS
- Acceptance criteria present: PASS

## Complexity Tracking

No constitution violations or justified exceptions are required for this slice if the tasks retain the explicit topology and runbook validation work.
