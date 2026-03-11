---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-03T21:47:10Z'
---

# ATDD Checklist - Story ux-r3: Voicemail and Indicator Behavior

**Date:** 2026-03-03
**Author:** Jeremiah
**Primary Test Level:** API + E2E

---

## Story Summary

This ATDD package defines red-phase acceptance tests for voicemail and inbound voice handling across `CLAIMED`, `UNCLAIMED`, and `CLOSED` thread states. The suite focuses on preserving Mine/Inbox placement invariants, voicemail indicator clarity, and lifecycle timer non-reset semantics while ensuring closed-thread inbound voice remains locked to fallback behavior.

**As a** claimed thread owner  
**I want** voicemail events reflected without losing thread ownership context  
**So that** follow-up work remains clear and inbox churn is avoided

---

## Acceptance Criteria

1. Voicemail received on `CLAIMED` thread remains in Mine and shows voicemail indicators without Inbox reclassification.
2. Voicemail received on `UNCLAIMED` thread remains in Inbox with voicemail-received labeling.
3. Voicemail/missed inbound events do not reset escalation or inactivity timers.
4. Inbound voice for `CLOSED` thread does not auto-reopen and follows locked fallback behavior.

---

## Step 1 Inputs (Preflight & Context)

### Prerequisites

- Story context loaded: `_bmad-output/implementation-artifacts/ux-r3-voicemail-and-indicator-behavior.md`
- Framework config loaded: `playwright.config.ts`
- Test directories discovered: `tests/api/platform/`, `tests/e2e/platform/`, `tests/support/factories/`, `tests/support/fixtures/`

### Mandatory Policy Gate

- `npm run policy:check` passed after status transition remediation on story `e-5`.
- `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/ux-r3-voicemail-and-indicator-behavior.md` passed.

### Branch & Tooling Remediation Applied

- Added `ux-r3` story-id parsing support to:
  - `scripts/branch-ensure-workflow.sh`
  - `scripts/start-story-branch.sh`
- Created and switched to branch:
  - `codex/story-ux-r3-connectshyft-voicemail-and-indicator-behavior`

### Knowledge Fragments Loaded

Core:
- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`

Playwright Utils (enabled):
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

Browser automation mode (`auto`):
- `playwright-cli.md`

---

## Step 2 Mode Selection

**Chosen mode:** AI generation (documentation/pattern-driven)

**Reason:** Acceptance criteria are clear and close analogs already exist in `c-3`, `e-3`, `ux-r1`, and `ux-r2` test suites, allowing robust red-phase generation without blocking on live selector recording.

---

## Step 3 Test Strategy

### AC-to-Scenario Mapping

- AC1 (`CLAIMED` voicemail placement): P0 API + P0 E2E
- AC2 (`UNCLAIMED` voicemail placement + label): P0 API + P0 E2E
- AC3 (timer non-reset invariants): P1 API + P1 E2E
- AC4 (`CLOSED` inbound voice fallback/no reopen): P0 API + P0 E2E

### Level Selection

- **API**: Contract and lifecycle semantics (placement, labels, lifecycle flags, routingDecision).
- **E2E**: Operator-visible surfaces (Mine/Inbox card placement, indicators, fallback/closed-state render behavior).

### Red-Phase Compliance

All generated acceptance tests are marked with `test.skip()` and assert expected post-implementation behavior.

---

## Failing Tests Created (RED Phase)

### E2E Tests (4 tests)

**File:** `tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts` (141 lines)

- ✅ **Test:** claimed-thread voicemail remains on Mine with indicator and no Inbox bounce (`@P0`)
  - **Status:** RED - expected failure until placement/indicator semantics are fully implemented
  - **Verifies:** AC1
- ✅ **Test:** unclaimed-thread voicemail remains in Inbox with voicemail-received label (`@P0`)
  - **Status:** RED - expected failure until unclaimed label contract is stable
  - **Verifies:** AC2
- ✅ **Test:** voicemail-only events preserve escalation/inactivity render state (`@P1`)
  - **Status:** RED - expected failure until timer reset guards are fully surfaced
  - **Verifies:** AC3
- ✅ **Test:** closed-thread inbound voice retains CLOSED state with fallback treatment (`@P0`)
  - **Status:** RED - expected failure until closed-thread fallback UX is finalized
  - **Verifies:** AC4

### API Tests (4 tests)

**File:** `tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts` (172 lines)

- ✅ **Test:** claimed voicemail stays in Mine, not reclassified to Inbox (`@P0`)
  - **Status:** RED - expected failure until claimed voicemail routing contract is complete
  - **Verifies:** AC1
- ✅ **Test:** unclaimed voicemail remains in Inbox with voicemail-received label (`@P0`)
  - **Status:** RED - expected failure until unclaimed voicemail labeling contract is complete
  - **Verifies:** AC2
- ✅ **Test:** voicemail/missed-inbound events do not reset escalation/inactivity (`@P1`)
  - **Status:** RED - expected failure until lifecycle reset guards are complete
  - **Verifies:** AC3
- ✅ **Test:** closed-thread inbound voice does not reopen and routes to fallback (`@P0`)
  - **Status:** RED - expected failure until locked fallback path is complete
  - **Verifies:** AC4

### Component Tests (0 tests)

Component-level ATDD tests were deferred because this story’s primary risk is contract/lifecycle behavior across API and integrated UI surfaces.

---

## Data Factories Created

### ConnectShyft ux-r3 Factory

**File:** `tests/support/factories/connectShyftStoryUxR3Factory.ts`

**Exports:**
- `createStoryUxR3Context(overrides?)`
- `createStoryUxR3Headers(context, overrides?)`

**Purpose:** Story-scoped context for thread IDs, neighbor IDs, event names, expected labels, and route paths.

---

## Fixtures Created

### ConnectShyft ux-r3 Fixture

**File:** `tests/support/fixtures/connectShyftStoryUxR3.fixture.ts`

**Fixtures:**
- `storyUxR3Context`
- `storyUxR3MemberHeaders`
- `storyUxR3AdminHeaders`
- `storyUxR3InboxQuery`
- `storyUxR3MineQuery`
- `storyUxR3InboundVoicemailPayload`
- `storyUxR3InboundClosedPayload`

**Setup/Cleanup:** Test-local deterministic payload/context generation with scoped headers.

---

## Mock Requirements

### Inbound Voice Webhook Response Behavior

**Endpoint:** `POST /api/v1/connectshyft/webhooks/inbound`

**Success Expectations:**
- `code: CONNECTSHYFT_WEBHOOK_ACCEPTED`
- `lifecycle.reopenedByInbound: false` for `CLOSED` and voicemail-only events
- `timeline.routingDecision: intake_fallback` for locked closed-thread behavior
- `lifecycle.escalationResetApplied: false` and `lifecycle.inactivityResetApplied: false` for voicemail-only events

**Failure/Refusal Expectations:**
- Signature/correlation failures remain refusal responses and must not mutate lifecycle state.

---

## Required data-testid Attributes

### Mine/Inbox Surfaces

- `connectshyft-thread-card-{threadId}` - per-thread list item
- `connectshyft-voicemail-indicator-{threadId}` - voicemail visual indicator

### Thread Detail

- `connectshyft-thread-state-badge` - lifecycle state chip
- `connectshyft-escalation-stage` - escalation stage display
- `connectshyft-inactivity-timer` - inactivity timer display
- `connectshyft-voice-fallback-banner` - locked fallback indicator
- `connectshyft-thread-reopened-banner` - must be absent for inbound locked flows

---

## Implementation Checklist

### API: ux-r3 red tests (`tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts`)

- [ ] Enforce claimed voicemail placement invariant (`CLAIMED` stays Mine).
- [ ] Enforce unclaimed voicemail placement + `voicemail-received` label contract.
- [ ] Guarantee voicemail/missed-inbound lifecycle processing leaves escalation/inactivity windows unchanged.
- [ ] Guarantee `CLOSED` inbound voice stays closed and routes to locked fallback.
- [ ] Run `npx playwright test tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts`.
- [ ] Remove `test.skip()` once behavior is implemented and stable.

### E2E: ux-r3 red tests (`tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts`)

- [ ] Render claimed voicemail only on Mine with visible voicemail indicator.
- [ ] Render unclaimed voicemail on Inbox with voicemail-received label copy.
- [ ] Ensure timer UI surfaces do not indicate reset for voicemail-only events.
- [ ] Ensure closed-thread inbound voice render path shows fallback and no reopen banner.
- [ ] Add/confirm required `data-testid` attributes listed above.
- [ ] Run `npx playwright test tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts`.
- [ ] Remove `test.skip()` once behavior is implemented and stable.

---

## Running Tests

```bash
# List generated tests
npx playwright test --list tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts

# Run API red-phase file (after unskipping)
npx playwright test tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts

# Run E2E red-phase file (after unskipping)
npx playwright test tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts

# Run both files together
npx playwright test tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete)

- ✅ Generated 8 acceptance tests (4 API + 4 E2E)
- ✅ All tests intentionally marked with `test.skip()`
- ✅ Story-specific factory and fixture scaffolding generated
- ✅ Implementation checklist mapped directly to AC1-AC4

### GREEN Phase (Next)

1. Implement UX/API behavior for AC1-AC4.
2. Remove `test.skip()` from one test at a time (P0 first).
3. Run the single file and make the test pass.
4. Repeat until all ux-r3 tests pass.

### REFACTOR Phase

1. Consolidate duplicated webhook payload setup helpers.
2. Harden selectors and reduce brittle coupling.
3. Ensure all tests remain deterministic and isolated.

---

## Validation Summary (Step 5)

- Prerequisites: ✅ satisfied
- Policy gate: ✅ passed
- Branch workflow guard: ✅ passed
- Test files generated: ✅ API + E2E
- Red phase marker (`test.skip()`): ✅ present on all generated tests
- CLI sessions: ✅ none opened for this run
- Temp artifacts pathing: ✅ generated in `/tmp` and copied into `_bmad-output/test-artifacts/atdd-temp/`

Generated temp artifacts:
- `/tmp/tea-atdd-api-tests-2026-03-03T21-46-58-201Z.json`
- `/tmp/tea-atdd-e2e-tests-2026-03-03T21-46-58-201Z.json`
- `/tmp/tea-atdd-summary-2026-03-03T21-46-58-201Z.json`
- `_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-03-03T21-46-58-201Z.json`
- `_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-03-03T21-46-58-201Z.json`
- `_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-03-03T21-46-58-201Z.json`

---

## Generated File Inventory

- `tests/support/factories/connectShyftStoryUxR3Factory.ts`
- `tests/support/fixtures/connectShyftStoryUxR3.fixture.ts`
- `tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts`
- `tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts`
- `_bmad-output/test-artifacts/atdd-checklist-ux-r3.md`

---

**Generated by BMad TEA Agent** - 2026-03-03
