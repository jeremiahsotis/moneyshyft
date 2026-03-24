# Slice 26 — Resolver Rebinding (Codex‑Ready Implementation Brief)

## 1. OBJECTIVE

Enable **safe, deterministic rebinding** of provisional PeopleCore identities to canonical
persons and automatically propagate those changes through ConnectShyft.  When a
resolver decides that two people records represent the same individual, the system must:

1. Merge the provisional person into the canonical person without losing any
   associated contact points, events or risk flags.
2. Update all ConnectShyft threads and telephony artifacts to point at the
   canonical person while preserving historical authorship and timestamps.
3. Persist merge metadata (who performed the merge, when, why) instead of
   deleting or overwriting records.
4. Surface review-required situations (competing primary contact links or
   household ambiguity) to the resolver for manual intervention.

This slice does **not** introduce new scoring rules or redesign existing
telephony flows.  It focuses on person merging, contact‑point link
normalisation, thread rebinding and unified timeline projection.

## 2. ARCHITECTURAL DECISIONS (LOCKED)

1. **Person states remain authoritative** – People records will be in one of
   three states: `provisional`, `canonical`, or `merged`.  A provisional person
   becomes merged when it is successfully rebound to a canonical person.  The
   canonical person never changes identity; instead a `mergedIntoPersonId`
   reference on the provisional record points to its canonical target.
2. **ContactPointLink merging with metadata** – Rather than deleting contact
   point links or overwriting their subject, the system must mark old links as
   closed and persist merge metadata (`mergedIntoSubjectId`, `mergedAtUtc`,
   `mergedByUserId`, `mergeClass`, `mergeReason`).  New links pointing at the
   canonical person are created for any contact points that were unique to the
   provisional person.  This ensures determinism and auditability.
3. **Rebind classes drive automation** – Each object type (e.g. contact point
   link, household membership) is assigned a `rebindClass` of either
   `auto` or `review`.  Objects marked `auto` are rebound automatically.
   Objects marked `review` require manual resolver intervention and are
   surfaced in a ResolverReview of type `rebind`.  The `rebindClass` values
   are locked by PeopleCore contracts and cannot be altered by this slice.
4. **No rewriting of historical artifacts** – Messages, calls, voicemails and
   contact point events keep their original subject attribution and
   timestamps.  The unified person view is a **projection** built at
   runtime by combining artifacts from both the canonical and merged
   persons.  Underlying rows are untouched.
5. **Thread person rebinding is idempotent** – Updating a thread’s
   `personId` from provisional to canonical must be repeatable without
   changing other fields.  Threads maintain an `originPersonId` field
   (optional) to capture the original subject when rebinding occurs.  Calls
   and bridge sessions also include `personId`; these are updated
   transactionally with the thread.
6. **Event‑driven rebinding** – When PeopleCore merges a person, it emits a
   `peoplecore.person.merged` event wrapped in an `EventEnvelope`.
   ConnectShyft subscribes to this event to trigger thread rebinding.

## 3. EXECUTION FLOW

### 3.1 Merge Person

1. **Initiate merge** – A resolver (via UI or API) submits a merge request
   specifying `provisionalPersonId`, `canonicalPersonId`, and optional
   `mergeReason`.  PeopleCore validates that both persons belong to the
   same tenant and orgUnit and that the provisional has not already been
   merged.
2. **Determine rebind scope** – PeopleCore evaluates all objects linked to
   the provisional person (contact point links, household memberships, etc.)
   and classifies them by `rebindClass` using locked rules.  Objects with
   class `review` are added to a new `ResolverReview` of type
   `review_rebind`.  Objects with class `auto` proceed to automatic
   merge.
3. **Persist merge metadata** – PeopleCore sets the provisional person’s
   `mergedIntoPersonId` and `status = 'merged'`.  For each contact point
   link to be auto‑merged:
   * Mark the existing link `is_current = false` and fill
     `merged_into_subject_id`, `merged_at_utc`, `merged_by_user_id` and
     `merge_reason`.
   * Insert a new link for the same contact point with `subjectId =
     canonicalPersonId`, copying confidence band, primary flags and
     timestamps.
4. **Emit merge event** – PeopleCore emits a `peoplecore.person.merged`
   `EventEnvelope` containing `provisionalPersonId` and `canonicalPersonId`,
   plus lists of objects that were auto‑merged and those requiring review.
   The resolver receives the `ResolverReview` id for reviewable objects.

### 3.2 Auto‑Rebind Threads and Telephony Artifacts

1. **Consume merge event** – A dedicated `connectshyft-person-rebind` worker
   consumes `peoplecore.person.merged` events.  It begins a database
   transaction.
2. **Rebind threads** – For each thread whose `personId = provisionalPersonId`,
   update:
   * `originPersonId` → set to the current `personId` if not already set.
   * `personId` → set to `canonicalPersonId`.
   All other thread fields remain unchanged.
3. **Rebind telephony artifacts** – For each row in
   `connectshyft.cs_calls`, `cs_voicemails`, `cs_delivery_attempts` and
   `cs_bridge_sessions` where `person_id = provisionalPersonId`, set
   `person_id = canonicalPersonId`.  Do **not** modify the call status,
   timestamps or bridge session id.
4. **Commit transaction and acknowledge event** – Once rebinding is complete,
   the transaction commits and the event is acknowledged.  If any step
   fails the transaction rolls back and the event is retried.

### 3.3 Unified Timeline Projection

1. **Load artifacts** – When requesting a person’s communication history,
   the timeline service loads all threads, calls, SMS messages,
   voicemails and contact point events where `personId = canonicalPersonId`
   **or** `mergedIntoPersonId = canonicalPersonId`.
2. **Sort and group** – Artifacts are sorted by their `createdAt` or
   `occurredAt` timestamps.  Threads with an `originPersonId` display both
   the original and current person context in the UI.
3. **Return projection** – The API returns a single `UnifiedPersonTimeline`
   DTO containing ordered timeline items without rewriting the underlying
   data.

## 4. STATE MACHINES

### 4.1 Person Merge State

| State          | Description                                                         | Next States                                     |
|----------------|---------------------------------------------------------------------|-------------------------------------------------|
| `provisional`  | A newly created person pending confirmation.                        | `canonical`, `merged` (after merge completes)   |
| `canonical`    | A verified person record that can receive merges.                   | — (remains canonical)                           |
| `merged`       | A provisional record that has been merged into a canonical person. | — (terminal)                                    |

Once a person is `merged`, all service calls referencing that `personId` must resolve
the `canonicalPersonId` via `mergedIntoPersonId`.

### 4.2 ContactPointLink Merge Class

| Class   | Description                                                                 |
|---------|-----------------------------------------------------------------------------|
| `auto`  | This link can be rebound automatically to the canonical person.             |
| `review`| This link may conflict (e.g. two primaries or household ambiguity) and must be reviewed by a resolver before rebinding. |

The `rebindClass` is fixed by PeopleCore contracts based on link type,
confirmation status, shared indicators and household rules.  It cannot be
changed by this slice.

## 5. DATABASE CONTRACTS

### 5.1 `people.contact_points`

No schema changes.  Contact points continue to live independently of
persons and links.  Scoring and lifecycle state changes occur in Slice 27.

### 5.2 `people.contact_point_links` (modified)

Add the following columns to record merge metadata:

| Column                 | Type        | Constraints                                      |
|------------------------|-------------|--------------------------------------------------|
| `merged_into_subject_id` | TEXT        | NULLABLE; set to the subject id the link was merged into |
| `merged_at_utc`        | TIMESTAMPTZ | NULLABLE; timestamp when the link was closed     |
| `merged_by_user_id`    | TEXT        | NULLABLE; resolver who performed the merge       |
| `merge_class`          | TEXT        | NOT NULL DEFAULT 'auto'; `auto` or `review`      |
| `merge_reason`         | TEXT        | NULLABLE; free‑form reason supplied by resolver  |

These columns are only populated on the old link when rebinding; they remain
null on current links.  Existing rows are backfilled with nulls and
`merge_class = 'auto'`.

### 5.3 `people.persons` (modified)

Add a `status` enum column (`provisional`, `canonical`, `merged`) with
default `provisional` for new rows.  Add a `merged_into_person_id` column
with a foreign key back to `persons.id` and an index.  A person can only be
merged once.

### 5.4 `connectshyft.threads` (modified)

Add an `origin_person_id` TEXT column nullable.  When a thread is
rebound from provisional to canonical, set `originPersonId` to the old
`personId` and update `personId` to the canonical.  Index
`(tenant_id, person_id)` and `(tenant_id, origin_person_id)` for
efficient lookups.

### 5.5 `connectshyft.cs_calls`, `cs_voicemails`, `cs_delivery_attempts`,
`cs_bridge_sessions` (modified)

Add or update `person_id` columns to allow rebinding of telephony
artifacts.  Create indexes on `(tenant_id, person_id)` for each table.

### 5.6 `connectshyft.person_rebind_history` (new)

Create a table to record rebind operations for audit and idempotency:

| Column               | Type        | Constraints                                      |
|----------------------|-------------|--------------------------------------------------|
| `id`                 | TEXT        | Primary key; generated via `randomUUID()`        |
| `tenant_id`          | TEXT        | NOT NULL                                         |
| `org_unit_id`        | TEXT        | NOT NULL                                         |
| `provisional_person_id` | TEXT     | NOT NULL                                         |
| `canonical_person_id` | TEXT       | NOT NULL                                         |
| `rebind_class`       | TEXT        | `auto` or `review`                               |
| `performed_by_user_id`| TEXT       | NOT NULL                                         |
| `created_at_utc`     | TIMESTAMPTZ | NOT NULL DEFAULT `NOW()`                         |
| `notes`              | TEXT        | NULLABLE                                         |

Primary key: `id`.  This table is appended to on each successful rebind.

## 6. SERVICE LAYER (STRICT)

### 6.1 PeopleCore

Introduce the following interfaces in `apps/connectshyft-api/src/modules/peoplecore/service.ts` and implement them in the `store`:

| Function / Signature | Responsibility |
|---------------------|---------------|
| `async mergePerson(input: { tenantId: string; orgUnitId: string; provisionalPersonId: string; canonicalPersonId: string; performedByUserId: string; mergeReason?: string; }): Promise<PeopleCoreMergeResult>` | Performs the merge described in **Execution Flow 3.1**.  Returns lists of auto‑merged objects and objects requiring review (to be used by the resolver).  Throws if persons belong to different tenants or if provisional has already been merged. |
| `async getPersonMergeStatus(input: { tenantId: string; personId: string; }): Promise<'provisional' | 'canonical' | 'merged'>` | Returns the current merge status of a person, resolving through `mergedIntoPersonId` if necessary. |

The `PeopleCoreMergeResult` should include: `mergedProvisionalPersonId`,
`canonicalPersonId`, `autoMergedContactPointLinkIds`,
`reviewContactPointLinkIds`, and the `resolverReviewId` if one was created.

### 6.2 ConnectShyft

Add a new `PersonRebindService` in
`apps/connectshyft-api/src/modules/connectshyft/personRebind.ts` with these
functions:

| Function / Signature | Responsibility |
|---------------------|---------------|
| `async rebindPersonThreads(input: { tenantId: string; orgUnitId: string; provisionalPersonId: string; canonicalPersonId: string; performedByUserId: string; }): Promise<void>` | Consumes a `peoplecore.person.merged` event and updates threads and telephony artifacts as in **Execution Flow 3.2**.  Idempotent; re‑running with the same ids has no effect. |
| `async projectUnifiedTimeline(input: { tenantId: string; personId: string; }): Promise<UnifiedPersonTimeline>` | Builds a unified timeline projection as in **Execution Flow 3.3**.  Returns an ordered list of timeline items spanning all merged persons. |

### 6.3 HTTP Endpoints

Add the following handlers under `apps/connectshyft-api/src/modules/connectshyft/handlers`:

| Method & Path | Responsibility |
|---------------|---------------|
| `POST /api/v1/peoplecore/persons/merge` | Accepts a merge command with provisional and canonical ids, invokes `peoplecore.mergePerson`, and returns either a success envelope with lists of auto‑merged and review items or a refusal if validation fails. |
| `GET /api/v1/connectshyft/person/:personId/unified-timeline` | Returns the unified timeline projection for the given person. |

## 7. PROVIDER / INTEGRATION CONTRACTS

The merge and rebinding logic is internal to PeopleCore and ConnectShyft.  No
external provider integrations are required.  However, ConnectShyft must
subscribe to `peoplecore.person.merged` events via the existing event bus
(`platform.events`) and process them idempotently.

## 8. EVENT HANDLING

*PeopleCore* – Emits `peoplecore.person.merged` wrapped in
`EventEnvelope` when a merge completes.  The payload includes both person
ids and arrays of merged/review objects.

*ConnectShyft* – Consumes `peoplecore.person.merged` and enqueues a
background job (`personRebindJob`) to update threads and telephony artifacts.
If the job fails it will be retried.  The event is acknowledged only after
the transaction commits.

## 9. IDEMPOTENCY RULES

1. **mergePerson** – Idempotent with respect to the same
   `provisionalPersonId` and `canonicalPersonId`.  Calling merge multiple
   times returns the same lists of auto‑merged and review objects and does not
   create duplicate links or events.
2. **rebindPersonThreads** – Idempotent.  Updating a thread or call that
   already has `personId = canonicalPersonId` does nothing.  Rebinding
   telephony artifacts multiple times yields the same state.
3. **unified timeline projection** – Pure read.  Repeated calls return the
   same items as long as underlying data does not change.

## 10. FAILURE MODES

1. **Cross‑tenant merge** – If the provisional and canonical persons belong
   to different tenants or orgUnits, PeopleCore refuses with code
   `PEOPLECORE_MERGE_SCOPE_VIOLATION`.
2. **Provisional already merged** – Merging a provisional that has
   `status = 'merged'` or a non‑null `mergedIntoPersonId` returns a
   refusal `PEOPLECORE_PERSON_ALREADY_MERGED`.
3. **Review required** – If any `ContactPointLink` has `rebindClass = 'review'`,
   PeopleCore returns a `ResolverReview` and the resolver must resolve
   the review before the merge is finalised.  ConnectShyft must not
   rebind threads until the review is complete.
4. **Rebind transaction failure** – If rebinding threads and telephony
   artifacts fails (e.g. due to a DB error), the transaction rolls back and
   the merge event is retried.

## 11. TEST CONTRACT

### 11.1 PeopleCore Tests

Create tests under `apps/connectshyft-api/src/modules/peoplecore/__tests__/mergePerson.test.ts`
that verify:

1. `mergePerson` sets `status = 'merged'` and `mergedIntoPersonId` on the
   provisional person and does not modify the canonical person.
2. `mergePerson` marks old contact point links with merge metadata and
   creates new links pointing at the canonical person.  Existing
   `is_current` flags are preserved on the new links.
3. `mergePerson` returns review items for conflicting primaries or
   household ambiguity.
4. `mergePerson` is idempotent – merging the same persons twice does not
   create additional links or events.

### 11.2 ConnectShyft Tests

Create tests under `apps/connectshyft-api/src/modules/connectshyft/__tests__/personRebind.test.ts`
that verify:

1. `rebindPersonThreads` updates `personId` and sets
   `originPersonId` on threads bound to a provisional person while
   leaving other fields untouched.
2. `rebindPersonThreads` updates `person_id` on calls, voicemails,
   delivery attempts and bridge sessions.
3. `rebindPersonThreads` is idempotent – running it twice yields the same
   state.
4. `projectUnifiedTimeline` returns timeline items from both the
   canonical and merged persons, ordered correctly, with threads
   indicating their origin person.

## 12. CHECKPOINTS

### Checkpoint 1 — Implement Person Merge in PeopleCore

**FILES:**

1. `shyftunity/apps/connectshyft-api/src/modules/peoplecore/store.ts` –
   Add merge metadata columns to `contact_point_links` and `persons` in the
   People schema migrations folder.  Introduce `mergePerson` logic in the
   store layer to perform auto merges and create a `ResolverReview` for
   review items.
2. `shyftunity/apps/connectshyft-api/src/modules/peoplecore/service.ts` –
   Expose the `mergePerson` and `getPersonMergeStatus` methods, wiring them
   through the store’s transaction wrapper.
3. `shyftunity/shared/database/migrations` – Create migrations to
   modify `people.contact_point_links` and `people.persons` tables
   as described in **Database Contracts**.
4. `shyftunity/apps/connectshyft-api/src/modules/peoplecore/events.ts` –
   Add an event emitter for `peoplecore.person.merged` to wrap merge
   notifications in an `EventEnvelope`.

**LINE‑LEVEL DIFF EXPECTATIONS:**

* Add new columns in the migration script using `knex.schema.alterTable` for
  `merged_into_subject_id`, `merged_at_utc`, etc., with appropriate
  defaults.  Create the `status` enum and `merged_into_person_id` on
  `persons` and add an index.
* In the store’s `createContactPointLink` and related mapping functions,
  include the new merge metadata fields when mapping rows.
* Implement `mergePerson` in the store using a transaction: update the
  provisional person, insert new links, update old links, create a
  `ResolverReview` when necessary, and return the result.

**STOP CONDITION:**

Run the PeopleCore unit tests for mergePerson.  All tests in
`mergePerson.test.ts` should pass.  Do not implement rebinding or UI
changes in this checkpoint.

**COMMIT POINT:**

```bash
git add apps/connectshyft-api/src/modules/peoplecore/* shared/database/migrations
git commit -m "feat(slice-26): implement PeopleCore person merge with merge metadata"
```

### Checkpoint 2 — Implement Rebinding in ConnectShyft

**FILES:**

1. `shyftunity/apps/connectshyft-api/src/modules/connectshyft/personRebind.ts` –
   New service implementing `rebindPersonThreads` and `projectUnifiedTimeline`.
2. `shyftunity/apps/connectshyft-api/src/modules/connectshyft/threads.ts` –
   Modify the thread model to include `originPersonId` and update
   persistence functions to handle rebinding.
3. `shyftunity/apps/connectshyft-api/src/modules/connectshyft/calls.ts`,
   `voicemails.ts`, `deliveryAttempts.ts`, `bridgeSessions.ts` –
   Update persistence functions to allow updating `person_id` during a
   rebind.  Do **not** alter call state logic.
4. `shyftunity/shared/database/migrations` – Create a migration to add
   `origin_person_id` to `connectshyft.threads` and create the
   `connectshyft.person_rebind_history` table.
5. `shyftunity/apps/connectshyft-api/src/modules/connectshyft/events.ts` –
   Subscribe to `peoplecore.person.merged` and call `rebindPersonThreads`.

**LINE‑LEVEL DIFF EXPECTATIONS:**

* In each persistence layer (threads, calls, etc.), add a method to update
  `person_id` and set `originPersonId` (for threads) when rebinding.  Use
  transactions to ensure atomic updates.
* Implement `rebindPersonThreads` to fetch all relevant records,
  perform updates, record a row in `person_rebind_history`, and commit.
* Implement `projectUnifiedTimeline` by querying both the canonical and
  merged persons and assembling timeline items in memory.

**STOP CONDITION:**

Run the ConnectShyft unit tests for person rebinding and unified timeline.
All tests in `personRebind.test.ts` should pass.  Do not implement UI
handlers in this checkpoint.

**COMMIT POINT:**

```bash
git add apps/connectshyft-api/src/modules/connectshyft/* shared/database/migrations
git commit -m "feat(slice-26): implement ConnectShyft thread and telephony rebinding"
```

### Checkpoint 3 — Expose Merge and Unified Timeline APIs

**FILES:**

1. `shyftunity/apps/connectshyft-api/src/modules/peoplecore/handlers/postMergePerson.ts` –
   HTTP handler to invoke `peoplecore.mergePerson`, return success or
   refusal envelopes and the resolver review id when applicable.
2. `shyftunity/apps/connectshyft-api/src/modules/connectshyft/handlers/getUnifiedTimeline.ts` –
   HTTP handler to call `projectUnifiedTimeline` and return a
   `UnifiedPersonTimeline` DTO.
3. `shyftunity/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` –
   Register the new endpoints.

**LINE‑LEVEL DIFF EXPECTATIONS:**

* In the merge handler, validate input, call `mergePerson`, map the
  result to a success envelope, and handle refusal cases.  Do not
  implement UI logic here.
* In the unified timeline handler, resolve tenant/context, call
  `projectUnifiedTimeline`, and return a success envelope.

**STOP CONDITION:**

Run end‑to‑end tests invoking the merge API and verifying that threads
and telephony artifacts are rebound and that the unified timeline reflects
the merged history.  All integration tests should pass.

**COMMIT POINT:**

```bash
git add apps/connectshyft-api/src/modules/* apps/connectshyft-api/src/routes/api/v1
git commit -m "feat(slice-26): expose merge person and unified timeline APIs"
```

## 13. DEFINITION OF DONE

The slice is complete when:

1. The PeopleCore person merge functionality persists merge metadata,
   returns auto‑merge and review items, and emits a merge event.
2. Rebinding of threads and telephony artifacts occurs automatically via
   event consumption, updating `personId` and setting `originPersonId`.
3. Contact point links are merged deterministically with merge metadata,
   and conflicting links trigger a resolver review.
4. A unified timeline can be requested for a canonical person and includes
   artifacts from any merged persons without altering the underlying records.
5. All unit and integration tests specified in the Test Contract pass.

## 14. NON‑GOALS

* Designing or implementing the resolver UI.  The UI will be addressed in
  a subsequent slice.
* Changing identity scoring logic or contact point lifecycle state (Slice 27).
* Automatically performing merges based on heuristics; merges remain an
  explicit resolver action.
* Introducing new telephony behaviour beyond updating `personId` on
  existing artifacts.

## 15. FUTURE EXTENSION POINTS

1. **Household‑level rebinding** – Merge entire households when multiple
   persons are consolidated.  Extend the `rebindClass` rules to cover
   household memberships and roles.
2. **Bulk merge operations** – Allow resolvers to merge multiple
   provisional persons into one canonical person in a single transaction.
3. **Cross‑module notifications** – Publish `person.rebound` events to
   notify third‑party systems of identity consolidation.
4. **Metrics and observability** – Track merge durations, number of
   auto‑merged vs review links, and rebinding latency for operational
   insights.
