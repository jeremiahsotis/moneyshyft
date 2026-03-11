# RouteShyft WP Direct-Write Shutdown Runbook

## Objective
Shut down all direct WordPress-side RouteShyft state writes and enforce API-only integration for current/future WP plugin flows.

## Scope
This runbook applies to the WP DB principal currently used by WordPress/plugin code to write RouteShyft authority tables.

## Preconditions
1. `ROUTESHYFT_WP_CUTOVER_STAGE=monolith_authoritative` is active in API runtime.
2. Route bridge reconcile-only verification already passes (`driftDetected=false`, `singleSourceOfTruthConfirmed=true`).
3. WP DB admin credentials and the WP plugin write principal are identified.

## Execution
Set variables for your target WordPress environment and run:

```bash
export WP_DB_HOST='<wordpress-db-host>'
export WP_DB_PORT='3306'
export WP_DB_NAME='<wordpress-db-name>'
export WP_DB_ADMIN_USER='<admin-user>'
export WP_DB_ADMIN_PASSWORD='<admin-password>'
export WP_DB_WRITE_USER='<wp-plugin-writer-user>'
export WP_DB_WRITE_HOST='%'
export WP_ROUTE_TABLES='<comma-separated-routeshyft-authority-tables>'

export RS_CUTOVER_API_BASE_URL='https://<api-host>'
export RS_CUTOVER_LOGIN_EMAIL='operator@example.com'
export RS_CUTOVER_LOGIN_PASSWORD='<operator-password>'

npm run cutover:shutdown:wp-writes -- --apply
```

## What the script enforces
1. Revokes `INSERT`, `UPDATE`, and `DELETE` privileges from the WP write principal for RouteShyft scope.
2. Optionally preserves `SELECT` access (`WP_ENFORCE_SELECT_ONLY=true`, default).
3. Runs post-change reconcile-only verification via Route bridge API.
4. Archives release evidence under `_bmad-output/test-artifacts/release-evidence/wp-write-shutdown-<timestamp>/`.

## Release-Gate Criteria
1. Report JSON indicates `success=true`.
2. DB verification indicates no remaining write grants for the WP write principal.
3. API verification indicates drift-free reconcile-only success.
4. Evidence bundle is committed and referenced in release notes/checklist.

## Future WP Plugin Contract
After shutdown, plugin integration must satisfy all items:
1. No direct DB writes to RouteShyft authority tables.
2. All writes go through `/api/v1/route-bridge/*` with `wpWriteMode=api_only` where required.
3. Plugin requests include deterministic idempotency keys and lineage identifiers.
4. WP deployment/runtime must not include credentials capable of RouteShyft authority table writes.
