# PR 024 — Plan

## Files to Modify

- neighbors service
- neighbor store (DB layer)
- thread query layer
- API routes (admin endpoints)

---

## Database Changes

Add fields to cs_neighbors:

- is_deleted (boolean, default false)
- deleted_at_utc (timestamp)
- deleted_by_user_id (uuid/string)

---

## Implementation Strategy

### Step 1 — Schema Update

Add soft delete fields

---

### Step 2 — Service Layer

Add method:

softDeleteNeighbor({
tenantId,
neighborId,
actorUserId,
irreversibleConfirmation
})

---

### Step 3 — Phone Deactivation

On delete:

- set all phones is_active = false

---

### Step 4 — Query Filtering

Modify:

- list queries → exclude is_deleted = true
- resolver → exclude deleted neighbors

---

### Step 5 — Thread Annotation

When returning threads:

- include neighbor_deleted flags

---

### Step 6 — Admin Endpoint

Add endpoint:

DELETE /neighbors/:id

Requirements:

- admin role
- irreversibleConfirmation = true

---

## Risks

- accidentally exposing deleted records
- breaking identity resolution
- forgetting to deactivate phones

---

## Rollback Strategy

- revert schema
- remove filters
- disable endpoint
