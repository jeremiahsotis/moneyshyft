# Data Model - Migration Authority Convergence

## Entity: Migration Artifact

- Purpose: Represents one migration file as it exists in a source location.
- Fields:
  - `logicalId`: migration basename without extension, for example `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity`
  - `fileName`: actual filename in that location, for example `.ts` in source or `.js` in production-oriented packaging
  - `location`: one of `admin`, `money`, `connect`, `shared`, `ledger`
  - `absolutePath`: repo path for filesystem-backed locations
  - `extension`: `ts` or `js`
  - `contentHash`: optional hash for duplicate verification across source folders
- Relationships:
  - Many `Migration Artifact` rows can map to one `Reconciliation Row`.

## Entity: Ledger Record

- Purpose: Represents one row observed in `public.knex_migrations`.
- Fields:
  - `logicalId`
  - `ledgerName`: exact value stored in `public.knex_migrations.name`
  - `batch`
  - `migrationTime`
- Relationships:
  - Zero or one `Ledger Record` maps to a `Reconciliation Row` for the same logical migration.

## Entity: Reconciliation Override

- Purpose: Captures verified manual-hotfix metadata that changes how reconciliation classifies a migration.
- Fields:
  - `canonicalProductionFileName`: `.js` migration name used for production-facing comparison
  - `logicalId`
  - `manualHotfixVerified`: boolean
  - `inspectionRequired`: boolean
  - `note`: operator-facing verification note
- Validation rules:
  - `manualHotfixVerified=true` is allowed only for migrations that operators have already confirmed were applied manually.
  - `inspectionRequired=true` means the migration requires operator verification before it may be treated as `manual_hotfix_needs_mark_applied` or `ready_to_run`.
  - `manualHotfixVerified` and `inspectionRequired` must not both be `true` for the same migration.
  - Overrides must not imply automatic ledger mutation.

## Entity: Reconciliation Row

- Purpose: Final normalized comparison output for one migration.
- Fields:
  - `logicalId`
  - `sourceFiles`: map of `admin`, `money`, `connect`, `shared` to exact filename or null
  - `canonicalProductionFileName`
  - `presentInAdmin`
  - `presentInMoney`
  - `presentInConnect`
  - `presentInShared`
  - `recordedInProduction`
  - `recordedLedgerName`
  - `classification`
  - `overrideApplied`
  - `markAppliedSqlSuggestion`: nullable string
- Allowed `classification` values:
  - `recorded_and_present`
  - `duplicate_across_apis`
  - `ready_to_promote_to_shared`
  - `ready_to_run`
  - `manual_hotfix_needs_mark_applied`
  - `recorded_but_missing_from_source`
  - `blocked`
- Validation rules:
  - `manual_hotfix_needs_mark_applied` requires a verified override and no recorded ledger row.
  - `blocked` applies to any migration with `inspectionRequired=true` and no recorded ledger row until operator review resolves it.
  - `ready_to_run` requires presence in shared authority and absence from the recorded ledger set.
  - `duplicate_across_apis` applies only to non-shared API-local duplicates during convergence.

## Entity: Authorized Runner Configuration

- Purpose: Defines the single production migration executor for the current phase.
- Fields:
  - `serviceName`: `admin-api`
  - `productionCommand`: `npm run migrate:latest:prod`
  - `productionMigrationDirectory`: packaged shared migration path consumed by Knex
  - `authorityMode`: `shared_only`
  - `blockedLaneRunners`: `money-api`, `connect-api`
- Validation rules:
  - Only one runner may be marked authorized in production.
  - The authorized runner must not read lane-local production migrations once convergence is complete.

## State Transitions

- `ready_to_promote_to_shared` -> `ready_to_run`
  - Trigger: migration file is added to shared authority and remains unrecorded in production.
- `ready_to_run` -> `recorded_and_present`
  - Trigger: authorized runner executes migration or operator later observes the ledger row.
- `manual_hotfix_needs_mark_applied` -> `recorded_and_present`
  - Trigger: operator verifies production state and later records the migration in `public.knex_migrations`.
- `blocked` -> `manual_hotfix_needs_mark_applied`
  - Trigger: operator confirms an inspection-required hotfix was already applied manually.
- `blocked` -> `ready_to_run`
  - Trigger: operator confirms an inspection-required hotfix is not present in production and should be executed by the authorized runner.
- `recorded_but_missing_from_source` -> `recorded_and_present`
  - Trigger: missing authoritative source file is restored.
- Any state -> `blocked`
  - Trigger: inconsistent filename mapping, override mismatch, or ambiguous source/ledger state that cannot be resolved safely.
