# CHECKPOINT 3 — PEOPLEVIEW AS THE PRIMARY RESOLVER WORKSPACE
**Slice:** Prep Step 2B  
**Objective:** Make PeopleView the primary operational workspace for tenant-admin resolvers by surfacing the Resolver Queue, typed queue items, claim/release actions, and sufficient item context without moving resolver truth into the frontend

## 1. Goal

Build the primary resolver workspace in PeopleView so that tenant-admin resolvers can:

- see active resolver work in one place
- distinguish `identity_review` vs `rebind_review` items
- filter and inspect queue work
- claim and release queue items
- understand enough context to act safely
- rely on backend-authored queue, claim, and identity truth

This checkpoint does **not** make ConnectShyft the primary resolver interface and does **not** finish contextual thread banners. It establishes the real resolver workspace in PeopleView.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-web/src/views/Shell/PeopleView.vue
apps/connectshyft-web/src/features/connectshyft/identityResolution.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/people/events.ts
```

Include adjacent frontend composables/components or route helpers only if required to implement the workspace cleanly while preserving existing architecture. Do not modify broad shell/navigation beyond what is necessary to host the workspace in PeopleView.

---

## 3. Required Changes

### 3.1 PeopleView must become the primary resolver workspace

PeopleView must expose a resolver workspace for tenant-admin resolvers that surfaces the backend Resolver Queue as the primary place to do resolver work.

Required rule:
- resolvers should not need ConnectShyft thread detail to browse queue work
- queue listing, claim/release, item type, and actionable state must all be visible in PeopleView
- PeopleView remains consumer of backend truth, not owner of resolver policy

### 3.2 Resolver access is tenant-admin-only

PeopleView resolver workspace must only be visible/actionable for tenant-admin resolvers in MVP.

Required behavior:
- non-tenant-admin users must not see operational resolver controls
- if PeopleView already shows identity state to broader users, preserve read-safe state where appropriate, but keep resolver queue actions hidden or disabled
- frontend must not become the real authority; backend authorization remains authoritative

### 3.3 Queue list must support one workspace with typed items

PeopleView must show one resolver workspace with typed queue items:
- `identity_review`
- `rebind_review`

The workspace may use:
- sections
- tabs
- filters
- grouped lists

But it must remain one operational workspace, not two separate systems.

### 3.4 Required queue list fields

Each rendered queue item must display enough context for a resolver to triage and safely open the item.

At minimum, PeopleView must consume and present:

- item type
- current status
- claim state
- whether claimed by current resolver
- whether claimed by another resolver
- affected person/contact/thread context where available
- actionable vs terminal state
- any contract-backed risk/ambiguity signal already present and appropriate for resolver use

Exact visual treatment may vary, but the workspace must not force the resolver to guess what the item is.

### 3.5 Claim / release controls must be backend-driven

PeopleView must support:
- claim item
- release item

Required rules:
- claim/release state must come from backend truth
- claim/release requests must call thin routes backed by Slice 2B Checkpoint 1
- frontend must not simulate claim success before backend confirmation unless existing repo patterns already safely support optimistic updates with rollback
- if optimistic behavior is used, it must remain consistent with backend claim exclusivity

### 3.6 Claimed-by-other state must be explicit

If an item is claimed by another tenant-admin resolver:
- PeopleView must show that it is not currently available for this resolver to act on
- action controls must be disabled or absent accordingly
- no frontend-only override should exist

### 3.7 Item detail context must be sufficient

PeopleView must allow opening enough item detail context to safely act later, even if final action controls are completed in a later or adjacent component.

For `identity_review`, detail context should include as available from backend:
- current person/candidate/contact-point context
- review status
- current ambiguity state
- claim state

For `rebind_review`, detail context should include as available from backend:
- affected object type/id
- source/target identity context
- why review is required (backend-safe explanation, not raw debug text)
- claim state

This checkpoint does not need to finalize every action affordance if some are already driven elsewhere, but the workspace must make queue work operationally understandable.

### 3.8 Filter and grouping support must be real

PeopleView resolver workspace must support, at minimum:

- All active items
- Identity Reviews
- Rebind Reviews
- claimed by me
- unclaimed
- optionally blocked / waiting for more info if backend already supplies that state cleanly

Filtering/grouping must use contract-backed item fields, not ad hoc string matching.

### 3.9 Begin moving toward THE_GOAL where safe

This checkpoint may improve clarity and presentation in PeopleView where it helps operational use:

Allowed:
- cleaner queue cards/rows
- clearer claim-state badges
- better grouping or tabs
- clearer empty states for resolver queue
- better visual distinction between identity vs rebind queue items

Not allowed:
- speculative polish that obscures backend truth
- layout overhauls that outrun the queue model
- a new standalone resolver app outside PeopleView

### 3.10 Preserve backend authority for action semantics

PeopleView may surface action entry points, but it must not:
- decide what actions are allowed
- decide when claim is required
- decide queue terminality
- infer identity truth from raw notes/debug fields

All of those must continue coming from backend contract-backed results.

### 3.11 Error and empty-state behavior must be plain-language

For resolvers:
- queue-load failures
- claim/release failures
- item no longer available
- unauthorized state

must be shown in plain language without leaking internal-only details, stack traces, IDs, or engineering notes.

### 3.12 Compatibility with existing identity-state surfaces must be preserved

If PeopleView already shows provisional/resolver-required identity state outside the new queue workspace:
- keep that compatible
- do not duplicate or contradict it
- prefer a single contract-backed vocabulary for status display

This checkpoint may consolidate toward the queue workspace where safe, but must not break current identity-state visibility while doing so.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- make ConnectShyft the primary resolver workspace
- finish contextual thread banners yet
- redesign global shell/navigation
- redesign Slice 2A decision semantics
- redesign queue policy from Checkpoint 1
- add visible resolution-history UI
- add notifications/escalation workflows
- invent frontend-owned queue semantics

---

## 5. Tests Required

### Unit / Component

- tenant-admin resolver sees resolver workspace controls
- non-tenant-admin does not see actionable resolver controls
- queue item rendering distinguishes `identity_review` vs `rebind_review`
- claimed-by-me vs claimed-by-other state renders correctly
- claim/release actions call backend-backed operations
- filters/grouping derive from typed queue fields, not ad hoc strings

### Integration

- PeopleView loads active resolver queue and displays typed items
- tenant-admin resolver can claim and release an item from PeopleView
- item claimed by another resolver is not actionable
- queue updates after claim/release without stale contradictory state
- `rebind_review` items appear in the same workspace alongside `identity_review` items
- PeopleView remains compatible with existing provisional/resolver-required identity state surfaces

### Regression / Characterization

- Slice 2B Checkpoint 1 queue semantics remain intact
- Slice 2B Checkpoint 2 rebind-review queue items remain consumable in PeopleView
- existing PeopleView identity-state behavior is not broken by the resolver workspace addition
- no frontend-only semantic drift is introduced

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- PeopleView is the primary resolver workspace for tenant-admin resolvers
- the backend Resolver Queue is visibly consumable there
- both `identity_review` and `rebind_review` items appear in one typed workspace
- claim/release behavior is usable from PeopleView and remains backend-authoritative
- claimed-by-other state is explicit and non-actionable
- non-tenant-admin users do not get resolver action controls
- filtering/grouping is contract-backed and stable

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft-web): make PeopleView the primary resolver workspace
```

---

## 8. Verification Commands

Run:

```bash
rg "PeopleView|identity_review|rebind_review|claim|release|claimed_by|claimedBy|resolver queue" apps/connectshyft-web libs/contracts
```

Verify PeopleView consumes the typed queue model and claim state.

Run:

```bash
rg "tenant admin|tenant_admin|resolver|required|provisional|claimResolverQueueItem|releaseResolverQueueItem|listResolverQueue" apps/connectshyft-web apps/connectshyft-api libs
```

Verify PeopleView access/action behavior aligns with backend resolver authority and queue operations.

Run:

```bash
rg "filter|group|claimed by me|unclaimed|waiting_for_more_info|in_review|queued" apps/connectshyft-web/src/views/Shell/PeopleView.vue apps/connectshyft-web/src/features/connectshyft/identityResolution.ts
```

Verify grouping/filtering behavior is explicit and contract-backed.

---

## 9. Outcome

After this checkpoint:

- tenant-admin resolvers have a real operational workspace in PeopleView
- queue work is no longer abstract backend state
- both identity-review and rebind-review work are surfaced in one place
- later contextual thread-banner work can remain secondary and truly contextual
