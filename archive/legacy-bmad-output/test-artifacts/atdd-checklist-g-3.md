---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-06T21:56:09.312Z'
---

# ATDD Checklist - Epic g, Story 3: Thread Detail Conversation-First Rebuild

**Date:** 2026-03-06
**Author:** Jeremiah
**Primary Test Level:** E2E

---

## Workflow Progress (TEA)

- ✅ Step 01 preflight/context completed
  - Policy gate passed: `npm run policy:check`
  - Branch workflow gate passed: `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/g-3-thread-detail-conversation-first-rebuild.md`
  - Story, framework config, existing patterns, and required knowledge fragments loaded.
- ✅ Step 02 generation mode selected: **AI Generation**
  - Mode rationale: ACs are clear, contracts and prior story patterns are available locally.
- ✅ Step 03 test strategy completed
  - Primary level: E2E for conversation-first layout/interaction behavior.
  - Supporting level: API contract checks for action matrix and lifecycle invariants.
- ✅ Step 04 parallel subprocess generation completed
  - API subprocess output: `/tmp/tea-atdd-api-tests-2026-03-06T21-56-09-312Z.json`
  - E2E subprocess output: `/tmp/tea-atdd-e2e-tests-2026-03-06T21-56-09-312Z.json`
- ✅ Step 04C aggregation completed
  - RED assets written to repository, summary written to `/tmp/tea-atdd-summary-2026-03-06T21-56-09-312Z.json`.
- ✅ Step 05 validation completed
  - New specs parse and register in Playwright.
  - Local verification command result: **9 skipped** (RED phase intentionally staged with `test.skip()`).

---

## Story Summary

Story g.3 rebuilds ConnectShyft thread detail around a conversation-first layout where operators can act quickly with minimal cognitive overhead. The contract emphasizes primary context visibility, voicemail as inline conversation content, and deterministic lifecycle-safe actions. Outbound actions from CLOSED must reopen the same thread deterministically without inbound-driven reopen side effects.

**As a** volunteer handling a case conversation  
**I want** thread detail to center on messaging actions and timeline context  
**So that** I can respond quickly without navigating record-style chrome

---

## Acceptance Criteria

1. Given thread detail is open, when header and body render, then neighbor, conference, and claim context are primary and immediately visible.
2. Given voicemail artifacts exist, when timeline renders, then voicemail appears as first-class inline conversation content.
3. Given action controls are shown, when thread state is evaluated, then action sets are explicit and locked by state:
   - `UNCLAIMED`: `Call`, `Text`, `Claim`
   - `CLAIMED`: `Call`, `Text`, `Close`
   - `CLOSED`: `Call`, `Send Message`
4. Given policy/refusal conditions occur, when an action is attempted, then contextual feedback appears at action time without persistent operations-heavy chrome dominating default layout.
5. Given outbound action is initiated from `CLOSED`, when volunteer taps `Call` or `Send Message`, then thread reopens immediately (`CLOSED -> UNCLAIMED`) on same thread id with deterministic lifecycle messaging and no inbound auto-reopen side effects.

---

## Failing Tests Created (RED Phase)

### E2E Tests (5 tests)

**File:** `tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts` (167 lines)

- ✅ **Test:** [G3-ATDD-E2E-001][P0] thread detail header/body prioritizes neighbor conference and claim context with conversation-first hierarchy @P0
  - **Status:** RED - Expected g.3 UI selectors/behaviors are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** Conversation-first context hierarchy in thread detail.

- ✅ **Test:** [G3-ATDD-E2E-002][P0] voicemail renders as first-class inline timeline conversation content in thread detail @P0
  - **Status:** RED - Expected g.3 UI selectors/behaviors are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** Voicemail inline timeline rendering.

- ✅ **Test:** [G3-ATDD-E2E-003][P0] visible thread actions remain explicitly locked by state matrix for UNCLAIMED CLAIMED and CLOSED @P0
  - **Status:** RED - Expected g.3 UI selectors/behaviors are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** State-locked visible action matrix in UI.

- ✅ **Test:** [G3-ATDD-E2E-004][P1] policy and refusal feedback appears contextually at action time without persistent operations-heavy chrome @P1
  - **Status:** RED - Expected g.3 UI selectors/behaviors are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** Contextual refusal feedback and no operations-heavy chrome.

- ✅ **Test:** [G3-ATDD-E2E-005][P0] CLOSED outbound action reopens same thread id with deterministic lifecycle messaging and no inbound auto-reopen side effects @P0
  - **Status:** RED - Expected g.3 UI selectors/behaviors are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** Closed-thread outbound same-thread reopen experience.

### API Tests (4 tests)

**File:** `tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts` (233 lines)

- ✅ **Test:** [G3-ATDD-API-001][P0] thread detail contract prioritizes neighbor conference and claim context while voicemail renders inline as first-class conversation content @P0
  - **Status:** RED - Expected g.3 contract fields are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** Context-first detail payload and voicemail timeline contract.

- ✅ **Test:** [G3-ATDD-API-002][P0] thread detail action matrix is explicitly locked by canonical lifecycle state contracts @P0
  - **Status:** RED - Expected g.3 contract fields are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** State-locked action matrix contract.

- ✅ **Test:** [G3-ATDD-API-003][P1] refusal and policy feedback is contextual at action time and avoids persistent operations-heavy default chrome @P1
  - **Status:** RED - Expected g.3 contract fields are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** Contextual refusal/success feedback contract without persistent chrome.

- ✅ **Test:** [G3-ATDD-API-004][P0] CLOSED outbound action reopens same thread id to UNCLAIMED with deterministic lifecycle messaging and no inbound auto-reopen side effects @P0
  - **Status:** RED - Expected g.3 contract fields are not implemented yet (test remains `test.skip()` until implementation starts).
  - **Verifies:** Closed-thread outbound reopen lifecycle contract.

### Component Tests (0 tests)

**File:** `N/A` (0 lines)

- ✅ **Test:** N/A for this ATDD cycle
  - **Status:** RED - Covered by E2E + API contract scope for this story.
  - **Verifies:** Component-level behavior is indirectly covered by conversation surface E2E expectations.

---

## Data Factories Created

### ConnectShyft Story G3 Factory

**File:** `tests/support/factories/connectShyftStoryG3Factory.ts`

**Exports:**

- `createStoryG3Context(overrides?)` - Build deterministic g.3 test context (thread IDs, action matrix, path contract)
- `createStoryG3Headers(context, overrides?)` - Build tenant/orgUnit scoped request headers

**Example Usage:**

`const context = createStoryG3Context({ role: 'ORGUNIT_MEMBER' });`

---

## Fixtures Created

### ConnectShyft Story G3 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryG3.fixture.ts`

**Fixtures:**

- `storyG3Context` - Story context with canonical thread IDs and contract expectations
- `storyG3OperatorHeaders`, `storyG3TenantAdminHeaders`, `storyG3ViewerHeaders` - Role-specific header fixtures
- `storyG3InboxQuery`, `storyG3MineQuery` - Deterministic inbox query strings
- `storyG3CallPayload`, `storyG3MessageWithoutOverridePayload`, `storyG3MessageWithOverridePayload` - Outbound action payload fixtures

---

## Mock Requirements

### Outbound Policy Refusal Mock

**Endpoint:** `POST /api/v1/connectshyft/threads/:threadId/messages`

**Success Response:**

- `ok: true`, contextual success `uiFeedback`, no persistent operations-heavy chrome signals.

**Failure Response:**

- `ok: false`, `code: CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED`, contextual warning `uiFeedback`, requires action.

### Closed Reopen Lifecycle Mock

**Endpoint:** `POST /api/v1/connectshyft/threads/:threadId/call` or `/messages`

**Success Response:**

- Same `threadId` returned, state transition `CLOSED -> UNCLAIMED`, lifecycle event `connectshyft.thread_reopened_by_user`.

**Failure Response:**

- Deterministic refusal envelope, no hidden transition side effects.

---

## Required data-testid Attributes

### Thread Detail Conversation-First Surface

- `connectshyft-thread-primary-context-panel` - Primary context container above timeline/action region
- `connectshyft-thread-context-neighbor` - Neighbor context element
- `connectshyft-thread-context-conference` - Conference context element
- `connectshyft-thread-context-claim` - Claim/ownership context element
- `connectshyft-thread-timeline` - Conversation timeline container
- `connectshyft-thread-timeline-event-voicemail` - Inline voicemail event entry
- `connectshyft-thread-action-feedback-contextual` - Action-time contextual feedback surface
- `connectshyft-thread-inbound-auto-reopen-indicator` - Inbound auto-reopen status indicator (expected absent for g.3 outbound reopen scenario)

### Existing Action/Feedback Hooks Reused

- `connectshyft-thread-action-label`
- `connectshyft-send-text-thread-action`
- `connectshyft-send-message-thread-action`
- `connectshyft-policy-refusal-banner`
- `connectshyft-thread-reopened-toast`
- `connectshyft-thread-state-chip`

---

## Implementation Checklist

### Test: [G3-ATDD-E2E-001][P0] Conversation-first context hierarchy

**File:** `tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement a dedicated primary context container in thread detail.
- [ ] Render neighbor, conference, and claim context elements with required test IDs.
- [ ] Ensure context ordering is stable and visible before timeline interactions.
- [ ] Run test: `npx playwright test tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts -g "G3-ATDD-E2E-001"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.5 hours

### Test: [G3-ATDD-E2E-002][P0] Inline voicemail timeline rendering

**File:** `tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Add timeline container and event primitives for thread detail.
- [ ] Render voicemail artifacts as inline first-class timeline events.
- [ ] Add required data-testid attributes for voicemail timeline entries.
- [ ] Run test: `npx playwright test tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts -g "G3-ATDD-E2E-002"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.0 hours

### Test: [G3-ATDD-API-002][P0] State-locked action matrix contract

**File:** `tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Ensure detail contract resolves visible actions strictly by canonical state matrix.
- [ ] Add/emit `actionMatrix.lockedByState` metadata in thread detail response.
- [ ] Verify UI consumes resolved matrix without ad-hoc overrides.
- [ ] Run test: `npx playwright test tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts -g "G3-ATDD-API-002"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1.5 hours

### Test: [G3-ATDD-API-003][P1] Contextual refusal/success feedback contract

**File:** `tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Emit contextual `uiFeedback.presentation` metadata on refusal/success envelopes.
- [ ] Emit chrome metadata indicating no persistent operations-heavy default banners.
- [ ] Map envelope metadata to contextual thread-action feedback in UI.
- [ ] Run test: `npx playwright test tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts -g "G3-ATDD-API-003"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1.5 hours

### Test: [G3-ATDD-API-004][P0] CLOSED outbound reopen lifecycle contract

**File:** `tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Preserve same thread id during CLOSED outbound reopen transition.
- [ ] Emit deterministic lifecycle metadata and explicit no inbound auto-reopen side effects.
- [ ] Align thread detail UI messaging with lifecycle contract fields.
- [ ] Run test: `npx playwright test tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts -g "G3-ATDD-API-004"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.0 hours

---

## Running Tests

```bash
# Run all failing tests for this story
npx playwright test tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts

# Run specific API file
npx playwright test tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts

# Run specific E2E file
npx playwright test tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts

# Run headed mode
npx playwright test tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts --headed

# Debug one test
npx playwright test tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts -g "G3-ATDD-E2E-001" --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing API and E2E tests generated for Story g.3
- ✅ All tests intentionally staged as `test.skip()` for controlled RED handoff
- ✅ Story-specific factory and fixture infrastructure created
- ✅ ATDD checklist and subprocess outputs generated

### GREEN Phase (DEV Team - Next Steps)

1. Remove `test.skip()` from one highest-priority test.
2. Implement minimal behavior to satisfy that test.
3. Re-run targeted test and mark completed when green.
4. Repeat per test until all g.3 scenarios pass.

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Consolidate timeline/context primitives for reuse.
2. Remove temporary glue logic introduced during green phase.
3. Re-run full story test set and related ConnectShyft regressions.

---

## Next Steps

1. Hand off this checklist and RED tests to the dev-story workflow.
2. Start with `[G3-ATDD-E2E-001]` and `[G3-ATDD-API-002]` as the primary P0 pair.
3. Remove `test.skip()` incrementally as implementation begins.
4. Re-run targeted tests after each implementation increment.
5. When all tests pass, proceed to automate/regression expansion.

---

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `network-recorder.md`
- `auth-session.md`
- `intercept-network-call.md`
- `recurse.md`
- `log.md`
- `file-utils.md`
- `network-error-monitor.md`
- `fixtures-composition.md`
- `playwright-cli.md`
