# Contract - Authorized Runner and Guardrails

## Authorized Runner

- Production migration execution remains owned by `admin-api` for this convergence phase.
- The production command remains `docker compose run --rm admin-api npm run migrate:latest:prod`.
- `admin-api` must read shared migration authority only for production migration execution.
- `admin-api` production artifacts must contain runnable JavaScript shared migrations at `dist/shared/database/migrations` before the runner is considered valid.
- `money-api` and `connect-api` remain blocked from production migration and seed commands.

## Shared Authority Rules

- `shared/database/migrations` is the authoritative production migration source.
- API-local migration folders remain temporary convergence inputs and must not be treated as production authority.
- Migration filenames and ordering must be preserved during promotion.

## PR Guardrails

- A PR that adds or changes a production-relevant migration must also update shared authority before merge.
- Reconciliation output must be reviewable in human-readable and machine-readable form.
- Manual-hotfix overrides must be explicit and verified; pending inspections must not be auto-marked as verified.
- PR review must fail through a machine-enforced reconciliation gate when reconciliation reports any `blocked`, `duplicate_across_apis`, `ready_to_promote_to_shared`, or `recorded_but_missing_from_source` rows for production-relevant migrations.
- Promotion into shared authority must be backed by ordered-basename and content-hash verification evidence.

## Deploy Guardrails

- Required deploy order:
  1. build artifacts
  2. reconcile manifests
  3. run shared migrations once from the authorized runner
  4. deploy runtime containers
  5. run smoke checks
- Deploy docs must continue to prohibit direct mutation of `public.knex_migrations` during this automation phase.
- Production migration execution must stop pending operator review if reconciliation reports any `blocked`, `duplicate_across_apis`, `ready_to_promote_to_shared`, or `recorded_but_missing_from_source` rows.
- `ready_to_run` is the only acceptable unrecorded execution state for migrations intended to be executed by the authorized runner.
- The authorized runner is not valid until runtime-image verification confirms `dist/shared/database/migrations` exists inside the built admin-api artifact/container.
