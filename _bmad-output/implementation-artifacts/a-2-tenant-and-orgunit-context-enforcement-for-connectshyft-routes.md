# Story a.2: Tenant and OrgUnit Context Enforcement for ConnectShyft Routes

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want every ConnectShyft request to resolve and validate tenant/orgUnit context,
so that orgUnit-scoped operations cannot leak across tenant or membership boundaries.

## Acceptance Criteria

1. Given an authenticated request to an orgUnit-scoped ConnectShyft endpoint, when context middleware executes, then tenant and orgUnit context are resolved and validated against caller membership (unless tenant-privileged).
2. Given a request with missing, invalid, or cross-tenant orgUnit context, when authorization executes, then a refusal response is returned with no data leakage.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Context errors must be explainable in operator-facing refusal copy while preserving no-leak guarantees.
- Real-User Validation Evidence: Negative authorization matrix across tenant/orgUnit combinations.
- Real-User Validation Result: pending
- Role-Admin UI Path: Tenant admin can assign membership/privilege so orgUnit access path is testable.
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement context resolution middleware for ConnectShyft routes (AC: 1)
  - [ ] Resolve tenant and orgUnit context deterministically for each request.
  - [ ] Enforce membership checks unless caller has tenant-privileged role.
- [ ] Enforce refusal behavior for invalid context paths (AC: 2)
  - [ ] Block missing/invalid orgUnit context on orgUnit-scoped endpoints.
  - [ ] Block cross-tenant and spoofed orgUnit attempts with no data leakage.
- [ ] Add route and service-level tests for context enforcement (AC: 1, 2)
  - [ ] API negative tests for cross-tenant and cross-orgUnit access.
  - [ ] Verify refusal envelope format and deterministic error semantics.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-001, FR-CS-002, FR-CS-003.
- This story is dependency-critical for downstream Epic A and B stories.
- Context and capability checks must fail closed.

### Architecture Compliance

- Keep context enforcement centralized in platform/connectshyft middleware and guards.
- Do not permit endpoint-specific bypasses of tenant/orgUnit validation.

### File Structure Requirements

- Backend context/middleware: `src/src/platform/` and `src/src/modules/connectshyft/`.
- ConnectShyft API routes: `src/src/routes/api/v1/`.
- Tests: `tests/api/platform/` and targeted integration coverage in `src/` Jest suites.

### Testing Requirements

- Add deterministic negative tests for missing orgUnit, invalid orgUnit, and cross-tenant access.
- Verify no accidental data exposure in refusal paths.
- Validate privileged vs non-privileged behavior under identical route calls.

### Project Structure Notes

- Reuse existing tenancy and scope helpers; avoid duplicate context resolution stacks.
- Keep this story modular and reusable by downstream stories that declare dependency on a.2.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic a, Story a.2)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (OrgUnit context enforcement)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Tenant/OrgUnit visibility expectations)
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context creation only; implementation logs pending.

### Completion Notes List

- Created ConnectShyft Epic A context for tenant/orgUnit enforcement with explicit access-control guardrails.

### File List

- _bmad-output/implementation-artifacts/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.md
