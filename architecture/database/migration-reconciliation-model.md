# Migration Reconciliation Model

Status: Supporting architecture note

## Goal

Compare four source-of-truth views:
1. admin-api migration source
2. money-api migration source
3. connect-api migration source
4. shared migration authority

against:
5. `public.knex_migrations`

## Canonical comparison rule

Compare migrations by logical migration identity, where the logical identity is the basename without extension.

Examples:
- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.ts`
- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js`

These refer to the same migration.

Override manifests remain keyed by canonical production `.js` filenames. Reconciliation derives logical identity from that key, compares all locations by logical identity, and preserves exact source filenames plus exact ledger names in output.

## Output model

For each logical migration:
- present in admin-api?
- present in money-api?
- present in connect-api?
- present in shared?
- recorded in production?
- exact source filenames by location
- exact ledger name
- classification

## Reconciliation rules

### recorded_and_present
Recorded in production and present in shared authority or current source set.

### duplicate_across_apis
Present in multiple API-local folders but not yet promoted to shared authority.

### ready_to_promote_to_shared
Exists in one or more API-local folders, not recorded, and not yet present in shared authority.

### ready_to_run
Present in shared authority, not recorded in production.

### manual_hotfix_needs_mark_applied
Production schema already matches migration intent, but `public.knex_migrations` does not contain the migration.

### recorded_but_missing_from_source
Migration ledger contains a migration that is absent from all source locations.

### blocked
State cannot be safely resolved without operator review.

## Manual hotfix override model

```json
{
  "migration-file-name.js": {
    "manualHotfixVerified": true,
    "inspectionRequired": false,
    "note": "Production schema patched manually. Verify before mark-applied."
  }
}
```

## Required outputs

- human-readable report
- machine-readable report
- mark-applied SQL suggestions for verified manual hotfixes
- explicit list of migrations ready to copy into shared authority
- explicit list of migrations ready to run after promotion
