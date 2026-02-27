# Story c.2: Thread Ensure Endpoint with Conflict-Safe Idempotency

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit operator,
I want creating/opening a thread to return the existing active thread when one already exists,
so that duplicate active threads are never created for the same neighbor context.

## Acceptance Criteria

1. Given concurrent requests to `POST /api/v1/connectshyft/threads` for the same `(tenant_id, org_unit_id, neighbor_id)`, when ensure logic executes under uniqueness constraints, then exactly one active thread exists.
2. Given conflicting ensure requests for the same active identity, when conflict handling completes, then all callers receive the same active thread instance instead of creating duplicates.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Existing-thread reuse must be deterministic and non-disruptive so operators do not see duplicate conversations.
- Real-User Validation Evidence: Pending critical-capability validation run. Record concrete UI/API operator evidence before closeout.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Endpoint uses existing context/auth patterns; no new role-administration workflow.

## Tasks / Subtasks

- [ ] Implement thread ensure API contract (AC: 1, 2)
  - [ ] Add/align `POST /api/v1/connectshyft/threads` route/service behavior to enforce ensure semantics.
  - [ ] Return existing active thread when one already exists for `(tenant_id, org_unit_id, neighbor_id)`.
- [ ] Implement conflict-safe idempotency flow (AC: 1, 2)
  - [ ] Use transaction + unique-constraint conflict handling to prevent duplicate active threads.
  - [ ] Normalize response payload to same thread identity for all conflicting callers.
- [ ] Implement deterministic refusal and validation behavior (AC: 1)
  - [ ] Refuse invalid tenant/orgUnit context or malformed neighbor identifiers with shared refusal envelope.
  - [ ] Keep no-leak semantics on cross-tenant or unauthorized attempts.
- [ ] Add concurrency and contract coverage (AC: 1, 2)
  - [ ] API tests for same-key concurrent ensures returning identical thread id.
  - [ ] Tests ensuring only one active row remains after contention.
  - [ ] E2E sanity flow confirming operator sees/enters existing thread context without duplicate cards.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-011, FR-CS-012.
- NFR alignment: NFR-CS-006.
- Story dependency: `c.1` must be complete because uniqueness and lifecycle constraints are schema-enforced.
- Ensure behavior must remain deterministic across retries and contention.

### Architecture Compliance

- AD-03 defines active-thread identity and ensure behavior contract.
- Endpoint must preserve tenant/orgUnit isolation and bounded-context rules.
- Keep envelope and refusal behavior aligned with platform shared response contract.

### Library / Framework Requirements

- Reuse existing Express route patterns and ConnectShyft service layering.
- Use existing Knex transaction primitives and error normalization helpers.
- Avoid custom ad hoc retry loops that can race against uniqueness constraints.

### File Structure Requirements

- Endpoint wiring in `src/src/routes/api/v1/connectshyft.ts`.
- Ensure logic in `src/src/modules/connectshyft/` services/repositories.
- Optional DTO/validator updates in `src/src/validators/` where request contracts are defined.
- Tests in `tests/api/platform/` and operator path checks in `tests/e2e/platform/`.

### Testing Requirements

- High-contention API test that fires concurrent ensure calls and asserts single active thread.
- Contract test asserting response thread payload shape is stable across created vs reused path.
- Negative tests for invalid context/membership refusal behavior.
- Regression check for existing inbox/thread list behavior after ensure integration.

### Previous Story Intelligence

- `c.1` defines the schema/index foundation this story relies on.
- Prior ConnectShyft access-control stories (`a.2`, `a.5`) require context and envelope conformance even on conflict/refusal paths.

### Git Intelligence Summary

- Recent governance and policy hardening commits indicate deterministic behavior and shared envelope compliance are non-negotiable.

### Latest Technical Information

- Keep implementation aligned with repository-pinned stack and established transaction patterns.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Do not introduce duplicate ensure implementations across route/service layers.
- Keep idempotency behavior explicit in tests and error handling.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story c-2-thread-ensure-endpoint-with-conflict-safe-idempotency`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic c, Story c.2)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-03, endpoint map section)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-011, FR-CS-012)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story c.2 context with conflict-safe ensure semantics and deterministic idempotent response requirements.

### File List

- _bmad-output/implementation-artifacts/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.md

## Change Log

- 2026-02-24: Created Story c.2 ready-for-dev context document.
