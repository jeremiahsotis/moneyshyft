# Testing Obligations

## Required fixture/helpers additions
- routeRequestHookFactory
- workItemHookFactory
- donorPickupHookFactory
- voucherRedemptionHook helper(s)

## Required test coverage
- contract tests for all future hook payloads
- event envelope validation for voucher_redemption_requested, route_request_created, work_item_created, and donor_pickup_requested
- minimal persistence tests only where hooks are stored
- ensure current modules emit minimal stable data only

## CI impact
- contract-tests
- affected-integration where persistence exists
- release-validation

## Notes
This package is mostly about contract stability. Favor contract tests over speculative integration complexity.
