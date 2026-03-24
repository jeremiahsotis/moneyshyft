# CHECKPOINT 4 — ROUTE/API HARDENING, INTEGRATION COVERAGE, AND WEB-CONSUMER COMPATIBILITY
**Slice:** Prep Step 2A  
**Objective:** Harden resolver and ambiguity-related route/API surfaces so they delegate cleanly to the backend decision backbone, preserve compatibility with existing web consumers, and have integration coverage that proves the Slice 2A contract is stable

## 1. Goal

Finalize the route/API boundary for Slice 2A so that:

- resolver-related routes are thin and backend-authoritative
- transport validation is consistent and contract-backed
- existing web consumers can continue to list, fetch, and act on resolver/ambiguity states without inventing business logic
- integration coverage proves the full Slice 2A path works end-to-end
- Slice 2B can build operational resolver/rebind surfaces on top of stable API behavior

This checkpoint does **not** build resolver UI, shell context, or review-rebind queue UX. It locks the API contract and proves it.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
apps/connectshyft-api/src/modules/peoplecore/store.ts
apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts
apps/connectshyft-web/src/views/Shell/PeopleView.vue
apps/connectshyft-web/src/features/connectshyft/identityResolution.ts
apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/people/events.ts
libs/contracts/src/connectshyft.ts
```

Include adjacent API/contract files only if required to keep transport typing single-sourced. Do not modify unrelated web/UI modules beyond compatibility-preserving contract consumption.

---

## 3. Required Changes

### 3.1 Route handlers must be fully thin

For resolver-review and ambiguity-event related endpoints in `connectshyft.ts`:

- authenticate/authorize
- validate transport payloads against shared contracts
- call PeopleCore service / established hook layer
- return normalized results/errors

Route handlers must not embed:
- action dispatch
- lifecycle rules
- merge semantics
- ambiguity-consumption semantics
- rebind policy decisions

Any remaining route-local business logic in these areas must be removed or delegated.

### 3.2 Lock transport shapes for current web consumers

The API boundary must expose stable transport shapes for at least:

- list resolver reviews
- get resolver review detail
- apply resolver decision
- list ambiguity events
- get ambiguity event detail

Exact endpoint names may follow existing repo routes, but transport payloads must be stable and typed through shared contracts.

### 3.3 Normalize API responses

Ensure resolver- and ambiguity-related responses return normalized, contract-backed fields that current web consumers can rely on without ad hoc interpretation.

At minimum, response shapes must convey:

- review status
- action / resolution outcome
- ambiguity-event active vs terminal state
- actor/timestamp or equivalent stable references where already expected
- affected person/contact context needed by current People and thread-detail views
- whether an item is still actionable vs already resolved/dismissed

Do not require frontend code to infer active-vs-terminal truth from notes/debug strings.

### 3.4 Preserve existing web-consumer compatibility

`PeopleView.vue`, `identityResolution.ts`, and `ConnectShyftThreadDetailView.vue` must remain compatible with the backend contract after Slice 2A.

Required rule:
- if a current web consumer expects provisional or resolver-required states, the API must still supply them or a deliberate, contract-backed equivalent
- if a current web consumer reads ambiguity/review state, that state must remain stable and typed
- compatibility fixes in web code are allowed only to consume the improved stable contract, not to reinvent backend business logic

### 3.5 Error normalization

Resolver-related route/API failures must return normalized, non-leaky errors for cases such as:

- invalid action payload
- invalid lifecycle transition
- missing review
- terminal review mutation attempt
- unauthorized access
- invalid ambiguity-event reference

Do not leak stack traces, internal SQL, or engineering-only phrasing to the web consumer.

### 3.6 Integration coverage must prove end-to-end behavior

Add or finalize integration tests proving that the route/API layer plus service layer together support the Slice 2A backbone.

Required integration coverage must include:
- review listing/detail remains available
- valid resolver decision request succeeds and returns normalized result
- invalid resolver decision request is rejected with normalized error
- terminal review mutation is rejected
- ambiguity events are consumed/dismissed and no longer appear in active list by default
- detail/history retrieval still returns terminal ambiguity items
- existing web-facing state expectations remain compatible

### 3.7 Contract drift must be eliminated

If the route layer, service layer, and web consumers currently use mismatched strings or partial aliases for review status/action/outcome semantics, this checkpoint must converge them onto the shared contract truth.

Allowed:
- deliberate adapter/mapping layer if needed for compatibility

Not allowed:
- multiple independent semantic vocabularies continuing in active use

### 3.8 Keep Slice 2A boundary intact

This checkpoint must not start Slice 2B by building:

- resolver dashboard UX
- review-rebind queue UI
- post-resolution shell context
- advanced person-detail workflow redesign

Only stabilize the API boundary those later surfaces will consume.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- build new resolver UI flows beyond compatibility-preserving adjustments
- redesign PeopleView or ThreadDetailView layout
- redesign shell/navigation
- finish review_rebind queue handling
- redesign merge/rebind internals
- add notifications
- change telephony/voicemail behavior
- create frontend-owned decision semantics

---

## 5. Tests Required

### Unit / Contract-focused

- route payload validation rejects malformed resolver decision input
- normalized response mapping preserves shared contract semantics
- normalized error mapping hides internal implementation details

### Integration

- list resolver reviews route returns contract-backed review states
- get resolver review detail route returns stable review/action/outcome fields
- apply resolver decision route delegates to service and returns normalized result
- apply invalid resolver decision returns normalized validation/lifecycle error
- list ambiguity events route excludes terminal items by default where expected
- ambiguity detail route can still return terminal consumed/dismissed records
- existing People/thread-related consumers can still read resolver/provisional/ambiguity state without ad hoc inference

### Regression / Characterization

- current web consumers still compile/type-check against the updated contracts
- current provisional / resolver-required surfaces still receive the state they need
- no route-local resolver business logic remains in active use

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- resolver and ambiguity routes are thin and backend-authoritative
- transport shapes are stable and contract-backed
- normalized results/errors exist for resolver decision flows
- existing web consumers remain compatible with the locked Slice 2A contract
- integration coverage proves the end-to-end resolver-decision and ambiguity-consumption path works
- no frontend consumer has to invent backend semantics from raw strings or notes

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft): harden resolver routes and prove web-consumer compatibility
```

---

## 8. Verification Commands

Run:

```bash
rg "resolver|required|ambiguity|applyResolverDecision|merge_people|dismiss_no_action|mark_shared_contact|reassign_contact_point" apps/connectshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-web libs/contracts
```

Verify route, web, and contract layers are aligned on one semantic vocabulary.

Run:

```bash
rg "throw new|Error\(|statusCode|validation|unauthorized|not found|terminal review|invalid transition" apps/connectshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-api/src/modules/peoplecore
```

Verify resolver-related failures are normalized and not leaking implementation detail.

Run:

```bash
rg "PeopleView|identityResolution|ConnectShyftThreadDetailView|resolver_required|provisional|ambiguity" apps/connectshyft-web
```

Verify current web consumers still have stable contract-backed inputs.

---

## 9. Outcome

After this checkpoint:

- Slice 2A is complete
- resolver decisions, ambiguity outcomes, and API behavior are stable end-to-end
- Slice 2B can safely build rebind/review operational surfaces on top of a locked backend contract
