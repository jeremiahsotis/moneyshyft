# CHECKPOINT 4 — CONNECTSHYFT CONTEXTUAL BANNERS AND SUBJECT/CONTEXT REFRESH
**Slice:** Prep Step 2B  
**Objective:** Add contextual unresolved-identity/rebind banners to ConnectShyft thread detail and ensure subject/context refreshes cleanly after resolution or rebinding without making ConnectShyft the primary resolver workspace

## 1. Goal

Complete the secondary, contextual ConnectShyft surface so that:

- thread detail shows a plain-language banner when unresolved identity or pending rebind-review materially affects current work
- thread detail remains secondary/contextual, not the primary resolver workspace
- final resolved truth appears in the subject snapshot once resolution/rebind is complete
- stale provisional/resolver-required/rebind-pending indicators do not persist after backend truth changes
- normal operators see only the minimal unresolved warning needed for current work
- tenant-admin resolvers can still navigate back to PeopleView when appropriate, without shifting primary resolver workflow into ConnectShyft

This checkpoint does **not** redesign the whole thread view or the shell. It adds the correct contextual layer on top of the backend-safe queue/rebind model established in prior checkpoints.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
apps/connectshyft-web/src/features/connectshyft/identityResolution.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/people/events.ts
```

Include adjacent frontend components/composables or API helpers only if required to implement banner rendering and subject/context refresh cleanly while preserving existing architecture. Do not modify broad shell/navigation outside the thread-detail context.

---

## 3. Required Changes

### 3.1 ConnectShyft must remain contextual, not primary

Thread detail may show contextual unresolved-state information, but it must not become the primary place to browse or process resolver queue work.

Required rule:
- queue browsing/claim/release remains centered in PeopleView
- thread detail only reflects whether this thread is currently impacted by unresolved identity/rebind state
- any resolver-oriented action surfaced here must route back to PeopleView or a clearly secondary detail path, not create a ConnectShyft-first resolver workflow

### 3.2 Banner appears only when current thread is materially impacted

Thread detail must show a contextual banner only when backend truth indicates the current thread is impacted by one of these unresolved states:

- provisional identity still unresolved
- resolver-required identity state still unresolved
- pending `rebind_review` or unresolved review-class rebind consequence affecting this thread’s subject/context truth

Do not show banners globally or generically just because some unrelated person/contact elsewhere is unresolved.

### 3.3 Banner content must be plain-language and role-appropriate

For normal operators:
- explain only that identity/context for this conversation is still being resolved if that affects current work
- do not expose resolver-only queue state, history, or internal action semantics
- do not expose raw IDs, review statuses, debug strings, or merge/reassign internals

For tenant-admin resolvers:
- banner may include a clear path back to PeopleView resolver workspace or appropriate resolver item context
- still do not overload thread detail with primary resolver controls

### 3.4 Subject snapshot is the home of final truth

Once identity/rebind state resolves:
- the banner must disappear
- the subject snapshot must reflect final identity truth
- final truth should not remain trapped behind stale provisional/resolver-required labels or stale person/contact context

This is a hard requirement:
- **banner = temporary unresolved condition**
- **subject snapshot = stable resolved truth**

### 3.5 Subject/context refresh must be explicit and reliable

After any backend change that can alter thread identity truth, including:
- resolver decision application
- ambiguity-event closure
- contact-point reassignment
- auto-rebind completion
- review-rebind resolution

the thread detail surface must refresh/invalidate/refetch so that:
- the banner state updates correctly
- the subject snapshot updates correctly
- stale prior truth is removed

Use existing repo invalidation/refetch patterns where possible. Do not rely on manual page reload as the primary consistency mechanism.

### 3.6 Contextual state must come from backend contract-backed fields

Thread-detail banner logic must derive from stable backend semantics, not from:
- loose notes fields
- ad hoc string parsing
- inferred UI heuristics
- hidden assumptions about queue/review status

At minimum, thread-detail consumers must be able to determine through contract-backed inputs:
- whether the current thread is impacted by unresolved identity state
- whether the impact is provisional/resolver-required/rebind-review related
- whether the condition is still actionable vs already resolved

### 3.7 Banners must not persist after resolution

This checkpoint must ensure that once the underlying backend condition is resolved:
- the banner disappears
- stale warning state is not cached indefinitely
- the thread does not continue to look unresolved when the backend says it is resolved

### 3.8 ConnectShyft must not expose resolver internals to normal operators

Normal operators may see the existence of a current unresolved condition when relevant, but must not see:
- claim state
- claimant identity
- review history
- merge/reassign action details
- queue-item class labels unless intentionally translated into plain-language backend-safe copy

### 3.9 Resolver-accessible contextual affordance is allowed but secondary

For tenant-admin resolvers only, thread detail may include a lightweight affordance such as:
- “Open in People” / “Review in People”
- “Go to resolver workspace”

Allowed because it supports workflow continuity.

Not allowed:
- a full embedded resolver queue inside thread detail
- duplicated resolver action matrix inside ConnectShyft that bypasses PeopleView’s primary role

### 3.10 Preserve existing thread-detail behavior outside impacted state

If a thread is not impacted by unresolved identity/rebind state:
- thread detail should behave normally
- no new banner or placeholder should appear
- existing thread activity, voicemail, subject snapshot, and other communication surfaces should remain unaffected

### 3.11 Start moving toward THE_GOAL only where safe

This checkpoint may improve thread-detail clarity and polish where it helps users distinguish unresolved vs resolved identity context.

Allowed:
- clean banner styling
- clear subject snapshot refresh
- better visual separation between temporary warning and stable subject info

Not allowed:
- broad redesign of thread layout
- making the banner over-dominant
- speculative UI that assumes future shell behavior not yet built

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- make ConnectShyft the main resolver workspace
- redesign global shell/navigation
- redesign PeopleView resolver workspace
- redesign Slice 2A or Slice 2B queue/rebind backend policy
- add visible resolution-history UI
- add notifications/escalation workflows
- introduce frontend-owned identity/rebind semantics

---

## 5. Tests Required

### Unit / Component

- banner renders when backend indicates current thread is impacted by unresolved provisional/resolver-required/rebind-review state
- banner does not render when thread is not impacted
- normal operator banner content omits resolver internals
- tenant-admin resolver sees secondary affordance to open resolver workspace when appropriate
- subject snapshot reflects resolved truth when banner condition clears

### Integration

- thread impacted by contact-point reassignment/rebind updates to new subject truth without stale prior labels
- thread impacted by unresolved review-rebind shows contextual banner until backend state resolves
- thread banner disappears after resolution/rebind and subject snapshot updates accordingly
- resolver decision + backend refresh pipeline results in correct thread-detail state without manual reload dependency
- non-impacted threads remain unchanged

### Regression / Characterization

- PeopleView remains the primary resolver workspace
- existing thread activity/telephony surfaces are not broken by banner/state-refresh additions
- normal operators do not receive resolver-only internals
- stale provisional/resolver-required indicators do not persist after final truth is available

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- ConnectShyft thread detail shows contextual unresolved-state banners only when the current thread is materially impacted
- banner content is plain-language and role-appropriate
- subject snapshot reflects final truth after resolution/rebind
- stale unresolved indicators disappear after backend truth changes
- thread-detail state is driven by backend contract-backed semantics
- ConnectShyft remains secondary/contextual and does not become the primary resolver workspace

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft-web): add contextual identity banners and refresh subject truth after resolution
```

---

## 8. Verification Commands

Run:

```bash
rg "ConnectShyftThreadDetailView|banner|resolver_required|provisional|rebind_review|subject snapshot|subject context" apps/connectshyft-web libs/contracts
```

Verify thread-detail banner and subject-context inputs are wired to stable semantics.

Run:

```bash
rg "thread.*impact|affected thread|rebind_review|resolver_required|provisional|identity state" apps/connectshyft-api apps/connectshyft-web libs/contracts
```

Verify banner logic depends on backend-reported thread impact/state, not ad hoc UI inference.

Run:

```bash
rg "Open in People|Review in People|resolver workspace|claimed_by|claim" apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue apps/connectshyft-web/src/features/connectshyft/identityResolution.ts
```

Verify resolver affordances remain secondary and non-primary.

---

## 9. Outcome

After this checkpoint:

- ConnectShyft correctly reflects unresolved identity/rebind conditions only when they affect current conversation work
- final truth lives in the subject snapshot after resolution
- PeopleView remains primary, ConnectShyft remains contextual
- Slice 2B is complete and operationally coherent
