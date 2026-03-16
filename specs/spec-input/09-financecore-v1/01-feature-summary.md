# FinanceCore v1 — Feature Summary

## What is being built

FinanceCore v1 is the shared workflow finance layer for ShyftUnity.

This feature introduces and formalizes:

- financial commitments
- disbursement records
- collaborative funding support
- funding participation by multiple organizations
- voucher primitives
- voucher issuance
- voucher redemption state
- voucher balance / status tracking
- finance audit trail

FinanceCore v1 is **not** a full accounting system or general ledger. It is a workflow finance layer that helps social service programs, cases, and future modules manage financial assistance and tracked funding actions.

## Why now

After ProgramShyft, the next operational need is a shared financial workflow layer that can support:

- direct financial assistance in CaseShyft
- future voucher issuance from CaseShyft or ResourceShyft
- collaborative funding from multiple organizations
- future ThriftShyft voucher redemption
- cleaner auditability around who committed funds and what was paid

Without FinanceCore:
- financial assistance remains ad hoc
- multi-organization contributions are hard to track
- voucher logic gets reinvented later
- future thrift and route-related workflows lack a stable financial foundation

## Who uses this

Primary users:
- case managers
- supervisors
- finance reviewers
- program managers
- administrators

Secondary users:
- future thrift staff redeeming vouchers
- future coalition finance coordinators
- future partner organizations participating in shared funding

## Success definition

A staff user should be able to:

1. record a financial commitment
2. record a disbursement
3. track funding from one or more organizations against a need
4. issue a voucher
5. track voucher status and remaining balance if applicable
6. preserve clear audit history for all finance actions