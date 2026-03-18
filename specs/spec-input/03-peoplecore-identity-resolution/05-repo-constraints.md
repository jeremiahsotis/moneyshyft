# Repo Constraints

## Existing structure

Active runtime components already exist:
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

## Important constraints

- PeopleCore and Identity Resolution likely land in the broader platform backend / admin-api expansion path first
- connectshyft-api and future case/program flows will depend on stable subject references
- the shell will need subject search and creation surfaces later
- migration-runner is the migration path and should be used consistently
- all new work must preserve extraction-ready boundaries

## Live-product constraints

- ConnectShyft is already live and must not be broken by subject linkage work
- PeopleCore should be staged so lookup/creation can be integrated progressively
- no cross-tenant data leakage can be introduced during identity work

## Migration constraints

Expected schema work includes:
- people
- households
- household membership
- addresses
- relationships
- identity clusters
- aliases
- match candidates
- merge event audit records