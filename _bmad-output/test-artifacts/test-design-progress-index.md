# Test Design Progress Index

Use run-scoped progress files for parallel workstreams. Do not overwrite one shared progress file across different scopes.

## Active Workstreams

- Monorepo Epic 1 (Shyft platform):
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-progress.md`

- ConnectShyft System-Level (2026-02-19):
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-progress-connectshyft-system-level-2026-02-19.md`

## Naming Convention

- `test-design-progress-<scope>-<mode>-<YYYY-MM-DD>.md`
- Examples:
  - `test-design-progress-connectshyft-system-level-2026-02-19.md`
  - `test-design-progress-shyft-epic-1-2026-02-19.md`

## Guardrail

- Keep `test-design-progress.md` reserved for the active monorepo epic lane unless explicitly redirected.
- For all additional runs, create a new run-scoped file and add it to this index.
