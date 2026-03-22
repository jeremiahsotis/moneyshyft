# ConnectShyft Execution Roadmap (LOCKED)

## Status

ACTIVE EXECUTION PLAN

## Purpose

Drive ConnectShyft from partial foundation → working system

---

# CURRENT STATE (HONEST BASELINE)

## What exists

- PeopleCore + identity seam implemented
- Ambiguity handling rules enforced (no silent resolution)
- ConnectShyft router refactor in progress
- Telephony integration partially wired (Telnyx)
- Runtime seams (bridgeSessions, etc.) exist

## What does NOT exist (blocking)

- No reliable telephony runtime (inbound/outbound not fully proven)
- No ops visibility (Slice 15 incomplete)
- No ambiguity resolution lifecycle (write path missing)
- No application shell with feature flags controlling rollout

## Reality

System is:

- Architecturally stabilizing
- Operationally incomplete

---

# EXECUTION STRATEGY (LOCKED)

You will NOT “finish ConnectShyft” in one pass.

You will execute **4 phases in strict order**:

1. Ops Visibility (Slice 15)
2. Telephony Stabilization
3. Identity Resolution Actions (minimal write path)
4. Application Shell + Feature Flags

No reordering.

---

# PHASE A — OPS VISIBILITY (SLICE 15)

## Goal

Make runtime state observable without mutation.

## Scope

- Identity resolution visibility
- Ambiguity state exposure
- Bridge session visibility
- Thread existence visibility

## Endpoints (must exist)

```bash
GET /api/v1/connectshyft/ops/identity/:phone
GET /api/v1/connectshyft/ops/threads/:threadId
GET /api/v1/connectshyft/ops/bridge/:bridgeId
```

## Constraints

- Read-only ONLY
- No provider calls
- No mutation
- No resolution logic

## Done means

- Endpoints return real data (not stubs)
- Identity ambiguity visible
- Bridge state visible from runtime seam
- Thread lookup works (found vs not-found)
- No side effects
- Tests pass clean

## Failure conditions

- Any write path introduced
- Any provider action triggered
- Any ambiguity auto-resolved

---

# PHASE B — TELEPHONY STABILIZATION

## Goal

Make telephony actually work, deterministically.

## Scope

- Inbound SMS
- Outbound SMS
- Inbound voice
- Outbound voice (bridge)
- Provider (Telnyx) integration correctness

## Required validation matrix

### SMS

- inbound → thread routing correct
- inbound unknown → identity resolution triggered
- outbound → correct recipient, no duplication

### Voice

- operator leg connects
- neighbor leg connects
- bridge forms
- failure states handled

### Provider

- webhook idempotency
- event ordering safe
- retries safe

## Done means

- All telephony flows succeed end-to-end
- No duplicate messages
- No orphaned calls
- Bridge sessions reflect real state
- Tests pass AND manual flows verified

## Failure conditions

- non-deterministic routing
- duplicate sends
- bridge state mismatch
- provider retry causes corruption

---

# PHASE C — IDENTITY RESOLUTION ACTIONS (MINIMAL WRITE PATH)

## Goal

Allow ambiguity to be resolved safely.

## Scope (strictly minimal)

- resolve ambiguous identity
- confirm correct identity
- create new identity when appropriate

## NOT allowed

- bulk merge tools
- admin-heavy workflows
- full CRM features

## Required behavior

When ambiguity exists:

- system does NOT auto-resolve
- ops must explicitly select resolution

## Done means

- ambiguity can be resolved intentionally
- no silent merges
- PeopleCore remains authoritative
- audit trail exists for resolution

## Failure conditions

- automatic merge
- identity mutation outside PeopleCore
- unclear resolution state

---

# PHASE D — APPLICATION SHELL + FEATURE FLAGS

## Goal

Provide controlled runtime environment.

## Target

`app.shyftunity.com`

## Scope

- application shell
- routing boundaries
- feature flags for ConnectShyft
- safe rollout controls

## Requirements

- ConnectShyft behind feature flag
- ability to enable/disable per environment
- no direct exposure of unfinished features

## Done means

- ConnectShyft loads within shell
- features can be toggled safely
- routing is stable
- no UI drift outside shell

## Failure conditions

- direct access to unfinished features
- no rollback capability
- routing inconsistency

---

# CRITICAL PATH (DO NOT DEVIATE)

`Slice 15 → Telephony → Identity Actions → Shell`

If you skip:

- Slice 15 → you are blind
- Telephony → system does not function
- Identity actions → ambiguity blocks usage
- Shell → unsafe rollout

---

# ANTI-PATTERNS (BLOCK THESE)

- “Let’s just make telephony work first”
- “We can resolve ambiguity automatically”
- “We’ll clean up identity later”
- “We don’t need ops visibility yet”
- “Let’s expose it and fix later”

All of these lead to instability.

---

# FINAL DEFINITION OF “CONNECTSHYFT WORKS”

ConnectShyft is considered working ONLY when:

1. Telephony flows work end-to-end (SMS + voice)
2. Identity resolution is deterministic and visible
3. Ambiguity can be resolved intentionally
4. Ops can observe system state
5. System runs inside controlled shell with feature flags

Anything less = not working

---

# DECISION (LOCKED)

Proceed immediately with:

1. Complete Slice 15 (ops visibility)
2. Move directly into telephony stabilization slice

Do NOT attempt:

- full identity system expansion
- UI-heavy work
- new features

Focus only on making the system operationally real

---

# COUNTERPOINT

This sequence delays visible progress in favor of stability.

Risk:

- feels slower
- less immediate payoff

Tradeoff:

- prevents catastrophic debugging later
- ensures ConnectShyft actually works when declared ready
