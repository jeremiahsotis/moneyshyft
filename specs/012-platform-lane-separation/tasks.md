# Tasks: Platform Lane Separation and Canonical Authority Remediation

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/`
**Prerequisites**: `plan.md`, `implementation-plan.md`, `remediation-map.md`, `research.md`, `data-model.md`, `quickstart.md`, and contracts in `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/contracts/`

**Tests**: Build, targeted test, boundary-scan, deployment/proxy validation, and RouteShyft non-regression verification are required after every relevant phase.

**Organization**: The remediation is split into eight reviewable slices so shared-domain normalization lands before ConnectShyft route cutover and stale cleanup stays last.

## Preconditions and Governance Gates

- [ ] T001 Refresh the locked authority baseline in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md`, `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [ ] T002 Produce and approve the migration-ownership governance artifact in `/Users/jeremiahotis/projects/connectshyft/.specify/memory/constitution.md` or an explicit exception record under `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/`
- [ ] T003 Validate localhost-only API binding and canonical port ownership across `/Users/jeremiahotis/projects/connectshyft/docker-compose.production.example.yml`, `/Users/jeremiahotis/projects/connectshyft/nginx/host-managed-subdomains.example.conf`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/Dockerfile.production`
- [ ] T004 Validate Nginx routing and subdomain delegation against `/Users/jeremiahotis/projects/connectshyft/nginx/host-managed-subdomains.example.conf`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/vite.config.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/vite.config.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/vite.config.ts`
- [ ] T005 Validate shared Postgres connectivity and production migration path assumptions in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/knexfile.js`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/knexfile.js`, and `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner/knexfile.js`
- [ ] T006 Validate reproducible deployment and runbook expectations in `/Users/jeremiahotis/projects/connectshyft/PRODUCTION_DEPLOYMENT_GUIDE.md`, `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/Dockerfile.production`, and `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner/Dockerfile`

---

## Phase 1: Shared Infrastructure Extraction - User Story 1 (Priority: P1)

**Goal**: Extract lane-neutral platform primitives into `libs/` before any critical route or module cutover.

**Independent Test**: All three APIs build against `libs/` instead of app-local copies or app-to-app feature imports, and RouteShyft files remain untouched and mounted.

**Depends on**: T001, T003, T004, T005, T006

- [X] T007 [US1] Add `libs/*` workspace support in `/Users/jeremiahotis/projects/connectshyft/pnpm-workspace.yaml`, `/Users/jeremiahotis/projects/connectshyft/nx.json`, and `/Users/jeremiahotis/projects/connectshyft/tsconfig.base.json`
- [X] T008 [P] [US1] Create backend shared package scaffolding in `/Users/jeremiahotis/projects/connectshyft/libs/platform/package.json`, `/Users/jeremiahotis/projects/connectshyft/libs/platform/tsconfig.json`, `/Users/jeremiahotis/projects/connectshyft/libs/http/package.json`, `/Users/jeremiahotis/projects/connectshyft/libs/http/tsconfig.json`, `/Users/jeremiahotis/projects/connectshyft/libs/auth/package.json`, `/Users/jeremiahotis/projects/connectshyft/libs/auth/tsconfig.json`, `/Users/jeremiahotis/projects/connectshyft/libs/db/package.json`, and `/Users/jeremiahotis/projects/connectshyft/libs/db/tsconfig.json`
- [X] T009 [P] [US1] Create frontend shared shell scaffolding in `/Users/jeremiahotis/projects/connectshyft/libs/ui-shell/package.json`, `/Users/jeremiahotis/projects/connectshyft/libs/ui-shell/tsconfig.json`, and `/Users/jeremiahotis/projects/connectshyft/libs/ui-shell/src/index.ts`
- [X] T010 [US1] Extract backend platform primitives from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/platform/**`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/platform/**`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/platform/**`, `/Users/jeremiahotis/projects/connectshyft/apps/*-api/src/middleware/{auth,validate}.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/*-api/src/utils/{jwt,invitationCode}.ts` into `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/**`, `/Users/jeremiahotis/projects/connectshyft/libs/http/src/**`, `/Users/jeremiahotis/projects/connectshyft/libs/auth/src/**`, and `/Users/jeremiahotis/projects/connectshyft/libs/db/src/**`
- [ ] T011 [US1] Split shared versus admin-only validators from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/validators/*.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/validators/*.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/validators/*.ts` into `/Users/jeremiahotis/projects/connectshyft/libs/http/src/validators/**` while keeping admin-only contracts in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/validators/**`
- [X] T012 [US1] Extract only lane-neutral session bootstrap, auth token plumbing, shared access-state primitives, layout scaffolding, and shared API-client helpers from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/services/platformAdmin.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/services/platformAdmin.ts`, and explicitly approved files under `/Users/jeremiahotis/projects/connectshyft/apps/*-web/src/stores/` and `/Users/jeremiahotis/projects/connectshyft/apps/*-web/src/components/layout/**` into `/Users/jeremiahotis/projects/connectshyft/libs/ui-shell/src/**`
- [X] T013 [US1] Repoint imports to `libs/` in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/services/platformAdmin.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/services/platformAdmin.ts`, and the touched app `tsconfig.json` files under `/Users/jeremiahotis/projects/connectshyft/apps/*/`
- [X] T014 [US1] Run Phase 1 boundary and build verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`
- [X] T015 [US1] Run the Phase 1 RouteShyft non-regression check against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/route/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`

---

## Phase 2: Shared Domain and Infrastructure Normalization - User Story 2 (Priority: P1)

**Goal**: Remove `connectshyft-api` dependence on widened repo-root compilation and normalize shared communication code before route cutover.

**Independent Test**: `connectshyft-api` builds without widened `rootDir/include`, repo-root feature reach-through, or local bootstrap shortcuts that would break route ownership moves.

**Depends on**: T014, T015

- [ ] T016 [US2] Normalize shared communication exports in `/Users/jeremiahotis/projects/connectshyft/domains/communication/**` and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/**`
- [ ] T017 [US2] Tighten `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/tsconfig.json` `rootDir` and `include` after shared communication normalization
- [ ] T018 [US2] Repoint `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/{providerRegistry,neighbors,identityBoundary,bridgeSessions,communicationReliability,communicationAuditLog,phoneIdentityContext}.ts` to canonical shared imports
- [ ] T019 [US2] Remove dynamic bootstrap reach-through from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and normalize DB/bootstrap imports through shared or canonical app-owned seams
- [ ] T020 [US2] Run shared-domain normalization verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/tsconfig.json`
- [ ] T021 [US2] Run the Phase 2 RouteShyft non-regression check against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`

---

## Phase 3: Migration Execution Isolation - User Story 3 (Priority: P1)

**Goal**: Make `migration-runner` the canonical production execution path without reactivating lane-local production migration runners.

**Independent Test**: Production migration wiring resolves through `migration-runner`, feature APIs remain blocked from production execution, and RouteShyft still builds and mounts unchanged.

**Depends on**: T002, T020, T021

- [X] T022 [US3] Move canonical migration execution wiring into `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner/package.json`, `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner/knexfile.js`, and `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner/Dockerfile`
- [X] T023 [P] [US3] Repoint migration authority messaging and guardrails in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/scripts/enforceProdMigrationAuthority.js`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/scripts/enforceProdMigrationAuthority.js`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/scripts/enforceProdMigrationAuthority.js`
- [X] T024 [US3] Remove stale lane-local production migration assumptions from `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/package.json`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/package.json`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/knexfile.js`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/knexfile.js`
- [X] T025 [US3] Move shared migration packaging support out of `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/scripts/packageSharedMigrations.js` and into a runner-owned or shared helper under `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner/**` or `/Users/jeremiahotis/projects/connectshyft/libs/db/src/**`
- [X] T026 [US3] Lock one production migration artifact format across `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/scripts/packageSharedMigrations.js`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`, and `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner/knexfile.js`
- [X] T027 [US3] Update deploy and runbook references for the migration cutover in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/PRODUCTION_DEPLOYMENT_GUIDE.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md`
- [X] T028 [US3] Run Phase 3 migration and build verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`
- [X] T029 [US3] Run the Phase 3 RouteShyft non-regression check against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`

---

## Phase 4: Admin Canonical Route Ownership - User Story 4 (Priority: P1)

**Goal**: Make Admin the sole owner of admin/auth runtime entrypoints and admin SPA routes before any duplicate cleanup.

**Independent Test**: `admin-api` serves auth and platform-admin endpoints, `moneyshyft-api` no longer mounts those mirrors, `admin-web` owns `/admin/*`, and MoneyShyft login/bootstrap still works against Admin-owned auth.

**Depends on**: T014, T015

- [X] T030 [P] [US4] Remove MoneyShyft-owned admin and auth mounts from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts` and keep canonical ownership in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`
- [X] T031 [P] [US4] Remove MoneyShyft-admin SPA route ownership from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts` and keep `/admin/*` ownership in `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/router/index.ts`
- [X] T032 [US4] Repoint contract evidence away from MoneyShyft file probes in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-contracts.ts`
- [X] T033 [US4] Preserve MoneyShyft login/bootstrap against Admin-owned auth by updating `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/vite.config.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/vite.config.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/stores/auth.ts`, and `/Users/jeremiahotis/projects/connectshyft/libs/ui-shell/src/**`
- [X] T034 [US4] Retire or repoint wrong-lane MoneyShyft admin/auth route tests in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/**` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/{auth*,platform-admin*}.test.ts`
- [X] T035 [US4] Update canonical route ownership records in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md` and `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` for Admin API and Admin Web surfaces
- [X] T036 [US4] Run Phase 4 admin route build and smoke verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web`
- [X] T037 [US4] Run the Phase 4 RouteShyft non-regression check against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`, and `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`

---

## Phase 5: ConnectShyft Canonical Route Ownership - User Story 5 (Priority: P1)

**Goal**: Correct misplaced live ConnectShyft route ownership before any duplicate module cleanup.

**Independent Test**: `/api/v1/connectshyft/*` resolves through `connectshyft-api`, any temporary MoneyShyft shim is transport-only, MoneyShyft no longer owns live ConnectShyft runtime behavior, and RouteShyft remains unchanged.

**Depends on**: T020, T021, T036, T037

- [X] T038 [P] [US5] Merge any still-live ConnectShyft route behavior from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` into `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T039 [US5] Remove the live `/api/v1/connectshyft` mount from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts` and keep the sole canonical mount in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts`
- [ ] T040 [US5] If rollout requires a shim, reduce `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` to a transport-only compatibility layer with no feature logic
- [ ] T041 [US5] Prove the MoneyShyft compatibility shim imports no ConnectShyft feature modules or `PlatformAdminService.ts` by scanning `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- [ ] T042 [US5] Retire or repoint MoneyShyft ConnectShyft route tests in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts`
- [X] T043 [P] [US5] Reconcile ConnectShyft web and proxy ownership in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/src/router/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web/vite.config.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/vite.config.ts`
- [X] T044 [US5] Mark the route cutover state in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md`, `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [X] T045 [US5] Run Phase 5 ConnectShyft route build and smoke verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`
- [X] T046 [US5] Run the Phase 5 RouteShyft non-regression check against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`

---

## Phase 6: ConnectShyft Module Convergence - User Story 6 (Priority: P1)

**Goal**: Finish moving ConnectShyft feature implementation into the canonical backend owner after ingress is corrected.

**Independent Test**: ConnectShyft route behavior is sourced only from `connectshyft-api`, MoneyShyft/Admin no longer need ConnectShyft runtime modules to build, and no app-to-app feature imports remain.

**Depends on**: T045, T046

- [X] T047 [P] [US6] Diff and classify the divergent ConnectShyft trees in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/**`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/**` against `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [ ] T048 [US6] Merge critical runtime modules into `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/**`, including `featureFlags.ts`, `contextAccess.ts`, `numberMappings.ts`, `neighbors.ts`, `escalationConfig.ts`, `threads.ts`, `smsPreferenceOverrides.ts`, `providerRegistry.ts`, `readContracts.ts`, `inboundSms.ts`, `inboundVoice.ts`, `canonicalEvents.ts`, `providerCorrelationMappings.ts`, `bridgeSessions.ts`, `phoneIdentityContext.ts`, `communicationReliability.ts`, and `communicationAuditLog.ts`
- [ ] T049 [US6] Retire or repoint stale Admin ConnectShyft route and module tests in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/connectshyft*.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/__tests__/**`
- [X] T050 [US6] Repoint runtime imports so `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/**` do not import canonical feature logic from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/**` or `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/**`
- [X] T051 [US6] Mark `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/**` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/**` as stale or unmounted in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` without deleting those trees yet
- [X] T052 [US6] Run Phase 6 ConnectShyft module verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`, and `/Users/jeremiahotis/projects/connectshyft/package.json`
- [X] T053 [US6] Run the Phase 6 RouteShyft non-regression check against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/route/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`

---

## Phase 7: RouteShyft Transitional Isolation - User Story 7 (Priority: P2)

**Goal**: Keep RouteShyft explicit, stable, and out of the canonical-lane cleanup path.

**Independent Test**: RouteShyft remains mounted in MoneyShyft, classified as transitional in docs, and is not moved into `libs/` or silently deleted.

**Depends on**: T052, T053

- [X] T054 [US7] Classify MoneyShyft RouteShyft keepers and stale mirrors in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md`, `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [X] T055 [US7] Add explicit transitional boundary markers without moving business logic in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/route/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`
- [X] T056 [P] [US7] Confirm non-Money RouteShyft mirrors are unmounted and classify them as stale in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/route-bridge.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/route/**`, and `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`
- [X] T057 [US7] Run Phase 7 RouteShyft-focused verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web`, and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/contracts/transitional-routeshyft-contract.md`

---

## Phase 8: Stale Duplicate Cleanup - User Story 8 (Priority: P3)

**Goal**: Delete only the mirrors proven dead after canonical owners and transitional boundaries are verified.

**Independent Test**: Canonical routes remain live, stale mirrors are removed without changing RouteShyft behavior, and all lane apps still build in dependency order.

**Depends on**: T028, T036, T045, T052, T057

- [ ] T058 [US8] Delete only inventory-approved `dead_stale` MoneyShyft admin mirrors listed in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/Admin/**` and any now-unmounted admin helpers in `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/stores/**`
- [ ] T059 [P] [US8] Delete only inventory-approved `dead_stale` Admin Web money mirrors listed in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` from `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/**`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/components/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/stores/**`
- [ ] T060 [P] [US8] Delete only inventory-approved `dead_stale` backend ConnectShyft mirrors listed in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` from `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/**`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/connectshyft.ts`
- [ ] T061 [P] [US8] Delete only inventory-approved `dead_stale` backend non-canonical mirrors listed in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md` from `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/accounts.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/budgets.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/transactions.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/route/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/**`
- [ ] T062 [US8] Update final dead-copy status in `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`, `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
- [ ] T063 [US8] Run final cleanup verification from `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/quickstart.md` against `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-web`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web`
- [ ] T064 [US8] Run the final RouteShyft non-regression check against `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/route/**`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`, and `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/contracts/transitional-routeshyft-contract.md`

---

## Dependencies and Safe Move Order

- T001 must land before any code-moving phase so authority and inventory stay locked to the audited plan.
- T002 blocks T022-T028 because migration-runner cutover cannot proceed without constitution alignment or a recorded exception.
- T007-T015 block T016-T021 because shared-lib extraction must land before ConnectShyft shared-domain normalization.
- T016-T021 block T038-T046 because ConnectShyft route cutover cannot rely on widened repo-root compilation or bootstrap shortcuts.
- T030-T037 must complete before T058 removes MoneyShyft admin mirrors.
- T038-T046 must complete before T047-T053 or T060 remove MoneyShyft ConnectShyft ownership artifacts.
- T047-T053 must complete before T060 removes ConnectShyft duplicate module trees.
- T054-T057 must complete before any RouteShyft mirror deletion in T061-T064.

## Explicit Blockers

- Governance blocker: `/Users/jeremiahotis/projects/connectshyft/.specify/memory/constitution.md` still assigns production migration ownership to `admin-api`, so Phase 3 cannot cut over without amendment or recorded exception.
- Workspace blocker: `/Users/jeremiahotis/projects/connectshyft/pnpm-workspace.yaml` currently includes `packages/*` but not `libs/*`, so Phase 1 must wire the workspace before extraction.
- Shared-domain blocker: `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/tsconfig.json` still widens compilation into repo-root communication code and must be normalized before ConnectShyft route cutover.
- Boundary blocker: `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-contracts.ts` still reads MoneyShyft repo paths as evidence and must be corrected during Admin route cutover.
- Convergence blocker: `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft/**`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/**` are already divergent, so Phase 6 is a selective merge, not a rename.
- Test-drift blocker: wrong-lane route tests in MoneyShyft and Admin still assert stale ownership and must be updated as part of cutover slices.
- RouteShyft blocker: `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/route/**`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue` remain live and must not be deleted or moved into `libs/`.

## Parallel Opportunities

- Phase 1: T008 and T009 can run in parallel after T007.
- Phase 3: T023 can run in parallel with T022 after T002 is resolved.
- Phase 4: T030 and T031 can run in parallel once shared auth/bootstrap behavior is confirmed.
- Phase 5: T038 and T043 can run in parallel before T039 is finalized.
- Phase 7: T056 can run in parallel with T054 after Phase 6 verification is complete.
- Phase 8: T059, T060, and T061 can run in parallel after the preceding proof tasks complete.

## Implementation Strategy

### MVP First

1. Complete T001-T015.
2. Validate shared-lib extraction before any route cutover.
3. Stop and confirm boundary scans plus RouteShyft non-regression.

### Incremental Delivery

1. Shared infrastructure extraction
2. Shared domain and infrastructure normalization
3. Migration execution isolation
4. Admin canonical route ownership
5. ConnectShyft canonical route ownership
6. ConnectShyft module convergence
7. RouteShyft transitional isolation
8. Stale duplicate cleanup

### Build Verification Order

1. build the canonical owner changed in the phase
2. run the narrowest affected tests
3. build dependent APIs
4. build affected SPAs
5. run RouteShyft non-regression
6. run deployment/proxy validation when routing, auth, or migration changed

Concrete order:
1. `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`
2. `/Users/jeremiahotis/projects/connectshyft/apps/admin-api`
3. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`
4. `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web`
5. `/Users/jeremiahotis/projects/connectshyft/apps/admin-web`
6. `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web`
7. `/Users/jeremiahotis/projects/connectshyft/apps/migration-runner` when the phase touches migration execution
