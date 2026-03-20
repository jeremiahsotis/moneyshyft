# Codex Implementation Brief — Slice 4
## ConnectShyft Characterization + Thin-Router Extraction Foundation (Repo-Specific)

## Read this first

This brief is written to be pasted directly into Codex.

It is intentionally explicit so Codex does not improvise architecture, file locations, or scope.

### Slice 4 objective

Create the first safe de-knotting slice for ConnectShyft by:
- characterizing critical current route behavior
- introducing a thin-router pattern
- extracting the first low-risk route family into application handlers
- isolating access/context resolution behind a stable boundary
- not changing product behavior beyond what is required for the extraction

### Hard rules
- Do not restructure the repo.
- Do not broaden `connectshyft-api:test` to the full legacy surface.
- Do not rewrite outbound dispatch, webhook ingestion, or telephony logic in this slice.
- Do not change the ConnectShyft product model.
- Do not change response shapes for extracted routes unless a test is updated intentionally and explicitly.
- Do not attempt a full router split in one pass.
- Keep existing tests green.
- Keep ConnectShyft minimal-app integration path green.

### Why this slice exists

`apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` is too large and owns too many responsibilities:
- route registration
- request parsing
- capability checks
- orgUnit/tenant context resolution
- response shaping
- orchestration
- synthetic/runtime fixture logic
- lifecycle action coordination

This slice creates the first safe cut toward:
- thin router
- handler files by route family
- explicit access/context boundary
- preserved behavior

### What this slice should cover

Only the first low-risk route family:

- `/settings/navigation`
- `/availability`
- `/context`
- `/inbox`

These are the routes to extract first.

Do not extract:
- `/threads/*`
- `/neighbors/*`
- `/numbers/*`
- `/escalation/*`
- `/webhooks/*`
- outbound call/message dispatch
- bridge sessions
- canonical event orchestration

---

## Checkpoint structure

This work should be done in five checkpoints.

After each checkpoint:
1. run the required validation commands
2. inspect results
3. create a commit before moving to the next checkpoint

---

# Checkpoint 1 — Add characterization tests for the first extracted route family

## Goal

Pin current behavior before moving code.

## Create these files

```text
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.settings-and-availability.characterization.test.ts
```

## Scope

Add characterization coverage for:

- `GET /api/v1/connectshyft/context`
- `GET /api/v1/connectshyft/inbox`
- `GET /api/v1/connectshyft/settings/navigation`
- `GET /api/v1/connectshyft/availability`

## Rules

- Use the existing route file as-is
- Test current response shape and important semantics, not every field mechanically
- Capture the current auth/context failure behavior if it is deterministic
- Capture the current success behavior that matters to the product model

## Specific expectations to pin

### `/context`
Pin:
- it returns resolved tenant/orgUnit context behavior
- it handles missing/invalid orgUnit context the current way

### `/inbox`
Pin:
- inbox bucket behavior relevant to:
  - orgUnit inbox
  - mine/my conversations behavior if represented in the current response
- route success shape
- required access behavior

### `/settings/navigation`
Pin:
- route returns navigation structure
- role/access failure behavior is preserved

### `/availability`
Pin:
- route returns availability payload shape
- role/access behavior is preserved

## Important constraint

If some of these routes are difficult to hit through full middleware, use the existing test harness patterns already present in `apps/connectshyft-api/src/routes/api/v1/__tests__`.

Do not invent a new end-to-end stack here.

## Run after Checkpoint 1

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.settings-and-availability.characterization.test.ts
```

If route tests are wired through another known local command in this repo, use that instead.

## Commit after Checkpoint 1

Suggested commit message:

```text
test(slice-4): add connectshyft route characterization tests
```

---

# Checkpoint 2 — Introduce handler folder and access/context boundary for the extracted family

## Goal

Create the new structure without changing route behavior yet.

## Create these folders

```text
apps/connectshyft-api/src/modules/connectshyft/handlers
apps/connectshyft-api/src/modules/connectshyft/http
```

## Create these files

```text
apps/connectshyft-api/src/modules/connectshyft/http/accessContext.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectContext.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectInbox.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectSettingsNavigation.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectAvailability.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/index.ts
```

## File responsibilities

### `http/accessContext.ts`
Create a thin wrapper that centralizes the first-stage route-family access/context work.

It should expose small functions only, such as:

- resolve request actor roles
- resolve orgUnit/tenant ConnectShyft context using existing `contextAccess`
- return consistent refusal payloads for handler use

It may call existing helpers, but should stop the route file from doing this inline for the extracted family.

Do not redesign all auth. Do not move middleware. This is a handler-facing helper only.

### Handler files
Each handler should:
- accept `req`, `res`
- call the access/context helper
- call the existing underlying route-family helper logic or extracted helper logic
- return the same response shape as before

At this checkpoint, it is acceptable for handlers to call helper functions still defined in `connectshyft.ts` if necessary, as long as the route body gets thinner in Checkpoint 3.

## Important constraint

Do not put outbound dispatch or webhook logic into these handlers.
These handlers are only for the four extracted routes.

## Run after Checkpoint 2

Run:
- the characterization tests from Checkpoint 1
- `pnpm nx run connectshyft-api:test`

The narrow integration suite must stay green.

## Commit after Checkpoint 2

Suggested commit message:

```text
refactor(slice-4): add connectshyft handler and access-context scaffolding
```

---

# Checkpoint 3 — Convert the first route family to thin-router usage

## Goal

Make the route file thinner for the first route family only.

## Update file

```text
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

## Replace inline route bodies for only these routes:

- `GET /settings/navigation`
- `GET /availability`
- `GET /context`
- `GET /inbox`

with thin route registrations that delegate to the new handlers.

Example pattern:

```ts
router.get('/context', getConnectContext);
```

using whatever import shape matches the repo.

## Rules

- keep route paths exactly the same
- keep response behavior the same
- keep existing route order stable unless there is a compelling technical reason
- do not modify other route bodies in this checkpoint

## Cleanup expectation

As part of this checkpoint, remove any route-local logic for those four routes from `connectshyft.ts` that is now fully owned by the handler files.

Do not perform broad unrelated cleanup.

## Validation after Checkpoint 3

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.settings-and-availability.characterization.test.ts
pnpm nx run connectshyft-api:test
```

## Commit after Checkpoint 3

Suggested commit message:

```text
refactor(slice-4): convert first connectshyft route family to thin router
```

---

# Checkpoint 4 — Add route-family documentation and boundary guard tests

## Goal

Make the new structure explicit and harder to regress.

## Create these files

```text
apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.accessContext.test.ts
docs/architecture/connectshyft-router-refactor-plan.md
```

## `handlers.accessContext.test.ts`
Add focused tests for the new handler-facing access/context helper.

Test only the extracted-family concerns:
- valid context resolution path
- refusal shape on invalid/missing orgUnit access
- no duplication of deep route-specific behavior

Do not test every middleware concern.

## `docs/architecture/connectshyft-router-refactor-plan.md`
Document:
- why the route file is being reduced
- extracted route family for Slice 4
- future extraction order
- what remains intentionally deferred

The doc should align with the companion doc pack add-on.

## Validation after Checkpoint 4

Run:
- route characterization tests
- new accessContext tests
- narrow integration suite

## Commit after Checkpoint 4

Suggested commit message:

```text
docs(slice-4): document connectshyft router refactor plan
```

---

# Checkpoint 5 — Add repo-safe guardrails for future extraction

## Goal

Leave behind structure that makes Slice 5 easier and keeps future extractions disciplined.

## Create these files

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/README.md
```

## `handlers/README.md`
Document:
- handler ownership
- what belongs in handlers
- what stays in router
- what still belongs in domain/service modules
- explicit note that outbound/webhook/telephony extraction is deferred

## Optional code cleanup in this checkpoint

Only if safe and clearly isolated, create small helper exports for route-family-local constants used by the extracted handlers.

Do not continue extracting more route families.

## Final validation after Checkpoint 5

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.context-and-inbox.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.settings-and-availability.characterization.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

If there is an existing safe command for the route/module Jest surface, run that too.

## Commit after Checkpoint 5

Suggested commit message:

```text
chore(slice-4): add connectshyft handler guardrails for future extraction
```

---

# Definition of done

Slice 4 is complete only when all of these are true:

- the first route family is characterized by tests
- the first route family is extracted to handler files
- `connectshyft.ts` is thinner for those routes
- an access/context boundary helper exists for handler use
- narrow integration tests remain green
- contract tests remain green
- no outbound/webhook/telephony behavior was dragged into the extraction
- the router refactor plan doc exists
- the handlers readme exists

---

# Explicit non-goals for this slice

Do not implement any of these here:

- full router split
- thread detail/timeline extraction
- thread lifecycle action extraction
- neighbor/PeopleCore convergence rewrite
- outbound call/message rewrite
- inbound SMS/voice rewrite
- provider/webhook rewrite
- RBAC/tenancy global cleanup
- WebRTC/SIP redesign
- UX redesign

---

# Future extraction order after Slice 4

If Slice 4 lands cleanly, the likely next route-family order should be:

1. thread read surface
   - `/threads/:threadId`
   - `/threads/:threadId/timeline`

2. thread lifecycle actions
   - claim
   - takeover
   - close

3. neighbors / identity bridge

4. outbound actions

5. inbound/webhooks/telephony

This order is deliberate. Do not jump straight to outbound/webhooks first.

---

# If Codex gets stuck

If any of the following are unclear, Codex should stop and report the minimum blocker instead of improvising:
- how current route tests construct authenticated/context-aware requests
- whether a handler should call extracted helper functions or temporarily call route-local helper functions
- exact refusal response shape for the extracted routes
- whether `contextAccess` already fully covers a needed route case

Do not guess. Report the blocker and wait.

---

# One-line paste version

Implement Slice 4 only: add characterization tests for the ConnectShyft route family covering `/settings/navigation`, `/availability`, `/context`, and `/inbox`; introduce handler files plus a small handler-facing access/context boundary helper under `apps/connectshyft-api/src/modules/connectshyft`; convert only that first route family in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to thin-router delegation; add focused tests for the new access/context helper; add `docs/architecture/connectshyft-router-refactor-plan.md` and a handlers README; keep all response behavior stable; keep narrow integration and contract tests green; and do not extract outbound, webhook, telephony, or neighbor/thread heavy logic in this slice.
