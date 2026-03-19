# Research: ConnectShyft Neighbor Soft Delete Admin Controls

No open clarification markers remained after loading the `024` spec, the user-supplied planning constraints, the existing ConnectShyft neighbor store, the thread read-contract layer, and the route authorization model. The decisions below resolve the implementation-planning questions that materially affect scope.

## Decision 1: Reuse the existing deleted-neighbor lifecycle schema instead of creating a second lifecycle migration

- **Decision**: Treat `is_deleted`, `deleted_at_utc`, and `deleted_by_user_id` as already-established schema fields owned by the existing lifecycle migration, and implement feature `024` against those columns rather than creating a duplicate migration.
- **Rationale**: `shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts` and its ConnectShyft mirror already add the exact lifecycle columns required by the spec. Re-planning the same schema delta would create drift, duplicate migration risk, and unnecessary rollback complexity.
- **Alternatives considered**:
  - Create a new migration that re-adds the same columns: rejected because the columns already exist and duplicate schema work would be error-prone.
  - Hide the existing lifecycle migration and move deletion state into a separate table: rejected because the current schema already matches the approved feature contract.

## Decision 2: Soft delete must be one transactional neighbor-store mutation that also deactivates all phone assignments

- **Decision**: Add a dedicated `softDeleteNeighbor({ tenantId, neighborId, actorUserId, irreversibleConfirmation })` mutation in the in-memory and Knex-backed neighbor stores, and make the Knex implementation update neighbor deletion metadata plus all related phone `is_active` flags in the same transaction.
- **Rationale**: Phone reuse is part of the delete contract. If deletion metadata and phone deactivation can diverge, the system can preserve a deleted neighbor while still blocking number reuse or leaving active identity ownership behind. A single transactional write is the only safe seam.
- **Alternatives considered**:
  - Update neighbor deletion state first and deactivate phones in a follow-up step: rejected because partial success would violate the feature’s reuse and audit guarantees.
  - Deactivate phones only in the route layer: rejected because the business rule belongs with the persistence mutation and must protect non-route callers and tests too.

## Decision 3: Keep the delete route in the ConnectShyft lane and gate it with tenant-privileged capability plus explicit confirmation

- **Decision**: Implement `DELETE /api/v1/connectshyft/neighbors/:neighborId` as a ConnectShyft-owned route, require the existing tenant-privileged neighbor-edit capability path, and require `irreversibleConfirmation = true` before any mutation is attempted.
- **Rationale**: The constitution reserves only `/api/v1/auth/*` and `/api/v1/platform/admin/*` for `admin-api`. This deletion feature is lane-specific ConnectShyft business behavior, so it must remain lane-owned even though it is admin-only. Using the existing tenant-privileged capability seam is lower-risk than inventing a new cross-lane permission surface.
- **Alternatives considered**:
  - Move neighbor deletion under `/api/v1/platform/admin/*`: rejected because it would violate current route-ownership boundaries.
  - Reuse relationship-gated neighbor edit policy for deletion: rejected because soft delete is explicitly admin-only and must not be available through ordinary relationship-based edit access.

## Decision 4: Use the existing platform mutation audit/outbox seam for soft-delete auditability

- **Decision**: Record successful soft deletes through the existing `executePlatformMutation(...)` audit/outbox pattern with a dedicated neighbor soft-delete event and include actor, tenant, org unit, and neighbor identifiers in the event payload.
- **Rationale**: Neighbor update and merge flows already use the platform mutation seam for auditable business mutations. Soft delete is the same class of lifecycle mutation and needs the same transactional audit discipline. The communication audit log is optimized for telephony workflows, not admin lifecycle changes.
- **Alternatives considered**:
  - Write only to `communicationAuditLog.ts`: rejected because the operation is not a communication event and would create an inconsistent audit strategy for neighbor lifecycle mutations.
  - Emit a best-effort audit event after the DB write commits: rejected because a post-commit failure would break the requirement that every first-time successful soft delete is auditable.

## Decision 5: Repeated delete attempts should be idempotent no-op successes that preserve the original audit trail

- **Decision**: When a caller targets an already soft-deleted neighbor with valid authorization and confirmation, return the existing deleted state without performing a second destructive mutation and without emitting a duplicate soft-delete audit event.
- **Rationale**: The spec requires repeated delete attempts to preserve deletion history and avoid duplicate destructive side effects. Idempotent success is simpler for callers, safer for retries, and keeps the original actor/timestamp as the authoritative deletion record.
- **Alternatives considered**:
  - Return a hard business refusal such as `already_deleted`: rejected because retried admin requests would need special handling and the feature does not require a separate terminal error.
  - Emit a second audit event on every repeated delete call: rejected because it would blur the meaning of the original deletion record and create audit noise rather than audit clarity.

## Decision 6: Standard thread and neighbor reads need an active-only branch, while deleted-aware detail uses the existing ConnectShyft routes with `includeDeleted=true`

- **Decision**: Keep normal operational reads active-only, but make deleted-aware detail retrieval available only through the existing ConnectShyft detail routes when an authorized admin/debug caller supplies `includeDeleted=true`, so deleted neighbors and deleted-neighbor threads remain inspectable without reappearing in normal UI flows.
- **Rationale**: The current neighbor store and route detail paths can still resolve deleted records, while the read-contract layer currently has no deleted-neighbor enrichment at all. The feature needs both behaviors at once: ordinary operators must stop seeing deleted records, and admins must still be able to inspect them with explicit deletion metadata through a concrete, lane-owned route contract.
- **Alternatives considered**:
  - Filter deleted records out of every read path with no admin/debug exception: rejected because it would fail the auditability requirement.
  - Leave current detail reads unchanged for all authorized users: rejected because deleted records would remain too broadly visible and violate the “admin/debug only” requirement.

## Decision 7: Deleted-thread indicators belong in the read-contract projection layer, not in the thread persistence model

- **Decision**: Enrich `readContracts.ts` so inbox/detail projections can include `neighbor_deleted` and `neighbor_deleted_at_utc` based on the current neighbor lifecycle state associated with each thread.
- **Rationale**: The missing behavior is in thread query projection, not in thread lifecycle persistence. `cs_threads` already carries `neighbor_id`, and the thread routes already rely on `readContracts.ts` for operator-facing detail. Enriching that projection layer keeps thread storage unchanged while satisfying the feature’s response contract.
- **Alternatives considered**:
  - Copy deleted flags into `cs_threads`: rejected because it would duplicate lifecycle state and introduce synchronization risk.
  - Leave read contracts unchanged and let callers infer deletion state elsewhere: rejected because the feature explicitly requires deleted indicators in thread responses.

## Decision 8: Inbound SMS behavior already has the right active-only identity seam, so this feature mainly needs regression hardening

- **Decision**: Preserve the current active-only inbound identity behavior and add regression coverage proving that deleted-only phone ownership still results in new-neighbor creation after soft delete deactivates the old phone rows.
- **Rationale**: The current active lookup helpers and active identity-boundary queries already exclude deleted neighbors. Feature `024` primarily changes how records enter the deleted state and how their phones are released, not the ordered inbound resolution contract itself.
- **Alternatives considered**:
  - Introduce a new inbound-only deleted-neighbor fallback path: rejected because the existing active-only resolver contract already matches the approved behavior.
  - Let inbound SMS reactivate deleted phones or neighbors: rejected because the spec explicitly forbids resurrection.
