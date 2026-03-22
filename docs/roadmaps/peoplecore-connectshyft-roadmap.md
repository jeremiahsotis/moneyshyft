# ShyftUnity Roadmap

## PeopleCore + Identity Resolution + ConnectShyft

---

## Status Legend

- **DONE** = implemented and merged
- **IN PROGRESS** = partially implemented / active slice work
- **NEEDS VALIDATION** = exists but not yet trustworthy
- **NOT STARTED** = not yet implemented

---

# Phase 1: Identity Foundation

## 1. PeopleCore Persistence Foundation

**Status:** DONE

### Scope

- Person
- Household
- HouseholdMembership
- ContactPoint
- ContactPointLink
- ContactPointEvent
- ResolverReview

### Completed

- Persistence-backed PeopleCore store/service
- Core identity schema + contracts
- Initial test coverage

### Remaining

- Address + relationship modeling
- Full subject lifecycle states
- Expanded event coverage

---

## 2. ConnectShyft ↔ PeopleCore Identity Seam

**Status:** DONE (NEEDS VALIDATION)

### Scope

- PeopleCore consulted first
- Legacy fallback preserved where allowed
- Provisional identity + resolver hooks

### Completed

- Identity adapter + resolver wiring
- Provisional creation hook
- Resolver review hook
- Architecture documentation

### Remaining

- Strong precedence enforcement (PeopleCore > legacy)
- Remove hidden legacy “winner” behavior
- Validate across all identity-touching routes

---

# Phase 2: Identity Policy Execution

## 3. Ambiguity Handling Policy

**Status:** IN PROGRESS

### Locked Behavior

- No auto-resolution
- No silent merges
- Explicit resolution or create-new
- Work continues without identity certainty

### Completed

- Ambiguity refusal behavior
- Resolver review object
- Slice 14 ambiguity path

### Remaining

- Full system-wide enforcement
- Ops visibility integration
- Eliminate edge-case bypasses

---

## 4. Provisional Identity + Rebinding

**Status:** PARTIAL

### Completed

- Provisional person creation
- Resolver review trigger

### Remaining

- Subject binding model
- Rebinding engine
- Rebindability classes:
  - auto_rebind
  - review_rebind
  - historical_only
- Audit-safe reassignment

---

# Phase 3: ConnectShyft Core Runtime

## 5. Conversation Model (ContactPoint-anchored)

**Status:** PARTIAL

### Completed

- ContactPoint-first routing behavior
- Identity-aware resolution entry points

### Remaining

- Explicit conversation identity states:
  - unresolved
  - ambiguous
  - resolved
  - resolver_required
- UI/ops surfacing of identity state

---

## 6. WorkIntent

**Status:** NOT STARTED

### Scope

- Lightweight structured follow-up
- Transitional object (not case system)

### Remaining

- Model + persistence
- UI surface
- CaseShyft handoff integration

---

# Phase 4: Ops Visibility

## 7. Identity + Routing Visibility

**Status:** DONE (NEEDS VALIDATION)

### Completed

- Slice 15 ops visibility endpoints

### Remaining

- Validate usefulness in real debugging
- Ensure visibility explains:
  - why routing occurred
  - what action is required

---

# Phase 5: Application Shell

## 8. Shared Application Shell

**Status:** NOT STARTED

### Scope

- app.shyftunity.com
- Feature flags
- orgUnit context
- Shared navigation + subject context
- Host ConnectShyft now, CaseShyft later

### Remaining

- Shell runtime
- Context propagation
- Feature flag orchestration
- Unified UX entry point

---

# Phase 6: Telephony Stabilization

## 9. Telephony Runtime Stabilization

**Status:** IN PROGRESS

### Scope

- SMS + Voice correctness
- Bridge flow
- Provider integration (Telnyx)
- Sender routing
- Idempotency + retry safety
- Auditability

### Completed

- Telephony architecture foundation
- Characterization tests
- Slice 16 defined

### Remaining

- End-to-end runtime correctness
- Bridge call reliability
- Provider callback mapping
- Failure mode handling

### Validation Required

- SMS send/receive
- inbound voice
- outbound call
- dual-leg bridge
- voicemail handling
- sender number routing
- provider events + idempotency

---

# Phase 7: ConnectShyft Refinements

## 10. UX + Operational Refinements

**Status:** PARTIAL

### Completed

- Phone normalization groundwork
- Identity-aware routing foundation

### Remaining

- Hide E.164 from users
- Outbound call UX
- Bridge UX
- Error handling UX
- Retry-safe flows
- Full UI overhaul

---

# Phase 8: Resolver Actions

## 11. Identity Resolution Actions

**Status:** NOT STARTED

### Scope

- Merge
- Link
- Shared contact confirmation
- Reassignment handling

### Remaining

- Resolver UI/actions
- Impact summaries
- Safe downstream rebinding
- PeopleCore-native resolution flows

---

# Phase 9: CaseShyft Readiness

## 12. ConnectShyft → CaseShyft Transition

**Status:** NOT STARTED

### Scope

- ConnectShyft remains communications layer
- CaseShyft becomes primary workspace
- WorkIntent bridges gap

---

# Current Reality Snapshot

## DONE

- PeopleCore foundation
- Identity seam
- Ambiguity model (partial execution)
- Slice 14 merged
- Slice 15 merged

## IN PROGRESS

- Telephony stabilization (Slice 16)
- Identity enforcement consistency
- Runtime correctness

## NOT DONE

- Application shell
- Rebinding system
- Resolver actions
- WorkIntent
- Full PeopleCore spec implementation
- Production-trustworthy telephony
- UX refinements

---

# Critical Path (Recommended Order)

1. **Slice 16 → Telephony Stabilization**
2. **Application Shell (minimal viable)**
3. **ConnectShyft UX + refinement pass**
4. **PeopleCore expansion to full spec**
5. **Resolver actions + rebinding system**
6. **CaseShyft integration path**

---

# Definition of “ConnectShyft Working”

The system is only considered working when:

- A call can be initiated
- Two legs can be bridged
- Both parties connect successfully
- SMS send/receive is reliable
- Identity does not corrupt during flow
- Ops can explain every routing decision
- Failures are deterministic and traceable

---

# Constraint Reminder

- Identity is not deterministic → system must tolerate ambiguity
- Communication must not block on identity
- Correction must not rewrite history
- PeopleCore is authoritative for identity
- ConnectShyft is authoritative for communication
- Policy must be embedded in execution (no standalone policy docs)

---
