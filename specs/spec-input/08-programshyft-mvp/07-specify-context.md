We are implementing: ProgramShyft MVP

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
- ProgramShyft comes after shell foundations, PeopleCore, ConnectShyft, CaseShyft, Documents + Evidence, Eligibility, and ResourceShyft in the current delivery sequence
- ConnectShyft owns communications ingestion/runtime
- PeopleCore owns person/household identity
- Eligibility owns rule execution
- Documents + Evidence own verification and reusable facts
- all new work must be extraction-ready for future lane or service separation
- ProgramShyft must support flexible program structures without becoming complicated to use

## What this work should own
- program model
- program workspace
- sessions / cohorts
- participation model
- attendance
- milestones / progress markers
- enrollment state
- program communication linkage and embedded communication context

## What this work integrates with
- PeopleCore
- ConnectShyft
- Eligibility Engine
- Documents + Evidence
- CaseShyft
- shell auth / permissions / tenant context

## What this work must not own
- communication ingestion
- identity logic
- document storage or verification
- evidence storage
- eligibility rule execution
- referral lifecycle logic
- finance logic

## Primary users
- program managers
- program coordinators
- intake staff routing people into programs
- supervisors

## Problem being solved
The platform needs a structured operational workspace for running programs, cohorts, sessions, and participant enrollment with connected communications and requirement visibility.

## Core workflows
- create program
- configure sessions/cohorts
- enroll participant
- view requirement status
- record attendance
- track milestones / progress
- use program-linked communications
- close or archive program

## Domain objects involved
- Program
- ProgramSession
- ProgramCohort
- ProgramParticipant
- ProgramAttendance
- ProgramMilestone
- ProgramCommunicationLink
- ProgramRequirementProfile

## Required states / transitions
- program: draft, active, paused, completed, archived
- enrollment: pending, enrolled, waitlisted, declined, exited, completed
- session: scheduled, active, completed, canceled
- cohort: planned, active, completed, archived
- attendance: present, absent, excused, unknown
- milestone: not_started, in_progress, completed, waived

## Security / consent / audit requirements
- participant linkage must respect tenant context and permissions
- communication linkage must be auditable
- enrollment and program lifecycle actions must be auditable
- no cross-tenant data leakage introduced

## Repo / migration constraints
- migration-runner is the migration path
- ConnectShyft is already live and must not be broken
- rollout may start with internal program operations first

## Build now
- program core
- sessions / cohorts
- participation model
- attendance
- milestones / progress markers
- communication embedding / linking
- requirement visibility for enrollment support

## Future hooks only
- deeper finance integration
- richer referral creation flows
- advanced volunteer workflows
- more advanced outcome measurement and dashboards

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