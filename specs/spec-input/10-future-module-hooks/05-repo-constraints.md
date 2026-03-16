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

Near-term planned domains:
- PeopleCore
- CaseShyft
- Documents + Evidence
- Eligibility
- ResourceShyft
- ProgramShyft
- FinanceCore

## Important constraints

- do not overbuild speculative future product logic
- create only the seams needed now
- migration-runner is the migration path and should be used consistently
- all hook contracts must remain extraction-ready
- current domains should not become polluted with future-module business logic

## Migration constraints

Schema additions should be minimal and only where needed for stable hook persistence or event tracking.
If hooks can be expressed cleanly as event contracts without heavy schema, prefer that.