# Phased Implementation Plan: Platform Lane Separation

Status: working implementation plan  
Spec source used: `specs/012-platform-lane-separation/spec.md`  
Depends on: `architecture/LANE_AUTHORITY.md`, `architecture/LANE_INVENTORY.md`, `specs/012-platform-lane-separation/remediation-map.md`

## Phase order

1. shared infrastructure extraction
2. migration execution isolation
3. admin canonical route ownership
4. ConnectShyft canonical route ownership
5. ConnectShyft module convergence
6. RouteShyft transitional isolation
7. stale duplicate cleanup

This order is intentional:

- shared libs land before cross-lane route/module moves
- migration execution is isolated before final route authority cleanup
- canonical route ownership changes land before duplicate deletion
- RouteShyft stays transitional throughout
- highest runtime priority is correcting misplaced ConnectShyft ownership

## Phase 1: Shared Infrastructure Extraction

### Goal

Create the shared `libs/` layer needed to stop copying API infrastructure across `moneyshyft-api`, `admin-api`, and `connectshyft-api`.

### Exact file and function boundaries

| Boundary | Current file/function | Planned phase action |
| --- | --- | --- |
| Platform middleware chain | `apps/moneyshyft-api/src/api/registerRoutes.ts`: `PLATFORM_MIDDLEWARE_CHAIN`, `registerPlatformMiddleware` | Repoint to shared middleware exports instead of app-local files. |
| Platform middleware chain | `apps/admin-api/src/api/registerRoutes.ts`: `PLATFORM_MIDDLEWARE_CHAIN`, `registerPlatformMiddleware` | Repoint to shared middleware exports. |
| Platform middleware use | `apps/connectshyft-api/src/app.ts`: `csrfProtection` usage and surrounding platform middleware imports | Repoint to shared middleware/platform exports. |
| Shared platform primitives | `apps/*-api/src/platform/envelopes/response.ts` | Move to shared platform lib. |
| Shared platform primitives | `apps/*-api/src/platform/rbac/capabilities.ts` | Move to shared platform lib. |
| Shared platform primitives | `apps/*-api/src/platform/tenancy/orgUnitAccess.ts`, `requestContext.ts`, `tenantScope.ts` | Move to shared platform lib. |
| Shared platform primitives | `apps/*-api/src/platform/mutations/executePlatformMutation.ts` | Move to shared platform lib. |
| Shared platform primitives | `apps/*-api/src/platform/sessions/PlatformSessionStore.ts` | Move to shared platform lib. |
| Shared platform primitives | `apps/*-api/src/platform/time/timezoneService.ts` | Move to shared platform lib. |
| HTTP middleware | `apps/*-api/src/middleware/auth.ts`, `validate.ts` | Move to shared HTTP lib. |
| Shared request validators | `apps/*-api/src/validators/*.ts` | Move shared contracts first; split admin-only auth validator behavior from lane-neutral validators. |
| Auth utility helpers | `apps/*-api/src/utils/jwt.ts`, `invitationCode.ts` | Move to shared auth/platform utility lib. |
| DB bootstrap primitives | `apps/*-api/src/config/knex.ts` and any shared connection helpers | Extract shared DB primitive helpers; leave app knexfiles app-owned. |

### Patch shape

- Add `libs/` packages for shared API platform concerns.
- Replace app-local imports with shared imports.
- Do not move feature business logic from `services/`, `modules/connectshyft`, or `modules/route` in this phase.

### Regression checkpoints

1. `moneyshyft-api`, `admin-api`, and `connectshyft-api` still boot and register the same routes as before.
2. Auth cookies, response envelopes, tenancy guards, RBAC checks, and idempotent platform mutations behave exactly as before.
3. No app imports feature logic from another app.

### Build verification for this phase

1. `apps/moneyshyft-api`: `npm run build`
2. `apps/admin-api`: `npm run build`
3. `apps/connectshyft-api`: `npm run build`
4. Run targeted Jest suites for platform middleware, auth, and any changed validators in each touched API

## Phase 2: Migration Execution Isolation

### Goal

Move canonical migration execution authority to `migration-runner` without collapsing shared schema authority or reintroducing lane-local migration execution.

### Exact file and function boundaries

| Boundary | Current file/function | Planned phase action |
| --- | --- | --- |
| Active prod runner scripts | `apps/admin-api/package.json`: `build`, `migrate:latest:prod`, `migrate:rollback:prod`, `seed:run:prod` | Remove long-term runner ownership from Admin and keep only transitional compatibility as needed during cutover. |
| Active prod runner knex config | `apps/admin-api/knexfile.js`: production `migrations.directory` | Stop treating `admin-api` as the canonical execution surface after cutover. |
| Shared migration packaging | `apps/admin-api/scripts/packageSharedMigrations.js` | Move shared migration packaging/execution support toward `migration-runner` ownership or a shared lib used by it. |
| Feature API prod migration guards | `apps/moneyshyft-api/scripts/enforceProdMigrationAuthority.js` | Repoint message and guardrail to `migration-runner`. |
| Feature API prod migration guards | `apps/connectshyft-api/scripts/enforceProdMigrationAuthority.js` | Repoint message and guardrail to `migration-runner`. |
| Feature API prod knex config | `apps/moneyshyft-api/knexfile.js`: `blockLaneProdMigrationExecution`, production `migrations.directory` | Remove stale lane-local production migration assumptions while keeping execution blocked. |
| Feature API prod knex config | `apps/connectshyft-api/knexfile.js`: `blockLaneProdMigrationExecution`, production `migrations.directory` | Same as MoneyShyft. |
| Canonical runner script | `apps/migration-runner/package.json`: `migrate:latest` | Make this the only canonical production migration entrypoint. |
| Canonical runner config | `apps/migration-runner/knexfile.js`: `ensureSharedMigrationDirectory`, `createProductionConfig` | Keep shared migrations as the only authoritative execution source. |

### Patch shape

- Keep `shared/database/migrations` authoritative.
- Move execution authority to `apps/migration-runner`.
- Keep feature APIs blocked from production migrations.
- Update deploy/runbook references only after runner wiring is complete.

### Regression checkpoints

1. Only `migration-runner` is authorized to execute production migrations.
2. `moneyshyft-api` and `connectshyft-api` still hard-fail production migration attempts.
3. Shared migrations remain the only production schema source.
4. Admin runtime API continues to build and run without owning migration execution.

### Build verification for this phase

1. `apps/migration-runner`: dependency install plus `npm run migrate:latest -- --help` or equivalent dry wiring check
2. `apps/admin-api`: `npm run build`
3. `apps/moneyshyft-api`: `npm run build`
4. `apps/connectshyft-api`: `npm run build`
5. Container/image verification for `migration-runner` layout before any deploy-path cutover

## Phase 3: Admin Canonical Route Ownership

### Goal

Make Admin the sole owner of admin/auth runtime entrypoints and admin SPA routes.

### Exact file and function boundaries

| Boundary | Current file/function | Planned phase action |
| --- | --- | --- |
| Money API route list | `apps/moneyshyft-api/src/api/registerRoutes.ts`: `V1_ROUTE_REGISTRATIONS` | Remove `/api/v1/platform`, `/api/v1/platform/admin`, and `/api/v1/auth` registrations from MoneyShyft. |
| Money API entitlement wrapper | `apps/moneyshyft-api/src/api/registerRoutes.ts`: `applyRouteWithOptionalMoneyShyftGuard` | Ensure only Money-owned runtime paths remain guarded here after admin/auth removal. |
| Canonical admin route list | `apps/admin-api/src/api/registerRoutes.ts`: `V1_ROUTE_REGISTRATIONS` | Keep as sole owner of `/api/v1/platform`, `/api/v1/platform/admin`, and `/api/v1/auth`. |
| Money web router | `apps/moneyshyft-web/src/router/index.ts`: admin route records for `/admin/system` and `/admin/tenant` | Remove admin routes from MoneyShyft SPA. |
| Admin web router | `apps/admin-web/src/router/index.ts`: admin route records | Keep as sole owner of admin web surfaces. |
| Money dev proxy boundary | `apps/moneyshyft-web/vite.config.ts` | Keep auth/admin API proxy only if MoneyShyft still legitimately needs auth bootstrap against Admin; do not proxy admin UI ownership through MoneyShyft routes. |
| Cross-lane evidence probe | `apps/admin-api/src/routes/api/v1/platform-contracts.ts`: `evaluateKernelReadinessGlobalEmailUniquenessContract` | Replace repo-path probes into `apps/moneyshyft-api/*` with shared or canonical admin-owned evidence sources. |

### Patch shape

- Remove wrong-lane admin/auth route ownership from MoneyShyft.
- Preserve login/bootstrap behavior where the MoneyShyft SPA still authenticates against Admin-owned auth endpoints.
- Do not delete old view/service files yet; route ownership changes come first.

### Regression checkpoints

1. `admin-api` still serves auth and platform-admin endpoints.
2. `moneyshyft-api` no longer mounts admin/auth mirrors.
3. `admin-web` serves all admin pages.
4. MoneyShyft login/bootstrap still succeeds through Admin-owned auth.

### Build verification for this phase

1. `apps/admin-api`: `npm run build`
2. `apps/admin-web`: `npm run build`
3. `apps/moneyshyft-api`: `npm run build`
4. `apps/moneyshyft-web`: `npm run build`
5. Targeted route tests for admin/auth on `admin-api`

## Phase 4: ConnectShyft Canonical Route Ownership

### Goal

Correct misplaced live ConnectShyft route ownership before any duplicate cleanup.

### Exact file and function boundaries

| Boundary | Current file/function | Planned phase action |
| --- | --- | --- |
| Money API route list | `apps/moneyshyft-api/src/api/registerRoutes.ts`: `V1_ROUTE_REGISTRATIONS` | Remove `/api/v1/connectshyft` from MoneyShyft after cutover. |
| Money ConnectShyft route entrypoint | `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` | Replace with a temporary compatibility shim only if rollout needs one; otherwise retire after cutover. |
| Canonical ConnectShyft route owner | `apps/connectshyft-api/src/app.ts`: `app.use('/api/v1/connectshyft', connectShyftRouter)` | Keep as the only live feature route mount. |
| Canonical ConnectShyft route logic | `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` | Merge remaining live route behavior here before removing MoneyShyft ownership. |
| ConnectShyft web router | `apps/connectshyft-web/src/router/index.ts` | Keep as sole UI owner for ConnectShyft inbox/thread/settings routes. |

### Patch shape

- Route ingress moves first.
- MoneyShyft may keep only a thin compatibility layer during rollout.
- No stale file deletion yet.

### Regression checkpoints

1. `/api/v1/connectshyft` resolves to `connectshyft-api` as the live owner.
2. MoneyShyft no longer owns ConnectShyft runtime behavior.
3. ConnectShyft web flows still work end to end against the canonical API owner.
4. No app-to-app feature imports are introduced to make the cutover work.

### Build verification for this phase

1. `apps/connectshyft-api`: `npm run build`
2. `apps/connectshyft-web`: `npm run build`
3. `apps/moneyshyft-api`: `npm run build`
4. Run targeted ConnectShyft route tests on the canonical API owner first

## Phase 5: ConnectShyft Module Convergence

### Goal

Finish moving ConnectShyft feature implementation into the canonical backend owner after ingress has been corrected.

### Exact file and function boundaries

| Boundary | Current file/function | Planned phase action |
| --- | --- | --- |
| Canonical feature tree | `apps/connectshyft-api/src/modules/connectshyft/**` | Becomes the only maintained ConnectShyft feature module tree. |
| Divergent money mirror | `apps/moneyshyft-api/src/modules/connectshyft/**` | Merge any still-needed runtime behavior into ConnectShyft canonical modules, then stop treating this tree as active authority. |
| Divergent admin mirror | `apps/admin-api/src/modules/connectshyft/**` | Merge any still-needed logic into ConnectShyft canonical modules, then retire later as stale. |
| Canonical route logic | `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` | Point all feature behavior at canonical module exports only. |
| ConnectShyft-specific shared domain | `domains/communication/**` | Preserve as shared domain dependency; do not move feature logic back out of ConnectShyft. |

### Must-cover ConnectShyft module boundaries

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

### Regression checkpoints

1. ConnectShyft route behavior is sourced only from `connectshyft-api`.
2. Phone identity, bridge-session, webhook, thread, escalation, and dispatch flows all still pass.
3. MoneyShyft and Admin no longer need ConnectShyft runtime modules to build.

### Build verification for this phase

1. `apps/connectshyft-api`: `npm run build`
2. Canonical ConnectShyft Jest suite
3. `apps/moneyshyft-api`: `npm run build`
4. `apps/admin-api`: `npm run build`

## Phase 6: RouteShyft Transitional Isolation

### Goal

Keep RouteShyft explicit and stable without folding it into the canonical lane rewrite.

### Exact file and function boundaries

| Boundary | Current file/function | Planned phase action |
| --- | --- | --- |
| Money RouteShyft route | `apps/moneyshyft-api/src/routes/api/v1/route.ts` | Keep mounted and classify as transitional. |
| Money RouteShyft route | `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts` | Keep mounted and classify as transitional. |
| Money RouteShyft module tree | `apps/moneyshyft-api/src/modules/route/**` | Keep intact; only isolate/document explicit boundaries in this phase. |
| Money RouteShyft web view | `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue` | Keep mounted as transitional. |
| Stale non-canonical mirrors | `apps/admin-api/src/modules/route/**`, `apps/admin-api/src/routes/api/v1/route*.ts` | Mark as stale mirrors; do not treat as alternate owners. |

### Regression checkpoints

1. RouteShyft behavior is unchanged.
2. No RouteShyft code is moved into `libs/` just to avoid ownership decisions.
3. RouteShyft remains explicit in inventory and docs.

### Build verification for this phase

1. `apps/moneyshyft-api`: `npm run build`
2. `apps/moneyshyft-web`: `npm run build`
3. Any RouteShyft route/module tests

## Phase 7: Stale Duplicate Cleanup

### Goal

Delete source mirrors only after canonical owners are live and verified.

### Exact file and function boundaries

| Boundary | Current file/function | Planned phase action |
| --- | --- | --- |
| Money admin UI mirrors | `apps/moneyshyft-web/src/views/Admin/**`, `src/services/platformAdmin.ts`, any now-unused admin-only helpers | Delete after admin route cutover is verified. |
| Admin money route mirrors | `apps/admin-api/src/routes/api/v1/accounts.ts`, `transactions.ts`, `budgets.ts`, `categories.ts`, `goals.ts`, `debts.ts`, `income.ts`, `scenarios.ts`, `tags.ts`, `extra-money.ts`, `recurring-transactions.ts`, `splits.ts`, `settings.ts`, `households.ts`, `assignments.ts` | Delete after MoneyShyft remains the sole money runtime owner. |
| Admin money service mirrors | `apps/admin-api/src/services/AccountService.ts` and other money-domain service files | Delete after no mounted route depends on them. |
| ConnectShyft money service mirrors | `apps/connectshyft-api/src/services/*` money-domain service files | Delete after ConnectShyft builds without them. |
| Admin web money mirrors | `apps/admin-web/src/views/{Accounts,Budget,Dashboard,Debts,Goals,Scenarios,Transactions,Settings}/**`, matching stores/components | Delete after admin-web remains purely admin-routed. |
| Money/administrative ConnectShyft mirrors | any remaining `apps/moneyshyft-api/src/modules/connectshyft/**` or `apps/admin-api/src/modules/connectshyft/**` mirrors | Delete only after ConnectShyft canonical route and module parity are proven. |

### Regression checkpoints

1. Every deleted tree is already runtime-dead.
2. Builds pass for all canonical owners after deletion.
3. No regression test had to be moved back to a stale mirror to keep passing.

### Build verification for this phase

1. `apps/moneyshyft-api`: `npm run build`
2. `apps/admin-api`: `npm run build`
3. `apps/connectshyft-api`: `npm run build`
4. `apps/moneyshyft-web`: `npm run build`
5. `apps/admin-web`: `npm run build`
6. `apps/connectshyft-web`: `npm run build`

## Regression Checkpoint Matrix

| Checkpoint | Earliest phase | Must remain true |
| --- | --- | --- |
| Shared libs do not introduce app-to-app feature imports | Phase 1 | Apps may import from `libs/`, not from other app feature trees. |
| Feature APIs cannot run production migrations | Phase 2 | `moneyshyft-api` and `connectshyft-api` stay blocked. |
| `migration-runner` is the canonical execution surface | Phase 2 | Shared migrations only; no feature-runtime production execution. |
| Admin runtime authority is only Admin-owned | Phase 3 | No MoneyShyft admin/auth route ownership remains. |
| ConnectShyft runtime authority is only Connect-owned | Phase 4 | No MoneyShyft ConnectShyft route ownership remains. |
| ConnectShyft feature logic is only maintained in ConnectShyft-owned modules | Phase 5 | Money/Admin copies are no longer treated as active owners. |
| RouteShyft remains live but transitional | Phase 6 | No deletion or big-bang relocation. |
| Stale cleanup only touches runtime-dead trees | Phase 7 | Canonical owners are already verified before deletion. |

## Build Verification Order

Use this order after each phase to catch owner-boundary regressions early:

1. build the canonical owner changed in the phase
2. build the immediate dependents that still import shared infrastructure touched in the phase
3. run the narrowest affected test suites
4. build the remaining APIs
5. build the remaining SPAs
6. only then do repo-wide cleanup or deletion work

### Recommended concrete order by surface

1. `apps/connectshyft-api`
2. `apps/admin-api`
3. `apps/moneyshyft-api`
4. `apps/connectshyft-web`
5. `apps/admin-web`
6. `apps/moneyshyft-web`
7. `apps/migration-runner` when the phase touches migration execution

Reasoning:

- ConnectShyft is the highest runtime-priority ownership correction.
- Admin is the current auth/platform and transitional migration authority boundary.
- MoneyShyft is the surface most likely to retain stale mirrors during the middle phases.

## Explicit guardrails

- Do not delete RouteShyft in this plan.
- Do not cut directly from duplicated state to cleanup; route ownership must move first.
- Do not use `libs/` to hide business-logic ownership.
- Do not merge the ConnectShyft trees with a blind copy operation; reconcile divergence intentionally.
