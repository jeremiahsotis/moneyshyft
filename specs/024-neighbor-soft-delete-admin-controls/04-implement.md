# PR 024 — Implementation Notes

## Soft Delete Function

async function softDeleteNeighbor(input) {
if (!input.irreversibleConfirmation) {
return refusal(‘confirmation_required’);
}

if (!hasAdminCapability(input.actorRoles)) {
return refusal(‘forbidden’);
}

await db.transaction(async (trx) => {
await trx(‘cs_neighbors’)
.where({ id: input.neighborId })
.update({
is_deleted: true,
deleted_at_utc: now(),
deleted_by_user_id: input.actorUserId,
});

await trx('cs_neighbor_phones')
.where({ neighbor_id: input.neighborId })
.update({ is_active: false });

});
}

---

## Query Filter Pattern

Always apply:

WHERE is_deleted = false

---

## Resolver Guard

Ensure identity resolver excludes deleted neighbors:

WHERE is_deleted = false
AND is_active = true

---

## Thread Annotation

When joining neighbor:

thread.neighbor_deleted = neighbor.is_deleted
thread.neighbor_deleted_at_utc = neighbor.deleted_at_utc

---

## Important

- DO NOT physically delete records
- DO NOT cascade delete threads
- DO NOT allow silent deletion
