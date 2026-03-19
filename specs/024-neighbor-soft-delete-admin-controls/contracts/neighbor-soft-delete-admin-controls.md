# Contract: ConnectShyft Neighbor Soft Delete Admin Controls

## Objective

Remove neighbors from operational use through an admin-only soft-delete path that preserves historical data, deactivates released phones, keeps deleted records inspectable in admin/debug contexts, and prevents deleted identities from returning to normal messaging, calling, or inbound resolution flows.

## Allowed runtime surface

- Existing lifecycle schema authority only:
  - `shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts`
  - `apps/connectshyft-api/src/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts`
  - `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
  - soft-delete command and store transaction
  - standard active-only list behavior
  - deleted-aware detail behavior when existing ConnectShyft detail routes are called with `includeDeleted=true`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
  - deleted-neighbor filtering for standard inbox/detail flows
  - `neighbor_deleted` projection enrichment for admin/debug detail
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
  - unchanged active-only subject-resolution boundary
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - admin-only delete route
  - deleted-aware detail gating for `includeDeleted=true`
  - refusal shaping and audit mutation wiring
- Existing related tests only:
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
  - existing platform-contract verification files only

## Delete route contract

### Route surface

- `DELETE /api/v1/connectshyft/neighbors/:neighborId` is the only supported operational deletion entrypoint for this feature.
- The route remains ConnectShyft-lane owned. It must not move under `/api/v1/platform/admin/*`.
- The caller must provide `irreversibleConfirmation = true` before the mutation may proceed.
- Business refusals continue to use the existing ConnectShyft convention of HTTP `200` with `refusalType: 'business'`.

### Authorization rules

1. The route requires the existing tenant-privileged neighbor-admin capability path.
2. Relationship-gated neighbor edit access is not sufficient for soft delete.
3. The route must derive `actorUserId` from authenticated request context rather than trusting caller-supplied actor identifiers.

### Deletion rules

1. A first-time successful delete must:
   - set `is_deleted = true`
   - set `deleted_at_utc`
   - set `deleted_by_user_id`
   - set every related phone assignment to `is_active = false`
2. No physical deletion of neighbors, phones, threads, or messages is allowed.
3. A repeated delete against an already-deleted neighbor must preserve the original deleted state and audit trail without creating duplicate destructive side effects or a new soft-delete audit event.

## Read-surface contract

### Standard operational reads

- Standard neighbor list/search behavior must exclude deleted neighbors.
- Standard messaging and calling selection behavior must exclude deleted neighbors.
- Standard inbox and standard thread detail flows must exclude threads whose associated neighbor is deleted.

### Admin/debug reads

- Deleted neighbors must remain retrievable through the existing ConnectShyft detail routes when an authorized admin/debug caller supplies `includeDeleted=true`.
- Deleted-neighbor thread detail must remain retrievable through the existing ConnectShyft detail routes when an authorized admin/debug caller supplies `includeDeleted=true`.
- Admin/debug deleted-neighbor thread responses must include:
  - `neighbor_deleted = true`
  - `neighbor_deleted_at_utc`

## Inbound identity contract

- Active-only neighbor resolution remains authoritative for inbound SMS.
- If a phone is owned only by deleted historical records, inbound SMS must create a new neighbor.
- Deleted neighbors and deleted phone ownership must never be resurrected by this feature.

## Audit contract

- First-time successful delete transitions must emit a dedicated neighbor soft-delete audit event.
- Repeated delete requests that return preserved deleted metadata must not emit a second soft-delete audit event.
- The audit payload must include:
  - tenant scope
  - org-unit scope
  - `actor_user_id`
  - `neighbor_id`
  - deletion timestamp
- Audit persistence must use the existing transactional mutation/audit seam already used by other neighbor lifecycle mutations.

## Must hold constant

- `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain `admin-api` owned.
- Host Nginx, localhost-only API binding, and shared Postgres topology remain unchanged.
- `shared/database/migrations` remains the canonical production schema authority.
- No hard delete, restore/undo, merge workflow, retention workflow, or cascade delete behavior is added by this feature.
