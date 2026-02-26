# Story b.4: Role-Restricted Neighbor Merge with Irreversible Confirmation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tenant operations lead,
I want merge actions to be restricted and audited with explicit irreversible confirmation,
so that high-impact identity operations are deliberate and traceable.

## Acceptance Criteria

1. Given a user initiates neighbor merge, when permissions are evaluated, then only authorized roles can proceed.
2. Given a merge request is submitted, when confirmation checks run, then merge executes only after explicit irreversible confirmation is provided.
3. Given merge completes, when persistence and side effects run, then audit/outbox records include before/after identifiers and merge actor metadata.
4. Given merge is refused (permission, validation, or confirmation failure), when response returns, then refusal is deterministic and no partial merge writes occur.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Merge UX must use irreversible confirmation language and display merge impact summary before commit.
- Real-User Validation Evidence: 2026-02-26 targeted Playwright validation passed for API merge contracts (`tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.automate.api.spec.ts`, 7/7) and operator UI merge journeys (`tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.automate.spec.ts`, 5/5).
- Real-User Validation Result: pass
- Role-Admin UI Path: Role assignment path is required to validate canonical merge role matrix (`TENANT_ADMIN` and `ORGUNIT_IDENTITY_LEAD` allowed; `ORGUNIT_MEMBER` refused).
- Role-Admin UI Path Verified: yes
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Implement role-restricted merge authorization (AC: 1, 4)
  - [x] Enforce merge capability checks at route and service layers.
  - [x] Deny by default with deterministic refusal payloads.
- [x] Implement irreversible confirmation contract (AC: 2, 4)
  - [x] Require explicit confirmation field/value on merge endpoint payload.
  - [x] Refuse requests lacking valid confirmation with stable refusal code.
- [x] Implement transactional merge operation (AC: 3, 4)
  - [x] Merge duplicate identity records into canonical neighbor record with transaction boundaries.
  - [x] Repoint dependent records (thread/communication associations) atomically.
  - [x] Prevent partial writes on any failure path.
- [x] Implement audit/outbox emission for merge (AC: 3)
  - [x] Emit before/after neighbor IDs, actor, orgUnit context, and reason metadata.
  - [x] Ensure audit/outbox persists with merge transaction semantics.
- [x] Add UI merge flow and automated coverage (AC: 1, 2, 3, 4)
  - [x] Add irreversible confirmation modal with explicit impact copy.
  - [x] API tests for canonical role matrix (`TENANT_ADMIN` + `ORGUNIT_IDENTITY_LEAD` allowed, `ORGUNIT_MEMBER` refused) and atomicity.
  - [x] E2E tests for confirmation, refusal, and success path integrity.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-009, FR-CS-024.
- Story dependency: `b.3` relationship-gated neighbor edits should establish governance baseline before merge operations.
- Execution gate: do not start until `b-3-relationship-gated-neighbor-edits-with-provenance-audit` is `done`; confirm upstream dependency `c-3-inbox-and-thread-detail-read-contracts` is satisfied in sprint status.
- Merge behavior must remain fully auditable and refusal-safe.

### Architecture Compliance

- AD-04 requires merge operations to be role-restricted and audited.
- Critical actions must follow platform audit/outbox mutation patterns and deterministic refusal envelopes.
- Preserve tenant/orgUnit safety boundaries and avoid any cross-tenant merge path.

### Library / Framework Requirements

- Reuse capability framework in `src/src/platform/rbac/capabilities.ts` for merge permissions.
- Reuse existing transaction patterns in Knex-backed services for atomic writes.
- Reuse shared envelope helpers; do not introduce endpoint-local response formats.

### File Structure Requirements

- Route/API changes in `src/src/routes/api/v1/connectshyft.ts`.
- Neighbor merge service logic under `src/src/modules/connectshyft/`.
- Schema support updates in `src/src/migrations/` if additional merge metadata tables/columns are needed.
- Tests in `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- API tests for:
  - unauthorized merge refusal
  - missing/invalid confirmation refusal
  - successful merge with before/after identifiers and audit/outbox evidence
  - rollback on mid-transaction failure
- E2E tests for merge modal confirmation and post-merge identity continuity.
- Regression checks against prior Epic B neighbor create/edit contracts.

### Previous Story Intelligence

- `b.1` + `b.2` define canonical identity and shared-phone visibility expectations.
- `b.3` establishes governed edit path and provenance audit requirements that merge must extend, not bypass.
- `a.5` pattern for capability enforcement at both route and service layers should be reused.

### Git Intelligence Summary

- Recent envelope-normalization commits indicate strict shared-envelope compliance is required across new routes.
- Policy and entitlement hardening commits reinforce deny-by-default behavior; merge path should stay aligned.

### Latest Technical Information

- Follow repository-pinned stack and current governance constraints; prioritize consistency over introducing new framework choices.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep merge logic isolated within ConnectShyft bounded context.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story b-4-role-restricted-neighbor-merge-with-irreversible-confirmation`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic b, Story b.4)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-04, Audit/Outbox requirements)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Flow 5 irreversible merge confirmation)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-009, FR-CS-024)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story b-4-role-restricted-neighbor-merge-with-irreversible-confirmation` (pass)
- `npm run build` (backend TypeScript compile) in `src/` (pass)
- `npm run build` (frontend `vue-tsc` + `vite build`) in `frontend/` (pass)
- `npm test -- --runInBand src/src/modules/connectshyft/__tests__/neighbors.test.ts` in `src/` (pass)
- `npm run test:e2e -- tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.automate.api.spec.ts` (pass)
- `npm run test:e2e -- tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.automate.spec.ts` (pass)

### Completion Notes List

- Added route-level merge endpoint `POST /api/v1/connectshyft/neighbors/merge` with capability enforcement, deterministic refusal envelopes, and shared scope payloads.
- Implemented service/store neighbor-merge behavior in `src/src/modules/connectshyft/neighbors.ts` for both in-memory and Knex paths, including irreversible confirmation enforcement and transactional thread repointing.
- Added atomic side-effect wrapping for merge audit/outbox emission using `executePlatformMutation` with deterministic transaction-abort refusal handling and rollback simulation stage support.
- Implemented operator merge UX in `frontend/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue` with irreversible confirmation modal, refusal/success states, and before/after audit chips.
- Added frontend merge client contract in `frontend/src/features/connectshyft/neighbors.ts`.
- Activated and updated B4 automate API and E2E specs with seeded-neighbor setup and passing assertions for permission, confirmation, envelope stability, success auditing, and refusal determinism.
- Added backend unit coverage for merge authorization, confirmation validation, and successful merge data behavior.
- Tightened role matrix enforcement by removing merge capability from `TENANT_STAFF` and adding explicit refusal coverage for that role.
- Removed merge success fallback when audit/outbox side effects cannot persist; merge now fails closed with deterministic transaction-aborted refusal and no writes.
- Restricted `simulateFailureStage` to ConnectShyft test-harness mode only.
- Completed previously skipped scoped-membership refusal E2E case and removed actionable merge control when refusal state is present.
- Reconciled story documentation and sprint tracking to match the final code/test diff.

### File List

- _bmad-output/implementation-artifacts/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/modules/connectshyft/__tests__/neighbors.test.ts
- src/src/platform/rbac/capabilities.ts
- src/src/routes/api/v1/connectshyft.ts
- frontend/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue
- tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.automate.api.spec.ts
- tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.automate.spec.ts
- tests/support/factories/connectShyftStoryB4Factory.ts
- tests/support/helpers/connectShyftDbActor.ts

## Change Log

- 2026-02-24: Created Story b.4 ready-for-dev context document.
- 2026-02-26: Implemented role-restricted neighbor merge endpoint + service merge semantics, irreversible confirmation UX, and B4 automate API/E2E coverage; status advanced to `in-progress` via policy-compliant transition workflow.
- 2026-02-26: Senior review fixes applied: canonical role matrix hardened (`TENANT_STAFF` refused), merge side-effects path made fail-closed, B4 API suite expanded (7/7), scoped-membership E2E refusal activated (5/5), and story/file-list/sprint-status discrepancies resolved.

## Senior Developer Review (AI)

### Reviewer

Jeremiah (Codex)

### Date

2026-02-26

### Outcome

Approved

### Findings Resolved

- [Resolved] Merge authorization narrowed to canonical matrix by removing `TENANT_STAFF` merge capability and adding regression tests.
- [Resolved] Merge no longer succeeds when audit/outbox side effects cannot persist; deterministic aborted refusal now blocks partial/non-audited writes.
- [Resolved] API automation now asserts side-effect persistence and rollback determinism, plus explicit `TENANT_STAFF` refusal coverage.
- [Resolved] Scoped-membership merge refusal E2E case is active (no longer `fixme`) and verifies no actionable merge control.
- [Resolved] Story and git/file discrepancies reconciled (file list + sprint status synchronized).
