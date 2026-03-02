# Story c.2: Thread Ensure Endpoint with Conflict-Safe Idempotency

Status: review

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

- [x] Implement thread ensure API contract (AC: 1, 2)
  - [x] Add/align `POST /api/v1/connectshyft/threads` route/service behavior to enforce ensure semantics.
  - [x] Return existing active thread when one already exists for `(tenant_id, org_unit_id, neighbor_id)`.
- [x] Implement conflict-safe idempotency flow (AC: 1, 2)
  - [x] Use transaction + unique-constraint conflict handling to prevent duplicate active threads.
  - [x] Normalize response payload to same thread identity for all conflicting callers.
- [x] Implement deterministic refusal and validation behavior (AC: 1)
  - [x] Refuse invalid tenant/orgUnit context or malformed neighbor identifiers with shared refusal envelope.
  - [x] Keep no-leak semantics on cross-tenant or unauthorized attempts.
- [x] Add concurrency and contract coverage (AC: 1, 2)
  - [x] API tests for same-key concurrent ensures returning identical thread id.
  - [x] Tests ensuring only one active row remains after contention.
  - [x] E2E sanity flow confirming operator sees/enters existing thread context without duplicate cards.

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

- `npm run branch:ensure-workflow -- --lane connectshyft --workflow dev-story --story c-2-thread-ensure-endpoint-with-conflict-safe-idempotency`
- `npx playwright test tests/api/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.api.spec.ts --project=chromium`
- `npx playwright test tests/e2e/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.spec.ts --project=chromium`
- `npx playwright test tests/api/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.api.spec.ts tests/e2e/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.spec.ts --project=chromium`
- `cd src && MONEYSHYFT_TEST_DATABASE_URL='postgresql://jeremiahotis:Oiruueu12@127.0.0.1:5432/moneyshyft' npm test -- src/src/modules/connectshyft/__tests__/threads.test.ts src/src/modules/connectshyft/__tests__/threads.contract.test.ts`
- `npx playwright test --list tests/api/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.api.spec.ts tests/e2e/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.spec.ts` (pass)

### Completion Notes List

- Added strict `neighborId` validation in `POST /api/v1/connectshyft/threads` with shared client refusal envelope (`CONNECTSHYFT_NEIGHBOR_ID_INVALID`) and field-level error metadata.
- Expanded story c.2 API coverage for malformed-neighbor refusal and cross-tenant no-leak refusal semantics while retaining concurrent idempotency verification.
- Added c.2 E2E operator journey proving concurrent ensure requests converge to one thread identity and one inbox card, with navigation into the same thread detail context.
- Verified related thread module behavior with Jest unit + Postgres contract test suites.

### File List

- _bmad-output/implementation-artifacts/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.md
- src/src/routes/api/v1/connectshyft.ts
- src/src/modules/connectshyft/readContracts.ts
- src/src/modules/connectshyft/__tests__/readContracts.test.ts
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/api/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.api.spec.ts
- tests/api/platform/c-3-inbox-and-thread-detail-read-contracts.atdd.api.spec.ts
- tests/e2e/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.spec.ts
- tests/e2e/platform/c-3-inbox-and-thread-detail-read-contracts.atdd.spec.ts

## Change Log

- 2026-02-24: Created Story c.2 ready-for-dev context document.
- 2026-03-02: Implemented c.2 conflict-safe ensure validation and expanded API/E2E coverage; status moved to review.
