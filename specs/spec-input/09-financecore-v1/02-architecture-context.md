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
- ResourceShyft
- ProgramShyft

## Locked platform facts

- FinanceCore v1 is workflow finance first, not full accounting
- FinanceCore must support collaborative funding and voucher primitives
- CaseShyft and future ResourceShyft may issue or consume finance actions
- future ThriftShyft will need voucher redemption hooks
- FinanceCore must not become a general accounting platform in MVP
- all new work must be extraction-ready for future lane or service separation

## Ownership

FinanceCore owns:
- commitment records
- disbursement records
- funding participation records
- voucher records
- voucher issue/redeem state
- finance audit trail
- workflow-level finance status

## What it integrates with

- CaseShyft for case-linked financial assistance
- ResourceShyft for future service/voucher launch paths
- ProgramShyft for future program-linked financial support where applicable
- PeopleCore for subject linkage where required
- shell auth / permissions / tenant context
- future ThriftShyft for voucher redemption
- future RouteShyft / CapacityShyft hooks where financial requests may matter

## What it must NOT own

- general ledger / accounting engine
- payroll
- banking integrations as a requirement for MVP
- tax/accounting reporting
- case business logic
- service discovery logic
- identity resolution logic
- communication ingestion
- document or evidence ownership

## Extraction readiness

FinanceCore should be designed so it can later become:
- a separate lane
- a dedicated workflow finance service
- a voucher service consumed by ThriftShyft and other modules

without rewriting the core model.