# Dedicated Migration Runner Architecture

Status: Supporting architecture note

## Goal

Replace `admin-api` as the long-term execution vehicle for production migrations without changing the shared migration authority model.

## Design

A tiny dedicated deployable:
- has no HTTP server
- uses the production DB connection
- points only at `shared/database/migrations`
- runs `knex migrate:latest`
- exits

## Relationship to convergence work

This does not replace migration authority convergence.

Required order:
1. converge migration ownership into shared authority
2. reconcile production ledger and manual hotfixes
3. update the authorized runner to use shared authority
4. optionally replace `admin-api` runner with dedicated `migration-runner`

## Current phase boundary

This feature prepares and validates `migration-runner` as a future execution vehicle only.

- `admin-api` remains the sole active production migration runner in this phase.
- `migration-runner` must not be added to the active production deploy path in this phase.
- Any operational cutover from `admin-api` to `migration-runner` requires a separate explicit change after this feature lands.

## Recommended repo structure

```text
apps/migration-runner/
  Dockerfile
  package.json
  knexfile.js
```

## Future cutover deploy flow

1. build migration-runner image
2. execute migration-runner once
3. deploy runtime APIs
4. run smoke checks

## Current phase deploy flow

Until explicit cutover:

1. build artifacts/images
2. reconcile migration manifests
3. run shared migrations once from `admin-api`
4. deploy runtime APIs
5. run smoke checks

## Non-negotiables

- migration-runner must use only shared migration authority
- runtime APIs remain blocked from production migration execution
- migration-runner must not bypass reconciliation review
