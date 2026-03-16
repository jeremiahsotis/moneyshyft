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

Planned or preceding foundational work:
- shell foundation
- PeopleCore + Identity Resolution
- ConnectShyft omnichannel triage
- CaseShyft MVP
- Documents + Evidence Layer
- Eligibility Engine

## Locked platform facts

- ResourceShyft is the discovery layer
- ResourceShyft does not own eligibility logic, document verification, case logic, referral lifecycle logic, or finance logic
- ResourceShyft can display requirements and fit signals, but those are consumed from other layers or modeled as service metadata
- ResourceShyft must support structured service offerings rather than just organization records
- service availability matters and must be modeled in a way that is understandable to users
- all new work must be extraction-ready for future lane or service separation

## Ownership

ResourceShyft owns:
- organization/provider directory records relevant to service discovery
- service offering records
- service location records
- service search metadata
- service availability view/projection
- result ranking and service discovery UX
- service detail and launch points into downstream workflows

## What it integrates with

- Eligibility Engine for eligibility fit and requirement display
- Documents + Evidence for visible required-document/evidence guidance
- CaseShyft for launch into case action
- future Referral Engine for referral creation
- future FinanceCore for voucher-related launch paths
- shell auth / permissions / tenant context

## What it must NOT own

- eligibility rule execution
- document storage or verification
- referral lifecycle logic
- case business logic
- finance workflows
- communication ingestion
- identity resolution logic

## Extraction readiness

The design must preserve clean seams for future separation into:
- service catalog service
- search/index service
- availability engine
- public discovery frontend