# PR 025 — Plan

## Files to Modify

- canonical event persistence layer
- thread service
- API routes (thread retrieval)

## Files to Create

- timeline projection module
- timeline DTO/serializer

---

## Implementation Strategy

### Step 1 — Projection Layer

Create:

getThreadTimeline({
tenantId,
orgUnitId,
threadId
})

- loads canonical events
- maps to timeline items
- sorts ascending

---

### Step 2 — Mapping Logic

Map canonical events:

- inboundSmsAppended → inbound timeline item
- outboundSmsAppended → outbound timeline item

---

### Step 3 — API Endpoint

Add:

GET /threads/:threadId/timeline

---

### Step 4 — Thread Annotation

Include:

- neighbor_deleted flag
- neighbor_deleted_at_utc

---

## Risks

- incorrect ordering
- missing events
- performance on large threads

---

## Rollback Strategy

- disable timeline endpoint
- revert to raw event retrieval
