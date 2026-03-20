# Codex Implementation Brief — Slice 6
## ConnectShyft Lifecycle Action Extraction (Repo-Specific)

## Read this first

This brief is written to be pasted directly into Codex.

It is intentionally explicit so Codex does not improvise architecture, file locations, or scope.

### Slice 6 objective

Extract the ConnectShyft lifecycle action surface into thin-router handlers while preserving exact current lifecycle response shapes and current behavior.

This slice should cover only:

- `POST /api/v1/connectshyft/threads/:threadId/claim`
- `POST /api/v1/connectshyft/threads/:threadId/takeover`
- `POST /api/v1/connectshyft/threads/:threadId/close`

### Locked behavioral decisions

- Preserve exact current lifecycle response shape.
- Claim moves the thread into My Conversations and it may still appear in Inbox, visibly recognized as claimed.
- Takeover and close should preserve existing behavior only in this slice.
- Do not tighten semantics in this slice beyond what is already pinned by characterization tests.

### Hard rules

- Do not restructure the repo.
- Do not broaden `connectshyft-api:test` to the full legacy surface.
- Do not touch outbound actions in this slice.
- Do not touch webhook/inbound/telephony extraction in this slice.
- Do not redesign lifecycle responses.
- Do not change route paths.
- Do not refactor thread read routes again unless required for a direct lifecycle import boundary.
- Keep current tests green.
- Preserve current behavior unless a characterization test explicitly documents and approves the change.

### Why this slice exists

After Slice 4 and Slice 5, the next correct cut is the lifecycle mutation surface because it is directly tied to:

- Inbox
- My Conversations
- claim semantics
- operator ownership model
- thread state transitions

This slice should produce a thinner router and a cleaner lifecycle boundary before any outbound or PeopleCore bridge extraction is attempted.

---

## Checkpoint structure

This work should be done in five checkpoints.

After each checkpoint:
1. run the required validation commands
2. inspect results
3. create a commit before moving to the next checkpoint

---

# Checkpoint 1 — Add lifecycle characterization tests

## Goal

Pin the current behavior of claim, takeover, and close before moving code.

## Create these files

```text
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-claim.characterization.test.ts
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-takeover.characterization.test.ts
apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-close.characterization.test.ts
```

## Scope

Add route characterization coverage for:

- `POST /api/v1/connectshyft/threads/:threadId/claim`
- `POST /api/v1/connectshyft/threads/:threadId/takeover`
- `POST /api/v1/connectshyft/threads/:threadId/close`

## What to pin

### Claim
Pin:
- success response envelope and current shape
- thread state transition fields currently returned
- current claim side-effect metadata if present
- current escalation reset / notifications canceled behavior if represented
- current context and threadId failure behavior
- current capability/membership refusal behavior

### Takeover
Pin:
- success response envelope and current shape
- current takeover lifecycle behavior
- current policy refusal behavior
- current context/threadId failure behavior

### Close
Pin:
- success response envelope and current shape
- current close lifecycle behavior
- current policy refusal behavior
- current context/threadId failure behavior

## Important rule

Use the existing route harness patterns already present in the route test suite.

Do not invent a new full-stack harness.

## Validation after Checkpoint 1

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.thread-claim.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-takeover.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-close.characterization.test.ts
```

## Commit after Checkpoint 1

Suggested commit message:

```text
test(slice-6): add connectshyft lifecycle characterization tests
```

---

# Checkpoint 2 — Add lifecycle handlers and helper boundary

## Goal

Create the thin-router target structure for lifecycle actions without changing router usage yet.

## Create these files

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadClaim.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadTakeover.ts
apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadClose.ts
apps/connectshyft-api/src/modules/connectshyft/http/threadLifecycleContext.ts
```

## Update file

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/index.ts
```

Export the new handlers.

## File responsibilities

### `http/threadLifecycleContext.ts`
Create a small helper boundary for lifecycle routes only.

It should centralize:
- inbox capability enforcement for lifecycle entry
- orgUnit context resolution
- thread id parsing
- lifecycle action membership checks
- current thread-not-found mapping
- lifecycle context loading using existing helpers
- current policy evaluation prerequisites that are repeated across claim/takeover/close

This helper may call existing route-local helper functions temporarily if necessary, but should reduce duplication and prepare for thin-router delegation.

### `postConnectThreadClaim.ts`
Own:
- request handoff
- lifecycle context resolution
- invoking the existing transition logic
- preserving the exact current response shape

### `postConnectThreadTakeover.ts`
Own:
- request handoff
- lifecycle context resolution
- invoking the existing transition logic
- preserving the exact current response shape

### `postConnectThreadClose.ts`
Own:
- request handoff
- lifecycle context resolution
- invoking the existing transition logic
- preserving the exact current response shape

## Important constraints

- Do not redesign response payloads.
- Do not move outbound reopen logic into this slice.
- Do not alter the semantics that allow claimed threads to remain visible in Inbox.
- It is acceptable if all three handlers call a shared lifecycle execution helper to preserve current behavior.

## Validation after Checkpoint 2

Run:
- the Checkpoint 1 characterization tests
- `pnpm nx run connectshyft-api:test`

## Commit after Checkpoint 2

Suggested commit message:

```text
refactor(slice-6): add connectshyft lifecycle handlers and context scaffolding
```

---

# Checkpoint 3 — Convert lifecycle routes to thin-router usage

## Goal

Make the router thinner for claim, takeover, and close only.

## Update file

```text
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

## Convert only these routes

- `POST /threads/:threadId/claim`
- `POST /threads/:threadId/takeover`
- `POST /threads/:threadId/close`

Replace the inline route bodies with thin handler delegation.

Example pattern:

```ts
router.post('/threads/:threadId/claim', postConnectThreadClaim);
router.post('/threads/:threadId/takeover', postConnectThreadTakeover);
router.post('/threads/:threadId/close', postConnectThreadClose);
```

Use the repo’s actual import style.

## Rules

- keep route paths exactly the same
- keep route order stable unless required for correctness
- keep exact response behavior stable
- remove route-local logic for these three routes only if fully moved

Do not touch:
- thread read routes
- outbound routes
- neighbor routes
- webhook routes

## Validation after Checkpoint 3

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.thread-claim.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-takeover.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-close.characterization.test.ts
pnpm nx run connectshyft-api:test
```

## Commit after Checkpoint 3

Suggested commit message:

```text
refactor(slice-6): convert connectshyft lifecycle routes to thin router
```

---

# Checkpoint 4 — Add focused lifecycle helper tests and update canonical router plan

## Goal

Make the lifecycle boundary explicit and harder to regress.

## Create this file

```text
apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.threadLifecycleContext.test.ts
```

## Update this file

```text
docs/architecture/connectshyft-router-refactor-plan.md
```

## `handlers.threadLifecycleContext.test.ts`
Add focused tests for the lifecycle helper boundary.

Test:
- valid context + threadId resolution path
- refusal mapping for missing threadId
- refusal mapping for thread not found / unavailable lifecycle context
- refusal mapping for missing actor context or membership gate if deterministic
- guardrail that this helper stays limited to lifecycle prerequisites and does not absorb outbound logic

## Doc update
Update the canonical router refactor plan to reflect:
- Slice 4 completed
- Slice 5 thread read surface extracted
- Slice 6 lifecycle actions extracted
- next planned extraction target is neighbors / identity bridge
- outbound and webhooks remain intentionally deferred

## Validation after Checkpoint 4

Run:
- lifecycle characterization tests
- new lifecycle helper tests
- narrow integration suite

## Commit after Checkpoint 4

Suggested commit message:

```text
docs(slice-6): update connectshyft router refactor plan for lifecycle extraction
```

---

# Checkpoint 5 — Add lifecycle handler guardrails and notes

## Goal

Leave behind clear guardrails for future neighbor/outbound extraction and document the preserved lifecycle semantics.

## Create this file

```text
apps/connectshyft-api/src/modules/connectshyft/handlers/THREAD_LIFECYCLE_NOTES.md
```

## `THREAD_LIFECYCLE_NOTES.md`
Document:
- current ownership of claim/takeover/close handlers
- exact response-shape preservation rule
- claim visibility rule:
  - moves into My Conversations
  - may still appear in Inbox
  - should be visibly recognized as claimed
- what remains deferred
- explicit separation between lifecycle extraction and outbound/webhook extraction

## Optional safe cleanup
If clearly isolated and helpful, extract a tiny shared helper for lifecycle action parsing or response-code mapping used by the three handlers.

Do not broaden beyond the lifecycle family.

## Final validation after Checkpoint 5

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath   src/routes/api/v1/__tests__/connectshyft.thread-claim.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-takeover.characterization.test.ts   src/routes/api/v1/__tests__/connectshyft.thread-close.characterization.test.ts   src/modules/connectshyft/__tests__/handlers.threadLifecycleContext.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

## Commit after Checkpoint 5

Suggested commit message:

```text
chore(slice-6): add connectshyft lifecycle handler guardrails
```

---

# Definition of done

Slice 6 is complete only when all of these are true:

- claim behavior is characterized by tests
- takeover behavior is characterized by tests
- close behavior is characterized by tests
- handler files exist for claim, takeover, and close
- the three lifecycle routes delegate through thin-router handlers
- exact current lifecycle response shapes are preserved
- a lifecycle helper boundary exists
- claim semantics remain:
  - in My Conversations
  - still potentially visible in Inbox
  - visibly recognized as claimed
- narrow integration tests remain green
- contract tests remain green
- canonical router refactor plan doc is updated
- lifecycle handler notes exist

---

# Explicit non-goals for this slice

Do not implement any of these here:

- outbound call/message extraction
- webhook/inbound extraction
- PeopleCore neighbor convergence rewrite
- lifecycle semantic tightening
- response redesign
- telephony architecture changes
- UI redesign

---

# Future extraction order after Slice 6

If Slice 6 lands cleanly, next should be:

1. neighbors / identity bridge
2. outbound actions
3. inbound/webhooks/telephony

Do not jump to webhooks before outbound, and do not jump to webhooks before the neighbor/identity bridge decision is addressed.

---

# If Codex gets stuck

If any of the following are unclear, Codex should stop and report the minimum blocker instead of improvising:
- how current lifecycle route tests construct valid actor/context-aware requests
- whether a handler should call route-local lifecycle helpers temporarily vs extracted helpers
- exact current success envelope fields for claim/takeover/close
- whether the current lifecycle orchestration is too intertwined to split without first extracting a shared lifecycle execution helper

Do not guess. Report the blocker and wait.

---

# One-line paste version

Implement Slice 6 only: add characterization tests for `POST /api/v1/connectshyft/threads/:threadId/claim`, `POST /api/v1/connectshyft/threads/:threadId/takeover`, and `POST /api/v1/connectshyft/threads/:threadId/close`; add lifecycle handlers plus a small lifecycle helper boundary under `apps/connectshyft-api/src/modules/connectshyft`; convert only those three routes in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to thin-router delegation; preserve exact current lifecycle response shapes; keep claim semantics as My Conversations plus still visible in Inbox and visibly claimed; add focused tests for the lifecycle helper boundary; update `docs/architecture/connectshyft-router-refactor-plan.md`; add lifecycle handler notes; keep narrow integration and contract tests green; and do not touch outbound, webhook, or telephony extraction in this slice.
