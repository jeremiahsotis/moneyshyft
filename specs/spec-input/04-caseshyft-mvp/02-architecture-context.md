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

Planned foundational work before this:
- shell foundation
- PeopleCore + Identity Resolution
- ConnectShyft omnichannel triage

## Locked platform facts

- CaseShyft is an operational workspace, not the owner of identity, communications runtime, document storage, evidence, eligibility, or referral logic
- ConnectShyft remains the communications ingestion and triage runtime
- PeopleCore owns people, households, addresses, and relationships
- Documents + Evidence, Eligibility, and ResourceShyft land after CaseShyft MVP in the current sequence
- CaseShyft must still preserve integration seams for those later modules
- all new work must be extraction-ready for future lane or service separation

## Ownership

CaseShyft owns:
- case record
- case workspace
- case summary / metadata
- case notes
- follow-up tasks
- assignment state
- service plan / service item MVP records
- case timeline composition
- embedded communication context display and actions

## What it integrates with

- PeopleCore for person / household linkage
- ConnectShyft for communication timeline and reply/attach actions
- shell auth / permissions / tenant context
- future documents/evidence/eligibility/referrals/resources via stable seams

## What it must NOT own

- communications ingestion
- person or household identity logic
- identity matching logic
- document storage
- evidence facts
- eligibility rules
- referral package logic
- program participation logic
- workflow finance logic

## Extraction readiness

CaseShyft should be designed so it can later become:
- a separate lane
- a dedicated service
- an independently routed frontend module

without rewriting the core case model.