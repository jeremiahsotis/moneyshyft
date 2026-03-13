# Shared Migration Authority Contract

Status: Governing contract

## Decision

Use Model B:
- shared migration ownership
- one authorized production runner
- runtime APIs never act as production migration authorities

## Scope

This contract governs:
- migration file ownership
- migration execution authority
- reconciliation against production ledger
- treatment of manual hotfixes

## Core rules

1. Production migrations may be executed by exactly one authorized runner.
2. Shared database migrations must live in `shared/database/migrations`.
3. API-local migration folders are non-authoritative inputs during convergence only.
4. Runtime APIs must not be the only place where a production-required migration exists.
5. Any migration required by runtime code must be available to the authorized production runner before deploy.
6. Manual production SQL hotfixes must be reconciled into `public.knex_migrations` only after verification.
7. Deploy order for schema-dependent releases is:
   1. build
   2. reconcile migration manifests
   3. run shared migrations once
   4. deploy runtime containers
   5. run smoke checks

## Required authoritative locations

- `shared/database/migrations`
- `shared/database/reconciliation/migration-manifest-overrides.json`

## Required comparison inputs

- `apps/admin-api/src/migrations`
- `apps/moneyshyft-api/src/migrations`
- `apps/connectshyft-api/src/migrations`
- `shared/database/migrations`
- `public.knex_migrations`

## Required classifications

- `recorded_and_present`
- `duplicate_across_apis`
- `ready_to_promote_to_shared`
- `ready_to_run`
- `manual_hotfix_needs_mark_applied`
- `recorded_but_missing_from_source`
- `blocked`

## Current known hotfixes requiring reconciliation

- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js`
- `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js`
