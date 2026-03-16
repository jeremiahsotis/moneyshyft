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

- ConnectShyft is already live and remains the communications runtime
- PeopleCore should already exist enough to support participant linkage
- Eligibility and Documents/Evidence should be consumable by this work, not reimplemented
- ProgramShyft must preserve clean seams for future expansion and future module interaction
- migration-runner is the migration path and should be used consistently
- all new work must preserve extraction-ready boundaries

## Live-product constraints

- no breaking changes should impact existing live MoneyShyft or ConnectShyft functionality
- rollout may begin with internal program operations before broader partner-facing use

## Migration constraints

Expected schema work includes:
- program
- program_session
- program_cohort
- program_participant
- program_attendance
- program_milestone
- program_communication_link
- program_requirement_profile