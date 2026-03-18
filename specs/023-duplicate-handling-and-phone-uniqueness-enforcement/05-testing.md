# PR 023 — Testing Obligations

## Unit Tests

- phone normalization consistency
- duplicate detection logic

---

## Integration Tests

### Create

- create neighbor with new phone → success
- create neighbor with existing phone → fail

---

### Update

- update phone to unused → success
- update phone to existing → fail

---

### Soft Delete

- delete neighbor
- reuse same phone → success

---

### Identity Resolution

- multiple matches → ambiguity failure
- no fallback behavior

---

## Regression Tests

- inbound SMS still works
- resolver still returns correct results
