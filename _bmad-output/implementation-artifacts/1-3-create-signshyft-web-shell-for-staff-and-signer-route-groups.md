# Story 1.3: Create signshyft-web shell for staff and signer route groups

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a SignShyft product engineer,
I want a dedicated `signshyft-web` shell with separate staff and signer route groups,
so that authenticated staff operations and token-based signer completion flows remain isolated and predictable.

## Acceptance Criteria

1. `signshyft-web` app builds and serves route shells for staff and signer page groups.
2. Route guards enforce separation between staff-auth context and signer-token context.
3. Placeholder refusal renderer displays canonical refusal reasons consistently for staff and signer surfaces.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Staff and signer users must always see clear next actions when access is invalid, expired, or refused by business rule.
- Real-User Validation Evidence: N/A (pre-implementation story context)
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Scope covers route guard separation and refusal rendering, not role assignment administration.

## Tasks / Subtasks

- [ ] Scaffold `apps/signshyft-web` application (AC: 1)
  - [ ] Establish TypeScript web app structure with `src/pages/staff` and `src/pages/signer`.
  - [ ] Wire dev/build scripts compatible with current monorepo workflows.
- [ ] Implement route group shells (AC: 1, 2)
  - [ ] Define `/staff/*` route group shell (authenticated operational context).
  - [ ] Define `/signer/*` route group shell (token-scoped signing context).
  - [ ] Add safe default route/fallback behavior for unknown routes.
- [ ] Implement route guards and context boundaries (AC: 2)
  - [ ] Staff guard requires staff auth context and tenant scope.
  - [ ] Signer guard requires signer token context and envelope access model.
  - [ ] Prevent staff pages from loading under signer context and vice versa.
- [ ] Implement canonical refusal renderer placeholder (AC: 3)
  - [ ] Normalize API refusal payloads (`success=false`, `reason`) into user-facing message blocks.
  - [ ] Provide reason-code-specific copy stubs for top refusal families (`EXPIRED_LINK`, `OTP_*`, `NOT_YOUR_TURN`, `RENDER_BUSY`, immutable template refusals).
- [ ] Add route and guard tests (AC: 1, 2, 3)
  - [ ] Route registration/smoke tests for both groups.
  - [ ] Guard behavior tests for missing/invalid context.
  - [ ] Refusal-render contract tests for canonical payload shape.
- [ ] UX/accessibility baseline checks
  - [ ] Ensure keyboard focus order and visible error states in refusal placeholder components.
  - [ ] Verify mobile readability for signer refusal states.

## Dev Notes

### Story Intent

Create the front-end frame for SignShyft so all downstream UI stories implement into stable route groups and refusal-handling patterns.

### Technical Requirements

- Staff and signer are distinct contexts with different credentials and security posture.
- Signer paths are token-driven and must support OTP/refusal outcomes without exposing sensitive link material.
- Refusal renderer must consume canonical refusal contract used by SignShyft API (`HTTP 200` business refusal with explicit reason code).

### Architecture Compliance

- Use dedicated `apps/signshyft-web` path from SignShyft folder spec.
- Keep signer and staff page trees physically separated under `pages/signer` and `pages/staff`.
- Maintain lane isolation: no modifications to existing RouteShyft/ConnectShyft frontend routes unless explicitly required by integration seams.

### Library / Framework Requirements

- Prefer existing monorepo frontend baseline (Vue 3 + Vue Router + Vite) unless a deliberate framework decision is approved.
- Reuse existing API client/refusal-normalization patterns where safe, but keep SignShyft-specific refusal map isolated.
- Do not introduce heavy UI frameworks in this shell story; prioritize route and guard correctness.

### File Structure Requirements

- App root: `apps/signshyft-web/`
- Core folders:
  - `apps/signshyft-web/src/api/`
  - `apps/signshyft-web/src/auth/`
  - `apps/signshyft-web/src/pages/staff/`
  - `apps/signshyft-web/src/pages/signer/`
- Route group entry points:
  - `apps/signshyft-web/src/pages/staff/*`
  - `apps/signshyft-web/src/pages/signer/*`

### Testing Requirements

- Router unit tests validating route-group registration and fallback behavior.
- Guard tests for unauthorized staff access and expired/invalid signer-token flows.
- UI tests ensuring refusal renderer displays canonical reason and action guidance.
- Manual verification on desktop (staff) and mobile viewport (signer).

### Previous Story Intelligence

- Story 1.2 defines refusal payload and plugin behavior consumed by web.
- Web shell should assume canonical refusal contract exists and avoid custom refusal shapes.

### Git Intelligence Summary

- Repository has no `apps/signshyft-web` implementation yet; this story introduces the first SignShyft UI surface.
- Recent commits are planning/status-only updates, so guardrails should be implemented from spec instead of inferred from existing app code.

### Latest Tech Information (As of 2026-03-03)

- SignShyft API contract returns business refusals as HTTP 200 with typed reason codes; web shell must normalize by payload semantics, not by HTTP status code alone.
- Fastify ecosystem is on v5-compatible plugin majors, so front-end refusal reason mapping should expect stable reason contracts rather than transport-code branching.

### Project Context Reference

- Existing production frontend serves from `frontend/` and is RouteShyft-centric; SignShyft web shell is lane-isolated and additive.
- CI/policy gates remain mandatory before implementation merge.

### Project Structure Notes

- Keep shared utilities minimal until concrete cross-app abstractions are proven.
- Any auth helper shared between staff and signer must avoid leaking signer token context into staff telemetry/logging.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics-signshyft-2026-03-03.md` (Epic 1, Story 1.3)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/ux-design-specification-signshyft-2026-03-03.md` (Staff and Signer Flows)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/architecture-signshyft-2026-03-03.md` (Route surfaces and bounded lane decisions)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md` (FR-SS-003, signer/staff role context)]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/02_Concrete_Folder_Structure.md`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/13_OpenAPI.yaml`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/32_Admin_UI_Requirements.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generated from SignShyft lane epics, PRD, architecture, UX, and API refusal contract artifacts.

### Completion Notes List

- Story context prepared and marked `ready-for-dev`.
- No UI implementation code was performed in this create-story step.

### File List

- _bmad-output/implementation-artifacts/1-3-create-signshyft-web-shell-for-staff-and-signer-route-groups.md
- _bmad-output/implementation-artifacts/sprint-status-signshyft.yaml
