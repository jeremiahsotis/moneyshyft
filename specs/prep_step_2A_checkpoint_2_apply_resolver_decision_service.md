# CHECKPOINT 2 — AUTHORITATIVE `applyResolverDecision(...)` SERVICE, ACTION DISPATCH, AND CONSEQUENCE MATRIX
**Slice:** Prep Step 2A  
**Objective:** Implement one authoritative PeopleCore decision-application path that dispatches resolver actions and applies the correct backend consequences without route-owned business logic

## 1. Goal

Create or finalize a single backend entry point that applies resolver decisions in a deterministic, auditable, contract-backed way so that:

- every resolver decision flows through one authoritative service path
- action dispatch is explicit and typed
- each action triggers the correct PeopleCore consequences
- route handlers stay thin
- downstream slices can rely on stable backend outcomes without inventing semantics

This checkpoint does **not** finish ambiguity-event consumption audit closure or resolver UI surfaces. It finishes the central decision engine.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/peoplecore/service.ts
apps/connectshyft-api/src/modules/peoplecore/store.ts
apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts
apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts
apps/connectshyft-api/src/modules/connectshyft/personRebind.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/people/events.ts
libs/contracts/src/connectshyft.ts
```

Include only adjacent files required to keep decision typing single-sourced. Do not modify unrelated modules.

---

## 3. Required Changes

### 3.1 Add one authoritative service entry point

In PeopleCore service layer, add or finalize:

```ts
applyResolverDecision(input): ResolverDecisionResult
```

This is the only approved business-logic entry point for applying resolver decisions.

It must own:
- review retrieval
- guard checks
- action validation (may call Checkpoint 1 validation helpers)
- action dispatch
- PeopleCore mutation
- merge invocation where applicable
- downstream consequence triggering where already required by repo contracts
- normalized result construction

### 3.2 Thin route delegation only

In `connectshyft.ts` and any resolver-related route surfaces:

- authenticate/authorize
- validate transport shape
- call `applyResolverDecision(...)`
- return normalized result

Route handlers must not embed:
- merge semantics
- reassignment semantics
- shared-contact semantics
- dismiss semantics
- action-specific field requirements

### 3.3 Lock action dispatch matrix

`applyResolverDecision(...)` must dispatch explicitly by canonical action type.

Required conceptual branches:

```ts
switch (input.action) {
  case 'confirm_existing_person':
  case 'confirm_new_person':
  case 'merge_people':
  case 'link_without_merge':
  case 'mark_shared_contact':
  case 'reassign_contact_point':
  case 'dismiss_no_action':
}
```

No generic “best effort” action fallback is allowed.

### 3.4 Action consequences must be explicit

#### `confirm_existing_person`
Must:
- resolve review against selected existing person
- confirm or normalize contact-point association if needed
- produce normalized result showing affected person/contact-point ids
- trigger downstream rebind only where existing repo hooks require it

Must not:
- invoke merge

#### `confirm_new_person`
Must:
- confirm the provisional/new person as the correct person
- preserve distinct identity
- keep or normalize contact-point association to confirmed person
- return normalized result

Must not:
- merge into another person

#### `merge_people`
Must:
- invoke existing PeopleCore merge path, not invent a second merge implementation
- publish/propagate existing merge consequences through the repo’s established mechanism
- return normalized result indicating merge occurred
- preserve current merge/rebind contracts

Must not:
- bypass existing merge infrastructure

#### `link_without_merge`
Must:
- persist or confirm linkage needed for operational continuity
- keep distinct people distinct
- return normalized result

Must not:
- collapse persons
- invoke merge

#### `mark_shared_contact`
Must:
- persist explicit shared-contact review outcome
- return normalized result
- avoid forced exclusive ownership

Must not:
- merge or reassign purely to remove ambiguity

#### `reassign_contact_point`
Must:
- reassign the relevant contact-point truth to the selected person
- return normalized result
- trigger downstream rebind only where current-subject truth should follow that reassignment

Must not:
- implicitly merge persons

#### `dismiss_no_action`
Must:
- close review as dismissed/no-action
- return normalized result
- leave identity truth unchanged

Must not:
- mutate person/contact-point truth

### 3.5 Normalize result contract

The service must return a stable result shape sufficient for downstream consumers.

Required semantic payload:

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

Exact field names may follow current contract style, but the semantic information must exist and be stable.

### 3.6 Preserve current identity-resolution outputs

`contactPointIdentityResolution.ts` must remain compatible with existing:
- `canonical`
- `provisional`
- `resolver_required`

This checkpoint may wire decision consequences downstream of those states, but must not redesign detection flow.

### 3.7 Downstream consequence triggering boundary

This checkpoint must trigger existing downstream hooks where the repo already expects them, but must not finish Slice 2B review-queue UX.

Required rule:
- `merge_people` → yes, use existing merge/rebind/event path
- `reassign_contact_point` → yes where current-subject truth changes
- `confirm_existing_person` / `confirm_new_person` → trigger only if current repo hooks already require normalization/rebind consequence
- `link_without_merge` → no broad rebind fanout by default
- `mark_shared_contact` → no broad rebind fanout by default
- `dismiss_no_action` → no rebind

### 3.8 Idempotency / terminal review safety

If `applyResolverDecision(...)` is called on a terminal review:

- reject mutation unless explicit safe replay of the exact same terminal result is already required by current repo patterns
- never allow one terminal outcome to be replaced with a different outcome

### 3.9 Store-layer responsibilities must stay narrow

`store.ts` may support:
- fetch review
- update review status/outcome fields
- persist linkage/reassignment fields
- invoke existing merge persistence path if currently store-backed

But store layer must not become the owner of cross-action orchestration logic. That belongs in service layer.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- finish ambiguity-event consumption/audit closure yet
- build resolver dashboard/list/detail UI
- redesign personRebind fanout behavior
- redesign merge internals
- change shell/navigation
- add notification behavior
- create a second resolver-decision system in ConnectShyft

---

## 5. Tests Required

### Unit

- `applyResolverDecision(...)` dispatches correctly for each action
- each action returns normalized result with expected flags
- terminal reviews reject incompatible mutation
- `merge_people` uses existing merge path
- `dismiss_no_action` returns non-mutating result
- actions that should not merge never call merge path
- actions that should not broadly rebind do not trigger rebind flag

### Integration

- apply `confirm_existing_person` against a resolver review and verify review resolution + contact-point consequence
- apply `confirm_new_person` and verify distinct person preserved
- apply `merge_people` and verify existing merge path + merge result flag
- apply `link_without_merge` and verify no merge occurs
- apply `mark_shared_contact` and verify shared-contact outcome without exclusive reassignment
- apply `reassign_contact_point` and verify reassignment consequence
- apply `dismiss_no_action` and verify identity truth unchanged
- route layer delegates to service and returns normalized result

### Regression / Characterization

- existing `createResolverReview`, `getResolverReview`, `listResolverReviews`, and `mergePerson` remain functional
- current ConnectShyft identity hooks continue working with the new decision result contract
- existing identity-resolution detection flow remains intact

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- one authoritative `applyResolverDecision(...)` service exists
- route handlers delegate to it instead of owning action semantics
- all seven canonical actions dispatch through explicit branches
- each action has locked backend consequences
- normalized result contract exists and is stable
- merge actions use the existing merge path, not a parallel implementation
- terminal review safety is enforced

---

## 7. Commit Boundary

Single commit:

```text
feat(peoplecore): add authoritative resolver decision service and action dispatch
```

---

## 8. Verification Commands

Run:

```bash
rg "applyResolverDecision|ResolverDecisionResult|switch \(input.action\)|confirm_existing_person|confirm_new_person|merge_people|link_without_merge|mark_shared_contact|reassign_contact_point|dismiss_no_action" apps libs
```

Verify the authoritative service path and explicit action branches exist.

Run:

```bash
rg "mergePerson|merge_people|reassign_contact_point|mark_shared_contact|link_without_merge|dismiss_no_action" apps/connectshyft-api/src/modules/peoplecore apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

Verify action consequences route through service instead of route-local logic.

Run:

```bash
rg "createResolverReview|getResolverReview|listResolverReviews|mergePerson" apps/connectshyft-api/src/modules/peoplecore
```

Verify existing PeopleCore flows remain present.

---

## 9. Outcome

After this checkpoint:

- resolver decisions have one authoritative backend application path
- action semantics are no longer scattered across routes or consumers
- downstream slices can safely close ambiguity events and finish rebinding/surfaces on top of a stable decision backbone
