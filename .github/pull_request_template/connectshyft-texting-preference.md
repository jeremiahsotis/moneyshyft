# ConnectShyft Texting Preference PR

## Summary
Describe the texting preference persistence/display fix.

## Scope Confirmation
- [ ] Scoped to current ConnectShyft runtime host in `apps/moneyshyft-api`
- [ ] No lane-convergence refactor
- [ ] No SMS target-resolution changes
- [ ] No provider adapter redesign
- [ ] No port, ingress, or route-ownership changes outside the current ConnectShyft runtime host

## Persistence
- [ ] create omission defaults to `YES`
- [ ] explicit `YES | NO | UNKNOWN` values persist unchanged
- [ ] invalid request values behave like omission
- [ ] update omission preserves the existing canonical enum

## API / UI
- [ ] API returns `prefersTexting` with the persisted canonical enum
- [ ] UI label mapping verified against the contract copy
- [ ] `YES` never displays `Texting Preference Unknown`
- [ ] labels match exactly: `Prefers Texting`, `Prefers Calls Only`, `Texting Preference Unknown`

## Verification
- [ ] backend module tests updated
- [ ] backend route tests updated
- [ ] quickstart manual verification path documented
- [ ] deployment/routing validation reviewed against host-managed docs
