# Slice 21 — Inbound Identity Attachment + ContactPointEvent Capture (Repo-Snapped, Hard Stop Checkpoints)

## Status
LOCKED

## Authoritative execution source
This file is the authoritative execution source for Slice 21.

## Objective
Make inbound ConnectShyft communication person-aware at persistence time by resolving identity through PeopleCore before thread ensure, capturing `ContactPointEvent` at intake, requiring `personId` on every persisted thread, and surfacing person context plus identity state through the existing thread/detail shell surfaces.

This slice must be built against the repo reality already present:
- ConnectShyft inbound SMS currently resolves to `neighborId` and can create a neighbor on no-match inside `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- PeopleCore identity foundation already exists in `shared/database/migrations/20260321100000_create_peoplecore_identity_foundation.ts`
- PeopleCore persistence/service seams already exist in `apps/connectshyft-api/src/modules/peoplecore/store.ts` and `service.ts`
- ConnectShyft identity seam already exists in:
  - `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts`
- ConnectShyft thread persistence currently requires `neighborId` but does not persist `personId`
- `SubjectContext` contract already exists in `libs/contracts/src/subject-context.ts`

---

## Locked architectural decisions

### Policy: Thread identity becomes person-aware now
Decision:
- Every persisted ConnectShyft thread must carry `personId`.
- `neighborId` remains in the thread row for current compatibility and existing route/read surfaces, but it is no longer sufficient identity truth for new inbound thread ensure.

Rules:
- Do not remove `neighborId` in this slice.
- Do not redesign inbox/thread routing around `personId` only in this slice.
- New thread creation paths may not persist a row without `personId`.
- Existing rows may be backfilled minimally only where required by migration safety; do not do broad historical rebinding in this slice.

### Policy: PeopleCore owns inbound identity attachment
Decision:
- Inbound identity attachment runs through a PeopleCore-owned service module, not ad hoc route logic.
- That service must:
  1. normalize contact value
  2. find or create `ContactPoint`
  3. append `ContactPointEvent`
  4. generate deterministic candidates
  5. score candidates with the locked composition formula
  6. apply locked caps and tie-break rule
  7. return one of `canonical`, `provisional`, `resolver_needed`

Rules:
- Do not perform global fuzzy search.
- Do not score candidates outside the locked candidate-generation output.
- Do not silently attach when top-candidate lead is under 20 points.
- Equivalent inputs must produce equivalent candidate sets, ordering, and score outputs.

### Policy: No-match and ambiguous both remain work-safe
Decision:
- No-match creates a provisional person immediately.
- Ambiguous also creates a provisional person immediately and emits resolver signal.
- Thread creation proceeds with the provisional person so the communication is attached to a person on first persist.

Rules:
- `resolver_needed` must still return a concrete provisional person id.
- `ResolverReview` creation does not block thread ensure.
- Do not leave inbound communication unattached to a person because of ambiguity.

### Policy: Cross-boundary events must be envelope-wrapped
Decision:
- People/identity events crossing ConnectShyft ↔ PeopleCore boundary must use `EventEnvelope` payloads.
- For this slice, event transport persistence must use the existing platform event/outbox seam already used by the repo.

Rules:
- Do not publish raw payloads without envelope wrapper.
- Preserve current audit/outbox conventions.
- Keep route response envelopes stable unless the brief explicitly extends them.

### Policy: SubjectContext stays minimal and invariant-safe
Decision:
- `SubjectContext` must continue to carry exactly one of:
  - `personId`
  - `provisionalPersonId`
- UI identity state is derived from person status, not by storing both ids.

Rules:
- Persisted thread stores `personId` only.
- Shell/view projection may map an `active_provisional` person to `provisionalPersonId` in `SubjectContext`.
- Never populate both fields at once.

### Counterpoint:
Keeping `neighborId` and adding `personId` creates dual-anchor tension. That is acceptable in Slice 21 because ripping out `neighborId` now would widen scope across inbox, routing, merge, and historical rebinding. The locked move is additive: make `personId` required for new writes, keep `neighborId` as compatibility scaffolding, and defer full anchor consolidation to later slices.

---

## Execution flow

### Inbound SMS / inbound voice identity attachment flow
1. Extract inbound sender contact value from the existing inbound route/webhook flow.
2. Normalize the contact through the existing phone normalization seam.
3. Load or create `people.contact_points` row for the normalized contact.
4. Append `people.contact_point_events` row with `event_type = 'inbound_seen'` and related thread/webhook metadata.
5. Generate candidates using only the locked PeopleCore candidate-generation rules.
6. Score candidates using the locked scoring formula and band caps.
7. Apply tie-break rule.
8. Branch:
   - `canonical` → attach to resolved confirmed person
   - `provisional` → create provisional person and attach
   - `resolver_needed` → create provisional person, create resolver review, attach to provisional person
9. Ensure ConnectShyft thread with required `personId` and existing `neighborId` compatibility field.
10. Persist cross-boundary event payloads as `EventEnvelope` records in the existing platform event/outbox seam.
11. Return existing webhook/action envelope with added identity payload only where this brief explicitly says to add it.

### Candidate generation order (locked)
1. current person links
2. current household links
3. historical person links only if no current person links exist
4. historical household links only if no current household links exist
5. active current household members from current household links

### Candidate scoring formula (locked)
Additive:
- exact current person link: +60
- exact current household link: +20
- current primary link: +15
- manual confirmation on current link: +40
- resolver verified current link: +60
- recent activity in last 0–30 days: +20
- recent activity in last 31–180 days: +10
- recent confirmation in last 0–180 days: +15
- same-household corroboration: +15

Subtractive:
- multiple current person links on same ContactPoint: -35
- ContactPoint status active_shared_possible: -20
- ContactPoint status active_shared_confirmed: -45
- ContactPoint status stale: -25
- ContactPoint status reassignment_suspected: -70
- historical-only link: -40
- conflicting identity fields: -60
- cross-household conflict: -25
- no recent use over 365 days: -15

Band mapping:
- score <= 0 → `very_low`
- score 1–39 → `low`
- score 40–79 → `medium`
- score 80–119 → `high`
- score >= 120 → `very_high`

Band caps:
- `reassignment_suspected` → max `medium`
- `active_shared_confirmed` → max `high`
- multiple current person links → max `high`

Tie-break:
- if top candidate lead over next candidate is `< 20`, outcome is `resolver_needed`

---

## State machine

### Identity attachment outcome
States:
- `canonical`
- `provisional`
- `resolver_needed`

Transitions:
- no candidates → `provisional`
- one decisive candidate with capped band `high` or `very_high` and lead >= 20 → `canonical`
- multiple candidates or capped lead < 20 → `resolver_needed`
- resolver-needed always creates provisional person before thread ensure

### Thread identity state projection
Derived from person status:
- `active_confirmed` → `identityState = 'confirmed'`
- `active_provisional` → `identityState = 'provisional'`

No other thread-local identity state column is allowed in this slice.

---

## Database contracts

### Migration authority
Use app-level ConnectShyft migrations for thread-table changes and preserve the existing shared PeopleCore authority for shared identity tables already created.

### New migration file
Create exactly:
- `apps/connectshyft-api/src/migrations/20260323180000_add_connectshyft_thread_person_identity.ts`

### Required schema changes
#### Table: `connectshyft.cs_threads`
Add:
- `person_id UUID NULL REFERENCES people.persons(id) ON DELETE RESTRICT`

Add index:
- `(tenant_id, org_unit_id, person_id, id)`

Add backfill behavior in migration:
- existing rows remain nullable during column add
- after safe backfill for rows created in tests during migration contract setup, enforce not-null only if no null rows remain
- if null rows remain, migration must raise with explicit message instructing backfill before not-null enforcement

Constraint rule:
- final intended invariant for repo runtime is `person_id NOT NULL`
- migration may use guarded `DO $$` block pattern already common in repo migrations

### Existing tables reused unchanged
- `people.contact_points`
- `people.contact_point_links`
- `people.contact_point_events`
- `people.resolver_reviews`
- `platform.events`
- `platform.outbox_events`

No new people tables are allowed.

---

## Service layer (strict)

### File
`apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts`

Add these exact types and exports:

```ts
export type PeopleCoreIdentityCandidateGenerationReason =
  | 'current_person_link'
  | 'current_household_link'
  | 'historical_person_link'
  | 'historical_household_link'
  | 'current_household_member';

export type PeopleCoreIdentityResolutionOutcome = 'canonical' | 'provisional' | 'resolver_needed';

export interface PeopleCoreGeneratedIdentityCandidate {
  subjectType: 'person' | 'household';
  subjectId: string;
  generationReason: PeopleCoreIdentityCandidateGenerationReason;
  directness: 'direct' | 'indirect';
  recencyHint: 'current' | 'historical';
  supportingLinkIds: string[];
}

export interface PeopleCoreScoredIdentityCandidate extends PeopleCoreGeneratedIdentityCandidate {
  score: number;
  confidenceBand: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  scoreReasons: string[];
}

export interface ResolveInboundContactPointIdentityInput {
  tenantId: string;
  orgUnitId: string;
  normalizedContactPointValue: string;
  rawContactPointValue: string;
  contactPointType: 'phone';
  eventSource: string;
  relatedObjectType: string;
  relatedObjectId: string;
  requestedByUserId: string | null;
}

export interface ResolveInboundContactPointIdentityResult {
  outcome: PeopleCoreIdentityResolutionOutcome;
  personId: string;
  contactPointId: string;
  contactPointEventId: string;
  provisionalPersonId: string | null;
  resolverReviewId: string | null;
  candidates: PeopleCoreScoredIdentityCandidate[];
  selectedCandidatePersonId: string | null;
}

export async function resolveInboundContactPointIdentityAsync(
  input: ResolveInboundContactPointIdentityInput,
): Promise<ResolveInboundContactPointIdentityResult>;

export function generatePeopleCoreIdentityCandidates(input: {
  contactPoint: ContactPoint;
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  persons: Person[];
  households: Household[];
}): PeopleCoreGeneratedIdentityCandidate[];

export function scorePeopleCoreIdentityCandidates(input: {
  contactPoint: ContactPoint;
  candidates: PeopleCoreGeneratedIdentityCandidate[];
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  asOfUtc: string;
}): PeopleCoreScoredIdentityCandidate[];
```

Responsibilities:
- own deterministic candidate generation
- own deterministic score composition
- create/find contact point
- append `ContactPointEvent`
- create provisional person when required
- create resolver review when required
- return one authoritative attachment result for ConnectShyft

### File
`apps/connectshyft-api/src/modules/connectshyft/threads.ts`

Modify exact types/signatures:

```ts
export type ConnectShyftThread = {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  personId: string;
  source: string;
  state: ConnectShyftThreadState;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  claimedByUserId: string | null;
  claimedAtUtc: string | null;
  closedByUserId: string | null;
  closedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  escalation: {
    stage: number;
    nextEvaluationAtUtc: string | null;
  };
};

export type ConnectShyftEnsureThreadCommand = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  personId: string;
  source?: string;
  forcedState?: string | null;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  threadId?: string;
  actorUserId?: string | null;
  nextEvaluationAtUtc?: string;
};
```

Rules:
- `ensureThread` must refuse before persistence if `personId` is blank
- no separate `provisionalPersonId` column is allowed on thread row
- existing thread ensure/reuse semantics remain unchanged apart from required `personId`

### File
`libs/contracts/src/subject-context.ts`

Modify exact contract + add validator:

```ts
export type SubjectContext = {
  orgUnitId: string;
  personId?: string;
  provisionalPersonId?: string;
  conversationId?: string;
  contactPointId?: string;
};

export function validateSubjectContext(subject: SubjectContext): void;
```

Validation rule:
- throw when both `personId` and `provisionalPersonId` are populated

### File
`apps/connectshyft-api/src/modules/connectshyft/threadIdentityEvents.ts`

Create exact exports:

```ts
export interface PersistConnectShyftThreadIdentityEventInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  subject: SubjectContext;
  event:
    | PersonProvisionalCreatedEvent
    | ResolverReviewCreatedEvent;
}

export async function persistConnectShyftThreadIdentityEventAsync(
  input: PersistConnectShyftThreadIdentityEventInput,
): Promise<{
  eventId: string;
  outboxId: string;
}>;
```

Rules:
- persist envelope-wrapped payload only
- validate `SubjectContext` before persistence
- use existing platform events/outbox seam
- no raw non-envelope payload writes

---

## Provider / integration contracts

No telephony provider redesign is allowed.

The only integration contract extension in this slice is webhook/runtime identity attachment before thread ensure.

Inbound webhook/runtime rules:
- SMS inbound thread ensure must resolve person attachment before `ensureThread`
- voice inbound thread ensure or progression paths that create/reuse thread state must resolve person attachment before any new thread row is persisted
- existing sender alignment, provider correlation, voicemail, and bridge behavior remain intact unless required only to pass the new `personId`

---

## Event handling

### Mapping
- inbound SMS webhook intake → `resolveInboundContactPointIdentityAsync()`
- inbound voice webhook intake when thread creation/reuse path is needed → `resolveInboundContactPointIdentityAsync()`
- provisional identity outcome → build `person.provisional_created` `EventEnvelope` and persist via `persistConnectShyftThreadIdentityEventAsync()`
- resolver-needed outcome → build `resolver_review.created` `EventEnvelope` and persist via `persistConnectShyftThreadIdentityEventAsync()`

### Event subject rules
For provisional person created:
- `subject.orgUnitId = orgUnitId`
- `subject.provisionalPersonId = provisional person id`
- `subject.contactPointId = contact point id`
- `subject.personId` absent

For canonical confirmed attach:
- no provisional-created event
- subject projection in route/read contracts uses `personId`

For resolver review created:
- `subject.orgUnitId = orgUnitId`
- `subject.provisionalPersonId = provisional person id`
- `subject.contactPointId = contact point id`

---

## Idempotency rules

1. ContactPoint creation
- unique on `(tenant_id, type, normalized_value)`
- on unique violation, reload existing row

2. ContactPointEvent creation
- one event per inbound processing pass
- `relatedObjectType + relatedObjectId + eventType + contactPointId` must be used to prevent duplicate semantic writes where the route already has webhook dedupe context

3. Provisional person creation
- only one provisional person may be created per resolved intake execution path
- if route/webhook replay is detected by existing webhook receipt or canonical event dedupe, do not create another provisional person

4. Resolver review creation
- dedupe on existing `triggerSourceType + triggerSourceId`
- reuse current hook-style duplicate guard semantics

5. Thread ensure
- no thread persistence attempt without `personId`
- preserve active-thread reuse behavior keyed by current existing scope until later slice explicitly changes it

6. SubjectContext
- always validate before event persistence or shell projection

---

## Failure modes

- invalid contact normalization → existing business refusal path; no person/thread persistence
- PeopleCore persistence unavailable → retryable refusal using current envelope style
- candidate generation/scoring invariant failure → retryable refusal; do not silently fall back to legacy neighbor-only attach
- thread ensure missing `personId` → business refusal before persistence
- event envelope validation failure → treat as persistence failure and stop side-effect publication for that event write
- resolver review persistence unavailable after provisional person creation → thread may still proceed only if the person attachment result is already complete and route response explicitly reports audit/outbox degradation consistent with repo conventions

---

## Test contract

### Required backend tests
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftThreadPersonIdentityMigration.test.ts`
- `apps/connectshyft-api/src/modules/peoplecore/__tests__/contactPointIdentityResolution.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts`

### Required frontend tests
- `apps/connectshyft-web/src/shell/__tests__/SubjectContext.test.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/__tests__/ConnectShyftThreadDetailView.test.ts`
- extend any existing read-contract parser tests if present for thread detail summary mapping

### Required scenarios
1. exact current person link produces deterministic canonical attach
2. no match creates provisional person, contact point event, and thread with `personId`
3. ambiguous current-person-link competition creates provisional person + resolver review + thread with `personId`
4. tie under 20 points forces `resolver_needed`
5. `ContactPointEvent` persisted as `inbound_seen`
6. thread ensure refuses when `personId` missing
7. event transport persists envelope-wrapped payload only
8. `SubjectContext` never carries both ids
9. thread detail shows person context + provisional/confirmed state without breaking neighbor context

---

## Checkpoints

## CHECKPOINT 1 — Thread person identity persistence foundation

### FILES
- `apps/connectshyft-api/src/migrations/20260323180000_add_connectshyft_thread_person_identity.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftThreadPersonIdentityMigration.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts`

### FUNCTION SIGNATURES (Exact)
```ts
export type ConnectShyftEnsureThreadCommand = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  personId: string;
  source?: string;
  forcedState?: string | null;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  threadId?: string;
  actorUserId?: string | null;
  nextEvaluationAtUtc?: string;
};
```

### LINE-LEVEL DIFF EXPECTATIONS
```diff
+ table.uuid('person_id').nullable().references('id').inTable('people.persons').onDelete('RESTRICT');
+ CREATE INDEX IF NOT EXISTS connectshyft_cs_threads_scope_person_idx
+   ON connectshyft.cs_threads (tenant_id, org_unit_id, person_id, id)
```

```diff
 export type ConnectShyftThread = {
   threadId: string;
   tenantId: string;
   orgUnitId: string;
   neighborId: string;
+  personId: string;
   source: string;
 }
```

```diff
 export type ConnectShyftEnsureThreadCommand = {
   actorRoles: Array<string | null | undefined>;
   tenantId: string;
   orgUnitId: string;
   neighborId: string;
+  personId: string;
   source?: string;
 }
```

```diff
+ if (!normalizeString(input.personId)) {
+   return {
+     ok: false,
+     code: 'CONNECTSHYFT_THREAD_PERSON_REQUIRED',
+     message: 'ConnectShyft thread persistence requires personId.',
+   };
+ }
```

### REQUIRED CHANGES
1. Add `person_id` to `connectshyft.cs_threads`.
2. Thread row mapping must include `personId`.
3. `ensureThread` must require `personId` before store write.
4. Store insert/update/select columns must include `person_id`.
5. Extend thread contract tests to assert persisted `person_id`.

### DATA MUTATIONS
- insert `connectshyft.cs_threads.person_id = input.personId`
- select `person_id` into `ConnectShyftThread.personId`

### GUARDS
- do not remove `neighbor_id`
- do not change thread reuse key in this checkpoint
- do not patch inbound routes yet

### STOP CONDITION
- migration contract test passes
- thread contract test proves persisted thread row includes `person_id`
- `ensureThread` returns refusal code `CONNECTSHYFT_THREAD_PERSON_REQUIRED` when personId is blank

### COMMIT POINT
```bash
git add apps/connectshyft-api/src/migrations/20260323180000_add_connectshyft_thread_person_identity.ts \
        apps/connectshyft-api/src/migrations/__tests__/connectShyftThreadPersonIdentityMigration.test.ts \
        apps/connectshyft-api/src/modules/connectshyft/threads.ts \
        apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts
git commit -m "feat(connectshyft): require person identity on persisted threads"
```

---

## CHECKPOINT 2 — PeopleCore identity attachment service + deterministic scoring

### FILES
- `apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts`
- `apps/connectshyft-api/src/modules/peoplecore/service.ts`
- `apps/connectshyft-api/src/modules/peoplecore/store.ts`
- `apps/connectshyft-api/src/modules/peoplecore/__tests__/contactPointIdentityResolution.test.ts`
- `libs/contracts/src/people/events.ts` only if exact payload typing extension is required for compile correctness

### FUNCTION SIGNATURES (Exact)
```ts
export async function resolveInboundContactPointIdentityAsync(
  input: ResolveInboundContactPointIdentityInput,
): Promise<ResolveInboundContactPointIdentityResult>;

export function generatePeopleCoreIdentityCandidates(input: {
  contactPoint: ContactPoint;
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  persons: Person[];
  households: Household[];
}): PeopleCoreGeneratedIdentityCandidate[];

export function scorePeopleCoreIdentityCandidates(input: {
  contactPoint: ContactPoint;
  candidates: PeopleCoreGeneratedIdentityCandidate[];
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  asOfUtc: string;
}): PeopleCoreScoredIdentityCandidate[];
```

### LINE-LEVEL DIFF EXPECTATIONS
```diff
+ const contactPointEvent = await peopleCoreService.appendContactPointEvent({
+   tenantId: input.tenantId,
+   contactPointId: contactPoint.id,
+   eventType: 'inbound_seen',
+   eventSource: input.eventSource,
+   relatedObjectType: input.relatedObjectType,
+   relatedObjectId: input.relatedObjectId,
+ });
```

```diff
+ if (topCandidate && nextCandidate && topCandidate.score - nextCandidate.score < 20) {
+   outcome = 'resolver_needed';
+ }
```

```diff
+ if (outcome === 'provisional' || outcome === 'resolver_needed') {
+   const provisionalPerson = await peopleCoreService.createPerson({
+     tenantId: input.tenantId,
+     orgUnitId: input.orgUnitId,
+     firstName: 'Unknown',
+     lastName: 'Contact',
+     status: 'active_provisional',
+   });
+ }
```

### REQUIRED CHANGES
1. Create the new PeopleCore identity-resolution module.
2. Implement deterministic candidate generation using only locked generation reasons.
3. Implement deterministic scoring using locked formula and caps.
4. Find or create `ContactPoint`.
5. Append `ContactPointEvent` with `inbound_seen`.
6. Create provisional person when needed.
7. Create resolver review on `resolver_needed`.
8. Return attachment result with concrete `personId` always populated.

### DATA MUTATIONS
- insert/select `people.contact_points`
- insert `people.contact_point_events`
- optional insert `people.persons` when provisional needed
- optional insert `people.contact_point_links` linking contact point to provisional person
- optional insert `people.resolver_reviews` on `resolver_needed`

### GUARDS
- max candidates returned to scoring = 10
- no fuzzy/global subject generation
- no outcome may return null `personId`
- use current hook-style duplicate protection for resolver review trigger

### STOP CONDITION
- deterministic unit tests pass for canonical, provisional, and resolver-needed outcomes
- test proves `ContactPointEvent` with `eventType = 'inbound_seen'` is created
- test proves tie < 20 forces `resolver_needed`

### COMMIT POINT
```bash
git add apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts \
        apps/connectshyft-api/src/modules/peoplecore/service.ts \
        apps/connectshyft-api/src/modules/peoplecore/store.ts \
        apps/connectshyft-api/src/modules/peoplecore/__tests__/contactPointIdentityResolution.test.ts \
        libs/contracts/src/people/events.ts
git commit -m "feat(peoplecore): resolve inbound contact identity with deterministic scoring"
```

---

## CHECKPOINT 3 — Inbound ConnectShyft runtime wiring + envelope-wrapped identity events

### FILES
- `apps/connectshyft-api/src/modules/connectshyft/threadIdentityEvents.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `libs/contracts/src/subject-context.ts`
- `libs/contracts/tests/event-envelope.test.ts`
- `apps/connectshyft-web/src/shell/__tests__/SubjectContext.test.ts`

### FUNCTION SIGNATURES (Exact)
```ts
export function validateSubjectContext(subject: SubjectContext): void;

export async function persistConnectShyftThreadIdentityEventAsync(
  input: PersistConnectShyftThreadIdentityEventInput,
): Promise<{
  eventId: string;
  outboxId: string;
}>;
```

### LINE-LEVEL DIFF EXPECTATIONS
```diff
+ const identityAttachment = await resolveInboundContactPointIdentityAsync({
+   tenantId,
+   orgUnitId,
+   normalizedContactPointValue: senderPhone.normalizedPhone,
+   rawContactPointValue: senderPhone.rawPhone,
+   contactPointType: 'phone',
+   eventSource: 'connectshyft.inbound_webhook',
+   relatedObjectType: 'connectshyft_webhook_receipt',
+   relatedObjectId: webhookReceipt.id,
+   requestedByUserId: actorUserId,
+ });
```

```diff
-        neighborId: input.neighborId,
+        neighborId: input.neighborId,
+        personId: identityAttachment.personId,
```

```diff
+ validateSubjectContext(subject);
+ validateEventEnvelope(input.event);
```

### REQUIRED CHANGES
1. Add `validateSubjectContext()` and enforce invariant.
2. Create `threadIdentityEvents.ts` using existing platform event/outbox persistence seam.
3. Patch inbound SMS thread ensure path to resolve identity before `ensureThread`.
4. Patch inbound voice thread-creation path to pass required `personId` where a thread is newly persisted.
5. Persist `person.provisional_created` and `resolver_review.created` only as `EventEnvelope` payloads when those outcomes occur.
6. Preserve current webhook envelope style and dedupe behavior.

### DATA MUTATIONS
- insert `platform.events` with envelope payload
- insert `platform.outbox_events` for the same event
- thread ensure now writes `person_id`

### GUARDS
- do not publish provisional/resolver events on canonical outcome
- do not publish any raw non-envelope payload
- do not create a new provisional person if webhook replay is already suppressed upstream
- do not remove current `neighborId` compatibility payloads from webhook responses

### STOP CONDITION
- webhook SMS characterization proves thread row now includes `personId`
- webhook ambiguous scenario proves provisional person + resolver event path executes once
- `SubjectContext` test proves both ids cannot coexist
- event-envelope test still passes with new payload usage

### COMMIT POINT
```bash
git add apps/connectshyft-api/src/modules/connectshyft/threadIdentityEvents.ts \
        apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts \
        libs/contracts/src/subject-context.ts \
        libs/contracts/tests/event-envelope.test.ts \
        apps/connectshyft-web/src/shell/__tests__/SubjectContext.test.ts
git commit -m "feat(connectshyft): attach inbound communication to peoplecore person identity"
```

---

## CHECKPOINT 4 — Read contracts + thread detail person context projection

### FILES
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadDetail.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts`
- `apps/connectshyft-web/src/features/connectshyft/readContracts.ts`

### FUNCTION SIGNATURES (Exact)
No new exported functions required in this checkpoint.

### LINE-LEVEL DIFF EXPECTATIONS
```diff
 export type ConnectShyftThreadDetailRecord = {
   threadId: string;
   neighborId: string | null;
+  personId: string | null;
+  identityState: 'confirmed' | 'provisional' | null;
+  subjectContext: SubjectContext;
   orgUnitId: string;
 }
```

```diff
+ identityState: threadPerson?.status === 'active_provisional' ? 'provisional' : 'confirmed',
+ subjectContext: threadPerson?.status === 'active_provisional'
+   ? { orgUnitId: thread.orgUnitId, provisionalPersonId: thread.personId }
+   : { orgUnitId: thread.orgUnitId, personId: thread.personId },
```

### REQUIRED CHANGES
1. Extend backend thread detail/read contract with `personId`, `identityState`, and validated `subjectContext`.
2. Keep existing `neighborId` and neighbor context labels intact.
3. Extend frontend parser to consume the new fields without breaking old ones.
4. Do not redesign inbox bucketing or actions.

### DATA MUTATIONS
- none; read-model only

### GUARDS
- `subjectContext` must be built with exactly one identity field
- do not remove existing thread detail fields
- do not change existing action availability logic

### STOP CONDITION
- thread detail characterization returns `personId`, `identityState`, and invariant-safe `subjectContext`
- existing inbox/context characterization remains green

### COMMIT POINT
```bash
git add apps/connectshyft-api/src/modules/connectshyft/readContracts.ts \
        apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadDetail.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts \
        apps/connectshyft-web/src/features/connectshyft/readContracts.ts
git commit -m "feat(connectshyft): project person identity context in thread detail surfaces"
```

---

## CHECKPOINT 5 — Shell/UI subject context + identity state display

### FILES
- `apps/connectshyft-web/src/shell/subjectContext.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/__tests__/ConnectShyftThreadDetailView.test.ts`

### FUNCTION SIGNATURES (Exact)
No new exported functions required in this checkpoint.

### LINE-LEVEL DIFF EXPECTATIONS
```diff
+ const threadSubjectContext = computed<SubjectContext>(() => {
+   const subject = threadDetail.value?.subjectContext;
+   return subject && subject.orgUnitId ? subject : { orgUnitId: activeOrgUnitId.value };
+ });
```

```diff
+ <span data-testid="connectshyft-thread-identity-state">
+   {{ threadDetail?.identityState === 'provisional' ? 'Provisional person' : 'Confirmed person' }}
+ </span>
```

### REQUIRED CHANGES
1. Consume thread-level `subjectContext` in the shell/view.
2. Display person identity state in the existing thread detail surface.
3. Preserve neighbor-context UI and add person-context display alongside it.
4. Do not create a new view or route.

### DATA MUTATIONS
- none

### GUARDS
- do not set both `personId` and `provisionalPersonId`
- do not remove add-neighbor or current thread action UI in this slice

### STOP CONDITION
- frontend test proves provisional vs confirmed identity state rendering
- frontend test proves shell consumes invariant-safe `subjectContext`

### COMMIT POINT
```bash
git add apps/connectshyft-web/src/shell/subjectContext.ts \
        apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue \
        apps/connectshyft-web/src/views/ConnectShyft/__tests__/ConnectShyftThreadDetailView.test.ts
git commit -m "feat(connectshyft-web): surface person context and identity state in thread detail"
```

---

## Definition of done
Slice 21 is done only when all of the following are true:
1. No new persisted thread can be created without `personId`.
2. Inbound identity attachment runs through the PeopleCore service seam before thread ensure.
3. `ContactPointEvent` with `inbound_seen` is captured at intake.
4. Candidate generation is deterministic, explainable, bounded, and ordered per the locked contract.
5. Score composition uses the locked formula, caps, and tie-break rule.
6. No-match creates provisional person and thread attaches to that person.
7. Ambiguous input creates provisional person, resolver signal, and thread attaches to that person.
8. Cross-boundary people events are persisted only as `EventEnvelope` payloads.
9. Thread detail and shell surfaces show person context plus identity state.
10. `SubjectContext` never carries both identity fields.

---

## Non-goals
Do not:
- remove `neighborId` from ConnectShyft in this slice
- redesign inbox bucketing around person identity
- redesign provider routing, sender alignment, bridge flows, voicemail, or readiness
- perform historical rebinding of all legacy threads
- replace all neighbor CRUD flows with PeopleCore person CRUD
- add fuzzy identity search
- add a second subject-context object or larger shell identity container

---

## Future extension points
- later slice may change thread reuse key from neighbor-based compatibility to person/contact-point aware policy
- later slice may expand read surfaces beyond thread detail into inbox summaries once person identity is stable
- later slice may move neighbor create/update/delete toward PeopleCore-first ownership
- later slice may add explicit resolver queues in ConnectShyft UI without changing this slice’s identity attachment contract
