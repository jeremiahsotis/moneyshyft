# CHECKPOINT 2 — REBIND POLICY COMPLETION AND `review_rebind` QUEUE ITEM CREATION
**Slice:** Prep Step 2B  
**Objective:** Finalize backend-authoritative `auto_rebind` vs `review_rebind` behavior, enforce thread-following-contact-point reassignment, and turn review-class rebind consequences into first-class Resolver Queue work

## 1. Goal

Complete the operational rebind model so that:

- `auto_rebind` vs `review_rebind` is explicit, deterministic, and backend-enforced
- existing threads always follow contact-point reassignment
- review-class rebind consequences become visible, claimable `rebind_review` queue items
- rebind work no longer disappears into backend-only history when human review is required
- Slice 2B can later build PeopleView and contextual thread UI on top of stable rebind truth

This checkpoint does **not** build queue UI or thread banners. It finishes the backend consequence model that those surfaces will consume.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/personRebind.ts
apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts
apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
apps/connectshyft-api/src/modules/peoplecore/store.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
libs/contracts/src/connectshyft.ts
libs/contracts/src/people/events.ts
libs/contracts/src/people/resolver-review.ts
```

Include adjacent schema/contract/store files only if required to persist queue-backed rebind-review state or keep type truth single-sourced. Do not modify unrelated UI modules in this checkpoint.

---

## 3. Required Changes

### 3.1 Preserve and lock the existing `rebind_class` model

The repo already has `person_rebind_history` with `rebind_class = auto | review`.

This checkpoint must preserve that model and make it operationally authoritative.

Required rule:
- `auto` means the rebind consequence may execute without human confirmation
- `review` means the rebind consequence must become queue work and remain unresolved until a resolver claims and processes it

Do not invent a second rebind classification system.

### 3.2 Existing threads must always follow contact-point reassignment

This is a locked MVP requirement.

When contact-point reassignment changes subject truth:
- existing threads must rebind to the new person/contact-point truth
- this must happen through the repo’s established `personRebind` / downstream consequence path
- this must not depend on frontend action or manual cleanup

If the current code path can classify thread rebinding as `review`, this checkpoint must narrow that behavior so existing thread-follow behavior remains guaranteed in MVP.

### 3.3 Auto-rebind must remain backend-driven

Objects whose identity should follow current operational truth may auto-rebind without queue work.

At minimum, the checkpoint must preserve or finalize auto-rebind for:
- threads
- thread subject/context bindings
- current operational conversation/contact-point associations
- already-supported telephony/conversation artifacts where repo contracts classify them as current-truth operational objects

Auto-rebind must continue to be:
- idempotent
- history-persisted
- safe on replay

### 3.4 Review-class rebinds must become queue items

When `personRebind` or downstream identity hooks produce `review`-class rebind consequences:

- create a first-class Resolver Queue item with `item_type = rebind_review`
- store enough context to let a resolver understand what must be reviewed
- ensure the item appears in active queue listing
- ensure the item participates in claim/release semantics from Checkpoint 1
- do not leave review-class rebind work as backend-only history

### 3.5 Rebind-review item creation path must be centralized

Add or finalize one controlled backend path such as:

```ts
enqueueRebindReview(input): ResolverQueueItemResult
```

This path must:
- use existing rebind-history truth as its source
- deduplicate queue creation for the same underlying review-class rebind consequence
- be safe on replay or duplicate downstream events
- avoid creating duplicate `rebind_review` items for the same unresolved consequence

### 3.6 Rebind-review queue item context must be sufficient

Each `rebind_review` item must carry or be able to resolve enough backend context for later UI/detail use, including as applicable:

- rebind history id or stable equivalent
- affected object type
- affected object id
- source person id
- target person id
- contact point id where applicable
- originating resolver review or merge/reassignment context where available
- current queue status
- claim state

Exact field names may follow repo conventions, but the semantic context must exist.

### 3.7 Review-class rebinds must remain unresolved until processed

A `review_rebind` consequence must not be treated as complete just because the history row exists.

Required rule:
- rebind history records the need for review
- queue item records operational work still pending
- only later resolver action can resolve/dismiss that review-class rebind work

This checkpoint does not finish the resolver UI/action path for processing these items, but it must ensure the work is clearly pending and queue-backed.

### 3.8 Preserve idempotency and replay safety

This checkpoint must ensure:
- repeated downstream triggers do not create duplicate `rebind_review` queue items
- replay of the same merge/reassign/decision consequence does not corrupt rebind history
- auto-rebind remains safe if invoked more than once
- queue items for review-class rebinds are created once per underlying unresolved consequence

### 3.9 Keep route handlers thin

If new route/API support is required for queue inspection or rebind-review detail compatibility, route handlers must:
- authenticate/authorize
- validate payload
- call backend service
- return normalized result

Do not put rebind classification or queue-creation semantics in routes.

### 3.10 Do not broaden review scope unnecessarily

Use current repo policy truth and the locked MVP decisions.

Required guiding rule:
- current-truth operational objects should not be forced into review if MVP explicitly requires them to auto-follow truth
- historically sensitive or semantically risky objects should remain in `review`
- do not let frontend convenience drive rebind classification

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- build PeopleView queue UI yet
- build ConnectShyft thread banners yet
- redesign the core resolver queue model from Checkpoint 1
- redesign Slice 2A decision backbone
- introduce claim timeout/expiry
- redesign merge internals
- add visible resolution-history UI
- add notification/escalation flows

---

## 5. Tests Required

### Unit

- contact-point reassignment causes existing thread rebinding through backend path
- objects classified `auto` do not create queue items
- objects classified `review` create exactly one `rebind_review` queue item
- duplicate enqueue attempts for the same review-class consequence are deduplicated
- `rebind_review` queue item carries required context fields
- auto-rebind remains idempotent on replay

### Integration

- resolver decision or reassignment that changes subject truth causes existing thread to follow the new contact-point truth
- review-class rebind consequence becomes active `rebind_review` queue work
- active queue listing includes `rebind_review` items
- repeated merge/reassign/rebind replay does not create duplicate queue items
- terminal or already-resolved review-class rebind consequences do not re-enqueue active queue work

### Regression / Characterization

- existing `person_rebind_history` persistence remains intact
- existing thread/call/voicemail/bridge rebind fanout remains compatible
- Checkpoint 1 queue semantics remain intact
- Slice 2A resolver decisions still trigger downstream consequences correctly

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- `auto_rebind` vs `review_rebind` behavior is explicit and backend-authoritative
- existing threads always follow contact-point reassignment
- review-class rebind consequences create active `rebind_review` queue items
- duplicate/replayed rebind consequences do not create duplicate queue items
- rebind history remains authoritative and is not replaced by a second ledger
- route handlers remain thin and do not own rebind policy

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft): operationalize rebind policy and enqueue review-class rebind work
```

---

## 8. Verification Commands

Run:

```bash
rg "rebind_class|auto|review|person_rebind_history|enqueueRebindReview|rebind_review" apps libs
```

Verify the repo has one authoritative rebind classification model and queue-enqueue path.

Run:

```bash
rg "thread.*rebind|rebind.*thread|contact point reassignment|reassign_contact_point|personRebind" apps/connectshyft-api
```

Verify existing threads follow contact-point reassignment through backend paths.

Run:

```bash
rg "rebind_review|claimResolverQueueItem|listResolverQueue|active queue" apps/connectshyft-api/src/modules apps/connectshyft-api/src/routes/api/v1/connectshyft.ts libs/contracts
```

Verify review-class rebind work participates in the queue model rather than remaining backend-only history.

---

## 9. Outcome

After this checkpoint:

- rebind policy is no longer implicit
- existing threads reliably follow new subject truth
- review-class rebind work becomes real queue work
- later PeopleView and thread-detail checkpoints can consume stable backend rebind state
