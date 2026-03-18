# US3 CI Target Evidence

- `scripts/ci-run-playwright-stack.sh` now starts frontend from `apps/connectshyft-web`.
- `scripts/run-playwright-with-preflight.sh` now resolves frontend app dir from `apps/connectshyft-web`.
- `test.yml` and `burn-in.yml` naming/trigger assumptions updated to ConnectShyft CI context.
- New lane convergence guard added and wired into policy checks.
