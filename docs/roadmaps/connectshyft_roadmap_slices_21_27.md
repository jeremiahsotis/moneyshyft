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

### Core idea

Ambiguity becomes visible and actionable.

### PeopleCore

- ResolverReview object (durable, not queue)
- Stores:
  - confidence band
  - candidate list
  - reasons + risk flags
- Emits resolver_required state

### Scoring (locked behavior)

- Uses full additive/subtractive model
- Applies band caps:
  - reassignment_suspected → max MEDIUM
- Applies tie-break rule:
  - <20 point lead → bias to review

### UI (this is critical)

Friction is not optional:

## |Band | UX behavior |

|VERY LOW | create new silently |
|LOW | suggest matches |
|MEDIUM | force explicit choice |
|HIGH | default existing, allow override |
|VERY HIGH | block create → resolver required |

### ConnectShyft

- Must not auto-bind ambiguous matches
- Must surface resolver metadata

### Done when

- Operators see ambiguity before committing
- System never silently picks in ambiguous cases
- Resolver queue populated with real artifacts

---

## Slice 23 — Telephony Readiness (Real State)

### Core shift

No more fake readiness.

### PeopleCore

- Persist:
  - user callback number
  - orgUnit number mapping (future-ready)

### ConnectShyft

- Dispatch gate:

  ```bash
  if NOT_READY → block
  if READY → allow send/call
  ```

- Readiness reads from DB, not config mocks

### UI

- Readiness panel
- Callback number management
- OrgUnit number mapping

### Done when

- UI alone can move NOT_READY → READY
- No test shortcuts or bypass flags
- Dispatch fails cleanly with reason if not ready

---

## Slice 24 — Activity Model (Structure Lock)

### Core model

```
Person
├── Activities
│   └── Threads
└── Threads
```

### PeopleCore

- Activity table:
  - activityId
  - personId
  - type
  - status

### ConnectShyft

- Thread supports:
  - person-level
  - activity-bound (optional activityId)

### UI

- Person profile:
  - Communications section
  - Activities section
- Activity detail:
  - shows related threads

### Done when

- Thread is no longer the “center”
- Communication is clearly contextual

---

## Slice 25 — Bridge Lifecycle + Telephony

### Core constraint

Telephony must remain person-bound and rebind-safe.

### ConnectShyft (must implement full lifecycle)

```
operator_dialing
→ operator_answered
→ neighbor_dialing
→ neighbor_answered
→ bridged
→ ended / failed / voicemail
```

### PeopleCore

- Telephony artifacts must remain rebind-safe
- No identity leakage into telephony state

### Data requirements

- Call
- Voicemail
- DeliveryAttempt
- ProviderEvent (idempotent, replay-safe)

### UI

- Thread telephony panel
- Person communication timeline includes:
  - SMS
  - Calls
  - Voicemail

### Done when

- End-to-end calling works
- Timeline is unified (but projected, not rewritten)

---

## Slice 26 — Resolver Rebinding

### PeopleCore

- merge provisional → canonical
- enforce rebind classes
- execute locked rebind behavior per object type
- execute deterministic ContactPointLink merge behavior
- mark closed links with merge metadata instead of deleting them
- surface review-required cases when competing primaries or household ambiguity exist

### ConnectShyft

- auto-rebind conversation/thread person pointers
- preserve historical communication artifacts without rewriting authorship or original subject attribution
- project unified history into surviving person view

### UI

- resolver action surface
- merged person view with unified projected history
- explicit review prompts for:
  - competing primary contact links
  - household-linked ambiguity
  - review_rebind objects

### Done When

- class-governed rebinding is enforced
- ContactPointLink merge behavior is deterministic
- historical artifacts remain unchanged
- projected unified history works without falsifying underlying records

## Slice 27 — ContactPoint Lifecycle

### Core idea

ContactPoint becomes a stateful identity signal, not just a lookup key.

### PeopleCore (must implement)

#### Lifecycle states (authoritative)

- active_personal
- active_shared_possible
- active_shared_confirmed
- stale
- reassignment_suspected
- archived

#### State transitions driven by:

- ContactPointEvent history
- ContactPointLink patterns
- Resolver decisions

### Critical rule

- **status is the ONLY lifecycle truth**
- no duplicate flags allowed

### Scoring integration

- state feeds scoring penalties:
  - shared_confirmed → -45
  - reassignment_suspected → -70 + band cap

### ConnectShyft

- must consume lifecycle state:
  - warnings at intake
  - context during communication

### UI

- show:
  - shared indicator
  - reassignment risk
  - stale indicator

### Done when

- Lifecycle affects scoring AND UX
- Staff can see why identity is risky
- No silent degradation of contact reliability

---

## Milestones

1. Person-aware communication (21–22)
2. Real readiness (23)
3. Structural correctness (24)
4. Operational telephony (25)
5. Safe resolver rebinding (26)
6. Contact identity maturity (27)

```

```
