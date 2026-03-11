# C.1 Real-User Validation Evidence (2026-02-24)

## Environment
- Validation workspace: `/Users/jeremiahotis/projects/connectshyft`
- Database container: `moneyshyft-postgres-1`
- Database target: `moneyshyft` as user `jeremiahotis`

## Command Log (executed)
1. `docker exec -i moneyshyft-postgres-1 psql -U jeremiahotis -d moneyshyft -c "SELECT current_database(), current_user, inet_server_addr(), inet_server_port();"`
2. `docker run --rm --network container:moneyshyft-postgres-1 -v /Users/jeremiahotis/projects/connectshyft:/work -w /work/src node:22-bullseye bash -lc "MONEYSHYFT_TEST_DATABASE_URL='postgresql://jeremiahotis:Oiruueu12@127.0.0.1:5432/moneyshyft' npm test -- --runInBand --verbose src/src/modules/connectshyft/__tests__/threads.contract.test.ts"`
3. SQL schema/index checks (information_schema + pg_indexes)
4. SQL row-level checks (duplicate active-thread tuples + claimed/closed nullable scheduler check)
5. SQL EXPLAIN due-thread scan with `enable_seqscan=off`

## Result Summary
- DB connection: success.
- Contract suite: **pass** (`3 passed, 3 total`).
  - `enforces single-active-thread identity under write races and preserves latest ensure metadata`
  - `supports nullable next_evaluation_at_utc for non-due lifecycle states`
  - `maintains an index-backed due-thread scan contract`
- Schema/index checks: **pass**.
  - `tenant_id`, `org_unit_id`, `neighbor_id` are `NOT NULL`.
  - `next_evaluation_at_utc` is nullable (`YES`).
  - Due index predicate includes `next_evaluation_at_utc IS NOT NULL`.
- Row-level checks: **pass**.
  - Duplicate active-thread tuples query returned `0 rows`.
  - Claimed/closed rows with non-null `next_evaluation_at_utc` (contract-test tenant scope) returned `0 rows`.
- EXPLAIN due-scan plan: **pass**.
  - Plan shows `Index Only Scan using cs_threads_due_eval_idx`.

## Artifacts
- `00-db-connection.txt`
- `01-migrate-latest.txt`
- `01b-migrate-latest-explicit-dburl.txt`
- `01c-migrate-latest-escalated.txt`
- `02-threads-contract-test.txt`
- `03-schema-and-index-checks.txt`
- `04-row-level-checks.txt`
- `05-explain-due-scan.txt`
- `06-evidence-summary.md`
