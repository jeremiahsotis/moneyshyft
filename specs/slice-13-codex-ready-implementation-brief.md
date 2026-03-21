# Slice 13 Codex-Ready Implementation Brief
## Title
PeopleCore identity read authority with ambiguity precedence and ConnectShyft compatibility shell

## Branch
`codex/slice-13-peoplecore-read-authority-and-ambiguity-precedence`

## Objective
Shift ConnectShyft phone identity lookup to a PeopleCore-first read model where PeopleCore can invalidate certainty but cannot assert identity equivalence across systems. Preserve current ConnectShyft route contracts, keep `neighbors.ts` as the compatibility shell for current CRUD and inbound workflows, and prevent incorrect identity attachment or create-new behavior under disagreement.

## Locked Policy
For Slice 13, the precedence rule is:

**PeopleCore can invalidate certainty, but cannot assert identity equivalence.**

That means:
- If PeopleCore has **no current person link**, preserve legacy ConnectShyft behavior.
- If PeopleCore has **multiple current person links**, final outcome is ambiguity.
- If PeopleCore has **one current person link** and legacy ConnectShyft yields a different concrete winner, final outcome is ambiguity.
- If PeopleCore has **one current person link** and legacy ConnectShyft yields no current winner, final outcome remains no-match for this slice.
- If PeopleCore has **one current person link** and legacy ConnectShyft aligns cleanly on the same practical ownership path, current single-match behavior may continue.
- PeopleCore must **not** silently replace the legacy neighbor identifier returned by existing ConnectShyft flows in this slice.

This is a safety slice, not a reconciliation slice.

---

## Why this slice exists
Slice 12 established:
- PeopleCore persistence foundation
- a PeopleCore identity seam
- best-effort provisional identity hooks
- best-effort resolver review hooks
- preserved ConnectShyft outward behavior

But Slice 12 still leaves practical winner selection with the legacy ConnectShyft neighbor candidate layer. That is exactly why the new Checkpoint 1 tests fail: the current adapter still lets legacy single-winner logic collapse cases that should now be treated as disagreement ambiguity.

Slice 13 is the controlled authority refinement:
- PeopleCore becomes the first source consulted for phone identity read authority
- legacy neighbor lookup remains fallback only when PeopleCore has no current linked person authority
- disagreement becomes explicit ambiguity
- create-new remains blocked under ambiguity
- existing route envelopes remain stable
- neighbor CRUD remains intact as a compatibility shell

This is **not**:
- a neighbor-to-person migration slice
- a resolver UI slice
- a merge engine slice
- a crosswalk or reconciliation slice
- an application-shell slice

---

## Non-negotiable constraints
1. Preserve existing route paths, route order, refusal envelope shape, and HTTP status behavior unless this brief explicitly says otherwise.
2. Do not redesign ConnectShyft neighbor CRUD contracts in this slice.
3. Do not remove `neighbors.ts` or existing async service exports in this slice.
4. Do not add a cross-system identity mapping table, join table, or equivalence cache in this slice.
5. Do not bulk-backfill ConnectShyft neighbors into PeopleCore in this slice.
6. Do not silently choose a winner when PeopleCore and legacy ConnectShyft disagree.
7. Do not let ambiguity collapse into `single_match` or `no_match` except where explicitly allowed by the locked rules.
8. Do not let ambiguity trigger neighbor creation.
9. Keep write hooks best-effort. Hook failure must not break existing ConnectShyft request-path outcomes.
10. All new logic must remain tenant-scoped and org-unit-safe.
11. Characterize before refactor.
12. Keep current shared-contact and verification guardrails intact.

---

## Hard deferrals for Slice 13
The attached Checkpoints 3 to 6 block is skeletal because it states policy but not repo-executable implementation detail. It correctly names the deferrals, but not the actual work package. The corrected version below makes those deferrals explicit and enforceable.

Deferred beyond Slice 13:
- neighbor ↔ person reconciliation
- identity crosswalk table
- inferred equivalence logic
- similarity scoring
- household-assisted ranking
- merge automation
- PeopleCore-first person CRUD replacement for ConnectShyft routes
- resolver UI / inbox / queue
- broad event-driven rebinding
- timeline ownership migration

Allowed in Slice 13:
- comments marking future reconciliation
- notes explicitly labeled `Deferred beyond Slice 13`
- narrow ambiguity telemetry and resolver-review creation where already permitted

---

## Source-of-truth files
Primary code files:
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/peoplecore/store.ts`
- `apps/connectshyft-api/src/modules/peoplecore/service.ts`

Primary test files:
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`

Documentation files:
- `docs/architecture/identity-resolution-model.md`
- `docs/architecture/peoplecore-identity-seam.md`
- `docs/architecture/connectshyft-router-refactor-plan.md`
- `docs/architecture/peoplecore-connectshyft-boundary-matrix.md`

---

## Required behavior model

### Rule A — PeopleCore unavailable
If PeopleCore read persistence is unavailable:
- keep current fallback behavior
- preserve legacy outcome from current neighbor lookup
- do not produce new ambiguity solely because PeopleCore is unavailable

### Rule B — PeopleCore no current person links
If PeopleCore returns zero current person links for the normalized phone:
- preserve legacy ConnectShyft behavior unchanged
- legacy single current neighbor stays single_match
- legacy multiple current neighbors stays ambiguity
- legacy no current neighbors stays no_match
- inbound no-match create-new path remains available

### Rule C — PeopleCore multiple current person links
If PeopleCore returns more than one current person link:
- final result is ambiguity
- no legacy override allowed
- no create-new allowed
- current route envelope must remain deterministic

### Rule D — PeopleCore single current person link plus legacy disagreement
If PeopleCore returns exactly one current person link and the legacy ConnectShyft candidate layer yields a different concrete current owner path:
- final result is ambiguity
- no silent winner
- no attach to legacy winner
- no attach to hypothetical PeopleCore winner
- no create-new

For this slice, “disagreement” includes at minimum:
- PeopleCore single current person link and legacy `single_match` with a different winner path than the seam’s PeopleCore-backed authority posture
- PeopleCore single current person link and route-facing result would otherwise arbitrarily pick a legacy winner

### Rule E — PeopleCore single current person link plus legacy none
If PeopleCore returns exactly one current person link and legacy ConnectShyft yields no current neighbor candidate:
- final result remains no_match in Slice 13
- PeopleCore cannot assert equivalence and force attach
- inbound create-new shell may still proceed only if the overall result remains no_match and there is no ambiguity

### Rule F — Shared/unverified guardrails remain stronger than authority
If a current exact-match path is blocked by shared-contact or verification rules:
- preserve the current blocked / no-auto-merge behavior
- PeopleCore cannot erase that safety condition

---

## Internal implementation recommendation
Best practice recommendation: **keep `identityBoundary.ts` as the outward decision engine and refactor `peoplecoreIdentityAdapter.ts` into a comparison layer that can force ambiguity before the legacy winner reaches outward callers.**

Why:
- route and service contracts already depend on `ConnectShyftIdentityBoundaryResult`
- tests already characterize existing outward behavior there
- the current failure is not a route problem, it is a seam-precedence problem
- this avoids unnecessary route churn

Recommended internal types in `peoplecoreIdentityAdapter.ts`:
- `PeopleCoreAuthorityOutcome`
- `LegacyAuthorityOutcome`
- `IdentityAuthorityComparison`
- `ForcedAmbiguityReason`

Recommended internal outcome enums:
- PeopleCore outcome: `unavailable | no_current_links | single_current_link | multiple_current_links`
- Legacy outcome: `no_match | single_match | multiple_matches`
- Comparison outcome: `fallback_to_legacy | preserve_legacy | force_ambiguity`

Do **not** export these unless tests truly need them. Keep them local if possible.

---

## Checkpoint 1 — Characterization lock
Status intent: characterize first, no production behavior changes.

### Required test coverage
Add or finish characterization coverage for:
1. PeopleCore single current link + legacy aligned single candidate → preserved current single-match behavior.
2. PeopleCore single current link + legacy disagreement → ambiguity.
3. PeopleCore multiple current links + legacy single candidate → ambiguity.
4. PeopleCore no current links + legacy single candidate → preserved legacy single_match.
5. PeopleCore unavailable + legacy single candidate → preserved legacy single_match.
6. Shared-contact case under PeopleCore-first lookup still blocks auto-merge.
7. Identity-match route keeps current ambiguity envelope and deterministic manualResolution shape.
8. Inbound SMS preserves:
   - no create-new on ambiguity
   - current create-new shell only on no_match
   - no arbitrary attach on disagreement

### Validation
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/identityBoundary.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts
pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add .
git commit -m "test(slice-13): lock peoplecore ambiguity precedence characterization"
```

Stop after Checkpoint 1.

---

## Checkpoint 2 — Refactor seam precedence logic
Status intent: fix the three known blockers by moving disagreement and multi-link authority handling into the seam.

### Required production changes
Refactor `peoplecoreIdentityAdapter.ts` so it does **not** simply collect PeopleCore lookup data and then hand legacy candidates through unchanged.

Instead:
1. Normalize contact point value.
2. Load PeopleCore contact points and current links.
3. Derive PeopleCore authority outcome.
4. Load legacy active neighbor candidates.
5. Derive legacy outcome.
6. Compare the two.
7. If comparison requires ambiguity, return an ambiguity-shaped `ConnectShyftIdentityBoundaryResult` before legacy winner selection leaks outward.
8. If comparison permits fallback or preservation, continue existing boundary evaluation.
9. Run best-effort hooks after final result determination.

### Required logic
- `multiple_current_links` => force ambiguity
- `single_current_link + legacy_single_match_disagreement` => force ambiguity
- `single_current_link + legacy_no_match` => preserve no_match for Slice 13
- `no_current_links` => preserve legacy outcome
- `unavailable` => preserve legacy outcome

### Allowed implementation technique
Either of these is acceptable:
- build a forced ambiguity result directly inside the adapter using existing `ConnectShyftIdentityBoundaryResult` shape
- or refactor a small shared helper in `identityBoundary.ts` for building ambiguity results, then call it from the adapter

Default recommendation: build a small non-exported helper in the adapter if it keeps churn lower.

### Prohibitions
- Do not add DB tables.
- Do not add person↔neighbor mapping persistence.
- Do not alter route response schema.
- Do not inject PeopleCore-only fields into route payloads.

### Validation
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/modules/connectshyft/__tests__/identityBoundary.test.ts
pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add .
git commit -m "refactor(slice-13): enforce peoplecore ambiguity precedence in seam"
```

Stop after Checkpoint 2.

---

## Checkpoint 3 — Resolver and route integrity
The attached uploaded file reduces this to policy bullets, but the repo needs executable guidance. fileciteturn14file0

### System rule
If ambiguity is produced at the seam, it is terminal for Slice 13.

### Required code behavior
In `identityResolver.ts`:
- preserve existing resolver contract
- if seam returns `IDENTITY_MATCH_AMBIGUOUS`, resolver must return:
  - `type: 'multiple_matches'`
  - `candidateNeighborIds` from the seam/manualResolution payload
  - same normalized contact point returned by current logic
- do not transform seam ambiguity into single_match
- do not transform seam ambiguity into no_match

In route-facing identity-match flows:
- existing ambiguity envelope must remain unchanged
- `manualResolution` block remains deterministic
- success / refusal status behavior remains unchanged
- no PeopleCore-specific fields in outward response

### Files in scope
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNeighborIdentityMatch.ts`
- tests already covering route envelopes

### Required tests
- Resolver disagreement case returns `multiple_matches`
- Resolver PeopleCore multi-link case returns `multiple_matches`
- Identity-match route disagreement case returns existing ambiguity refusal shape
- Manual resolution payload stays deterministic
- No legacy fallback path overrides seam ambiguity

### Validation
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.neighbor-identity-merge.characterization.test.ts
pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add .
git commit -m "refactor(slice-13): preserve seam ambiguity through resolver and routes"
```

Stop after Checkpoint 3.

---

## Checkpoint 4 — Hard deferral of reconciliation
This checkpoint is mainly negative scope enforcement, but it still needs concrete repo verification.

### System rule
There is no identity reconciliation in Slice 13.

### Absolute prohibitions
Do not add:
- mapping tables
- identity crosswalk persistence
- person↔neighbor join service
- merge logic between person and neighbor records
- heuristic matching
- similarity scoring
- inferred equivalence
- background reconciliation job

### Allowed
- internal comments noting `Deferred beyond Slice 13`
- documentation clarifying why ambiguity increases in this slice

### Required code review checks
Search and verify there are no new:
- migrations for identity mapping
- new peoplecore services for reconciliation
- new contract enums solely for mapping infrastructure

### Validation
Run these search checks after implementation:
```bash
rg -n "crosswalk|reconcil|equivalen|heuristic|similarity|score|link.*neighbor|neighbor.*person.*map|mapping table" apps/connectshyft-api/src libs/contracts shared/database/migrations docs
rg -n "createTable\(|ALTER TABLE|ADD COLUMN" shared/database/migrations apps/connectshyft-api/src/migrations | rg -i "person|neighbor|identity|mapping|crosswalk"
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Commit
```bash
git add docs apps/connectshyft-api/src/modules/connectshyft apps/connectshyft-api/src/modules/peoplecore libs/contracts
# only if there are actual changes from this checkpoint
```

Use no-op commit only if needed by your branch discipline. Otherwise skip commit if there are truly no file changes.

Stop after Checkpoint 4.

---

## Checkpoint 5 — Creation guard and inbound SMS flow control
The uploaded block states the policy correctly, but it needs repo-specific implementation instructions. fileciteturn14file0

### System rule
Ambiguity blocks creation.

### Required behavior
If the final seam/resolver outcome is ambiguity:
- inbound SMS must not create a new neighbor
- webhook path must preserve current ambiguity refusal behavior
- no attach to an arbitrary existing neighbor
- no retry-based create on same ambiguous event

If the final outcome is no_match:
- preserve current create-new shell behavior
- preserve idempotency behavior already in place

### Files in scope
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`
- provider-registry inbound dispatch tests if touched indirectly

### Required tests
- disagreement path through inbound SMS does not call `createNeighborFromInbound`
- PeopleCore multi-link ambiguity does not call `createNeighborFromInbound`
- PeopleCore no-current-link + legacy no_match still does call `createNeighborFromInbound`
- PeopleCore unavailable still preserves current fallback create path when legacy no_match applies

### Idempotency requirement
Do not add new idempotency semantics. Preserve current dedupe and create behavior. The key rule is only:
- ambiguity must never create

### Validation
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts
pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add .
git commit -m "fix(slice-13): block create-new under peoplecore ambiguity"
```

Stop after Checkpoint 5.

---

## Checkpoint 6 — Documentation alignment
The uploaded block names the right doc themes, but not the repo-facing edits. fileciteturn14file0

### Must document

#### 1. Precedence rule
Add explicit wording:
- PeopleCore can block certainty
- PeopleCore cannot assert identity equivalence in Slice 13
- disagreement becomes ambiguity

#### 2. Ambiguity categories
Document these explicitly:
- legacy multi-neighbor ambiguity
- PeopleCore multi-person ambiguity
- cross-system disagreement ambiguity

#### 3. Decision flow
Document this exact logic in prose or diagram form:

```text
PeopleCore available?
  NO -> preserve legacy behavior
  YES -> current person links?
    0 -> preserve legacy behavior
    >1 -> ambiguous
    1 -> legacy outcome?
      multiple -> ambiguous
      single aligned -> preserve current exact-match behavior
      single disagreement -> ambiguous
      none -> no-match (unchanged in Slice 13)
```

#### 4. Non-goals
Explicitly state:
- no reconciliation
- no crosswalk
- no auto-linking
- no merge engine
- no scoring engine

#### 5. Slice 14 handoff note
Document that the next logical slice is operationalization of ambiguity and resolver handling, not reconciliation.

### Files to update
- `docs/architecture/identity-resolution-model.md`
- `docs/architecture/peoplecore-identity-seam.md`
- `docs/architecture/connectshyft-router-refactor-plan.md`
- `docs/architecture/peoplecore-connectshyft-boundary-matrix.md`

### Prohibited documentation language
Do not imply Slice 13 already does:
- future merge logic in present tense
- automatic PeopleCore/neighbor linking
- eventual consistency already established
- person↔neighbor equivalence as a solved problem

### Validation
```bash
rg -n "auto-link|crosswalk|equivalence|reconciliation|merge engine|scoring" docs/architecture
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Commit
```bash
git add docs/architecture
git commit -m "docs(slice-13): align architecture to peoplecore ambiguity precedence"
```

Stop after Checkpoint 6.

---

## Final validation sweep
Run at the end of the slice:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/identityBoundary.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.neighbor-identity-merge.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

Optional broader safety pass if already normal for your branch:
```bash
pnpm nx run admin-api:test
pnpm nx run moneyshyft-api:test
```

---

## Expected commit sequence
1. `test(slice-13): lock peoplecore ambiguity precedence characterization`
2. `refactor(slice-13): enforce peoplecore ambiguity precedence in seam`
3. `refactor(slice-13): preserve seam ambiguity through resolver and routes`
4. optional no-op or skip if Checkpoint 4 has no file diffs
5. `fix(slice-13): block create-new under peoplecore ambiguity`
6. `docs(slice-13): align architecture to peoplecore ambiguity precedence`

If you prefer a single squashed codex branch before PR, use the checkpoint commits locally anyway, then squash at PR time only if your repo policy allows it.

---

## PR target
- Base: `codex/dev`
- Branch: `codex/slice-13-peoplecore-read-authority-and-ambiguity-precedence`

## PR title
`Slice 13: enforce PeopleCore ambiguity precedence and preserve ConnectShyft compatibility shell`

## PR summary bullets
- makes PeopleCore first read authority for identity invalidation
- forces ambiguity on cross-system disagreement and multi-link PeopleCore cases
- preserves legacy fallback when PeopleCore has no current links or is unavailable
- blocks create-new under ambiguity in inbound SMS flows
- keeps current route envelopes stable
- documents Slice 13 as a safety slice, not a reconciliation slice

---

## Codex execution note
Do not improvise beyond this slice.

The correct behavior for Slice 13 is to increase ambiguity in unsafe disagreement cases. That is intentional. A noisier but safer ambiguity result is better than a cleaner but wrong identity winner.
