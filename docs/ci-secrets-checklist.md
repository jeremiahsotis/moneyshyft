# CI Secrets Checklist

Configure repository secrets/variables before enabling optional lanes and notifications.

## Required For Base Pipeline

None. The core `policy -> lint -> test -> burn-in -> quality-gates -> report` path can run without custom secrets.

## Optional Secrets

- `SLACK_WEBHOOK_URL`
  - Used by the `report` job to send failure notifications.

## Optional Variables/Secrets For Backend Contracts Lane

Triggered only when `workflow_dispatch` input `run_backend_contracts=true`:

- Variables:
  - `API_URL`
  - `RS_CONTRACT_PICKUP_PATH`
  - `RS_CONTRACT_PUBLISH_PATH`
  - `RS_CONTRACT_COMPLETE_PATH`
  - `WP_TEST_CAPABILITY`
- Secrets:
  - `WP_TEST_NONCE`
  - `WP_TEST_AUTHORIZATION`

## Verification Checklist

- [ ] Secrets added in GitHub: Settings -> Secrets and variables -> Actions.
- [ ] Variables added in GitHub: Settings -> Secrets and variables -> Actions.
- [ ] `run_backend_contracts` lane tested with safe non-production values.
- [ ] Slack notification tested with a controlled failing run.
- [ ] No plaintext credentials committed to repository files.
