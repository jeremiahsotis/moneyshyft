# Slice 27 Checkpoint 2 – Documenting Deviations

## Purpose

This document records differences between the Slice 27 Checkpoint 2 implementation and the original implementation brief.  It explains why these deviations occurred, how they meet the intent of the brief, and highlights any follow‑up actions required to achieve full alignment in future slices.

## Background

The Slice 27 brief introduced a lifecycle state machine for `ContactPoint` entities with an accompanying `lifecycle_changed` event stored in the `people.contact_point_events` table.  It assumed the existence of a JSON `metadata` column on this table and referred to contract definitions under `libs/contracts/src/people.ts`.  During implementation we found that:

- The contract definitions for `ContactPoint` reside in **`libs/contracts/src/people/contact-point.ts`**, not in `libs/contracts/src/people.ts`.  All type updates therefore occurred in this file.
- The `contact_point_events` table does **not** have a JSON `metadata` column or an existing key/value mechanism for storing arbitrary event data.
- The event type enum does not currently include a dedicated `archived` event type.

These discrepancies required minor adjustments in order to complete the checkpoint without widening the slice or introducing new migrations.

## Implemented Deviations

1. **Contract file location**

   The brief instructed updating `libs/contracts/src/people.ts` to include new lifecycle types.  In the live repository the `ContactPoint` contract and related types are defined in `libs/contracts/src/people/contact-point.ts`.  Updating the correct file kept type definitions consistent without introducing duplicate modules.

2. **Storage of `effectiveStatus`**

   The brief specified that a `lifecycle_changed` event should include an `effectiveStatus` value in a JSON `metadata` property.  Because the current schema lacks such a column, we stored the new status using existing columns:

   - `related_object_type` is set to `'effective_status'`.
   - `related_object_id` stores the new status value (e.g. `reassignment_suspected`).

   This approach preserves the required information without changing the schema.  A future migration should add a proper JSON `metadata` column so that event payloads can follow the original spec more closely.

3. **Representation of archived status**

   The brief suggested introducing a dedicated `archived` event type.  Since the event type enum does not currently support `archived`, we reused the existing `state_changed` type and indicated the archived state via `related_object_type = 'archived'`.  This maintains compatibility while supporting the archived lifecycle state.  When the event model is extended to include `archived`, the implementation should migrate events accordingly.

## Rationale and Compliance

These deviations do not materially change the intent of the brief.  The lifecycle computation, status persistence, scoring penalties, and UI indicators work as specified.  The adjustments merely adapt the brief’s instructions to the realities of the current codebase and database schema.  All changes are confined to the Slice 27 scope and do not introduce new behaviour or architectural decisions.

## Future Work

- **Add a `metadata` JSON column** to `people.contact_point_events` via a migration so that future event types can store structured payloads.  Once available, refactor lifecycle events to store `{"effectiveStatus": "<status>"}` in `metadata`.
- **Extend the event type enum** to include `archived` and potentially other lifecycle events.  Update any fallback logic when these become available.
- **Audit documentation and briefs** to ensure file paths and table schemas match the actual repository structure.

Documenting these deviations ensures that the team understands why certain decisions were made and provides a clear path for future improvements.
