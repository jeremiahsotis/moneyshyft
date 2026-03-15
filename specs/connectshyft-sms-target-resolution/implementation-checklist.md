# Implementation Checklist - SMS Target Resolution

## Runtime host
- [ ] work is scoped to current `apps/moneyshyft-api` ConnectShyft runtime
- [ ] no lane-convergence refactor introduced

## Target resolution
- [ ] thread-explicit SMS target checked first
- [ ] neighbor primary active valid phone checked
- [ ] fallback to only active valid phone only when deterministic
- [ ] no guessing when multiple phones exist

## Texting gate
- [ ] `prefers_texting = YES` is required for SMS send

## Refusals
- [ ] missing target phone refusal is explicit
- [ ] multiple target phones refusal is explicit
- [ ] texting-not-permitted refusal is explicit
- [ ] known pre-provider failures do not collapse into generic provider failure

## Verification
- [ ] success path test from VOICE-origin thread
- [ ] no-phone refusal test
- [ ] multiple-phone refusal test
- [ ] texting-preference refusal test
