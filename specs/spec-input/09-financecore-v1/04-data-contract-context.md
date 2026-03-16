# Data Contract Context

## Domain objects involved

### FinancialCommitment
A promise or authorization of financial support.

Important fields:
- financial_commitment_id
- tenant_id
- subject_type optional
- subject_id optional
- case_id optional
- program_id optional
- commitment_type
- amount
- currency
- status
- created_by
- created_at
- updated_at
- notes optional

### Disbursement
A recorded payout, payment, or financial assistance action tied to a commitment.

Important fields:
- disbursement_id
- financial_commitment_id
- amount
- currency
- disbursed_at
- disbursement_method optional
- status
- created_by
- created_at

### FundingParticipation
Represents one contributor to a financially supported need.

Important fields:
- funding_participation_id
- financial_commitment_id
- funding_source_type
- funding_source_id optional
- pledged_amount
- contributed_amount optional
- status
- created_at
- updated_at

### Voucher
A redeemable financial assistance instrument.

Important fields:
- voucher_id
- tenant_id
- voucher_code or token reference
- voucher_type
- issue_amount
- remaining_amount optional
- currency
- status
- issued_at
- expires_at optional
- issued_by
- subject_type optional
- subject_id optional
- case_id optional
- program_id optional

### VoucherRedemption
A redemption event against a voucher.

Important fields:
- voucher_redemption_id
- voucher_id
- redeemed_amount
- redeemed_at
- redemption_context_type
- redemption_context_id optional
- redeemed_by optional
- status

### FinanceAuditEvent
Audit record for finance actions.

Important fields:
- finance_audit_event_id
- target_type
- target_id
- actor_id
- action_type
- occurred_at
- notes optional

## Important states

### commitment status
- draft
- pending_approval
- approved
- partially_funded
- funded
- fulfilled
- canceled
- expired

### disbursement status
- pending
- completed
- failed
- canceled

### funding participation status
- pledged
- contributed
- canceled

### voucher status
- issued
- active
- partially_redeemed
- redeemed
- expired
- canceled
- exhausted

### voucher redemption status
- completed
- failed
- reversed

## API / event touchpoints

Potential events:
- financial_commitment_created
- commitment_approved
- funding_participation_added
- disbursement_recorded
- voucher_issued
- voucher_redeemed
- voucher_expired
- voucher_canceled