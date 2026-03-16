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
- Eligibility Engine
- ResourceShyft

## Locked platform facts

- ProgramShyft is an operational workspace for structured programs
- ProgramShyft does not own identity, communications ingestion, document storage, evidence storage, or eligibility rules
- ConnectShyft remains the communications runtime and ProgramShyft consumes program-linked communication context
- Eligibility and Documents/Evidence are consumed for enrollment and participation decisions, not owned here
- ProgramShyft must support flexible program structures without becoming hard to use
- all new work must be extraction-ready for future lane or service separation

## Ownership

ProgramShyft owns:
- program record
- program configuration
- participation model
- cohort and session records
- attendance
- milestones / progress markers
- program workspace
- program-linked communication context display and actions
- enrollment workflow state

## What it integrates with

- PeopleCore for participant linkage
- ConnectShyft for program-linked communications
- Eligibility Engine for enrollment / requirement checks
- Documents + Evidence for required document/evidence visibility
- CaseShyft for case-to-program transitions where relevant
- shell auth / permissions / tenant context

## What it must NOT own

- communications ingestion
- person/household identity logic
- document storage or verification
- evidence storage
- eligibility rule execution
- referral lifecycle logic
- finance workflows
- volunteer management as a separate domain beyond program participation support

## Extraction readiness

ProgramShyft should be designed so it can later become:
- a separate lane
- a dedicated service
- an independently routed frontend module

without rewriting the core program model.