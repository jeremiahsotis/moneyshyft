# ADR-006: Conversation Anchors to ContactPoint + orgUnit

## Status

Accepted

---

## Context

Identity may change after communication begins.

Anchoring conversations to Person would:

- corrupt history
- break continuity
- require rewriting data

---

## Decision

Conversation is anchored to:

- ContactPoint
- orgUnit

NOT to Person.

---

## Consequences

- communication history remains stable
- identity can be corrected safely
- conversations survive reassignment

---

## Alternatives Considered

### Anchor to Person (Rejected)

- breaks rebinding
- causes historical inconsistency

---

## Non-Goals

- assigning permanent identity at conversation start
