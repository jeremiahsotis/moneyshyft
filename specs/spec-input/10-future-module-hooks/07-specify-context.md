We are implementing: Future Module Hooks

Use the attached documents as the source of truth.

## Existing runtime context
These components already exist or are already planned:
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner
- PeopleCore
- CaseShyft
- Documents + Evidence
- Eligibility
- ResourceShyft
- ProgramShyft
- FinanceCore

## Locked platform constraints
- future modules are not yet fully specified
- we need extension seams now, not full module builds
- FinanceCore owns voucher primitives
- future ThriftShyft will consume voucher redemption hooks
- future RouteShyft will consume route request hooks
- future CapacityShyft will consume work-item hooks
- future DonorShyft will consume donor pickup hooks
- all new work must be extraction-ready for future lane or service separation

## What this work should own
- extension hook contracts
- minimal hook objects where needed
- event definitions
- clear ownership boundaries for future modules

## What this work integrates with
- FinanceCore
- CaseShyft
- ResourceShyft
- ProgramShyft where relevant
- future ThriftShyft
- future RouteShyft
- future CapacityShyft
- future DonorShyft

## What this work must not own
- full POS
- inventory
- route optimization
- full scheduling UI
- full planning/work-order system
- donor CRM

## Primary users
- platform engineers
- architects
- future product teams

## Problem being solved
The platform needs stable future-facing contracts now so upcoming modules can be added later without forcing redesign of FinanceCore, CaseShyft, ResourceShyft, or ProgramShyft.

## Core workflows
- voucher issued now, redeemed later in ThriftShyft
- service request created now, routed later in RouteShyft
- work item created now, planned later in CapacityShyft
- donor pickup initiated now, tracked later in DonorShyft

## Domain objects involved
- VoucherRedemptionHook
- RouteRequestHook
- WorkItemHook
- DonorPickupHook

## Security / consent / audit requirements
- hook events and state changes must be auditable where persisted
- no unauthorized subject or case data should be exposed through hooks
- downstream future modules should consume only the minimum stable data necessary

## Repo / migration constraints
- migration-runner is the migration path
- schema additions should be minimal
- prefer contracts/events over speculative domain expansion where possible

## Build now
- stable event definitions
- minimal hook contracts
- necessary persistence only where current workflows require it

## Future hooks only
- actual ThriftShyft
- actual RouteShyft
- actual CapacityShyft
- actual DonorShyft domain behavior and UI

## Testing and quality requirements
- define the fixture/helper families this package must add to the shared testing platform
- define the required contract tests for this package
- define the required backend integration coverage for this package
- define any selective smoke coverage needed for live or high-risk workflows
- identify which CI workflows should cover this package
- preserve compatibility with the centralized testing + CI architecture package

Produce:
1. a clear implementation spec
2. concrete backend tasks
3. minimal frontend or admin touchpoints if needed
4. migration notes
5. event / contract definitions
6. dependency-aware PR slices
7. risks / rollout notes