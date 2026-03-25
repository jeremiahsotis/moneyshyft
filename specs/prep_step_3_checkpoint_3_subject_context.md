# CHECKPOINT 3 — SUBJECT/CONTEXT UNIFICATION ACROSS PEOPLE ↔ CONNECTSHYFT
**Slice:** Prep Step 3  
**Objective:** Establish a persistent, shell-owned subject/context model that unifies People and ConnectShyft so users can move between surfaces without losing context, while ensuring stale or invalid context is safely cleared

---

## 1. Goal

Create a unified subject/context system so that:

- the shell owns the current subject (person/contact/thread context)
- subject/context persists across People ↔ ConnectShyft when valid
- subject/context is cleared when invalid or unsafe
- ConnectShyft and People consume the same context source
- no module invents its own subject state independently
- final identity truth is always reflected (no stale provisional context)

This checkpoint establishes **continuity and correctness of subject context**.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/shell/*
apps/connectshyft-web/src/views/Shell/*
apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
apps/connectshyft-web/src/views/Shell/PeopleView.vue
apps/connectshyft-web/src/features/connectshyft/identityResolution.ts
apps/connectshyft-web/src/router/index.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/connectshyft/*
apps/connectshyft-api/src/modules/peoplecore/*
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/*
```

---

## 3. Required Changes

### 3.1 Shell-owned subject/context state

The shell must maintain a single authoritative subject/context state:

Includes (as available from contracts):
- person identity
- contact point
- thread context (if in ConnectShyft)
- identity state (resolved/provisional when relevant)

Rules:
- no duplicate subject stores in People or ConnectShyft
- modules must read from shell context

---

### 3.2 Subject/context entry points

Subject/context can be set from:

- selecting a person in People
- opening a thread in ConnectShyft
- navigating directly to a route with subject params

When set:
- shell updates subject/context
- downstream modules receive updated context

---

### 3.3 Cross-module continuity

When moving between:

- People → ConnectShyft
- ConnectShyft → People

If subject remains valid:
- preserve subject/context
- do not reset or re-fetch unnecessarily

---

### 3.4 Context validation rules

Before preserving subject/context, validate:

- subject exists in current orgUnit
- subject is still accessible
- module supports subject type
- identity is not invalidated by backend truth

If invalid:
- clear subject/context
- route safely

---

### 3.5 Clearing rules (mandatory)

Subject/context must be cleared when:

- orgUnit switch invalidates subject
- route change no longer supports subject
- backend truth changes (merge/rebind removes or changes identity)
- thread no longer maps to valid subject

No stale subject state allowed.

---

### 3.6 Backend truth synchronization

Subject/context must always reflect:

- latest identity resolution
- latest rebind results
- current thread-to-person mapping

If backend changes:
- invalidate/refetch context
- update shell state
- remove stale UI indicators

---

### 3.7 No frontend inference

Do not derive subject validity from:
- missing fields
- string parsing
- UI heuristics

Use contract-backed data only.

---

### 3.8 Interaction with ConnectShyft

When a thread is opened:

- shell sets subject/context from thread
- thread detail uses shell context
- context updates when identity/rebind changes

When leaving thread:
- context persists if still valid

---

### 3.9 Interaction with People

When a person is selected:

- shell sets subject/context
- People and ConnectShyft can both consume it

---

### 3.10 Preparation for subject/context bar

Shell must expose:

- subject summary data
- identity state indicators
- stable data shape

Do not implement visual bar yet (comes later if needed refinement).

---

## 4. Explicit Non-Changes

Do not:

- redesign People UI
- redesign ConnectShyft UI
- add new subject UI components beyond minimal needs
- expose debug/internal identity details
- implement advanced caching or offline logic

---

## 5. Tests Required

### Unit

- subject/context sets correctly from People selection
- subject/context sets correctly from thread open
- subject/context clears when invalid
- subject/context persists across safe navigation

### Integration

- People → ConnectShyft retains subject
- ConnectShyft → People retains subject
- orgUnit switch clears invalid subject
- backend identity change updates subject correctly
- stale subject is never displayed

### Regression

- Slice 2B identity resolution still works
- thread behavior remains intact
- resolver flows unaffected

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- shell owns subject/context state
- People and ConnectShyft use the same context
- subject persists across modules when valid
- subject clears when invalid
- backend truth always wins over cached state

---

## 7. Commit Boundary

```text
feat(connectshyft-web): unify subject context across People and ConnectShyft
```

---

## 8. Verification Commands

```bash
rg "subject|context|personId|threadId|identity" apps/connectshyft-web
```

```bash
rg "subject|context|identity|thread|person" apps/connectshyft-api libs/contracts
```

---

## 9. Outcome

After this checkpoint:

- subject/context is unified across the app
- navigation feels continuous
- identity truth remains accurate
- system is ready for final shell cleanup and polish
