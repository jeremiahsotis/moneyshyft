# PR 024 — Neighbor Soft Delete + Admin Controls

## Summary

Introduces soft delete as the only supported neighbor deletion path, allowing admins to remove neighbors from operational use without destroying historical data while preserving auditability and controlled phone-number reuse.

---

## Changes

- Added auditable deleted-state fields to neighbors and preserved historical records instead of physically deleting them.
- Restricted neighbor deletion to authorized admin use with an irreversible confirmation requirement.
- Deactivated all deleted-neighbor phone assignments so released numbers can be reused safely.
- Excluded soft-deleted neighbors from standard list, search, messaging, calling, and normal thread flows.
- Kept deleted neighbors plus their threads visible through the existing ConnectShyft detail routes when `includeDeleted=true`, with explicit deleted-state indicators.
- Ensured inbound SMS to deleted-only phone ownership creates a new neighbor instead of resurrecting the deleted one.
- Added audit logging for every first-time successful soft delete transition.

---

## Why

Operational teams need a safe way to retire bad, duplicate, or no-longer-usable neighbor records without losing historical context, breaking phone reuse, or undermining investigation and audit workflows.

---

## Testing

- Verified authorized soft delete marks deletion metadata, preserves history, and deactivates all neighbor phones.
- Verified delete attempts without elevated admin access or irreversible confirmation fail without side effects.
- Verified standard operational list/search/messaging/calling flows exclude soft-deleted neighbors.
- Verified deleted-aware retrieval through `includeDeleted=true` still shows deleted neighbors and thread-level deleted indicators.
- Verified inbound SMS to deleted-only phone ownership creates a new neighbor and does not resurrect the deleted one.
- Verified phone reuse remains compatible with active-owner uniqueness rules.

---

## Risks

- Accidental reintroduction of deleted neighbors into standard operational queries or selection flows.
- Missing deleted-state indicators in deleted-aware thread responses, reducing audit clarity.
- Inbound SMS or phone-reuse logic accidentally treating deleted ownership as active.

---

## Rollback

- Disable the soft-delete flow and restore prior operational behavior only through an explicit follow-up remediation plan.
- Revert deletion-state changes, operational filters, and audit wiring together if rollback is required.
- Validate that released phone-number ownership and inbound messaging behavior return to a coherent prior state before closing rollback.

---

## Checklist

- [ ] Admin-only enforcement verified
- [ ] Irreversible confirmation requirement verified
- [ ] Phones deactivated on delete
- [ ] Standard list/search/messaging/calling flows exclude deleted neighbors
- [ ] Deleted-aware retrieval through `includeDeleted=true` exposes deletion metadata
- [ ] Threads correctly annotated
- [ ] Inbound SMS creates a new neighbor for deleted-only phone ownership
