# Architecture Context

## Existing system

These components already exist and are operational:

- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

Planned or preceding foundational work:
- shell foundation
- PeopleCore + Identity Resolution
- ConnectShyft omnichannel triage
- CaseShyft MVP
- Documents + Evidence Layer

## Locked platform facts

- Eligibility consumes Documents and Shared Evidence; it does not own them
- Eligibility evaluates policy logic; it does not own referrals
- Referral later consumes eligibility results; it does not evaluate policy rules itself
- screening subjects must be flexible enough to support people, households, cases, program participants, and future contexts
- override behavior must be configurable and auditable
- all new work must be extraction-ready for future lane or service separation

## Ownership

Eligibility owns:
- screening subject abstraction
- eligibility policy
- policy requirements / rule structure
- screening request
- screening result
- explanation payloads
- override records
- result validity / status

## What it integrates with

- PeopleCore for subject references
- Documents + Evidence for reusable facts and document-backed support
- CaseShyft for case-based screening
- future ResourceShyft service matching
- future ProgramShyft enrollment
- future Referral workflows
- shell auth / permissions / tenant context

## What it must NOT own

- document storage
- evidence storage
- case business logic
- program business logic
- referral lifecycle logic
- communication ingestion
- identity resolution logic

## Extraction readiness

The design must preserve clean seams for future separation into:
- policy registry service
- screening service
- explanation service
- override/review service