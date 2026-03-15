# Contract: Migration Execution

## Purpose

Define the canonical production migration execution boundary during and after convergence.

## Shared schema authority

- `shared/database/migrations` is the only authoritative production migration source.

## Canonical execution target

- End state: `apps/migration-runner` is the canonical production migration execution surface.

## Transitional rule

- Until governance is aligned, `admin-api` may remain the active production runner only as an explicit transitional exception.
- Feature runtime APIs must remain blocked from production migration execution throughout all phases.

## Prohibited end-state conditions

- `moneyshyft-api` production migration execution
- `connectshyft-api` production migration execution
- lane-local production migration directories treated as authoritative
- dual active production runners after cutover

## Cutover precondition

- Constitution amendment or approved exception must exist before the active runner changes from `admin-api` to `migration-runner`.

## Verification

- Production migration commands resolve only through `migration-runner` after cutover.
- Feature runtime migration guards explicitly reject production execution.
- Build and image wiring for `migration-runner` resolve `/app/shared/database/migrations`.
