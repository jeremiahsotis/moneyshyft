# Quickstart: ConnectShyft Neighbor Soft Delete Admin Controls

## Goal

Implement admin-only neighbor soft delete using the existing lifecycle columns, release phone numbers by deactivating all deleted-neighbor phones, hide deleted records from standard operational reads, preserve deleted-state review through the existing ConnectShyft detail routes when `includeDeleted=true`, and keep inbound SMS on deleted-only phone history creating a new neighbor.

## Slice Order

1. Add the transactional soft-delete command in the neighbor store/service layer
2. Filter standard reads and enrich deleted-neighbor thread detail
3. Add the delete route, inbound regressions, and final platform-contract verification

## Preflight

**Verify lifecycle columns already exist**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'connectshyft'
  AND table_name = 'cs_neighbors'
  AND column_name IN ('is_deleted', 'deleted_at_utc', 'deleted_by_user_id')
ORDER BY column_name;
```

Expected result:

- `deleted_at_utc`
- `deleted_by_user_id`
- `is_deleted`

If any column is missing locally, run the existing lifecycle migration before implementing feature `024`.

## Slice 1: Transactional Soft Delete

**Source targets**

- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`

**Work**

1. Add `softDeleteNeighbor(...)` to the in-memory and Knex-backed neighbor store/service paths.
2. Require `irreversibleConfirmation = true` before any mutation runs.
3. Update neighbor lifecycle fields and deactivate all related phones in one transaction.
4. Preserve repeated delete attempts as idempotent no-op successes with the original deleted state intact and without emitting a duplicate soft-delete audit event.

**Inspection query**

```sql
SELECT id, tenant_id, is_deleted, deleted_at_utc, deleted_by_user_id
FROM connectshyft.cs_neighbors
WHERE id = '<neighbor-id>';

SELECT neighbor_id, normalized_e164, is_active
FROM connectshyft.cs_neighbor_phones
WHERE neighbor_id = '<neighbor-id>'
ORDER BY sort_order, id;
```

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts`

## Slice 2: Standard Read Filtering and Deleted-Thread Projection

**Source targets**

- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Work**

1. Make standard neighbor list/search paths return active-only results.
2. Keep deleted-neighbor and deleted-thread detail available only through the existing ConnectShyft detail routes when `includeDeleted=true` is supplied by an authorized admin/debug caller.
3. Enrich thread projections with `neighbor_deleted` and `neighbor_deleted_at_utc`.
4. Exclude deleted-neighbor threads from standard inbox/detail flows.

**Verification focus**

- Deleted neighbors are absent from standard list/search responses.
- Deleted-neighbor thread detail remains inspectable only through the existing ConnectShyft detail routes when `includeDeleted=true`.
- Thread detail returns the deleted-state flags required by the feature.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/readContracts.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

## Slice 3: Delete Route, Inbound Regression, and Final Verification

**Source targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- verification-only platform contract files:
  - `nginx/nginx.conf`
  - `docker-compose.example.yml`
  - `apps/connectshyft-api/Dockerfile.production`
  - `apps/admin-api/knexfile.js`
  - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Work**

1. Add `DELETE /api/v1/connectshyft/neighbors/:neighborId`.
2. Gate the route with tenant-privileged capability plus explicit irreversible confirmation.
3. Route the mutation through the existing platform mutation audit/outbox seam.
4. Reconfirm inbound SMS to deleted-only phone history creates a new neighbor and does not resurrect the deleted one.
5. Reconfirm route ownership, host Nginx delegation, ConnectShyft API localhost-only binding on canonical port `3002`, shared Postgres connectivity, deployment runbook reproducibility, and shared migration authority remain unchanged.

**Delete request example**

```http
DELETE /api/v1/connectshyft/neighbors/11111111-1111-4111-8111-111111111111
Content-Type: application/json

{
  "orgUnitId": "22222222-2222-4222-8222-222222222222",
  "irreversibleConfirmation": true
}
```

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

## Rollback Levers

1. Revert the soft-delete command and route if deletion behavior must be withdrawn.
2. Revert the standard-read filters and deleted-thread projection enrichment if deleted records are being hidden or shown incorrectly.
3. Disable the delete endpoint while preserving historical data if an incident requires operational rollback.
4. Schema rollback is not expected for this feature because the lifecycle columns already exist; only use migration rollback if implementation changes that assumption.
