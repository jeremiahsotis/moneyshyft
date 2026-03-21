# ADR-005: ContactPoint is a Signal, Not Identity

## Status

Accepted

---

## Context

Phone numbers and emails are:

- reused
- shared
- reassigned

Treating them as identity truth leads to:

- duplicate creation
- identity corruption
- loss of historical accuracy

---

## Decision

ContactPoint is modeled as a first-class entity, separate from Person.

Relationships are expressed via:

- ContactPointLink
- ContactPointEvent

---

## Consequences

- supports shared phones
- supports reassignment detection
- enables historical tracking
- improves identity confidence modeling

---

## Alternatives Considered

### ContactPoint stored directly on Person (Rejected)

- breaks with shared/reassigned reality
- prevents historical tracking

---

## Non-Goals

- guaranteeing identity from a single signal
- eliminating ambiguity
