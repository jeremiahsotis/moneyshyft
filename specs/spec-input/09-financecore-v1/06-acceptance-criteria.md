# Acceptance Criteria

## Commitment and disbursement core

- financial commitments can be created and updated
- commitments can move through stable status transitions
- disbursements can be recorded against commitments
- commitment and disbursement history remains traceable

## Collaborative funding

- multiple funding participation records can be attached to one commitment
- workflow can distinguish partial vs full funding support

## Voucher primitives

- vouchers can be issued
- voucher status is tracked
- voucher redemption can be recorded
- partial redemption is supported if in scope
- expiration and cancellation are supported

## Downstream readiness

- CaseShyft can later reference finance actions cleanly
- ResourceShyft can later launch voucher-related actions
- future ThriftShyft can consume voucher redemption hooks without redesign

## Safety

- FinanceCore does not become a full accounting system in MVP
- finance actions remain auditable
- permissions govern sensitive finance actions

## Auditability

- commitment creation / approval
- funding participation changes
- disbursement recording
- voucher issuance
- voucher redemption
- voucher cancellation / expiration
are all recorded