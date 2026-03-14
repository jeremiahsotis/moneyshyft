# ConnectShyft SMS Target Resolution PR

## Summary
Describe the SMS target-resolution fix.

## Scope Confirmation
- [ ] Scoped to current ConnectShyft runtime host in `apps/moneyshyft-api`
- [ ] No lane-convergence refactor
- [ ] No provider adapter redesign
- [ ] No unrelated UI redesign

## Resolution Logic
- [ ] deterministic target-resolution order implemented
- [ ] explicit outbound request target wins over neighbor fallback
- [ ] texting-preference gate enforced
- [ ] no automatic guessing when multiple phones exist
- [ ] outbound thread response reflects the actual communication method (`SMS` for thread-message dispatch)

## Refusals
- [ ] explicit refusal for no target phone
- [ ] explicit refusal for multiple target phones
- [ ] explicit refusal for texting not permitted
- [ ] generic provider failure not used for known pre-provider validation failures

## Verification
- [ ] tests added or updated
- [ ] manual verification path documented
- [ ] route ownership remains inside `apps/moneyshyft-api`
- [ ] localhost-only port/binding expectations unchanged
- [ ] shared PostgreSQL compatibility unchanged
- [ ] deployment runbook remains reproducible
- [ ] no new cross-service or provider-layer hops introduced
