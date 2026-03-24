# CHECKPOINT 1 — RESOLVER ACTION SET, LIFECYCLE STATES, AND VALIDATION LOCK
**Slice:** Prep Step 2A  
**Objective:** Lock the canonical resolver action set, resolver review lifecycle rules, and action-specific validation so backend decision semantics are explicit and enforceable

## 1. Goal

Establish a single authoritative backend definition for:

- which resolver actions exist in MVP
- what lifecycle states resolver reviews may move through
- what validations are required before a resolver decision may be applied
- what action payload fields are mandatory for each action
- what transitions are valid vs invalid

This checkpoint does **not** implement full decision consequences yet. It locks the action and lifecycle backbone so later checkpoints can apply decisions without improvising semantics.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts
apps/connectshyft-api/src/modules/peoplecore/store.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/people/events.ts
libs/contracts/src/connectshyft.ts
```

If action or review-state types are defined in adjacent shared contract files, include only those exact files needed to keep type truth single-sourced. Do not modify unrelated contracts.

---

## 3. Required Changes

### 3.1 Lock the canonical resolver action type set

In the shared People resolver-review contract, define or finalize the authoritative action set for MVP:

```ts
type ResolverActionType =
  | 'confirm_existing_person'
  | 'confirm_new_person'
  | 'merge_people'
  | 'link_without_merge'
  | 'mark_shared_contact'
  | 'reassign_contact_point'
  | 'dismiss_no_action';
```

If the repo already uses an enum or string-literal object, preserve the existing style while locking the same semantics.

No extra MVP action types may remain in active use unless they alias directly to one of the above semantic actions.

### 3.2 Lock resolver review lifecycle states

Preserve contract breadth where already present, but explicitly lock MVP-valid lifecycle semantics.

Required active MVP path:

```text
pending -> in_review -> resolved
pending -> dismissed
in_review -> dismissed
```

Allowed in contract but not required for rich MVP UI:
- `queued`
- `waiting_for_more_info`

If the repo currently represents resolution as multiple terminal statuses instead of a generic `resolved`, preserve that representation, but the lifecycle must still enforce:
- pending/in-progress states
- terminal resolved states
- terminal dismissed state

### 3.3 Add authoritative lifecycle guards

Add or finalize a single validation path in PeopleCore service layer that can answer:

```ts
assertResolverReviewTransitionAllowed(currentStatus, nextStatus): void
```

This must reject:
- terminal -> active transitions
- invalid skips not allowed by the checkpoint
- re-resolving an already resolved review unless explicit idempotent replay is intentionally supported

### 3.4 Add authoritative action-payload validation

Add or finalize a validation path such as:

```ts
validateResolverDecisionInput(input): ValidatedResolverDecisionInput
```

This validation must enforce action-specific required fields.

#### Required validations by action

**confirm_existing_person**
- requires selected existing person id

**confirm_new_person**
- requires confirmed provisional/new person id or resolvable provisional reference

**merge_people**
- requires source person id
- requires target person id
- source and target must differ

**link_without_merge**
- requires sufficient target/link context to persist association
- must not require merge ids

**mark_shared_contact**
- requires sufficient review/candidate context to resolve as shared-contact

**reassign_contact_point**
- requires contact point id
- requires target person id

**dismiss_no_action**
- requires dismissal reason

### 3.5 Lock review terminality rules

Once a review is:
- resolved
- dismissed

it must be treated as terminal for normal mutation.

Allowed exception:
- explicit idempotent replay of the same final action may be tolerated if the current repo pattern already needs safe retry behavior.

But:
- resolved -> different resolved action is forbidden
- dismissed -> resolved is forbidden in MVP
- resolved -> dismissed is forbidden

### 3.6 Lock outcome typing

Add or finalize typed result/status fields in the resolver-review contract so later checkpoints do not invent meanings ad hoc.

At minimum, the shared contract must support:
- action type
- review status
- resolution type / terminal outcome
- risk flags / confidence band where already present
- source/target references where applicable

Do not allow route-local ad hoc string values that bypass the shared contract.

### 3.7 Ensure contact-point identity resolution output remains compatible

`contactPointIdentityResolution.ts` must continue producing the existing high-level resolution outcomes:

- `canonical`
- `provisional`
- `resolver_required`

This checkpoint must not break that flow. Instead, it should make `resolver_required` downstream semantics explicit by anchoring them to the locked resolver action/lifecycle contracts.

### 3.8 Route handlers must not define business semantics

In `connectshyft.ts` and any relevant PeopleCore-facing route logic:

- remove or avoid inline action-name validation
- remove or avoid inline review-lifecycle rules
- delegate action/lifecycle validation to shared contract + PeopleCore validation/service layer

Thin routes only:
- authenticate/authorize
- validate transport shape
- call service
- return normalized errors/results

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- implement full action consequences yet
- change merge/rebind downstream behavior yet
- redesign ambiguity-event consumption yet
- build resolver dashboard UI
- change shell/navigation
- add notifications
- introduce new action types for convenience
- redesign existing contact-point identity resolution outcomes

---

## 5. Tests Required

### Unit

- each valid action type is accepted
- unknown action types are rejected
- lifecycle guards allow valid transitions
- lifecycle guards reject invalid transitions
- terminal reviews reject mutation
- `merge_people` rejects identical source/target
- `dismiss_no_action` requires reason
- each action enforces its required fields

### Integration

- resolver-required review can move from pending to in_review
- resolver-required review can move to valid terminal resolution state
- already-resolved review cannot be changed to a different outcome
- dismissed review cannot be resolved later
- route layer accepts valid contract-backed actions and rejects invalid ones via service validation

### Regression / Characterization

- current `canonical | provisional | resolver_required` identity-resolution flow still works
- current review creation/list/get flows remain compatible with the locked contract
- existing web consumers that read review status/action types remain type-compatible or receive deliberate mapped aliases

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- one canonical resolver action set exists in shared contract truth
- one canonical lifecycle validation path exists in backend service logic
- action-specific required fields are enforced centrally
- terminal review rules are enforced
- route handlers no longer own resolver business semantics
- existing identity-resolution outcomes remain intact and compatible

---

## 7. Commit Boundary

Single commit:

```text
feat(peoplecore): lock resolver action set, lifecycle states, and validation rules
```

---

## 8. Verification Commands

Run:

```bash
rg "confirm_existing_person|confirm_new_person|merge_people|link_without_merge|mark_shared_contact|reassign_contact_point|dismiss_no_action" apps libs
```

Verify there is one canonical shared action set and no drifting route-local variants.

Run:

```bash
rg "pending|queued|in_review|waiting_for_more_info|dismissed|resolved" apps libs/contracts
```

Verify lifecycle states and usage are consistent with the locked model.

Run:

```bash
rg "validateResolverDecisionInput|assertResolverReviewTransitionAllowed|resolver.*transition|review.*transition" apps/connectshyft-api libs
```

Verify central validation/lifecycle guards exist.

---

## 9. Outcome

After this checkpoint:

- resolver action semantics are no longer implicit
- lifecycle rules are explicit and enforceable
- downstream checkpoints can implement decision consequences safely
- frontend/UI work no longer needs to invent backend meanings
