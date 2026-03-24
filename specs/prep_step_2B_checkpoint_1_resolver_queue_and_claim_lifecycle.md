# CHECKPOINT 1 — RESOLVER QUEUE MODEL, CLAIM/RELEASE LIFECYCLE, AND RESOLVER AUTHORITY LOCK
**Slice:** Prep Step 2B  
**Objective:** Lock the backend-authoritative Resolver Queue model, claim/release lifecycle, and tenant-admin-only resolver authority so operational resolver work is safe before UI expansion

## 1. Goal

Establish a single authoritative backend definition for:

- what a Resolver Queue item is
- which queue item types exist in MVP
- who may see, claim, release, and act on queue items
- how claim state works
- how active vs terminal queue items behave
- how identity-review and rebind-review work coexist in one queue without becoming two separate systems

This checkpoint does **not** finish rebind policy consequences, PeopleView UI, or ConnectShyft contextual banners. It locks the queue and claim model so later checkpoints can consume it safely.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
apps/connectshyft-api/src/modules/peoplecore/store.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/connectshyft.ts
```

Include adjacent contract/store files only if required to keep queue typing single-sourced. Do not modify unrelated UI modules in this checkpoint.

---

## 3. Required Changes

### 3.1 Lock one Resolver Queue with two typed item classes

The backend must support one Resolver Queue model with these typed item classes:

```ts
type ResolverQueueItemType =
  | 'identity_review'
  | 'rebind_review';
```

This is one queue system, not two separate queue implementations.

### 3.2 Define queue truth as backend-owned

Queue semantics must be defined in backend contracts/services, not inferred by frontend lists.

At minimum, queue truth must support:

- item id
- item type
- active vs terminal state
- current status
- claim state
- claimant reference
- claimed_by_current_user
- actionable vs not actionable
- person/contact/thread context as applicable

Exact field names may follow existing repo conventions, but the semantics must exist and be typed centrally.

### 3.3 Tenant-admin-only resolver authority

Only tenant admins may act as resolvers in MVP.

Required backend rule:
- non-tenant-admin users may not claim resolver queue items
- non-tenant-admin users may not release resolver queue items
- non-tenant-admin users may not apply queue-driven resolver actions

If the repo already has broader admin roles, this checkpoint must narrow effective resolver authority for queue actions to tenant admins only, without redesigning the entire role system.

### 3.4 Claim-before-action rule

A queue item must be claimed before action.

Backend must reject:
- resolving an unclaimed queue item
- dismissing an unclaimed queue item
- processing a rebind-review item without a claim

This rule applies to both queue item types:
- `identity_review`
- `rebind_review`

### 3.5 Claim exclusivity

A queue item may be claimed by only one resolver at a time.

Backend must reject:
- claiming an item already claimed by another resolver
- acting on an item claimed by another resolver
- releasing an item claimed by another resolver, unless an intentional tenant-admin override path already exists and is explicitly preserved

### 3.6 No auto-expiry on claims

Claims do not expire automatically in MVP.

Claim state remains until:
- item is resolved
- item is dismissed
- claimant explicitly releases it

This checkpoint must not introduce time-based claim expiry, auto-release, or stale-claim automation.

### 3.7 Operationalize queue status semantics

The repo already contains statuses such as:
- `queued`
- `in_review`
- `waiting_for_more_info`

This checkpoint must align queue/claim behavior with those existing contract truths instead of inventing a second state system.

Recommended operational meaning:
- `queued` = active and available / not currently being worked
- `in_review` = claimed and actively being worked
- `waiting_for_more_info` = active but blocked
- resolved/dismissed terminal states = excluded from default active queue

Exact naming may follow existing contracts, but the behavior must be explicit and backend-enforced.

### 3.8 Add or finalize authoritative queue operations

Backend must expose or finalize one controlled service path for queue operations, such as:

```ts
listResolverQueue(input): ResolverQueueListResult
claimResolverQueueItem(input): ResolverQueueItemResult
releaseResolverQueueItem(input): ResolverQueueItemResult
getResolverQueueItemDetail(input): ResolverQueueItemDetail
```

These operations must be:
- contract-backed
- role-checked
- claim-safe
- thin-route-consumable

### 3.9 Identity-review items must map to resolver review truth

For `identity_review` items:
- the queue item must map back to the canonical resolver-review record
- queue state must reflect review state, not a second parallel queue truth
- claiming/releasing must integrate with the underlying review lifecycle/state model rather than fork it

### 3.10 Rebind-review items must be first-class queue citizens

This checkpoint does not yet create all `review_rebind` items, but it must lock the queue model so `rebind_review` is a valid, first-class item type.

That means:
- shared contracts must recognize the type
- queue list/detail operations must support the type
- claim/release rules must support the type
- no frontend-only placeholder interpretation

### 3.11 Thin routes only

In `connectshyft.ts`:
- authenticate/authorize
- validate transport shape
- call backend queue service
- return normalized result

Route handlers must not own:
- claim rules
- role rules
- queue semantics
- item-type semantics

### 3.12 Active vs terminal semantics must be explicit

Default queue listing must include active work only.

Terminal work must be excluded from default active lists, but backend detail/history access may still expose it where current repo patterns already support historical access.

This checkpoint must not require frontend consumers to infer active-vs-terminal truth from loose strings or notes.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- finish review-rebind item creation logic yet
- complete rebind policy consequence wiring yet
- build PeopleView queue UI yet
- build ConnectShyft thread banners yet
- redesign resolver decision backbone from Slice 2A
- redesign role system broadly
- add claim timeout/expiry
- add notification/escalation workflows

---

## 5. Tests Required

### Unit

- tenant-admin resolver can claim unclaimed queue item
- non-tenant-admin cannot claim queue item
- claim fails when item already claimed by another resolver
- claimant can release claimed item
- non-claimant cannot release claimed item unless intentional override is explicitly preserved
- unclaimed item cannot be acted on
- queue list distinguishes active vs terminal items
- queue type contract accepts both `identity_review` and `rebind_review`

### Integration

- identity-review item appears in Resolver Queue and can be claimed/released by tenant-admin resolver
- queue routes delegate to backend service and enforce tenant-admin-only resolver authority
- active queue listing excludes terminal items by default
- queue item detail can still return terminal item where backend supports history/detail access
- role/claim errors are normalized and non-leaky

### Regression / Characterization

- Slice 2A resolver review lifecycle remains intact
- existing review list/detail flows remain compatible with queue-backed operational semantics
- no second parallel queue-state system is introduced

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- one backend-authoritative Resolver Queue model exists
- queue item types `identity_review` and `rebind_review` are recognized centrally
- only tenant admins can act as resolvers for queue work
- claim-before-action is enforced
- claim exclusivity is enforced
- no auto-expiry exists for claims
- route handlers are thin and delegate queue semantics to backend services
- active vs terminal queue behavior is explicit and contract-backed

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft): lock resolver queue model and claim lifecycle
```

---

## 8. Verification Commands

Run:

```bash
rg "identity_review|rebind_review|claimResolverQueueItem|releaseResolverQueueItem|listResolverQueue|getResolverQueueItemDetail" apps libs
```

Verify one centrally typed queue model and operation set exists.

Run:

```bash
rg "tenant admin|tenant_admin|claim|claimed_by|claimedBy|in_review|queued|waiting_for_more_info" apps/connectshyft-api libs/contracts
```

Verify role and claim semantics are centralized and consistent.

Run:

```bash
rg "resolver queue|queue item|claim|release|active|terminal|dismissed|resolved" apps/connectshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-api/src/modules
```

Verify routes stay thin and backend semantics are authoritative.

---

## 9. Outcome

After this checkpoint:

- the Resolver Queue model is backend-safe and authoritative
- tenant-admin-only claim-based resolver work is locked
- later checkpoints can add rebind queue creation and UI surfaces without inventing queue policy ad hoc
