# Slice 22 Implementation Brief (Codex‑Ready)

## 1. OBJECTIVE

Deliver resolver‑signal and ambiguity surfacing for inbound identity consultation. PeopleCore must deterministically score identity candidates, assign a confidence band with locked band caps and tie‑break rules, and persist a `ResolverReview` artifact containing the confidence band, candidate list, reasons, and risk flags when ambiguity remains. ConnectShyft must call this new scoring and review pipeline instead of making its own match/no‑match decision. Equivalent inputs MUST produce equivalent scores and confidence bands.

## 2. ARCHITECTURAL DECISIONS (LOCKED)

1. **PeopleCore as scoring authority** – The locked scoring formula and candidate‑generation rules from `identity-scoring.md` and `identity-candidate-generation.md` are the sole source of truth. `connectshyft-api` MUST delegate candidate generation and scoring to PeopleCore.
2. **Deterministic and explainable** – All scoring operations are pure, additive, and subtractive as defined in the contract. Confidence bands are derived by deterministic mapping and capped based on contact‑point state and multiplicity of current links. Explanatory fields (`confidenceReasons`, `riskFlags`) MUST be captured alongside each candidate and persisted on `ResolverReview` records.
3. **ResolverReview persistence** – Ambiguity resolution and high‑risk overrides are stored in `people.resolver_reviews`. No other service may persist resolver reviews or modify their schema. A review object MUST be created for every ambiguous outcome or high‑band override. The payload includes `candidatePersonIds`, `confidenceBand`, `confidenceReasons`, `riskFlags`, and `triggerSource` metadata.
4. **Band‑based friction** – UI and ConnectShyft flows MUST respect the friction model documented in ADR‑008. `very_low` and `low` bands may auto‑create a new person, `medium` bands require explicit user choice, `high` bands require strong warning favouring existing match, and `very_high` bands require a resolver override. This policy is enforced in ConnectShyft; PeopleCore merely returns the band.
5. **Event envelope** – Any cross‑boundary event triggered by resolver reviews (e.g., notifications) MUST be wrapped in the `EventEnvelope` contract.
6. **No schema changes** – Slice 22 uses the `people.resolver_reviews` table introduced in the identity foundation migration. No additional fields are added in this slice. All new logic exists in the application and service layers.

## 3. EXECUTION FLOW

1. **Intake**: ConnectShyft receives an inbound communication and normalizes the contact point. The API ensures a `personId` or `provisionalPersonId` is provided on the thread (per Slice 21). It creates or retrieves a `ContactPoint` and emits a `ContactPointEvent`.
2. **Candidate Generation**: `contactPointIdentityResolution.ts` calls `generateIdentityCandidates({ tenantId, orgUnitId, contactPointId })` in PeopleCore. This function implements the locked candidate‑generation rules and returns an ordered list of candidates with generation reasons.
3. **Scoring**: A new function `scoreIdentityCandidates` calculates a numeric score for each candidate using the additive and subtractive factors defined in the identity‑scoring contract. Reasons for each factor are collected in `confidenceReasons`. Risk conditions (e.g., reassignment suspected, multiple current links) are captured in `riskFlags`.
4. **Band Assignment**: The numeric score is mapped to a confidence band using the locked band mapping. Band caps are applied based on the `ContactPoint` status and whether multiple current person links exist. The tie‑break rule is applied if the leading candidate’s score advantage is < 20 points; in that case, the outcome is ambiguous. The final band and capped band are recorded.
5. **Outcome Decision**: The resolver decides between three outcomes:
   - **Attach** – If exactly one candidate exists and the band is `low`, `medium`, or `high` and the tie‑break rule does not apply, return a `match` outcome with `personId`.
   - **Create New** – If no candidates exist or the band is `very_low`, return a `create_new` outcome with `provisionalPersonId` and `confidenceBand`.
   - **Ambiguous** – If multiple candidates exist, the tie‑break rule triggers, or the band is `very_high`, call `createResolverReview` with full scoring context. Return a `review_needed` outcome with `resolverReviewId` and `confidenceBand`.
6. **Persistence**: On ambiguous outcomes the service calls `peopleCoreService.createResolverReview()` with the candidate list, reasons, risk flags, band, and trigger context. The returned `ResolverReview` id is used as the new identity anchor until the review is resolved. No persistence occurs for clear `attach` or `create_new` decisions.
7. **Response**: ConnectShyft returns an identity response containing the outcome (`match`, `create_new`, `review_needed`), the chosen `personId` or `provisionalPersonId`, and the `confidenceBand`. Ambiguity is surfaced in the UI according to the friction model.

## 4. STATE MACHINE

| State        | Trigger/Event                                              | Next State   |
|-------------|------------------------------------------------------------|--------------|
| `start`     | Normalized contact point created                          | `generate`   |
| `generate`  | Candidates generated                                      | `score`      |
| `score`     | Score computed for all candidates                         | `band`       |
| `band`      | Band assigned and caps applied                            | `decide`     |
| `decide`    | Single candidate, band ≤ `high`, no tie                    | `attach`     |
| `decide`    | No candidates or band `very_low`                          | `create_new` |
| `decide`    | Multiple candidates, tie, or band `very_high`             | `ambiguous`  |
| `attach`    | —                                                          | `complete`   |
| `create_new`| Provisional person created                                | `complete`   |
| `ambiguous` | `ResolverReview` persisted                                | `complete`   |
| `complete`  | —                                                          | terminal     |

The `complete` state is idempotent: re‑evaluating the same input produces the same outcome and does not create duplicate resolver reviews.

## 5. DATABASE CONTRACTS

Slice 22 relies on the existing `people.resolver_reviews` table created in the identity foundation migration. No schema changes occur. The relevant columns used in this slice are:

| Column                      | Type        | Constraints / Notes                                                                                                                                                                |
|-----------------------------|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`                        | UUID        | Primary key. Auto‑generated when absent.                                                                                                                                          |
| `tenant_id`                 | TEXT        | Required. Tenant scope.                                                                                                                                                           |
| `org_unit_id`               | TEXT        | Required. Org‑unit scope.                                                                                                                                                         |
| `review_type`               | TEXT        | Required. Enum: `very_high_duplicate_override`, `shared_contact_ambiguity`, `contact_point_reassignment`, `merge_review`, `subject_reassignment_review`, `identity_conflict`. Slice 22 uses `identity_conflict` for general ambiguity. |
| `review_status`             | TEXT        | Default `pending`. Enum from migration. Not modified in this slice.                                                                                                               |
| `priority`                  | TEXT        | Default `normal`. Enum: `low`, `normal`, `high`, `urgent`. Slice 22 sets `normal`.                                                                                                |
| `trigger_source_type`       | TEXT        | Required. Must be set to `contact_point_resolution`.                                                                                                                              |
| `trigger_source_id`         | TEXT        | Required. Id of the inbound thread or intake event.                                                                                                                               |
| `conversation_id`           | TEXT?       | Optional. If the review is tied to a conversation.                                                                                                                                 |
| `provisional_person_id`     | UUID?       | Optional. Present when create‑new flows produce a provisional person.                                                                                                              |
| `candidate_person_ids`      | JSONB       | Required. JSON array of candidate person ids.                                                                                                                                     |
| `contact_point_id`          | UUID?       | Optional. Id of the contact point under review.                                                                                                                                   |
| `confidence_band`           | TEXT        | Required. Enum: `very_low`, `low`, `medium`, `high`, `very_high`.                                                                                                                 |
| `confidence_reasons`        | JSONB       | Required. JSON array of strings describing additive/subtractive factors.                                                                                                          |
| `risk_flags`                | JSONB       | Required. JSON array of strings describing band‑cap conditions encountered.                                                                                                       |
| `requested_by_user_id`      | TEXT        | Required. User id initiating the review (the inbound API user).                                                                                                                   |
| `assigned_resolver_user_id` | TEXT?       | Optional. Assigned resolver id. Not set in this slice.                                                                                                                            |
| `requested_at_utc`          | TIMESTAMPTZ | Required. Set to `NOW()` by default.                                                                                                                                              |
| Other resolution fields      | Various     | Not used in this slice.                                                                                                                                                           |

## 6. SERVICE LAYER (STRICT)

### New functions (to be created in `apps/connectshyft-api/src/modules/peoplecore`)

1. **File:** `apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts`
   ```ts
   /**
    * Scores identity candidates using the locked additive/subtractive factors.
    * @param candidates List of generated candidates with supporting evidence.
    * @param context Additional context (contact point status, current link count, activity hints).
    * @returns Ordered list of scored candidates with numeric score, confidence reasons, and risk flags.
    */
   export function scoreIdentityCandidates(
     candidates: CandidateSubject[],
     context: ScoreContext,
   ): ScoredCandidate[];
   ```

2. **File:** `apps/connectshyft-api/src/modules/peoplecore/confidenceBand.ts`
   ```ts
   /**
    * Maps a candidate score to a confidence band and applies band caps based on contact‑point conditions.
    * @param score Numeric score computed for the candidate.
    * @param status ContactPoint['status']
    * @param hasMultipleCurrentLinks boolean indicating >1 current contact point link
    * @returns Final confidence band after applying caps.
    */
   export function assignConfidenceBand(
     score: number,
     status: ContactPoint['status'],
     hasMultipleCurrentLinks: boolean,
   ): ConfidenceBand;
   ```

### Modified functions

1. **File:** `apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts`

   - Import and call `generateIdentityCandidates()` (existing or added in Slice 21) to produce the candidate list.
   - Import and call the new `scoreIdentityCandidates()` function. Collect the highest‑scoring candidate and apply `assignConfidenceBand()`.
   - Decide the outcome (`attach`, `create_new`, or `review_needed`) using the execution flow and state machine above.
   - On ambiguous outcomes, invoke `peopleCoreService.createResolverReview()` with the scoring context and candidate list.
   - Return an identity resolution response containing `personId` or `provisionalPersonId`, `confidenceBand`, and `resolverReviewId` when ambiguous.

No changes are required in `store.ts` or `service.ts` because `createResolverReview` already accepts the necessary fields and persists them into `people.resolver_reviews`.

## 7. PROVIDER / INTEGRATION CONTRACTS

* **generateIdentityCandidates()** – Accepts `{ tenantId: string; orgUnitId: string; contactPointId: string }` and returns up to 10 `CandidateSubject` objects sorted by generation priority. Each candidate includes `subjectType`, `subjectId`, `generationReason`, `directness`, `recencyHint`, and `supportingLinkIds`.

* **scoreIdentityCandidates()** – Accepts `CandidateSubject[]` and `ScoreContext` (containing `contactPointStatus`, `currentLinkCount`, `recentActivity`, etc.) and returns `ScoredCandidate[]` with fields `{ subjectId: string; score: number; confidenceReasons: string[]; riskFlags: string[] }`. The function must not modify its inputs and must be pure. The caller is responsible for mapping candidates to PeopleCore rows.

* **assignConfidenceBand()** – Accepts a numeric score, `ContactPoint.status`, and boolean `hasMultipleCurrentLinks`, returning one of the five bands. Must apply locked band caps and the tie‑break rule (via the caller).

* **createResolverReview()** – Already defined in `PeopleCoreStore`. Must be called with the full scoring context on ambiguous outcomes. Required fields: `tenantId`, `orgUnitId`, `reviewType`, `triggerSourceType`, `triggerSourceId`, `candidatePersonIds`, `confidenceBand`, `confidenceReasons`, `riskFlags`, `requestedByUserId`. Optional fields: `provisionalPersonId`, `contactPointId`, `conversationId`, `assignedResolverUserId`.

* **EventEnvelope** – When future slices emit notifications based on resolver reviews, the event payload must be wrapped in `EventEnvelope<ResolverReview>`. Slice 22 does not emit such events yet.

## 8. EVENT HANDLING

There are no new asynchronous events in Slice 22. Resolver reviews are persisted synchronously during identity resolution. Event handling is reserved for future slices. Should an implementation choose to surface review notifications, they MUST be wrapped in `EventEnvelope<ResolverReview>` as documented in the `event-envelope.md` contract.

## 9. IDEMPOTENCY RULES

1. **Deterministic scoring** – `scoreIdentityCandidates()` must return identical scores, reasons, and risk flags for identical inputs. It MUST NOT depend on external mutable state (e.g., current time beyond the recent‑activity buckets defined in the contract). Use only the candidate data and context provided.
2. **Single review per trigger** – When creating a resolver review, guard against duplicates by ensuring that a review does not already exist for the same `tenantId`, `triggerSourceType`, and `triggerSourceId` with status in `('pending', 'queued', 'in_review', 'waiting_for_more_info')`. If one exists, return the existing review id instead of creating a new one.
3. **Band caps** – The band‑cap logic must always be applied after scoring and before final band assignment. If `assignConfidenceBand()` is called repeatedly for the same score and conditions, it must always return the same band.
4. **Idempotent outcome** – Running the identity resolution pipeline multiple times with unchanged inputs must produce the same decision (`attach`, `create_new`, `review_needed`) and, in the latter case, must not produce duplicate `ResolverReview` records.

## 10. FAILURE MODES

1. **Persistence unavailable** – If the underlying database is unreachable or missing tables, the service throws `PeopleCorePersistenceUnavailableError`. This error bubbles up to the API and surfaces a 500 response. No review is created, and the inbound work should be retried later.
2. **No candidates and no provisional** – If candidate generation returns an empty array and ConnectShyft does not permit provisional person creation, return a `no_match` error with an explicit message. This situation should be unreachable in normal Slice 22 flows because provisional creation is required.
3. **Invalid contract inputs** – If any required field is missing or invalid (e.g., `tenantId` undefined), the functions throw a synchronous validation error before performing any persistence. The calling layer must catch and return a 400 response.
4. **Unexpected band** – If `assignConfidenceBand()` receives a score that cannot be mapped to a band (should not happen), throw an error. This protects against silent drift in scoring rules.
5. **Duplicate review detection** – If duplicate detection incorrectly returns an existing review from another tenant or trigger, throw an error. The guard must always include tenant‑scoped conditions.

## 11. TEST CONTRACT

Add integration and unit tests under `apps/connectshyft-api/src/modules/peoplecore/__tests__/identityResolution.slice22.test.ts` and `apps/connectshyft-api/src/modules/peoplecore/__tests__/store.slice22.test.ts` with the following scenarios:

1. **Scoring correctness** – Given a set of candidates with specific evidence (e.g., exact current person link, stale status, recent activity), `scoreIdentityCandidates()` returns the correct score, ordered descending, and includes the appropriate confidence reasons and risk flags.
2. **Band mapping** – Verify that numeric scores map to the correct confidence band (`very_low`, `low`, `medium`, `high`, `very_high`). Verify band caps: for a contact point with status `reassignment_suspected` and score 120, the final band is capped at `medium`.
3. **Tie‑break rule** – When two top candidates differ by fewer than 20 points, the outcome should be ambiguous and trigger a resolver review.
4. **Review persistence** – On ambiguous outcomes, `createResolverReview()` is called with the correct fields, and the resulting row in `people.resolver_reviews` includes `confidenceBand`, `confidenceReasons`, `riskFlags`, and `candidatePersonIds` matching the scoring context. Re‑invoking the pipeline must not create a duplicate review.
5. **Attach vs create‑new** – When there is one candidate with a `high` band and no tie break, the decision should return a `match` outcome with the person id. When there are no candidates, the decision should return a `create_new` outcome with a provisional person and the band `very_low`.
6. **Error handling** – If the database is unavailable, the service should throw `PeopleCorePersistenceUnavailableError` and not attempt to create a review. Tests should simulate database outage by mocking the `knexClient` to reject with a `42P01` error code.

## 12. CHECKPOINTS

### Checkpoint 1 — Implement scoring and band assignment

**FILES:**
1. `apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts` (new file)
2. `apps/connectshyft-api/src/modules/peoplecore/confidenceBand.ts` (new file)
3. `apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts` (modified)

**FUNCTION SIGNATURES:**
```ts
// identityScoring.ts
export function scoreIdentityCandidates(
  candidates: CandidateSubject[],
  context: ScoreContext,
): ScoredCandidate[];

// confidenceBand.ts
export function assignConfidenceBand(
  score: number,
  status: ContactPoint['status'],
  hasMultipleCurrentLinks: boolean,
): ConfidenceBand;

// contactPointIdentityResolution.ts (partial)
async function resolveContactPointIdentity(
  params: ResolveContactPointIdentityInput,
): Promise<IdentityResolutionResult>;
```

**LINE‑LEVEL DIFF EXPECTATIONS:**

Create new files:

`identityScoring.ts` should define additive and subtractive weights and export a `scoreIdentityCandidates` function placeholder. For example:

```ts
import type { CandidateSubject, ScoreContext, ScoredCandidate } from './types';

const ADDITIVE = {
  exactCurrentPersonLink: 60,
  exactCurrentHouseholdLink: 20,
  currentPrimaryLink: 15,
  manualConfirmation: 40,
  resolverVerified: 60,
  recentActivity30: 20,
  recentActivity180: 10,
  recentConfirmation180: 15,
  sameHousehold: 15,
} as const;

const SUBTRACTIVE = {
  multipleCurrentLinks: -35,
  activeSharedPossible: -20,
  activeSharedConfirmed: -45,
  stale: -25,
  reassignmentSuspected: -70,
  historicalOnly: -40,
  conflictingIdentity: -60,
  crossHouseholdConflict: -25,
  noRecentUse: -15,
} as const;

export function scoreIdentityCandidates(
  candidates: CandidateSubject[],
  context: ScoreContext,
): ScoredCandidate[] {
  // TODO: implement deterministic scoring logic
  throw new Error('scoreIdentityCandidates not implemented');
}
```

`confidenceBand.ts` should map scores to bands and export `assignConfidenceBand` with a placeholder. For example:

```ts
import type { ContactPoint } from '@shyft/contracts';
import type { ConfidenceBand } from './types';

function mapScoreToBand(score: number): ConfidenceBand {
  if (score <= 0) return 'very_low';
  if (score <= 39) return 'low';
  if (score <= 79) return 'medium';
  if (score <= 119) return 'high';
  return 'very_high';
}

export function assignConfidenceBand(
  score: number,
  status: ContactPoint['status'],
  hasMultipleCurrentLinks: boolean,
): ConfidenceBand {
  const initial = mapScoreToBand(score);
  // TODO: apply band caps based on status and link count
  throw new Error('assignConfidenceBand not implemented');
}
```

Modify `contactPointIdentityResolution.ts` to import and call these functions. For example:

```ts
import { scoreIdentityCandidates } from './identityScoring';
import { assignConfidenceBand } from './confidenceBand';

// inside resolveContactPointIdentity
const candidates = await generateIdentityCandidates({ tenantId, orgUnitId, contactPointId });
const scored = scoreIdentityCandidates(candidates, {
  contactPointStatus: contactPoint.status,
  currentLinkCount,
  recentActivity,
  recentConfirmation,
});
const top = scored[0];
const finalBand = assignConfidenceBand(top.score, contactPoint.status, currentLinkCount > 1);
// decision logic remains unimplemented here
```

**REQUIRED CHANGES:**
1. Create the new scoring and band‑assignment modules with the exact function signatures above. Populate them with the scoring logic defined in `identity-scoring.md` in later checkpoints.
2. Update `contactPointIdentityResolution.ts` to import and use `scoreIdentityCandidates()` and `assignConfidenceBand()` when resolving contact point identity. Do not implement decision logic yet.
3. Do not persist `ResolverReview` objects or implement final decision logic in this checkpoint.

**DATA MUTATIONS:** None in this checkpoint. The new modules perform pure calculations and read‑only operations.

**GUARDS:** The scoring functions must throw if any candidate or context input is missing required fields. `assignConfidenceBand()` must throw if the raw score does not map to a known band (though the mapping covers all numeric values). Idempotency is guaranteed by the pure functions.

**STOP CONDITION:** Running `npm test` should show that the new files exist and compile. Existing PeopleCore tests may fail because the scoring functions are not implemented; this is acceptable for this checkpoint.

**COMMIT POINT:**
```bash
git add apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts \
        apps/connectshyft-api/src/modules/peoplecore/confidenceBand.ts \
        apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts
git commit -m "feat(peoplecore): add candidate scoring and band assignment (slice 22, checkpoint 1)"
```

### Checkpoint 2 — Ambiguity surfacing and resolver review persistence

**FILES:**
1. `apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts` (modified)
2. `apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts` (complete implementation)
3. `apps/connectshyft-api/src/modules/peoplecore/confidenceBand.ts` (complete implementation)

**FUNCTION SIGNATURES:**
```ts
// contactPointIdentityResolution.ts
async function resolveContactPointIdentity(
  params: ResolveContactPointIdentityInput,
): Promise<IdentityResolutionResult>;

// identityScoring.ts (implemented)
export function scoreIdentityCandidates(
  candidates: CandidateSubject[],
  context: ScoreContext,
): ScoredCandidate[];

// confidenceBand.ts (implemented)
export function assignConfidenceBand(
  score: number,
  status: ContactPoint['status'],
  hasMultipleCurrentLinks: boolean,
): ConfidenceBand;
```

**LINE‑LEVEL DIFF EXPECTATIONS:**

Complete the implementations:

In `identityScoring.ts`, implement the deterministic scoring loop. Example:

```ts
export function scoreIdentityCandidates(candidates: CandidateSubject[], context: ScoreContext): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];
  for (const candidate of candidates) {
    let score = 0;
    const reasons: string[] = [];
    const riskFlags: string[] = [];
    // apply additive and subtractive weights based on candidate generation reason and context
    // ... (complete per contract)
    scored.push({ subjectId: candidate.subjectId, score, confidenceReasons: reasons, riskFlags });
  }
  return scored.sort((a, b) => b.score - a.score);
}
```

In `confidenceBand.ts`, implement band caps. Example:

```ts
export function assignConfidenceBand(score: number, status: ContactPoint['status'], hasMultipleCurrentLinks: boolean): ConfidenceBand {
  const initial = mapScoreToBand(score);
  if (status === 'reassignment_suspected' && initial === 'very_high') return 'medium';
  if (status === 'active_shared_confirmed' && (initial === 'very_high' || initial === 'high')) return 'high';
  if (hasMultipleCurrentLinks && (initial === 'very_high' || initial === 'high')) return 'high';
  return initial;
}
```

Modify `resolveContactPointIdentity()` to implement the decision logic:

```ts
const scored = scoreIdentityCandidates(candidates, { contactPointStatus: contactPoint.status, currentLinkCount, recentActivity, recentConfirmation });
const top = scored[0];
const finalBand = assignConfidenceBand(top.score, contactPoint.status, currentLinkCount > 1);
const isTie = scored.length > 1 && (top.score - scored[1].score) < 20;
if (scored.length === 0 || finalBand === 'very_low') {
  const provisionalPersonId = await createProvisionalPerson({ tenantId, orgUnitId, normalizedContact: contactPoint.normalizedValue });
  return { outcome: 'create_new', provisionalPersonId, confidenceBand: finalBand };
}
if (isTie || finalBand === 'very_high') {
  const review = await peopleCoreService.createResolverReview({
    tenantId,
    orgUnitId,
    reviewType: 'identity_conflict',
    triggerSourceType: 'contact_point_resolution',
    triggerSourceId: params.intakeEventId,
    provisionalPersonId: undefined,
    candidatePersonIds: scored.map((c) => c.subjectId),
    contactPointId: contactPointId,
    confidenceBand: finalBand,
    confidenceReasons: top.confidenceReasons,
    riskFlags: top.riskFlags,
    requestedByUserId: params.userId,
  });
  return { outcome: 'review_needed', resolverReviewId: review.id, confidenceBand: finalBand };
}
await attachContactPointToPerson({ tenantId, contactPointId, personId: top.subjectId });
return { outcome: 'match', personId: top.subjectId, confidenceBand: finalBand };
```

**REQUIRED CHANGES:**
1. Fully implement `scoreIdentityCandidates()` by iterating over candidates, applying the additive and subtractive factors defined in the identity‑scoring contract, populating `confidenceReasons` and `riskFlags`, and returning a sorted array of `ScoredCandidate` objects.
2. Fully implement `assignConfidenceBand()` by applying the locked band caps: `reassignment_suspected` caps at `medium`, `active_shared_confirmed` caps at `high`, and `multiple current links` caps at `high`.
3. Implement the decision logic in `resolveContactPointIdentity()` based on the final band and tie‑break rule. Create provisional people via existing helper `createProvisionalPerson()` (from Slice 21). Create resolver reviews via `peopleCoreService.createResolverReview()` when ambiguous. Attach contact points via existing helper `attachContactPointToPerson()` when matching.
4. Add duplicate review detection in `createResolverReview()` by first querying for an existing review with the same `tenantId`, `triggerSourceType`, and `triggerSourceId` in a pending state. If one exists, return that id instead of creating a new review.
5. Add unit tests per the test contract.

**DATA MUTATIONS:**
1. Creation of provisional person records (existing table `people.persons`).
2. Creation of resolver review records in `people.resolver_reviews` when ambiguous, populated with `candidatePersonIds`, `confidenceBand`, `confidenceReasons`, `riskFlags`, and trigger metadata.
3. Creation of contact point link records when attaching contact points to persons (unchanged from Slice 21 but executed conditionally in this slice).

**GUARDS:**
1. Before creating a provisional person or resolver review, check if an existing record already resolves the identity (same trigger) and return that record instead of creating a duplicate.
2. Only attach a contact point when the final band is ≤ `high`, there is no tie, and there is exactly one candidate.
3. Always verify that `tenantId`, `orgUnitId`, and `contactPointId` are provided before performing persistence.

**STOP CONDITION:** Running `npm test` after implementing the logic should show that all identity resolution tests pass and that no duplicate resolver reviews are created on repeated runs.

**COMMIT POINT:**
```bash
git add apps/connectshyft-api/src/modules/peoplecore/identityScoring.ts \
        apps/connectshyft-api/src/modules/peoplecore/confidenceBand.ts \
        apps/connectshyft-api/src/modules/peoplecore/contactPointIdentityResolution.ts
git commit -m "feat(peoplecore): complete ambiguity surfacing and resolver review persistence (slice 22, checkpoint 2)"
```

## 13. DEFINITION OF DONE

Slice 22 is complete when:
1. Identity resolution consistently calls the PeopleCore scoring pipeline and returns outcomes based on the locked scoring contract and friction model.
2. The `ResolverReview` table persists confidence bands, candidate person ids, confidence reasons, and risk flags on every ambiguous outcome. Repeat calls for the same trigger do not create duplicate reviews.
3. Integration tests demonstrate deterministic scoring, correct band mapping, proper application of band caps, tie‑break handling, and accurate outcome decisions.
4. UI flows (outside the scope of this slice) consume the `confidenceBand` and `resolverReviewId` returned by the API to apply friction.
5. No schema migrations are added or modified; all new logic resides in service and module files.

## 14. NON‑GOALS

* Do not introduce machine‑learning or probabilistic scoring. Only the locked additive/subtractive factors may be used.
* Do not modify existing database schemas or add new tables. `people.resolver_reviews` is sufficient.
* Do not implement resolver UI or resolver workflows. Ambiguity surfacing stops at persisting a review and returning its id.
* Do not change the existing contact point intake or provisional person creation flows defined in Slice 21 except to integrate the new scoring results.
* Do not auto‑merge or auto‑merge duplicates; merge decisions remain a resolver responsibility.

## 15. FUTURE EXTENSION POINTS

1. **Resolver UI integration** – Future slices can implement resolver dashboards to list and act on `ResolverReview` records. They may also introduce real‑time notifications when a review is created.
2. **Automated risk escalation** – Additional logic could add risk flags based on more complex heuristics (e.g., fraud signals) without altering the base score.
3. **Modular scoring factors** – The scoring engine could be extended to accept configurable weights or plugin factors per tenant while preserving the locked defaults.
4. **Multi‑contact resolution** – Extend the pipeline to handle multiple contact points in a single intake (e.g., phone and email) by aggregating their candidates.
5. **Internationalization** – Provide localized reason strings for UI display. The underlying scoring logic remains language‑agnostic.