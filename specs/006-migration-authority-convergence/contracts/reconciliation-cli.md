# Contract - Shared Migration Reconciliation CLI

## Command

`node scripts/reconcile-shared-migrations.js`

## Purpose

Inventory API-local migration folders plus shared authority, optionally compare them with `public.knex_migrations`, and emit a normalized reconciliation report for operator review.

## Canonical Matching Rule

Reconciliation MUST compare migrations by `logicalId`, defined as the migration basename without extension.

Examples:
- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.ts`
- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js`

These map to the same logical migration.

Override manifests are keyed by canonical production filename (`*.js`). The reconciliation tool MUST derive `logicalId` from that key, compare all locations by `logicalId`, preserve exact source filenames per location, preserve the exact ledger name from `public.knex_migrations`, and emit canonical `.js` names when generating mark-applied SQL suggestions.

## Inputs

- Filesystem sources:
  - `apps/admin-api/src/migrations`
  - `apps/moneyshyft-api/src/migrations`
  - `apps/connectshyft-api/src/migrations`
  - `shared/database/migrations`
  - `shared/database/reconciliation/migration-manifest-overrides.json`
- Optional database input:
  - `--db <postgres-connection-string>` or `DATABASE_URL`

## Options

- `--format table`
  - Human-readable console table.
- `--format markdown`
  - Markdown report for PRs/docs.
- `--format json`
  - Machine-readable output for guardrails and CI.

## Output Row Schema

- `logicalId`
- `adminFileName`
- `moneyFileName`
- `connectFileName`
- `sharedFileName`
- `recordedLedgerName`
- `classification`
- `manualHotfixVerified`
- `inspectionRequired`
- `markAppliedSqlSuggestion`

## Classification Rules

- `recorded_and_present`
  - Ledger contains the migration and at least one authoritative or convergence source exists.
- `duplicate_across_apis`
  - Multiple API-local copies exist while shared authority is still absent for that logical migration.
- `ready_to_promote_to_shared`
  - API-local source exists, shared authority does not, and the migration is not recorded.
- `ready_to_run`
  - Shared authority contains the migration and the ledger does not.
- `manual_hotfix_needs_mark_applied`
  - Verified override exists, production ledger does not, and rerun would be unsafe.
- `blocked`
  - Includes any inspection-required migration that has not yet been resolved by operator review.
- `recorded_but_missing_from_source`
  - Ledger contains the migration but no source location does.

## Exit Behavior

- Exit `0`
  - Reconciliation completed successfully.
- Exit non-zero
  - Invalid arguments, unreadable override manifest, DB connection failure when DB mode is requested, or irrecoverable source parsing failure.

## Safety Rules

- The CLI must never execute migrations.
- The CLI must never modify `public.knex_migrations`.
- Any mark-applied SQL is suggestion text only.
- When `inspectionRequired=true`, the CLI must not infer `manual_hotfix_needs_mark_applied` or `ready_to_run` automatically.
