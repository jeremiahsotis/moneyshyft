# ShyftUnity SpecKit Input Package v1

## Purpose

This document defines exactly what you need to hand SpecKit so it can produce strong specifications, task plans, and PR slices without guessing.

The goal is to reduce ambiguity before `/speckit.specify` runs.

---

# 1. What SpecKit needs for strong output

SpecKit performs best when it has five kinds of input:

## A. Product intent
What problem this work solves, who uses it, and why it matters now.

## B. Boundary definition
What this work owns, what it integrates with, and what it explicitly does not own.

## C. Workflow detail
How the user actually moves through the feature from start to finish.

## D. Data and contract detail
What objects exist, what fields matter, and what events or APIs are involved.

## E. Delivery constraints
What already exists in the repo, what cannot be broken, what sequence or rollout constraints exist, and what “done” means.

If any of those are missing, SpecKit tends to invent or flatten important details.

---

# 2. Minimum input package for every SpecKit spec

Every spec should include these sections.

## 1. Feature summary
Use 3 to 7 sentences answering:
- what is being built
- who uses it
- why now
- what success looks like

## 2. Users and personas
List the exact users involved.

Examples:
- intake staff
- case managers
- program managers
- volunteers
- participants
- supervisors
- coalition admins

## 3. Problem statement
Describe the operational pain clearly.

Examples:
- “communications arrive across channels and are not attached to the right person or case”
- “documents are repeatedly requested because evidence cannot be reused”

## 4. Scope
Split into:
- in scope
- out of scope
- future hooks only

This is critical for preventing scope creep.

## 5. Ownership boundaries
Explicitly state:
- what this module or feature owns
- what it reads from
- what it writes to
- what it must never own

## 6. Workflow narrative
Give the step-by-step flow in plain language.

Best format:
1. user action
2. system response
3. possible branch
4. final result

## 7. Canonical objects
List the domain objects involved and what they mean.

Examples:
- Person
- Household
- Case
- Conversation
- Submission
- Document
- Evidence
- ScreeningResult
- Referral

## 8. Required fields
Only list the fields that are important enough to influence behavior.

## 9. State model
If the feature has status transitions, list them explicitly.

Examples:
- draft
- pending_consent
- sent
- received
- completed

## 10. Integration points
List the exact integrations and boundaries.

Examples:
- ConnectShyft links to PeopleCore for person lookup
- CaseShyft embeds ConnectShyft communication timeline
- Eligibility consumes Shared Evidence but does not own it

## 11. UX requirements
State what the user must be able to do and what the interface must make obvious.

## 12. Security / consent / audit rules
Always include if the feature touches people, communications, documents, or cross-tenant data.

## 13. Migration / rollout constraints
Examples:
- existing ConnectShyft API is live
- existing MoneyShyft users must not be disrupted
- migration-runner already exists
- feature must be extraction-ready for future lane separation

## 14. Definition of done
List the observable things that make the feature complete.

---

# 3. Supporting documentation SpecKit should receive

For strong output, attach or summarize the following source material when relevant.

## Product docs
- product overview
- executive summary
- product brief
- theory of change if relevant

## Architecture docs
- architecture document
- implementation roadmap
- shell architecture
- security architecture
- data governance model

## Domain model docs
- canonical data model
- workflow / UX packet
- implementation plan
- issue map if one already exists

## Repo context
- current lane structure
- current APIs/apps that already exist
- current migration approach
- current auth/session approach
- known code constraints
- known live-user constraints

## Interface contracts
- API endpoint contracts
- event contracts
- permission model
- route ownership model
- integration patterns

---

# 4. What to give SpecKit for ShyftUnity specifically

For ShyftUnity work, every SpecKit request should usually include these platform facts:

## Existing runtime facts
- `admin-api` exists
- `admin-web` exists
- `moneyshyft-api` exists
- `moneyshyft-web` exists
- `connectshyft-api` exists
- `connectshyft-web` exists
- `migration-runner` exists

## Locked architecture facts
- MoneyShyft PWA is the first delivery priority
- ShyftUnity uses a central shell
- shell is one monolithic frontend for MVP
- all new features must be extraction-ready
- tenant-scoped `person_id` with `identity_cluster_id`
- identity linkage does not imply cross-tenant visibility
- consent and access grants govern sharing
- ConnectShyft initial omnichannel scope includes phone, SMS, MMS, email, webchat, and website forms
- intake/communications triage is prioritized before service matching/screening/documents

## Shared infrastructure facts
- PeopleCore is foundational
- Documents and Evidence are separate but linked
- Eligibility consumes evidence; it does not own evidence
- Referral consumes eligibility results; it does not evaluate rules
- ResourceShyft is the discovery layer
- CaseShyft and ProgramShyft are operational workspaces
- FinanceCore is workflow finance first, not full accounting

---

# 5. SpecKit anti-patterns to avoid

Do not give SpecKit only a title and a repo path.

Do not assume it will infer:
- cross-module boundaries
- consent rules
- tenant isolation
- current live-product constraints
- future extraction requirements

Do not let it choose module ownership when ownership is already locked.

Do not ask for broad “implement X” if X crosses multiple domains without telling it the sequence and interfaces.

---

# 6. Best practice prompt structure

When using SpecKit, provide:

## Part 1 — short framing
A concise summary of what you want produced.

## Part 2 — hard constraints
Existing runtime, ownership, sequence, and non-negotiables.

## Part 3 — source docs
The exact docs to use as source of truth.

## Part 4 — expected output
Ask for:
- spec
- task plan
- migration plan
- API changes
- event contracts
- PR slices
- acceptance criteria

---

# 7. Recommended package format

For each feature or module, prepare a small folder containing:

- `feature-summary.md`
- `architecture-context.md`
- `workflow-context.md`
- `data-contract-context.md`
- `repo-constraints.md`
- `acceptance-criteria.md`

That package gives SpecKit enough structure to reason well.

---

# 8. Recommended next use

Use this package structure before running:
- MoneyShyft PWA retention work
- ConnectShyft omnichannel triage
- PeopleCore + identity
- CaseShyft MVP
- Documents + Evidence
- Eligibility
- ResourceShyft
- ProgramShyft
