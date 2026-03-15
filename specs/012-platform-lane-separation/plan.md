# Implementation Plan: Platform Lane Separation and Canonical Authority Remediation

**Branch**: `011-platform-lane-authority-convergence-audit` | **Date**: 2026-03-15 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/spec.md)
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/spec.md`

**Note**: The planning bootstrap resolved to branch/spec prefix `011`, but this plan intentionally targets the user-requested remediation spec in `012-platform-lane-separation`.

## Summary

Phase platform-lane convergence so shared infrastructure moves into `libs/` first, production migration execution is isolated to `migration-runner`, canonical route ownership is corrected before feature-tree cleanup, ConnectShyft runtime ownership is fixed ahead of lower-risk stale cleanup, and RouteShyft remains explicitly transitional throughout.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20, Vue 3 SFCs  
**Primary Dependencies**: Express, Knex, pg, Jest/ts-jest, Vue 3, Vite, Pinia  
**Storage**: Shared PostgreSQL plus shared migration authority under `shared/database/migrations`  
**Testing**: Jest for APIs and domain modules; app build verification via `npm run build`; route/proxy smoke verification via existing deployment contracts  
**Target Platform**: Host-managed Nginx serving lane SPAs with Dockerized Node APIs on localhost ports 3100/3000/3002 and a one-shot migration runner container  
**Project Type**: Multi-app web platform / monorepo with lane-separated SPAs and APIs  
**Performance Goals**: Preserve existing lane runtime behavior and independent build integrity while converging ownership; no new cross-lane runtime hops for canonical feature execution  
**Constraints**: No big bang rewrite; no blind duplicate deletion; no silent RouteShyft removal; no business-logic dumping into `libs/`; apps may import `libs/` but not other apps for canonical feature logic; highest runtime priority is ConnectShyft ownership correction  
**Scale/Scope**: Seven scoped runtime surfaces (`moneyshyft-api`, `moneyshyft-web`, `connectshyft-api`, `connectshyft-web`, `admin-api`, `admin-web`, `migration-runner`) plus shared domain/infrastructure roots and transitional RouteShyft artifacts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. `admin-web` and `admin-api` remain the shell/auth authority throughout remediation.
- Lane isolation preserved: PASS with planned shared-lib extraction. Canonical feature logic will terminate in the owning app or `libs/`, not another app.
- Routing delegation preserved: PASS. `/api/v1/auth/*` and `/api/v1/platform/admin/*` stay Admin-owned; lane `/api` routes stay lane-owned after cutover.
- Deployment topology preserved: PASS. Host Nginx, static SPAs, Dockerized localhost-only APIs, and canonical ports remain unchanged.
- Database ownership preserved: FAIL under current constitution text. Constitution V still says `admin-api` owns production migrations, while this spec requires canonical migration execution to move to `migration-runner`.
- Security boundaries preserved: PASS. No public API port exposure or direct lane-to-lane runtime dependency is introduced.
- Workflow compliance: PASS. Plan, research, data model, contracts, and quickstart trace directly to the remediation spec.
- Acceptance criteria present: PASS. Admin, MoneyShyft, ConnectShyft, migration-runner, routing, and shared-database checks are included.

**Gate resolution**

- The migration-runner ownership change is justified by the remediation spec and must be treated as a prerequisite governance update before implementation Phase 3 begins.
- No implementation phase may cut production migration authority over to `migration-runner` until either:
  - the constitution is amended to replace `admin-api` with `migration-runner`, or
  - an explicit time-bound exception is approved and recorded.

## Project Structure

### Documentation (this feature)

```text
specs/012-platform-lane-separation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── migration-execution-contract.md
│   ├── routing-authority-contract.md
│   ├── shared-lib-boundary-contract.md
│   └── transitional-routeshyft-contract.md
├── implementation-plan.md
├── remediation-map.md
└── tasks.md                # Not created by this planning step
```

### Source Code (repository root)

```text
apps/
├── admin-api/
├── admin-web/
├── connectshyft-api/
├── connectshyft-web/
├── migration-runner/
├── moneyshyft-api/
└── moneyshyft-web/

architecture/
├── LANE_AUTHORITY.md
└── LANE_INVENTORY.md

domains/
└── communication/

infrastructure/
└── communications/

shared/
└── database/

libs/                      # Target shared location created during convergence
```

**Structure Decision**: This is a phased monorepo convergence effort across existing lane apps. Shared infrastructure is extracted into `libs/`; canonical feature logic remains in the owning app; shared database authority remains under `shared/database/migrations`; RouteShyft stays transitional inside MoneyShyft surfaces.

## Phase Plan

### Phase 0: Authority + Inventory Lock

**Goal**: Freeze authoritative ownership, runtime authority, and transitional classifications before code moves.

**Minimal patch set**

- Update `architecture/LANE_AUTHORITY.md` with locked ownership wording for Admin, ConnectShyft, Migration Runner, Shared, and RouteShyft.
- Expand `architecture/LANE_INVENTORY.md` with concrete rows for:
  - `apps/moneyshyft-api/src/api/registerRoutes.ts`
  - `apps/admin-api/src/api/registerRoutes.ts`
  - `apps/connectshyft-api/src/app.ts`
  - `apps/moneyshyft-api/src/modules/connectshyft/**`
  - `apps/connectshyft-api/src/modules/connectshyft/**`
  - `apps/admin-api/src/modules/connectshyft/**`
  - `apps/moneyshyft-api/src/modules/route/**`
  - `apps/moneyshyft-web/src/router/index.ts`
  - `apps/admin-web/src/router/index.ts`
  - `apps/connectshyft-web/src/router/index.ts`
  - `domains/communication/**`
  - `infrastructure/communications/**`
  - `shared/database/migrations/**`
  - `apps/*-api/package.json` production migration scripts
  - `apps/migration-runner/**`
- Keep `specs/012-platform-lane-separation/remediation-map.md` aligned with the locked inventory.

**Dependency blockers addressed**

- Removes ambiguity about live owner vs stale mirror.
- Marks RouteShyft as explicit `transitional_keep_for_now`.

### Phase 1: Shared Libs Extraction

**Goal**: Create `libs/` for shared infrastructure before route ownership changes or module relocations.

**Exact file/function boundaries**

- Backend platform primitives:
  - `apps/*-api/src/platform/envelopes/response.ts`
  - `apps/*-api/src/platform/rbac/capabilities.ts`
  - `apps/*-api/src/platform/tenancy/{orgUnitAccess,requestContext,tenantScope}.ts`
  - `apps/*-api/src/platform/middleware/{authContext,requestCorrelation,responseEnvelope,tenancyContext,csrfProtection}.ts`
  - `apps/*-api/src/platform/mutations/executePlatformMutation.ts`
  - `apps/*-api/src/platform/time/timezoneService.ts`
- Backend shared utilities:
  - `apps/*-api/src/middleware/{auth,validate}.ts`
  - shared subsets of `apps/*-api/src/validators/*.ts`
  - `apps/*-api/src/utils/{jwt,invitationCode}.ts`
  - shared DB bootstrap primitives under `apps/*-api/src/config/{knex,database}.ts`
  - shared portions of `apps/*-api/src/services/PlatformAdminService.ts`
- Frontend shared admin/platform shell:
  - `apps/moneyshyft-web/src/services/platformAdmin.ts`
  - `apps/admin-web/src/services/platformAdmin.ts`
  - `apps/moneyshyft-web/src/stores/{access,auth}.ts`
  - `apps/admin-web/src/stores/{access,auth}.ts`
  - `apps/moneyshyft-web/src/components/layout/**`
  - `apps/admin-web/src/components/layout/**`

**Out of scope for `libs/` in this phase**

- `apps/*/src/modules/connectshyft/**`
- `apps/*/src/modules/route/**`
- finance/business services under MoneyShyft
- admin-only business operations

### Phase 2: Shared Domain and Infrastructure Normalization

**Goal**: Convert repo-root shared code into canonical shared ownership so ConnectShyft no longer depends on widened app compilation.

**Exact file/function boundaries**

- `domains/communication/index.ts` and all exported submodules
- `infrastructure/communications/index.ts`
- provider implementations under `infrastructure/communications/telnyx/**`
- `apps/connectshyft-api/tsconfig.json` include/rootDir boundaries
- direct imports in:
  - `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/{neighbors,identityBoundary,bridgeSessions,communicationReliability,communicationAuditLog,phoneIdentityContext}.ts`

**Dependency blockers addressed**

- Removes build-time dependence on repo-root non-lib sources.
- Makes ConnectShyft canonical app builds independent of implicit workspace reach-through.

### Phase 3: Migration-Runner Separation

**Goal**: Move canonical production migration execution to `migration-runner` once the governance gate is cleared.

**Exact file/function boundaries**

- Active authority and messaging:
  - `apps/admin-api/package.json`
  - `apps/moneyshyft-api/package.json`
  - `apps/connectshyft-api/package.json`
  - `apps/admin-api/scripts/enforceProdMigrationAuthority.js`
  - `apps/moneyshyft-api/scripts/enforceProdMigrationAuthority.js`
  - `apps/connectshyft-api/scripts/enforceProdMigrationAuthority.js`
- Knex execution surfaces:
  - `apps/admin-api/src/knexfile.ts`
  - `apps/moneyshyft-api/src/knexfile.ts`
  - `apps/connectshyft-api/src/knexfile.ts`
  - `apps/migration-runner/knexfile.js`
- Packaging/deploy support:
  - `apps/admin-api/scripts/packageSharedMigrations.js`
  - `apps/admin-api/Dockerfile.production`
  - `apps/migration-runner/Dockerfile`
  - deployment/runbook references that still instruct production execution from Admin

**Precondition**

- Constitution amendment or approved exception for migration authority ownership.

### Phase 4: Canonical Route Ownership

**Goal**: Repoint live route entrypoints to their canonical lanes before touching stale duplicates.

**Exact file/function boundaries**

- MoneyShyft API route ownership:
  - `apps/moneyshyft-api/src/api/registerRoutes.ts`
  - `V1_ROUTE_REGISTRATIONS`
  - `applyRouteWithOptionalMoneyShyftGuard`
- Canonical admin API owner:
  - `apps/admin-api/src/api/registerRoutes.ts`
- Canonical ConnectShyft API owner:
  - `apps/connectshyft-api/src/app.ts`
  - `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- MoneyShyft web route ownership:
  - `apps/moneyshyft-web/src/router/index.ts`
- Canonical admin/connect web owners:
  - `apps/admin-web/src/router/index.ts`
  - `apps/connectshyft-web/src/router/index.ts`
- Evidence/contract path cleanup:
  - `apps/admin-api/src/routes/api/v1/platform-contracts.ts`

**Priority inside this phase**

1. Remove MoneyShyft-owned admin/auth route entrypoints.
2. Correct misplaced ConnectShyft route ownership.
3. Remove MoneyShyft-owned admin SPA routes.

### Phase 5: Feature Module Relocation

**Goal**: Finish backend ownership convergence after ingress is canonical.

**Exact file/function boundaries**

- Move/merge into canonical ConnectShyft owner:
  - `apps/moneyshyft-api/src/modules/connectshyft/**`
  - `apps/admin-api/src/modules/connectshyft/**`
  - `apps/connectshyft-api/src/modules/connectshyft/**`
- Required canonical ConnectShyft modules:
  - `featureFlags.ts`
  - `contextAccess.ts`
  - `numberMappings.ts`
  - `neighbors.ts`
  - `escalationConfig.ts`
  - `threads.ts`
  - `smsPreferenceOverrides.ts`
  - `providerRegistry.ts`
  - `readContracts.ts`
  - `inboundSms.ts`
  - `inboundVoice.ts`
  - `canonicalEvents.ts`
  - `providerCorrelationMappings.ts`
  - `bridgeSessions.ts`
  - `phoneIdentityContext.ts`
  - `communicationReliability.ts`
  - `communicationAuditLog.ts`

**Notes**

- `connectshyft-api` is the destination, not `admin-api`.
- This is a selective merge, not a blind file move, because the trees have diverged.

### Phase 6: Transitional RouteShyft Isolation

**Goal**: Keep RouteShyft stable and explicit without removing it or normalizing it into the wrong lane.

**Exact file/function boundaries**

- `apps/moneyshyft-api/src/routes/api/v1/route.ts`
- `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`
- `apps/moneyshyft-api/src/modules/route/**`
- `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`
- stale mirrors in `apps/admin-api/src/modules/route/**` and `apps/admin-api/src/routes/api/v1/route*.ts`

**Rules**

- No deletion in this phase.
- No business logic moved into `libs/`.
- Inventory and code comments should keep the subsystem visibly transitional.

### Phase 7: Stale Duplicate Cleanup

**Goal**: Remove dead mirrors only after live authority, imports, and builds are proven.

**Eligible cleanup targets after verification**

- `apps/moneyshyft-api` admin/auth/connect mirrors
- `apps/moneyshyft-web` admin mirrors
- `apps/admin-api` finance and ConnectShyft runtime mirrors
- `apps/admin-web` MoneyShyft runtime mirrors
- `apps/connectshyft-api/src/services/*` MoneyShyft service mirrors
- stale non-canonical RouteShyft mirrors outside MoneyShyft surfaces

## Build Verification Order

1. Shared `libs/` packages and import-boundary validation
2. `apps/migration-runner`
3. `apps/admin-api`
4. `apps/connectshyft-api`
5. `apps/moneyshyft-api`
6. `apps/admin-web`
7. `apps/connectshyft-web`
8. `apps/moneyshyft-web`
9. Focused Jest suites in this order:
   - shared/platform primitives
   - admin auth/platform routes
   - ConnectShyft route and module suites
   - MoneyShyft finance suites
   - RouteShyft transitional suites
10. Proxy/ingress smoke checks against Admin, MoneyShyft, and ConnectShyft routing contracts

## Post-Design Constitution Re-Check

- Platform shell authority preserved: PASS
- Lane isolation preserved: PASS
- Routing delegation preserved: PASS
- Deployment topology preserved: PASS
- Database ownership preserved: FAIL until constitution amendment or approved exception authorizes `migration-runner` as canonical production executor
- Security boundaries preserved: PASS
- Workflow compliance: PASS
- Acceptance criteria present: PASS

**Post-design gate outcome**: Design is complete for planning purposes. Implementation remains blocked from Phase 3 migration-runner cutover until the migration-ownership governance conflict is resolved.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution V currently assigns production migration ownership to `admin-api`, while this remediation assigns canonical execution to `migration-runner` | The feature spec explicitly requires migration execution isolation to `migration-runner` and the current repo already contains a prepared runner app | Leaving production migration authority in `admin-api` would fail the requested target state and preserve the lane/runtime coupling this remediation is meant to remove |
