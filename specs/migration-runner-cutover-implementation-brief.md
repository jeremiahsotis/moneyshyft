# Migration‑Runner Cutover Implementation Brief (Codex‑Ready)

## 1. OBJECTIVE

Cut over database migration authority from `apps/admin-api` to the dedicated `apps/migration-runner` service. After this slice the `migration-runner` package will be the only process that packages and applies shared migrations in production. `admin-api` and other services must delegate all migration commands to `migration-runner` and no longer bundle or execute migrations themselves.

## 2. ARCHITECTURAL DECISIONS (LOCKED)

1. **Single migration authority:** All database migrations for the ShyftUnity monorepo are executed via the `migration-runner` package. No other application may run migrations in production.
2. **Delegated scripts:** Production migration scripts defined in `apps/admin-api/package.json` will delegate to `migration-runner` through pnpm filtering instead of invoking `knex` directly. The enforcement script `scripts/enforceProdMigrationAuthority.js` will be removed.
3. **Packaging logic centralised:** The existing `libs/db/scripts/packageSharedMigrations.js` remains the canonical compiler/transpiler for TypeScript migrations. `apps/migration-runner/scripts/packageSharedMigrations.js` will continue to call this helper; other apps will not package migrations.
4. **Environment contract:** `migration-runner` requires a `DATABASE_URL` environment variable for the target Postgres database and expects packaged migrations under `/app/shared/database/migrations`. The container’s `Dockerfile` will continue to copy `shared/database` and run `npm run migrate:latest` at startup.
5. **Nx independence:** The migration runner remains outside the Nx build graph. It is invoked via pnpm scripts rather than through `nx run` targets.

## 3. EXECUTION FLOW

1. **Packaging Step:** The command

```bash
pnpm –filter migration-runner run migrations:package
```

performs the following operations:

- Ensures `process.env.DATABASE_URL` is non‑empty. If not set, the script throws `DATABASE_URL must be set for migration-runner`.
- Verifies the existence of packaged migration files (`.js`) in `apps/migration-runner/shared/database/migrations`; if none exist, it throws an error instructing to run `migrations:package`.
- Invokes `knex migrate:latest` using the packaged migrations and `knexfile.js`. `knex` writes applied migrations into the `knex_migrations` table.

3. **Delegated Invocation:** `admin-api`’s production migration commands call `pnpm --filter migration-runner` to run the above steps instead of executing `knex` locally. This ensures a single authority.

## 4. STATE MACHINE

The migration process is modelled as a simple state machine:

| State       | Transition Trigger                          | Next State  |
| ----------- | ------------------------------------------- | ----------- |
| `idle`      | `migrations:package` invoked                | `packaging` |
| `packaging` | All TypeScript files transpiled to JS       | `packaged`  |
| `packaged`  | `migrate:latest:prod` invoked               | `migrating` |
| `migrating` | All pending migrations applied successfully | `complete`  |
| `migrating` | Missing `DATABASE_URL` or no packaged files | `error`     |
| `error`     | Error handled and environment corrected     | `migrating` |

`complete` is idempotent: re‑invoking `migrate:latest:prod` when the database is up to date keeps the system in `complete`.

## 5. DATABASE CONTRACTS

This cutover does not introduce any new tables or columns. It continues to rely on the existing `knex_migrations` metadata table used by knex to track applied migrations. Existing migrations located in `shared/database/migrations` remain unchanged.

## 6. SERVICE LAYER (STRICT)

The migration runner is not an HTTP service. Its surface area consists of CLI scripts executed via `npm`.

**CLI Functions:**

| File & Path                                                | Signature                                                                                                                                                                                                       | Responsibility                                                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/migration-runner/scripts/packageSharedMigrations.js` | `function packageSharedMigrations(): { migrationCount: number }`                                                                                                                                                | Invoked via `npm run migrations:package`. Transpiles TypeScript migrations from `shared/database/migrations` to JavaScript in `apps/migration-runner/shared/database/migrations`. |
| `libs/db/scripts/packageSharedMigrations.js`               | `function packageSharedMigrations(options: { outputDirectory: string; sourceDirectory: string; typescriptModuleBase?: string; }): { migrationCount: number; outputDirectory: string; sourceDirectory: string }` | Core helper reused by the migration runner.                                                                                                                                       |

**Delegated NPM Scripts:**

| Script                  | Location                             | Command                                                                                    |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `migrate:latest:prod`   | `apps/migration-runner/package.json` | `npm run migrate:latest` (ensures packaging then runs knex migrations against production). |
| `migrate:rollback:prod` | `apps/migration-runner/package.json` | Rolls back the most recent production migration.                                           |

## 7. PROVIDER / INTEGRATION CONTRACTS

The migration runner expects a reachable Postgres database specified via `DATABASE_URL` in the form:

```bash
postgresql://USER:PASSWORD@HOST:PORT/DBNAME
```

No other services are called.

## 8. EVENT HANDLING

No domain events are produced or consumed by the migration runner. Errors are emitted via process exceptions.

## 9. IDEMPOTENCY RULES

The migration runner relies on knex’s built‑in idempotency. Migrations are only applied once per database. On subsequent runs, the `knex_migrations` table ensures no migration is applied twice. Packaging is always safe to repeat; it overwrites the compiled JS files.

## 10. FAILURE MODES

1. **Missing `DATABASE_URL`:** If `process.env.DATABASE_URL` is undefined or empty when running `migrate:latest:prod`, the runner throws and exits with code 1.
2. **Unpackaged Migrations:** If `apps/migration-runner/shared/database/migrations` contains no `.js` files, the runner throws with instructions to run `pnpm --filter migration-runner run migrations:package` first.
3. **Database Connectivity Errors:** If the database cannot be reached or fails authentication, knex exits with a descriptive error.

Each failure will cause the process to exit non‑zero; deployment pipelines must halt on non‑zero exit codes.

## 11. TEST CONTRACT

Integration tests must be added under `tests/integration/migration-runner` with the following scenarios:

1. **Packaging Test:** Run `pnpm --filter migration-runner run migrations:package` and assert that each TypeScript file in `shared/database/migrations` produces a corresponding `.js` file in `apps/migration-runner/shared/database/migrations`.
2. **Migration Test:** With a clean Postgres database available via `DATABASE_URL`, run `pnpm --filter migration-runner run migrate:latest:prod` and assert that the `knex_migrations` table exists and its `name` column contains all migration filenames. Re‑run the command and assert no additional migrations are applied.
3. **Delegation Test:** From the `apps/admin-api` context, run `npm run migrate:latest:prod` and assert that the command executes `migration-runner` (e.g., by inspecting environment logs) and that no admin-specific migration logic runs.

## 12. CHECKPOINTS

### Checkpoint 1 — Delegate admin-api production migrations

**FILES:**

1. `shyftunity_repo/apps/admin-api/package.json` – modify `migrate:latest:prod`, `migrate:rollback:prod` and `seed:run:prod` scripts.
2. `shyftunity_repo/apps/admin-api/scripts/enforceProdMigrationAuthority.js` – remove file.

**FUNCTION SIGNATURES:** No new functions are introduced. CLI script changes only.

**LINE‑LEVEL DIFF EXPECTATIONS:**

```diff
*** Update File: apps/admin-api/package.json
@@ "scripts": {
-    "migrate:latest:prod": "NODE_ENV=production node ./scripts/enforceProdMigrationAuthority.js && NODE_ENV=production node ./node_modules/knex/bin/cli.js --knexfile knexfile.js --env production migrate:latest",
+    "migrate:latest:prod": "pnpm --filter migration-runner run migrate:latest:prod",
@@ "scripts": {
-    "migrate:rollback:prod": "NODE_ENV=production node ./scripts/enforceProdMigrationAuthority.js && NODE_ENV=production node ./node_modules/knex/bin/cli.js --knexfile knexfile.js --env production migrate:rollback",
+    "migrate:rollback:prod": "pnpm --filter migration-runner run migrate:rollback:prod",
@@ "scripts": {
-    "seed:run:prod": "NODE_ENV=production node ./scripts/enforceProdMigrationAuthority.js && NODE_ENV=production node ./node_modules/knex/bin/cli.js --knexfile knexfile.js --env production seed:run",
+    "seed:run:prod": "pnpm --filter migration-runner run seed:run:prod",
*** Delete File: apps/admin-api/scripts/enforceProdMigrationAuthority.js
```

## REQUIRED CHANGES:

1. Update `apps/admin-api/package.json` to delegate all production migration commands to the `migration-runner` using pnpm filtering as shown above. Remove the previous invocation of `enforceProdMigrationAuthority.js` and the direct knex calls.
2. Delete `apps/admin-api/scripts/enforceProdMigrationAuthority.js` entirely. This guard is no longer required once migration authority is centralised.

## DATA MUTATIONS:

None. Scripts run external commands only.

## GUARDS:

Ensure that `pnpm --filter migration-runner` is available. The commands will fail if the `migration-runner` package is not installed. Guard at CI level by running `pnpm install` in the monorepo root before invoking these scripts.

## STOP CONDITION:

Run `npm run migrate:latest:prod` from `apps/admin-api` in production mode. The process should execute the `migration-runner` scripts and print the log message from `apps/migration-runner/scripts/packageSharedMigrations.js`, confirming that packaging and migrations ran under migration-runner. Verifiable by absence of any warning from the deleted `enforceProdMigrationAuthority.js` and by the presence of migration logs from `migration-runner`.

## COMMIT POINT:

```bash
git add apps/admin-api/package.json
git rm apps/admin-api/scripts/enforceProdMigrationAuthority.js
git commit -m "chore: delegate production migrations to migration-runner"
```

### Checkpoint 2 — Update deployment guide

## FILES:

1. `shyftunity_repo/docs/PRODUCTION_DEPLOYMENT_GUIDE.md` – replace transitional migration instructions to use `migration-runner`.
2. `shyftunity_repo/docker-compose.production.example.yml` – add a `migration-runner` service with a one‑shot run.

## LINE‑LEVEL DIFF EXPECTATIONS:

In docs/PRODUCTION_DEPLOYMENT_GUIDE.md, replace the transitional text:

```diff
@@
-# Run production migrations from the authority only after reconciliation passes
-# Target-state authority is migration-runner once governance is approved.
-# Until then, admin-api remains the transitional active runner.
-docker compose run --rm admin-api npm run migrate:latest:prod
+# Run production migrations from the authority only after reconciliation passes
+docker compose run --rm migration-runner npm run migrate:latest:prod
```

Remove any subsequent note instructing to “switch” to migration-runner; the new instruction should appear only once.

And in docker-compose.production.example.yml:

```diff
@@ services:
   # existing service definitions
+  migration-runner:
+    build:
+      context: .
+      dockerfile: ./apps/migration-runner/Dockerfile
+    env_file:
+      - ${MIGRATION_RUNNER_ENV_FILE:-/opt/shyftunity/env/migration-runner.env}
+    environment:
+      NODE_ENV: production
+    depends_on:
+      - postgres
+    command: ["npm", "run", "migrate:latest:prod"]
+    restart: "no"
```

## REQUIRED CHANGES:

1. Add a `migration-runner` service to `docker-compose.production.example.yml` for one‑shot migration execution. The service depends on the postgres service and terminates after applying migrations. This makes it easy to run migrations in containerised environments.
2. Update the production deployment guide to instruct operators to run `docker compose run --rm migration-runner npm run migrate:latest:prod` after reconciliation. Remove references to `admin-api` as a transitional runner.

## DATA MUTATIONS:

None.

## GUARDS:

Ensure `migration-runner` service is not set to restart automatically; migrations should only run once on deployment. The compose configuration uses restart: "no".

## STOP CONDITION:

Deploy using the updated compose file and run `docker compose run --rm migration-runner npm run migrate:latest:prod`. The service should exit after applying migrations, and the logs should show `Packaged X shared migrations` followed by knex migration output. The `admin-api` container should start without attempting migrations.

## COMMIT POINT:

```bash
git add docs/PRODUCTION_DEPLOYMENT_GUIDE.md docker-compose.production.example.yml
git commit -m "docs: cutover migration authority to migration-runner"
```

## 13. DEFINITION OF DONE

The cutover is complete when:

1. Running `npm run migrate:latest:prod` in `apps/admin-api` delegates to `migration-runner` and no longer calls `scripts/enforceProdMigrationAuthority.js`.
2. A fresh deployment using `docker-compose.production.example.yml` can run `migration-runner` to apply migrations successfully, and subsequent invocations detect no pending migrations.
3. The `enforceProdMigrationAuthority.js` file is removed and no longer referenced anywhere in the repository.
4. Documentation clearly explains how to package and run migrations via the `migration-runner`.

## 14. NON-GOALS

- Integrating `apps/migration-runner` into the Nx project graph. The runner remains a standalone package.
- Modifying any existing migration files or adding new migrations.
- Changing development‑mode migration scripts (developers may continue running migrations locally via `admin-api` if desired).
- Introducing automatic migration execution in runtime API services. Migrations remain a manual step executed by operators.

## 15. FUTURE EXTENSION POINTS

1. **Nx target integration:** In future slices the `migration-runner` could be added as an Nx project with build and deploy targets for improved consistency.
2. **Continuous Migration Service:** The runner could evolve into a continuously running service that listens for new migration events and applies them automatically, with proper observability.
3. **Per‑module migrations:** If separate domain schemas emerge, migration logic could be partitioned per module and the runner extended to support modular execution with selectors.
