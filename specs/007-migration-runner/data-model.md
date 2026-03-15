# Data Model - Dedicated Migration Runner

## Entity: MigrationRunnerImage

Purpose:
- Defines the runtime filesystem and dependency boundary for the dedicated runner container.

Fields:
- `workdir`: fixed string, `/app`
- `packageManifestPath`: `/app/package.json`
- `knexfilePath`: `/app/knexfile.js`
- `sharedAuthorityPath`: `/app/shared/database/migrations`
- `hasHttpListener`: boolean, must be `false`
- `installsDevDependencies`: boolean, must be `false`

Validation rules:
- `sharedAuthorityPath` must exist inside the image.
- No API-local migration directory may exist inside the execution path.
- No exposed port or HTTP startup command may be present.

Relationships:
- Uses `RunnerDependencySet`
- Uses `RunnerInvocation`

## Entity: RunnerDependencySet

Purpose:
- Captures the minimal runtime packages required to execute shared TypeScript migrations.

Fields:
- `runtimePackages`: ordered set containing `dotenv`, `knex`, `pg`, `ts-node`, `typescript`
- `installCommand`: `npm ci --omit=dev`
- `requiresTsRuntime`: boolean, must be `true`

Validation rules:
- `ts-node` and `typescript` must be regular dependencies, not dev-only dependencies.
- The install command must leave the execution command functional without a build step.

Relationships:
- Used by `MigrationRunnerImage`
- Supports `RunnerInvocation`

## Entity: RunnerKnexConfig

Purpose:
- Defines the database connection and migration directory contract for the runner.

Fields:
- `environment`: `production`
- `databaseUrlEnv`: `DATABASE_URL`
- `migrationDirectory`: `/app/shared/database/migrations`
- `migrationExtension`: `ts`
- `migrationTable`: `knex_migrations`

Validation rules:
- `DATABASE_URL` is required.
- `migrationDirectory` must be derived from `__dirname`, not from the process working directory.
- The config must not reference `apps/*/src/migrations`, `dist/shared/database/migrations`, or any API-local path.

Relationships:
- Used by `RunnerInvocation`

## Entity: RunnerInvocation

Purpose:
- Defines the exact one-shot execution behavior for the dedicated runner.

Fields:
- `command`: `node -r ts-node/register ./node_modules/knex/bin/cli.js --knexfile knexfile.js --env production migrate:latest`
- `usesDatabaseUrl`: boolean, must be `true`
- `servesHttp`: boolean, must be `false`
- `exitBehavior`: `process exits after Knex command completes`

Validation rules:
- Invocation must run `knex migrate:latest` exactly once per container execution.
- Invocation must not start a server or long-running worker.
- Invocation must not bypass reconciliation review in deployment documentation.

Relationships:
- Depends on `RunnerKnexConfig`
- Depends on `RunnerDependencySet`

## Entity: DeploymentBoundary

Purpose:
- Preserves current migration authority and runtime API restrictions while preparing for later cutover.

Fields:
- `currentAuthorizedRunner`: `admin-api`
- `futurePreparedRunner`: `migration-runner`
- `runtimeApiProdExecutionBlocked`: boolean, must be `true`
- `sharedAuthorityOnly`: boolean, must be `true`

Validation rules:
- `admin-api`, `money-api`, and `connect-api` runtime containers must remain blocked or unchanged for production migration authority in this phase.
- The runner app must be documented as future-ready, not yet the active authorized production runner.

State transitions:
- `prepared_not_authorized` -> runner image exists and validates locally
- `authorized_after_future_cutover` -> requires a separate approved change outside this feature
