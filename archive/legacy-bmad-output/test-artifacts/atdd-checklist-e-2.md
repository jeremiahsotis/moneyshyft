---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-03T12:38:10Z'
---

# ATDD Checklist - Epic e, Story 2: Inbound SMS Processing with Active-Thread Ensure

Date: 2026-03-03
Author: Jeremiah
Primary Test Level: API

## Story Summary

Story e.2 ensures inbound SMS webhooks append message artifacts to the correct active thread for a tenant-orgUnit-neighbor tuple, creates a thread when none exists, and suppresses duplicate timeline side effects for replayed provider events.

## Acceptance Criteria

1. Given a valid inbound SMS webhook for a mapped provider number, when processing executes, then the system ensures a single active thread for (tenant_id, org_unit_id, neighbor_id) and appends the inbound message artifact.
2. Given an active thread already exists for (tenant_id, org_unit_id, neighbor_id), when inbound SMS is processed, then no duplicate active thread is created and message ordering stays deterministic.
3. Given duplicate inbound SMS webhook deliveries for the same provider event identity, when handlers run, then duplicate timeline entries are suppressed by replay-safe processing.
4. Given no active thread exists and context is valid, when ensure logic runs, then a new active thread is created under canonical thread constraints and message artifact persistence remains atomic with audit/outbox writes.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: _bmad-output/implementation-artifacts/e-2-inbound-sms-processing-with-active-thread-ensure.md
- Mandatory branch/policy gates passed with required remediation from protected branch:
  - npm run start:story-branch -- --allow-dirty e-2 inbound-sms-processing-with-active-thread-ensure
  - npm run policy:check
  - npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/e-2-inbound-sms-processing-with-active-thread-ensure.md
- Framework and existing patterns loaded:
  - playwright.config.ts
  - tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts
  - tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.spec.ts
  - tests/api/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.api.spec.ts
  - tests/support/helpers/connectShyftWebhookTestHelpers.ts
- TEA config flags loaded:
  - tea_use_playwright_utils: true
  - tea_browser_automation: auto
- Knowledge fragments loaded:
  - Core: data-factories.md, component-tdd.md, test-quality.md, test-healing-patterns.md, selector-resilience.md, timing-debugging.md
  - Playwright utils: overview.md, api-request.md, network-recorder.md, auth-session.md, intercept-network-call.md, recurse.md, log.md, file-utils.md, network-error-monitor.md, fixtures-composition.md
  - Browser automation: playwright-cli.md
- Official documentation cross-check completed:
  - Playwright test annotations and skip behavior
  - Playwright locator guidance
  - Cypress selector best practices
  - Pact contract-testing references
  - GitHub Actions CI pipeline references

### Step 2: Generation Mode

- Selected mode: AI generation.
- Rationale: Story e.2 is backend/webhook-domain heavy with deterministic contracts and replay/idempotency concerns; RED-phase contract generation from story plus existing ConnectShyft suites provides the highest signal.

### Step 3: Test Strategy

- Primary level: API contract tests (ensure semantics, replay-safe suppression, atomic audit/outbox persistence).
- Secondary level: E2E integration journey tests (multi-request flow proving create-and-append, convergence under concurrency, and replay suppression).
- Priority mapping:
  - P0 API: mapped ensure plus append, existing-thread reuse, duplicate replay suppression.
  - P1 API: atomic create-and-append persistence semantics.
  - P0 E2E: create-and-append journey, concurrent convergence journey.
  - P1 E2E: duplicate replay journey.
- RED-phase requirement enforced: all generated tests use test.skip(...).

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (all tests use test.skip):
  - tests/api/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.api.spec.ts
  - tests/e2e/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.spec.ts
  - tests/support/factories/connectShyftStoryE2Factory.ts
  - tests/support/fixtures/connectShyftStoryE2.fixture.ts
- Parallel subprocess artifacts written:
  - _bmad-output/test-artifacts/atdd-temp/api-e-2-2026-03-03T12-38-10Z.json
  - _bmad-output/test-artifacts/atdd-temp/e2e-e-2-2026-03-03T12-38-10Z.json
  - _bmad-output/test-artifacts/atdd-temp/summary-e-2-2026-03-03T12-38-10Z.json
  - _bmad-output/test-artifacts/tea-atdd-api-tests-2026-03-03T12-38-10Z.json
  - _bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-03-03T12-38-10Z.json
  - _bmad-output/test-artifacts/tea-atdd-summary-2026-03-03T12-38-10Z.json
  - /tmp/tea-atdd-api-tests-2026-03-03T12-38-10Z.json
  - /tmp/tea-atdd-e2e-tests-2026-03-03T12-38-10Z.json
  - /tmp/tea-atdd-summary-2026-03-03T12-38-10Z.json
- TDD RED checks:
  - all generated tests include test.skip
  - no placeholder assertions (expect(true).toBe(true)) present

### Step 5: Validate & Complete

- Validation command:
  - npx playwright test tests/api/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.api.spec.ts tests/e2e/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.spec.ts --list
- Validation outcome:
  - 7 tests discovered across 2 files (4 API + 3 E2E)
  - Playwright test registration/listing passed
- CLI session hygiene:
  - no Playwright CLI browser sessions opened during this ATDD run

## Failing Tests Created (RED Phase)

- API: tests/api/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.api.spec.ts (4 tests)
- E2E: tests/e2e/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.spec.ts (3 tests)

## Data Factories and Fixtures

- Factory: tests/support/factories/connectShyftStoryE2Factory.ts
- Fixture: tests/support/fixtures/connectShyftStoryE2.fixture.ts

## Mock Requirements

### Inbound SMS Ensure Contract

- Endpoint:
  - POST /api/v1/connectshyft/webhooks/inbound
- Required behavior:
  - mapped inbound SMS resolves deterministic tenant/orgUnit context
  - active thread is ensured by canonical tuple (tenant_id, org_unit_id, neighbor_id)
  - inbound message artifact is appended to thread timeline

### Replay Suppression Contract

- Endpoint:
  - POST /api/v1/connectshyft/webhooks/inbound
- Required behavior:
  - duplicate provider event identity returns replay-safe duplicate metadata
  - duplicate processing suppresses duplicate timeline/audit/outbox writes

## Required data-testid Attributes

- No net-new UI contract is strictly required for backend completion of story e.2.
- If operator timeline visualization is expanded for inbound SMS behavior, reserve stable hooks:
  - connectshyft-thread-timeline-sms-inbound-row
  - connectshyft-thread-timeline-replay-suppressed-chip
  - connectshyft-thread-ensure-origin-chip

## Implementation Checklist

- [ ] Resolve inbound SMS webhook correlation to canonical tenant/orgUnit/neighbor context for mapped numbers.
- [ ] Ensure one active thread identity for (tenant_id, org_unit_id, neighbor_id) under concurrent inbound deliveries.
- [ ] Append inbound SMS message artifact to timeline with deterministic ordering metadata.
- [ ] Enforce replay-safe duplicate suppression by provider event identity prior to timeline/audit/outbox writes.
- [ ] Preserve atomic create-and-append mutation semantics across canonical event, audit, and outbox persistence.
- [ ] Remove test.skip from e.2 ATDD API/E2E specs and make all tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.api.spec.ts tests/e2e/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Existing inbound webhook implementation is voice-event oriented; e.2 implementation must add inbound-SMS ensure-plus-append semantics without regressing voice behavior.
- Replay-safe suppression assertions assume deterministic provider event dedupe keys remain tenant-scoped and stable.
- RED-phase expectations intentionally encode target-state contracts; current runtime responses are expected to diverge until e.2 implementation lands.

## Knowledge Base References Applied

- data-factories.md
- component-tdd.md
- test-quality.md
- test-healing-patterns.md
- selector-resilience.md
- timing-debugging.md
- overview.md
- api-request.md
- network-recorder.md
- auth-session.md
- intercept-network-call.md
- recurse.md
- log.md
- file-utils.md
- network-error-monitor.md
- fixtures-composition.md
- playwright-cli.md
