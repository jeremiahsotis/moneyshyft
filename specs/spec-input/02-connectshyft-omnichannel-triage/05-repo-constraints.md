# Repo Constraints

## Existing structure

Active runtime components already exist:
- connectshyft-api
- connectshyft-web
- moneyshyft-api
- moneyshyft-web
- admin-api
- admin-web
- migration-runner

## Important constraints

- connectshyft-api and connectshyft-web are already operational
- channel expansion must not break existing communication flows
- channel ingestion and triage must remain extraction-ready
- no hidden coupling to future CaseShyft or ProgramShyft internal state
- PeopleCore may not be fully complete yet, so linkage must allow progressive integration
- migration-runner is the migration path and should be used consistently

## Live-product constraints

- communications handling is operationally sensitive
- regression risk is high for existing connectshyft users/workflows
- rollout should support staged channel activation if needed

## Migration constraints

Expected schema work includes:
- channel type expansion
- conversation/thread enhancements
- webchat session support
- website form submission records
- triage queue/assignment fields
- person/case/program linkage fields