# Shyft Platform Architecture (Reconciled v5)

## Status
LOCKED

## Purpose
Prevent architectural drift and enforce person-centric design across all subsystems.

---

# 1. Core Principle

The platform is PERSON-CENTRIC.

- Data follows the person
- The person does not follow the data
- No subsystem may treat a thread, phone number, or email address as identity truth

---

# 2. Layered Architecture

## Layer 1 — PeopleCore + Identity Resolution
Owns:
- Person
- Provisional person
- Household
- Address
- Relationship
- ContactPoint
- ContactPointLink
- ContactPointEvent
- ResolverReview
- Identity resolution
- Candidate generation
- Deterministic confidence scoring
- Rebinding

## Layer 2 — ConnectShyft
Owns:
- Conversations / threads
- SMS
- Voice calls
- Bridge sessions
- Voicemail
- Delivery attempts
- Provider integrations
- Communication audit

Constraint:
- Threads are not identity
- Communication resolves through ContactPoint and PeopleCore, not direct identity assumptions

## Layer 3 — Application Shell + Feature Flags
Owns:
- Navigation
- Subject context
- Role-aware UI
- Feature flags
- Module composition

---

# 3. Canonical Relationship Model

Person
├── Activities
│   └── Threads
└── Threads

Communication is always about a person, optionally about an activity.

---

# 4. ContactPoint Model (Authoritative)

A ContactPoint represents the signal itself, not ownership.

## ContactPoint fields
- contact_point_id
- tenant_id
- type
- normalized_value
- raw_value
- status
- first_seen_at
- last_seen_at
- last_inbound_at
- last_outbound_at
- created_at
- updated_at

## Rules
- One normalized value = one ContactPoint
- No duplicates at the ContactPoint layer
- All ambiguity lives in ContactPointLink, not ContactPoint
- ContactPoint has no primary owner

## Lifecycle states
- active_personal
- active_shared_possible
- active_shared_confirmed
- stale
- reassignment_suspected
- archived

## Locked rule: status is the source of truth
The lifecycle enum is authoritative.
Do not duplicate shared/reassignment lifecycle truth in parallel booleans on ContactPoint.

---

# 5. ContactPointLink

ContactPointLink stores ownership, ambiguity, and history.

## Rules
- Links are never deleted
- Historical links are preserved
- Multiple active links are allowed
- Household links are allowed
- Person ↔ household linkage must remain explicit, never silently inferred

---

# 6. ContactPointEvent

All domain events that cross service or subsystem boundaries must be wrapped in EventEnvelope.

Canonical shape:
EventEnvelope<ContactPointEvent>

---

# 7. Identity Resolution Contract

Inbound communication
→ normalize contact value
→ find or create ContactPoint
→ create ContactPointEvent
→ generate candidate subjects
→ score candidates deterministically
→ apply band caps + tie-break rules
→ high confidence: attach to canonical person
→ ambiguous: create provisional person + resolver signal
→ no match: create provisional person
→ create thread with personId

Rules:
- Every persisted thread requires personId
- Unresolved identity is allowed only through immediate provisional person creation
- The system must never silently attach to the wrong person

## Locked candidate generation model
Candidate generation happens before scoring.
Only candidates produced by the locked PeopleCore candidate generation rules may be scored.

---

# 8. Subject Context Rule

Locked invariant:
- Exactly one of personId or provisionalPersonId may be present
- Never both at the same time

---

# 9. Rebinding

Rebind classes:
- auto_rebind
- review_rebind
- historical_only

---

# 10. Non-Negotiable Rules

1. Person is the source of truth
2. Work must survive identity changes
3. Threads are not identity
4. Contact points are not identity
5. Communications are a subsystem
6. Identity resolution governs correctness
7. No subsystem may bypass PeopleCore
8. ContactPoint.status is authoritative lifecycle truth
9. All cross-boundary domain events use EventEnvelope
10. SubjectContext may never carry both personId and provisionalPersonId
11. Confidence scoring must use the locked deterministic composition formula
12. Candidate generation must use the locked deterministic PeopleCore generation rules

---

# 11. Definition of Correctness

The system is correct when:
- A conversation can start with no known resolved identity
- A provisional person is created immediately when needed
- Every thread has a personId
- ContactPoint remains signal, not identity truth
- Links preserve ambiguity and history
- Identity can be resolved later
- Rebinding preserves continuity without destroying auditability
- Equivalent inputs produce equivalent candidate sets and confidence outputs
