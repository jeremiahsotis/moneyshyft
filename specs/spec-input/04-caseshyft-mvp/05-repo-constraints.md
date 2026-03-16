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

Planned central internal platform surface:
- shyftunity-web

## Important constraints

- ConnectShyft is already live and should remain the communication ingestion runtime
- PeopleCore should exist enough to support subject linkage
- CaseShyft MVP must land before Documents/Evidence/Eligibility/ResourceShyft in the current delivery sequence
- later modules must be able to attach to the case model without rework
- all new work must preserve extraction-ready boundaries

## Live-product constraints

- case creation from triage should be safe and staged
- communication linking must not break current ConnectShyft behavior
- rollout may need to support initial internal-only MVP

## Migration constraints

Expected schema work includes:
- case
- case notes
- case tasks
- case service items
- case communication links
- assignment fields