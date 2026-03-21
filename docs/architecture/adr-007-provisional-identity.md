# ADR-007: Provisional Identity Model

## Status

Accepted

---

## Context

Intake often happens with incomplete or ambiguous data.

Blocking creation until identity is confirmed would:

- slow down volunteers
- block communication
- lose opportunities for engagement

---

## Decision

Allow creation of Person records in:

- active_provisional state

These are:

- fully usable
- subject to later resolution

---

## Consequences

- work continues immediately
- identity can be corrected later
- system supports real-world ambiguity

---

## Alternatives Considered

### Require confirmed identity before creation (Rejected)

- blocks workflow
- unrealistic in practice

---

## Non-Goals

- guaranteeing correctness at intake
