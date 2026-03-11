---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-27T10:00:44Z'
---

# ATDD Checklist - Epic d, Story 1: Outbound SMS/Call Actions that Preserve Escalation Semantics

**Date:** 2026-02-27
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `d.1` hardens outbound communication semantics on ConnectShyft threads. Outbound actions must preserve claim-only escalation reset behavior, reopen closed threads deterministically before dispatch, and keep inbound closed-thread handling explicit/non-reopening.

## Acceptance Criteria

1. Given an authorized user sends outbound SMS/call actions on an `UNCLAIMED` thread, when dispatch executes, then escalation stage/reset state remains unchanged and operator feedback states escalation continues until claim.
2. Given outbound action starts from a `CLOSED` thread, when action begins, then the same thread reopens immediately (`CLOSED -> UNCLAIMED`) on the same thread id, emits `thread_reopened_by_user`, and applies reset semantics before dispatch.
3. Given outbound call orchestration starts, when call flow executes, then transport is bridge-only (no WebRTC/SIP/softphone), no automatic redial loops run, and successful `CONNECTED` events auto-claim unclaimed threads.
4. Given inbound voice/fallback events arrive on a `CLOSED` thread, when inbound routing executes, then closed threads do not auto-reopen and intake fallback behavior remains explicit and auditable.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: `_bmad-output/implementation-artifacts/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.md`.
- Mandatory policy/workflow gates passed on branch `codex/story-d-1-connectshyft-outbound-sms-call-actions-that-preserve-escalation-semantics`:
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.md`
- Framework context loaded from `playwright.config.ts` (`testDir=./tests`, Playwright runner).
- Existing pattern baselines reviewed: `c-4`/`c-5` ATDD API+E2E suites and ConnectShyft thread-detail UI contracts.
- TEA config flags loaded:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`

### Step 2: Generation Mode

- Selected mode: **AI generation**.
- Rationale: ACs are contract-driven backend/UI semantics with deterministic route and lifecycle expectations; no live selector recording was required for RED-phase generation.

### Step 3: Test Strategy

- **Primary level: API**, because lifecycle/outbound policy semantics and refusal/determinism contracts are highest risk.
- Priority mapping:
  - **P0 API:** unclaimed outbound no-reset semantics, closed-thread reopen-before-dispatch lineage.
  - **P1 API:** bridge-only/manual-retry call orchestration, connected-event auto-claim, inbound closed-thread non-reopen.
  - **P0/P1 E2E:** state/action matrix, reopen feedback determinism, bridge-only UX contract visibility.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (all tests `test.skip(...)`):
  - `tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.api.spec.ts`
  - `tests/e2e/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryD1Factory.ts`
  - `tests/support/fixtures/connectShyftStoryD1.fixture.ts`
- Subprocess artifacts written:
  - `_bmad-output/test-artifacts/atdd-temp/api-d-1-2026-02-27T10-00-44Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-d-1-2026-02-27T10-00-44Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-d-1-2026-02-27T10-00-44Z.json`
  - `/tmp/tea-atdd-api-tests-2026-02-27T10-00-44Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-27T10-00-44Z.json`
  - `/tmp/tea-atdd-summary-2026-02-27T10-00-44Z.json`
- TDD RED checks:
  - all tests include `test.skip(...)`
  - no placeholder assertions (`expect(true).toBe(true)`) present

### Step 5: Validate & Complete

- Validation command:
  - `npx playwright test tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.api.spec.ts tests/e2e/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.spec.ts --list`
- Validation outcome: 11 tests discovered across 2 files.
- CLI session hygiene: no Playwright CLI browser sessions opened in this run.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.api.spec.ts` (6 tests)
- E2E: `tests/e2e/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.spec.ts` (5 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryD1Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryD1.fixture.ts`

## Mock Requirements

### Outbound Call Orchestration Contract

- Endpoint: `POST /api/v1/connectshyft/threads/:threadId/call`
- Expected success additions (post-implementation):
  - `data.callOrchestration.transport = bridge`
  - `data.callOrchestration.webrtcEnabled = false`
  - `data.callOrchestration.sipEnabled = false`
  - `data.callOrchestration.softphoneEnabled = false`
  - `data.callOrchestration.retryPolicy.autoRedial = false`

### Voice Connected Auto-Claim Contract

- Endpoint: `POST /api/v1/connectshyft/webhooks/inbound` (`eventType=voice.connected`)
- Expected behavior (post-implementation):
  - deterministic envelope evidence of connected-triggered auto-claim
  - unclaimed thread transitions to `CLAIMED` with actor/lifecycle provenance

### Closed-Thread Inbound Boundary Contract

- Endpoint: `POST /api/v1/connectshyft/webhooks/inbound` (`voice.voicemail`, `voice.fallback`)
- Expected behavior: no auto-reopen for `CLOSED` threads; explicit fallback timeline/audit metadata.

## Required data-testid Attributes

- `connectshyft-thread-state-chip`
- `connectshyft-thread-id-chip`
- `connectshyft-thread-escalation-chip`
- `connectshyft-thread-inactivity-chip`
- `connectshyft-thread-reopened-toast`
- `connectshyft-thread-action-label`
- `connectshyft-call-thread-action`
- `connectshyft-send-text-thread-action`
- `connectshyft-send-message-thread-action`
- `connectshyft-claim-thread-action`
- `connectshyft-close-thread-action`
- `connectshyft-outbound-policy-notice`
- `connectshyft-call-transport-chip`
- `connectshyft-call-retry-policy-chip`
- `connectshyft-call-auto-redial-toggle`
- `connectshyft-thread-call-connected-badge`
- `connectshyft-inbound-fallback-audit-chip`
- `connectshyft-closed-thread-auto-reopen-banner`

## Implementation Checklist

- [ ] Preserve claim-only escalation reset semantics for unclaimed outbound call/message dispatch.
- [ ] Ensure closed-thread outbound actions reopen same thread id before dispatch and emit `thread_reopened_by_user` lineage.
- [ ] Add bridge-only call orchestration contract fields and disable auto-redial loops.
- [ ] Implement `voice.connected` inbound handling that auto-claims unclaimed threads deterministically.
- [ ] Preserve explicit non-reopening behavior for `voice.voicemail` and `voice.fallback` on closed threads.
- [ ] Surface operator-safe UI cues for escalation continuation, bridge-only routing, and connected auto-claim outcomes.
- [ ] Remove `test.skip(...)` from both d-1 ATDD spec files and make all tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.api.spec.ts tests/e2e/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Existing route layer currently covers generic outbound dispatch and closed-thread reopen, but not full d.1 bridge-only + connected-auto-claim contracts.
- New UI evidence test IDs for bridge/retry/connected cues are expected to be added during implementation.
- RED-phase tests intentionally encode stricter contract expectations than current behavior.

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
- `test-levels-framework.md`
- `test-priorities-matrix.md`
