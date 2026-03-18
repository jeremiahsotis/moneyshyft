# PR 024 — Testing Obligations

## Unit Tests

- soft delete updates fields correctly
- phones deactivated

---

## Integration Tests

### Delete Flow

- delete neighbor → success
- delete without confirmation → fail
- delete without admin → fail

---

### Query Behavior

- deleted neighbor not returned in list
- deleted neighbor excluded from resolver

---

### Thread Behavior

- threads still returned in admin context
- thread shows neighbor_deleted = true

---

### Inbound SMS

- SMS to deleted neighbor phone → new neighbor created

---

## Regression Tests

- inbound SMS (PR 022) still works
- uniqueness (PR 023) still enforced
