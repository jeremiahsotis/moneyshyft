# Implementation Checklist - Migration Runner

## App structure
- [ ] `apps/migration-runner` created
- [ ] package manifest added
- [ ] knexfile added
- [ ] Dockerfile added

## Runner behavior
- [ ] uses `DATABASE_URL`
- [ ] reads only `shared/database/migrations`
- [ ] runs `knex migrate:latest`
- [ ] exits
- [ ] serves no HTTP traffic

## Boundary enforcement
- [ ] runtime APIs remain blocked from production migration execution
- [ ] migration-runner documented as the eventual authorized runner
- [ ] phase ordering with convergence work documented

## Guardrails
- [ ] PR template added
