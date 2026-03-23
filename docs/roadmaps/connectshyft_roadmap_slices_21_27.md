# Cross-Layer Implementation Roadmap (Slices 21–27)

## Status
LOCKED

## Slice 21 — Inbound Identity Attachment + ContactPointEvent Capture

### PeopleCore
- normalize contact value
- find or create ContactPoint
- create ContactPointEvent
- generate candidate subjects using locked candidate generation rules
- score candidates using locked score composition formula
- return canonical / provisional / resolver-needed
- persist provisional person when no safe match exists

### ConnectShyft
- require personId on thread creation
- attach inbound communication to person
- publish cross-boundary domain events only as EventEnvelope-wrapped payloads

### Application Shell / UI
- show person context + identity state
- use SubjectContext with exactly one of:
  - personId
  - provisionalPersonId

### Done When
- no thread exists without personId
- ContactPointEvent is emitted at intake
- event transport is envelope-wrapped
- SubjectContext never carries both identity fields
- candidate generation is deterministic and explainable

---

## Slice 22 — Resolver Signal + Ambiguity Surfacing + Friction UX

### PeopleCore
- emit ResolverReview artifact
- persist confidence band, candidates, reasons, risk flags
- implement locked score composition formula
- apply locked band caps before final confidence band assignment

### Done When
- ambiguity is visible and actionable
- create-new path reflects locked confidence policy
- equivalent inputs produce equivalent score outputs

---

## Slice 23 — Telephony Readiness (Real State)
Locked, unchanged.

## Slice 24 — Activity Skeleton + Communication Context
Locked, unchanged.

## Slice 25 — Bridge Lifecycle + Telephony
Locked, unchanged.

## Slice 26 — Resolver Rebinding + History Integrity
Locked, unchanged.

## Slice 27 — ContactPoint Lifecycle
Locked, unchanged.

---

## Milestones

1. Person-aware communication (21–22)
2. Real readiness (23)
3. Structural correctness (24)
4. Operational telephony (25)
5. Safe resolver rebinding (26)
6. Contact identity maturity (27)
