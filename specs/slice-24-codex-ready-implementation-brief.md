# Slice 24 — Activity Model (Structure Lock)

## 1. OBJECTIVE

Introduce an **Activity** domain model that sits between a person and their communication threads. Each activity represents a discrete program, case or engagement (e.g. a housing intake, a food pantry request, a job search effort). Threads may remain person‑level or be optionally bound to an activity. A persistent, queryable activity table must exist in PeopleCore, and ConnectShyft must store an `activityId` on threads. The UI exposes a person’s activities alongside their communications and allows navigation into an activity’s detail and related threads.

## 2. ARCHITECTURAL DECISIONS (LOCKED)

1. **Activity as first‑class object** – An `Activity` belongs to a `Person`. It has its own ID, type and status. Activities live in the PeopleCore database under the `people` schema; all tenants share a common table with tenant and orgUnit scoping.
2. **Thread dual anchoring** – A thread remains anchored to contact point and orgUnit as per ADR‑006, but now also carries an optional `activityId` referencing the person’s activity. Threads without an `activityId` remain person‑level.
3. **Immutable references** – Once a thread is created, its `activityId` cannot be changed. Reassigning a thread to a different activity or person requires closing the existing thread and starting a new one.
4. **Status enumeration** – Activity `status` must be one of `'ACTIVE'`, `'COMPLETED'` or `'CANCELLED'`. Additional statuses (e.g. `'ARCHIVED'`) are reserved for future slices. The `type` field is free text scoped by tenant conventions; no global enum is enforced.
5. **No cross‑schema FK** – ConnectShyft stores an `activity_id` string on the `cs_threads` table. It does **not** define a foreign key to PeopleCore because PeopleCore and ConnectShyft run in separate Postgres schemas and do not enforce cross‑schema constraints. The application layer validates existence.
6. **Read–only projection** – The person profile page projects activities and their related communications from separate stores without mutating underlying data. There is no mechanism to bulk update or merge activities in this slice.

## 3. EXECUTION FLOW

### 3.1 Create Activity

1. `POST /api/v1/people/:personId/activities` is called with `{ type: string, status?: 'ACTIVE' }`. Default `status` to `'ACTIVE'` if omitted.
2. Handler resolves tenant, orgUnit and person scope. It validates that the actor has `create_activity` capability (implementation uses existing RBAC system).
3. The handler calls `peopleCoreService.createActivity({ tenantId, orgUnitId, personId, type, status })`.
4. The service delegates to `PeopleCoreStore.createActivity`, which inserts a row into `people.activities` with a new UUID, the provided fields and timestamps. It verifies that the person exists in the tenant.
5. The created activity is returned to the caller. The API returns HTTP 201 with the activity record.

### 3.2 List Person Activities

1. `GET /api/v1/people/:personId/activities` is called.
2. Handler resolves tenant, orgUnit and person scope and requires `view_activity` capability.
3. Calls `peopleCoreService.listActivities({ tenantId, orgUnitId, personId })`.
4. The service calls `PeopleCoreStore.listActivities` which queries the `people.activities` table by tenant, orgUnit and personId, ordered by `created_at_utc` ascending, and returns normalized activity records.
5. The API returns HTTP 200 with an array of activities.

### 3.3 Create Thread Bound to Activity

1. Existing thread creation (`ensureThread`) in `threads.ts` is extended to accept an optional `activityId`. The request payload in `ConnectShyftEnsureThreadCommand` includes `activityId?: string`.
2. Prior to thread creation, the handler validates:
   - If `activityId` is provided, call `peopleCoreService.getActivity({ tenantId, orgUnitId, activityId })`. If not found or the activity’s `personId` does not match the thread’s personId, return a `CONNECTSHYFT_THREAD_ACTIVITY_INVALID` refusal.
   - If the activity’s status is not `'ACTIVE'`, return a `CONNECTSHYFT_THREAD_ACTIVITY_NOT_ACTIVE` refusal.
3. When persisting the thread, the store writes the provided `activityId` (or `null`) into the `cs_threads.activity_id` column. It leaves all other fields unchanged.
4. The response includes the `activityId` on the thread DTO.

### 3.4 List Threads for an Activity

1. `GET /api/v1/activities/:activityId/threads` is called.
2. Handler resolves tenant, orgUnit and person context. It validates `view_thread` capability.
3. Calls `threadService.listByActivity({ tenantId, orgUnitId, activityId })` which queries `cs_threads` by tenant, orgUnit and `activity_id = activityId` and returns thread DTOs ordered by `created_at_utc` ascending.
4. The API returns HTTP 200 with an array of threads. If the activity has no threads, an empty array is returned.

## 4. STATE MACHINE

### Activity

| State       | Description                                  | Transitions                                              |
| ----------- | -------------------------------------------- | -------------------------------------------------------- |
| `ACTIVE`    | Activity is in progress.                     | → `COMPLETED` when finished; → `CANCELLED` when aborted. |
| `COMPLETED` | Activity has ended successfully.             | No further transitions; remains terminal.                |
| `CANCELLED` | Activity has been closed without completion. | No further transitions; remains terminal.                |

An activity cannot be returned to `ACTIVE` once completed or cancelled. Threads bound to a non‑active activity cannot be created; existing threads remain valid.

### Thread

Threads retain their existing state machine (`UNCLAIMED`, `CLAIMED`, `CLOSED`) defined in ADR‑006. A thread’s `activityId` is immutable after creation; no new transitions are introduced by this slice.

## 5. DATABASE CONTRACTS

### 5.1 `people.activities`

| Column           | Type        | Constraints                                                     |
| ---------------- | ----------- | --------------------------------------------------------------- |
| `id`             | UUID        | Primary key; default `uuid_generate_v4()`                       |
| `tenant_id`      | TEXT        | NOT NULL; foreign key to `people.persons.tenant_id`             |
| `org_unit_id`    | TEXT        | NOT NULL; foreign key to `people.persons.org_unit_id`           |
| `person_id`      | UUID        | NOT NULL; foreign key to `people.persons.id`                    |
| `type`           | TEXT        | NOT NULL                                                        |
| `status`         | TEXT        | NOT NULL CHECK (`status` IN ('ACTIVE','COMPLETED','CANCELLED')) |
| `created_at_utc` | TIMESTAMPTZ | NOT NULL DEFAULT `NOW()`                                        |
| `updated_at_utc` | TIMESTAMPTZ | NOT NULL DEFAULT `NOW()`                                        |

**Indexes:**

- `activities_tenant_org_person_idx` – `(tenant_id, org_unit_id, person_id)` for listing.
- `activities_tenant_id_idx` – `(tenant_id, id)` for point lookups.

### 5.2 `connectshyft.cs_threads` (modified)

Adds a nullable column:

| Column        | Type | Constraints     |
| ------------- | ---- | --------------- |
| `activity_id` | UUID | NULLABLE; no FK |

**Existing unique index** on `(tenant_id, org_unit_id, neighbor_id)` remains unchanged. An additional index on `(tenant_id, org_unit_id, activity_id)` is added to support list operations.

## 6. SERVICE LAYER (STRICT)

### 6.1 PeopleCore (new file: `apps/connectshyft-api/src/modules/peoplecore/activity.ts`)

```ts
export interface CreateActivityInput {
  tenantId: string;
  orgUnitId: string;
  personId: string;
  type: string;
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface GetActivityInput {
  tenantId: string;
  orgUnitId: string;
  activityId: string;
}

export interface ListActivitiesInput {
  tenantId: string;
  orgUnitId: string;
  personId: string;
}

export interface PeopleCoreActivityStore {
  createActivity(input: CreateActivityInput): Promise<Activity>;
  getActivity(input: GetActivityInput): Promise<Activity | null>;
  listActivities(input: ListActivitiesInput): Promise<Activity[]>;
}
```

The PeopleCore activity service implements simple validation (person exists) and delegates to the store. Each method wraps returned rows into the canonical `Activity` DTO:

```ts
export type Activity = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  personId: string;
  type: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAtUtc: string;
  updatedAtUtc: string;
};
```

### 6.2 ConnectShyft Threads (modified file: `apps/connectshyft-api/src/modules/connectshyft/threads.ts`)

Add an optional `activityId` property to the following types:

- `ConnectShyftThread` → add `activityId: string | null`.
- `ConnectShyftEnsureThreadCommand` → add `activityId?: string`.

Modify `ensureThread` implementation to:

1. Validate `activityId` if provided by invoking `peopleCoreService.getActivity` as described in the execution flow.
2. Persist `activity_id` on insert into `cs_threads`.
3. Include `activityId` in returned thread DTO.

### 6.3 ConnectShyft Activity Service (new file: `apps/connectshyft-api/src/modules/connectshyft/activities.ts`)

```ts
export interface CreatePersonActivityInput {
  actorRoles: (string | null | undefined)[];
  tenantId: string;
  orgUnitId: string;
  personId: string;
  type: string;
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface ListPersonActivitiesInput {
  actorRoles: (string | null | undefined)[];
  tenantId: string;
  orgUnitId: string;
  personId: string;
}

export interface ListActivityThreadsInput {
  actorRoles: (string | null | undefined)[];
  tenantId: string;
  orgUnitId: string;
  activityId: string;
}

export interface AsyncConnectShyftActivityService {
  createPersonActivity(input: CreatePersonActivityInput): Promise<Activity>;
  listPersonActivities(input: ListPersonActivitiesInput): Promise<Activity[]>;
  listActivityThreads(
    input: ListActivityThreadsInput,
  ): Promise<ConnectShyftThread[]>;
}
```

The service enforces RBAC using existing `hasCapability` helper. It orchestrates calls to PeopleCore activity store and threads store.

### 6.4 HTTP Handlers

Handlers reside in `apps/connectshyft-api/src/modules/connectshyft/handlers` and follow existing envelope patterns. New handlers include:

- `postPersonActivityHandler(req, res)` → calls `createPersonActivity`; returns a success envelope with the created activity and HTTP 201.
- `getPersonActivitiesHandler(req, res)` → calls `listPersonActivities`; returns a success envelope with the list.
- `getActivityThreadsHandler(req, res)` → calls `listActivityThreads`; returns a success envelope with threads.

Corresponding route definitions are added to `apps/connectshyft-api/src/modules/connectshyft/http/index.ts`.

## 7. PROVIDER / INTEGRATION CONTRACTS

No external provider integration is introduced in this slice. All operations occur within PeopleCore and ConnectShyft. The only cross‑service call is from ConnectShyft threads to PeopleCore activity service via direct function invocation.

## 8. EVENT HANDLING

No new domain events are emitted in this slice. Activity creation and thread binding are persistence operations only. Future slices may emit events such as `activity.created` or `activity.completed`.

## 9. IDEMPOTENCY RULES

1. **Create Activity** – Repeatedly creating the same activity with the same type and person is allowed; there is no uniqueness constraint on `(personId, type)`. The caller must decide idempotency at a higher layer if needed.
2. **List Activities** – Pure read; repeated calls return the same result until activities change.
3. **Create Thread with Activity** – When `activityId` is provided, validate once and persist. If thread creation fails after persisting the `activityId` (e.g. due to unique constraint on `(tenant_id, org_unit_id, neighbor_id)`), the caller may retry without risk of duplicate `cs_threads` rows because of the existing unique index. Do not attempt to update `activity_id` on conflict.

Guard conditions in thread creation:

```ts
if (command.activityId) {
  const activity = await peopleCoreService.getActivity({
    tenantId,
    orgUnitId,
    activityId,
  });
  if (!activity || activity.personId !== neighbor.personId)
    return refusal("CONNECTSHYFT_THREAD_ACTIVITY_INVALID");
  if (activity.status !== "ACTIVE")
    return refusal("CONNECTSHYFT_THREAD_ACTIVITY_NOT_ACTIVE");
}
```

## 10. FAILURE MODES

1. **Person or Activity Not Found** – Calls to `getActivity` or `getPerson` return `null`; handlers must translate to a 404 envelope (`CONNECTSHYFT_ACTIVITY_NOT_FOUND` or `CONNECTSHYFT_PERSON_NOT_FOUND`).
2. **Invalid Activity–Person Association** – When `activityId` does not belong to the specified person, return a refusal envelope with code `CONNECTSHYFT_THREAD_ACTIVITY_INVALID` and HTTP 422.
3. **Inactive Activity** – When `activity.status` is not `'ACTIVE'`, return a refusal envelope with code `CONNECTSHYFT_THREAD_ACTIVITY_NOT_ACTIVE` and HTTP 422.
4. **Database Unavailable** – All store methods throw `ConnectShyftPersistenceUnavailableError` or `PeopleCorePersistenceUnavailableError` when the database cannot be reached. Handlers return a 503 envelope.
5. **RBAC Denied** – If the actor lacks required capability for creating or viewing activities, return a 403 envelope (`CONNECTSHYFT_FORBIDDEN`).

## 11. TEST CONTRACT

### 11.1 PeopleCore Unit Tests

Add tests in `apps/connectshyft-api/src/modules/peoplecore/__tests__/activity.test.ts`:

1. **createActivity** – Creating an activity inserts a row into `people.activities` with the correct person/tenant/orgUnit and returns the expected DTO.
2. **getActivity** – Returns `null` when no activity exists; returns the activity when it does.
3. **listActivities** – Returns an array of activities ordered by `created_at_utc` ascending; filters by person.
4. **scope violation** – Creating or listing an activity with mismatched tenant/person throws `PeopleCoreScopeViolationError`.

### 11.2 ConnectShyft Unit Tests

Update `threads.contract.test.ts` to cover:

1. Creating a thread with a valid `activityId` persists the `activity_id` column and returns it in the DTO.
2. Creating a thread with an invalid `activityId` (non‑existent or belonging to a different person) returns a refusal.
3. Creating a thread with a non‑active activity (status `'COMPLETED'`) returns a refusal.
4. `listActivityThreads` returns only threads whose `activity_id` matches the requested activity.

### 11.3 ConnectShyft Integration Tests

Add new tests in `tests/integration/connectshyft-api/activity.integration.test.ts`:

1. `POST /people/:personId/activities` creates an activity and returns HTTP 201 with the activity record.
2. `GET /people/:personId/activities` lists activities in order.
3. `POST /threads` with `activityId` binds to the activity and surfaces the `activityId` in the response.
4. `GET /activities/:activityId/threads` returns only threads bound to that activity.

## 12. CHECKPOINTS

### Checkpoint 1 — Create `people.activities` table and store

**BRANCH**

Create and switch to branch codex/slice-24-activity-model before beginning any work.

**FILES:**

1. `shared/database/migrations/20260324130000_create_people_activities.ts` – new migration creating the `activities` table under `people` schema with fields and constraints described above.
2. `apps/connectshyft-api/src/modules/peoplecore/activity.ts` – new file defining DTOs, input types and the store interface.
3. `apps/connectshyft-api/src/modules/peoplecore/store.ts` – update to implement `createActivity`, `getActivity`, `listActivities` in `KnexPeopleCoreStore`.
4. `apps/connectshyft-api/src/modules/peoplecore/service.ts` – update to expose new methods that call the store.
5. `apps/connectshyft-api/src/modules/peoplecore/__tests__/activity.test.ts` – new unit tests for PeopleCore activity operations.

**FUNCTION SIGNATURES:**

Add the following methods to `KnexPeopleCoreStore` class:

```ts
async createActivity(input: CreateActivityInput): Promise<Activity>;
async getActivity(input: GetActivityInput): Promise<Activity | null>;
async listActivities(input: ListActivitiesInput): Promise<Activity[]>;
```

Add corresponding methods to `AsyncPeopleCoreService` interface and its implementation.

**LINE‑LEVEL DIFF EXPECTATIONS:**

Migration file example:

```diff
*** Begin Migration: shared/database/migrations/20260324130000_create_people_activities.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS people');
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS people.activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      person_id UUID NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await knex.raw('CREATE INDEX IF NOT EXISTS activities_tenant_org_person_idx ON people.activities (tenant_id, org_unit_id, person_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS activities_tenant_id_idx ON people.activities (tenant_id, id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS people.activities');
}
*** End Migration
```

In `store.ts`, implement `createActivity`, `getActivity` and `listActivities` using `withSchema('people').table('activities')`, similar to other store methods.

**DATA MUTATIONS:**

Creating an activity inserts a row into `people.activities` with `tenant_id`, `org_unit_id`, `person_id`, `type`, `status`, `created_at_utc`, `updated_at_utc` and a generated UUID. Listing activities reads rows filtered by `tenant_id`, `org_unit_id` and `person_id`.

**GUARDS:**

- `createActivity` must call `assertPersonInTenant` to ensure the person belongs to the tenant.
- `getActivity` and `listActivities` must filter by tenant and orgUnit. Attempts to access a different tenant/orgUnit result in `PeopleCoreScopeViolationError`.

**STOP CONDITION:**

Run the PeopleCore activity unit tests. All tests should pass, and the migration should create the `people.activities` table. An example check:

```sql
SELECT COUNT(*) FROM people.activities;
-- should return 0 on a fresh database
```

**COMMIT POINT:**

```bash
git add shared/database/migrations/20260324130000_create_people_activities.ts \
    apps/connectshyft-api/src/modules/peoplecore/activity.ts \
    apps/connectshyft-api/src/modules/peoplecore/store.ts \
    apps/connectshyft-api/src/modules/peoplecore/service.ts \
    apps/connectshyft-api/src/modules/peoplecore/index.ts \
    apps/connectshyft-api/src/modules/peoplecore/__tests__/activity.test.ts
git commit -m "feat(peoplecore): add Activity model and persistence"
```

### Checkpoint 2 — Add `activity_id` to `cs_threads`

**FILES:**

1. `apps/connectshyft-api/src/migrations/20260324131000_add_activity_id_to_connectshyft_threads.ts` – new migration adding `activity_id` column and index.
2. `apps/connectshyft-api/src/modules/connectshyft/threads.ts` – update types and persistence logic.
3. `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts` – update and add tests covering activity binding.

**FUNCTION SIGNATURES:**

Add `activityId?: string` to `ConnectShyftEnsureThreadCommand`. Add `activityId: string | null` to `ConnectShyftThread` DTO.

**LINE‑LEVEL DIFF EXPECTATIONS:**

Migration file example:

```diff
*** Begin Migration: apps/connectshyft-api/src/migrations/20260324131000_add_activity_id_to_connectshyft_threads.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE connectshyft.cs_threads
      ADD COLUMN IF NOT EXISTS activity_id UUID NULL;
  `);
  await knex.raw('CREATE INDEX IF NOT EXISTS cs_threads_activity_idx ON connectshyft.cs_threads (tenant_id, org_unit_id, activity_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE connectshyft.cs_threads DROP COLUMN IF EXISTS activity_id`);
}
*** End Migration
```

In `threads.ts`, extend the `ConnectShyftThread` and `ConnectShyftEnsureThreadCommand` types and modify the insertion logic to write `activity_id` if provided. Update the return DTO accordingly.

**REQUIRED CHANGES:**

- Migration adds nullable `activity_id` column and index.
- Update TypeScript types as shown above.
- Modify `ensureThread` logic to validate and persist `activityId` via PeopleCore service, and include it in the returned thread.

**DATA MUTATIONS:**

- Adding `activity_id` does not mutate existing rows (they remain `NULL`). Threads created after migration will have `activity_id` set based on input.

**GUARDS:**

- Ensure `activityId` is only persisted on creation; do not update for existing threads.
- Validate `activityId` belongs to the same person and tenant as the thread as described in execution flow.

**STOP CONDITION:**

The updated tests in `threads.contract.test.ts` should pass, verifying that threads can be created with and without an `activityId` and that invalid activity associations are rejected.

**COMMIT POINT:**

```bash
git add apps/connectshyft-api/src/migrations/20260324131000_add_activity_id_to_connectshyft_threads.ts \
    apps/connectshyft-api/src/modules/connectshyft/threads.ts \
    apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts
git commit -m "feat(connectshyft): support optional activityId on threads"
```

### Checkpoint 3 — Activity Service & HTTP Handlers

**FILES:**

1. `apps/connectshyft-api/src/modules/connectshyft/activities.ts` – new service orchestrating PeopleCore and thread stores.
2. `apps/connectshyft-api/src/modules/connectshyft/handlers/postPersonActivityHandler.ts` – new handler for creating an activity.
3. `apps/connectshyft-api/src/modules/connectshyft/handlers/getPersonActivitiesHandler.ts` – new handler for listing activities.
4. `apps/connectshyft-api/src/modules/connectshyft/handlers/getActivityThreadsHandler.ts` – new handler for listing threads by activity.
5. `apps/connectshyft-api/src/modules/connectshyft/http/index.ts` – update to register new routes.
6. `apps/connectshyft-api/src/modules/connectshyft/__tests__/activities.test.ts` – new unit tests for the service and handlers.
7. `tests/integration/connectshyft-api/activity.integration.test.ts` – new integration tests as described in the test contract.

**FUNCTION SIGNATURES:**

Add to the activity service as shown in section 6.3.

**LINE‑LEVEL DIFF EXPECTATIONS:**

For route registration (simplified example):

```diff
*** Update File: apps/connectshyft-api/src/modules/connectshyft/http/index.ts
@@
 import { postPersonActivityHandler } from './handlers/postPersonActivityHandler';
 import { getPersonActivitiesHandler } from './handlers/getPersonActivitiesHandler';
 import { getActivityThreadsHandler } from './handlers/getActivityThreadsHandler';
@@
 router.post('/api/v1/people/:personId/activities', postPersonActivityHandler);
 router.get('/api/v1/people/:personId/activities', getPersonActivitiesHandler);
 router.get('/api/v1/activities/:activityId/threads', getActivityThreadsHandler);
*** End Patch
```

Handlers must follow existing patterns: resolve context, enforce RBAC, call the service, wrap the result in a success envelope, and handle refusals or errors appropriately.

**REQUIRED CHANGES:**

- Implement the activity service to delegate to PeopleCore and threads store.
- Create handlers and register routes.
- Write unit and integration tests ensuring the service functions and endpoints behave as specified.

**DATA MUTATIONS:**

- Creating an activity persists a record as in Checkpoint 1.
- Listing activities and threads does not mutate data.

**GUARDS:**

- All handlers must enforce capabilities (`create_activity` and `view_activity`). Reuse `hasCapability` helper.
- Validate request parameters (non‑empty `personId`, `activityId` are UUIDs).

**STOP CONDITION:**

Run the new activity unit and integration tests. All tests should pass. A manual call to the endpoints in a development environment should return expected results.

**COMMIT POINT:**

```bash
git add apps/connectshyft-api/src/modules/connectshyft/activities.ts \
    apps/connectshyft-api/src/modules/connectshyft/handlers/postPersonActivityHandler.ts \
    apps/connectshyft-api/src/modules/connectshyft/handlers/getPersonActivitiesHandler.ts \
    apps/connectshyft-api/src/modules/connectshyft/handlers/getActivityThreadsHandler.ts \
    apps/connectshyft-api/src/modules/connectshyft/http/index.ts \
    apps/connectshyft-api/src/modules/connectshyft/__tests__/activities.test.ts \
    tests/integration/connectshyft-api/activity.integration.test.ts
git commit -m "feat(connectshyft): add activity service and API endpoints"
```

## 13. DEFINITION OF DONE

1. The `people.activities` table exists in the database with correct schema and indexes.
2. PeopleCore store and service expose `createActivity`, `getActivity` and `listActivities` and are covered by unit tests.
3. The `cs_threads` table includes a nullable `activity_id` column, and the `ConnectShyftThread` DTO and `ensureThread` command accept it.
4. Thread creation validates and persists the provided `activityId` and refuses invalid or inactive activities.
5. Activity service and HTTP endpoints allow operators to create activities and list activities and activity‑bound threads.
6. All new and updated unit and integration tests pass. There are no test regressions elsewhere in the monorepo.
7. No other modules or files are modified beyond those specified in the checkpoints.

## 14. NON‑GOALS

- This slice does not implement any UI components. Front‑end changes are deferred to the next slice (presentation layer integration).
- It does not add activity scheduling, due dates, or reminders. Only type and status are tracked.
- It does not permit updating or deleting activities. Activities remain immutable aside from status transitions, which are out of scope.
- It does not reassign existing threads to activities. Historical threads remain person‑level unless explicitly created with an `activityId`.

## 15. FUTURE EXTENSION POINTS

1. **Activity workflows** – Introduce due dates, reminders and workflow state transitions (e.g. `'IN_PROGRESS'`, `'ON_HOLD'`, `'COMPLETE'`) with automatic notifications.
2. **Activity merging and rebinding** – Support merging activities or transferring them between persons or households with full audit trails.
3. **Activity metrics** – Aggregate activity outcomes and durations for reporting and analytics.
4. **Activity timeline projection** – Extend the UI timeline to group communications by activity and show high‑level progress.
5. **Event emission** – Emit `activity.created`, `activity.status.changed` events for integration with external systems (e.g. case management).
