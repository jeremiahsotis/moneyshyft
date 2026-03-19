# Quickstart: ConnectShyft Duplicate Phone Uniqueness Enforcement

## Goal

Implement deterministic duplicate-phone refusal for ConnectShyft neighbor writes, keep legacy duplicates ambiguous during identity resolution, and add a forward DB safety net without auto-resolving existing duplicate records.

## Slice Order

1. Shared migration and forward uniqueness safety net
2. Neighbor store and service duplicate-preflight enforcement
3. Identity ambiguity regression and route contract verification

## Slice 1: Shared Migration and Forward Uniqueness Safety Net

**Legacy duplicate inventory query**

```sql
SELECT
  phones.tenant_id,
  phones.normalized_e164,
  COUNT(DISTINCT phones.neighbor_id) AS current_owner_count,
  ARRAY_AGG(DISTINCT phones.neighbor_id ORDER BY phones.neighbor_id) AS current_neighbor_ids
FROM connectshyft.cs_neighbor_phones AS phones
JOIN connectshyft.cs_neighbors AS neighbors
  ON neighbors.tenant_id = phones.tenant_id
 AND neighbors.id = phones.neighbor_id
WHERE phones.is_active = TRUE
  AND neighbors.is_deleted = FALSE
GROUP BY phones.tenant_id, phones.normalized_e164
HAVING COUNT(DISTINCT phones.neighbor_id) > 1
ORDER BY phones.tenant_id, phones.normalized_e164;
```

**Grandfathering expectation**

- Current duplicate sets returned by the inventory query remain stored and readable.
- Duplicate current rows are backfilled to `LEGACY_EXEMPT` so the DB safety net does not choose a winner or block rollout.
- Clean current rows remain or become `ENFORCED`, which is the only state protected by the forward partial unique index.

**Rollback notes**

- Drop the partial unique index and the `uniqueness_enforcement_state` column by rolling back the shared migration and its lane-local mirror.
- Revert or disable the service/store duplicate preflight only if the refusal behavior itself must be withdrawn after the schema rollback.
- Do not mutate legacy duplicate ownership during rollback; rollback is limited to the migration/index seam and the write-validation seam.

**Source targets**

- `shared/database/migrations/*_connectshyft_neighbor_phone_uniqueness*.ts`
- `apps/connectshyft-api/src/migrations/*_connectshyft_neighbor_phone_uniqueness*.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`

**Work**

1. Add the shared migration plus lane-local mirror.
2. Introduce the narrow grandfathering marker for legacy duplicate rows.
3. Add the partial unique index for forward-enforced current phone rows.
4. Prove the SQL is idempotent and reversible without choosing merge winners.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`

**Commit checkpoint**

- Safe to commit once the shared migration, mirror, and migration tests agree on the grandfathering marker and partial unique index behavior.

## Slice 2: Neighbor Store and Service Duplicate-Preflight Enforcement

**Source targets**

- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Work**

1. Add a reusable current-owner lookup helper for in-memory and Knex-backed stores.
2. Run duplicate checks after normalization and before create, update, and inbound-create persistence.
3. Allow self-retaining updates by excluding the current neighbor from duplicate detection.
4. Return one standardized refusal:
   - `code: CONNECTSHYFT_PHONE_DUPLICATE`
   - `reason: duplicate_phone`
5. Map DB unique-index races back to the same refusal.
6. Keep update side-effect wrappers transparent to duplicate refusals.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Commit checkpoint**

- Safe to commit once create, update, and inbound-create all refuse duplicate current ownership consistently and same-neighbor saves still pass.

## Slice 3: Identity Ambiguity Regression and Route Contract Verification

**Source targets**

- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- any Slice 1 or Slice 2 files that need final regression tightening

**Work**

1. Keep `single_match`, `no_match`, and `multiple_matches` unchanged at the resolver boundary.
2. Prove multiple current owners still yield ambiguity.
3. Prove deleted-only owners yield `no_match`.
4. Prove one current owner plus deleted owners still yields `single_match`.
5. Verify duplicate-prevention changes did not introduce silent fallback or route-ownership drift.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts src/modules/connectshyft/__tests__/identityResolver.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts`

**Final acceptance**

- Duplicate current phone assignments are refused deterministically before write completion.
- The same canonical phone in different raw formats is treated as one identity.
- Legacy duplicate data still produces ambiguity rather than silent selection.
- Soft-deleted neighbors do not block reuse and do not re-enter identity resolution as current owners.
- Shared routing, Nginx delegation, Docker binding, and migration-authority contracts remain unchanged.

## Rollback Levers

1. Revert the shared migration and partial unique index if the DB safety net causes rollout issues.
2. Revert or disable the service/store duplicate-preflight helper and unique-violation mapping if write-time validation needs to be removed.
3. Revert the route refusal passthrough changes if caller surfaces need temporary rollback while preserving current lookup semantics.
