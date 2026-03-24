# PREP STEP 2A — IMPLEMENTATION BRIEF
**Title:** Complete Resolver Decision Backbone for PeopleCore and ConnectShyft

## 1. Objective

Deliver a complete, backend-authoritative resolver decision system for ambiguous identity handling so that:

- ambiguity outcomes are no longer limited to detection only
- resolvers can apply explicit, durable decisions against resolver reviews
- each supported resolver action has a locked semantic meaning
- each decision produces the correct PeopleCore and ConnectShyft consequences
- ambiguity events, resolver reviews, contact-point links, person state, and rebind behavior stay consistent
- downstream UI surfaces can rely on a stable backend contract without improvising decision logic

**Done =** the repo has a single authoritative resolver-decision backbone that supports MVP ambiguity handling without requiring frontend-specific business logic.

---

## 2. Architectural Position (Locked)

This slice is **not** a new identity system.

The repo already contains:

- contact-point identity resolution with `canonical | provisional | resolver_required` outcomes
- provisional person creation
- resolver review creation/list/get flows
- ambiguity event persistence in ConnectShyft
- person merge capabilities
- downstream rebind infrastructure
- provisional / resolver-required state expectations in existing web views

This slice completes the missing middle:

> **resolver decision semantics, persistence, lifecycle transitions, and backend consequences**

### Ownership model

- **PeopleCore** owns resolver review truth, action application, person/contact-point consequences, and audit persistence
- **ConnectShyft** owns ambiguity-event consumption and downstream operational consequences driven by PeopleCore outcomes
- **Route handlers** remain thin
- **Frontend surfaces** consume state; they do not define action semantics

---

## 3. Problem This Slice Solves

Current repo state already detects ambiguity and records it, but MVP still lacks a fully locked answer to these questions:

- What exact actions may a resolver take?
- What does each action *mean* in backend terms?
- When does a decision merge vs relink vs suppress vs defer?
- What records are updated as a consequence?
- When is rebind automatic versus review-required?
- How are ambiguity events and resolver reviews marked consumed or resolved?
- What audit trail exists for those decisions?

This slice answers those questions definitively.

---

## 4. Locked Resolver Action Set

The following action set is authoritative for Slice 2A unless repo implementation forces a narrower technical alias while preserving the same semantics.

### 4.1 `confirm_existing_person`

Use when the ambiguous contact point should resolve to an already-existing canonical person.

**Semantics**
- resolver selects one existing person
- active contact-point association is confirmed or updated to that person
- review resolves as an existing-person confirmation
- ambiguity event is consumed/resolved
- downstream rebind may run where applicable
- no person merge occurs

### 4.2 `confirm_new_person`

Use when ambiguity should resolve to a distinct person and the provisional/new identity should stand as its own person.

**Semantics**
- provisional/new person is confirmed as the correct identity
- no merge into another person occurs
- contact point remains associated with the confirmed person
- review resolves as new-person confirmation
- ambiguity event is consumed/resolved
- downstream rebind may still run if objects were temporarily attached elsewhere

### 4.3 `merge_people`

Use when two person records actually represent the same real person and should become one.

**Semantics**
- source person merges into target canonical person
- merge event is published through the existing PeopleCore mechanism
- contact-point current associations are normalized to the surviving person
- resolver review resolves as merged
- ambiguity event is consumed/resolved
- rebind fanout runs according to current repo merge/rebind contracts

### 4.4 `link_without_merge`

Use when a contact point or ambiguous evidence should be linked to a person for operational continuity, but records should remain distinct.

**Semantics**
- no person merge occurs
- selected contact-point linkage is attached or confirmed for operational use
- distinct persons remain distinct
- review resolves as linked-without-merge
- ambiguity event is consumed/resolved
- only linkage-level consequences occur

### 4.5 `mark_shared_contact`

Use when the contact point is legitimately shared and ambiguity should not be forced into a single-person answer.

**Semantics**
- review resolves as shared-contact
- current ambiguity is recorded as intentionally shared / non-exclusive
- no forced merge occurs
- no exclusive reassignment occurs
- downstream UI may continue to require careful handling, but backend truth is now explicit
- ambiguity event is consumed/resolved

### 4.6 `reassign_contact_point`

Use when the current contact-point association is wrong and should move to a different person.

**Semantics**
- current association is reassigned to the selected person
- no person merge occurs unless separately invoked
- review resolves as reassigned
- ambiguity event is consumed/resolved
- downstream rebind may run for objects whose subject identity should follow the new contact-point truth

### 4.7 `dismiss_no_action`

Use when the review is closed without changing identity truth.

**Semantics**
- no merge
- no reassignment
- no new link
- ambiguity event is closed as dismissed/no-action
- audit reason is required
- downstream operational state remains unchanged except resolution closure

---

## 5. Explicit Non-Actions

The following are **not** separate action types in MVP:

- “maybe merge later”
- “soft merge”
- “temporary assign and hope”
- “UI-only suppress”
- “just hide banner”

Those may exist as UX affordances later, but they are not backend decision types.

---

## 6. Resolver Review Lifecycle (Locked)

The contracts already suggest a richer lifecycle than MVP strictly needs. Slice 2A will preserve contract breadth while requiring only a minimal operational path.

### Supported statuses in contract

- `pending`
- `queued`
- `in_review`
- `waiting_for_more_info`
- resolved statuses
- `dismissed`

### MVP required lifecycle path

```text
pending -> in_review -> resolved
pending -> dismissed
in_review -> dismissed
```

### Allowed but not UI-required in MVP

- `queued`
- `waiting_for_more_info`

These may remain valid persisted states without requiring rich frontend workflow in Slice 2A.

### Resolution requirement

Every resolved or dismissed review must persist:

- action type
- actor
- timestamp
- reason / notes where required by current contract
- target/source person references as applicable
- ambiguity event linkage / consumption outcome

---

## 7. Backend Consequence Matrix

## 7.1 `confirm_existing_person`

Must update or confirm:
- resolver review status/resolution
- selected person reference
- contact-point active link if needed
- ambiguity event resolution state
- optional downstream rebind trigger
- audit entry

Must not:
- merge persons

## 7.2 `confirm_new_person`

Must update or confirm:
- resolver review status/resolution
- confirmed new/provisional person as surviving identity
- contact-point active link remains or is normalized
- ambiguity event resolution state
- audit entry

Must not:
- merge persons into another canonical person

## 7.3 `merge_people`

Must update or trigger:
- resolver review resolution
- PeopleCore merge operation
- merge event publication
- ambiguity event resolution state
- audit entry
- downstream rebind entry path

Must not:
- leave the source and target active as separate canonical truths

## 7.4 `link_without_merge`

Must update:
- resolver review resolution
- linkage association needed for operational continuity
- ambiguity event resolution state
- audit entry

Must not:
- call merge
- collapse distinct person records

## 7.5 `mark_shared_contact`

Must update:
- resolver review resolution
- explicit shared-contact outcome
- ambiguity event resolution state
- audit entry

Must not:
- force exclusive ownership
- merge records solely to eliminate ambiguity

## 7.6 `reassign_contact_point`

Must update:
- resolver review resolution
- current contact-point ownership/association
- ambiguity event resolution state
- audit entry
- downstream rebind trigger if current subject truth changes

Must not:
- merge persons unless separately invoked

## 7.7 `dismiss_no_action`

Must update:
- resolver review dismissed status
- ambiguity event dismissed/closed state
- audit reason

Must not:
- mutate identity truth

---

## 8. Service Layer Ownership (Locked)

### PeopleCore service owns decision application

Slice 2A must add or finalize a single authoritative decision-application path in PeopleCore.

Required conceptual entry point:

```ts
applyResolverDecision(input): ResolverDecisionResult
```

### This service must own:

- review retrieval and guard checks
- lifecycle transition validation
- action-type dispatch
- person/contact-point mutation
- merge invocation where applicable
- review resolution persistence
- audit persistence
- result payload for downstream consumers

### Route handlers must not own:

- merge semantics
- reassignment semantics
- shared-contact semantics
- ambiguity consumption logic
- rebind policy

---

## 9. Guardrails and Validation

## 9.1 Review guards

A decision may only be applied when:

- resolver review exists
- review belongs to current tenant/orgUnit scope as required by repo contracts
- review is not already resolved/dismissed unless idempotent reapply is explicitly supported
- required actor identity is present
- required target/source references are present for that action

## 9.2 Action-specific validation

### `merge_people`
Requires:
- source person
- target person
- source != target

### `confirm_existing_person`
Requires:
- selected existing person id

### `confirm_new_person`
Requires:
- confirmed provisional/new person id or review-bound provisional reference

### `reassign_contact_point`
Requires:
- contact point id
- target person id

### `link_without_merge`
Requires:
- link target person/contact context sufficient to persist association

### `mark_shared_contact`
Requires:
- evidence/candidate context sufficient to mark review outcome shared

### `dismiss_no_action`
Requires:
- dismissal reason

---

## 10. Audit Model (Required)

Every applied resolver decision must produce an audit-safe record containing at minimum:

- resolver review id
- action type
- actor id
- tenant / orgUnit context as applicable
- before/after summary or references
- source person id where applicable
- target person id where applicable
- contact point id where applicable
- applied at timestamp
- notes/reason
- linked ambiguity event id(s) if present

If the repo already persists this across existing review/resolution fields plus event logs, extend that pattern rather than inventing a parallel audit system.

---

## 11. Ambiguity Event Consumption Rules

ConnectShyft ambiguity events already exist and must not become a parallel decision system.

Slice 2A must lock this rule:

> Resolver decisions are applied in PeopleCore; ambiguity events are then marked resolved/consumed/dismissed as a consequence.

### Requirements

- each resolver review should be linkable to its originating ambiguity event(s) where such linkage exists
- resolved decisions must close the corresponding ambiguity event operationally
- dismissed reviews must close ambiguity events as dismissed/no-action
- ambiguity events must not continue surfacing as active once the review has been definitively resolved, unless explicitly reopened later by a future slice

---

## 12. Rebinding Boundary for Slice 2A

Slice 2A must **not** attempt to finish all rebinding UX or review queue behavior.

But it must lock when decision application should trigger downstream rebind-capable consequences.

### Rule

- `merge_people` → yes, downstream rebind path should fire through existing merge/rebind infrastructure
- `reassign_contact_point` → yes, where current-subject truth changes
- `confirm_existing_person` → maybe, if current operational objects are attached to a provisional/wrong person and existing repo hooks expect rebind
- `confirm_new_person` → maybe, if current attachments need normalization
- `link_without_merge` → usually no broad rebind fanout
- `mark_shared_contact` → no broad rebind fanout by default
- `dismiss_no_action` → no rebind

Final review queue semantics for `review_rebind` objects belong to Slice 2B.

---

## 13. API Boundary (Required)

Slice 2A should expose or finalize backend endpoints for:

- list resolver reviews
- get resolver review detail
- apply resolver decision
- optionally move review into `in_review` if current repo pattern supports it

### API rule

Route handlers must:
- authenticate/authorize
- validate payload
- call PeopleCore service
- return normalized result

Route handlers must not:
- embed business rules for resolver actions

---

## 14. Result Contract (Required)

`applyResolverDecision(...)` should return a normalized result sufficient for current web surfaces and downstream systems, such as:

```ts
type ResolverDecisionResult = {
  reviewId: string;
  status: 'resolved' | 'dismissed';
  action: ResolverActionType;
  affectedPersonIds: string[];
  affectedContactPointIds: string[];
  ambiguityEventIds: string[];
  mergeApplied: boolean;
  rebindTriggered: boolean;
};
```

Exact field naming may follow existing contracts, but the semantic payload must exist.

---

## 15. Tests (Required)

### Unit tests

- each action type validates required inputs correctly
- invalid lifecycle transitions are rejected
- resolved reviews cannot be mutated again unless explicitly idempotent
- `merge_people` rejects identical source/target
- `dismiss_no_action` requires reason
- action dispatch calls the correct downstream service paths

### Integration tests

- ambiguous review resolves via `confirm_existing_person`
- provisional review resolves via `confirm_new_person`
- merge review invokes PeopleCore merge and publishes expected merge consequence
- reassign decision updates contact-point association correctly
- shared-contact decision resolves review without exclusive reassignment
- dismiss decision closes review and ambiguity event without identity mutation
- ambiguity event is consumed/closed after decision
- rebind-capable actions trigger existing downstream hooks where expected

### Regression / characterization

- existing `canonical | provisional | resolver_required` resolution flow remains intact
- existing `createResolverReview`, `getResolverReview`, `listResolverReviews`, and `mergePerson` flows are preserved and extended, not replaced
- current ConnectShyft ambiguity-event routes remain compatible

---

## 16. Explicit Non-Goals

The following are out of scope for Slice 2A:

- resolver dashboard UX completion
- People / ConnectShyft visual polish
- full rebinding manual-review queue experience
- shell integration
- feature-flag UX
- case creation hooks
- new notification channels
- AI-assisted resolution suggestions

---

## 17. Done Criteria

Slice 2A is done only when:

- resolver action set is explicit and backend-authoritative
- PeopleCore exposes one authoritative resolver-decision application path
- each action has locked mutation semantics
- resolver reviews transition through valid lifecycle states only
- ambiguity events are consumed/closed as a consequence of decision application
- audit-safe persistence exists for every decision
- merge/reassign actions trigger the correct existing downstream consequence paths
- backend API contracts are stable enough for Slice 2B surfaces to consume without inventing logic

---

## 18. Checkpoint Shape Recommendation

Slice 2A should likely be broken into these checkpoints:

1. **Action types + lifecycle lock**
   - contracts
   - validation
   - status transitions

2. **Decision application service**
   - `applyResolverDecision(...)`
   - action dispatch
   - consequence matrix

3. **Ambiguity-event consumption + audit persistence**
   - close/resolve/dismiss ambiguity events
   - persist audit-safe result trail

4. **Route/API hardening + tests**
   - thin routes
   - integration coverage
   - compatibility with existing web consumers

That is the recommended order unless repo specifics force 3 instead of 4 checkpoints.

---

## 19. Locked Recommendation

Proceed next with:

> **Prep Step 2A — Checkpoint 1: Resolver action set, lifecycle states, and validation lock**

Do not jump to resolver UI or shell work before this backbone is complete.

---

## 20. Implementation Intent

This is a **completion and hardening slice**, not a redesign.

Use the repo's existing PeopleCore, ConnectShyft ambiguity-event, merge, and rebind infrastructure as the backbone. Extend and lock it. Do not introduce a second resolver system, parallel audit model, or UI-owned decision logic.
