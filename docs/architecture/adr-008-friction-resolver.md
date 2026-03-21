# ADR-008: Confidence-Based Friction and Resolver Model

## Status

Accepted

---

## Context

Duplicate creation must be controlled without blocking legitimate work.

Binary matching:

- is too rigid
- fails in ambiguous situations

---

## Decision

Use confidence bands to apply friction:

- very_low → easy creation
- low → light warning
- medium → explicit choice required
- high → strong warning
- very_high → resolver override required

Resolvers are designated users who:

- handle merges
- resolve duplicates
- confirm reassignment

---

## Consequences

- balances usability and data integrity
- prevents silent duplicates
- enables structured resolution

---

## Alternatives Considered

### Binary match/no-match (Rejected)

- too rigid
- fails in real-world ambiguity

---

## Non-Goals

- full automation of identity resolution
