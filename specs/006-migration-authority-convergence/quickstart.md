# Quickstart - Migration Authority Convergence

## Goal

Validate that production migration authority has moved to shared ownership while `admin-api` remains the single authorized production runner.

## Preconditions

- Shared authority exists at `shared/database/migrations`.
- The reconciliation override manifest exists at `shared/database/reconciliation/migration-manifest-overrides.json`.
- `admin-api` production Knex configuration points at packaged shared migrations.
- `admin-api` production artifacts contain runnable JavaScript shared migrations at `dist/shared/database/migrations`.
- `money-api` and `connect-api` remain blocked from production migration execution.

## Local Validation

1. Run source-only reconciliation:

```bash
cd /Users/jeremiahotis/projects/connectshyft
node scripts/reconcile-shared-migrations.js --format table
```

2. Confirm expected classifications:

- the former lane-only migrations are no longer `ready_to_promote_to_shared`
- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity` is represented as a manual-hotfix candidate when not recorded
- `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index` remains `blocked` as inspection-required until operator review resolves it and must not be auto-classified as already applied

3. Produce machine-readable output for guardrails:

```bash
cd /Users/jeremiahotis/projects/connectshyft
node scripts/reconcile-shared-migrations.js --format json
```

4. Verify promotion integrity:

- confirm the 56 shared admin/money/connect migrations match by ordered basename and content hash before copying into `shared/database/migrations`
- confirm the promoted 60-file authoritative set preserves filename ordering exactly
- fail the promotion if any of the 56 shared migrations differ by hash across lanes

## Optional Ledger Comparison

Use this only against an approved non-production copy or a read-only production connection workflow. This plan does not authorize ledger mutation.

```bash
cd /Users/jeremiahotis/projects/connectshyft
DATABASE_URL='postgresql://read-only-user:password@host:5432/dbname' \
node scripts/reconcile-shared-migrations.js --format markdown
```

Validate that DB-backed output preserves:
- `logicalId`
- exact per-location source filenames
- exact `recordedLedgerName`
- correct transitions among `recorded_and_present`, `ready_to_run`, `manual_hotfix_needs_mark_applied`, and `blocked`

## Deploy Sequence After Implementation

```bash
cd /Users/jeremiahotis/projects/connectshyft

# 1) Build images or artifacts
# 2) Reconcile migration manifests
node scripts/reconcile-shared-migrations.js --format markdown

# 3) Run migrations once from the single authorized runner
docker compose run --rm admin-api npm run migrate:latest:prod

# 4) Start runtime containers
docker compose up -d admin-api moneyshyft-api connectshyft-api
```

## Safety Checks

- Do not run production migrations from `money-api` or `connect-api`.
- Do not execute suggested mark-applied SQL from the reconciliation tool automatically.
- Stop deploy execution if reconciliation reports any `blocked`, `duplicate_across_apis`, `ready_to_promote_to_shared`, or `recorded_but_missing_from_source` items.
- Treat `ready_to_run` as the only acceptable unrecorded execution state for migrations intended to be run by `admin-api`.
- Preserve existing convergence scaffolding additively and document before/after diffs for touched scaffolding files.
- Validate both the local admin build output and the runtime image/container filesystem before treating packaged shared migrations as production-ready.

## Implementation Evidence

### Before-State Scaffold Review

- Reviewed and extended existing convergence scaffolding in `shared/database`, `scripts/reconcile-shared-migrations.js`, `.github/pull_request_template/migration-authority-convergence.md`, `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`, and `docs/DEPLOYMENT_CHECKLIST.md`.
- Preserved API-local migration folders as non-authoritative inputs; promoted shared authority additively under `shared/database/migrations`.
- Root ignore files already covered Node/Docker/ESLint outputs; no ignore-file changes were required.

### Promotion Integrity Evidence

- Inventory counts verified before promotion:
  - `apps/admin-api/src/migrations`: 56
  - `apps/moneyshyft-api/src/migrations`: 56
  - `apps/connectshyft-api/src/migrations`: 60
  - `shared/database/migrations`: 60
- Ordered basename verification passed:
  - 56 common admin/money/connect basenames matched exactly
  - 4 ConnectShyft-only basenames promoted unchanged:
    - `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.ts`
    - `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.ts`
    - `20260311110000_create_connectshyft_bridge_sessions.ts`
    - `20260312120000_add_connectshyft_communication_reliability.ts`
- Content-hash verification passed:
  - `hashMismatches: []`
  - representative shared hashes:
    - `001_initial_schema.ts`: `d56cf530ce3b450e4b545ed5660c9e76aa9e4a821222cf7072e1b1a7cc6f9d5b`
    - `002_update_section_types.ts`: `59a7d7ac2306ccd4fd1eb1f3fb999752728701df108c1c520eda2414a2cd0dd4`
    - `003_add_income_tracking.ts`: `d2eeb454003dbdd9b3f3557b19383fe597976d8364ba0e10bca0d2fa0123e72d`
    - `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.ts`: `b0b8343d3c998ddb0dfa78df8f15bef305505a29de49a82c9c3876151b78f8c1`
    - `20260311110000_create_connectshyft_bridge_sessions.ts`: `e6da2ecaf1cad2a6a368c11b1d919bdef854dc857eebf013b8d213e83918bff3`
    - `20260312120000_add_connectshyft_communication_reliability.ts`: `5f33947df4debc69ccd44db79b302aaf56f3977d4d3f1b28a7412437c8b79845`

### Reconciliation Evidence

- Source-only reconciliation commands executed:

```bash
node scripts/reconcile-shared-migrations.js --format table
node scripts/reconcile-shared-migrations.js --format markdown
node scripts/reconcile-shared-migrations.js --format json
node scripts/reconcile-shared-migrations.js \
  --format json \
  --fail-on-states blocked,duplicate_across_apis,ready_to_promote_to_shared,recorded_but_missing_from_source
```

- Source-only summary:
  - `ready_to_run`: 58
  - `manual_hotfix_needs_mark_applied`: 1
  - `blocked`: 1
- Expected incident handling confirmed:
  - `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity` -> `manual_hotfix_needs_mark_applied`
  - `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index` -> `blocked`
- Guard command intentionally exited non-zero because the inspection-required index migration remains `blocked`.
- Mark-applied SQL output is suggestion text only and was not executed.
- DB-backed reconciliation executed against the local non-production `moneyshyft_ci` ledger:

```bash
env DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
node scripts/reconcile-shared-migrations.js --format json
```

- Non-production ledger evidence:
  - `ledgerRowCount`: 56
  - summary:
    - `recorded_and_present`: 56
    - `manual_hotfix_needs_mark_applied`: 1
    - `blocked`: 1
    - `ready_to_run`: 2
  - representative `recordedLedgerName` matches:
    - `001_initial_schema` -> `001_initial_schema.ts`
    - `002_update_section_types` -> `002_update_section_types.ts`
    - `003_add_income_tracking` -> `003_add_income_tracking.ts`
    - `20260309143000_repoint_platform_tenant_foreign_keys` -> `20260309143000_repoint_platform_tenant_foreign_keys.ts`
  - incident migrations remained safe under DB-backed comparison:
    - `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity` -> `manual_hotfix_needs_mark_applied`
    - `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index` -> `blocked`
  - `recorded_but_missing_from_source`: none in the non-production ledger sample

### Authorized Runner Evidence

- `apps/admin-api/knexfile.js` production migrations now point at `dist/shared/database/migrations`.
- `apps/admin-api/package.json` now runs `node ./scripts/packageSharedMigrations.js` as part of `npm run build`.
- Direct packaging verification succeeded:
- Build-path packaging verification succeeded:

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api
npm ci
npm run build
```

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api
node ./scripts/packageSharedMigrations.js
```

- Packaged shared authority result:
  - `apps/admin-api/dist/shared/database/migrations`: 60 runnable `.js` files
  - first packaged files:
    - `001_initial_schema.js`
    - `002_update_section_types.js`
    - `003_add_income_tracking.js`
    - `004_add_debt_tracking.js`
    - `004_add_envelope_budgeting.js`
  - last packaged files:
    - `20260309143000_repoint_platform_tenant_foreign_keys.js`
    - `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js`
    - `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js`
    - `20260311110000_create_connectshyft_bridge_sessions.js`
    - `20260312120000_add_connectshyft_communication_reliability.js`
- `apps/moneyshyft-api/knexfile.js` and `apps/connectshyft-api/knexfile.js` still contain production blockers via `blockLaneProdMigrationExecution(...)`.
- Docker/runtime-image validation succeeded after switching the `admin-api` image build to repo-root context so `shared/database` is available during image build:

```bash
docker build -f apps/admin-api/Dockerfile.production -t admin-api-migration-authority-check .
docker run --rm --entrypoint sh admin-api-migration-authority-check -lc \
  'test -d /app/dist/shared/database/migrations && find /app/dist/shared/database/migrations -maxdepth 1 -type f | sort | wc -l'
```

- Runtime container evidence:
  - `/app/dist/shared/database/migrations` exists
  - container file count: `60`
  - tail sample:
    - `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js`
    - `20260311110000_create_connectshyft_bridge_sessions.js`
    - `20260312120000_add_connectshyft_communication_reliability.js`

### Guardrail Evidence

- PR template updated to require:
  - shared-authority confirmation
  - reconciliation review in human and machine-readable forms
  - fail-review conditions for `blocked`, `duplicate_across_apis`, `ready_to_promote_to_shared`, and `recorded_but_missing_from_source`
- Deploy guide updated to require:
  - `build -> reconcile -> guard -> run once from admin-api -> deploy -> smoke`
  - no direct `public.knex_migrations` writes
  - no automatic execution of suggestion SQL
- Deployment checklist updated with the same stop conditions and runner expectations.

### Platform Compatibility Evidence

- Routing delegation remains unchanged in the deploy docs:
  - `/api/v1/auth/*` and `/api/v1/platform/admin/*` stay delegated to `admin-api`
  - lane-local `/api/*` routes remain lane-owned
- Canonical loopback port expectations remain unchanged:
  - `admin-api`: `3100`
  - `money-api`: `3000`
  - `connect-api`: `3002`
- Shared Postgres ownership remains unchanged:
  - all three APIs still target one shared PostgreSQL instance
  - only `admin-api` is authorized to execute production migrations

### Validation Notes

- `admin-api` build verification required:
  - installing `apps/admin-api` dependencies with `npm ci`
  - introducing `apps/admin-api/tsconfig.build.json` so production packaging excludes the test tree
- Runtime-image verification required updating the `admin-api` Docker build context to repo root and copying `shared/database` into the build stage.

### Safety Evidence

- No migrations were executed.
- `public.knex_migrations` was not modified.
- No production SQL was applied.
- Suggested mark-applied SQL remained operator-only output.

### Touched Files / Scaffolding Audit

- Added:
  - `shared/database/migrations/*`
  - `apps/admin-api/scripts/packageSharedMigrations.js`
- Updated in place:
  - `shared/database/reconciliation/migration-manifest-overrides.json`
  - `scripts/reconcile-shared-migrations.js`
  - `apps/admin-api/knexfile.js`
  - `apps/admin-api/package.json`
  - `apps/admin-api/tsconfig.build.json`
  - `apps/admin-api/Dockerfile.production`
  - `docker-compose.production.example.yml`
  - `specs/platform/contracts/docker-compose.production.shared.yml`
  - `.github/pull_request_template/migration-authority-convergence.md`
  - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
  - `docs/DEPLOYMENT_CHECKLIST.md`
- Existing convergence scaffolding was extended rather than replaced wholesale.
