# Slice 27 — ContactPoint Lifecycle (Codex‑Ready Implementation Brief)

## 1. OBJECTIVE

Elevate **ContactPoint** from a simple lookup key to a fully stateful identity signal.  Persist an authoritative lifecycle status on each contact point, derive status transitions from event history and link patterns, integrate the status into PeopleCore’s scoring model, and surface the state to ConnectShyft so that operators see and act on shared/stale/reassignment risks.  No other Person, Household, or thread behaviour changes in this slice.

## 2. ARCHITECTURAL DECISIONS (LOCKED)

1. **Lifecycle on ContactPoint:**  A new non‑nullable `status` column is added to `people.contact_points` with six enumerated values: `active_personal`, `active_shared_possible`, `active_shared_confirmed`, `stale`, `reassignment_suspected`, and `archived`.  The status is the sole lifecycle indicator; no additional boolean flags are permitted.  Every contact point must have exactly one status at all times.
2. **Event‑driven transitions:**  A pure function `computeContactPointStatus(events: ContactPointEvent[], links: ContactPointLink[]): ContactPointStatus` derives the current status from the ordered history of `ContactPointEvent`s and the set of current links.  Status changes are recorded in the `contact_point_events` table with event types `lifecycle_changed` and an `effectiveStatus` payload.
3. **Scoring penalties:**  PeopleCore’s deterministic identity scoring subtracts a fixed penalty based on `status` when computing candidate scores: `active_shared_possible` –20, `active_shared_confirmed` –45, `stale` –25, `reassignment_suspected` –70 (and caps band at `MEDIUM`).  The `archived` state yields a –∞ penalty (effectively disqualifying the contact point).
4. **Seam contract:**  Every PeopleCore service that resolves or scores contact points must include the contact point’s `status` in its response.  ConnectShyft must not infer status; it must consume and display the provided `status` and associated risk flags.
5. **UI indicators:**  The ConnectShyft web shell displays a shared indicator (`active_shared_possible` or `active_shared_confirmed`), a stale indicator (`stale`), and a reassignment risk indicator (`reassignment_suspected`).  These indicators trigger friction per the existing confidence band rules but do not otherwise block creation.
6. **No silent state resets:**  ContactPoint status may only change as a result of a new event (e.g. inbound/outbound activity, resolver action, manual update).  There is no scheduled job or external process that resets status silently.

## 3. EXECUTION FLOW

### 3.1 Computing and persisting status

1. **On contact point creation**
   1. Normalize the contact point value (phone/email) as currently implemented.
   2. Persist the new contact point with `status = 'active_personal'` by default.
   3. Record a `contact_point_events` row with `event_type = 'lifecycle_created'` and `effective_status = 'active_personal'`.
2. **On event capture** (any inbound/outbound activity, explicit confirmation/unconfirmation, resolver decision)
   1. Fetch all prior events for the contact point ordered by ascending `created_at_utc`.
   2. Fetch all current `ContactPointLink`s for the contact point with `is_current = true`.
   3. Call `computeContactPointStatus(events, links)` to derive the new status.
   4. If the derived status differs from the contact point’s current `status`, update `people.contact_points.status` and insert a new `contact_point_events` row with `event_type = 'lifecycle_changed'` and `effective_status = '<new_status>'`.
   5. Otherwise, record the new event normally without changing `status`.

### 3.2 Integration with scoring

1. When PeopleCore produces identity match candidates, include each candidate’s contact point status and apply the penalty defined in §2.  If the candidate has multiple contact points, apply the most severe penalty (highest negative) to the overall score.
2. After applying all additive and subtractive factors, cap the confidence band at `MEDIUM` when any candidate contact point has `status = 'reassignment_suspected'`.
3. Return the contact point status alongside the candidate’s `confidenceBand`, `score`, and `reasons`.

### 3.3 Consumption in ConnectShyft

1. When ConnectShyft calls the PeopleCore seam to resolve a contact point, it receives the contact point’s `status` in the payload.
2. The front‑end `PeopleView` and the identity resolution UI read this status and display:
   - **Shared indicator:** if `status` is `active_shared_possible` or `active_shared_confirmed`.
   - **Stale indicator:** if `status` is `stale`.
   - **Reassignment risk indicator:** if `status` is `reassignment_suspected`.
3. The indicators supplement (not replace) the existing confidence band friction.  For example, a “Low band + Shared indicator” will still allow creation but highlight that the contact point may be shared.

## 4. STATE MACHINE

The ContactPoint lifecycle is represented by the following state machine:

| Current State | Trigger Event | Conditions | Next State |
|---------------|--------------|------------|-----------|
| `active_personal` | new link added | ≥2 current links detected | `active_shared_possible` |
| `active_personal` | manual confirmation of single ownership | — | `active_personal` (no change) |
| `active_shared_possible` | explicit confirmation from both parties that the contact is shared | — | `active_shared_confirmed` |
| `active_shared_possible` | one link removed leaving exactly one current link | — | `active_personal` |
| `active_shared_confirmed` | link reduction to one current link | — | `active_personal` |
| `active_*` | no events for 180 days | — | `stale` |
| `active_*` | inbound reassignment_suspected event | — | `reassignment_suspected` |
| `reassignment_suspected` | resolver confirms ownership or merges into another person | — | `active_personal` |
| `stale` | new inbound/outbound activity | — | `active_personal` |
| any | archiving action (e.g. manual suppression or merge into archived person) | — | `archived` |

Unlisted triggers cause no state change.  If multiple triggers fire on the same timestamp, apply them in the order listed above.

## 5. DATABASE CONTRACTS

### 5.1 `people.contact_points` (altered)

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | **PK** |
| `tenant_id` | TEXT | **FK** → `tenants.id` |
| `value` | TEXT | normalized contact string |
| `type` | TEXT | `phone` or `email` |
| `status` | TEXT | **NOT NULL**, one of: `active_personal`, `active_shared_possible`, `active_shared_confirmed`, `stale`, `reassignment_suspected`, `archived` |
| `created_at_utc` | TIMESTAMPTZ | defaults to `NOW()` |
| `updated_at_utc` | TIMESTAMPTZ | defaults to `NOW()` on insert, updated on change |

New check constraint `people_contact_points_status_ck` enforces valid status values.  A migration `20260328100000_add_status_to_people_contact_points.ts` adds this column and sets all existing rows to `'active_personal'`.

### 5.2 `people.contact_point_events` (already exists)

Add an enumerated `event_type` value `lifecycle_changed`.  When `event_type = 'lifecycle_changed'`, the `metadata` JSON must include `{ "effectiveStatus": "<new_status>" }`.  A migration `20260328100500_add_lifecycle_changed_event_type.ts` inserts the new enum value.

No other table changes are required.

## 6. SERVICE LAYER (STRICT)

### 6.1 PeopleCore store/service additions

Located in `apps/connectshyft-api/src/modules/peoplecore`:

| File | Function Signature | Responsibility |
|------|--------------------|---------------|
| `lifecycle.ts` (new) | `computeContactPointStatus(events: ContactPointEvent[], links: ContactPointLink[]): ContactPointStatus` | Pure function implementing the state machine in §4.  Consumes ordered events and current links to derive the correct lifecycle state. |
| `store.ts` (existing) | `async updateContactPointStatus(input: { tenantId: string; contactPointId: string; newStatus: ContactPointStatus; }): Promise<void>` | Updates `people.contact_points.status` and writes a `lifecycle_changed` event in a single transaction.  No‑op if `newStatus` matches current status. |
| `service.ts` (existing) | Extend existing event capture methods to call `computeContactPointStatus` and `updateContactPointStatus` after persisting each new `ContactPointEvent`.  All event‑producing flows (inbound/outbound activity, manual confirmation, reassignment suspicion, resolver merge) must trigger lifecycle evaluation. |
| `identityScoring.ts` (existing) | Modify scoring functions to accept a `ContactPointStatus` parameter and subtract the penalty defined in §2.  Cap the confidence band at `MEDIUM` when `status = 'reassignment_suspected'`. |

### 6.2 ConnectShyft seam and web layer

| File | Function Signature | Responsibility |
|------|--------------------|---------------|
| `peoplecoreIdentityAdapter.ts` | augment return types of `resolveIdentity`/`scoreCandidates` to include `contactPointStatus: ContactPointStatus` alongside each candidate’s `score` and `confidenceBand`.  No change to input signatures. |
| `contactPointIdentityResolution.ts` | read `contactPointStatus` from PeopleCore responses and pass status into UI context and candidate metadata. |
| `libs/contracts/src/connectshyft.ts` | update any types representing identity resolution results to include `contactPointStatus: ContactPointStatus`. |
| `apps/connectshyft-web/src/views/Shell/PeopleView.vue` | add computed properties for shared/stale/reassignment indicators based on `contactPoint.status` and display these indicators next to each contact point. |
| `apps/connectshyft-web/src/features/connectshyft/neighbors.ts` | update parsing and type definitions if needed to carry `status`. |

## 7. PROVIDER / INTEGRATION CONTRACTS

No external provider integrations are introduced.  The seam between ConnectShyft and PeopleCore now includes `contactPointStatus` on all identity‑related responses.  The API remains internal: no public endpoints outside ConnectShyft expose contact point lifecycle.  No changes are made to telephony providers or PeopleCore resolvers in this slice.

## 8. EVENT HANDLING

All contact‑point events continue to flow into `people.contact_point_events`.  The PeopleCore service must now handle an additional event type `lifecycle_changed`, which triggers a status update and scoring recalculation.  Event handling functions map as follows:

| Event Type | Handler |
|------------|---------|
| `inbound_activity` | existing handler → persists event → recompute lifecycle |
| `outbound_activity` | existing handler → persists event → recompute lifecycle |
| `confirmation` | existing handler → persists event → recompute lifecycle |
| `reassignment_suspected` | existing handler → persists event → recompute lifecycle |
| `lifecycle_changed` | emitted by `updateContactPointStatus` → no further action |

## 9. IDEMPOTENCY RULES

1. **Lifecycle computation** is idempotent: calling `computeContactPointStatus` with the same ordered events and links always returns the same status.  The store method only updates the status when it changes.  There is no double‑update.
2. **Event persistence** remains idempotent via caller‑supplied idempotency keys.  In this slice no new keys are introduced.
3. **Scoring penalty application** is deterministic and pure.  There is no external state; a given input yields the same output.

## 10. FAILURE MODES

1. **Invalid status value:**  If `computeContactPointStatus` attempts to return a value outside the enumerated set, the service throws `InvalidContactPointStatusError` and rejects the operation.
2. **Concurrent updates:**  If another transaction updates a contact point’s status between reading and writing, the transaction fails with a `ConflictError`.  Retry the operation.
3. **Missing events or links:**  If events or links cannot be fetched (e.g. database unavailable), the service throws `ContactPointLifecycleComputationError` and returns a 503 response through the seam.
4. **Migration failures:**  If the migration fails (e.g. status column missing), subsequent code will throw `ColumnNotFoundError`; operators must run migrations via `migration-runner` before deploying this slice.
5. **UI consumption errors:**  If ConnectShyft does not receive a `contactPointStatus` field, it logs a warning but proceeds without indicators.  It should never block creation solely due to missing status.

## 11. TEST CONTRACT

### 11.1 PeopleCore unit tests (`apps/connectshyft-api/src/modules/peoplecore/__tests__`)

1. **computeContactPointStatus.test.ts** (new) – tests every transition in the state machine using synthetic event and link sequences.  Verify that the function produces the expected status.
2. **store.updateContactPointStatus.test.ts** (new) – verifies that the store updates the `status` column and inserts a `lifecycle_changed` event when the status changes, and does nothing when the status remains the same.
3. **identityScoring.test.ts** – extends existing tests to include status penalties and band caps.  Create mock candidates with different statuses and assert that scores reflect the penalties and that `reassignment_suspected` candidates cap the band at `MEDIUM`.

### 11.2 Integration tests (`tests/integration/connectshyft-api`)

1. **contactPointLifecycle.integration.test.ts** (new) – create contact points and simulate sequences of events via API calls; assert that `contact_points.status` updates correctly and that resolver responses include the expected status.
2. **identityResolution.slice27.test.ts** (new) – perform an identity resolution call through ConnectShyft and assert that the response payload includes `contactPointStatus`, the correct confidence band adjustments, and risk indicators.  Ensure that ambiguous or risky status results trigger the appropriate friction but still allow creation per UX rules.
3. **peopleView.slice27.test.ts** (new) – mount `PeopleView` in a test harness; simulate status values and assert that shared, stale and reassignment indicators render.

## 12. CHECKPOINTS (MANDATORY)

### Checkpoint 1 — Add Lifecycle Status Column and Event Type

**FILES**

1. `shared/database/migrations/20260328100000_add_status_to_people_contact_points.ts` – create a migration that alters `people.contact_points` to add the `status` column (TEXT, NOT NULL, default `'active_personal'`), populates existing rows, and adds the check constraint enumerating valid values.  The migration must be wrapped in a transaction.
2. `shared/database/migrations/20260328100500_add_lifecycle_changed_event_type.ts` – add a new enum value `lifecycle_changed` to the `contact_point_events.event_type` domain if such a domain exists (or adjust the constraint accordingly).
3. `libs/contracts/src/people.ts` – update the `ContactPoint` type to include `status: ContactPointStatus` and define `ContactPointStatus` as an exported union of the six values.
4. `apps/connectshyft-api/src/modules/peoplecore/store.ts` – extend the `contact_points` table mapping to include the `status` column; update any mapper functions to set and return the `status` field.

**FUNCTION SIGNATURES**

No new callable functions are introduced in this checkpoint.

**LINE‑LEVEL DIFF EXPECTATIONS**

At this checkpoint you will modify type definitions and select lists to include the new `status` field.  The migration files should follow the standard pattern used elsewhere in the repository.

**REQUIRED CHANGES**

1. Write the two migrations.  Ensure default values are set and that existing code uses the new column.
2. Update PeopleCore contracts to include `ContactPointStatus`.
3. Modify the store mapping accordingly.

**DATA MUTATIONS**

Adds a new non‑nullable column to `people.contact_points` and populates it.  Adds a new value to the `event_type` enum.  Existing data is updated in place.

**GUARDS**

1. The migration must run in a single transaction to avoid partial schema updates.
2. If the column already exists, the migration should not throw; it should check for existence and skip.
3. Default the status of all existing contact points to `'active_personal'` and set the check constraint to enforce this value set.

**STOP CONDITION**

Run `pnpm --filter migration-runner run migrate:latest` successfully.  Verify that `people.contact_points` has the `status` column with the correct default and constraint.  Verify that `contact_point_events` accepts `lifecycle_changed`.

**COMMIT POINT**

```bash
git add shared/database/migrations/20260328100000_add_status_to_people_contact_points.ts \
        shared/database/migrations/20260328100500_add_lifecycle_changed_event_type.ts \
        libs/contracts/src/people.ts \
        apps/connectshyft-api/src/modules/peoplecore/store.ts
git commit -m "feat: add ContactPoint.status column and lifecycle_changed event type"
```

### Checkpoint 2 — Implement Lifecycle Computation and Status Update

**FILES**

1. `apps/connectshyft-api/src/modules/peoplecore/lifecycle.ts` – new file implementing `computeContactPointStatus` per §4.
2. `apps/connectshyft-api/src/modules/peoplecore/store.ts` – add `updateContactPointStatus` method with the signature in §6.1.
3. `apps/connectshyft-api/src/modules/peoplecore/service.ts` – update event handlers to call lifecycle computation and status update after persisting any contact point event.
4. `apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts` – adjust scoring functions to accept and apply the status penalty.
5. `libs/contracts/src/people.ts` – export `ContactPointEventType` with the new `lifecycle_changed` value.

**FUNCTION SIGNATURES**

```ts
// apps/connectshyft-api/src/modules/peoplecore/lifecycle.ts
export function computeContactPointStatus(
  events: ContactPointEvent[],
  links: ContactPointLink[],
): ContactPointStatus;

// apps/connectshyft-api/src/modules/peoplecore/store.ts
async updateContactPointStatus(input: {
  tenantId: string;
  contactPointId: string;
  newStatus: ContactPointStatus;
}): Promise<void>;

// apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts (existing)
function applyStatusPenalty(status: ContactPointStatus): number;
```

**LINE‑LEVEL DIFF EXPECTATIONS**

You will create a new file for the lifecycle computation and update store/service modules to recompute status after each event.  Scoring functions will be augmented to subtract penalties based on `status`.

**REQUIRED CHANGES**

1. Implement `computeContactPointStatus` according to the state machine in §4.
2. Add `updateContactPointStatus` to wrap the status update and event insertion in a transaction.
3. Update all PeopleCore service entry points that create contact point events (inbound/outbound activity, confirmation, reassignment suspicion, resolver merge) to call lifecycle recomputation.
4. Modify scoring to apply status penalties and band caps.

**DATA MUTATIONS**

No additional schema changes; this checkpoint introduces new writes to the `status` column and `contact_point_events` table.

**GUARDS**

1. Only update status when it actually changes; avoid redundant updates.
2. Wrap status update and event insertion in a single transaction.
3. Guard against invalid status returned by `computeContactPointStatus`.

**STOP CONDITION**

Run the PeopleCore unit tests added in §11.1 and confirm they all pass.  Manually create events in a development database, call the seam to resolve contact points and verify the status flows through and the scoring penalties apply.

**COMMIT POINT**

```bash
git add apps/connectshyft-api/src/modules/peoplecore/lifecycle.ts \
        apps/connectshyft-api/src/modules/peoplecore/store.ts \
        apps/connectshyft-api/src/modules/peoplecore/service.ts \
        apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts \
        libs/contracts/src/people.ts
git commit -m "feat: implement ContactPoint lifecycle computation and status update"
```

### Checkpoint 3 — Expose and Surface Lifecycle State in ConnectShyft

**FILES**

1. `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts` – augment return types of identity resolution methods to include `contactPointStatus`.
2. `apps/connectshyft-api/src/modules/connectshyft/contactPointIdentityResolution.ts` – pass through `contactPointStatus` to the thread/neighbor context and candidate objects.
3. `libs/contracts/src/connectshyft.ts` – update any types representing identity resolution results to include `contactPointStatus: ContactPointStatus`.
4. `apps/connectshyft-web/src/views/Shell/PeopleView.vue` – add computed properties for shared/stale/reassignment indicators based on `contactPoint.status` and display these indicators next to each contact point.
5. `apps/connectshyft-web/src/features/connectshyft/neighbors.ts` – update parsing and type definitions if needed to carry `status`.

**FUNCTION SIGNATURES**

```ts
// apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts
async function resolveContactPoint(/* existing params */): Promise<{
  personId: string | null;
  provisionalPersonId: string | null;
  confidenceBand: IdentityConfidenceBand;
  score: number;
  reasons: string[];
  contactPointStatus: ContactPointStatus;
  candidates: Array<{
    personId: string;
    score: number;
    reasons: string[];
    contactPointStatus: ContactPointStatus;
  }>;
}>;

// apps/connectshyft-web/src/views/Shell/PeopleView.vue
interface ContactPoint {
  id: string;
  normalizedValue: string;
  type: 'phone' | 'email';
  status: ContactPointStatus;
}
```

**LINE‑LEVEL DIFF EXPECTATIONS**

Update the adapter’s return type definitions and modify the code that constructs the response to include the `status` field returned by PeopleCore.  In `PeopleView`, map over `contactPoints` and derive booleans like `isShared` (`status` is `active_shared_possible` or `active_shared_confirmed`), `isStale` (`status === 'stale'`), and `isReassignmentSuspected` (`status === 'reassignment_suspected'`).  Render these indicators next to each contact point in the list.

**REQUIRED CHANGES**

1. Modify the PeopleCore seam to always include `status` in contact point responses.  Ensure no existing consumer breaks.
2. Update UI components to display indicators based on the new `status`.  Provide accessible labels and test IDs.
3. Update contract definitions for ConnectShyft to include the status field.

**DATA MUTATIONS**

No data mutations; this checkpoint only surfaces data already persisted in PeopleCore.

**GUARDS**

1. Do not change existing fields or semantics of identity resolution results.
2. Maintain backward compatibility: any consumers not expecting `contactPointStatus` should ignore the extra field.

**STOP CONDITION**

Run the integration tests added in §11.2.  Manually load the People shell UI and confirm that the shared, stale and reassignment indicators render correctly when contact points have the corresponding statuses.

**COMMIT POINT**

```bash
git add apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts \
        apps/connectshyft-api/src/modules/connectshyft/contactPointIdentityResolution.ts \
        libs/contracts/src/connectshyft.ts \
        apps/connectshyft-web/src/views/Shell/PeopleView.vue \
        apps/connectshyft-web/src/features/connectshyft/neighbors.ts
git commit -m "feat: surface ContactPoint lifecycle state to ConnectShyft and UI"
```

## 13. DEFINITION OF DONE

Slice 27 is considered complete when the following conditions are met:

1. The `people.contact_points` table has a non‑nullable `status` column with the six enumerated values and all existing rows default to `active_personal`.
2. PeopleCore persists a `lifecycle_changed` event whenever the status changes and `computeContactPointStatus` deterministically produces correct status transitions according to the state machine.
3. Identity scoring applies penalties and band caps based on contact point status and returns status alongside scores.
4. ConnectShyft’s seam returns `contactPointStatus` for each identity decision and the UI displays shared, stale and reassignment indicators.
5. All unit and integration tests described in §11 pass without modification to unrelated modules.
6. There are no new bypass flags or test‑only shortcuts; readiness and identity flows depend on real persisted data.

## 14. NON‑GOALS

1. Implementing resolver UI or workflows – deferred to future slices.
2. Automating lifecycle transitions on a schedule – transitions only occur when events are recorded.
3. Modifying or rewriting historical ContactPointEvents – history must remain immutable.
4. Extending ContactPoint to support additional channels (e.g. social handles) – only phone/email are supported now.
5. Changing ContactPointLink semantics beyond using them in status computation – link rules remain as defined in earlier slices.

## 15. FUTURE EXTENSION POINTS

1. **Resolver workflows:** Future slices may introduce UI for resolvers to confirm or override contact point status, merge contact points, or mark reassignment suspicion manually.
2. **Time‑based decay:** Later work could introduce background jobs to mark contacts stale based on inactivity beyond configured thresholds.
3. **Channel expansion:** Support additional contact point types (e.g. push tokens, social IDs) with corresponding lifecycle states.
4. **Analytics and reporting:** Emit metrics on the distribution of contact point statuses to inform operational efforts and fraud detection.