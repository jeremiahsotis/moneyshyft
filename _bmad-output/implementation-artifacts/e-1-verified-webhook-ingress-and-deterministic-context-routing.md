# Story e.1: Verified Webhook Ingress and Deterministic Context Routing

Status: ready-for-dev

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

- [ ] Implement adapter-aware webhook signature verification gate (AC: 1)
  - [ ] Enforce fail-closed behavior for invalid signatures before any writes.
  - [ ] Return deterministic refusal/error envelope metadata for logging and triage.
- [ ] Implement deterministic provider-number context routing (AC: 2)
  - [ ] Resolve provider number to `(tenant_id, org_unit_id)` using provider-neutral mapping constraints.
  - [ ] Refuse unresolved mappings with explicit audit metadata.
- [ ] Implement canonical event identity extraction pre-processing (AC: 3)
  - [ ] Normalize provider call/message/transcription identifiers for dedupe pipeline input.
  - [ ] Persist identity extraction diagnostics for observability.
- [ ] Add contract and regression coverage (AC: 1, 2, 3, 4)
  - [ ] API tests for signature pass/fail and deterministic 403 fail-closed behavior.
  - [ ] API tests for mapping resolution success and mapping-miss refusal with no side effects.

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

### Completion Notes List

- Created implementation-ready Story e.1 context document with webhook verification, deterministic routing, and fail-closed ingress guardrails.

### File List

- _bmad-output/implementation-artifacts/e-1-verified-webhook-ingress-and-deterministic-context-routing.md

## Change Log

- 2026-03-03: Created Story e.1 ready-for-dev context document.
