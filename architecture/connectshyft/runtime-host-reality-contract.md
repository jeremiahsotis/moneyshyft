# ConnectShyft Runtime Host Reality Contract

Status: Governing contract

ConnectShyft runtime currently lives under:

- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/...`

Rules:
1. All fixes must patch the current runtime and UI surface surgically.
2. No lane-convergence refactor is allowed as part of this debugging sequence.
3. No code movement into `apps/connectshyft-api` is allowed unless a tiny local bug fix requires it and the reason is explicit.
4. Cross-issue work must not silently widen into architecture cleanup.
