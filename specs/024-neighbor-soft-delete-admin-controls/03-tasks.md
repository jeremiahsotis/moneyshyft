# PR 024 — Tasks

## Schema

- [ ] Add is_deleted field
- [ ] Add deleted_at_utc field
- [ ] Add deleted_by_user_id field

---

## Service Layer

- [ ] Implement softDeleteNeighbor()
- [ ] Add irreversibleConfirmation check
- [ ] Add admin capability check

---

## Phone Handling

- [ ] Deactivate all phones on delete

---

## Query Layer

- [ ] Exclude deleted neighbors from list endpoints
- [ ] Exclude from identity resolver
- [ ] Exclude from UI-facing queries

---

## Thread Layer

- [ ] Add neighbor_deleted flag to thread responses
- [ ] Add neighbor_deleted_at_utc

---

## API

- [ ] Add admin-only delete endpoint

---

## Audit

- [ ] Log delete event

---

## Testing

- [ ] deleted neighbor not visible in UI queries
- [ ] admin can still query
- [ ] phones deactivated
- [ ] inbound SMS creates new neighbor
- [ ] delete requires confirmation
