# File and Surface Inventory

## Runtime Entrypoints and Serving Surfaces

### `money-api`

| Category | Paths |
| --- | --- |
| App bootstrap | `apps/moneyshyft-api/src/app.ts`, `apps/moneyshyft-api/src/server.ts`, `apps/moneyshyft-api/src/api/registerRoutes.ts` |
| Money-domain routes | `apps/moneyshyft-api/src/routes/api/v1/accounts.ts`, `transactions.ts`, `splits.ts`, `categories.ts`, `goals.ts`, `budgets.ts`, `income.ts`, `debts.ts`, `assignments.ts`, `households.ts`, `recurring-transactions.ts`, `extra-money.ts`, `settings.ts`, `scenarios.ts`, `tags.ts` |
| Embedded mirrored routes | `apps/moneyshyft-api/src/routes/api/v1/auth.ts`, `platform-admin.ts`, `platform-contracts.ts`, `connectshyft.ts` |
| Embedded RouteShyft routes | `apps/moneyshyft-api/src/routes/api/v1/route.ts`, `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts` |
| Build / packaging | `apps/moneyshyft-api/package.json`, `apps/moneyshyft-api/Dockerfile.production`, `apps/moneyshyft-api/knexfile.js` |

### `moneyshyft-web`

| Category | Paths |
| --- | --- |
| Router and SPA entrypoints | `apps/moneyshyft-web/src/router/index.ts`, `apps/moneyshyft-web/src/services/api.ts`, `apps/moneyshyft-web/vite.config.ts` |
| Money views | `apps/moneyshyft-web/src/views/DashboardView.vue` and lane-specific feature views mounted under `/`, `/accounts`, `/transactions`, `/budget`, `/goals`, `/debts`, `/extra-money`, `/settings`, `/scenarios` |
| Embedded admin views | `apps/moneyshyft-web/src/views/Admin/AdminLandingView.vue`, `SystemAdminView.vue`, `TenantAdminView.vue`, `apps/moneyshyft-web/src/services/platformAdmin.ts` |
| Embedded RouteShyft view | `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue` |
| Build / packaging | `apps/moneyshyft-web/package.json`, `apps/moneyshyft-web/vite.config.ts` |

### `connect-api`

| Category | Paths |
| --- | --- |
| App bootstrap | `apps/connectshyft-api/src/app.ts`, `apps/connectshyft-api/src/server.ts` |
| Runtime route | `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` |
| Build / packaging | `apps/connectshyft-api/package.json`, `apps/connectshyft-api/Dockerfile.production`, `apps/connectshyft-api/knexfile.js`, `apps/connectshyft-api/scripts/writeDistServerEntrypoint.js`, `apps/connectshyft-api/tsconfig.json` |

### `admin-api`

| Category | Paths |
| --- | --- |
| App bootstrap | `apps/admin-api/src/app.ts`, `apps/admin-api/src/server.ts`, `apps/admin-api/src/api/registerRoutes.ts` |
| Runtime routes | `apps/admin-api/src/routes/api/v1/auth.ts`, `platform-admin.ts`, `platform-contracts.ts` |
| Build / packaging | `apps/admin-api/package.json`, `apps/admin-api/Dockerfile.production`, `apps/admin-api/knexfile.js`, `apps/admin-api/scripts/packageSharedMigrations.js` |
| Metadata anomaly | `apps/admin-api/project.json` has `lane:connectshyft` tag even though runtime role is admin authority |

### `migration-runner`

| Category | Paths |
| --- | --- |
| Runtime entrypoint | `apps/migration-runner/package.json`, `apps/migration-runner/knexfile.js` |
| Build / packaging | `apps/migration-runner/Dockerfile`, `shared/database/migrations` |

## Validators

The following validator set is mirrored across `money-api`, `admin-api`, and `connect-api`:

- `account.validators.ts`
- `assignment.validators.ts`
- `auth.validators.ts`
- `budget.validators.ts`
- `category.validators.ts`
- `debt.validators.ts`
- `extra-money.validators.ts`
- `goal.validators.ts`
- `income.validators.ts`
- `recurring.validators.ts`
- `split.validators.ts`
- `tag.validators.ts`
- `transaction.validators.ts`

## Scripts

| Surface | Paths |
| --- | --- |
| `money-api` | `apps/moneyshyft-api/scripts/enforceProdMigrationAuthority.js` |
| `admin-api` | `apps/admin-api/scripts/enforceProdMigrationAuthority.js`, `apps/admin-api/scripts/packageSharedMigrations.js` |
| `connect-api` | `apps/connectshyft-api/scripts/enforceProdMigrationAuthority.js`, `apps/connectshyft-api/scripts/writeDistServerEntrypoint.js` |

## Build and Packaging Paths

| Surface | Build / package behavior |
| --- | --- |
| `money-api` | `npm run build` compiles TypeScript only; production image ships `dist`, `knexfile.js`, and `scripts`, and production knex still points to `dist/migrations` even though execution is blocked in production. |
| `admin-api` | Build runs `tsc -p tsconfig.build.json` and packages shared migrations into `dist/shared/database/migrations`, which is the active production migration source in the current topology. |
| `connect-api` | Build runs `tsc` plus `writeDistServerEntrypoint.js`; production image ships `dist`, `knexfile.js`, and `scripts`, and production knex still points to `dist/migrations` even though execution is blocked in production. |
| `moneyshyft-web` | Host and Vite builds emit static SPA assets; dev proxy delegates admin/auth API traffic to the admin target and lane-local API traffic to the money target. |

## RouteShyft Money-Lane Artifact Inventory

| Artifact type | Paths |
| --- | --- |
| Backend route entrypoints | `apps/moneyshyft-api/src/routes/api/v1/route.ts`, `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts` |
| Backend module tree | `apps/moneyshyft-api/src/modules/route/...` |
| Frontend route surface | `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`, mounted at `/app/route/requests` |
| Schema traces | `apps/moneyshyft-api/src/migrations/20260224153000_create_route_commitments_and_transition_audit.ts`, `20260225120000_create_route_commitments_and_intake_requests.ts`, `20260227170000_create_route_refusal_persistence.ts` |

## Discovery Notes

- `money-api` contains live route registrations for money, RouteShyft, ConnectShyft, auth, and platform-admin surfaces.
- `moneyshyft-web` contains both money-lane UI and embedded admin/RouteShyft UI surfaces.
- `admin-api` is runtime-thin but source-heavy: it only mounts admin/auth/platform routes while mirroring many other source trees.
- `migration-runner` is inventory-relevant because it packages the shared migration authority directly and carries no public route surface.
