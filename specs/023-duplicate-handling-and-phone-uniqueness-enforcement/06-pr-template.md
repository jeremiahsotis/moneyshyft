# PR 023 — Duplicate Handling + Phone Uniqueness Enforcement

## Summary

Prevents duplicate phone assignments and enforces deterministic identity behavior.

---

## Changes

- Added DB-level uniqueness constraint
- Added service-layer duplicate validation
- Standardized duplicate refusal handling
- Reinforced ambiguity behavior

---

## Why

Duplicate phone records create ambiguous identity resolution and break inbound SMS handling.

---

## Testing

- Verified duplicate rejection
- Verified soft delete reuse
- Verified ambiguity handling

---

## Risks

- migration conflicts with existing duplicates
- incorrect normalization edge cases

---

## Rollback

- drop index
- remove validation checks

---

## Checklist

- [ ] Migration tested on production-like data
- [ ] No duplicate creation paths remain
- [ ] Identity resolution unchanged except for enforced ambiguity
