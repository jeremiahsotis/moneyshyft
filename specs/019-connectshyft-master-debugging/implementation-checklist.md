# Implementation Checklist - Master Debugging

## Sequencing
- [ ] texting preference issue planned first
- [ ] refusal rendering issue planned second
- [ ] SMS target resolution issue planned third

## Boundaries
- [ ] each issue remains reviewable as its own patch
- [ ] no combined mega-patch
- [ ] no lane-convergence refactor introduced

## Cross-issue contracts
- [ ] canonical texting preference enum preserved
- [ ] payload `ok` handling contract preserved
- [ ] deterministic SMS target resolution rules preserved

## Non-regression
- [ ] texting preference fix does not break refusal rendering
- [ ] refusal rendering fix does not alter API envelope semantics
- [ ] target-resolution fix does not collapse into generic provider failure for known refusals

## Verification
- [ ] per-issue test plan exists
- [ ] cross-issue regression checkpoints exist
