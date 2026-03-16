# ShyftUnity /speckit.specify Context Template v1

## Purpose

Use this template as the context block you hand to `/speckit.specify`.

Replace bracketed sections with the feature-specific details.

---

```text
We are implementing: [feature / module name]

Use the attached documents as the source of truth.

This work is part of the ShyftUnity platform.

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
- ShyftUnity uses a central application shell
- The shell is one monolithic frontend for MVP
- All new components must be extraction-ready for future lane or service separation
- tenant-scoped `person_id` is linked through `identity_cluster_id`
- identity linkage does not imply cross-tenant visibility
- consent and access grants govern cross-tenant sharing
- Documents and Evidence are separate but linked
- Eligibility consumes Shared Evidence and Documents; it does not own them
- Referral consumes eligibility results; it does not evaluate rules itself
- MoneyShyft PWA is the first delivery priority across the platform where that dependency matters
- Intake and communications triage are prioritized before service matching/screening/documents
- ConnectShyft omnichannel scope includes phone, SMS, MMS, email, webchat, and website forms

## What this work should own
[insert ownership bullets]

## What this work integrates with
[insert integration bullets]

## What this work must not own
[insert non-ownership bullets]

## Primary users
[insert personas]

## Problem being solved
[insert plain-language problem statement]

## Core workflows
[insert numbered workflow summary]

## Domain objects involved
[insert object list]

## Required states / transitions
[insert state model if relevant]

## Security / consent / audit requirements
[insert requirements]

## Repo / migration constraints
[insert migration and codebase constraints]

## Build now
[insert what must be delivered in this scope]

## Future hooks only
[insert what must be prepared but not fully built]

Produce:
1. a clear implementation spec
2. concrete backend and frontend tasks
3. migration notes
4. API / event contract changes
5. dependency-aware PR slices
6. acceptance criteria
7. risks / rollout notes
```

---

# Recommended attachments for /speckit.specify

For best output, attach:

- product/module overview
- architecture document
- canonical data model
- workflow + UX packet
- implementation plan
- issue map / backlog excerpt
- repo constraints summary

---

# Recommended use cases

This template is especially strong for:
- ConnectShyft omnichannel triage
- PeopleCore + identity
- CaseShyft MVP
- Document + Evidence layer
- Eligibility Engine
- ResourceShyft
- ProgramShyft
- FinanceCore
