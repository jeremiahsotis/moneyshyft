# Codex Implementation Brief — Slice 5
## ConnectShyft Thread Read-Surface Extraction (Repo-Specific)

## Read this first

This brief is written to be pasted directly into Codex.

It is intentionally explicit so Codex does not improvise architecture, file locations, or scope.

### Slice 5 objective

Extract the ConnectShyft thread read surface into thin-router handlers while preserving current response shape as much as possible.

This slice should:
- characterize current thread detail and timeline behavior
- introduce handler files for the thread read surface
- convert only the read routes to thin-router delegation
- preserve the current response shape, even if ugly
- keep the UI moving toward a single canonical thread detail payload without forcing a redesign in this slice

### Routes in scope

Only these routes:

- `GET /api/v1/connectshyft/threads/:threadId/timeline`
- `GET /api/v1/connectshyft/threads/:threadId`

### Hard rules
- Do not restructure the repo.
- Do not broaden `connectshyft-api:test` to the full legacy surface.
- Do not change the route paths.
- Do not redesign the thread response shape.
- Do not rewrite timeline DTOs in this slice.
- Do not extract lifecycle actions in this slice.
- Do not extract outbound call/message routes in this slice.
- Do not extract inbound/webhook/telephony routes in this slice.
- Keep existing tests green.
- Preserve current behavior unless a characterization test explicitly documents and approves the change.

### Why this slice exists

After Slice 4, the next best route family is the thread read surface because:
- it is product-critical
- it supports the “iPhone Messages simple” UX goal
- it is foundational for lifecycle actions, PeopleCore convergence, and later telephony work
- it is safer than jumping into outbound/webhooks now

### Decisions already locked for this slice

- Preserve current response shape as much as possible, even if ugly.
- Long-term UI direction is a single canonical thread detail payload.
- In this slice, do not force a response redesign to achieve that goal.

---

## Checkpoint structure

This work should be done in five checkpoints.

After each checkpoint:
1. run the required validation commands
2. inspect results
3. create a commit before moving to the next checkpoint

---

# Checkpoint 1 — Add characterization tests for thread detail and timeline

## Goal

Pin current read-surface behavior before moving code.

## Create these files

```text
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts
```

## Scope

Add characterization coverage for:

- `GET /api/v1/connectshyft/threads/:threadId`
- `GET /api/v1/connectshyft/threads/:threadId/timeline`

## What to pin

### Thread detail
Pin the current behavior for:
- successful thread detail load
- current response shape
- actions presence
- canonical timeline inclusion if present
- deleted neighbor behavior if that is currently represented
- not-found / unavailable behavior

### Thread timeline
Pin the current behavior for:
- successful timeline load
- current response shape
- chronological item ordering
- inclusion of SMS content
- inclusion of voicemail/transcript metadata when present
- limit handling if deterministic in current implementation
- deleted neighbor metadata

## Important rule

Use the existing route test harness patterns already present in:
- `connectshyft.timeline.test.ts`
- other route characterization suites

Do not invent a new full-stack test harness.

## Validation after Checkpoint 1

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts
```

## Commit after Checkpoint 1

Suggested commit message:

```text
test(slice-5): add connectshyft thread read-surface characterization tests
```

---

# Checkpoint 2 — Add thread read handlers and helper boundary

## Goal

Create the thin-router target structure for thread detail and timeline without changing router usage yet.

## Create these files

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadDetail.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadTimeline.ts
apps/connectshyft-api/src/modules/connectshyft/http/threadReadContext.ts
```

## Update file

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/index.ts
```

Export the new handlers.

## File responsibilities

### `http/threadReadContext.ts`
Create a small helper boundary for the read surface only.

It should centralize the repeated read-route concerns such as:
- resolving/enforcing orgUnit context
- resolving the thread id param
- handling current thread-not-found / unavailable refusal mapping
- loading the current detail/timeline prerequisites using the existing helpers

This helper may call existing route-local helper functions temporarily if necessary, but the goal is to reduce duplication in the route bodies.

### `getConnectThreadDetail.ts`
Own:
- request handoff
- access/context resolution via the helper boundary
- calling existing read-contract/detail/timeline helpers
- returning the same current response shape

### `getConnectThreadTimeline.ts`
Own:
- request handoff
- access/context resolution via the helper boundary
- calling existing timeline helper(s)
- returning the same current response shape

## Important constraints

- Do not redesign the response DTOs.
- Do not collapse detail and timeline into a new merged shape yet.
- It is acceptable if both handlers share helper functions to preserve the current canonical detail behavior.

## Validation after Checkpoint 2

Run:
- the Checkpoint 1 characterization tests
- `pnpm nx run connectshyft-api:test`

## Commit after Checkpoint 2

Suggested commit message:

```text
refactor(slice-5): add connectshyft thread read handlers and context scaffolding
```

---

# Checkpoint 3 — Convert thread read routes to thin-router usage

## Goal

Make the router thinner for the thread read surface only.

## Update file

```text
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

## Convert only these routes

- `GET /threads/:threadId/timeline`
- `GET /threads/:threadId`

Replace the inline route bodies with thin handler delegation.

Example pattern:

```ts
router.get('/threads/:threadId/timeline', getConnectThreadTimeline);
router.get('/threads/:threadId', getConnectThreadDetail);
```

Use the repo’s actual import style.

## Rules

- keep route paths exactly the same
- keep route order stable unless required for correctness
- keep response behavior stable
- remove route-local logic for these two routes only if fully moved

Do not touch:
- claim/takeover/close
- outbound actions
- neighbor routes
- webhook routes

## Validation after Checkpoint 3

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts
pnpm nx run connectshyft-api:test
```

## Commit after Checkpoint 3

Suggested commit message:

```text
refactor(slice-5): convert connectshyft thread read routes to thin router
```

---

# Checkpoint 4 — Add focused handler/helper tests and docs update

## Goal

Make the new thread read boundary explicit and harder to regress.

## Create this file

```text
apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.threadReadContext.test.ts
```

## Update this file

```text
docs/architecture/connectshyft-router-refactor-plan.md
```

## `handlers.threadReadContext.test.ts`
Add focused tests for the new thread read helper boundary.

Test:
- valid context + thread id resolution path
- refusal mapping for missing thread id
- refusal mapping for unavailable detail/timeline context if deterministic
- no broad lifecycle/outbound logic leakage into this helper

## Doc update
Update the router refactor plan doc to reflect:
- Slice 4 completed
- Slice 5 thread read surface extracted
- next planned extraction target is lifecycle actions
- outbound/webhooks remain intentionally deferred

## Validation after Checkpoint 4

Run:
- characterization tests
- new handler/helper tests
- narrow integration suite

## Commit after Checkpoint 4

Suggested commit message:

```text
docs(slice-5): update connectshyft router refactor plan for thread read extraction
```

---

# Checkpoint 5 — Add handler guardrails and optional canonical-read note

## Goal

Leave behind clear guardrails for future lifecycle extraction and document the canonical-read intent without redesigning now.

## Create this file

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/THREAD_READ_NOTES.md
```

## `THREAD_READ_NOTES.md`
Document:
- current thread detail and timeline ownership
- why current response shape was preserved
- the long-term intent toward a single canonical thread detail payload
- what remains deferred to later slices
- explicit note that lifecycle, outbound, and webhook extraction remain separate work

## Optional safe cleanup
If clearly isolated and helpful, extract a tiny shared helper for common thread-id parsing used by the two handlers.

Do not broaden beyond the thread read family.

## Final validation after Checkpoint 5

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts   src/modules/connectshyft/__tests__/handlers.threadReadContext.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

## Commit after Checkpoint 5

Suggested commit message:

```text
chore(slice-5): add connectshyft thread read handler guardrails
```

---

# Definition of done

Slice 5 is complete only when all of these are true:

- thread detail behavior is characterized by tests
- thread timeline behavior is characterized by tests
- handler files exist for thread detail and thread timeline
- the two read routes delegate through thin-router handlers
- current response shapes are preserved
- a thread read helper boundary exists
- narrow integration tests remain green
- contract tests remain green
- router refactor plan doc is updated
- thread read handler notes exist

---

# Explicit non-goals for this slice

Do not implement any of these here:

- lifecycle action extraction
- claim/takeover/close refactor
- outbound call/message refactor
- webhook/inbound refactor
- PeopleCore neighbor convergence rewrite
- response redesign for canonical thread detail payload
- timeline DTO redesign
- telephony architecture changes
- UI redesign

---

# Future extraction order after Slice 5

If Slice 5 lands cleanly, next should be:

1. lifecycle actions
   - claim
   - takeover
   - close

2. neighbors / identity bridge

3. outbound actions

4. inbound/webhooks/telephony

Do not jump ahead to outbound/webhooks first.

---

# If Codex gets stuck

If any of the following are unclear, Codex should stop and report the minimum blocker instead of improvising:
- how current thread route tests construct valid context-aware requests
- whether a handler should call route-local helper functions temporarily vs extracted helpers
- exact not-found vs unavailable response semantics for thread detail/timeline
- whether current detail route already inlines canonical timeline assembly that must be preserved

Do not guess. Report the blocker and wait.

---

# One-line paste version

Implement Slice 5 only: add characterization tests for `GET /api/v1/connectshyft/threads/:threadId` and `GET /api/v1/connectshyft/threads/:threadId/timeline`; add thread read handlers plus a small thread-read helper boundary under `apps/connectshyft-api/src/modules/connectshyft`; convert only those two routes in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to thin-router delegation; preserve current response shapes; add focused tests for the new thread-read helper boundary; update `docs/architecture/connectshyft-router-refactor-plan.md`; add thread read handler notes; keep narrow integration and contract tests green; and do not touch lifecycle, outbound, webhook, or telephony extraction in this slice.
