# Database Ownership and Migration Authority

## Current authoritative rule

For spec 001 deployment hardening, the following rule is mandatory:
- shared host-managed PostgreSQL is the single production database authority
- `admin-api` is the authoritative production migration runner
- `admin-api` is the only production seed runner
- `moneyshyft-api` does not run migrations in production
- `connectshyft-api` does not run migrations in production
- production migration execution happens once, from one authority only (`admin-api`)
- lane APIs connect through environment-defined DB variables; secrets are externalized and not committed

## Why this is necessary

The current repo shape suggests migration duplication across apps against one shared database. That is a drift risk.

## Permanent fix required

Create one shared DB authority, either:
- `packages/platform-db`
- or top-level `/db`

That authority owns:
- `migrations`
- `seeds`
- `knexfile`
- root-level migration scripts

## Required root scripts

Example names:
- `db:migrate`
- `db:migrate:prod`
- `db:rollback`
- `db:seed`
- `db:seed:prod`

## CI guardrail

Fail CI if new files appear under:
- `apps/*/src/migrations`
- `apps/*/src/seeds`

## Definition of done

- one migration tree
- one seed tree
- one production migration command
- no app-local schema ownership drift
