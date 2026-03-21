# Slice 13 Codex-Ready Implementation Brief

## Title

PeopleCore identity read authority and ConnectShyft compatibility shell

## Branch

`codex/slice-13-peoplecore-read-authority-and-compat-shell`

## Objective

Make PeopleCore the first authoritative source for phone identity resolution while preserving existing ConnectShyft route contracts and keeping `neighbors.ts` as the operational compatibility shell for current CRUD and inbound workflows.

## Locked Policy

When PeopleCore and legacy ConnectShyft neighbor resolution disagree, Slice 13 MUST return ambiguity/manual resolution and MUST NOT silently prefer either side.

---

## Why this slice exists

Slice 12 established:

- PeopleCore persistence foundation
- a PeopleCore identity seam
- best-effort provisional identity hooks
- best-effort resolver review hooks
- preserved ConnectShyft outward behavior

But Slice 12 still leaves candidate authority with ConnectShyft neighbor lookup in practical terms. Slice 13 is the controlled authority shift:

- PeopleCore becomes first read authority for phone identity
- ConnectShyft neighbor lookup remains fallback only when PeopleCore has no current person link
- disagreement becomes an explicit ambiguity outcome, never a hidden winner
- neighbor CRUD remains intact for now as a compatibility shell

This is not the bulk-migration slice, not the resolver-UI slice, and not the application-shell slice.

---

## Non-negotiable constraints

1. Preserve existing route paths, route order, refusal envelope shape, and HTTP status behavior unless this brief explicitly says otherwise.
2. Do not redesign ConnectShyft neighbor CRUD contracts in this slice.
3. Do not remove `neighbors.ts` or the existing async service exports in this slice.
4. Do not bulk-backfill all ConnectShyft neighbors into PeopleCore in this slice.
5. Do not add broad new resolver workflows beyond the narrow cases defined here.
6. Do not silently choose a winner when PeopleCore and legacy neighbor lookup disagree.
7. All new PeopleCore-first authority logic must remain tenant-scoped and org-unit-safe.
8. All new behavior must be characterized before refactor or authority shift.
9. Preserve current inbound SMS operational continuity.
10. Keep the current seam best-effort posture for write hooks. Request-path failures in PeopleCore hook writes must not break current ConnectShyft route outcomes.

---

## Authority rules to implement

For normalized phone identity lookup:

### Rule A: PeopleCore exact single current person link wins

If PeopleCore returns exactly one current person link for the normalized phone value:

- resolution outcome is single match
- use that PeopleCore person identity as the authoritative identity answer
- if a legacy ConnectShyft neighbor candidate exists and aligns cleanly, continue normally
- if legacy data disagrees, return ambiguity/manual resolution instead of selecting either side

### Rule B: PeopleCore multiple current person links is ambiguous

If PeopleCore returns more than one current person link for the normalized phone value:

- return ambiguity/manual resolution
- do not fall through to legacy neighbor winner selection
- create or reuse narrow resolver-review hooks as already allowed by the seam

### Rule C: PeopleCore no current person links falls back

If PeopleCore returns no current person links:

- preserve current legacy ConnectShyft neighbor lookup behavior
- preserve current single_match / no_match / multiple_matches outcomes from the legacy path
- preserve current inbound no-match create flow

### Rule D: Disagreement is explicit ambiguity

If PeopleCore yields a single current person link but the legacy ConnectShyft candidate layer disagrees in identity ownership:

- return ambiguity/manual resolution
- do not auto-merge
- do not choose PeopleCore silently
- do not choose legacy silently
- optionally create a resolver review using a narrow mismatch trigger defined in this slice

### Rule E: Shared-contact and unverified guardrails still apply

If the current exact-match safety rules would block auto-merge because of shared or unverified conditions:

- preserve the current blocked/no-auto-merge behavior
- do not let PeopleCore-first authority erase those safety rules

---

## In scope

- PeopleCore-first read authority for phone identity
- disagreement detection between PeopleCore authority and legacy neighbor candidates
- preserved fallback when PeopleCore has no current person link
- narrow resolver-review creation for disagreement if specified below
- telemetry / audit / shadow comparison for lookup outcomes
- characterization coverage
- architecture note updates

## Out of scope

- bulk backfill
- replacing neighbor CRUD routes with PeopleCore person CRUD
- application shell
- resolver UI / queue UI
- full rebinding engine
- PeopleCore-first timeline ownership
- household-based identity scoring expansion
- ML scoring
- hard performance budget enforcement beyond the current repo conventions

---

## Source-of-truth files to work in

Primary likely files:

- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/peoplecore/store.ts`
- `apps/connectshyft-api/src/modules/peoplecore/service.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
- `docs/architecture/identity-resolution-model.md`
- `docs/architecture/peoplecore-identity-seam.md`
- `docs/architecture/connectshyft-router-refactor-plan.md`

Potential supporting file if needed:

- `apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`

---

## Required telemetry / comparison model

Add a narrow internal comparison record for identity lookup execution. This does not need a database migration in this slice unless truly necessary. Start with audit/event emission if possible.

For each PeopleCore-aware lookup attempt, capture:

- tenantId
- orgUnitId if present
- normalizedContactPointValue
- peopleCoreOutcome: `single_match | no_match | multiple_matches | unavailable`
- peopleCoreSubjectIds
- legacyOutcome: `single_match | no_match | multiple_matches | unavailable`
- legacyNeighborIds
- finalOutcome: `single_match | no_match | multiple_matches | no_auto_merge | ambiguous`
- fallbackUsed: boolean
- disagreementDetected: boolean
- hookWriteAttempted: boolean
- hookWriteSucceeded: boolean

This is for safe migration visibility, not user-facing UI.

---

## Narrow resolver-review expansion allowed in this slice

Allowed:

- existing ambiguous shared-contact review creation
- a new narrow review trigger for **PeopleCore / legacy identity disagreement** if implemented minimally and deterministically

If added, use:

- `reviewType`: `identity_conflict`
- confidence band: `high`
- risk flag must include: `conflicting_name_dob` only if actually true, otherwise use `duplicate_creation_attempt` only if that is what happened, otherwise introduce no fake flag
- trigger source should be deterministic and idempotent

Default recommendation:

- reuse `identity_conflict`
- do not expand contract enums unless existing values are insufficient

---

## Data / contract expectations

Do not break existing contracts in `libs/contracts` unless a narrowly justified addition is required.

Default assumption:

- Slice 13 should avoid new contract enums
- Slice 13 should work with current `ResolverReview`, `ContactPoint`, and current identity outputs
- only update docs if code can remain within current contract surface

---

## Implementation plan

### Checkpoint 1: Characterize current and new authority cases before changing logic

Add or extend characterization tests that lock:

1. PeopleCore single current link + legacy same neighbor result
   - final result stays single_match / current allowed outcome

2. PeopleCore single current link + legacy different neighbor result
   - final result becomes ambiguity/manual resolution
   - no silent winner

3. PeopleCore multiple current links + legacy single candidate
   - final result is ambiguity/manual resolution
   - no legacy override

4. PeopleCore no current links + legacy single candidate
   - legacy single_match preserved

5. PeopleCore unavailable + legacy single candidate
   - current fallback preserved

6. Inbound SMS path:
   - PeopleCore single current link + legacy aligned -> do not create new neighbor
   - PeopleCore no current link + legacy no_match -> current create-new flow preserved
   - PeopleCore / legacy disagreement -> ambiguity path preserved, no arbitrary attach, no create-new

7. Identity-match route:
   - disagreement returns `IDENTITY_MATCH_AMBIGUOUS`
   - current manualResolution payload remains deterministic

8. Shared-contact case:
   - PeopleCore single current link with shared conditions still blocks auto-merge if current rules block it

Validation commands:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/identityBoundary.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts
pnpm nx run connectshyft-api:test
```

Commit:

```bash
git add .
git commit -m "test(slice-13): lock peoplecore authority and disagreement characterization"
```

Stop after Checkpoint 1.

---

## Checkpoint 2 — Implement PeopleCore-vs-legacy precedence and ambiguity policy

### Objective

Refactor the PeopleCore seam so it no longer treats PeopleCore lookup as observational-only when PeopleCore has current-link evidence. Preserve all locked route/result shapes, but change the seam decision policy so current PeopleCore evidence can force ambiguity instead of silently deferring to a legacy single winner.

### Scope

Edit only the minimum code necessary in:

- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` only if required by type fallout or dead-simple normalization of adapter outputs
- related unit tests only as required to satisfy the locked Checkpoint 1 characterization expectations

Do not edit route handlers, HTTP envelopes, contracts, migrations, or PeopleCore store/service APIs in this checkpoint.

### Locked policy to implement

Treat these as hard rules:

1. **Legacy-only remains legacy-owned**
   - If PeopleCore is unavailable, has no contact point for the normalized value, or has no current person links for that contact point, preserve existing ConnectShyft legacy candidate behavior unchanged.
   - This means:
     - legacy single eligible neighbor stays single-match / current legacy result
     - legacy no-match stays no-match
     - legacy ambiguous stays ambiguous

2. **PeopleCore current-link evidence is authoritative enough to block a silent winner**
   - If PeopleCore returns one or more current person links for the normalized contact point, the seam must no longer silently trust a conflicting legacy single winner.

3. **Single PeopleCore current person + single legacy neighbor disagreement => ambiguous**
   - If PeopleCore has exactly one distinct current linked person for the normalized contact point, and legacy fallback resolves exactly one candidate neighbor, but the seam cannot prove they are the same underlying subject, return ambiguity.
   - Do not return single_match in this situation.
   - Do not invent a mapping.
   - Do not auto-merge.
   - Do not create a provisional identity.
   - This ambiguity must preserve the existing `IDENTITY_MATCH_AMBIGUOUS` result shape and manual-resolution context.

4. **Multiple PeopleCore current linked people => ambiguous**
   - If PeopleCore has more than one distinct current linked person for the normalized contact point, return ambiguity even if legacy fallback has exactly one candidate neighbor.
   - This is a hard stop.

5. **Shared/unverified legacy guardrails still apply**
   - If legacy candidate behavior already yields no-auto-merge due to shared or unverified conditions, preserve that.
   - Do not weaken existing shared-contact safety rules.

6. **No new neighbor<->person mapping layer in this checkpoint**
   - Do not add a person-to-neighbor crosswalk table.
   - Do not infer equivalence from names or other heuristics.
   - Do not join PeopleCore persons to ConnectShyft neighbors.
   - This checkpoint is precedence and refusal policy only.

7. **Hook side effects remain best-effort**
   - Existing best-effort hook behavior stays best-effort.
   - Resolver-review creation on ambiguous flows may continue.
   - No-match provisional creation must not fire when the seam now returns ambiguity.

### Implementation guidance

Refactor `peoplecoreIdentityAdapter.ts` to introduce an explicit intermediate decision layer before returning the final boundary result.

Recommended shape:

- Add small internal helpers for:
  - collecting distinct current linked PeopleCore person IDs from `peopleCoreCurrentLinks`
  - determining whether PeopleCore has authoritative current-link evidence
  - determining whether fallback legacy candidates are:
    - none
    - single
    - multiple
  - deciding whether the seam must override legacy single-winner behavior to ambiguity

- Keep the existing normalized lookup loading path.
- Keep existing fallback candidate loading path.
- Keep existing call into the legacy boundary logic where appropriate.
- Add a seam-level override step after lookup and before final return:
  - if PeopleCore has no authoritative current-link evidence, return the legacy boundary result unchanged
  - if PeopleCore has multiple distinct current person IDs, force ambiguous result
  - if PeopleCore has one distinct current person ID and legacy result is a single-match winner, force ambiguous result unless a same-subject proof exists
  - since there is currently no same-subject proof mechanism, this case is ambiguous by policy

### Important constraint on result construction

Do **not** create a new route/result shape.

Use the same result family already used by `identityBoundary.ts`:

- ambiguous must still be `ok: false`
- code must still be `IDENTITY_MATCH_AMBIGUOUS`
- manualResolution payload must still exist
- `candidateNeighborIds` must remain deterministic and sorted from the legacy candidate side when present

For the resolver seam:

- the resolver should continue translating ambiguous boundary results into:
  - `type: 'multiple_matches'`
  - sorted `candidateNeighborIds`
  - normalized contact point

### Candidate-neighbor rules for forced ambiguity

When ambiguity is forced due to PeopleCore evidence:

- If legacy fallback produced one or more candidate neighbors, use those neighbor IDs as the `candidateNeighborIds`
- If legacy fallback produced multiple candidate neighbors, preserve that full set
- If legacy fallback produced exactly one candidate neighbor, return that one candidate in the ambiguity payload
- If legacy fallback produced zero candidate neighbors but PeopleCore has multiple current people, still return ambiguity, with an empty `candidateNeighborIds` array if necessary rather than inventing fake neighbor IDs

### Non-goals

Do not do any of the following in this checkpoint:

- no PeopleCore-to-neighbor reconciliation model
- no resolver UI work
- no contract changes
- no route handler changes
- no webhook orchestration rewrites
- no inbound create-new flow redesign
- no scoring/ranking engine

### Required validation

Run exactly these commands after implementation:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts

pnpm nx run connectshyft-api:test
```

### Completion criteria

Checkpoint 2 is complete only when all of the following are true:

- the three current blocker tests now pass
- no Checkpoint 1 characterization expectations were weakened
- route response shapes remain unchanged
- ambiguous/manual-resolution payloads remain deterministic
- no production code outside the seam was changed except truly minimal fallout

### Commit rule

If validation passes and there are no blockers, commit all uncommitted changes for this checkpoint as:

```bash
refactor(slice-13): enforce peoplecore identity precedence ambiguity policy
```

If blockers remain, do not commit. Report:

- what failed
- why
- the smallest next change required

---

### Checkpoint 3: Enforce PeopleCore-first authority rules in final identity decisions

Wire the new comparison rules into final outcome determination.

Required outcomes:

- PeopleCore single + legacy same => current single-match outcome
- PeopleCore single + legacy none => single-match outcome still allowed
- PeopleCore single + legacy different => ambiguity/manual resolution
- PeopleCore multi => ambiguity/manual resolution
- PeopleCore none => legacy path preserved
- PeopleCore unavailable => legacy path preserved

Important:

- preserve current `IDENTITY_MATCH_AMBIGUOUS` route code where that is the current external behavior
- preserve current manualResolution structure
- preserve current no-auto-merge behavior when shared/unverified safety conditions apply

This checkpoint may require narrow changes in:

- `identityBoundary.ts`
- `identityResolver.ts`
- `neighbors.ts`

But do not broaden beyond authority logic.

Validation commands:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/identityBoundary.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

Commit:

```bash
git add .
git commit -m "feat(slice-13): enforce peoplecore-first identity authority with explicit disagreement ambiguity"
```

Stop after Checkpoint 3.

---

### Checkpoint 4: Add narrow disagreement telemetry / audit

Add internal telemetry or audit emission for authority comparison outcomes.

Requirements:

- no user-facing contract change required
- keep implementation minimal
- prefer existing audit/event infrastructure over new schema
- no migration unless absolutely necessary

Telemetry must capture:

- normalized phone
- peopleCore outcome
- legacy outcome
- final outcome
- fallbackUsed
- disagreementDetected

Add focused tests proving:

- disagreement records are emitted
- fallback path records fallbackUsed=true
- PeopleCore unavailable records peopleCoreOutcome=unavailable
- no duplicate noisy emissions for one evaluation path

Validation commands:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts
pnpm nx run connectshyft-api:test
```

Commit:

```bash
git add .
git commit -m "feat(slice-13): add authority comparison telemetry for peoplecore identity seam"
```

Stop after Checkpoint 4.

---

### Checkpoint 5: Add narrow resolver-review creation for disagreement only if needed

Only do this if the checkpoint 1-4 implementation leaves unresolved disagreement without durable review signal.

If implemented:

- trigger only on PeopleCore single-vs-legacy conflicting identity ownership
- use deterministic triggerSourceType and triggerSourceId
- keep best-effort behavior
- avoid duplicate review creation for the same trigger

Recommended trigger source:

- `connectshyft_identity_authority_disagreement`

Recommended review type:

- `identity_conflict`

Do not add this if telemetry plus ambiguity is already sufficient and tests/documents show it is deferred. Choose the minimal safe path.

Validation commands:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/peoplecoreIdentityHooks.test.ts \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

Commit:

```bash
git add .
git commit -m "feat(slice-13): add narrow resolver review hook for identity authority disagreement"
```

Stop after Checkpoint 5.

---

### Checkpoint 6: Lock docs and roadmap

Update architecture docs to reflect the new reality:

Required doc updates:

- `docs/architecture/identity-resolution-model.md`
- `docs/architecture/peoplecore-identity-seam.md`
- `docs/architecture/peoplecore-connectshyft-boundary-matrix.md`
- `docs/architecture/connectshyft-router-refactor-plan.md`

Required content:

- PeopleCore is now first read authority for phone identity when current links exist
- ConnectShyft neighbor remains compatibility shell for CRUD and fallback
- disagreement policy is explicit ambiguity, never silent preference
- bulk migration remains deferred
- Slice 14 should likely target compatibility-shell reduction or application-shell groundwork, depending repo state at that point

Also add one narrow note file if needed:

- `apps/connectshyft-api/src/modules/connectshyft/PEOPLECORE_AUTHORITY_NOTES.md`

Validation commands:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
cd apps/connectshyft-web && npm run build
cd apps/connectshyft-web && npm run test
```

Commit:

```bash
git add .
git commit -m "docs(slice-13): lock peoplecore read authority and connectshyft compatibility shell"
```

Stop after Checkpoint 6.

---

## Testing obligations

You must preserve or extend characterization coverage for:

- identity ambiguity
- inbound SMS no-match create flow
- inbound SMS single-match no-create flow
- PeopleCore unavailable fallback
- shared-contact no-auto-merge behavior
- deleted-only legacy exclusions where already characterized
- disagreement ambiguity behavior

You must not remove existing characterization tests to make the slice pass.

---

## Required acceptance criteria

1. PeopleCore exact single current person link is first authority for phone identity resolution.
2. PeopleCore multiple current person links always produce ambiguity/manual resolution.
3. PeopleCore absence preserves current legacy fallback behavior.
4. PeopleCore and legacy disagreement never results in silent winner selection.
5. Existing ConnectShyft route contracts remain intact.
6. Inbound SMS still functions for aligned single-match and no-match create paths.
7. Telemetry or audit captures comparison outcomes.
8. Neighbor CRUD remains operational and unchanged at route-contract level.
9. All tests pass.
10. PR CI is green.

---

## Commands for final validation

Run all of the following before opening PR:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/modules/connectshyft/__tests__/identityBoundary.test.ts \
  src/modules/connectshyft/__tests__/identityResolver.test.ts \
  src/modules/connectshyft/__tests__/peoplecoreIdentityAdapter.test.ts \
  src/modules/connectshyft/__tests__/peoplecoreIdentityHooks.test.ts \
  src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts

pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
cd apps/connectshyft-web && npm run build
cd apps/connectshyft-web && npm run test
```

If any workspace lock or dependency metadata changed:

```bash
pnpm install --frozen-lockfile
```

If that fails because lockfiles need sync, update the workspace lock properly before opening PR.

---

## PR instructions

Branch name:

```bash
git checkout -b codex/slice-13-peoplecore-read-authority-and-compat-shell
```

PR title:

```text
feat(slice-13): make peoplecore first read authority for connectshyft identity
```

PR summary must state:

- PeopleCore-first identity read authority is now enforced where current links exist
- disagreement is explicit ambiguity
- legacy neighbor lookup remains fallback and compatibility shell
- no bulk migration was attempted
- route contracts were preserved

---

## Done definition

Slice 13 is done only when:

- authority precedence is implemented
- disagreement is explicit ambiguity
- current route contracts remain stable
- telemetry exists
- docs are updated
- CI is green

---

## Explicitly deferred to later slice

- full PeopleCore-backed candidate scoring across additional signals
- rebinding engine
- person-first CRUD cutover
- deprecating `neighbors.ts`
- resolver UI / queue experience
- application shell
- bulk backfill / migration tooling

---

## Counterpoint

The tempting move is to make PeopleCore authoritative and simultaneously collapse `neighbors.ts` into a much smaller shell. Do not do that in this slice. The repo still shows broad direct neighbor dependencies across routes, handlers, inbound flows, and tests. Combining read-authority shift with major shell reduction would be unnecessary blast radius.

The right move here is authority shift first, shell reduction later.
