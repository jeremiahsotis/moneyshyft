# ShyftUnity Roadmap (Corrected After Slice 19 Framing)

## Status Legend
- DONE = implemented and merged
- IN PROGRESS = partially implemented / active slice work
- NEEDS VALIDATION = exists but not yet trustworthy
- NOT STARTED = not yet implemented

---

# Phase 1: Identity Foundation

## 1. PeopleCore Persistence Foundation
Status: DONE

## 2. ConnectShyft ↔ PeopleCore Identity Seam
Status: DONE (NEEDS VALIDATION)

---

# Phase 2: Identity Policy Execution

## 3. Ambiguity Handling Policy
Status: IN PROGRESS

## 4. Provisional Identity + Rebinding
Status: PARTIAL

---

# Phase 3: ConnectShyft Core Runtime

## 5. Conversation Model
Status: PARTIAL

## 6. WorkIntent
Status: NOT STARTED

---

# Phase 4: Ops Visibility

## 7. Identity + Routing Visibility
Status: DONE (NEEDS VALIDATION)

---

# Phase 5: Application Shell

## 8. Shared Application Shell
Status: NOT STARTED

---

# Phase 6: Telephony Stabilization

## 9. Telephony Runtime Stabilization
Status: IN PROGRESS (STRUCTURALLY INCOMPLETE)

### Now includes:
- Slice 16 foundation
- Slice 18 config scaffolding
- Slice 19 readiness + enforcement (IN PROGRESS)

### What will be true after Slice 19:
- Operator phone resolution is deterministic
- SMS + Voice readiness computed
- Dispatch blocking enforced
- Degraded fallback behavior defined

### Still missing:
- Call start route correctness
- Bridge execution reliability
- Voicemail flow (REQUIRED)
- Provider webhook correctness
- Idempotency guarantees

---

# Phase 7: ConnectShyft UX + Runtime Completion

## 10. UX + Operational Refinements
Status: PARTIAL

### Remaining (critical):
- Dialer UI (Path 2)
- Call state UI (ringing, connected, failed)
- Voicemail UX surface
- Error + retry UX

---

# Phase 8: Resolver Actions

## 11. Identity Resolution Actions
Status: NOT STARTED

---

# Phase 9: CaseShyft Readiness

## 12. ConnectShyft → CaseShyft Transition
Status: NOT STARTED

---

# Phase 10: Telephony Completion (NEW - REQUIRED)

## 13. Call Execution + Bridge Runtime
Status: NOT STARTED

### Required for “working telephony”:
- Path 1 (thread-based call)
- Path 2 (dialer-based call)
- Operator leg success
- Neighbor leg success
- Bridge success
- Failure handling

## 14. Voicemail System
Status: NOT STARTED (BLOCKER)

### REQUIRED FOR MVP:
- Missed call detection
- Voicemail recording (Telnyx webhook)
- Storage + retrieval
- Playback in UI
- Thread association

## 15. Provider Reliability Layer
Status: NOT STARTED

### Includes:
- Webhook idempotency
- Retry handling
- Event reconciliation
- Call state tracking

---

# Current Reality Snapshot (Corrected)

## DONE
- PeopleCore foundation
- Identity seam
- Ops visibility endpoints
- Telephony structural foundation

## IN PROGRESS
- Slice 19 (readiness + enforcement)
- Identity policy enforcement consistency

## NOT DONE (BLOCKING “WORKING”)
- Call execution (actual working calls)
- Bridge reliability
- Voicemail (REQUIRED)
- Provider event correctness
- Dialer UI
- End-to-end validation

---

# Correct Critical Path

1. Finish Slice 19 (readiness + enforcement)
2. Implement call execution (Slice 20+)
3. Implement voicemail (non-negotiable)
4. Stabilize provider events + idempotency
5. Validate full end-to-end flows
6. THEN move to shell + UX polish

---

# Definition of “ConnectShyft Working” (UNCHANGED)

System is ONLY working when:

- Operator presses call → receives call
- Operator answers → neighbor is dialed
- Neighbor answers → bridge completes
- If neighbor does NOT answer → voicemail is recorded
- SMS send/receive is reliable
- Identity remains stable
- Ops can explain behavior
- Failures are deterministic

