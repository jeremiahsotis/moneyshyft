We are implementing: ResourceShyft

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
- ResourceShyft is the discovery layer of the platform
- Eligibility Engine should be consumable by this work, but ResourceShyft must not own eligibility rule execution
- Documents + Evidence should inform requirement visibility, but ResourceShyft must not own document verification
- future Referral, Program, and Finance workflows may launch from ResourceShyft, but ResourceShyft does not own those domains
- service availability and freshness matter and must be visible
- all new work must be extraction-ready for future lane or service separation

## What this work should own
- organization/provider directory records relevant to service discovery
- service offering model
- service location model
- service requirement visibility profile
- service availability representation
- search and ranking behavior
- service detail and downstream launch points

## What this work integrates with
- Eligibility Engine
- Documents + Evidence
- CaseShyft
- future Referral Engine
- future ProgramShyft
- future FinanceCore
- shell auth / permissions / tenant context

## What this work must not own
- eligibility rule execution
- document storage or verification
- referral lifecycle logic
- case logic
- finance logic
- communication ingestion
- identity resolution logic

## Primary users
- intake staff
- case managers
- Vincentians
- program managers
- supervisors

## Problem being solved
Staff need a structured, searchable, understandable service discovery system that moves beyond a static directory and helps them choose the right service offering and take the next action.

## Core workflows
- search services
- filter and refine results
- open service detail
- understand availability
- understand requirements and likely fit
- launch into downstream case/referral/program actions
- update service records and freshness

## Domain objects involved
- Organization
- ServiceLocation
- ServiceOffering
- ServiceRequirementProfile
- ServiceAvailability
- ServiceSearchFacet
- ServiceFreshnessRecord

## Required states / transitions
- service visibility: visible, hidden, archived
- service active: true/false
- availability types such as office_hours, service_hours, appointment_only, seasonal, ad_hoc, call_first

## Security / consent / audit requirements
- tenant permissions must govern who can edit directory records
- public release may come later, but internal edit/use permissions must be clear
- downstream launches must not expose unauthorized subject or case data

## Repo / migration constraints
- migration-runner is the migration path
- rollout may begin as internal-only service discovery
- no breaking changes should impact existing live MoneyShyft or ConnectShyft functionality

## Build now
- organization/service/service location core
- search + filtering
- service detail
- availability representation
- requirement visibility
- freshness tracking
- launch seams into downstream workflows

## Future hooks only
- broader public self-service experience
- advanced search indexing strategies
- automated verification feeds from partners
- richer referral completion signals in ranking

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