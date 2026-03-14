# Migration Authority Convergence PR

## Summary

Describe the shared-authority promotion, reconciliation tooling, runner wiring, and guardrail changes in this PR.

## Scope Confirmation

- [ ] No runtime feature redesign
- [ ] No unrelated cleanup
- [ ] Existing convergence scaffolding was extended in place rather than overwritten
- [ ] Shared migration authority added or updated
- [ ] Reconciliation tooling added or updated
- [ ] `admin-api` remains the only authorized production runner

## Shared Authority Promotion

- [ ] `shared/database/migrations` contains the production-relevant migration set
- [ ] The authoritative set preserves filenames and ordering exactly
- [ ] The 56 shared admin/money/connect migrations were verified as byte-identical before promotion
- [ ] The 4 ConnectShyft-only migrations were promoted into shared authority without renaming
- [ ] No production-required migration exists only in runtime API folders

## Reconciliation Evidence

- [ ] Source-only reconciliation reviewed from `node scripts/reconcile-shared-migrations.js --format table`
- [ ] Machine-readable reconciliation reviewed from `node scripts/reconcile-shared-migrations.js --format json`
- [ ] Machine-enforced guard command reviewed:

```bash
node scripts/reconcile-shared-migrations.js \
  --format json \
  --fail-on-states blocked,duplicate_across_apis,ready_to_promote_to_shared,recorded_but_missing_from_source
```

- [ ] `admin-api`, `money-api`, `connect-api`, and shared authority were inventoried
- [ ] Production ledger comparison behavior was reviewed or intentionally deferred with explanation
- [ ] `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js` is represented as verified manual hotfix only
- [ ] `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js` remains inspection-required and is not auto-verified

## Authorized Runner Verification

- [ ] `apps/admin-api/knexfile.js` points production migrations to packaged shared authority
- [ ] `apps/admin-api/package.json` packages shared migrations before production artifact use
- [ ] `apps/admin-api/dist/shared/database/migrations` contains runnable JavaScript migrations after packaging
- [ ] Runtime-image or container validation confirmed the packaged shared migration path is present
- [ ] `apps/moneyshyft-api/knexfile.js` and `apps/connectshyft-api/knexfile.js` still block production migration execution

## Review / Deploy Stop Conditions

- [ ] PR review fails if reconciliation reports `blocked`
- [ ] PR review fails if reconciliation reports `duplicate_across_apis`
- [ ] PR review fails if reconciliation reports `ready_to_promote_to_shared`
- [ ] PR review fails if reconciliation reports `recorded_but_missing_from_source`
- [ ] Suggested mark-applied SQL remains operator-only text and was not executed
- [ ] No direct `public.knex_migrations` writes were performed in this change
