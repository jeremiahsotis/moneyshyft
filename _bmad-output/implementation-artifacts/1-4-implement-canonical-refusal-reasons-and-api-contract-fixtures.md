# Story 1.4: Implement canonical refusal reasons and API contract fixtures

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a SignShyft integration engineer,
I want one canonical refusal reason model with API and client fixtures,
so that business-rule refusals are deterministic and safely consumable across staff UI, signer UX, and WordPress integrations.

## Acceptance Criteria

1. Refusal reason enumeration is implemented exactly as locked by SignShyft spec.
2. API tests verify business refusals return HTTP 200 with canonical refusal payload shape.
3. Client helpers normalize refusal rendering by reason code without relying on transport status.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Operators and signers must see actionable refusal copy for deterministic recovery; integrations need stable refusal codes for automation.
- Real-User Validation Evidence: N/A (pre-implementation story context)
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Refusal canonicalization is not a role-admin workflow.

## Tasks / Subtasks

- [ ] Implement canonical refusal reason source of truth (AC: 1)
  - [ ] Define refusal enum/union model from locked reason list.
  - [ ] Prevent ad-hoc reason string usage outside shared refusal module.
  - [ ] Add compile-time guard for unknown refusal reasons.
- [ ] Implement canonical API refusal response helpers (AC: 2)
  - [ ] Ensure all business refusals serialize as HTTP 200 with `{success:false,reason}`.
  - [ ] Preserve optional `field` and `details` members for validation-context refusals.
  - [ ] Ensure transport/auth/system failures remain non-business error flows.
- [ ] Create refusal fixture matrix for testing and integration (AC: 1, 2, 3)
  - [ ] Add fixture payloads for template/version, upload/pdf, field validation, signer-flow, and capacity/system refusal families.
  - [ ] Include expected client-facing normalization output per refusal reason.
  - [ ] Include endpoint-level refusal fixture mapping for core routes.
- [ ] Add API contract tests (AC: 2)
  - [ ] Assert HTTP 200 business refusal behavior on representative staff/signer endpoints.
  - [ ] Assert refusal payload schema (`success=false`, `reason`, optional `field/details`) matches OpenAPI.
  - [ ] Assert refusal reason values are from canonical enum only.
- [ ] Add client normalization tests (AC: 3)
  - [ ] Assert refusal reason -> display model mapping for staff and signer contexts.
  - [ ] Verify unknown reasons fail closed with safe fallback copy and telemetry marker.
- [ ] Document integration expectations
  - [ ] Update SignShyft integration notes for refusal handling across web and WP receivers.
  - [ ] Confirm no token/signer URL leakage in refusal logs.

## Dev Notes

### Story Intent

Lock refusal behavior as an explicit contract artifact so every consumer receives identical business refusal semantics.

### Technical Requirements

- Canonical refusal reasons (locked):
  - `TEMPLATE_VERSION_IMMUTABLE`
  - `TEMPLATE_VERSION_UNAVAILABLE`
  - `TEMPLATE_VERSION_PDF_IMMUTABLE`
  - `INVALID_PDF_FILE`
  - `PDF_TOO_LARGE`
  - `FIELD_TOO_LONG`
  - `INVALID_EMAIL_FORMAT`
  - `INVALID_PHONE_FORMAT`
  - `INVALID_NUMBER`
  - `NUMBER_OUT_OF_RANGE`
  - `EXPIRED_LINK`
  - `OTP_REQUIRED`
  - `OTP_INVALID`
  - `OTP_EXPIRED`
  - `NOT_YOUR_TURN`
  - `ALREADY_COMPLETED`
  - `ENVELOPE_VOIDED`
  - `ENVELOPE_EXPIRED`
  - `ENVELOPE_DECLINED`
  - `RENDER_BUSY`
  - `RENDER_FAILED`
  - `STORAGE_FAILED`
  - `WEBHOOK_DISABLED`
- Business refusals must be serialized as HTTP 200 with `success=false` and reason code.
- OpenAPI contract (`Refusal` schema) is the payload authority for response shape.

### Architecture Compliance

- Keep refusal model reusable across API routes and web shell.
- Do not create route-local refusal enums or shape variants.
- Preserve lane isolation; refusal model changes here must not alter RouteShyft/ConnectShyft refusal contracts.

### Library / Framework Requirements

- Reuse existing TypeScript/Jest testing stack for contract and fixture verification.
- Keep refusal contract package/module dependency-light; avoid pulling runtime validation frameworks unless necessary.
- Leverage OpenAPI contract test assertions where possible to prevent drift.

### File Structure Requirements

- Candidate shared module path: `packages/shyft-refusal/` or lane-specific refusal module under `apps/signshyft-api/src/plugins/refusal.ts` plus mirrored client helper under `apps/signshyft-web/src/api/`.
- Fixture locations:
  - API fixtures under `tests/api/platform/` or SignShyft-specific fixture folder.
  - Client fixture tests under `apps/signshyft-web` test tree.

### Testing Requirements

- API contract tests for representative refusal endpoints:
  - Draft patch on immutable template version.
  - Invalid/oversize PDF upload.
  - Signer OTP invalid/expired.
  - Render busy/system saturation refusal.
- Serialization tests proving all business refusals remain HTTP 200.
- Client normalization tests for staff and signer reason rendering paths.

### Previous Story Intelligence

- Story 1.2 introduces refusal plugin hooks in API bootstrap.
- Story 1.3 introduces refusal rendering placeholders in web shell.
- This story must become the single source for both backend serialization and frontend normalization.

### Git Intelligence Summary

- Recent history confirms Story 1.1 planning/state setup only; refusal model implementation can be introduced cleanly without backward-compat migration pressure in SignShyft lane.
- Existing RouteShyft refusal patterns can inform structure, but SignShyft reason enum must follow the new locked list exactly.

### Latest Tech Information (As of 2026-03-03)

- SignShyft OpenAPI (`v1.1.0`) already encodes a reusable `Refusal` schema and should be treated as contract source.
- Fastify 5-era plugin stacks continue to favor centralized reply helpers; refusal contract enforcement should happen in one plugin/helper layer, not per-route ad hoc responses.

### Project Context Reference

- Platform policy requires deterministic refusal behavior for business outcomes and auditable governance.
- WordPress integration contract depends on stable reason semantics and explicit non-secret logging behavior.

### Project Structure Notes

- Keep refusal fixtures versioned alongside contract definitions to prevent silent drift.
- Ensure future stories that add refusal cases update canonical reason source and fixtures in the same change.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics-signshyft-2026-03-03.md` (Epic 1, Story 1.4)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md` (FR-SS-003, FR-SS-004)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/ux-design-specification-signshyft-2026-03-03.md` (Refusal UX rules)]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/01_SignShyft_Constitution.md`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/05_Refusal_Reasons.md`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/13_OpenAPI.yaml`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/32_Admin_UI_Requirements.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generated from SignShyft refusal-spec artifacts, OpenAPI schema, UX refusal behavior guidance, and lane epics.

### Completion Notes List

- Story context prepared and marked `ready-for-dev`.
- No implementation code or test execution was performed in this create-story step.

### File List

- _bmad-output/implementation-artifacts/1-4-implement-canonical-refusal-reasons-and-api-contract-fixtures.md
- _bmad-output/implementation-artifacts/sprint-status-signshyft.yaml
