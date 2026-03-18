# Implementation Checklist - Migration Authority Convergence

## Structure
- [ ] `shared/database/migrations` created
- [ ] `shared/database/reconciliation` created

## Reconciliation tooling
- [ ] `scripts/reconcile-shared-migrations.js` added
- [ ] inventories admin-api migrations
- [ ] inventories money-api migrations
- [ ] inventories connect-api migrations
- [ ] inventories shared migrations
- [ ] compares against `public.knex_migrations`

## Classifications
- [ ] `recorded_and_present`
- [ ] `duplicate_across_apis`
- [ ] `ready_to_promote_to_shared`
- [ ] `ready_to_run`
- [ ] `manual_hotfix_needs_mark_applied`
- [ ] `recorded_but_missing_from_source`
- [ ] `blocked`

## Manual hotfix support
- [ ] overrides file added
- [ ] current ConnectShyft manual hotfix represented
- [ ] mark-applied SQL suggestions supported

## Authorized runner
- [ ] authorized runner reads shared migration authority
- [ ] runtime APIs remain blocked from production migration execution

## Guardrails
- [ ] PR template added
- [ ] deploy gate path documented
