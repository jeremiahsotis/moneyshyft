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

- Eligibility Engine should already exist enough to support fit or requirement-aware display
- ResourceShyft must remain usable even when no completed screening exists
- service discovery should be useful for staff before public-facing release
- migration-runner is the migration path and should be used consistently
- all new work must preserve extraction-ready boundaries

## Live-product constraints

- no breaking changes should impact existing live ConnectShyft or MoneyShyft functionality
- rollout may start as internal-only service discovery

## Migration constraints

Expected schema work includes:
- organization
- service_location
- service_offering
- service_requirement_profile
- service_availability
- search metadata / projections
- service freshness tracking