# Contract: CS-001 Build Target Convergence

## Objective

ConnectShyft UI tests/builds must target `connectshyft-web` as authoritative frontend.

## Required Target Changes

1. Retarget Playwright stack startup scripts:
   - `scripts/ci-run-playwright-stack.sh`
   - `scripts/run-playwright-with-preflight.sh`
   So ConnectShyft UI suites launch `apps/connectshyft-web` (not `apps/moneyshyft-web`).

2. Ensure CI workflow uses converged stack behavior:
   - `.github/workflows/test.yml`
   - `.github/workflows/burn-in.yml` (if it executes UI flows touching ConnectShyft routes)

3. Build ownership:
   - ConnectShyft UI build verification must include `nx run connectshyft-web:build`.
   - `moneyshyft-web:build` should not be the validation gate for ConnectShyft UI parity.

4. Guardrail target:
   - CI/policy must fail if ConnectShyft UI reappears in `apps/moneyshyft-web/src/views/ConnectShyft` or `apps/moneyshyft-web/src/components/connectshyft`.

## Validation

- Stack script frontend startup command points to `apps/connectshyft-web` for ConnectShyft suites.
- CI logs prove ConnectShyft E2E executed against ConnectShyft frontend.
- Guard script fails on prohibited money-lane ConnectShyft UI paths.

