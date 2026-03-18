We are implementing: Eligibility Engine

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
- Eligibility consumes Documents and Shared Evidence; it does not own them
- Referral later consumes eligibility results; it does not evaluate policy rules itself
- ResourceShyft and ProgramShyft will consume eligibility results later
- screening subjects must be flexible across multiple contexts
- override behavior must be auditable and permission-aware
- all new work must be extraction-ready for future lane or service separation

## What this work should own
- ScreeningSubject
- EligibilityPolicy
- PolicyRequirement
- ScreeningRequest
- ScreeningResult
- ScreeningExplanationItem
- ScreeningOverride

## What this work integrates with
- PeopleCore
- Documents + Evidence Layer
- CaseShyft
- future ResourceShyft
- future ProgramShyft
- future Referral Engine
- shell auth / permissions / tenant context

## What this work must not own
- document storage
- evidence storage
- case business logic
- program business logic
- referral lifecycle logic
- communication ingestion
- identity resolution logic

## Primary users
- intake staff
- case managers
- program managers
- supervisors
- eligibility reviewers

## Problem being solved
The platform needs a consistent way to evaluate whether a person, household, case, or program participant meets service or program rules using reusable evidence and document-backed support.

## Core workflows
- run screening
- detect missing or stale information
- consume reusable evidence
- explain result clearly
- handle manual review cases
- record authorized override

## Domain objects involved
- ScreeningSubject
- EligibilityPolicy
- PolicyRequirement
- ScreeningRequest
- ScreeningResult
- ScreeningExplanationItem
- ScreeningOverride

## Required states / transitions
- screening request: draft, evaluating, completed, failed
- result: eligible, ineligible, potentially_eligible, missing_information, requires_manual_review, overridden
- explanation outcomes: passed, failed, missing, stale, needs_confirmation, manual_review

## Security / consent / audit requirements
- tenant isolation must be preserved
- screening and override actions must be auditable
- permission model must govern override access
- downstream consumers must not gain unauthorized subject visibility

## Repo / migration constraints
- migration-runner is the migration path
- Documents + Evidence should be consumable by this work
- rollout may begin inside internal workflows first

## Build now
- policy core
- screening request/result flow
- explanation payloads
- missing/stale/needs-confirmation states
- override support

## Future hooks only
- advanced government-program rule packs
- public self-service screening
- more advanced simulation and scenario comparison tools

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