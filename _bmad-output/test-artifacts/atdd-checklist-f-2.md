---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-28T11:01:06Z'
---

# ATDD Checklist - Epic f, Story 2: Canonical Comms Event Model and Event Store

Date: 2026-02-28
Author: Jeremiah
Primary Test Level: API

## Story Summary

Story f.2 establishes a provider-neutral canonical communications event model and event store for ConnectShyft so downstream handlers and operator-facing contracts remain stable regardless of provider payload variance. The RED-phase suite pins event schema, deterministic event queries, and provider-neutral timeline/state outputs before implementation.

## Acceptance Criteria

1. Given outbound actions or provider webhook events occur, when Comms Core persists events, then canonical event records include aggregate id/type, event type, payload, and UTC timestamp with consistent schema.
2. Given downstream thread and lifecycle handlers consume events, when provider-specific payload differences exist, then canonical event translation shields domain handlers from provider-specific fields.
3. Given canonical events are queried for debugging and status endpoints, when filtered by aggregate id or event type, then responses are deterministic and provider-neutral.
4. Given operators consume ConnectShyft thread/status contracts, when canonical events drive those responses, then event-derived state and timeline outputs remain provider-neutral, stable, and deterministically ordered.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: '_bmad-output/implementation-artifacts/f-2-canonical-comms-event-model-and-event-store.md'.
- Mandatory gates passed on branch 'codex/story-f-2-connectshyft-canonical-comms-event-model-and-event-store':
  - 'npm run policy:check'
  - 'npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/f-2-canonical-comms-event-model-and-event-store.md'
- Framework context loaded from 'playwright.config.ts' (Playwright runner, testDir=./tests).
- Existing ConnectShyft ATDD patterns reviewed from:
  - 'tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts'
  - 'tests/api/platform/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.atdd.api.spec.ts'
  - 'tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.api.spec.ts'
  - 'tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.spec.ts'
  - 'tests/e2e/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.spec.ts'
- TEA config flags loaded:
  - 'tea_use_playwright_utils: true'
  - 'tea_browser_automation: auto'
- Knowledge fragments loaded:
  - Core: data-factories.md, component-tdd.md, test-quality.md, test-healing-patterns.md, selector-resilience.md, timing-debugging.md
  - Playwright utils: overview.md, api-request.md, network-recorder.md, auth-session.md, intercept-network-call.md, recurse.md, log.md, file-utils.md, network-error-monitor.md, fixtures-composition.md, api-testing-patterns.md
  - Browser automation: playwright-cli.md

### Step 2: Generation Mode

- Selected mode: AI generation.
- Rationale: Story f.2 is contract/schema and event-store heavy with stable API and UI contract expectations; selector recording is unnecessary for RED-phase scaffolding.

### Step 3: Test Strategy

- Primary level: API for canonical event persistence shape, translation shielding, deterministic filtering, and provider-neutral thread/status contracts.
- Secondary level: E2E for operator-visible timeline determinism and provider-neutral UX guardrails.
- Priority mapping:
  - P0 API: canonical event schema persistence from outbound + inbound flows; translation shielding.
  - P1 API: deterministic aggregate/event-type filters; event-derived provider-neutral thread detail status/timeline.
  - P0/P1 E2E: timeline rendering and debug filter determinism; status chips remain provider-neutral.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (all tests use test.skip):
  - 'tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts'
  - 'tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts'
  - 'tests/support/factories/connectShyftStoryF2Factory.ts'
  - 'tests/support/fixtures/connectShyftStoryF2.fixture.ts'
- Parallel subprocess artifacts written:
  - '_bmad-output/test-artifacts/atdd-temp/api-f-2-2026-02-28T11-00-45Z.json'
  - '_bmad-output/test-artifacts/atdd-temp/e2e-f-2-2026-02-28T11-00-45Z.json'
  - '_bmad-output/test-artifacts/atdd-temp/summary-f-2-2026-02-28T11-00-45Z.json'
  - '/tmp/tea-atdd-api-tests-2026-02-28T11-00-45Z.json'
  - '/tmp/tea-atdd-e2e-tests-2026-02-28T11-00-45Z.json'
  - '/tmp/tea-atdd-summary-2026-02-28T11-00-45Z.json'
- TDD RED checks:
  - all tests include test.skip
  - no placeholder assertions (expect(true).toBe(true)) present

### Step 5: Validate & Complete

- Validation command:
  - 'npx playwright test tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts --list'
- Validation outcome: executed in this workflow run (see completion summary below).
- CLI session hygiene: no Playwright CLI browser sessions opened during this ATDD generation pass.

## Failing Tests Created (RED Phase)

- API: 'tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts' (4 tests)
- E2E: 'tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts' (3 tests)

## Data Factories and Fixtures

- Factory: 'tests/support/factories/connectShyftStoryF2Factory.ts'
- Fixture: 'tests/support/fixtures/connectShyftStoryF2.fixture.ts'

## Mock Requirements

### Canonical Event Store Query Contract

- Endpoint:
  - 'GET /api/v1/connectshyft/events'
- Required query support:
  - aggregateId, aggregateType, eventType, limit
- Required response shape:
  - data.events[].eventId
  - data.events[].aggregateId
  - data.events[].aggregateType
  - data.events[].eventType
  - data.events[].payload
  - data.events[].occurredAtUtc (UTC ISO-8601)

### Canonical Translation Shield Contract

- Endpoint:
  - 'POST /api/v1/connectshyft/webhooks/inbound'
- Required behavior:
  - canonical translation emits provider-neutral eventType
  - downstream handlers indicate providerBranchingInDomain: false
  - provider-specific fields (for example twilioCallSid and telnyxCallControlId) are not leaked into canonical event payload or thread/status contracts

### Provider-Neutral Status/Timeline Contract

- Endpoint:
  - 'GET /api/v1/connectshyft/threads/:threadId'
- Required behavior:
  - status/timeline derived from canonical event store
  - deterministic ordering by occurredAtUtc ASC then eventId ASC
  - provider-neutral event labels and state transitions

## Required data-testid Attributes

- connectshyft-thread-timeline
- connectshyft-thread-timeline-item
- connectshyft-thread-timeline-order-badge
- connectshyft-provider-specific-leak-banner
- connectshyft-events-debug-panel
- connectshyft-events-filter-aggregate-id
- connectshyft-events-filter-event-type
- connectshyft-events-filter-apply
- connectshyft-events-results-row
- connectshyft-events-results-order-chip
- connectshyft-status-derived-from-events-chip
- connectshyft-provider-neutral-contract-chip

## Implementation Checklist

- [ ] Introduce canonical event persistence contract for outbound call/message and inbound webhook processing.
- [ ] Ensure canonical event record schema includes aggregate id/type, event type, payload, and UTC timestamp.
- [ ] Implement deterministic event-store query endpoint with aggregate/event-type filters and stable ordering.
- [ ] Enforce provider translation shielding so provider-specific fields do not leak to domain handlers or status contracts.
- [ ] Derive thread/status timeline outputs from canonical event store and keep them provider-neutral.
- [ ] Add required timeline/debug/status data-testid attributes to operator UI surfaces.
- [ ] Remove test.skip from the f.2 ATDD API/E2E specs and make all tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Current ConnectShyft route contracts expose lifecycle/audit/outbox details but not a dedicated canonical event-store read endpoint; this RED suite intentionally codifies that gap.
- Canonical event type naming assumes provider-neutral domain terms from event_schema.md (for example CallAttemptStarted, CallConnected, MessageQueued).
- Thread detail/status contracts are expected to include canonical timeline entries; if represented in a separate status endpoint, tests may need route-path adaptation during green-phase implementation.

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
- api-testing-patterns.md
- playwright-cli.md
