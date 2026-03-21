# PeopleCore + Identity Resolution + ConnectShyft Architecture (Authoritative)

## Status

Authoritative – governs all implementation decisions across identity, communication, and rebinding.

---

## 1. Core Philosophy

Identity is unstable, ambiguous, and cross-cutting. The system must model this honestly.

### Non-negotiable rules

1. A ContactPoint is not a Person
2. Conversations can exist without a resolved Person
3. Work must continue under identity uncertainty
4. Identity correction must reconcile and rebind, never overwrite or erase history

---

## 2. Architectural Separation

### PeopleCore (System of Record)

Owns:

- Person
- Household
- Address
- Relationship
- ContactPoint
- ContactPointLink
- ContactPointEvent
- Subject lifecycle
- Merge / Link / Reassignment decisions

Does NOT own:

- communication transport
- messaging
- conversation timeline
- delivery state

---

### Identity Resolution

Owns:

- matching logic
- confidence scoring
- confidence reasoning
- friction application
- resolver workflows
- duplicate detection
- reassignment detection

Constraints:

- deterministic
- explainable
- non-ML (v1)

---

### ConnectShyft (Communication Substrate)

Owns:

- Conversation
- Message / Call / Voicemail
- Timeline projection
- SenderNumber routing
- Delivery tracking
- Provider integration
- Compliance enforcement
- WorkIntent (temporary bridge)

Does NOT own:

- identity truth
- matching logic
- merge decisions
- durable case workflow

---

## 3. Identity is Asynchronous

Identity resolution MUST NOT block:

- messaging
- calling
- intake
- follow-up work

All identity resolution:

- happens alongside work
- may happen later
- may change prior assumptions

---

## 4. Conversation Anchoring (Critical)

Conversation attaches to:

- ContactPoint
- orgUnit

NEVER to Person.

### Why

- numbers are reused
- numbers are shared
- identity is corrected later

Conversation continuity must survive identity correction.

---

## 5. Provisional Identity Model

Person states include:

- active_confirmed
- active_provisional
- archived
- suppressed
- merged

### Rules

- provisional persons are fully usable
- work attaches immediately
- identity may be corrected later
- rebinding must preserve history

---

## 6. Rebinding Model (Critical)

All downstream objects must declare one:

- auto_rebind
- review_rebind
- historical_only

### Implications

- conversations may rebind
- cases may rebind
- messages/calls do NOT rebind
- audit logs NEVER rebind

No system is allowed to silently rewrite history.

---

## 7. Resolver Model

Resolvers are designated users responsible for:

- merge decisions
- duplicate resolution
- reassignment decisions
- shared contact confirmation

Volunteers:

- can create provisional identities
- cannot finalize identity truth

---

## 8. Resolver Review (First-Class Object)

Resolver review MUST include:

- review_type
- status
- confidence_band
- confidence_reasons
- risk_flags
- candidate_people
- conversation/work context
- resolution_type
- resolution_reason
- impact_summary

---

## 9. Household vs Link vs Merge

### Merge

Same human → one surviving Person

### Link

Related or possibly duplicate → remain separate

### Household

Shared living or relational context

These must NEVER be conflated.

---

## 10. Subject Lifecycle (No “Delete Neighbor”)

States:

- active
- archived
- suppressed
- merged

Rules:

- no casual delete
- restore must be possible
- hard delete is rare and controlled

---

## 11. ConnectShyft Timeline

Timeline is:

- a projection
- not source of truth

It composes:

- messages
- calls
- voicemails
- delivery state

---

## 12. Sender Number Strategy

- orgUnit-specific numbers in v1
- no pooling in v1
- model must support pooling later

---

## 13. Compliance Behavior

Blocked sends MUST:

- not send
- show explicit failure
- explain why
- tell user next step
- be audited

---

## 14. WorkIntent

WorkIntent is:

- structured
- temporary
- a bridge to CaseShyft

It is NOT:

- case management
- task system

---

## 15. Application Shell

The Shell must provide:

- orgUnit context
- subject context
- navigation
- feature flag control

---

## 16. Feature Flags

Flags are:

- capability-based
- orgUnit-controlled
- phased rollout

---

## 17. CaseShyft Relationship

Long-term:

- CaseShyft becomes primary workspace
- ConnectShyft embeds inside CaseShyft

---

## 18. Anti-Patterns (Strictly Forbidden)

- phone number = person
- conversation anchored to person
- silent merges
- identity logic inside ConnectShyft
- timeline as source of truth
