# Story e.1: Verified Webhook Ingress and Deterministic Context Routing

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want every inbound webhook verified and mapped to the correct tenant/orgUnit via number mapping,
so that spoofed or misrouted events cannot create operational artifacts.

## Acceptance Criteria

1. Given provider webhook requests reach ConnectShyft endpoints for enabled adapters, when signature validation runs, then only valid signed requests are processed and invalid signatures fail closed with no domain side effects.
2. Given a webhook passes signature validation, when number mapping resolution executes, then the system resolves deterministic `(tenant_id, org_unit_id)` context before downstream handling.
3. Given webhook payloads contain provider-specific identifiers, when canonical event identity extraction executes, then event identity fields are normalized for downstream replay-safe processing.
4. Given context cannot be resolved from configured provider number mappings, when handling executes, then processing is refused deterministically and audit metadata is recorded without creating thread/message/voicemail artifacts.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Webhook rejection and misrouting outcomes must be explicit and auditable so operators can diagnose ingestion failures quickly.
- Real-User Validation Evidence: Pending implementation. Validate signature-fail, mapping-miss, and valid-ingress paths with provider adapter fixtures.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story enforces webhook security and routing determinism; no role-admin workflow is introduced.

## Tasks / Subtasks

- [x] Implement adapter-aware webhook signature verification gate (AC: 1)
  - [x] Enforce fail-closed behavior for invalid signatures before any writes.
  - [x] Return deterministic refusal/error envelope metadata for logging and triage.
- [x] Implement deterministic provider-number context routing (AC: 2)
  - [x] Resolve provider number to `(tenant_id, org_unit_id)` using provider-neutral mapping constraints.
  - [x] Refuse unresolved mappings with explicit audit metadata.
- [x] Implement canonical event identity extraction pre-processing (AC: 3)
  - [x] Normalize provider call/message/transcription identifiers for dedupe pipeline input.
  - [x] Persist identity extraction diagnostics for observability.
- [x] Add contract and regression coverage (AC: 1, 2, 3, 4)
  - [x] API tests for signature pass/fail and deterministic 403 fail-closed behavior.
  - [x] API tests for mapping resolution success and mapping-miss refusal with no side effects.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-021.
- Related constraints: FR-CS-021a, FR-CS-025.
- Story dependencies:
  - `f-1-provider-adapter-interface-and-provider-registry`
  - `f-2-canonical-comms-event-model-and-event-store`
  - `f-4-telnyx-adapter-implementation-and-cutover-guardrails`

### Architecture Compliance

- Enforce AD-06 signature validation and replay-safe prerequisites before domain mutation.
- Use provider-neutral number mapping contract `(tenant_id, provider_name, provider_number_e164)`.
- Preserve shared refusal envelope semantics and auditable ingestion outcomes.

### Library / Framework Requirements

- Reuse provider adapter boundary from ConnectShyft comms core module.
- Reuse route-level refusal envelope helpers and deterministic response contract patterns.
- Avoid provider-specific branching in domain lifecycle handlers.

### File Structure Requirements

- Webhook entrypoints: `src/src/routes/api/v1/connectshyft.ts`.
- Provider adapter/security logic: `src/src/modules/connectshyft/`.
- Number mapping resolution integration: ConnectShyft repositories/services under `src/src/modules/connectshyft/`.
- Tests: `tests/api/platform/` and module tests under `src/src/modules/connectshyft/__tests__/`.

### Testing Requirements

- Validate invalid signatures are rejected with no writes.
- Validate deterministic `(tenant_id, org_unit_id)` routing from provider number mappings.
- Validate unresolved mappings refuse cleanly with no thread/message/voicemail artifacts.
- Validate canonical event identity extraction is stable for downstream dedupe.

### Previous Story Intelligence

- `f.1` and `f.2` establish provider adapter registry and canonical event model required for this ingress gate.
- Recent D/F hardening work favors fail-closed refusals and explicit operator-usable refusal metadata.

### Git Intelligence Summary

- Recent commits emphasize deterministic refusal contracts and explicit policy gates; keep webhook ingress behavior aligned with that pattern.

### Latest Technical Information

- Source of truth for this story remains the current ConnectShyft architecture and sprint-change artifacts locked for provider abstraction migration.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep webhook security checks ahead of dedupe and domain routing logic.
- Do not write provisional artifacts before signature + mapping validation completes.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story e-1-verified-webhook-ingress-and-deterministic-context-routing`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic e, Story e.1)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-021)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-06, webhook route groups, ingestion pipeline)
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md` (Section 4.1.4)
- `provider_adapter.md`
- `openapi.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n -i "epic\\s*e|e-1-|e-2-|e-3-|e-4-|e-5-|e-6-" _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `rg -n "FR-CS-018|FR-CS-019|FR-CS-020|FR-CS-021|FR-CS-021a" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `rg -n "webhook|provider|dedupe|receipt" _bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `npm run branch:ensure-workflow -- --workflow dev-story --story e-1-verified-webhook-ingress-and-deterministic-context-routing.md`
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/numberMappings.test.ts src/src/modules/connectshyft/__tests__/providerRegistry.test.ts src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`
- `npm run test:e2e -- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts`
- `cd src && npm test`
- `cd src && npm run build`
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/numberMappings.test.ts src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`
- `npm run test:e2e -- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts`
- `npx playwright test tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing*.spec.ts tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing*.spec.ts --list` (pass)
- `npm run test:e2e -- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing*.spec.ts tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing*.spec.ts` (pass)

### Completion Notes List

- Added explicit fail-closed signature refusal metadata with side-effect and operator remediation fields in `handleInboundWebhook`.
- Added deterministic test-mode signature enforcement controls (`x-test-connectshyft-enforce-webhook-signature`, `x-test-connectshyft-telnyx-public-key`) while preserving default test override behavior.
- Implemented provider-number correlation fallback for inbound webhooks with tenant-aware routing semantics: scoped lookup when tenant is known, global active-number resolution when tenant context is unavailable, and deterministic ambiguity refusals.
- Updated number mapping routing semantics so `isActive=false` mappings are non-routable for inbound webhook correlation.
- Added async number-mapping routing resolution API (`resolveRoutingMappingByNumber`) for ingress routing without write-side coupling.
- Activated Story e.1 ATDD API tests and updated them to run signed-path and unsigned fail-closed assertions with deterministic replay-safe identity checks.
- Added/updated module and route regression tests for number-mapping correlation, unauthenticated/public-tenant fallback behavior, active/inactive routing behavior, ambiguity refusal, unmapped refusal behavior, and enforced signature validation.

### File List

- _bmad-output/implementation-artifacts/e-1-verified-webhook-ingress-and-deterministic-context-routing.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- _bmad-output/test-artifacts/atdd-checklist-e-1.md
- _bmad-output/test-artifacts/atdd-temp/api-e-1-2026-03-03T02-02-23Z.json
- _bmad-output/test-artifacts/atdd-temp/e2e-e-1-2026-03-03T02-02-23Z.json
- _bmad-output/test-artifacts/atdd-temp/summary-e-1-2026-03-03T02-02-23Z.json
- _bmad-output/test-artifacts/tea-atdd-api-tests-2026-03-03T02-02-23Z.json
- _bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-03-03T02-02-23Z.json
- _bmad-output/test-artifacts/tea-atdd-summary-2026-03-03T02-02-23Z.json
- src/src/modules/connectshyft/numberMappings.ts
- src/src/modules/connectshyft/providerRegistry.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/modules/connectshyft/__tests__/numberMappings.test.ts
- src/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts
- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.api.spec.ts
- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.replay-and-refusal.api.spec.ts
- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.automate.api.spec.ts
- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.automate.conflict-refusal.api.spec.ts
- tests/api/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.automate.public-routing.api.spec.ts
- tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.atdd.spec.ts
- tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.automate.spec.ts
- tests/e2e/platform/e-1-verified-webhook-ingress-and-deterministic-context-routing.automate.refusals.spec.ts
- tests/support/factories/connectShyftStoryE1Factory.ts
- tests/support/helpers/connectShyftWebhookTestHelpers.ts
- tests/support/fixtures/connectShyftStoryE1.fixture.ts
- tests/support/utils/deterministicTestIds.ts

## Change Log

- 2026-03-03: Created Story e.1 ready-for-dev context document.
- 2026-03-03: Implemented webhook signature fail-closed metadata, deterministic number-mapping correlation routing, and replay-safe ingress contract/regression coverage for Story e.1.
- 2026-03-03: Fixed review findings by making inactive mappings non-routable and enabling deterministic unauthenticated webhook routing via globally unique active number mappings with explicit ambiguous refusal handling.
