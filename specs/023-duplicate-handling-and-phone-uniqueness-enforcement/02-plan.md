# PR 023 — Plan

## Files to Modify

- database migration files
- neighbor store (phone persistence layer)
- neighbor service (create/update flows)
- identity resolution adapter (behavior check)

---

## Files to Create

- migration: add unique partial index

---

## Implementation Strategy

### Step 1 — Database Constraint

Add partial unique index:

- column: normalized_e164
- condition:
  - is_active = true
  - neighbor.is_deleted = false

---

### Step 2 — Service-Level Validation

Before insert/update:

- check for existing phone usage
- reject early with clear error

---

### Step 3 — Identity Resolver Enforcement

Ensure:

- multiple matches → ambiguity result
- no silent fallback

---

### Step 4 — Error Handling

Standardize refusal:

- code: CONNECTSHYFT_PHONE_DUPLICATE
- reason: duplicate_phone

---

## Risks

- migration failure if duplicates exist
- inconsistent normalization
- edge cases with soft-deleted records

---

## Rollback Strategy

- drop index
- disable validation layer
