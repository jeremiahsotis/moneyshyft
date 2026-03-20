# Codex Implementation Brief — Slice 7
## ConnectShyft Neighbors + Identity Bridge Extraction (Repo-Specific)

## Read this first

This brief is written to be pasted directly into Codex.

It is intentionally explicit so Codex does not improvise architecture, file locations, or scope.

### Slice 7 objective

Extract the ConnectShyft neighbor and identity bridge route family into thin-router handlers while preserving exact current response shapes and exact current merge behavior.

This slice should also add very light preparation for future PeopleCore convergence, without rewriting the current ConnectShyft neighbor model.

### Routes in scope

This slice covers only the ConnectShyft neighbor / identity bridge family:

- `POST /api/v1/connectshyft/neighbors`
- `GET /api/v1/connectshyft/neighbors`
- `GET /api/v1/connectshyft/neighbors/:neighborId`
- `PUT /api/v1/connectshyft/neighbors/:neighborId`
- `DELETE /api/v1/connectshyft/neighbors/:neighborId`
- `POST /api/v1/connectshyft/neighbors/identity-match`
- `POST /api/v1/connectshyft/neighbors/merge`

### Locked behavioral decisions

- Preserve exact current response shapes.
- Preserve current merge behavior exactly.
- Slice 7 is route extraction plus very light preparation for future PeopleCore convergence.
- Do not tighten semantics in this slice beyond what is already pinned by characterization tests.

### Hard rules

- Do not restructure the repo.
- Do not broaden `connectshyft-api:test` to the full legacy surface.
- Do not change route paths.
- Do not redesign neighbor or identity payloads.
- Do not rewrite merge behavior.
- Do not move outbound logic into this slice.
- Do not move webhook or telephony logic into this slice.
- Keep current tests green.
- Preserve current behavior unless a characterization test explicitly documents and approves the change.

### Why this slice exists

After Slice 4, Slice 5, and Slice 6, the next architectural knot is the ConnectShyft neighbor / identity seam.

This is the place where:
- ConnectShyft local neighbor CRUD still lives
- identity matching lives
- merge behavior lives
- future PeopleCore convergence will eventually need a cleaner handoff

This slice should make that seam explicit without rewriting the product model yet.

---

## Checkpoint structure

This work should be done in five checkpoints.

After each checkpoint:
1. run the required validation commands
2. inspect results
3. create a commit before moving to the next checkpoint

---

# Checkpoint 1 — Add characterization tests for neighbor CRUD and identity bridge routes

## Goal

Pin current neighbor and identity behavior before moving code.

## Create these files

```text
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbor-create.characterization.test.ts
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbor-list-detail.characterization.test.ts
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbor-update-delete.characterization.test.ts
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbor-identity-merge.characterization.test.ts
```

## Scope

Add characterization coverage for:

- create neighbor
- list neighbors
- get neighbor detail
- update neighbor
- soft delete neighbor
- identity match
- merge

## What to pin

### Create
Pin:
- success response envelope and current shape
- phone validation refusal behavior
- duplicate phone refusal behavior
- current context/capability refusal behavior

### List + detail
Pin:
- success response envelope and current shape
- deleted-neighbor access behavior if applicable
- current not-found behavior
- current scope payload behavior

### Update + delete
Pin:
- success response envelope and current shape
- current relationship-gate / tenant-privileged behavior if present
- current delete confirmation behavior
- current side-effects persisted flags if present

### Identity match + merge
Pin:
- identity-match success response shape
- ambiguous/no-match/auto-merge-allowed response behavior
- current merge success response shape
- current merge confirmation and invalid-request refusal behavior
- current merge side-effects fields if present

## Important rule

Use the existing route harness patterns already present in:
- `connectshyft.neighbors.test.ts`
- `connectshyft.identity-match.test.ts`

Do not invent a new full-stack harness.

## Validation after Checkpoint 1

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.neighbor-create.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-list-detail.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-update-delete.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-identity-merge.characterization.test.ts
```

## Commit after Checkpoint 1

Suggested commit message:

```text
test(slice-7): add connectshyft neighbor and identity characterization tests
```

---

# Checkpoint 2 — Add neighbor/identity handlers and helper boundary

## Goal

Create the thin-router target structure for neighbor CRUD and identity bridge routes without changing router usage yet.

## Create these files

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNeighborCreate.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectNeighbors.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectNeighborDetail.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectNeighbor.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/deleteConnectNeighbor.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNeighborIdentityMatch.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNeighborMerge.ts
apps/connectshyft-api/src/modules/connectshyft/http/neighborIdentityContext.ts
```

## Update file

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/index.ts
```

Export the new handlers.

## File responsibilities

### `http/neighborIdentityContext.ts`
Create a small helper boundary for neighbor and identity routes only.

It should centralize:
- module capability entry checks where repeated
- orgUnit context resolution
- neighborId param parsing where needed
- current read/update/delete capability and policy prerequisite resolution
- current include-deleted or relationship-gated prerequisite resolution where repeated
- shared identity-match and merge prerequisite loading where repeated

This helper may call existing route-local helper functions temporarily if necessary, but should reduce duplication and prepare for thin-router delegation.

### Handler files
Each handler should:
- accept `req`, `res`
- call the helper boundary
- invoke the existing neighbor / identity / merge logic
- preserve the exact current response shape

## Light PeopleCore-prep rule

In this checkpoint only add very light prep such as:
- clearer naming around "neighbor identity bridge"
- clearer comments or notes indicating what remains ConnectShyft-local vs future PeopleCore seam

Do not:
- replace neighbor storage with PeopleCore
- redesign merge behavior
- move to PeopleCore contracts yet

## Validation after Checkpoint 2

Run:
- the Checkpoint 1 characterization tests
- `pnpm nx run connectshyft-api:test`

## Commit after Checkpoint 2

Suggested commit message:

```text
refactor(slice-7): add connectshyft neighbor and identity handlers
```

---

# Checkpoint 3 — Convert neighbor and identity routes to thin-router usage

## Goal

Make the router thinner for the full neighbor / identity bridge family only.

## Update file

```text
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

## Convert only these routes

- `POST /neighbors`
- `GET /neighbors`
- `GET /neighbors/:neighborId`
- `PUT /neighbors/:neighborId`
- `DELETE /neighbors/:neighborId`
- `POST /neighbors/identity-match`
- `POST /neighbors/merge`

Replace inline route bodies with thin handler delegation.

## Rules

- keep route paths exactly the same
- keep route order stable unless required for correctness
- keep exact response behavior stable
- remove route-local logic for these routes only if fully moved

Do not touch:
- thread read routes
- lifecycle routes
- outbound routes
- webhook routes

## Validation after Checkpoint 3

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.neighbor-create.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-list-detail.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-update-delete.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-identity-merge.characterization.test.ts
pnpm nx run connectshyft-api:test
```

## Commit after Checkpoint 3

Suggested commit message:

```text
refactor(slice-7): convert connectshyft neighbor and identity routes to thin router
```

---

# Checkpoint 4 — Add focused helper tests and update canonical router plan

## Goal

Make the neighbor / identity bridge boundary explicit and harder to regress.

## Create this file

```text
apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.neighborIdentityContext.test.ts
```

## Update this file

```text
docs/architecture/connectshyft-router-refactor-plan.md
```

## `handlers.neighborIdentityContext.test.ts`
Add focused tests for the helper boundary.

Test:
- valid context resolution path
- neighborId parsing where relevant
- refusal mapping for missing/invalid neighborId where deterministic
- refusal mapping for merge prerequisites and identity-match prerequisites where deterministic
- guardrail that this helper stays limited to neighbor/identity prerequisites and does not absorb outbound or webhook behavior

## Doc update
Update the canonical router refactor plan to reflect:
- Slice 4 completed
- Slice 5 thread read surface extracted
- Slice 6 lifecycle actions extracted
- Slice 7 neighbor / identity bridge extracted
- next planned extraction target is outbound actions
- inbound/webhooks remain intentionally deferred
- PeopleCore convergence remains future seam work, not completed in Slice 7

## Validation after Checkpoint 4

Run:
- characterization tests
- new helper tests
- narrow integration suite

## Commit after Checkpoint 4

Suggested commit message:

```text
docs(slice-7): update connectshyft router refactor plan for neighbor identity extraction
```

---

# Checkpoint 5 — Add neighbor/identity handler guardrails and bridge notes

## Goal

Leave behind clear guardrails for future outbound extraction and document the light PeopleCore seam preparation.

## Create this file

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/NEIGHBOR_IDENTITY_BRIDGE_NOTES.md
```

## `NEIGHBOR_IDENTITY_BRIDGE_NOTES.md`
Document:
- current ownership of neighbor CRUD handlers
- current ownership of identity-match and merge handlers
- exact response-shape preservation rule
- exact merge-behavior preservation rule
- what remains ConnectShyft-local
- what is being prepared as a future seam toward PeopleCore
- what remains deferred
- explicit separation between neighbor/identity extraction and outbound/webhook extraction

## Optional safe cleanup
If clearly isolated and helpful, extract a tiny shared helper for repeated neighbor response metadata assembly used by the new handlers.

Do not broaden beyond this route family.

## Final validation after Checkpoint 5

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.neighbor-create.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-list-detail.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-update-delete.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.neighbor-identity-merge.characterization.test.ts   src/modules/connectshyft/__tests__/handlers.neighborIdentityContext.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

## Commit after Checkpoint 5

Suggested commit message:

```text
chore(slice-7): add connectshyft neighbor identity handler guardrails
```

---

# Definition of done

Slice 7 is complete only when all of these are true:

- create/list/detail/update/delete neighbor behavior is characterized by tests
- identity-match behavior is characterized by tests
- merge behavior is characterized by tests
- handler files exist for the full neighbor / identity route family
- the neighbor / identity routes delegate through thin-router handlers
- exact current response shapes are preserved
- exact current merge behavior is preserved
- a helper boundary exists for this family
- light future PeopleCore seam prep is documented, but no rewrite is attempted
- narrow integration tests remain green
- contract tests remain green
- canonical router refactor plan doc is updated
- bridge notes exist

---

# Explicit non-goals for this slice

Do not implement any of these here:

- PeopleCore migration
- merge semantic tightening
- outbound call/message extraction
- webhook/inbound extraction
- response redesign
- telephony architecture changes
- UI redesign

---

# Future extraction order after Slice 7

If Slice 7 lands cleanly, next should be:

1. outbound actions
2. inbound/webhooks/telephony

Do not jump to webhook extraction before outbound action extraction.

---

# If Codex gets stuck

If any of the following are unclear, Codex should stop and report the minimum blocker instead of improvising:
- how current neighbor route tests construct valid context-aware requests
- exact current success/refusal envelope fields for create/update/delete/identity-match/merge
- whether route-local helper functions must temporarily remain in place for merge side-effects
- whether some neighbor routes require relationship-validation prerequisites that should remain outside the helper boundary

Do not guess. Report the blocker and wait.

---

# One-line paste version

Implement Slice 7 only: add characterization tests for the ConnectShyft neighbor and identity route family (`POST /neighbors`, `GET /neighbors`, `GET /neighbors/:neighborId`, `PUT /neighbors/:neighborId`, `DELETE /neighbors/:neighborId`, `POST /neighbors/identity-match`, `POST /neighbors/merge`); add handler files plus a small `neighborIdentityContext` helper boundary under `apps/connectshyft-api/src/modules/connectshyft`; convert only those routes in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to thin-router delegation; preserve exact current response shapes; preserve current merge behavior exactly; add only light preparation for future PeopleCore convergence without rewriting the model; update `docs/architecture/connectshyft-router-refactor-plan.md`; add bridge notes; keep narrow integration and contract tests green; and do not touch outbound, webhook, or telephony extraction in this slice.
