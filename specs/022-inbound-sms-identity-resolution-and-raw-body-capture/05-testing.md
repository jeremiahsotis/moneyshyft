# PR 022 — Testing Obligations

## Unit Tests

- resolver returns:
  - single
  - none
  - multiple

---

## Integration Tests

### Webhook Signature

- rawBody exists
- signature validation succeeds

---

### Identity Resolution

- metadata path wins
- thread correlation wins
- phone match works
- no match creates neighbor
- ambiguity fails

---

### Prefers Texting

- UNKNOWN → YES
- YES → unchanged
- NO → unchanged

---

## Regression Tests

- existing thread flows still work
- no duplicate neighbor creation when match exists

---

## Edge Cases

- soft-deleted neighbor → new neighbor created
- malformed phone → refusal
