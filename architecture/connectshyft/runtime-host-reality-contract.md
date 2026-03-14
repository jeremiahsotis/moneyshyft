# ConnectShyft Runtime Host Reality Contract

Status: Governing contract for these two issues

## Runtime host reality

Even though these are ConnectShyft features, the current runtime path lives under:

- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/...`

## Rules

1. These issues must patch the current runtime host surgically.
2. No lane-convergence refactor is allowed as part of either issue.
3. No code movement into `apps/connectshyft-api` is allowed unless strictly required for a local bug fix, and only if explicitly justified.
4. Specs, prompts, and PR review must treat `moneyshyft-api` as the runtime execution surface.
5. Any architecture cleanup discovered during work must be documented, not absorbed into implementation scope.

## Non-goals

- finishing ConnectShyft lane separation
- cleaning logger naming residue
- broad provider abstraction redesign
