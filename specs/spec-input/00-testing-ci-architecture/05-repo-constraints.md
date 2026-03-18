# Repo Constraints

## Existing structure

Active runtime components already exist:
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

The repo is already using:
- Nx workspace structure
- Playwright
- Jest in APIs
- GitHub Actions

## Important constraints

- feature work must continue while this testing/CI platform is built
- do not block MoneyShyft PWA or ConnectShyft triage work for a long testing-platform detour
- keep existing Jest API coverage usable
- standardize web/shared TS testing quickly with Vitest
- migration-runner should be reused for DB-backed integration harnesses
- all shared tooling must preserve future extraction into lanes/services

## Live-product constraints

- MoneyShyft and ConnectShyft are live and need better protection now
- selective smoke and release validation must protect those user-facing paths first

## Migration constraints

There may be little or no DB schema work for the testing platform itself, but:
- backend integration harness must be able to run migrations consistently
- CI must be able to validate migration safety before production deploys