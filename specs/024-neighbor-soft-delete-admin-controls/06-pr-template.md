# PR 024 — Neighbor Soft Delete + Admin Controls

## Summary

Introduces soft delete for neighbors, enabling safe removal from operational use while preserving data and audit history.

---

## Changes

- Added soft delete fields to neighbors
- Implemented admin-only delete endpoint
- Deactivated phones on delete
- Excluded deleted neighbors from UI queries
- Added thread-level deletion indicators
- Added audit logging

---

## Why

Needed to safely remove test/invalid data in production without breaking integrity or losing audit history.

---

## Testing

- Verified delete flow
- Verified query filtering
- Verified inbound SMS behavior
- Verified phone reuse

---

## Risks

- accidental exposure of deleted records
- resolver including deleted neighbors

---

## Rollback

- revert schema changes
- remove filters
- disable endpoint

---

## Checklist

- [ ] Admin-only enforcement verified
- [ ] Phones deactivated on delete
- [ ] Resolver excludes deleted neighbors
- [ ] Threads correctly annotated
