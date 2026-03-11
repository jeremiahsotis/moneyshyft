---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-03T19:17:07Z'
---

# ATDD Checklist - Epic e, Story 4: Transcription Webhook Attachment to Voicemail Records

Date: 2026-03-03
Author: Jeremiah
Primary Test Level: API

## Story Summary

Story e.4 defines deterministic transcription callback handling so transcript text attaches to the exact voicemail artifact created by inbound voice flow, is visible in thread detail/timeline views, refuses missing correlation safely, and remains replay-safe under duplicate callback delivery.

## Acceptance Criteria

1. Given a valid voicemail transcription callback, when callback processing executes, then transcript text is attached to the correct voicemail artifact using deterministic correlation metadata.
2. Given transcript attachment succeeds, when thread timeline data is queried, then transcript availability is reflected consistently in voicemail artifact views.
3. Given missing or invalid voicemail correlation identifiers, when callback processing runs, then the handler refuses deterministically and makes no orphaned transcript updates.
4. Given duplicate transcription callback deliveries for the same event identity, when processing executes, then idempotent replay checks prevent duplicate timeline mutations.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: `_bmad-output/implementation-artifacts/e-4-transcription-webhook-attachment-to-voicemail-records.md`
- Mandatory branch/policy gates passed with required remediation from protected branch:
  - `npm run start:story-branch -- --allow-dirty e-4 transcription-webhook-attachment-to-voicemail-records`
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/e-4-transcription-webhook-attachment-to-voicemail-records.md`
- Framework and existing patterns loaded:
  - `playwright.config.ts`
  - `tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts`
  - `tests/e2e/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.spec.ts`
  - `tests/support/helpers/connectShyftStoryE3TestHelpers.ts`
  - `src/src/routes/api/v1/connectshyft.ts`
  - `src/src/modules/connectshyft/inboundVoice.ts`
- TEA config flags loaded:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright Utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`
  - Additional story-fit references: `api-testing-patterns.md`, `fixture-architecture.md`, `network-first.md`

### Step 2: Generation Mode

- Selected mode: AI generation.
- Rationale: Story e.4 is callback-contract and deterministic replay logic; RED-phase tests can be generated directly from acceptance criteria and existing ConnectShyft inbound voice/replay envelope patterns.

### Step 3: Test Strategy

- Primary level: API contract tests for callback-correlation attach semantics, deterministic refusal behavior, and duplicate replay suppression.
- Secondary level: E2E tests for operator-visible thread detail transcript rendering and duplicate-event visualization suppression.
- Priority mapping:
  - P0 API: attach-to-correct-artifact, refusal-on-invalid-correlation, duplicate replay suppression.
  - P1 API: thread detail contract transcript visibility.
  - P0 E2E: operator sees attached transcript in thread detail.
  - P1 E2E: duplicate callback does not create duplicate timeline rows in UI.
- RED-phase requirement enforced: all generated executable tests use `test.skip(...)`.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (all executable tests use `test.skip`):
  - `tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.spec.ts`
  - `tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.core.cases.ts`
  - `tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.replay-and-guards.cases.ts`
  - `tests/e2e/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryE4Factory.ts`
  - `tests/support/fixtures/connectShyftStoryE4.fixture.ts`
  - `tests/support/helpers/connectShyftStoryE4TestHelpers.ts`
- Parallel subprocess artifacts written:
  - `_bmad-output/test-artifacts/atdd-temp/api-e-4-2026-03-03T19-15-13Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-e-4-2026-03-03T19-15-13Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-e-4-2026-03-03T19-15-13Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-api-tests-2026-03-03T19-15-13Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-03-03T19-15-13Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-summary-2026-03-03T19-15-13Z.json`
  - `/tmp/tea-atdd-api-tests-2026-03-03T19-15-13Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-03-03T19-15-13Z.json`
  - `/tmp/tea-atdd-summary-2026-03-03T19-15-13Z.json`
- TDD RED checks:
  - all generated executable tests include `test.skip`
  - no placeholder assertions (`expect(true).toBe(true)`) present

### Step 5: Validate & Complete

- Validation command:
  - `npx playwright test tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.spec.ts tests/e2e/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.spec.ts --list`
- Validation outcome:
  - 6 tests discovered across 3 files (4 API + 2 E2E)
  - Playwright registration/listing passed
- CLI session hygiene:
  - no Playwright CLI browser sessions opened during this ATDD run

## Failing Tests Created (RED Phase)

- API:
  - `tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.core.cases.ts` (2 skipped tests)
  - `tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.replay-and-guards.cases.ts` (2 skipped tests)
- E2E:
  - `tests/e2e/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.spec.ts` (2 skipped tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryE4Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryE4.fixture.ts`
- Helper module: `tests/support/helpers/connectShyftStoryE4TestHelpers.ts`

## Mock Requirements

### Transcription Callback Contract

- Endpoint:
  - `POST /api/v1/connectshyft/webhooks/inbound`
- Required behavior:
  - callback correlation resolves exactly one voicemail artifact (`tenantId`, `orgUnitId`, `threadId`, `providerEventId/providerLegId`, `voicemailArtifactId`)
  - transcript text is attached to that artifact (no new voicemail artifact creation)
  - attachment event is timeline-visible and replay-safe

### Refusal Contract for Invalid Correlation

- Endpoint:
  - `POST /api/v1/connectshyft/webhooks/inbound`
- Required behavior:
  - deterministic refusal code for invalid/missing callback correlation identifiers
  - no orphan transcript writes
  - no transcription-attachment timeline mutation

## Required data-testid Attributes

- `connectshyft-thread-event-transcription-attached` - timeline row for transcription attachment callback
- `connectshyft-voicemail-artifact-transcript` - transcript text surface attached to voicemail artifact card
- `connectshyft-voicemail-artifact-transcript-status` - transcript availability/state indicator
- `connectshyft-voicemail-artifact-transcript-updated-at` - callback update timestamp surface

## Implementation Checklist

- [ ] Add transcription callback parsing/normalization path for voicemail transcript events.
- [ ] Resolve callback correlation deterministically to one voicemail artifact identity.
- [ ] Persist transcript text on the correlated voicemail artifact only (no orphan writes).
- [ ] Emit deterministic timeline mutation `connectshyft.voicemail.transcription_attached` when attach succeeds.
- [ ] Expose transcript availability/text in thread detail voicemail artifact views.
- [ ] Enforce deterministic refusal path for missing/invalid callback correlation identifiers.
- [ ] Enforce replay-safe dedupe for duplicate callback deliveries so timeline mutation remains idempotent.
- [ ] Add/implement required thread detail UI data-testid hooks for transcript rendering.
- [ ] Remove `test.skip` from e.4 ATDD API/E2E tests and make all tests pass.

## Running Tests

```bash
# List story e.4 ATDD tests
npx playwright test tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.spec.ts tests/e2e/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.spec.ts --list

# Execute story e.4 ATDD tests
npx playwright test tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.spec.ts tests/e2e/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.spec.ts
```

## Key Risks and Assumptions

- Current inbound voice path treats voice-like events as voicemail artifact creation; e.4 implementation must branch callback behavior to artifact transcript attachment semantics.
- Callback identity contracts are assumed to include `voicemailArtifactId` plus provider correlation metadata from e.3 queue output.
- UI transcript visibility contracts (`data-testid`) are currently RED expectations and require implementation.

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
- `api-testing-patterns.md`
- `fixture-architecture.md`
- `network-first.md`
