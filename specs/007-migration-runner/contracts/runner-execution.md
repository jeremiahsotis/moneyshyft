# Contract - Dedicated Migration Runner Execution

## App Shape

The dedicated runner is a minimal JS-only deployable with exactly these app-owned files:

```text
apps/migration-runner/
  Dockerfile
  knexfile.js
  package.json
```

No `src/`, `dist/`, HTTP server, or runtime application code is allowed.

## Runtime Image Layout

The Docker image must place files at:

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

`shared/database/migrations` is the only allowed production migration source in the image.

## Knex Configuration Contract

- Knex must read `DATABASE_URL`.
- Knex must use `knex_migrations` as the migration table.
- Knex must resolve migrations from:

```js
path.join(__dirname, 'shared', 'database', 'migrations')
```

- The config must use `extension: 'ts'`.
- The config must not reference:
  - `apps/admin-api/src/migrations`
  - `apps/moneyshyft-api/src/migrations`
  - `apps/connectshyft-api/src/migrations`
  - `dist/shared/database/migrations`

## Execution Command Contract

The runner command is:

```bash
NODE_ENV=production node -r ts-node/register ./node_modules/knex/bin/cli.js --knexfile knexfile.js --env production migrate:latest
```

Behavior requirements:
- runs once
- executes `knex migrate:latest`
- exits
- serves no HTTP traffic

## Dependency Contract

Required runtime dependencies:
- `dotenv`
- `knex`
- `pg`
- `ts-node`
- `typescript`

The image install command may use:

```bash
npm ci --omit=dev
```

only because `ts-node` and `typescript` are required runtime dependencies and must live under `dependencies`.

## Validation Contract

The runner is not valid until all of the following are true:
- the image builds from repo-root context
- `/app/shared/database/migrations` exists inside the container
- the runner command resolves the shared migration path successfully
- no HTTP port is exposed or served
