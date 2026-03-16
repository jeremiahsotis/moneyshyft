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

Planned foundational work before or alongside this:
- shell foundation
- PeopleCore + Identity Resolution
- ConnectShyft omnichannel triage
- CaseShyft MVP

## Locked platform facts

- Documents and Evidence are separate but linked
- Document Management owns files, versions, requests, verification, bundles, and access auditing
- Shared Evidence owns reusable facts, verification history, and evidence usage
- Eligibility consumes Shared Evidence and Documents; it does not own them
- Referral later consumes evidence summaries and document bundles; it does not own document storage or evidence logic
- participant uploads must be supported through secure links
- the system must support verification before reuse
- all new work must be extraction-ready for future lane or service separation

## Ownership

Document Management owns:
- Document
- DocumentVersion
- DocumentRequest
- DocumentVerification
- DocumentLink
- DocumentBundleReference
- Document access audit events
- upload and request flows

Shared Evidence owns:
- Evidence
- EvidenceType
- EvidenceVerificationEvent
- EvidenceDocumentLink
- EvidenceUsageEvent
- validity / freshness support

## What it integrates with

- PeopleCore for subject linkage
- CaseShyft for case-linked document/evidence use
- future Eligibility Engine
- future Referral Engine
- shell permissions / tenant context
- secure upload / hosted access patterns

## What it must NOT own

- identity resolution logic
- case business logic
- program business logic
- eligibility rules
- referral package lifecycle logic
- communication ingestion
- full OCR or AI extraction as a requirement for MVP

## Extraction readiness

The design must preserve clean seams for future separation into:
- a dedicated document service
- a dedicated evidence service
- upload/intake workers
- verification/review services