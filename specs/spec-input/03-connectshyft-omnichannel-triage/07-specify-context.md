We are implementing: ConnectShyft omnichannel intake + triage

Use the attached documents as the source of truth.

## Existing runtime context
These components already exist and are operational:
- connectshyft-api
- connectshyft-web
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- migration-runner

## Locked platform constraints
- intake and communications triage are prioritized before service matching/screening/documents
- ConnectShyft initial omnichannel scope includes phone, SMS, MMS, email, webchat, and website forms
- all new work must be extraction-ready for future lane or service separation
- ConnectShyft owns communication ingestion and triage, but does not own case logic, program logic, identity resolution, eligibility, documents, or referrals
- PeopleCore provides person/household references
- CaseShyft and ProgramShyft are downstream attach/create targets
- the platform uses tenant-scoped identity and strict audit expectations

## What this work should own
- channel ingestion for supported channels
- conversation/thread model
- structured submission model for website forms
- triage queue
- assignment/routing state
- attach/create actions from triage
- notifications/escalations

## What this work integrates with
- PeopleCore
- CaseShyft
- ProgramShyft
- existing auth/session model
- existing ConnectShyft channel runtime

## What this work must not own
- PeopleCore identity logic
- CaseShyft business logic
- ProgramShyft business logic
- eligibility logic
- document verification
- referral logic

## Primary users
- intake staff
- call center staff
- reception staff
- Vincentians
- case managers
- program managers
- supervisors

## Problem being solved
Communications arrive across multiple channels and need one operational front door where staff can triage, attach, create, assign, escalate, and route work without losing channel meaning or creating duplicate intake work.

## Core workflows
- phone/SMS/MMS/email/webchat/form ingestion
- unassigned triage queue review
- person/household search or creation
- attach to case/program
- create new case/intake
- assign/notify/escalate
- resolve or close triage item

## Domain objects involved
- Communication
- Conversation
- Submission
- TriageItem
- Assignment
- PersonRef
- HouseholdRef
- CaseRef
- ProgramRef

## Required states / transitions
- new
- unassigned
- in_review
- assigned
- attached
- converted
- escalated
- resolved
- spam_or_invalid

## Security / consent / audit requirements
- tenant isolation preserved
- all triage actions auditable
- person/case/program linkage must respect permissions
- channel-specific data preserved safely
- staged rollout should minimize regression risk

## Repo / migration constraints
- connectshyft-api and connectshyft-web are already live
- migration-runner is the migration path
- schema expansion is expected
- existing flows cannot be broken

## Build now
- supported channels above
- central triage queue
- assignment/notification/escalation
- person/household lookup and creation hooks
- case/program attach or create hooks

## Future hooks only
- additional channels beyond initial scope
- richer automation/routing intelligence
- deeper CaseShyft and ProgramShyft embedded UX beyond initial attach/create surfaces

Produce:
1. a clear implementation spec
2. concrete backend and frontend tasks
3. migration notes
4. API / event contract changes
5. dependency-aware PR slices
6. acceptance criteria
7. risks / rollout notes