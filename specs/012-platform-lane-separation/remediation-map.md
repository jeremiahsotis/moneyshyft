# Platform Lane Convergence Remediation Map

Status: working remediation map  
Spec: `specs/012-platform-lane-separation/spec.md`  
Scope: `moneyshyft-api`, `moneyshyft-web`, `connectshyft-api`, `connectshyft-web`, `admin-api`, `admin-web`, `migration-runner`, shared/library extraction targets, and RouteShyft artifacts inside MoneyShyft surfaces

## Evidence baseline

- `apps/moneyshyft-api/src/api/registerRoutes.ts` still mounts MoneyShyft finance/runtime and RouteShyft routes from one app, but no longer mounts admin/auth runtime or `/api/v1/connectshyft`.
- `apps/admin-api/src/api/registerRoutes.ts` mounts only platform/admin/auth runtime routes.
- `apps/connectshyft-api/src/app.ts` mounts only `/api/v1/connectshyft`.
- `apps/moneyshyft-web/src/router/index.ts` no longer mounts admin pages, but still mounts the RouteShyft lifecycle page inside the MoneyShyft SPA as an explicit transitional keeper.
- `apps/admin-web/src/router/index.ts` mounts only admin pages.
- `apps/connectshyft-web/src/router/index.ts` mounts only ConnectShyft pages.
- `apps/admin-api/knexfile.js` plus `apps/admin-api/package.json` still define the current production migration execution path.
- `apps/migration-runner/package.json` plus `apps/migration-runner/knexfile.js` define a future-ready runner that is not yet the active deploy contract.

## Live Wrong-Lane Route Entrypoints

These are the active route entrypoints that are still owned by the wrong lane today.

| Current path owner | Entrypoint(s) | Canonical owner | Why wrong now | Remediation class |
| --- | --- | --- | --- | --- |
| `apps/moneyshyft-api` | `/api/v1/platform`, `/api/v1/platform/admin`, `/api/v1/auth` | `apps/admin-api` | Admin/auth runtime is canonically owned by Admin, but MoneyShyft still mounts mirrored handlers. | repoint and unmount from MoneyShyft |
| `apps/moneyshyft-web` | `/admin/system`, `/admin/tenant` | `apps/admin-web` | Admin UI is canonically owned by Admin, but MoneyShyft still mounts mirrored admin views. | repoint and unmount from MoneyShyft |

## Transitional RouteShyft Entrypoints To Keep For Now

These are not canonical long-term MoneyShyft ownership, but they are still live and must stay during this remediation.

| Surface | Path or tree | Why it stays now | Classification |
| --- | --- | --- | --- |
| `apps/moneyshyft-api` | `/api/v1/route`, `/api/v1/route-bridge` | Still mounted in the live MoneyShyft runtime. | `transitional_keep_for_now` |
| `apps/moneyshyft-api` | `src/modules/route` | Backing module tree for the mounted RouteShyft runtime. | `transitional_keep_for_now` |
| `apps/moneyshyft-web` | `/app/route/requests` via `RouteRequestLifecycleView.vue` | Still mounted in the live MoneyShyft SPA. | `transitional_keep_for_now` |
| Shared schema authority | RouteShyft schema traces already promoted into shared migration authority and mirrored in lane-local sources | Schema still underpins live RouteShyft behavior. | `transitional_keep_for_now` |

## Non-Money RouteShyft Mirrors To Leave Unmounted

These RouteShyft copies remain in the repo, but they are not alternate owners and must not block lane convergence.

| Surface | Path or tree | Why it is not an alternate owner | Classification |
| --- | --- | --- | --- |
| `apps/admin-api` | `src/routes/api/v1/route.ts` | `admin-api` no longer mounts RouteShyft runtime routes. | `safe_delete_after_convergence` |
| `apps/admin-api` | `src/routes/api/v1/route-bridge.ts` | `admin-api` no longer mounts RouteShyft bridge routes. | `safe_delete_after_convergence` |
| `apps/admin-api` | `src/modules/route/**` | Stale module mirror retained only until cleanup proof. | `safe_delete_after_convergence` |

Slice 7 cleanup removed the stale Admin RouteShyft mirrors above after canonical-owner verification.

## Module Trees That Must Converge To Canonical Ownership

These are the trees that matter for ownership convergence, not every duplicate folder in the repo.

| Current tree | Current state | Canonical destination | Notes |
| --- | --- | --- | --- |
| `apps/moneyshyft-api/src/modules/connectshyft` | unmounted retained mirror | `apps/connectshyft-api/src/modules/connectshyft` | Route cutover is complete. Keep this tree only until parity proof is recorded and cleanup is allowed. |
| `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` | unmounted retained route entrypoint | `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` | MoneyShyft no longer mounts `/api/v1/connectshyft`. Keep the file only until full module convergence proves no unique runtime behavior remains. |
| `apps/moneyshyft-api/src/modules/connectshyft/__tests__` and `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts` except `connectshyft.route-ownership.test.ts` | non-runtime stale mirror tests | `connectshyft-api` canonical tests and MoneyShyft ownership-only assertions | These tests exercise an unmounted MoneyShyft ConnectShyft mirror. They should not gate MoneyShyft CI once route ownership has moved. |
| `apps/moneyshyft-web/src/views/Admin` | live wrong-lane UI mirror | `apps/admin-web/src/views/Admin` | Admin-web is already canonical. The MoneyShyft copy should be retired after route cutover, not preserved as a second owner. |

## Mirrored Trees That Should Not Be Treated As Move Targets

These are real duplicates, but they are not the canonical destination for convergence work.

| Tree | Classification | Why it is not the move target |
| --- | --- | --- |
| `apps/admin-api/src/modules/connectshyft` and `apps/admin-api/src/routes/api/v1/connectshyft.ts` | unmounted stale mirror | `admin-api` does not mount ConnectShyft runtime routes. Reconcile any unique logic into `connectshyft-api`, keep boundary tests ownership-only, then delete later. |
| `apps/admin-api/src/routes/api/v1/accounts.ts`, `budgets.ts`, `transactions.ts`, and the rest of the money route tree | unmounted stale mirror | `admin-api` only mounts platform/admin/auth. These finance routes are wrong-lane baggage, not admin ownership. |
| `apps/connectshyft-api/src/services/*` money-domain service tree | unmounted stale mirror | `connectshyft-api` mounts only ConnectShyft runtime. The money service tree is not canonical ConnectShyft ownership. |
| `apps/admin-web/src/views/Accounts`, `Budget`, `Dashboard`, `Debts`, `Goals`, `Scenarios`, `Transactions` | deleted in Slice 8 after proof | `admin-web` router mounts only admin pages, and Slice 8 removed these unmounted stale MoneyShyft views after router/import/test verification. |
| matching `apps/admin-web/src/stores/**` and money-domain support components | unmounted stale mirror, deferred | These support surfaces remain wrong-lane baggage, but Slice 8 intentionally stopped at the verified unmounted view cleanup instead of broad repo deletion. |
| `apps/admin-api/src/modules/route` and `apps/admin-api/src/routes/api/v1/route*.ts` | unmounted stale RouteShyft mirror | RouteShyft remains transitional in MoneyShyft surfaces, not Admin. |

Slice 7 cleanup removed `apps/admin-api/src/routes/api/v1/connectshyft.ts` and the stale Admin RouteShyft mirror tree after the canonical owners were already live and verified.

## Shared-Lib Extraction Blockers

These imports should be extracted to a shared library layer before route/module relocation, otherwise the moves just recreate the same app-local duplication in a different folder.

### Extract first for API convergence

| Shared concern | Current duplicate locations | Why extract first |
| --- | --- | --- |
| Platform primitives | `apps/*-api/src/platform/**` | `connectshyft.ts`, `auth.ts`, and `platform-admin.ts` all depend on local platform envelopes, RBAC, tenancy, sessions, time, and mutation helpers. |
| HTTP middleware primitives | `apps/*-api/src/middleware/**` | Auth and validation paths still rely on app-local copies even though the middleware trees are identical. |
| Shared validators | `apps/*-api/src/validators/*.ts` | Route relocation should not preserve three app-local copies of the same request contracts. `auth.validators.ts` needs a split because the admin version already diverged. |
| Auth utility primitives | `apps/*-api/src/utils/jwt.ts`, `apps/*-api/src/utils/invitationCode.ts` | Admin and Money auth routes both depend on these app-local helpers. |
| DB bootstrap primitives | app-local `config/knex` and connection helpers | ConnectShyft modules depend on local `config/knex`. Full knexfiles stay app-owned, but shared DB access primitives should not remain duplicated. |

### Already-shared imports that do not need re-extraction first

| Shared concern | Current location | Why not a blocker |
| --- | --- | --- |
| Communication domain primitives | `domains/communication` | ConnectShyft already imports these from a shared domain path. Keep using shared ownership here. |
| Shared production migrations | `shared/database/migrations` | Production schema authority is already shared; execution authority is the remaining boundary problem. |

### Cross-lane contract blocker to remove during convergence

| Path | Problem |
| --- | --- |
| `apps/admin-api/src/routes/api/v1/platform-contracts.ts` | The contract route reads MoneyShyft files by repo path for evidence. If auth/runtime ownership moves, this file-path contract must point at shared evidence or canonical admin-owned artifacts instead of `apps/moneyshyft-api/*`. |

## Migration Execution Paths Still Depending On Old Lane Assumptions

| Path | Old assumption still embedded | Implication |
| --- | --- | --- |
| `apps/admin-api/package.json` | `admin-api` still owns `migrate:latest:prod` and packages shared migrations on build. | Current production runner is still Admin, not `migration-runner`. |
| `apps/admin-api/knexfile.js` | Production migrations load from `dist/shared/database/migrations`. | Admin packaging remains the active execution path. |
| `apps/moneyshyft-api/package.json` and `scripts/enforceProdMigrationAuthority.js` | Production migration scripts are blocked with `use admin-api instead`. | Lane separation cannot assume MoneyShyft is free of old runner assumptions yet. |
| `apps/moneyshyft-api/knexfile.js` | Production config still points at app-local `dist/migrations`. | The path is stale even though execution is blocked. |
| `apps/connectshyft-api/package.json` and `scripts/enforceProdMigrationAuthority.js` | Production migration scripts are blocked with `use admin-api instead`. | ConnectShyft runtime still encodes the old runner contract. |
| `apps/connectshyft-api/knexfile.js` | Production config still points at app-local `dist/migrations`. | Same stale lane-local assumption as MoneyShyft. |
| `apps/migration-runner/package.json` and `apps/migration-runner/knexfile.js` | Runner exists and expects shared authority at `/app/shared/database/migrations`, but no deploy contract activates it. | Future-ready only; do not treat as current authority yet. |

## Ordered Remediation Map

### 1. Extract shared API primitives into `libs/`

Goal:
- Remove the duplicated API infrastructure layer that currently blocks safe ownership moves.

Work:
- Extract `platform/**`, shared `middleware/**`, shared validators, `jwt.ts`, `invitationCode.ts`, and DB access primitives needed by multiple APIs.
- Leave feature business logic in its owning lane.
- Split admin-only auth validators and password-reset logic from lane-neutral auth primitives instead of forcing everything into one shared auth feature module.

Why first:
- The active wrong-lane routes in MoneyShyft all depend on app-local infrastructure copies.
- ConnectShyft route and module convergence will otherwise just move duplicated platform glue without reducing ambiguity.

### 2. Normalize the migration execution boundary without cutting over yet

Goal:
- Remove old lane-runner assumptions from feature apps while preserving the current production contract.

Work:
- Keep `shared/database/migrations` as the only production schema source.
- Keep `admin-api` as the current authorized production runner until a separate cutover.
- Move runner guardrails and shared migration packaging helpers toward a canonical shared location so the final cutover to `migration-runner` is mechanical instead of architectural.
- Remove or quarantine stale `dist/migrations` production references from feature app knexfiles once shared execution plumbing is in place.

Why before route moves:
- The spec requires migration execution separation ahead of canonical route ownership.
- The current feature apps still encode `admin-api` runner assumptions.

### 3. Remove MoneyShyft-hosted admin runtime entrypoints

Goal:
- End dual ownership of admin/auth runtime and UI.

Work:
- Stop mounting `/api/v1/platform`, `/api/v1/platform/admin`, and `/api/v1/auth` from `moneyshyft-api` after verifying callers resolve to `admin-api`.
- Stop mounting `/admin/system` and `/admin/tenant` from `moneyshyft-web` after verifying admin navigation resolves to `admin-web`.
- Repoint `platform-contracts` evidence away from MoneyShyft file-path probes.

Why now:
- Canonical admin owners already exist in both API and web.
- This reduces cross-lane ambiguity before the higher-risk ConnectShyft runtime cutover.

### 4. Repoint ConnectShyft runtime ingress to `connectshyft-api`

Goal:
- Make the live route owner match the canonical ConnectShyft lane.

Work:
- Shift `/api/v1/connectshyft` ingress to `connectshyft-api`.
- If a compatibility layer is needed during rollout, keep it thin and transport-only inside `moneyshyft-api`; do not leave feature logic there. The current slice does not retain a mounted shim.
- Keep `connectshyft-web` as the canonical UI owner for inbox/thread/directory/settings surfaces.

Why before module cleanup:
- Runtime ingress must settle before deleting or shrinking the MoneyShyft copy.

### 5. Converge the ConnectShyft module trees into one canonical backend owner

Goal:
- Finish the feature ownership move after ingress has moved.

Work:
- Merge divergent behavior from `apps/moneyshyft-api/src/modules/connectshyft` and `apps/admin-api/src/modules/connectshyft` into `apps/connectshyft-api/src/modules/connectshyft`.
- Preserve the newer ConnectShyft-only work already present in `connectshyft-api`, including bridge-session, phone-identity, and communication-reliability additions.
- Retire the MoneyShyft and Admin ConnectShyft mirrors only after runtime parity is verified.
- Normalize `connectshyft-api` to stop relying on MoneyShyft-specific env/logger assumptions during local bootstrapping.

Why not a big-bang move:
- The ConnectShyft trees are already divergent, so this is a selective merge into the canonical lane, not a rename.

### 6. Freeze RouteShyft as an explicit transitional subsystem

Goal:
- Prevent RouteShyft from being accidentally treated as MoneyShyft canonical ownership or deleted too early.

Work:
- Keep the mounted MoneyShyft RouteShyft routes, module tree, UI view, and shared schema traces in place.
- Mark any non-Money RouteShyft copies as stale mirrors, not alternate owners.
- Do not fold RouteShyft into `libs/` just to postpone ownership decisions.

Why now:
- RouteShyft remains live, but it is outside the current canonical lane model and should be isolated, not rewritten during ConnectShyft convergence.

### 7. Delete stale mirrors only after live authority is verified

Goal:
- Finish the lane cleanup without taking runtime risk early.

Delete candidates after verification:
- `admin-api` finance routes and finance service mirrors
- `connectshyft-api` money service mirrors
- `admin-web` money views, stores, and components that are not mounted by the admin router
- `moneyshyft-web` admin mirrors
- `moneyshyft-api` admin/auth/connect mirrors after cutover
- `admin-api` and other non-live RouteShyft mirrors

## Dependency Blockers

1. ConnectShyft backend convergence is blocked on shared extraction of platform, middleware, validators, and DB primitives because the route/module trees still depend on app-local infrastructure copies.
2. ConnectShyft tree convergence is blocked on divergence reconciliation because the MoneyShyft, Admin, and ConnectShyft copies are no longer identical.
3. Admin boundary cleanup is blocked on the `platform-contracts` route reading MoneyShyft files by repo path for evidence.
4. Migration boundary cleanup is blocked on the active deploy contract still authorizing `admin-api` rather than `migration-runner`.
5. RouteShyft cleanup is blocked on live mounted runtime entrypoints plus shared schema dependence.

## Safe Move Sequence

1. Extract shared API primitives into `libs/` without moving feature logic.
2. Normalize migration execution plumbing around shared authority while keeping `admin-api` as the active runner.
3. Remove MoneyShyft-hosted admin runtime entrypoints and UI routes.
4. Move ConnectShyft ingress to `connectshyft-api`, using only a temporary thin compatibility layer if needed.
5. Merge divergent ConnectShyft modules into `connectshyft-api` and verify parity.
6. Keep RouteShyft explicitly transitional in MoneyShyft surfaces.
7. Delete stale mirrors only after builds, tests, and route ownership verification pass.

## Explicit Non-Actions For This Map

- Do not delete RouteShyft yet.
- Do not do a repo-wide rewrite.
- Do not move business logic into `libs/` just because ownership is uncomfortable.
- Do not treat unmounted duplicate trees as if they were live authority.
