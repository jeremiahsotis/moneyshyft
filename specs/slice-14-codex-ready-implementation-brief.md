# Slice 14 Codex-Ready Implementation Brief
## Title
Ops ambiguity path for PeopleCore-first identity conflicts

## Repo target path
`specs/slice-14-codex-ready-implementation-brief.md`

## Branch
`codex/slice-14-ops-ambiguity-path`

## Objective
Add an operational ambiguity path for PeopleCore-first identity conflicts so the system preserves current ConnectShyft request behavior, persists a durable ops-facing record of ambiguity, and exposes a narrow admin read/review surface without introducing reconciliation, merge, relinking, scoring redesign, or PeopleCore-driven winner selection.

## Locked recommendations
1. **Append-only ambiguity event log, not a work queue.** This slice should persist ambiguity events and allow a minimal review-state change only.
2. **Persist from the request path as best-effort side effect.** Failure to persist ambiguity events must never alter the identity result returned to existing ConnectShyft callers.
3. **Use ConnectShyft-local ops surfaces in this slice.** Do not build a PeopleCore resolver UI yet.
4. **Keep current outward ambiguity contracts stable.** Existing route response shapes remain authoritative.
5. **No reconciliation behavior in Slice 14.** No merge, relink, attach, suppress, or winner selection.

## Locked policy
### Core authority rule
PeopleCore can invalidate certainty and force ambiguity.

PeopleCore cannot, in Slice 14, silently assert equivalence between a PeopleCore person and a ConnectShyft neighbor when there is disagreement or unresolved mapping.

### Ops rule
Slice 14 exists to make ambiguity visible and reviewable by staff without changing the live identity decision semantics already locked in Slice 13.

### Non-negotiable constraints
1. Do not change existing ConnectShyft route paths.
2. Do not change existing route success/refusal envelope shapes unless this brief explicitly says so.
3. Do not redesign `neighbors.ts` CRUD ownership in this slice.
4. Do not create any resolver action that mutates identity ownership.
5. Do not introduce background jobs, polling workers, or automations in this slice.
6. Do not add automatic deduplication of ambiguity events.
7. Do not mutate candidate ordering coming from the ambiguity result.
8. Do not let ambiguity persistence failure break the request path.
9. Do not build reconciliation UI.
10. Do not introduce PeopleCore-to-neighbor winner mapping tables in this slice.

---

## Why this slice exists
Slice 13 makes PeopleCore-first identity authority viable, but ambiguity is still mostly ephemeral at request time. Staff need an operational record that:
- preserves the exact ambiguity result returned to the caller
- records what was ambiguous
- records where it happened
- supports basic reviewed/unreviewed tracking
- stays strictly observational

This slice is the operational visibility layer for ambiguity.

This slice is **not** a resolver workflow engine.

---

## In scope
- durable ambiguity-event persistence
- best-effort request-path write on ambiguity outcomes
- narrow admin/API read surface for ambiguity events
- narrow reviewed-state update
- characterization and regression coverage
- architecture/docs updates

## Out of scope
- merge actions
- attach/rebind actions
- PeopleCore person detail UI
- ConnectShyft neighbor replacement
- household matching
- candidate scoring redesign
- notification workflows
- assignment queues
- SLA engines
- bulk migration/backfill of historical ambiguity from old logs

---

## Exact repo surfaces to use
Primary files likely involved:
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/neighborIdentityContext.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/config/knex.ts`
- `shared/database/migrations/<timestamp>_create_connectshyft_identity_ambiguity_events.ts`
- `apps/connectshyft-api/src/migrations/<timestamp>_create_connectshyft_identity_ambiguity_events.ts`
- `apps/admin-api/src/migrations/<timestamp>_create_connectshyft_identity_ambiguity_events.ts`
- `apps/moneyshyft-api/src/migrations/<timestamp>_create_connectshyft_identity_ambiguity_events.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.neighborIdentityContext.test.ts`
- `docs/architecture/peoplecore-identity-seam.md`
- `docs/architecture/identity-resolution-model.md`
- `docs/architecture/connectshyft-router-refactor-plan.md`

Recommended new files:
- `apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/ambiguityEvents.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-ambiguity-ops.test.ts`

Note: follow the repo’s shared-migration mirror pattern exactly.

---

## Data model to add
Create a new ConnectShyft-local table under the `connectshyft` schema.

### Recommended table
`connectshyft.cs_identity_ambiguity_events`

### Recommended columns
- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `org_unit_id UUID NULL`
- `source_context TEXT NOT NULL`
- `source_context_id TEXT NULL`
- `normalized_contact_point TEXT NOT NULL`
- `contact_point_type TEXT NOT NULL DEFAULT 'phone'`
- `candidate_neighbor_ids JSONB NOT NULL`
- `candidate_count INTEGER NOT NULL`
- `ambiguity_reason_code TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'pending'`
- `requested_by_user_id TEXT NULL`
- `correlation_id TEXT NULL`
- `idempotency_key TEXT NULL`
- `created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`

### Locked constraints
- `contact_point_type` allowed values: `('phone')`
- `status` allowed values: `('pending','reviewed')`
- `ambiguity_reason_code` initially allowed values:
  - `'IDENTITY_MATCH_AMBIGUOUS'`
  - `'PEOPLECORE_LEGACY_DISAGREEMENT'`
  - `'PEOPLECORE_MULTI_CURRENT_LINKS'`

### Locked indexes
Create indexes for:
- `(tenant_id, created_at_utc desc)`
- `(tenant_id, status, created_at_utc desc)`
- `(tenant_id, normalized_contact_point)`
- `(tenant_id, source_context, created_at_utc desc)`

### Storage rules
1. Store `candidate_neighbor_ids` exactly in the order surfaced by the evaluated ambiguity decision.
2. Store `candidate_count` redundantly for cheap filtering.
3. Do not store enriched PeopleCore person projections in this table.
4. Do not store neighbor snapshots in this table.
5. Do not dedupe on insert.
6. This is append-only except for status changes and `updated_at_utc`.

---

## Behavior rules
### When to persist an ambiguity event
Persist only when the final decision returned by the PeopleCore-aware identity path is ambiguous.

That includes:
1. current legacy-style ambiguity where multiple current neighbor candidates remain ambiguous
2. PeopleCore single-current-link vs legacy-neighbor disagreement
3. PeopleCore multiple current links forcing ambiguity even if legacy had a single candidate

### When not to persist
Do not persist ambiguity events for:
- no-match
- single-match
- no-auto-merge due only to shared/unverified guardrails
- invalid-format refusals
- forbidden refusals
- persistence-unavailable refusals unrelated to ambiguity result generation

### Request-path semantics
The write is best-effort.

If ambiguity-event persistence fails:
- log it
- do not alter the route response
- do not convert the result into a persistence error
- do not retry in-process

---

## API surface to add
Use the existing repo/API structure. Keep it narrow.

### Read endpoint
Recommended route under ConnectShyft admin/runtime API surface:
`GET /api/v1/connectshyft/identity-ambiguities`

If there is already a more appropriate admin-only route family in the repo, keep it in the same API app but use the existing guard style consistently.

### Allowed query params
- `tenantId` required through resolved access context, not as free client override
- `orgUnitId` optional filter
- `status` optional: `pending | reviewed`
- `normalizedContactPoint` optional exact filter
- `sourceContext` optional exact filter
- `limit` optional, default `50`, max `200`
- `cursor` optional for keyset pagination or existing repo pagination style

### Read response shape
Keep it simple and explicit:

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_IDENTITY_AMBIGUITIES_RESOLVED",
  "httpStatus": 200,
  "data": {
    "events": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "orgUnitId": "uuid|null",
        "sourceContext": "connectshyft_identity_match",
        "sourceContextId": "identity-match:peoplecore-disagreement",
        "normalizedContactPoint": "+12605551218",
        "contactPointType": "phone",
        "candidateNeighborIds": ["neighbor-a", "neighbor-b"],
        "candidateCount": 2,
        "ambiguityReasonCode": "PEOPLECORE_LEGACY_DISAGREEMENT",
        "status": "pending",
        "requestedByUserId": "user-1",
        "correlationId": "corr-123",
        "idempotencyKey": "identity-match:...",
        "createdAtUtc": "2026-03-21T12:00:00.000Z",
        "updatedAtUtc": "2026-03-21T12:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

### Status-update endpoint
`PATCH /api/v1/connectshyft/identity-ambiguities/:ambiguityEventId`

Allowed body:
```json
{ "status": "reviewed" }
```

### Status-update rules
- allow only `pending -> reviewed`
- treat repeated `reviewed -> reviewed` as idempotent success if that matches current repo style, otherwise use a deterministic business refusal
- do not allow any other transitions
- do not trigger reconciliation side effects
- do not change PeopleCore records
- do not change neighbor records

---

## Access and policy recommendation
### Recommendation
Gate both endpoints behind the same tenant-scoped privileged ConnectShyft identity capabilities already used for sensitive neighbor/identity operations.

Default:
- read requires tenant-privileged or identity-resolution-capable role
- status update requires tenant-privileged role

### Why
This is operational ambiguity metadata tied to identity decisions. It should not be broadly visible to every thread viewer.

### Counterpoint:
Reusing overly broad read permissions would be faster, but it weakens identity governance and will age badly once real resolver workflows arrive.

---

## Implementation plan

### Checkpoint 1 — Characterize ops ambiguity expectations before production edits
Add failing characterization tests only. No production logic changes.

Lock these cases:
1. PeopleCore / legacy disagreement persists current ambiguous route result and records an ops ambiguity event target shape.
2. Multiple current PeopleCore links persist current ambiguous route result and record an ops ambiguity event target shape.
3. No-match and single-match do not create ambiguity events.
4. Shared/unverified no-auto-merge does not create ambiguity events.
5. Inbound SMS ambiguity keeps current refusal behavior and does not create a neighbor.
6. Status update surface is not present yet or is explicitly characterized as missing before implementation if needed.

Validation commands:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts
pnpm nx run connectshyft-api:test
```

Commit:
```bash
git add apps/connectshyft-api/src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts
git commit -m "test(slice-14): lock ops ambiguity path behavior"
```

### Checkpoint 2 — Add ambiguity-event persistence foundation
Add the migration and store/service module for ambiguity events.

Required work:
- add shared migration
- add mirror migration wrappers in app migration directories that follow the existing pattern
- add a focused module for create/list/update-status operations
- add focused store/service tests

Recommended module surface in `ambiguityEvents.ts`:
- `createIdentityAmbiguityEvent(input)`
- `listIdentityAmbiguityEvents(input)`
- `markIdentityAmbiguityEventReviewed(input)`

Validation commands:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/ambiguityEvents.test.ts \
  src/migrations/__tests__/connectshyftIdentityAmbiguityEventsMigration.test.ts
pnpm nx run connectshyft-api:test
```

Commit:
```bash
git add shared/database/migrations \
  apps/connectshyft-api/src/migrations \
  apps/admin-api/src/migrations \
  apps/moneyshyft-api/src/migrations \
  apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/ambiguityEvents.test.ts \
  apps/connectshyft-api/src/migrations/__tests__/connectshyftIdentityAmbiguityEventsMigration.test.ts
git commit -m "feat(slice-14): add connectshyft ambiguity event persistence"
```

### Checkpoint 3 — Persist ambiguity events from the PeopleCore-aware seam as best-effort side effect
Wire the ambiguity write at the seam boundary where final ambiguity is known.

Recommendation:
- keep persistence close to the PeopleCore-aware adapter path, not spread across every route
- allow route-level context such as correlation/idempotency/source context to flow in from the existing inputs

Required behavior:
1. On final ambiguity result, write one ambiguity event.
2. On non-ambiguity result, write none.
3. On write failure, log and continue.
4. Preserve exact returned ambiguity result.

Important:
Do not let both seam-level and route-level code create duplicate records for the same request. Pick one write location and keep it authoritative.

Best-practice default:
- seam writes the event
- routes consume the unchanged ambiguity result
- route-level audit remains route-level only if it already exists

Validation commands:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts \
  src/modules/connectshyft/__tests__/ambiguityEvents.test.ts
pnpm nx run connectshyft-api:test
```

Commit:
```bash
git add apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts \
  apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts
git commit -m "feat(slice-14): persist ops ambiguity events from identity seam"
```

### Checkpoint 4 — Add narrow read endpoint for ops visibility
Add the read route and tests.

Required behavior:
- tenant-scoped only
- optional org unit/status/contact filters
- deterministic ordering newest first
- limit capped
- no enrichment joins beyond what is needed to return the event object
- no hidden mutation side effects

Validation commands:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.identity-ambiguity-ops.test.ts
pnpm nx run connectshyft-api:test
```

Commit:
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-ambiguity-ops.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
git commit -m "feat(slice-14): add identity ambiguity ops read endpoint"
```

### Checkpoint 5 — Add reviewed-status update endpoint
Add the narrow mutation surface.

Required behavior:
- only allows `reviewed`
- idempotent handling is acceptable and recommended
- no reconciliation behavior
- no identity writes

Validation commands:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.identity-ambiguity-ops.test.ts
pnpm nx run connectshyft-api:test
```

Commit:
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-ambiguity-ops.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/ambiguityEvents.ts
git commit -m "feat(slice-14): add identity ambiguity reviewed status update"
```

### Checkpoint 6 — Documentation and lock
Update docs to reflect the new ops ambiguity layer.

Required docs updates:
- `docs/architecture/peoplecore-identity-seam.md`
- `docs/architecture/identity-resolution-model.md`
- `docs/architecture/connectshyft-router-refactor-plan.md`

Doc points to lock:
- ambiguity persistence is observational only
- reviewed status is operational only
- no reconciliation exists yet
- Slice 15 or later is where true resolver operations may begin

Validation commands:
```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

Commit:
```bash
git add docs/architecture/peoplecore-identity-seam.md \
  docs/architecture/identity-resolution-model.md \
  docs/architecture/connectshyft-router-refactor-plan.md
git commit -m "docs(slice-14): lock ops ambiguity path architecture"
```

---

## Recommended implementation details
### Recommended ambiguity reason mapping
Map final ambiguity causes like this:
- legacy multi-neighbor ambiguity -> `IDENTITY_MATCH_AMBIGUOUS`
- PeopleCore single-link / legacy disagreement -> `PEOPLECORE_LEGACY_DISAGREEMENT`
- PeopleCore multiple current links -> `PEOPLECORE_MULTI_CURRENT_LINKS`

### Recommended source-context values
Use deterministic source context strings already flowing through seam input where possible:
- `connectshyft_identity_match`
- `connectshyft_inbound_subject_resolution`
- future-safe values only if they already exist in this slice’s path

### Recommended idempotency posture
Do not add database uniqueness for ambiguity events in Slice 14.

Reason:
- this is an operational log
- repeated ambiguous requests are themselves meaningful
- dedupe policy is business logic, not persistence-foundation logic

Counterpoint:
This can create repeated records for repeated retries, but that is preferable right now to silently collapsing operational evidence.

### Recommended logging
On ambiguity-event write failure, log at warn/error with:
- tenantId
- orgUnitId
- normalizedContactPoint
- ambiguityReasonCode
- sourceContext
- correlationId
- idempotencyKey

Do not leak raw contact values outside the repo’s existing logging conventions if those are masked elsewhere.

---

## Test expectations
At minimum, final green state should include:
- disagreement ambiguity characterization
- multi-current-link ambiguity characterization
- fallback preservation when PeopleCore is unavailable
- no-write on no-match/single-match/no-auto-merge
- ops read endpoint coverage
- reviewed-status endpoint coverage
- migration test coverage
- full `connectshyft-api:test` pass

Recommended focused command bundle:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/modules/connectshyft/__tests__/ambiguityEvents.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-ambiguity-ops.test.ts \
  src/migrations/__tests__/connectshyftIdentityAmbiguityEventsMigration.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

---

## Done means
Slice 14 is done when all of the following are true:
1. Final ambiguity results produce a durable ambiguity-event record.
2. Non-ambiguity identity results do not.
3. Persistence failure does not change existing route behavior.
4. Staff can list ambiguity events through a narrow endpoint.
5. Staff can mark an event reviewed.
6. No merge/link/reconciliation behavior was introduced.
7. Docs clearly state this is an observational ops path only.

---

## PR guidance
### PR title
`feat(slice-14): add ops ambiguity path for PeopleCore identity conflicts`

### PR summary bullets
- adds ConnectShyft-local ambiguity-event persistence
- records final identity ambiguity outcomes as best-effort side effects
- adds narrow read/review ops endpoints
- preserves existing ambiguity route behavior
- explicitly avoids reconciliation actions

