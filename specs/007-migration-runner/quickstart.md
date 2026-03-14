# Quickstart - Dedicated Migration Runner

## Goal

Validate that a dedicated one-shot `migration-runner` deployable exists, reads only shared migration authority, and is ready for later operational cutover without changing the current production migration owner.

## Preconditions

- Migration Authority Convergence is already merged.
- `shared/database/migrations` is the only authoritative migration source.
- `admin-api` remains the currently authorized production migration runner.
- `money-api` and `connect-api` remain blocked from production migration execution.
- No production migration execution is performed as part of this validation.

## Expected Image Layout

The built runner image must contain exactly this relevant layout:

```text
/app/
├── knexfile.js
├── package.json
├── package-lock.json
├── node_modules/
└── shared/
    └── database/
        └── migrations/
```

The runner must not depend on:
- `/app/dist`
- `apps/admin-api`
- any lane-local `src/migrations` directory inside the image

## Exact Migration Path Resolution

- `apps/migration-runner/knexfile.js` must resolve migrations with:

```js
path.join(__dirname, 'shared', 'database', 'migrations')
```

- Inside the image, that must resolve to:

```text
/app/shared/database/migrations
```

- Validation must confirm the directory exists inside the built container.

## Exact Dependency Strategy

- Required runtime dependencies:
  - `dotenv`
  - `knex`
  - `pg`
  - `ts-node`
  - `typescript`
- The runner uses `node -r ts-node/register` so `ts-node` and `typescript` must be installed at runtime.
- `npm ci --omit=dev` is valid only if `ts-node` and `typescript` are regular dependencies.
- No build/transpile step and no `dist/` output are part of this app.

## Local Validation

1. Build the runner image from repo-root context:

```bash
cd /Users/jeremiahotis/projects/connectshyft
docker build -f apps/migration-runner/Dockerfile -t migration-runner-check .
```

2. Verify the migration directory exists inside the image:

```bash
docker run --rm --entrypoint sh migration-runner-check -lc \
  'test -f /app/knexfile.js && test -d /app/shared/database/migrations && find /app/shared/database/migrations -maxdepth 1 -type f | sort | head'
```

3. Verify there is no HTTP server behavior, no lane-local migration path, and no runtime app process:

```bash
docker run --rm --entrypoint sh migration-runner-check -lc \
  'test ! -d /app/apps && test ! -d /app/dist && test ! -f /app/server.js && test ! -f /app/src/server.ts && ! find /app -path "*/src/migrations" -print -quit | grep -q .'
```

4. Verify the resolved migration path without using production data:

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  --entrypoint sh migration-runner-check -lc \
  'node -e "const config = require(\"./knexfile.js\"); console.log(config.production.migrations.directory);"'
```

5. Verify the one-shot command wiring without using production data:

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  --entrypoint sh migration-runner-check -lc \
  'npm run migrate:latest -- --help'
```

6. Verify `ts-node/register` can load a shared TypeScript migration from the final image:

```bash
docker run --rm --entrypoint sh migration-runner-check -lc \
  'node -r ts-node/register -e "require(\"./shared/database/migrations/001_initial_schema.ts\"); console.log(\"ts_migration_loaded\");"'
```

## Deploy Sequence Impact

Current deploy order remains unchanged in this phase:

1. Build images
2. Reconcile migration manifests
3. Run shared migrations once from `admin-api`
4. Deploy runtime containers
5. Run smoke checks

This feature adds only:
- a buildable dedicated runner image
- explicit future cutover documentation
- validation that the runner can see shared migration authority

## Boundary Validation

- `admin-api` remains the current authorized production migration runner.
- `money-api` and `connect-api` production migration blockers remain intact.
- The runner exposes no HTTP port and serves no traffic.
- No deploy doc may instruct runtime APIs to execute production migrations.

## Implementation Evidence

### Runner App

- Added the dedicated one-shot app files:
  - `apps/migration-runner/package.json`
  - `apps/migration-runner/package-lock.json`
  - `apps/migration-runner/knexfile.js`
  - `apps/migration-runner/Dockerfile`
- The app remains JS-only with no `src/`, no `dist/`, and no server/runtime app code.
- The only execution script is `npm run migrate:latest`.

### Image Layout And Path Resolution

- Built image successfully from repo-root context:

```bash
docker build -f apps/migration-runner/Dockerfile -t migration-runner-check .
```

- Container filesystem validation passed:
  - `/app/knexfile.js` exists
  - `/app/shared/database/migrations` exists
  - shared migration file count: `60`
  - `/app/apps` does not exist, so the forbidden nested runtime layout is absent
  - no lane-local `src/migrations` path was present in the execution path
  - no `/app/dist`, `/app/server.js`, or `/app/src/server.ts` was present
- `knexfile.js` resolved the production migration directory to:
  - `/app/shared/database/migrations`

### Runtime Dependency Evidence

- `npm ci --omit=dev` succeeded during image build, proving the runtime dependency set is sufficient for the image.
- Container-level TypeScript migration load validation passed:
  - `node -r ts-node/register -e "require('./shared/database/migrations/001_initial_schema.ts')"`
  - output: `ts_migration_loaded`
- One-shot command wiring validation passed:

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  --entrypoint sh migration-runner-check -lc \
  'npm run migrate:latest -- --help'
```

- The command printed the expected Knex `migrate:latest` help and exited successfully without executing migrations.

### Boundary Evidence

- `admin-api` remains the current authorized production migration runner; this feature does not change the current production command.
- `apps/moneyshyft-api/knexfile.js` still blocks lane production migration/seed execution via `blockLaneProdMigrationExecution('money-api')`.
- `apps/connectshyft-api/knexfile.js` still blocks lane production migration/seed execution via `blockLaneProdMigrationExecution('connect-api')`.
- Routing and deploy topology remain unchanged:
  - `docs/DEPLOYMENT_CHECKLIST.md` still requires delegated `/api/v1/auth/*` and `/api/v1/platform/admin/*` routing to `admin_api`
  - `docker-compose.production.example.yml` still binds canonical loopback ports `127.0.0.1:3100`, `127.0.0.1:3000`, and `127.0.0.1:3002`
  - `specs/platform/contracts/docker-compose.production.shared.yml` still reflects the same canonical loopback bindings

### Deploy Sequence

- The current phase deploy order remains:
  1. build artifacts/images
  2. reconcile migration manifests
  3. run shared migrations once from `admin-api`
  4. deploy runtime containers
  5. smoke checks
- `migration-runner` is validated as a future execution vehicle only and is not added to the active production deploy path in this phase.

## Risks to Re-Check During Implementation

- Docker build context must stay repo-root so `shared/database` is available.
- `npm ci --omit=dev` will fail the runner if `ts-node`/`typescript` are not runtime dependencies.
- A later cutover must preserve reconciliation review before execution and must remain a separate change.
