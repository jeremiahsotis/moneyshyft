# Database Ownership and Migration Authority

## Current temporary rule

Until shared DB ownership is centralized:
- `admin-api` is the only production migration runner
- `admin-api` is the only production seed runner
- production never runs migration commands from MoneyShyft or ConnectShyft independently

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
