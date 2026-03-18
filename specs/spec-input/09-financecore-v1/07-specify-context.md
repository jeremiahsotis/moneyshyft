We are implementing: FinanceCore v1

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
- FinanceCore is workflow finance first, not full accounting
- FinanceCore must support collaborative funding and voucher primitives
- CaseShyft and future ResourceShyft may issue or consume finance actions
- future ThriftShyft will consume voucher redemption hooks later
- all new work must be extraction-ready for future lane or service separation

## What this work should own
- FinancialCommitment
- Disbursement
- FundingParticipation
- Voucher
- VoucherRedemption
- FinanceAuditEvent

## What this work integrates with
- CaseShyft
- ResourceShyft
- ProgramShyft where relevant
- PeopleCore where subject linkage is needed
- shell auth / permissions / tenant context
- future ThriftShyft voucher redemption hooks

## What this work must not own
- general ledger / accounting
- payroll
- banking integrations as MVP requirement
- case business logic
- service discovery logic
- identity resolution logic
- communication ingestion
- document or evidence ownership

## Primary users
- case managers
- supervisors
- finance reviewers
- program managers
- administrators

## Problem being solved
The platform needs a shared workflow finance layer that can track commitments, disbursements, collaborative funding, and vouchers without requiring a full accounting platform.

## Core workflows
- create commitment
- record disbursement
- track collaborative funding
- issue voucher
- redeem voucher
- review finance actions

## Domain objects involved
- FinancialCommitment
- Disbursement
- FundingParticipation
- Voucher
- VoucherRedemption
- FinanceAuditEvent

## Required states / transitions
- commitment: draft, pending_approval, approved, partially_funded, funded, fulfilled, canceled, expired
- disbursement: pending, completed, failed, canceled
- funding participation: pledged, contributed, canceled
- voucher: issued, active, partially_redeemed, redeemed, expired, canceled, exhausted
- redemption: completed, failed, reversed

## Security / consent / audit requirements
- permissions must govern sensitive finance actions
- finance records must be auditable
- downstream references must not expose unauthorized subject or case data

## Repo / migration constraints
- migration-runner is the migration path
- rollout may start with internal case-linked financial assistance only
- no breaking changes should impact existing live MoneyShyft or ConnectShyft functionality

## Build now
- commitment core
- disbursement core
- collaborative funding participation
- voucher primitives
- finance audit trail

## Future hooks only
- full accounting features
- banking integrations
- richer thrift / route / capacity workflows
- broader financial analytics

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