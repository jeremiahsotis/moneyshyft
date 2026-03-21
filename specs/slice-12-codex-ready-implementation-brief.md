# Slice 12 Implementation Brief
## Title
PeopleCore identity foundation plus ConnectShyft identity seam

## Branch
`codex/slice-12-peoplecore-identity-foundation-and-connectshyft-seam`

## Why this slice exists
Slices 4 through 11 intentionally extracted and stabilized the ConnectShyft route layer without redesigning identity ownership. That was the right call. It reduced router risk first, fixed build/test isolation, and preserved current behavior.

Now the repo is ready for the next move: establish the real PeopleCore identity foundation and introduce a clean seam so ConnectShyft can stop being the long-term owner of person identity logic.

This slice is **not** the full PeopleCore product.
This slice is **not** the Application Shell.
This slice is **not** a UI slice.
This slice is **not** a behavior-redesign slice.

This slice is the **foundation slice** that makes later identity-resolution work, ConnectShyft refinement, and Shell integration safe.

---

## Locked outcome for Slice 12
By the end of this slice:

1. PeopleCore has real persistence-backed core identity tables/contracts for the already-locked MVP identity model.
2. ConnectShyft has a **non-breaking identity seam** that can evaluate identity through a dedicated PeopleCore-oriented boundary.
3. Existing ConnectShyft identity-match, inbound SMS subject resolution, and neighbor-create guardrails keep their current response shapes and current behavior unless explicitly preserved through characterization.
4. Resolver review and provisional identity concepts exist as persistence-backed domain objects, even if not yet fully exposed in end-user UI.
5. We do **not** migrate full ownership of ConnectShyft neighbors into PeopleCore yet. We introduce the seam and the foundation first.

---

## Best-practice recommendation
Build Slice 12 in two layers:

- **Layer 1:** persistence-backed PeopleCore domain foundation
- **Layer 2:** ConnectShyft-to-PeopleCore identity seam adapter

Do **not** attempt full neighbor replacement, conversation rebinding, or Application Shell wiring in this slice.

That is the safest path because it preserves current ConnectShyft throughput while making future identity convergence concrete instead of theoretical.

---

## Non-negotiable architectural rules
These are already locked and this slice must honor them:

1. **A contact point is not a person.**
2. **Conversations can exist without a resolved person.**
3. **Work must continue when identity is uncertain.**
4. **Identity correction must preserve history, not overwrite it.**
5. **ConnectShyft conversation continuity stays anchored to contact-point plus orgUnit, not directly to person.**
6. **PeopleCore becomes source of truth for person/contact-point/household/resolver-review concepts, but Slice 12 does not force a destructive migration to get there.**
7. **No breaking changes to current ConnectShyft route envelopes in this slice.**
8. **No UI-first drift. Persistence and seam first.**

---

## In scope
### PeopleCore domain foundation
- persistence-backed `Person`
- persistence-backed `Household`
- persistence-backed `HouseholdMembership`
- persistence-backed `ContactPoint`
- persistence-backed `ContactPointLink`
- persistence-backed `ContactPointEvent`
- persistence-backed `ResolverReview`
- provisional/confirmed person state support
- identity confidence band persistence support where needed
- contract alignment with existing docs and `libs/contracts`

### ConnectShyft identity seam
- dedicated adapter/boundary that lets ConnectShyft ask:
  - resolve subject by contact point
  - evaluate identity candidates
  - register provisional identity / resolver review hooks where appropriate
- no route envelope changes
- no provider/correlation/telephony redesign
- no thread model redesign
- no timeline redesign

### Docs
- lock the seam architecture
- lock what still remains ConnectShyft-owned
- lock what will move later
- lock what Slice 13 should target

---

## Out of scope
- Application Shell implementation
- People UI
- Resolver UI
- full case/workflow integration
- full conversation rebinding engine
- destructive neighbor-to-person migration
- replacing ConnectShyft neighbor APIs with PeopleCore APIs
- voicemail/call/provider redesign
- transport/provider refactor
- broad cross-module rename churn
- speculative “cleanups” outside this slice

---

## Important repo context this slice must honor
### Workspace/tooling
- Monorepo uses `pnpm` + `nx`
- Root config of record:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `nx.json`
  - `tsconfig.base.json`

### Existing ConnectShyft identity-related implementation already present
- `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/phoneIdentityContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`

### Existing PeopleCore/domain direction already present
- `domains/people/**`
- `libs/contracts/src/people/**`
- `libs/contracts/src/subject-context.ts`
- `tests/integration/peoplecore/**`

### Existing tenancy/context patterns that should be reused, not reinvented
- `apps/connectshyft-api/src/modules/connectshyft/contextAccess.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/accessContext.ts`
- `apps/connectshyft-api/src/platform/tenancy/orgUnitAccess.ts`
- `apps/connectshyft-api/src/platform/tenancy/requestContext.ts`
- `apps/connectshyft-api/src/platform/tenantModuleEntitlements.ts`

### Relevant migration examples already in repo
- `shared/database/migrations/20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.ts`
- `shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts`
- `shared/database/migrations/20260318143000_add_connectshyft_neighbor_phone_uniqueness.ts`

These show the current migration style and the current level of identity shaping that ConnectShyft already carries.

---

## What Slice 12 is really doing
This slice creates the **bridgehead**.

Today:
- ConnectShyft has neighbor-centered identity behavior
- PeopleCore has early domain/contracts/docs but not the full persistence-backed operational foundation

After Slice 12:
- PeopleCore has the real persisted identity substrate
- ConnectShyft can call through a seam
- later slices can gradually move identity authority behind that seam
- route/API stability is preserved

---

# Implementation plan

## Checkpoint 1
### Goal
Characterize and lock the current ConnectShyft identity behavior that must not drift during seam introduction.

### Add characterization coverage for:
1. current identity-match envelopes
2. inbound SMS subject resolution outcomes
3. neighbor create/update duplicate-phone and ambiguity guardrails that interact with identity
4. any existing refusal mapping that would be at risk when shifting to a PeopleCore-backed seam

### Required new or updated tests
Add targeted characterization coverage under the existing route/module test structure, using the current style already established in slices 7 through 11.

At minimum, cover:
- `connectshyft.identity-match.test.ts` if needed to pin current route behavior more explicitly
- current inbound SMS identity-related behavior if not already sufficiently pinned by webhook characterization
- current `identityBoundary` / `identityResolver` exact outcomes for:
  - unique exact phone match
  - no match
  - ambiguous multi-match
  - shared contact no-auto-merge
  - deleted-only lookup exclusion if applicable
  - normalization invariants

### Validation
Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/modules/connectshyft/__tests__/identityBoundary.test.ts   src/modules/connectshyft/__tests__/identityResolver.test.ts   src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-identity-merge.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts
```

Then run:

```bash
pnpm nx run connectshyft-api:test
```

### Stop point
Stop after characterization passes and commit.

### Commit message
`test(slice-12): lock connectshyft identity behavior before peoplecore seam`

---

## Checkpoint 2
### Goal
Add persistence-backed PeopleCore core tables and contracts.

### Implement
Add shared migrations for PeopleCore identity foundation. Follow the current migration style in `shared/database/migrations`.

Create migrations for:
- people/persons
- people/households
- people/household_memberships
- people/contact_points
- people/contact_point_links
- people/contact_point_events
- people/resolver_reviews

### Schema expectations
#### persons
Fields should support:
- id
- tenant_id
- org_unit_id
- first_name
- last_name
- preferred_name nullable
- status with locked values:
  - active_confirmed
  - active_provisional
  - archived
  - suppressed
  - merged
- merged_into_person_id nullable
- created_at_utc
- updated_at_utc

#### households
- id
- tenant_id
- org_unit_id
- name nullable
- status
- created_at_utc
- updated_at_utc

#### household_memberships
- id
- household_id
- person_id
- role
- is_current
- start_at_utc nullable
- end_at_utc nullable
- created_at_utc
- updated_at_utc

#### contact_points
- id
- tenant_id
- type
- normalized_value
- raw_value nullable
- status:
  - active_personal
  - active_shared_possible
  - active_shared_confirmed
  - stale
  - reassignment_suspected
  - archived
- first_seen_at_utc
- last_seen_at_utc
- last_inbound_at_utc nullable
- last_outbound_at_utc nullable
- suspected_shared
- confirmed_shared
- reassignment_suspected
- created_at_utc
- updated_at_utc

#### contact_point_links
- id
- contact_point_id
- subject_type:
  - person
  - household
- subject_id
- link_type:
  - primary
  - secondary
  - historical
  - unknown
- confidence_band:
  - very_low
  - low
  - medium
  - high
  - very_high
- is_current
- is_primary
- manually_confirmed
- confirmation_source nullable
- first_linked_at_utc
- last_confirmed_at_utc nullable
- last_used_at_utc nullable
- linked_by
- linked_by_user_id nullable
- unlink_reason nullable
- unlinked_at_utc nullable
- created_at_utc
- updated_at_utc

#### contact_point_events
- id
- tenant_id
- contact_point_id
- event_type:
  - inbound_seen
  - outbound_seen
  - state_changed
  - reassignment_suspected
  - shared_detected
  - stale_detected
- event_source
- related_object_type nullable
- related_object_id nullable
- created_at_utc

#### resolver_reviews
- id
- tenant_id
- org_unit_id
- review_type
- review_status
- priority
- trigger_source_type
- trigger_source_id
- conversation_id nullable
- provisional_person_id nullable
- candidate_person_ids JSONB or equivalent
- contact_point_id nullable
- confidence_band
- confidence_reasons JSONB or equivalent
- risk_flags JSONB or equivalent
- requested_by_user_id
- assigned_resolver_user_id nullable
- requested_at_utc
- started_at_utc nullable
- resolved_at_utc nullable
- resolution_type nullable
- resolution_reason nullable
- resolution_notes nullable

### Also do
- add migration tests in current style
- update or confirm `libs/contracts/src/people/*` match the schema decisions
- do not bloat contracts beyond what is already locked

### Validation
Run migration-related tests you add plus:

```bash
pnpm nx run contracts:test
pnpm nx run connectshyft-api:test
```

### Stop point
Stop after migrations, tests, and contracts are in place and committed.

### Commit message
`feat(slice-12): add peoplecore identity foundation persistence`

---

## Checkpoint 3
### Goal
Add PeopleCore persistence-backed services/stores, without yet forcing ConnectShyft to adopt them everywhere.

### Implement
Create persistence-backed PeopleCore services/modules in a sane location consistent with the repo. Recommended location:

- `domains/people/**` for pure/domain logic
- `apps/connectshyft-api/src/modules/peoplecore/**` or equivalent application-facing store/service layer

Do not jam persistence code into the existing in-memory domain helper files unless there is a very clear existing convention. Best practice is:
- domain types/rules stay domain-level
- persistence/store adapters live app/module-side

### Required capabilities
Implement stores/services for:
- person create/get/list minimal operations
- household create/get
- household membership create/list
- contact point create/get/list by normalized value
- contact point link create/list current links
- contact point event append/list minimal operations
- resolver review create/get/list minimal operations

### Guardrails
- preserve current domain naming
- do not overbuild full CRUD if unused
- build only the minimal persistence operations needed for the seam and future slices
- ensure tenant-scoping everywhere
- ensure orgUnit scoping where applicable
- follow existing persistence error handling patterns

### Tests
Add focused module/service tests for the new stores/services.

### Validation
Run the new PeopleCore tests and then:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Stop point
Stop after stores/services are in place and committed.

### Commit message
`feat(slice-12): add peoplecore persistence services`

---

## Checkpoint 4
### Goal
Introduce the ConnectShyft-to-PeopleCore identity seam.

### Implement
Create a dedicated seam adapter. Recommended naming:

- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- optionally `apps/connectshyft-api/src/modules/peoplecore/subjectResolution.ts` if that separation reads cleaner

### The seam should support
At minimum:
- resolve subject by contact point
- evaluate identity candidates for a contact point
- return deterministic outcomes compatible with current ConnectShyft expectations
- expose normalized contact-point value
- preserve ambiguous/manual-resolution semantics

### Important
This seam is **not** a public API redesign.
It is an internal authority seam.

### ConnectShyft code to rewire carefully
Current likely touchpoints:
- `identityBoundary.ts`
- `identityResolver.ts`
- neighbor create / inbound SMS resolution paths that currently depend on ConnectShyft-local neighbor phone lookup

### Required behavior
Externally preserve:
- current success/refusal shapes
- current normalization behavior
- current ambiguous behavior
- current no-match behavior
- current shared-contact behavior
- current deleted-only exclusion behavior where already pinned

### Best practice
Do this by introducing an adapter beneath the current boundary, not by rewriting the route layer.

### Tests
Add seam-focused tests that prove:
- current ConnectShyft identity behavior is preserved
- adapter uses PeopleCore-backed lookup path
- ConnectShyft route/module contracts remain unchanged

### Validation
Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/modules/connectshyft/__tests__/identityBoundary.test.ts   src/modules/connectshyft/__tests__/identityResolver.test.ts   src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts
```

Then:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Stop point
Stop after seam is introduced and committed.

### Commit message
`refactor(slice-12): add peoplecore identity seam for connectshyft`

---

## Checkpoint 5
### Goal
Add provisional-person and resolver-review creation hooks behind the seam where they are safe and non-breaking.

### Implement
Introduce the minimal write-side hooks needed so future slices do not need to invent them from scratch.

Examples:
- when a no-match/new-subject path occurs in the seam, support creating a provisional person record in PeopleCore **only where safe and non-breaking**
- when ambiguous/high-friction conditions occur, support creating or preparing resolver-review records **without changing current route envelopes**

### Important constraint
Do **not** force ConnectShyft neighbor creation to fully become “create Person instead.”
That migration is later.

Instead:
- create the persistence and hook points
- optionally dual-write in carefully bounded internal flows if safe
- preserve current ConnectShyft output behavior

### Acceptable result for this slice
A minimal internal foundation such as:
- helper for creating provisional PeopleCore person
- helper for creating resolver review
- tests proving those hooks exist and are properly tenant/orgUnit scoped
- documentation of where those hooks are invoked now versus later

### Validation
Run targeted tests plus:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Stop point
Stop after hook foundation is in place and committed.

### Commit message
`feat(slice-12): add provisional identity and resolver review hooks`

---

## Checkpoint 6
### Goal
Lock the architecture and set up Slice 13 cleanly.

### Create/update docs
Create or update the following docs as needed:

1. `docs/architecture/peoplecore-identity-seam.md`
2. `docs/architecture/peoplecore-persistence-foundation.md`
3. update `docs/architecture/peoplecore-domain-model.md`
4. update `docs/architecture/identity-resolution-model.md`
5. update `docs/architecture/peoplecore-connectshyft-boundary-matrix.md`
6. update `docs/architecture/connectshyft-router-refactor-plan.md` to note that route extraction is done and identity convergence foundation now exists

### Required content
Document:
- what PeopleCore now owns in persistence
- what ConnectShyft still owns
- what the seam does
- what is still deferred
- what Slice 13 should target

### Slice 13 target recommendation
After Slice 12, Slice 13 should likely be:
- ConnectShyft identity refinement and controlled migration of more identity authority behind the seam
- not Application Shell yet, unless you intentionally want to pivot

### Validation
Run:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
cd apps/connectshyft-web && npm run build && npm run test
```

### Stop point
Stop after docs are updated and committed.

### Commit message
`docs(slice-12): lock peoplecore identity foundation and seam architecture`

---

# Constraints Codex must follow
1. Do not regenerate broad docs from scratch unless necessary.
2. Preserve existing route envelopes exactly where already characterized.
3. Preserve current ConnectShyft identity-match semantics unless a test proves a drift and the brief explicitly allows it. It does not.
4. Preserve current inbound SMS subject-resolution semantics unless already characterized otherwise. It does not.
5. Do not refactor provider, telephony, webhook, bridge, canonical-event, or routing internals in this slice.
6. Do not do Application Shell work in this slice.
7. Do not invent a full People UI in this slice.
8. Do not replace ConnectShyft neighbors with PeopleCore persons at the API boundary in this slice.
9. Prefer seam introduction over replacement.
10. Reuse existing tenancy/capability/context patterns.

---

# Counterpoint
The tempting move is to skip the seam and directly replace ConnectShyft identity with PeopleCore everywhere now.

That would be the wrong move.

Why:
- too much surface area
- too many ways to drift response contracts
- too easy to break inbound flows
- too easy to confuse identity foundation with full operational migration

The seam-first approach is slower by one slice and safer by an order of magnitude.

---

# Expected file/work areas
## Likely touched
- `shared/database/migrations/*`
- `apps/connectshyft-api/src/migrations/__tests__/*`
- `domains/people/*`
- `libs/contracts/src/people/*`
- `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- new PeopleCore persistence/service files
- architecture docs

## Likely not touched
- ConnectShyft route family handlers except only where seam wiring requires it
- provider registry internals
- bridge sessions
- canonical events
- thread routing logic
- frontend shell/navigation

---

# Validation matrix
## Minimum per checkpoint
Use the checkpoint-specific commands above.

## Before PR
Run all of:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
cd apps/connectshyft-web && npm run build && npm run test
```

If migrations or migration tests changed materially, also ensure the relevant migration tests pass.

---

# PR guidance
## PR title
`Feat: add PeopleCore identity foundation and ConnectShyft seam`

## PR description must state
- current ConnectShyft behavior preserved
- PeopleCore persistence added
- identity seam introduced
- no Application Shell work
- no telephony/provider redesign
- next slice recommendation

---

# Definition of done
Slice 12 is done only when all of the following are true:

1. PeopleCore persistence foundation exists in code and migrations.
2. Contracts align with the locked docs.
3. ConnectShyft identity behavior is characterized and preserved.
4. ConnectShyft identity calls through a seam that can be evolved later.
5. Provisional identity and resolver review foundations exist in persistence-backed form.
6. Tests pass.
7. Docs are updated.
8. The branch is ready for a clean Slice 13 without re-litigating ownership.

---

# Final lock
This slice is a **foundation and seam** slice.

It is **not** the full identity migration.
It is **not** the shell.
It is **not** the resolver UI.
It is **not** the case workflow bridge.

Build the floor first so the next slices stop standing on plywood.
