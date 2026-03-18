# PR 024 — Neighbor Soft Delete + Admin Controls

## Objective

Enable safe removal of neighbors from operational use without destroying data, while preserving auditability and allowing controlled reuse of phone numbers.

This PR introduces soft delete as the only supported deletion mechanism.

---

## Core Requirements

### Files to Include

Create branch 024-neighbor-soft-delete-admin-controls and use folder specs/024-neighbor-soft-delete-admin-controls

- specs/024-neighbor-soft-delete-admin-controls/05-testing.md
- specs/024-neighbor-soft-delete-admin-controls/06-pr-template.md

### Soft Delete Definition

Soft delete MUST:

- mark neighbor as deleted (is_deleted = true)
- set:
  - deleted_at_utc
  - deleted_by_user_id
- preserve all existing data (no physical deletion)

---

### Operational Behavior

Soft-deleted neighbors MUST:

- NOT appear in standard UI queries
- NOT be selectable for messaging or calling
- NOT be returned in standard list/search endpoints

---

### Admin / Debug Behavior

Soft-deleted neighbors MUST:

- remain queryable via admin/debug endpoints
- clearly indicate deletion state

Required fields:

- is_deleted
- deleted_at_utc
- deleted_by_user_id

---

### Phone Handling

On soft delete:

- all associated phones MUST:
  - be set to is_active = false

Result:

- phone numbers become reusable
- uniqueness constraint (PR 023) is preserved

---

### Thread Behavior

Threads associated with a soft-deleted neighbor MUST:

- remain in database
- remain queryable via admin/debug endpoints
- be excluded from normal UI flows

Thread responses MUST include:

- neighbor_deleted = true
- neighbor_deleted_at_utc

---

### Inbound SMS Behavior (Critical)

If inbound SMS arrives for a phone belonging to a soft-deleted neighbor:

- DO NOT resurrect the neighbor
- DO NOT fail
- CREATE a new neighbor

---

### Authorization

Soft delete MUST:

- be admin-only
- require elevated capability

---

### Irreversibility Guard

Soft delete endpoint MUST require:

- irreversibleConfirmation flag

Without it:

- request MUST fail

---

### Audit Requirement

Every soft delete MUST:

- create an audit event
- include:
  - actor_user_id
  - timestamp
  - neighbor_id

---

## Constraints

- No hard delete in this PR
- No restore/undo in this PR
- No cascade deletion

---

## Out of Scope

- merge workflows
- permanent deletion pipelines
- retention policies
- UI implementation details
