# Implementation Checklist - ConnectShyft Master Debugging

## Sequencing

- [ ] texting preference issue planned first
- [ ] refusal rendering issue planned second
- [ ] SMS target resolution issue planned third
- [ ] three separate implementation patches preserved
- [ ] no combined mega-patch introduced

## Live Runtime Boundary

- [ ] live UI runtime treated as the ConnectShyft router
- [ ] live API runtime treated as `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [ ] work remains inside `connectshyft-*` runtime surfaces unless a narrow existing shared helper is required
- [ ] no move into `apps/moneyshyft-*`
- [ ] no lane-convergence remediation introduced

## Phase 1 - Texting Preference

- [ ] defect captured as `prefersTexting` being dropped at the API boundary
- [ ] defect captured as persistence hardcoding canonical value to `UNKNOWN`
- [ ] canonical texting preference enum preserved as `YES`, `NO`, `UNKNOWN`
- [ ] new neighbors default to `YES`
- [ ] texting preference persistence, serialization, and display stay aligned
- [ ] `smsPreferenceOverrides` treated as the only allowed bridge from Phase 1 to Phase 3

## Phase 2 - Refusal Rendering

- [ ] defect captured as inbox action wrappers flattening refusal semantics
- [ ] thread detail path recognized as the richer existing refusal reference behavior
- [ ] payload `ok` and refusal handling contract preserved
- [ ] refusal rendering stays distinct from transport failure rendering
- [ ] thread action and result shape treated as the only allowed bridge from Phase 2 to Phase 3

## Phase 3 - SMS Target Resolution

- [ ] defect captured as SMS using request `targetPhone` or first active phone instead of deterministic order
- [ ] deterministic order preserved: explicit outbound request target, primary active valid phone, only active valid phone if exactly one, otherwise refusal
- [ ] no provider redesign introduced
- [ ] known pre-provider refusal paths remain explicit rather than collapsing into generic provider failure

## Verification

- [ ] per-phase regression checkpoints documented
- [ ] cross-phase regression checkpoints documented
- [ ] test order documented
- [ ] final regression confirms trustworthy texting state, visible refusal state, and deterministic SMS behavior together
