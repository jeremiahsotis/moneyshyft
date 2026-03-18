# Testing Obligations

## Required fixture/helpers additions
- commitmentFactory
- disbursementFactory
- fundingParticipationFactory
- voucherFactory
- voucherRedemptionFactory

## Required test coverage
- unit tests for status transitions and voucher balance logic
- backend integration tests for commitment/disbursement flow
- collaborative funding tests
- voucher issue/redeem/expire/cancel tests
- contract tests for voucher_issued, voucher_redeemed, and future voucher_redemption_requested hooks

## CI impact
- affected-quality
- affected-integration
- contract-tests
- release-validation

## Notes
FinanceCore is another strong later candidate for mutation testing because of its rules and state transitions.
