# Architecture Context

## Existing system

The following components already exist:

- connectshyft-api
- connectshyft-web
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- migration-runner

## Locked platform facts

- ConnectShyft remains its own communications runtime for now
- ConnectShyft must be extraction-ready for future separation and expansion
- Intake/communications triage is prioritized before service matching/screening/documents
- PeopleCore + identity are foundational and should exist enough to support person/household linking
- CaseShyft will embed or consume ConnectShyft communication context later
- ProgramShyft will also embed or consume ConnectShyft communication context later

## Ownership

This feature owns:
- channel ingestion for supported channels
- conversation / thread model
- structured submission model for website forms
- triage queue
- assignment / routing state
- notify / escalate flows
- attach/create actions from triage
- unassigned communications clearinghouse behavior

## What it integrates with

- PeopleCore for person/household lookup and creation
- CaseShyft for attach/create case workflows
- ProgramShyft for attach to program workflows
- existing connectshyft channel adapters and channel dispatch mechanisms
- existing auth/session and tenant model

## What it must NOT own

- PeopleCore identity resolution logic
- case business logic
- program business logic
- eligibility logic
- document verification logic
- referral logic

## Extraction readiness

The design must preserve clean seams for future separation into:
- channel adapter services
- triage service
- communications event processing
- embedded case/program communication surfaces