We are implementing: Documents + Evidence Layer

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
- Documents and Evidence are separate but linked
- Document Management owns files, versions, requests, verification, bundles, and access auditing
- Shared Evidence owns reusable facts, verification history, evidence/document links, and evidence usage
- Eligibility consumes Documents and Shared Evidence later; it does not own them
- Referral consumes evidence summaries and document bundles later; it does not own them
- participant upload links are required
- evidence reuse must support confirmation before reuse where appropriate
- all new work must be extraction-ready for future lane or service separation

## What this work should own
- Document
- DocumentVersion
- DocumentRequest
- DocumentVerification
- DocumentLink
- DocumentBundleReference
- Evidence
- EvidenceType
- EvidenceVerificationEvent
- EvidenceDocumentLink
- EvidenceUsageEvent

## What this work integrates with
- PeopleCore
- CaseShyft
- future Eligibility Engine
- future Referral Engine
- shell auth / permissions / tenant context

## What this work must not own
- identity resolution logic
- case business logic
- program logic
- eligibility rules
- referral lifecycle logic
- communication ingestion
- full OCR/AI extraction as MVP requirement

## Primary users
- case managers
- intake staff
- program managers
- document reviewers
- supervisors
- participants uploading requested files

## Problem being solved
The platform needs a shared layer that can request, store, verify, and reuse documents and evidence so people are not repeatedly asked for the same paperwork and downstream workflows can trust previously collected information.

## Core workflows
- request document
- send secure upload link
- participant upload
- direct staff upload
- verification review
- create/update reusable evidence
- link evidence to documents
- confirm or update evidence for reuse
- link document/evidence to case context

## Domain objects involved
- Document
- DocumentVersion
- DocumentRequest
- DocumentVerification
- DocumentLink
- DocumentBundleReference
- Evidence
- EvidenceType
- EvidenceVerificationEvent
- EvidenceDocumentLink
- EvidenceUsageEvent

## Required states / transitions
- document: uploaded, pending_verification, verified, rejected, expired, archived
- document request: requested, link_sent, uploaded, pending_review, completed, expired, canceled
- verification: pending, verified, rejected, needs_replacement, expired
- evidence verification_state: unverified, participant_confirmed, worker_confirmed, document_backed, expired, superseded

## Security / consent / audit requirements
- tenant isolation must be preserved
- upload links must be scoped and secure
- document and evidence actions must be auditable
- future scoped bundle sharing must remain possible
- unrelated data must never be exposed through upload or hosted access flows

## Repo / migration constraints
- migration-runner is the migration path
- CaseShyft should be able to consume this layer soon after delivery
- rollout may be staged with internal staff workflows first

## Build now
- document requests
- participant upload links
- direct uploads
- document verification
- reusable evidence core
- evidence/document linkage
- evidence confirmation/update flows
- case context linkage

## Future hooks only
- advanced OCR / AI extraction
- deeper referral packaging flows
- richer participant self-service evidence portal
- advanced automated verification heuristics

Produce:
1. a clear implementation spec
2. concrete backend and frontend tasks
3. migration notes
4. API / event contract changes
5. dependency-aware PR slices
6. acceptance criteria
7. risks / rollout notes