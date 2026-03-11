---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-03T16:26:27Z'
---

# ATDD Checklist - Epic e, Story 3: Inbound Voice Webhook to Voicemail Artifact Pipeline

Date: 2026-03-03
Author: Jeremiah
Primary Test Level: API

## Story Summary

Story e.3 defines inbound voice webhook behavior that must create voicemail artifacts on the correct active thread, apply state-aware routing rules, queue transcription callbacks with durable correlation metadata, and preserve locked lifecycle reset semantics.

## Acceptance Criteria

1. Given a valid inbound voice webhook, when processing completes, then a voicemail artifact is created and linked to the correct active thread for resolved (tenant_id, org_unit_id, neighbor_id) context.
2. Given active-thread state-specific routing rules apply, when inbound voice is processed, then behavior follows locked policy: no active thread routes to intake fallback, UNCLAIMED routes voicemail-only, and CLAIMED follows orgUnit-configured mode.
3. Given voicemail artifact creation succeeds, when pipeline completion runs, then a transcription request is queued with correlation metadata needed for later callback attachment.
4. Given voicemail-only inbound events occur, when lifecycle and escalation fields are evaluated, then escalation/inactivity reset behavior remains unchanged unless explicitly required by locked lifecycle rules.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: _bmad-output/implementation-artifacts/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.md
- Mandatory branch/policy gates passed with required remediation from protected branch:
  - npm run start:story-branch -- --allow-dirty e-3 inbound-voice-webhook-to-voicemail-artifact-pipeline
  - npm run policy:check
  - npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.md
- Framework and existing patterns loaded:
  - playwright.config.ts
  - tests/api/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.api.spec.ts
  - tests/e2e/platform/e-2-inbound-sms-processing-with-active-thread-ensure.atdd.spec.ts
  - tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.api.spec.ts
  - tests/support/helpers/connectShyftWebhookTestHelpers.ts
- TEA config flags loaded:
  - tea_use_playwright_utils: true
  - tea_browser_automation: auto
- Knowledge fragments loaded:
  - Core: data-factories.md, component-tdd.md, test-quality.md, test-healing-patterns.md, selector-resilience.md, timing-debugging.md

### Step 2: Generation Mode

- Selected mode: AI generation.
- Rationale: Story e.3 is contract-heavy and backend-driven; RED-phase authoring can be produced directly from acceptance criteria and existing ConnectShyft routing/webhook patterns.

### Step 3: Test Strategy

- Primary level: API contract tests for inbound webhook routing, voicemail artifact contracts, transcription enqueue metadata, and lifecycle reset protections.
- Secondary level: E2E integration tests for end-to-end routing matrix and artifact/transcription continuity.
- Priority mapping:
  - P0 API: valid voicemail artifact linkage, no-active-thread intake fallback behavior.
  - P1 API: claimed-mode routing, transcription enqueue correlation, lifecycle reset guardrail preservation.
  - P0 E2E: end-to-end artifact linkage and state matrix routing.
  - P1 E2E: transcription/lifecycle guardrail continuity.
- RED-phase requirement enforced: all generated tests use test.skip(...).

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (all tests use test.skip):
  - tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts
  - tests/e2e/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.spec.ts
  - tests/support/factories/connectShyftStoryE3Factory.ts
  - tests/support/fixtures/connectShyftStoryE3.fixture.ts
- Parallel subprocess artifacts written:
  - _bmad-output/test-artifacts/atdd-temp/api-e-3-2026-03-03T16-26-27Z.json
  - _bmad-output/test-artifacts/atdd-temp/e2e-e-3-2026-03-03T16-26-27Z.json
  - _bmad-output/test-artifacts/atdd-temp/summary-e-3-2026-03-03T16-26-27Z.json
  - _bmad-output/test-artifacts/tea-atdd-api-tests-2026-03-03T16-26-27Z.json
  - _bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-03-03T16-26-27Z.json
  - _bmad-output/test-artifacts/tea-atdd-summary-2026-03-03T16-26-27Z.json
  - /tmp/tea-atdd-api-tests-2026-03-03T16-26-27Z.json
  - /tmp/tea-atdd-e2e-tests-2026-03-03T16-26-27Z.json
  - /tmp/tea-atdd-summary-2026-03-03T16-26-27Z.json
- TDD RED checks:
  - all generated tests include test.skip
  - no placeholder assertions (expect(true).toBe(true)) present

### Step 5: Validate & Complete

- Validation command:
  - npx playwright test tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts tests/e2e/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.spec.ts --list
- Validation outcome:
  - 8 tests discovered across 2 files (5 API + 3 E2E)
  - Playwright registration/listing passed
- CLI session hygiene:
  - no Playwright CLI browser sessions opened during this ATDD run

## Failing Tests Created (RED Phase)

- API: tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts (5 tests)
- E2E: tests/e2e/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.spec.ts (3 tests)

## Data Factories and Fixtures

- Factory: tests/support/factories/connectShyftStoryE3Factory.ts
- Fixture: tests/support/fixtures/connectShyftStoryE3.fixture.ts

## Mock Requirements

### Voice Inbound Routing and Artifact Contract

- Endpoint:
  - POST /api/v1/connectshyft/webhooks/inbound
- Required behavior:
  - valid voice voicemail events resolve deterministic tenant/orgUnit/neighbor context
  - voicemail artifacts are attached to the active thread timeline
  - routing matrix honors no-thread intake fallback and unclaimed voicemail-only behavior

### Transcription Enqueue Contract

- Endpoint:
  - POST /api/v1/connectshyft/webhooks/inbound
- Required behavior:
  - successful voicemail artifact write queues transcription request
  - callback correlation persists tenantId, orgUnitId, threadId, providerEventId, providerLegId, and voicemailArtifactId

## Required data-testid Attributes

- No net-new UI contract is strictly required for backend completion of story e.3.
- If operator timeline/transcription indicators are expanded, reserve stable hooks:
  - connectshyft-thread-timeline-voice-voicemail-row
  - connectshyft-thread-timeline-routing-decision-chip
  - connectshyft-thread-transcription-queued-chip
  - connectshyft-thread-voicemail-artifact-link

## Implementation Checklist

- [ ] Resolve inbound voice webhook to canonical tenant/orgUnit/neighbor context and active-thread identity.
- [ ] Create voicemail artifact records linked to active thread timeline with deterministic metadata.
- [ ] Enforce state-routing matrix: no thread -> intake fallback, UNCLAIMED -> voicemail-only, CLAIMED -> orgUnit-configured mode.
- [ ] Queue transcription requests with durable callback correlation metadata after artifact persistence.
- [ ] Preserve escalation/inactivity reset behavior for voicemail-only inbound events unless locked lifecycle policy explicitly applies a reset.
- [ ] Remove test.skip from e.3 ATDD API/E2E specs and make all tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts tests/e2e/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Existing inbound webhook behavior currently focuses on voice event acceptance and routing metadata; explicit voicemail artifact/transcription contracts are target-state for e.3.
- Claimed-thread routing expectations in RED tests intentionally require orgUnit-configured behavior and may diverge from current default routing output until implementation lands.
- Lifecycle reset guard assertions are intentionally strict to prevent regressions in escalation/inactivity semantics.

## Knowledge Base References Applied

- data-factories.md
- component-tdd.md
- test-quality.md
- test-healing-patterns.md
- selector-resilience.md
- timing-debugging.md
- api-testing-patterns.md
- network-first.md
