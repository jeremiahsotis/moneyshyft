# CI Pipeline Guide

This repository uses GitHub Actions at `.github/workflows/test.yml`.

## Pipeline Order

1. `policy`: blocks the pipeline if `npm run policy:check` fails.
2. `lint`: runs lint/discovery checks after policy passes.
3. `test`: Playwright runs in 4 shards (`fail-fast: false`).
4. `burn-in`: 10-iteration burn-in loop on pull requests and scheduled runs.
5. `quality-gates`: enforces release thresholds from test artifacts.
6. `backend-contracts`: optional `workflow_dispatch` lane for live API contracts.
7. `report`: publishes CI summary and sends optional Slack failure notice.

## Local Parity

Use the same guardrails locally:

- `npm run policy:check`
- `bash scripts/lint-or-discovery.sh`
- `bash scripts/test-changed.sh origin/production`
- `bash scripts/burn-in.sh 10 origin/production`
- `bash scripts/quality-gates.sh`

Or run the consolidated helper:

- `bash scripts/ci-local.sh`

## Quality Thresholds

`scripts/quality-gates.sh` enforces:

- `@P0` pass rate must be `100%`
- `@P1` pass rate must be at least `95%`
- required security verification suites must execute and pass

## Artifacts

- Per-shard gate snapshots: uploaded for all test shards.
- Failure debug artifacts: uploaded only on shard or burn-in failures.
- Quality-gate output bundle: uploaded on every quality-gates run.

## Troubleshooting

- If dependencies look stale, verify lockfile-aware cache inputs are unchanged.
- If quality-gates cannot find results, confirm `gate-snapshot-shard-*` artifacts are present.
- If runtime setup fails in CI, check `tests/artifacts/runtime/` logs in uploaded artifacts.
