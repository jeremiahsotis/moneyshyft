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

The ShyftUnity shell is planned as the central internal platform surface.

## Locked architecture facts

- tenant-scoped `person_id` is linked through `identity_cluster_id`
- identity linkage does not imply cross-tenant visibility
- cross-tenant sharing is governed by consent and access grants, not identity matching alone
- the platform uses one shell for MVP, but all domains must be extraction-ready
- PeopleCore is foundational and must land before full ConnectShyft triage, CaseShyft, and downstream service coordination
- households are first-class subjects
- relationships and addresses are part of PeopleCore, not bolted on later

## Ownership

PeopleCore owns:
- person
- household
- address
- relationship
- household membership
- local subject references and lookup support

Identity Resolution owns:
- identity cluster
- alias / external identifier support
- match candidates
- merge / unmerge review workflow
- identity audit trail

## What it integrates with

- ConnectShyft for person/household lookup and creation from triage
- CaseShyft for case subject linkage
- ProgramShyft for participant linkage
- Document + Evidence for subject ownership
- Eligibility for screening subject linkage
- Referral workflows for subject linkage
- shell permissions / tenant context

## What it must NOT own

- communications threads
- case business logic
- program business logic
- document files
- evidence facts
- eligibility rules
- referral packages
- consent / ROI logic beyond identity-safe linking behavior

## Extraction readiness

PeopleCore and Identity Resolution must be designed so they can later become:
- a dedicated PeopleCore lane
- a dedicated identity service
- a shared subject lookup service

without rewriting the domain model.