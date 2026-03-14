# Spec - Dedicated Migration Runner

Status: Ready for Speckit

## Governing contracts

- `architecture/database/shared-migration-authority-contract.md`
- `architecture/database/migration-runner-architecture.md`

## Supporting files required

- `specs/007-migration-runner/bootstrap-prompts.md`
- `specs/007-migration-runner/implementation-checklist.md`
- `.github/pull_request_template/migration-runner.md`

## Problem statement

`admin-api` currently acts as the only authorized production migration runner. That is acceptable short-term, but it couples runtime admin responsibilities with database migration execution.

## Outcome

Create a dedicated `migration-runner` deployable that:
- uses `DATABASE_URL`
- reads only `shared/database/migrations`
- runs `knex migrate:latest`
- exits
- does not serve HTTP traffic
- does not replace migration authority convergence
- does not bypass reconciliation review

## Scope

In scope:
- `apps/migration-runner/`
- Dockerfile
- package manifest
- knex config for shared migration authority
- execution docs
- PR template

Out of scope:
- changing migration ownership model
- allowing runtime APIs to run production migrations
- automatic reconciliation of manual hotfixes
- seeds in production
- operationally cutting production migration execution over from `admin-api`

## Platform Boundary Compatibility

- Routing ownership is unchanged in this phase:
  - `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain owned by `admin-api`
  - all other lane `/api` routes remain lane-owned
- Lane APIs remain isolated and do not gain any new cross-lane runtime dependency.
- Shared Postgres compatibility is preserved:
  - `shared/database/migrations` remains the only authoritative migration source
  - `admin-api` remains the current authorized production migration runner until a separate explicit cutover change
- `migration-runner` is introduced only as a future execution vehicle and must not be read as an active production cutover in this feature.

## Functional requirements

### FR-1 Dedicated deployable
A small dedicated migration-runner app/container must exist.

### FR-2 Shared authority only
The runner must source migrations only from `shared/database/migrations`.

### FR-3 No HTTP server
The runner must run migrations and exit.

### FR-4 Production boundary
The runner must preserve the rule that runtime APIs do not execute production migrations.

### FR-5 Deploy integration
This phase must preserve the current production deploy order:
1. build
2. reconcile migration manifests
3. run shared migrations once from `admin-api`
4. deploy runtime containers
5. smoke checks

The runner introduced by this feature must be ready for a later cutover, but this feature must not change the current production command.

### FR-6 Future-runner readiness without cutover
The implementation must prove that `migration-runner` can resolve and load shared TypeScript migrations inside its final image layout without making `migration-runner` a second active production runner.

## Acceptance criteria

- `apps/migration-runner` exists
- runner reads `shared/database/migrations`
- runner can execute `knex migrate:latest`
- runner is documented as phase 2 after migration authority convergence
- `admin-api` remains the current authorized production migration runner in this phase
- the final runner image layout is explicit enough to prove `knexfile.js` resolves the correct shared migration directory
- container validation proves runtime `ts-node/register` can load a shared TypeScript migration from the final packaged image
