# Implementation Plan: Final Lane Convergence Closure Audit

**Branch**: `017-lane-closure-audit` | **Date**: 2026-03-16 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/spec.md)  
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/017-lane-closure-audit/spec.md`

## Summary

Run a final inventory-backed closure audit for ConnectShyft, MoneyShyft, and Admin by reconciling the remaining non-final inventory rows against actual repository state, checking whether any stale directory-level mirror trees and cross-lane runtime/test/import paths still exist, and then producing explicit lane-by-lane close / cleanup / blocked decisions. The audit stops before RouteShyft and migration-runner cutover work.

## Technical Context

**Language/Version**: Markdown planning artifacts for a TypeScript/Vue/Express monorepo on Node.js >=20  
**Primary Dependencies**: `rg`, `diff`, repository boundary script `node scripts/enforce-workspace-boundaries.js`, route ownership script `bash scripts/verify-connectshyft-route-ownership.sh`, app-local `npm run build` commands  
**Storage**: N/A for new persisted data; audit uses repository files and inventory records as evidence  
**Testing**: Repository search commands, boundary scripts, route-ownership checks, and bounded app build checks  
**Target Platform**: Monorepo documentation and verification workflow for macOS/Linux development environments  
**Project Type**: Monorepo governance audit and planning slice  
**Performance Goals**: Complete the closure decision in one bounded audit pass over the remaining in-scope non-final rows  
**Constraints**: Must use `architecture/LANE_INVENTORY.md` as primary authority; no RouteShyft work; no migration-runner production cutover; no new feature work; no broad refactors; file-level evidence overrides broad tree assumptions  
**Scale/Scope**: 6 in-scope non-final inventory rows, 1 explicit out-of-scope migration authority row, 3 lane closure decisions, and 1 repository-level completion decision

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. The audit does not alter `admin-web` or `admin-api`; it verifies their ownership boundaries.
- Lane isolation preserved: PASS. The audit explicitly checks for remaining cross-lane runtime, test, helper, and import drift without introducing new coupling.
- Routing delegation preserved: PASS. The plan includes direct inspection of `apps/admin-api/src/api/registerRoutes.ts`, `apps/moneyshyft-api/src/api/registerRoutes.ts`, `apps/connectshyft-api/src/app.ts`, and web routers plus `bash scripts/verify-connectshyft-route-ownership.sh`.
- Deployment topology preserved: PASS contingent on explicit Nginx routing, API binding/port, shared Postgres topology, and deployment runbook verification tasks in the task set.
- Database ownership preserved: PASS. The audit does not change migration ownership and treats the `apps/admin-api migration execution paths` row only as an explicit out-of-scope stop-boundary check.
- Security boundaries preserved: PASS. The plan includes `node scripts/enforce-workspace-boundaries.js` and routing checks to verify boundary drift rather than introduce it.
- Workflow compliance: PASS. The plan is derived from the approved spec and produces the planning artifacts required for later tasks.
- Acceptance criteria present: PASS. The plan defines exact rows to inspect, exact commands to run, decision criteria, and an explicit stop point before migration-runner work.

**Post-Design Re-check**: PASS contingent on the same explicit topology and runbook verification tasks being present in the task set. Research, data model, quickstart, and contract artifacts stay within the same audit-only boundary and do not require a constitution exception.

## Project Structure

### Documentation (this feature)

```text
specs/017-lane-closure-audit/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── closure-audit-decision-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
architecture/
├── LANE_AUTHORITY.md
└── LANE_INVENTORY.md

apps/
├── moneyshyft-api/
├── moneyshyft-web/
├── connectshyft-api/
├── connectshyft-web/
├── admin-api/
└── admin-web/

scripts/
├── enforce-workspace-boundaries.js
└── verify-connectshyft-route-ownership.sh

tests/
└── platform and shared verification suites
```

**Structure Decision**: This is a documentation-and-verification planning slice. The primary outputs live under `specs/017-lane-closure-audit`, while evidence is gathered from `architecture/`, the six in-scope application directories, and the existing repository boundary scripts.

## Complexity Tracking

No constitution violations or exception requests are required for this planning slice.

## Exact Closure-Check Plan

### Phase 0: Inventory Surface And Research

#### Exact rows to inspect

In-scope closure rows:

1. `apps/moneyshyft-api/src/modules/connectshyft`
2. `apps/moneyshyft-api/src/modules/connectshyft/__tests__`
3. `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts except route-ownership`
4. `apps/admin-api/src/modules/connectshyft`
5. `apps/admin-api/src/modules/connectshyft/__tests__`
6. `apps/moneyshyft-web/src/router/index.ts \`/admin/*\``

Explicit out-of-scope stop-boundary row:

7. `apps/admin-api migration execution paths`

#### Exact supporting paths to inspect

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/router/index.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/router/index.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/utils/adminAppUrl.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/__tests__`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/**`

#### Research outputs

- confirm which in-scope non-final rows remain after Slice 10b
- confirm whether remaining directory-level mirror trees are identical, diverged, unmounted, test-only, or still indirectly anchored
- confirm whether the MoneyShyft `/admin/*` row is functionally already closed as redirect-only or still misleadingly transitional
- confirm whether MoneyShyft can be marked complete only after proving `apps/moneyshyft-api/src/modules/connectshyft` and its importer tests are dead-stale or still active
- confirm whether Admin can be marked complete only after proving `apps/admin-api/src/modules/connectshyft` and its importer route/tests are dead-stale or still active
- define the exact threshold for `resolved`, `small cleanup`, and `blocked`

### Phase 1: Audit Design And Evidence Contract

#### Verification method per concern

1. **Inventory posture verification**
   - Compare non-final inventory rows to current repository state and supporting path evidence.

2. **Directory-level mirror tree verification**
   - Prove whether the trees still exist.
   - Prove whether they are imported by runtime files, unmounted route files, or tests only.
   - Prove whether they are identical or diverged relative to canonical ConnectShyft.
   - Do not mark a lane complete while a divergent in-scope mirror tree still has active importers.

3. **Runtime boundary verification**
   - Verify current API route registration ownership.
   - Verify current web route ownership and redirect delegation.
   - Verify there is no live mount of ConnectShyft runtime in MoneyShyft or Admin.
   - Treat redirect-only delegation without local mirror views as closure-compatible rather than automatically transitional.

4. **Cross-lane import/test/helper verification**
   - Run workspace-boundary tooling.
   - Run targeted importer scans for remaining stale module trees and helper paths.
   - Distinguish stale local tests from actual cross-app imports.

5. **Closure decision contract**
   - Ensure final output contains the 3 lane statuses, the exact loose ends list, and the one repository-level completion decision.
   - Use the explicit decision matrix below rather than assuming closure is the default outcome.

### Phase 2: Closure Decision Execution Plan

#### Exact commands and searches to run

Inventory rows:

```bash
rg -n "converge_first|transitional|unknown|mirrored_identical|mirrored_diverged" architecture/LANE_INVENTORY.md
```

Directory existence:

```bash
rg --files apps/moneyshyft-api/src/modules/connectshyft apps/admin-api/src/modules/connectshyft
test -d apps/moneyshyft-web/src/views/Admin && echo exists || echo missing
rg --files apps/moneyshyft-web/src | rg "/Admin|admin"
```

Importer scans for remaining trees:

```bash
rg -n "modules/connectshyft" apps/moneyshyft-api/src --glob '!**/node_modules/**'
rg -n "modules/connectshyft" apps/admin-api/src --glob '!**/node_modules/**'
```

Cross-app boundary drift:

```bash
node scripts/enforce-workspace-boundaries.js
rg -n "from ['\\\"](\\.\\./|\\.\\/|@?/)?apps/(moneyshyft|connectshyft|admin)-api|require\\(['\\\"].*apps/(moneyshyft|connectshyft|admin)-api" apps libs tests --glob '!**/node_modules/**'
```

Runtime and router ownership:

```bash
bash scripts/verify-connectshyft-route-ownership.sh
rg -n "use\\('/api/v1/auth|use\\('/api/v1/connectshyft|use\\('/api/v1/platform|use\\('/api/v1/platform/admin" apps/moneyshyft-api/src apps/admin-api/src apps/connectshyft-api/src
rg -n "path:\\s*'/admin|redirect.*'/admin|/app/connectshyft" apps/moneyshyft-web/src apps/admin-web/src apps/connectshyft-web/src
```

Topology and runbook validation:

```bash
rg -n "listen|server_name|location /api|location /admin|location /app/connectshyft" nginx/nginx.conf
rg -n "3000|3001|3002|5173|5174|5175|PORT|HOST" docker-compose.example.yml apps/*/package.json apps/*/vite.config.* apps/*/src apps/*/Dockerfile* --glob '!**/node_modules/**'
rg -n "postgres|DATABASE_URL|PGHOST|shared" docs/PRODUCTION_DEPLOYMENT_GUIDE.md docker-compose.example.yml apps/*/.env.example apps/*/src shared --glob '!**/node_modules/**'
rg -n "deploy|build|migrate|nginx|docker compose" docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

Tree divergence against canonical ConnectShyft:

```bash
diff -rq apps/moneyshyft-api/src/modules/connectshyft apps/connectshyft-api/src/modules/connectshyft | head -n 80
diff -rq apps/admin-api/src/modules/connectshyft apps/connectshyft-api/src/modules/connectshyft | head -n 80
```

Build checks:

```bash
cd apps/moneyshyft-api && npm run build
cd apps/connectshyft-api && npm run build
cd apps/admin-api && npm run build
cd apps/moneyshyft-web && npm run build
cd apps/connectshyft-web && npm run build
cd apps/admin-web && npm run build
```

#### Decision criteria

| Decision | Use this only when | Implication |
|----------|--------------------|-------------|
| `resolved and ready to mark closed` | The lane's in-scope non-final rows are already resolved or can be reclassified closed, no live runtime path crosses lane boundaries incorrectly, no divergent in-scope mirror tree remains active through importers, and no misleading broad row still needs follow-up. | Lane convergence is closed for that lane. |
| `small final cleanup still needed` | Runtime ownership is already correct, and the only remaining issues are narrow stale mirror trees, stale tests/importers, or misleading inventory rows removable without RouteShyft work, migration-runner cutover, or redesign. | One bounded cleanup slice remains before the lane can be marked closed. |
| `blocked and needs another slice` | A live runtime or helper/import path still crosses lanes incorrectly, or the remaining ambiguity cannot be closed without broader remediation beyond this audit boundary. | Convergence is not complete and cannot be closed with a tiny follow-up cleanup. |

#### Planned lane-by-lane interpretation

- **ConnectShyft**: complete only if the remaining MoneyShyft/Admin ConnectShyft mirror trees no longer create active ownership ambiguity.
- **MoneyShyft**: complete only if `apps/moneyshyft-api/src/modules/connectshyft`, its importer tests, and the coarse `connectshyft*.test.ts` row are either proven resolved or explicitly reduced to a small cleanup list.
- **Admin**: complete only if `apps/admin-api/src/modules/connectshyft`, `platform-admin-console.ts`, and the importer tests are either proven resolved or explicitly reduced to a small cleanup list.
- **MoneyShyft web `/admin/*`**: should be treated as closure-compatible if the router only redirects and no local admin mirror view tree remains.

## Verification Order

1. Confirm exact non-final rows from the inventory.
2. Confirm remaining in-scope directory trees and whether `apps/moneyshyft-web/src/views/Admin` is gone.
3. Confirm importer state for `apps/moneyshyft-api/src/modules/connectshyft/**`.
4. Confirm importer state for `apps/admin-api/src/modules/connectshyft/**`.
5. Confirm runtime route ownership across the three APIs.
6. Confirm web route ownership and redirect delegation across the three SPAs.
7. Run workspace-boundary enforcement and targeted cross-app import scans.
8. Compare the retained MoneyShyft/Admin module trees to canonical ConnectShyft.
9. Run the topology and deployment-runbook verification checks.
10. Run the six app build checks.
11. Assign the 3 lane statuses and the final repository-level decision.

## Explicit Stop Point Before Migration-Runner Work

The audit must stop after:

- the six in-scope non-final rows are reconciled against repo state
- the migration authority row is noted only as an out-of-scope residual
- ConnectShyft, MoneyShyft, and Admin each receive a final status
- the exact remaining loose ends, if any, are listed
- the final sentence states whether lane convergence is complete apart from migration-runner cutover

The audit must not:

- begin migration-runner production cutover work
- propose RouteShyft remediation
- expand into feature redesign
- widen into broad refactors or unrelated cleanup beyond what is required to make the closure decision
