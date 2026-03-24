# CHECKPOINT 3 — AMBIGUITY-EVENT CONSUMPTION AND AUDIT-SAFE PERSISTENCE OF RESOLVER OUTCOMES
**Slice:** Prep Step 2A  
**Objective:** Ensure resolver decisions close or dismiss ConnectShyft ambiguity events consistently and leave an audit-safe, backend-authoritative outcome trail

## 1. Goal

Finalize the boundary between PeopleCore resolver decisions and ConnectShyft ambiguity events so that:

- resolver decisions consume, resolve, or dismiss linked ambiguity events deterministically
- ambiguity events stop surfacing as active once a definitive resolver outcome has been applied
- every resolver outcome leaves an audit-safe persistence trail
- decision history is backend-authoritative and not dependent on frontend interpretation
- downstream slices can build resolver surfaces against stable review + ambiguity outcome truth

This checkpoint does **not** build resolver UI or complete rebinding review UX. It closes the decision-to-operational-outcome loop.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts
apps/connectshyft-api/src/modules/peoplecore/service.ts
apps/connectshyft-api/src/modules/peoplecore/store.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
libs/contracts/src/people/events.ts
libs/contracts/src/people/resolver-review.ts
libs/contracts/src/connectshyft.ts
```

Include adjacent audit/result contract files only if required to keep outcome truth single-sourced. Do not modify unrelated modules.

---

## 3. Required Changes

### 3.1 Lock the consumption rule

Resolver decisions are applied in PeopleCore. Ambiguity-event consumption happens as a consequence of that decision.

Required rule:

- a resolved resolver decision must close or mark consumed all linked active ambiguity events for that review context
- a dismissed resolver review must close linked active ambiguity events as dismissed/no-action
- ambiguity events must not remain active after a definitive review outcome unless explicitly reopened in a later slice

The ambiguity-event store/module must not become a parallel decision engine.

### 3.2 Link resolver outcomes to ambiguity events explicitly

Where linkage already exists, preserve and strengthen it. Where the current repo only relies on implicit linkage, finalize an explicit linkage path sufficient to answer:

- which ambiguity event(s) were resolved by this review outcome?
- which resolver review consumed this ambiguity event?
- was the ambiguity event resolved, dismissed, or otherwise closed?
- when and by whom?

Exact field names may follow existing repo conventions, but the semantic linkage must be queryable and durable.

### 3.3 Add or finalize one ambiguity-consumption path

Add/finalize a service/store path such as:

```ts
consumeAmbiguityEventsForResolverOutcome(input): AmbiguityConsumptionResult
```

This path must:
- locate linked active ambiguity events
- transition them to the correct terminal operational state
- persist who/when/why they were consumed
- be safe to call repeatedly for the same review outcome without reopening or duplicating consequences

### 3.4 Distinguish resolved vs dismissed consumption

Consumption semantics must differ by resolver outcome:

#### Resolved decision
Use for:
- confirm_existing_person
- confirm_new_person
- merge_people
- link_without_merge
- mark_shared_contact
- reassign_contact_point

Required ambiguity-event effect:
- ambiguity event closes as resolved/consumed
- active operational surfacing stops
- audit trail records linked review/action

#### Dismissed decision
Use for:
- dismiss_no_action

Required ambiguity-event effect:
- ambiguity event closes as dismissed/no-action
- active operational surfacing stops
- audit trail records dismissal reason and linked review

### 3.5 Audit-safe persistence is mandatory

Every resolver outcome must leave a durable trail sufficient to reconstruct:

- review id
- ambiguity event id(s)
- action type
- terminal review status
- actor id
- timestamp
- reason/notes
- source/target person ids where applicable
- contact point id where applicable

If the repo already stores parts of this across resolver-review fields, PeopleCore events, and ambiguity-event records, extend that pattern. Do not invent a separate shadow audit system unless absolutely required.

### 3.6 Hook this into `applyResolverDecision(...)`

Checkpoint 2 locked the authoritative decision service. This checkpoint must ensure that successful terminal review outcomes trigger ambiguity-event consumption through one controlled path.

Required rule:
- routes do not call ambiguity-event consumption directly
- PeopleCore decision service or the established PeopleCore-to-ConnectShyft hook layer triggers it after decision application succeeds

### 3.7 Idempotency and terminality rules

If the same terminal resolver outcome is replayed safely:

- ambiguity-event consumption must be idempotent
- already-consumed events must remain terminal
- no duplicate audit side effects should be created unless the existing repo uses append-only audit logs that intentionally record safe replay attempts

Forbidden:
- consumed ambiguity event reopens because of replay
- dismissed ambiguity event becomes resolved because of replay
- resolved ambiguity event is “consumed again” in a way that creates a conflicting operational state

### 3.8 Route/list/detail compatibility

Existing ConnectShyft routes that list or fetch ambiguity events must continue to behave sensibly once events are consumed:

- active lists should exclude terminally consumed/dismissed items unless explicitly asked for historical status
- detail routes should still be able to return the record with terminal outcome state
- no frontend should need to infer whether an event is still actionable based on ad hoc string logic

### 3.9 Outcome typing must be stable

Shared contracts must support enough typed outcome truth that later slices can build resolver surfaces without inventing meaning ad hoc.

At minimum, the contracts in scope must support:
- active vs terminal ambiguity-event status
- review outcome linkage
- dismissed vs resolved closure semantics
- actor/timestamp fields or stable references to those fields

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- build resolver dashboard/list/detail UI
- redesign applyResolverDecision ownership
- redesign merge/rebind infrastructure
- complete review_rebind queue UX
- add new notification channels
- change shell/navigation
- create a second audit subsystem unrelated to existing review/event persistence

---

## 5. Tests Required

### Unit

- resolved resolver outcome consumes linked active ambiguity events
- dismissed resolver outcome closes linked ambiguity events as dismissed/no-action
- repeated consumption call is idempotent
- active ambiguity-event query excludes terminal consumed/dismissed events where appropriate
- detail retrieval still returns terminal event with outcome linkage
- audit-safe outcome fields are persisted or linked correctly

### Integration

- apply `confirm_existing_person` and verify linked ambiguity event becomes resolved/consumed
- apply `merge_people` and verify linked ambiguity event becomes resolved/consumed
- apply `dismiss_no_action` and verify linked ambiguity event becomes dismissed/no-action
- replay the same terminal resolver outcome and verify no conflicting ambiguity state change occurs
- route layer continues to list only active ambiguity events by default while preserving detail/history access

### Regression / Characterization

- existing ambiguity-event creation flow remains intact
- existing resolver review creation/list/get flows remain intact
- existing ConnectShyft identity hooks remain compatible with terminal ambiguity-event states
- no frontend consumer is forced to infer active-vs-terminal semantics from raw notes/debug strings

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- successful terminal resolver outcomes consume or dismiss linked ambiguity events through one controlled backend path
- ambiguity events no longer remain operationally active after definitive review outcomes
- audit-safe persistence exists for the decision-to-ambiguity closure relationship
- replay of the same terminal outcome is safe and non-conflicting
- existing ambiguity-event routes remain compatible for active lists and terminal detail/history access

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft): consume ambiguity events and persist audit-safe resolver outcomes
```

---

## 8. Verification Commands

Run:

```bash
rg "ambiguity|consumeAmbiguity|resolver outcome|dismissed|resolved|consumed" apps/connectshyft-api/src/modules/connectshyft apps/connectshyft-api/src/modules/peoplecore libs/contracts
```

Verify one controlled ambiguity-consumption path and stable outcome typing exist.

Run:

```bash
rg "applyResolverDecision|peoplecoreIdentityHooks|ambiguityEvents" apps/connectshyft-api
```

Verify decision application and ambiguity consumption are linked through service/hook layers, not route-local logic.

Run:

```bash
rg "list.*ambiguity|get.*ambiguity|review.*ambiguity|active.*ambiguity|dismissed.*ambiguity|resolved.*ambiguity" apps/connectshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-api/src/modules/connectshyft
```

Verify active-list vs terminal-detail compatibility remains intact.

---

## 9. Outcome

After this checkpoint:

- resolver outcomes and ambiguity events are operationally synchronized
- ambiguity no longer lingers as active after definitive decisions
- later slices can build resolver/rebind surfaces on top of stable backend truth rather than inferred behavior
