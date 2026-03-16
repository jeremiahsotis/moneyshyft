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

- Documents + Evidence should already exist or be landing alongside this work
- Eligibility must consume evidence/document layers without owning them
- ResourceShyft and ProgramShyft will depend on this work later
- migration-runner is the migration path and should be used consistently
- all new work must preserve extraction-ready boundaries

## Live-product constraints

- no breaking changes should impact existing live ConnectShyft or MoneyShyft functionality
- rollout may begin with internal case/program/service workflows first

## Migration constraints

Expected schema work includes:
- screening_subject
- eligibility_policy
- policy_requirement
- screening_request
- screening_result
- screening_explanation_item
- screening_override