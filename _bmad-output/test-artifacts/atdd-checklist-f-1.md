---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-27T21:38:03Z'
---

# ATDD Checklist - Epic f, Story 1: Provider Adapter Interface and Provider Registry

**Date:** 2026-02-27
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `f.1` establishes the provider adapter contract and deterministic provider registry behavior for ConnectShyft comms. The RED-phase suite locks fail-closed refusal behavior, provider-neutral contract outputs, and operator-visible refusal clarity before implementation begins.

## Acceptance Criteria

1. Given Comms Core executes outbound or inbound operations, when provider resolution runs, then operations dispatch through a provider adapter interface with deterministic selection for enabled providers.
2. Given a provider is disabled or missing, when a comms operation is attempted, then the system returns a deterministic refusal with no partial writes.
3. Given adapter contracts are consumed by ConnectShyft routes/services, when domain logic is reviewed, then Twilio-specific branching is removed from business handlers and replaced by adapter interface calls.
4. Given provider resolution returns a refusal for an operator-triggered comms action, when ConnectShyft contracts return the result, then refusal metadata is explicit and actionable for operators and confirms no hidden lifecycle mutation occurred.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: `_bmad-output/implementation-artifacts/f-1-provider-adapter-interface-and-provider-registry.md`.
- Mandatory gates passed on branch `codex/story-f-1-connectshyft-provider-adapter-interface-and-provider-registry`:
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/f-1-provider-adapter-interface-and-provider-registry.md`
- Framework context loaded from `playwright.config.ts` (`testDir=./tests`, Playwright runner).
- Existing patterns reviewed from `tests/api/platform/` and `tests/e2e/platform/` ConnectShyft ATDD suites.
- TEA config flags loaded:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`

### Step 2: Generation Mode

- Selected mode: **AI generation**.
- Rationale: ACs are contract-centric and backend-heavy; no live selector recording was required for RED-phase generation.

### Step 3: Test Strategy

- **Primary level: API** for provider resolution, fail-closed refusal semantics, and provider-neutral contract assertions.
- **Secondary level: E2E** for operator-facing refusal/actionability and no-hidden-transition evidence.
- Priority mapping:
  - **P0 API:** deterministic enabled-provider dispatch, inbound adapter translation, disabled-provider fail-closed refusal.
  - **P1 API:** missing-provider actionable refusal metadata, provider-neutral response contract checks.
  - **P0/P1 E2E:** deterministic provider resolution visibility and refusal UX contracts.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (`test.skip(...)`):
  - `tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts`
  - `tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryF1Factory.ts`
  - `tests/support/fixtures/connectShyftStoryF1.fixture.ts`
- Parallel subprocess artifacts written:
  - `_bmad-output/test-artifacts/atdd-temp/api-f-1-2026-02-27T21-38-03Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-f-1-2026-02-27T21-38-03Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-f-1-2026-02-27T21-38-03Z.json`
  - `/tmp/tea-atdd-api-tests-2026-02-27T21-38-03Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-27T21-38-03Z.json`
  - `/tmp/tea-atdd-summary-2026-02-27T21-38-03Z.json`
- TDD RED checks:
  - all tests include `test.skip(...)`
  - no placeholder assertions (`expect(true).toBe(true)`) present

### Step 5: Validate & Complete

- Validation command:
  - `npx playwright test tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.spec.ts --list`
- Validation outcome: 8 tests discovered across 2 files.
- CLI session hygiene: no Playwright CLI browser sessions opened in this run.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts` (5 tests)
- E2E: `tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.spec.ts` (3 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryF1Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryF1.fixture.ts`

## Mock Requirements

### Provider Resolution Contract

- Endpoint(s):
  - `POST /api/v1/connectshyft/threads/:threadId/call`
  - `POST /api/v1/connectshyft/threads/:threadId/messages`
  - `POST /api/v1/connectshyft/webhooks/inbound`
- Required response shape:
  - `data.providerResolution.requestedProvider`
  - `data.providerResolution.resolvedProvider`
  - `data.providerResolution.deterministic`
  - `data.providerResolution.adapterInvoked` (inbound/outbound where applicable)

### Fail-Closed Refusal Contract

- Endpoint(s):
  - `POST /api/v1/connectshyft/threads/:threadId/call` (disabled provider)
  - `POST /api/v1/connectshyft/threads/:threadId/messages` (missing provider)
- Required refusal behavior:
  - `ok: false`
  - `code` in `{CONNECTSHYFT_PROVIDER_DISABLED, CONNECTSHYFT_PROVIDER_UNAVAILABLE}`
  - `data.sideEffects.dispatchAttempted = false`
  - `data.sideEffects.lifecycleMutationApplied = false`
  - `data.sideEffects.auditPersisted = false`

## Required data-testid Attributes

- `connectshyft-provider-resolution-chip`
- `connectshyft-provider-resolution-policy-chip`
- `connectshyft-provider-branch-warning`
- `connectshyft-provider-refusal-banner`
- `connectshyft-provider-refusal-reason-code`
- `connectshyft-provider-remediation-action`
- `connectshyft-thread-state-chip`
- `connectshyft-hidden-transition-warning`

## Implementation Checklist

- [ ] Implement provider adapter interface contracts for outbound call/message and inbound webhook flows.
- [ ] Implement deterministic registry resolution for enabled providers.
- [ ] Implement fail-closed refusal behavior for disabled/unregistered providers with no partial writes.
- [ ] Ensure ConnectShyft route/service responses remain provider-neutral and do not leak Twilio-specific branching fields.
- [ ] Ensure refusal payload metadata remains explicit and actionable for operators and confirms no hidden lifecycle mutation.
- [ ] Add/maintain required data-testid hooks for provider resolution and refusal UX evidence.
- [ ] Remove `test.skip(...)` from F1 ATDD spec files and make all tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Existing route logic still contains Twilio-coupled behavior; RED tests intentionally encode stricter provider-neutral expectations.
- Provider-selection test headers/payload hints (`providerKey`, provider registry headers) are treated as contract inputs to be implemented during green phase.
- E2E assertions assume new operator-facing provider refusal UI affordances and test IDs will be added.

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
