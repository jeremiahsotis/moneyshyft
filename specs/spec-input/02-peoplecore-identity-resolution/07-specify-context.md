We are implementing: PeopleCore + Identity Resolution

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
- ShyftUnity uses tenant-scoped `person_id` linked through `identity_cluster_id`
- identity linkage does not imply cross-tenant visibility
- cross-tenant sharing is governed by consent and access grants, not identity matching alone
- all new work must be extraction-ready for future lane or service separation
- PeopleCore is foundational for ConnectShyft triage, CaseShyft, ProgramShyft, Documents, Evidence, Eligibility, and Referrals
- households are first-class subjects
- addresses and relationships are part of PeopleCore
- ConnectShyft triage needs person/household lookup and creation support soon after this lands

## What this work should own
- person model
- household model
- address model
- relationship model
- household membership
- identity clusters
- aliases / external identifiers
- duplicate candidate generation and review
- merge / unmerge audit trail

## What this work integrates with
- ConnectShyft
- CaseShyft
- ProgramShyft
- Documents + Evidence
- Eligibility
- Referral workflows
- shell permissions and tenant context

## What this work must not own
- communications
- case business logic
- program business logic
- documents
- evidence facts
- eligibility rules
- referrals
- consent logic beyond identity-safe behavior

## Primary users
- intake staff
- case managers
- program managers
- supervisors
- data quality / admin staff

## Problem being solved
The platform needs stable subject identity so people, households, addresses, and relationships can be referenced safely across workflows without uncontrolled duplication or cross-tenant leakage.

## Core workflows
- create person
- create household
- manage household membership
- add and manage addresses
- create relationships
- generate and review duplicate candidates
- confirm or reject identity linkages
- search/link people and households from downstream workflows

## Domain objects involved
- Person
- Household
- HouseholdMembership
- Address
- Relationship
- IdentityCluster
- IdentityAlias
- IdentityMatchCandidate
- IdentityMergeEvent

## Required states / transitions
- active/inactive/archived for people and households
- pending/confirmed/rejected/deferred for match candidates
- active/flagged/archived for identity clusters

## Security / consent / audit requirements
- tenant isolation must be preserved
- identity linkage must not expose cross-tenant data
- merge and review actions must be auditable
- downstream references must respect permissions and tenant context

## Repo / migration constraints
- migration-runner is the migration path
- connectshyft-api/web already exist and will depend on this work
- rollout should support progressive integration into downstream modules

## Build now
- person
- household
- address
- relationship
- household membership
- identity cluster
- alias support
- match candidate model and review workflow

## Future hooks only
- advanced probabilistic matching
- participant self-service identity management
- more advanced cross-system synchronization logic

Produce:
1. a clear implementation spec
2. concrete backend and frontend tasks
3. migration notes
4. API / event contract changes
5. dependency-aware PR slices
6. acceptance criteria
7. risks / rollout notes