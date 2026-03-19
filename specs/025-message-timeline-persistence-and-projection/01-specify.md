# PR 025 — Message Timeline Persistence + Projection

## Objective

Provide a unified, ordered timeline per thread that includes inbound and outbound SMS as first-class artifacts, with a projection model derived from canonical events. Establish a forward-compatible contract for voice events and voicemails.

---

## Core Requirements

### Files to Include

Create branch 025-message-timeline-persistence-and-projection and use folder specs/025-message-timeline-persistence-and-projection

- specs/025-message-timeline-persistence-and-projection/05-testing.md
- specs/025-message-timeline-persistence-and-projection/06-pr-template.md

### Source of Truth

- Canonical events are the source of truth.
- Timeline is a read model (projection) derived from canonical events.
- No direct writes to timeline storage.

---

### Included Artifacts (Phase 1)

- Inbound SMS
- Outbound SMS

### Included Artifacts (Contract Only, Not Implemented Yet)

- Voice call events (started, connected, ended)
- Voicemail artifacts (recording + metadata)

---

### Ordering

Timeline MUST be ordered:

- ascending by event time (oldest → newest)

Tie-breaker:

- stable ordering using (event_time, canonical_event_id)

---

### UI Contract

Render order:

[ message 1 ]
[ message 2 ]
…
[ newest message ]

— divider —

[ message input ]
[ send button ]
[ call controls ]

- Input and controls always appear below the newest message.

---

### Timeline Item Shape

Each item MUST include:

- id (canonical_event_id)
- thread_id
- direction: inbound | outbound
- channel: sms (future: voice, voicemail)
- body (text for SMS)
- occurred_at_utc
- actor (system | user | neighbor)
- provider_metadata (optional)
- delivery_status (optional, future)

---

### Voicemail Contract (Required Placeholder)

Even if not implemented:

- timeline MUST support type = voicemail
- voicemail items must include:
  - recording_url (future)
  - duration_seconds (future)
  - transcript (optional future)

---

### Soft Delete Interaction

- threads linked to soft-deleted neighbors remain queryable in admin/debug
- timeline must still render for admin/debug
- normal UI must exclude deleted neighbors entirely

---

### Tenant Isolation

- timeline queries must be strictly tenant-scoped
- no cross-tenant leakage

---

## Constraints

- No direct DB writes from UI layer
- No timeline mutation outside canonical event pipeline
- Must support future pagination

---

## Out of Scope

- pagination implementation (basic limit allowed)
- filtering (sms vs voice)
- attachments (MMS)
- read receipts
