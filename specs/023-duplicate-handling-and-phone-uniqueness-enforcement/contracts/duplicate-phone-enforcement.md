# Contract: ConnectShyft Duplicate Phone Enforcement

## Objective

Prevent new duplicate canonical phone assignments across current ConnectShyft neighbors while preserving deterministic ambiguity behavior for legacy duplicates that already exist.

## Allowed runtime surface

- `shared/database/migrations/*_connectshyft_neighbor_phone_uniqueness*.ts`
  - canonical schema authority for the forward uniqueness safety net
- `apps/connectshyft-api/src/migrations/*_connectshyft_neighbor_phone_uniqueness*.ts`
  - lane-local mirror for local tooling compatibility
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
  - duplicate-owner lookup
  - create and update refusal shaping
  - inbound-create safety check
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
  - unchanged subject-resolution result contract
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - neighbor create and update route refusal passthrough
- Existing related tests only:
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
  - migration SQL-shape tests under `apps/connectshyft-api/src/migrations/__tests__/`

## Neighbor write contract

### Route surface

- `POST /api/v1/connectshyft/neighbors` remains the create endpoint.
- `PUT /api/v1/connectshyft/neighbors/:neighborId` remains the full update and phone replacement endpoint.
- Business refusals for these endpoints remain HTTP `200` with `refusalType: 'business'`, consistent with current ConnectShyft route conventions.

### Internal write surface

- `createNeighbor(...)`
- `updateNeighbor(...)`
- `createNeighborFromInbound(...)`

These write paths must all consult the same duplicate-owner rule before mutating storage.

## Duplicate comparison rules

1. Compare only canonical normalized E.164 values.
2. A conflicting owner is another row in the same tenant where:
   - `cs_neighbor_phones.is_active = true`
   - the parent neighbor has `is_deleted = false`
   - the conflicting `neighborId` is not the same neighbor currently being updated
3. Soft-deleted neighbors do not count toward uniqueness and do not block reuse.
4. Legacy duplicate current rows still block new writes to the same canonical phone until cleanup removes the duplicate condition.
5. No caller may bypass duplicate checks with raw string formatting variants.

## Duplicate refusal contract

When a write attempts to assign a canonical phone already owned by another current non-deleted neighbor, the system must return a business refusal with:

- `code: CONNECTSHYFT_PHONE_DUPLICATE`
- `data.reason: duplicate_phone`
- `data.fieldErrors[]` containing a `phones` field error with reason `duplicate_phone`

The refusal must also guarantee:

- no phone ownership transfer
- no overwrite of the existing owner
- no merge or reactivation side effects
- no partial write of the attempted mutation

## DB safety-net contract

- The schema adds a narrow phone-row grandfathering marker so the DB safety net can distinguish forward-enforced rows from legacy duplicate rows that must remain stored.
- A partial unique index protects enforced current phone rows by canonical value within tenant scope.
- Any unique-constraint violation from that partial unique index must map back to the same `CONNECTSHYFT_PHONE_DUPLICATE` refusal returned by service preflight validation.
- The DB safety net must not silently hide legacy duplicates from identity-resolution reads.

## Identity resolution contract

### `resolveSubjectByContactPoint(input)`

**Output**

- `single_match`
- `no_match`
- `multiple_matches`

### Rules

1. More than one current non-deleted owner for the same canonical phone must return `multiple_matches`.
2. `multiple_matches` is a hard refusal outcome. No silent fallback or arbitrary selection is allowed.
3. Deleted-only matches must return `no_match`.
4. A mix of one current owner plus deleted owners must return `single_match` for the current owner.

## Must hold constant

- `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain `admin-api` owned.
- Shared host Nginx, localhost-only API binding, and shared Postgres topology remain unchanged.
- `shared/database/migrations` remains the only canonical production schema authority.
- No merge tooling, cleanup tooling, heuristic winner selection, or PeopleCore integration is added by this feature.
