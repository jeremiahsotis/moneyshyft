# PREP STEP 2B — IMPLEMENTATION BRIEF
**Title:** Complete Rebinding Completion and Resolver Operational Surfaces for PeopleCore and ConnectShyft

## 1. Objective

Deliver the operational layer that sits on top of the Slice 2A resolver-decision backbone so that:

- resolver work is handled through a real, claim-based resolver queue
- rebinding outcomes are no longer just backend side effects, but operationally surfaced and manageable
- `auto_rebind` vs `review_rebind` behavior is explicit, deterministic, and backend-authoritative
- PeopleView becomes the primary resolver workspace for tenant-admin resolvers
- ConnectShyft shows only contextual resolver/rebind state when current thread work is impacted
- existing threads always follow contact-point reassignment
- normal operators see final truth except when unresolved identity state materially affects current work
- Slice 2B moves the system toward the target UX where safe, without sacrificing stability

**Done =** tenant-admin resolvers can work a real queue, claim resolver work, process rebind-review work, and trust that PeopleView and ConnectShyft consume backend identity/rebind truth consistently.

---

## 2. Architectural Position (Locked)

This slice is **not** a new identity or queue system.

The repo already contains:

- a resolver-decision backbone from Slice 2A
- real `personRebind` fanout across threads and telephony artifacts
- `person_rebind_history` with `rebind_class` values `auto | review`
- People and ConnectShyft frontend surfaces already aware of provisional / resolver-required states
- route/API surfaces for reviews and ambiguity work

This slice completes the missing operational layer:

> **claim-based resolver workflow, rebind policy completion, resolver queue behavior, and UI surfaces that consume stable backend truth**

### Ownership model

- **PeopleCore** remains the authority for resolver truth and decision application
- **ConnectShyft backend** remains the authority for ambiguity-event and rebind operational consequences
- **Resolver Queue truth** is backend-owned
- **PeopleView** is the primary resolver workspace
- **ConnectShyft** is contextual only, never the primary resolver workspace
- **Frontend surfaces** consume queue/rebind/resolution state; they do not invent policy

---

## 3. Locked Product Decisions

The following decisions are already locked and are authoritative for Slice 2B:

### Resolver role and claim model
- only **tenant admins** may act as resolvers in MVP
- tenant admins are automatically eligible resolvers
- resolver work must be **claimed** before action
- one review may be claimed by only one resolver at a time
- claims do **not** expire automatically
- a claim persists until the item is resolved, dismissed, or explicitly released

### Queue model
- MVP includes a **true Resolver Queue**
- there is one resolver workspace with typed queue items:
  - **Identity Review**
  - **Rebind Review**
- PeopleView is the **primary resolver workspace**
- ConnectShyft is **secondary/contextual only**

### Rebind policy
- existing threads always follow contact-point reassignment
- objects that should follow current truth may auto-rebind
- historically sensitive or semantically risky objects require review
- no hidden or speculative exception model should be added unless already required by repo behavior

### Visibility model
- tenant-admin resolvers see resolver queue and queue-item state
- normal operators see final truth except when unresolved identity state affects current work
- normal operators do not see resolver internals or history after resolution
- audit remains backend-only in MVP

### Thread detail UX
- unresolved identity/rebind state appears as a **banner**
- final resolved truth appears in the **subject snapshot**
- active banners should disappear once the relevant condition is resolved

---

## 4. Problem This Slice Solves

Slice 2A made resolver decisions correct and backend-authoritative, but MVP still lacks the operational layer needed to use that safely in real work.

Current gaps this slice must close:

- there is not yet a fully operational resolver queue with claim/release behavior
- `review_rebind` work is not yet treated as first-class resolver work
- auto vs review rebind behavior is not yet fully surfaced or finalized as user-operable truth
- PeopleView is not yet the finished primary resolver workspace
- ConnectShyft thread detail does not yet cleanly show contextual unresolved identity/rebind banners while deferring identity authority to People
- post-resolution/rebind state refresh must be reliable so people, threads, and subject context do not drift

This slice solves those gaps.

---

## 5. Resolver Queue Model (Locked)

### 5.1 One resolver workspace, two typed queue classes

MVP must implement one backend-backed Resolver Queue workspace with typed item classes:

- `identity_review`
- `rebind_review`

This is one resolver queue, not two separate systems.

### 5.2 Why one typed queue is authoritative

The queue must be centralized so tenant-admin resolvers have one place to work. But item types must stay explicit so identity ambiguity and rebind-review work are not flattened into a single undifferentiated list.

### 5.3 Queue behavior requirements

The queue must support, at minimum:

- list all active resolver work
- filter by item type
- filter by status
- claim item
- release item
- open item detail
- act on claimed item
- exclude terminal items from active queue by default
- retain terminal items for detail/history access where backend already supports it

---

## 6. Claim / Release Lifecycle (Locked)

### 6.1 Claim rule

A resolver item must be claimed before action.

### 6.2 Claim authority

Any tenant-admin resolver may claim an unclaimed item.

### 6.3 Claimed item exclusivity

Only the current claimant may:
- resolve
- dismiss
- release
- move in and out of active handling states as allowed by current repo contracts

### 6.4 No auto-expiry

Claims do not expire automatically in MVP.

### 6.5 Claim persistence

A claim remains until:
- item is resolved
- item is dismissed
- claimant explicitly releases it

### 6.6 Claim safety rules

The backend must reject:
- claiming an item already claimed by another resolver
- acting on an item claimed by another resolver
- releasing an item not claimed by the actor, unless tenant-admin override already exists in repo and is explicitly preserved

### 6.7 Queue status semantics

The current repo already contains lifecycle statuses like:
- `queued`
- `in_review`
- `waiting_for_more_info`

Slice 2B must operationalize these where appropriate for queue work, without inventing a second queue-state system.

Recommended mapping:
- `queued` = active, unclaimed or awaiting pickup
- `in_review` = actively claimed and being worked
- `waiting_for_more_info` = active but blocked
- resolved/dismissed = terminal and excluded from default active queue

Exact string names may follow existing contract truth.

---

## 7. Rebind Policy Completion (Locked)

### 7.1 Existing threads must follow contact-point reassignment

This is mandatory for MVP.

When contact-point reassignment changes subject truth, existing threads must rebind to follow that new truth unless a current repo constraint explicitly blocks it.

### 7.2 Auto-rebind rule

Objects that should follow current operational truth may auto-rebind.

For MVP, this includes at minimum:
- existing threads
- subject-context bindings
- current conversation/contact-point operational associations
- telephony/conversation artifacts that are already part of the current-subject continuity model, where repo contracts already support this

### 7.3 Review-rebind rule

Objects must require review when rebinding could:
- alter historical meaning
- obscure prior human decisions made under different identity assumptions
- create semantically risky reinterpretation of completed work
- violate existing repo “review” classification rules

Slice 2B must preserve and operationalize the repo’s current `rebind_class = auto | review` model rather than replacing it.

### 7.4 Queue creation for `review_rebind`

When a resolver decision or merge/reassignment produces `review_rebind` consequences:

- those consequences must become first-class `rebind_review` queue items
- they must appear in the Resolver Queue
- they must be claimable and resolvable through the same claim model
- they must not silently disappear into backend-only history

### 7.5 Rebind history remains authoritative

`person_rebind_history` remains the backend truth for what was auto-rebound vs review-required. Slice 2B may extend its operational consumption, but must not invent a parallel rebind ledger.

---

## 8. PeopleView as Primary Resolver Workspace

### 8.1 Role

PeopleView must become the primary place where tenant-admin resolvers:

- see queue counts and queue state
- filter resolver work
- open identity reviews
- open rebind reviews
- claim and release queue items
- act on claimed items
- understand the current person/contact-point truth in enough detail to resolve safely

### 8.2 Required behavior

PeopleView must support:
- active queue list by item type/status
- clear claimed/unclaimed state
- clear indication when an item is claimed by the current resolver vs another resolver
- item detail context sufficient for safe action
- no dependence on ConnectShyft thread detail as the primary place to do resolver work

### 8.3 UX expectations

This slice may begin moving toward THE_GOAL-level polish where safe, but stability and correctness come first.

Allowed:
- cleaner queue layout
- clearer claim state
- better banners/cards inside PeopleView
- clearer typed queue sections

Not allowed:
- visual polish that outruns or obscures queue/rebind truth
- speculative UX that requires backend state not yet locked

---

## 9. ConnectShyft Contextual Surface Rules

### 9.1 ConnectShyft is not the primary resolver workspace

Thread detail must not become the main place to browse or process queue work.

### 9.2 Contextual banner rule

If the current thread is impacted by:
- provisional identity state
- resolver-required identity state
- pending rebind-review state that materially affects current thread truth

then thread detail must show a contextual **banner**.

### 9.3 Banner content requirements

Banner content must be:
- plain-language
- action-oriented only where appropriate
- free of resolver-internal jargon
- free of IDs/debug values
- free of unnecessary history details

For normal operators:
- banner should explain that identity/context is still being resolved if relevant to current work
- banner should not expose resolver internals

For tenant-admin resolvers:
- banner may include path back to PeopleView resolver workspace or resolver action entry point if appropriate, but PeopleView remains primary

### 9.4 Subject snapshot rule

Once identity/rebind state is resolved:
- banner should disappear
- subject snapshot should reflect final truth

The subject snapshot is the stable representation of final identity truth, not the banner.

---

## 10. Operator Visibility Rules

### 10.1 Normal operators

Normal operators should:
- see final truth by default
- see unresolved banners only when unresolved identity/rebind state materially affects the current thread/work
- not see resolution history
- not see merge/reassign internals
- not see queue claims, claimants, or resolver-only metadata unless repo policy already requires it and it survives this slice intentionally

### 10.2 Tenant-admin resolvers

Tenant-admin resolvers should:
- see queue work and item state in PeopleView
- see contextual resolver information where appropriate in thread detail
- be able to claim/release/act on work
- still rely on backend truth, not frontend-derived logic

---

## 11. State Refresh and Consistency Rules

Slice 2B must ensure that after:
- resolver decision application
- ambiguity-event closure
- auto-rebind
- review-rebind resolution

the relevant consuming surfaces refresh cleanly.

### Required consistency points

- PeopleView queue/list state updates correctly
- thread detail subject snapshot updates to final truth when appropriate
- thread banners disappear or change appropriately when state resolves
- stale provisional / resolver-required indicators do not persist after final resolution
- existing threads following contact-point reassignment reflect the new subject truth consistently

Frontend may use refetch/invalidation patterns already present in repo, but must not keep stale identity assumptions alive after backend truth changes.

---

## 12. Backend/API Requirements

Slice 2B must expose or finalize backend support for:

- resolver queue listing with typed item classes
- claim item
- release item
- get queue item detail
- list active vs terminal queue work where appropriate
- consume `review_rebind` work through queue semantics
- return stable queue/claim/state payloads for PeopleView and contextual thread consumers

### API rule

Route handlers remain thin:
- authenticate/authorize
- validate payload
- call backend service
- return normalized result

Queue semantics must not be defined in frontend code.

---

## 13. Result / Transport Semantics (Required)

Queue and contextual surfaces need stable backend semantics. At minimum, transport/result shapes must support:

- item id
- item type (`identity_review` | `rebind_review`)
- queue status
- claim status
- claimed_by_current_user
- claimant identity reference or display-safe equivalent for resolver users where appropriate
- actionable vs terminal state
- affected person/contact/thread context needed for the consuming surface
- whether current thread is impacted by unresolved identity/rebind state

Exact field names may follow current contract style, but the semantics must exist and be typed.

---

## 14. Tests (Required)

### Unit tests

- claim succeeds for unclaimed item by tenant-admin resolver
- claim fails for already claimed item
- release succeeds only for claimant or allowed backend override if intentionally preserved
- acting on unclaimed item is rejected
- `review_rebind` items are created for review-class rebind consequences
- existing threads auto-rebind on contact-point reassignment
- auto vs review rebind classification follows current repo policy rules
- banner/state derivation logic uses backend truth, not ad hoc strings

### Integration tests

- resolver queue lists both identity-review and rebind-review items
- claim/release lifecycle works end-to-end
- tenant-admin resolver can claim and process queue item
- non-resolver / non-tenant-admin cannot claim or process queue item
- reassign contact point causes existing thread to follow new subject truth
- review-class rebind consequence becomes queue work
- PeopleView receives stable queue payloads
- thread detail receives contextual unresolved-state payloads and resolved-state refresh

### Regression / characterization

- Slice 2A resolver decision backbone remains intact
- existing PeopleView and thread-detail identity-state surfaces remain compatible
- existing rebind history persistence remains intact
- normal operators do not receive resolver-only history or internals after resolution

---

## 15. Explicit Non-Goals

The following are out of scope for Slice 2B:

- broad shell redesign
- final global application shell work
- full THE_GOAL visual completion across all ConnectShyft surfaces
- visible resolution-history UI
- resolver claim timeout/expiry
- non-tenant-admin resolver roles
- advanced SLA/reminder/escalation workflows
- notifications beyond what existing queue/context surfaces require
- CaseShyft integration

---

## 16. Done Criteria

Slice 2B is done only when:

- tenant-admin resolvers can work a real claim-based Resolver Queue
- both identity-review and rebind-review work appear in that queue as typed items
- `auto_rebind` vs `review_rebind` behavior is explicit and operationally surfaced
- review-class rebind consequences become queue work instead of remaining backend-only
- existing threads follow contact-point reassignment consistently
- PeopleView is the primary resolver workspace
- ConnectShyft thread detail shows contextual unresolved-state banners when relevant
- subject snapshot reflects final truth after resolution
- normal operators see final truth except for materially relevant unresolved warnings
- queue/rebind state is backend-authoritative and frontend-consumed, not frontend-defined

---

## 17. Checkpoint Shape Recommendation

Slice 2B should be broken into these checkpoints:

1. **Resolver queue + claim/release lifecycle lock**
   - queue item types
   - claim/release rules
   - resolver authority checks
   - active vs terminal semantics

2. **Rebind policy completion + `review_rebind` queue item creation**
   - auto vs review rebind completion
   - thread-following-contact-point rule
   - queue creation for review-class rebind items

3. **PeopleView primary resolver workspace**
   - queue list/detail/claim/release/action consumption
   - resolver-user compatibility
   - typed item sections/filters

4. **ConnectShyft contextual banners + subject/context refresh**
   - thread banners
   - final truth in subject snapshot
   - stale-state cleanup after resolution/rebind

That is the authoritative execution order unless repo reality discovered during implementation forces a narrower decomposition.

---

## 18. Locked Recommendation

Proceed next with:

> **Prep Step 2B — Checkpoint 1: Resolver queue model, claim/release lifecycle, and resolver authority lock**

Do not start with frontend polish or contextual thread banners before the queue/claim model is backend-safe.

---

## 19. Implementation Intent

This is a **completion and hardening slice**, not a redesign.

Use the repo’s existing resolver backbone, rebind history, personRebind fanout, PeopleView consumption, and thread-detail identity state surfaces. Extend them into a real operational resolver system. Do not introduce a second queue model, a frontend-owned claim system, or a ConnectShyft-first resolver workflow.
