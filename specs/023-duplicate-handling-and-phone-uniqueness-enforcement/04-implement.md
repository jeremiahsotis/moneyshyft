# PR 023 — Implementation Notes

## Partial Unique Index

Example (PostgreSQL):

CREATE UNIQUE INDEX idx_unique_active_phone
ON connectshyft.cs_neighbor_phones (normalized_e164)
WHERE is_active = true
AND neighbor_id IN (
SELECT id FROM connectshyft.cs_neighbors WHERE is_deleted = false
);

---

## Service-Level Guard

Before insert:

if (phoneExists(normalized_e164)) {
return refusal({
code: 'CONNECTSHYFT_PHONE_DUPLICATE',
reason: 'duplicate_phone'
});
}

---

## Important

- DO NOT rely on DB error alone
- validate BEFORE insert for clean UX
- still handle DB constraint as safety net
