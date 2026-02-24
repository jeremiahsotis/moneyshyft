---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T18:34:56Z'
---

# ATDD Workflow Progress - Story 2-1

## Step 1 - Preflight and Context

### Resolved Story Context
- story_id: `2-1`
- story_file: `_bmad-output/implementation-artifacts/2-1-commitment-domain-model-and-transition-rules.md`
- story_title: `Commitment Domain Model and Transition Rules`
- story_status: `ready-for-dev`

### Acceptance Criteria Extracted
1. Valid lifecycle transitions only when commitment status changes.
2. Terminal state required by policy.
3. UI/API must surface explicit actionable state and refusal details for valid/refused transitions.

### Mandatory Policy and Branch Gates
- `npm run policy:check`: passed.
- `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/2-1-commitment-domain-model-and-transition-rules.md`: passed.
- Phase-0 readiness gate remediated and verified.

### Framework and Pattern Context
- Test framework: Playwright (`playwright.config.ts`, `testDir=./tests`).
- Existing ATDD patterns discovered in `tests/api/platform/*.atdd.api.spec.ts` and `tests/e2e/platform/*.atdd.spec.ts`.
- Existing fixture/factory architecture discovered under `tests/support/fixtures` and `tests/support/factories`.

### TEA Config Flags
- `tea_use_playwright_utils: true`
- `tea_browser_automation: auto`

### Knowledge Fragments Loaded
- Core: `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns`, `selector-resilience`, `timing-debugging`.
- Playwright-utils: `overview`, `api-request`, `network-recorder`, `auth-session`, `intercept-network-call`, `recurse`, `log`, `file-utils`, `network-error-monitor`, `fixtures-composition`.
- CLI: `playwright-cli`.
- Additional compatibility references: `fixture-architecture`, `network-first`, `test-levels-framework`.

### Input Confirmation
Inputs are complete and sufficient to proceed to generation mode and strategy.

## Step 2 - Generation Mode Selection

- Selected mode: `AI Generation`.
- Decision basis:
  - Acceptance criteria are clear and testable.
  - Existing repository ATDD patterns provide strong local conventions.
  - `tea_browser_automation=auto` allows CLI/MCP fallback, but recording is not required for this story's initial red-phase generation.
- Result: proceed directly to test strategy.

## Step 3 - Test Strategy

### Acceptance Criteria to Scenario Map

1. AC1 (valid lifecycle transitions only)
- Scenario S1 [P0, API]: transition `draft -> scheduled` succeeds with envelope `ok=true`.
- Scenario S2 [P0, API]: invalid transition (for example `draft -> completed`) is refused with deterministic refusal code and actionable details.

2. AC2 (terminal state required by policy)
- Scenario S3 [P0, API]: once commitment reaches terminal state, subsequent transition attempts are refused deterministically.
- Scenario S4 [P1, API]: terminal transition is recorded with policy-required metadata (actor/timestamp/reason in response contract).

3. AC3 (explicit actionable state/refusal details in UI/API)
- Scenario S5 [P1, API]: refusal responses include explicit actionable state and refusal details.
- Scenario S6 [P1, E2E]: dispatcher-facing lifecycle view shows explicit state and refusal messaging without ambiguity.

### Test Level Selection
- Primary level: `API` (domain transition enforcement and refusal envelope behavior).
- Secondary level: `E2E` (operator-facing visibility and clarity of transition/refusal state).
- Component/unit deferred: covered by implementation workflow; ATDD focus remains API/E2E acceptance behavior.

### Red-Phase Conformance
- All generated ATDD tests will use `test.skip(...)`.
- Assertions will target expected behavior contracts (not placeholders).
- Expected failure mode before implementation: missing `/api/v1/route/commitments` lifecycle behavior and corresponding UI lifecycle surfaces.

## Step 4 - Parallel Test Generation and Aggregation

### Subprocess Outputs
- API subprocess output: `/tmp/tea-atdd-api-tests-2026-02-24T18-32-04Z.json`
- E2E subprocess output: `/tmp/tea-atdd-e2e-tests-2026-02-24T18-32-04Z.json`
- Aggregate summary: `/tmp/tea-atdd-summary-2026-02-24T18-32-04Z.json`
- Persisted artifacts:
  - `_bmad-output/test-artifacts/tea-atdd-api-tests-2026-02-24T18-32-04Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-02-24T18-32-04Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-summary-2026-02-24T18-32-04Z.json`

### TDD Red-Phase Validation
- All generated API/E2E tests include `test.skip(...)`.
- No placeholder assertions (`expect(true).toBe(true)`) detected.
- All generated tests marked `expected_to_fail=true`.
- Subprocess execution mode: parallel (`API` + `E2E`).

### Generated Test Files
- `tests/api/platform/2-1-commitment-domain-model-and-transition-rules.atdd.api.spec.ts` (5 skipped API tests)
- `tests/e2e/platform/2-1-commitment-domain-model-and-transition-rules.atdd.spec.ts` (2 skipped E2E tests)
- `tests/support/factories/routeShyftStory21Factory.ts`
- `tests/support/fixtures/routeShyftStory21.fixture.ts`
- `tests/fixtures/route-shyft-atdd-data.ts`

---

# ATDD Checklist - Epic 2, Story 1: Commitment Domain Model and Transition Rules

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

This story introduces first-class commitment lifecycle control with explicit transitions and terminal-state enforcement. ATDD coverage focuses on transition validity, terminal immutability, and explicit refusal/actionable state messaging in both API and dispatcher-facing UI workflows.

**As a** dispatcher  
**I want** commitments represented as first-class entities with explicit transitions  
**So that** execution promises are traceable and terminal-state enforced

## Acceptance Criteria

1. Given a commitment is created, when its status changes, then only valid lifecycle transitions are allowed.
2. Terminal state is required by policy.
3. Given a dispatcher views or updates a commitment, when a transition is valid or refused, then the UI/API surfaces explicit actionable state and refusal details without ambiguity.

## Failing Tests Created (RED Phase)

### E2E Tests (2 tests)
**File:** `tests/e2e/platform/2-1-commitment-domain-model-and-transition-rules.atdd.spec.ts`

- ✅ Test: dispatcher lifecycle view shows explicit state and valid transition controls
  - Status: RED (skipped by design)
  - Verifies: explicit lifecycle state rendering and transition affordances
- ✅ Test: invalid transition produces explicit refusal code/details in dispatcher UI
  - Status: RED (skipped by design)
  - Verifies: refusal details are visible and actionable

### API Tests (5 tests)
**File:** `tests/api/platform/2-1-commitment-domain-model-and-transition-rules.atdd.api.spec.ts`

- ✅ Test: valid draft->scheduled transition succeeds with explicit next-state details
  - Status: RED (skipped by design)
  - Verifies: valid transition semantics and success envelope
- ✅ Test: invalid transition refusal is deterministic and actionable
  - Status: RED (skipped by design)
  - Verifies: refusal contract for invalid transitions
- ✅ Test: terminal-state immutability is enforced
  - Status: RED (skipped by design)
  - Verifies: no mutation after terminal state
- ✅ Test: transition audit metadata (actor/reason/timestamp) is surfaced
  - Status: RED (skipped by design)
  - Verifies: traceability contract
- ✅ Test: envelope keys remain consistent across success/refusal paths
  - Status: RED (skipped by design)
  - Verifies: shared response envelope invariants

## Data Factories Created

### RouteShyft Story 2.1 Factory
**File:** `tests/support/factories/routeShyftStory21Factory.ts`

Exports:
- `createStory21Context(overrides?)`
- `createStory21Headers(context, overrides?)`
- `createStory21CreatePayload(context)`
- `createStory21ValidTransitionPayload()`
- `createStory21InvalidTransitionPayload()`
- `createStory21TerminalTransitionPayload()`

## Fixtures Created

### Story 2.1 Fixtures
**File:** `tests/support/fixtures/routeShyftStory21.fixture.ts`

Fixtures:
- `story21Context`
- `story21Headers`
- `story21CreatePayload`
- `story21ValidTransitionPayload`
- `story21InvalidTransitionPayload`
- `story21TerminalTransitionPayload`

## Mock Requirements

### Commitment Lifecycle API Mock
- Endpoint: `POST /api/v1/route/commitments/:id/transition`
- Success response must include:
  - `ok=true`, `code=ROUTESHYFT_COMMITMENT_TRANSITION_APPLIED`
  - commitment `previousStatus`, `status`, `actionableState`
  - audit details (`actorId`, `timestampUtc`, `reason`)
- Refusal response must include:
  - `ok=false`, `refusalType=business`
  - deterministic refusal code
  - explicit `actionableState` and refusal details

## Required data-testid Attributes

### Commitment Lifecycle UI
- `routeshyft-commitment-status-badge` - visible current lifecycle state
- `routeshyft-commitment-transition-select` - transition action selector
- `routeshyft-commitment-transition-submit` - trigger transition mutation
- `routeshyft-commitment-transition-reason-input` - required transition reason input
- `routeshyft-commitment-refusal-banner` - refusal alert container
- `routeshyft-commitment-refusal-code` - deterministic refusal code display
- `routeshyft-commitment-refusal-details` - actionable refusal guidance

## Implementation Checklist

### API / Domain Tasks
- [ ] Implement commitment aggregate lifecycle matrix in route domain module.
- [ ] Enforce valid transition matrix (`draft -> scheduled`, etc.) in application layer.
- [ ] Enforce terminal-state immutability in transition handler.
- [ ] Return deterministic refusal envelope for invalid and terminal mutations.
- [ ] Emit transition audit payload (actor, timestamp, reason, previous/new state).
- [ ] Preserve shared envelope keys across success/refusal paths.

### UI / Operator Tasks
- [ ] Implement commitment lifecycle view at `/app/route/commitments`.
- [ ] Render explicit lifecycle state badge and transition action controls.
- [ ] Render refusal banner/code/details when transition is refused.
- [ ] Add required `data-testid` attributes listed above.

### Green-Phase Execution
- [ ] Remove `test.skip` from Story 2.1 ATDD API/E2E specs.
- [ ] Run API ATDD spec.
- [ ] Run E2E ATDD spec.
- [ ] Confirm all Story 2.1 tests pass.

## Running Tests

```bash
# API ATDD (Story 2.1)
npx playwright test tests/api/platform/2-1-commitment-domain-model-and-transition-rules.atdd.api.spec.ts

# E2E ATDD (Story 2.1)
npx playwright test tests/e2e/platform/2-1-commitment-domain-model-and-transition-rules.atdd.spec.ts

# Full story-focused run
npx playwright test tests/api/platform/2-1-commitment-domain-model-and-transition-rules.atdd.api.spec.ts tests/e2e/platform/2-1-commitment-domain-model-and-transition-rules.atdd.spec.ts
```

## Red-Green-Refactor Workflow

### RED Phase (Complete)
- ✅ Failing tests generated (7 total)
- ✅ Fixture and factory infrastructure scaffolded
- ✅ Refusal/actionable-state contracts defined
- ✅ `data-testid` requirements listed

### GREEN Phase (Next)
1. Implement route commitment lifecycle domain/application behavior.
2. Implement dispatcher lifecycle UI rendering and refusal surfaces.
3. Remove `test.skip` and make Story 2.1 tests pass.

### REFACTOR Phase
1. Consolidate reusable transition helpers if duplication appears.
2. Keep tests deterministic and independent.
3. Preserve envelope and refusal contract compatibility.

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `intercept-network-call.md`
- `fixtures-composition.md`
- `playwright-cli.md`
- `fixture-architecture.md`
- `network-first.md`
- `test-levels-framework.md`

## Step 5 - Validate and Complete

### Validation Results
- Prerequisites: satisfied.
- ATDD artifacts generated and saved to expected locations.
- Red-phase design check: all Story 2.1 tests are intentionally skipped and assert expected contracts.
- Syntax/runtime validation run:
  - `npx playwright test tests/api/platform/2-1-commitment-domain-model-and-transition-rules.atdd.api.spec.ts tests/e2e/platform/2-1-commitment-domain-model-and-transition-rules.atdd.spec.ts`
  - Result: `7 skipped`, `0 failed`.
- No CLI browser sessions were opened; no cleanup required.
- Temp outputs were preserved in `_bmad-output/test-artifacts` for traceability.

### Completion Summary
- Story ID: `2-1`
- Primary level: `API`
- Generated tests: `7` (`5 API`, `2 E2E`)
- Output checklist: `_bmad-output/test-artifacts/atdd-checklist-2-1.md`
- Key assumption: route commitment lifecycle endpoints and UI surfaces do not yet fully implement Story 2.1 behavior.
- Recommended next workflow: implementation/development pass to move RED -> GREEN, then optional `automate` for expansion coverage.
