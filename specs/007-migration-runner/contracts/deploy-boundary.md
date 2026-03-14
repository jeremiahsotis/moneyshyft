# Contract - Deploy Boundary and Non-Goals

## Current Authority

- `admin-api` remains the currently authorized production migration runner in this phase.
- Shared migration ownership remains governed by `shared/database/migrations`.
- Reconciliation and manual-hotfix handling remain unchanged.

## Boundary Rules

- `migration-runner` prepares a future execution vehicle only.
- This feature must not operationally cut production migration authority over from `admin-api`.
- `admin-api`, `money-api`, and `connect-api` runtime containers must not gain new production migration authority from this work.
- `money-api` and `connect-api` production blockers must remain intact.

## Deploy Sequence

The current production deploy order remains:

1. build artifacts/images
2. reconcile migration manifests
3. run shared migrations once from `admin-api`
4. deploy runtime containers
5. smoke checks

This feature may add documentation about future cutover readiness, but it must not change the current production command.

## Non-Goals

- No migration ownership redesign
- No reconciliation redesign
- No manual-hotfix automation changes
- No HTTP server
- No public port exposure
- No production SQL execution during planning or validation

## Readiness Evidence Required

Before a later cutover can be proposed, this feature must provide evidence that:
- the dedicated image exists and builds
- the runner can resolve only `shared/database/migrations`
- the runner command is explicit and reproducible
- runtime APIs remain blocked from production migration execution
