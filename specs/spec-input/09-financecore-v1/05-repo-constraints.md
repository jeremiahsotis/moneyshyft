# Repo Constraints

## Existing structure

Active runtime components already exist:
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

Planned central internal platform surface:
- shyftunity-web

## Important constraints

- FinanceCore must remain workflow finance only for MVP
- it must not pull the platform into full accounting complexity
- CaseShyft should be able to integrate with commitments and vouchers later without redesign
- future ThriftShyft must be able to consume voucher redemption hooks
- migration-runner is the migration path and should be used consistently
- all new work must preserve extraction-ready boundaries

## Live-product constraints

- no breaking changes should impact existing live MoneyShyft or ConnectShyft functionality
- rollout may begin with internal case-linked financial assistance only

## Migration constraints

Expected schema work includes:
- financial_commitment
- disbursement
- funding_participation
- voucher
- voucher_redemption
- finance_audit_event