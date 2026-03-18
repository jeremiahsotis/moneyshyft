We are implementing: CaseShyft MVP

Use the attached documents as the source of truth.

## Existing runtime context
These components already exist and are operational:
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

## Locked platform constraints
- CaseShyft comes after shell foundations, PeopleCore, and ConnectShyft omnichannel triage
- ConnectShyft owns communications ingestion and triage
- PeopleCore owns person, household, address, and relationship data
- all new work must be extraction-ready for future lane or service separation
- Documents, Evidence, Eligibility, and ResourceShyft land after CaseShyft MVP, so CaseShyft must expose clean seams for future integration
- CaseShyft is the first real operational workspace where triaged intake becomes ongoing case work

## What this work should own
- case model
- case workspace
- case notes
- follow-up tasks
- basic service items / service planning
- case timeline composition
- communication linkage and embedded communication context

## What this work integrates with
- PeopleCore
- ConnectShyft
- shell auth / permissions / tenant context

## What this work must not own
- communication ingestion
- PeopleCore identity logic
- document storage
- evidence facts
- eligibility rules
- referral logic
- program logic
- finance logic

## Primary users
- case managers
- Vincentians
- intake staff escalating into case work
- supervisors

## Problem being solved
The platform needs a structured operational workspace where intake can become durable case work, communications stay attached to the work, and staff can manage assignments, notes, tasks, and service actions.

## Core workflows
- create case from triage
- create case directly
- assign case
- add notes
- create and manage follow-up tasks
- attach and view communications
- track basic service items
- close case

## Domain objects involved
- Case
- CaseNote
- CaseTask
- CaseServiceItem
- CaseCommunicationLink
- CaseTimelineEvent

## Required states / transitions
- case: open, active, pending_follow_up, on_hold, closed
- task: open, in_progress, completed, canceled
- service item: planned, in_progress, completed, canceled

## Security / consent / audit requirements
- person/household linkage must respect tenant context and permissions
- communication linkage must be auditable
- assignment and lifecycle actions must be auditable
- no cross-tenant data leakage introduced

## Repo / migration constraints
- migration-runner is the migration path
- ConnectShyft is already live and must not be broken
- rollout may be staged internally first

## Build now
- case core
- case workspace
- notes
- follow-up tasks
- basic service items
- communication embedding / linking

## Future hooks only
- deep document/evidence integration
- eligibility-driven case actions
- referral package generation
- workflow finance actions
- richer program linkage

## Testing and quality requirements
- define the fixture/helper families this package must add to the shared testing platform
- define the required contract tests for this package
- define the required backend integration coverage for this package
- define any selective smoke coverage needed for live or high-risk workflows
- identify which CI workflows should cover this package
- preserve compatibility with the centralized testing + CI architecture package

Produce:
1. a clear implementation spec
2. concrete backend and frontend tasks
3. migration notes
4. API / event contract changes
5. dependency-aware PR slices
6. acceptance criteria
7. risks / rollout notes