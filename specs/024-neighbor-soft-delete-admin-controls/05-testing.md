# PR 024 — Testing Obligations

## Unit Tests

- Soft delete marks the neighbor deleted and records `deleted_at_utc` plus `deleted_by_user_id`.
- Soft delete deactivates every phone attached to the deleted neighbor.
- Repeated delete attempts preserve the existing deleted state, do not create destructive side effects, and do not emit a second soft-delete audit event.
- First-time successful soft delete emits an audit event with neighbor, actor, and timestamp data.

## Integration Tests

### Delete Flow

- Authorized admin with `irreversibleConfirmation` can soft delete an active neighbor.
- Delete request without `irreversibleConfirmation` fails with no persisted changes.
- Delete request without elevated admin capability fails with no persisted changes.
- Delete request for a neighbor without phones still succeeds and records deletion metadata.

### Query Behavior

- Soft-deleted neighbors are excluded from standard list and search responses.
- Soft-deleted neighbors are not selectable for messaging or calling flows.
- Soft-deleted neighbors remain retrievable through the existing ConnectShyft detail routes when `includeDeleted=true` and expose deletion metadata.

### Thread Behavior

- Threads for soft-deleted neighbors remain available through the existing ConnectShyft detail routes when `includeDeleted=true`.
- Thread responses for deleted neighbors include `neighbor_deleted = true`.
- Thread responses for deleted neighbors include `neighbor_deleted_at_utc`.
- Normal operational thread flows exclude threads tied to soft-deleted neighbors.

### Inbound SMS and Phone Reuse

- Inbound SMS to a phone owned only by a soft-deleted neighbor creates a new neighbor.
- Inbound SMS to a deleted-neighbor phone does not resurrect the deleted record.
- A phone released by soft delete can be reused by a new active neighbor without violating active-owner uniqueness.
- Later inbound or operational use resolves to the current active owner when a released phone has already been reassigned.

## Regression Tests

- Existing inbound SMS identity handling from PR 022 still succeeds for active neighbors.
- Existing phone uniqueness guarantees from PR 023 remain enforced for active phone ownership.
- Deleted-aware review through `includeDeleted=true` still surfaces preserved historical records without reintroducing deleted neighbors into standard operational flows.
