---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-03T02:02:33Z'
---

# ATDD Checklist - Epic e, Story 1: Verified Webhook Ingress and Deterministic Context Routing

Date: 2026-03-03
Author: Jeremiah
Primary Test Level: API

## Story Summary

Story e.1 secures inbound provider webhook ingress by requiring signature verification before processing, deterministic tenant/orgUnit routing, canonical provider-identifier normalization for replay safety, and explicit fail-closed refusal behavior when context cannot be resolved.

## Acceptance Criteria

1. Given provider webhook requests reach ConnectShyft endpoints for enabled adapters, when signature validation runs, then only valid signed requests are processed and invalid signatures fail closed with no domain side effects.
2. Given a webhook passes signature validation, when number mapping resolution executes, then the system resolves deterministic `(tenant_id, org_unit_id)` context before downstream handling.
3. Given webhook payloads contain provider-specific identifiers, when canonical event identity extraction executes, then event identity fields are normalized for downstream replay-safe processing.
4. Given context cannot be resolved from configured provider number mappings, when handling executes, then processing is refused deterministically and audit metadata is recorded without creating thread/message/voicemail artifacts.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: `_bmad-output/implementation-artifacts/e-1-verified-webhook-ingress-and-deterministic-context-routing.md`.
- Mandatory branch/policy gates passed after auto-remediation from protected default branch:
  - `npm run start:story-branch -- e-1 verified-webhook-ingress-and-deterministic-context-routing`
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/e-1-verified-webhook-ingress-and-deterministic-context-routing.md`
- Framework and patterns loaded:
  - `playwright.config.ts`
  - `tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts`
  - `tests/e2e/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryF1Factory.ts`
  - `tests/support/factories/connectShyftStoryF3Factory.ts`
- TEA config flags loaded:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`

### Step 2: Generation Mode

- Selected mode: AI generation.
- Rationale: Story e.1 is ingress-contract and deterministic-routing heavy. RED-phase tests are best generated from existing route/module contracts and story acceptance criteria without browser recording.

### Step 3: Test Strategy

- Primary level: API (signature gate, context resolution, identity normalization, refusal side-effects contract).
- Secondary level: E2E integration (multi-endpoint journey from setup through ingress and read contract verification).
- Priority mapping:
  - P0 API: unsigned rejection fail-closed, mapped-number deterministic context acceptance, canonical identity normalization + duplicate suppression.
  - P1 API: unmapped routing deterministic refusal with no operational artifacts.
  - P0/P1 E2E: accepted journey, spoofed journey, mapping-miss refusal journey.
- RED-phase requirement enforced: all generated tests use `test.skip(...)`.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (all tests use `test.skip`):
  - `tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts`
  - `tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryE1Factory.ts`
  - `tests/support/fixtures/connectShyftStoryE1.fixture.ts`
- Parallel subprocess artifacts written:
  - `_bmad-output/test-artifacts/atdd-temp/api-e-1-2026-03-03T02-02-23Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-e-1-2026-03-03T02-02-23Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-e-1-2026-03-03T02-02-23Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-api-tests-2026-03-03T02-02-23Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-03-03T02-02-23Z.json`
  - `_bmad-output/test-artifacts/tea-atdd-summary-2026-03-03T02-02-23Z.json`
  - `/tmp/tea-atdd-api-tests-2026-03-03T02-02-23Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-03-03T02-02-23Z.json`
  - `/tmp/tea-atdd-summary-2026-03-03T02-02-23Z.json`
- TDD RED checks:
  - all generated tests include `test.skip`
  - no placeholder assertions (`expect(true).toBe(true)`) present

### Step 5: Validate & Complete

- Validation command:
  - `npx playwright test tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.spec.ts --list`
- Validation outcome:
  - 7 tests discovered across 2 files (4 API + 3 E2E)
  - file parse/registration succeeded
- CLI session hygiene:
  - no Playwright CLI browser sessions opened during this ATDD run

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.spec.ts` (3 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryE1Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryE1.fixture.ts`

## Mock Requirements

### Signature Verification Contract

- Endpoint:
  - `POST /api/v1/connectshyft/webhooks/inbound`
- Required behavior:
  - unsigned/invalid signatures fail closed
  - refusal includes deterministic envelope and explicit no-side-effect evidence
  - expected refusal codes include:
    - `CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING`
    - `CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID`

### Deterministic Context Routing Contract

- Endpoint:
  - `POST /api/v1/connectshyft/webhooks/inbound`
- Required behavior:
  - mapped provider number resolves deterministic `(tenantId, orgUnitId)` before domain side effects
  - response includes deterministic context in `data.correlation`

### Canonical Identity and Replay-Safe Contract

- Endpoint:
  - `POST /api/v1/connectshyft/webhooks/inbound`
- Required behavior:
  - provider alias identifiers normalize into canonical identity fields
  - duplicate deliveries suppress writes using deterministic dedupe key material

## Required data-testid Attributes

- No net-new UI requirements are mandatory for story e.1 API ingress completion.
- If operator diagnostics UI is added for this story, reserve stable hooks:
  - `connectshyft-webhook-refusal-banner`
  - `connectshyft-webhook-correlation-reason`
  - `connectshyft-webhook-signature-status-chip`
  - `connectshyft-webhook-routing-context-chip`

## Implementation Checklist

- [ ] Enforce adapter-specific signature verification on webhook ingress before correlation/dedupe/domain mutation.
- [ ] Return deterministic fail-closed signature refusal with side-effect suppression evidence.
- [ ] Resolve inbound routing context deterministically from provider number mapping for accepted ingress.
- [ ] Normalize provider identifier aliases (`event_id`, `message_uuid`, `call_control_id`, etc.) into canonical replay-safe identity fields.
- [ ] Suppress duplicate domain writes using deterministic webhook receipt dedupe keys.
- [ ] Refuse mapping-miss/unresolved context deterministically with auditable refusal metadata and no artifacts.
- [ ] Remove `test.skip` from generated e.1 ATDD API/E2E specs and make all tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Current local Playwright runtime defaults (`ENABLE_TEST_CONNECTSHYFT_FLAGS=true`, backend `NODE_ENV=test`) may bypass strict signature checks in test override mode; green-phase enablement must validate signature paths with override disabled.
- RED assertions codify a deterministic 403 fail-closed signature contract from story-level requirements; current runtime responses may differ until implementation aligns.
- Context source expectations in RED tests intentionally target `number_mapping` semantics per story e.1 acceptance criteria.

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
