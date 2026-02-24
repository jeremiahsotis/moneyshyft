# Story b.4: Role-Restricted Neighbor Merge with Irreversible Confirmation

Status: ready-for-dev

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
- Real-User Validation Evidence: Pending implementation. Validate role matrix, irreversible confirmation, and atomic merge integrity before `review`.
- Real-User Validation Result: pending
- Role-Admin UI Path: Role assignment path is required to validate canonical merge role matrix (`TENANT_ADMIN` and `ORGUNIT_IDENTITY_LEAD` allowed; `ORGUNIT_MEMBER` refused).
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement role-restricted merge authorization (AC: 1, 4)
  - [ ] Enforce merge capability checks at route and service layers.
  - [ ] Deny by default with deterministic refusal payloads.
- [ ] Implement irreversible confirmation contract (AC: 2, 4)
  - [ ] Require explicit confirmation field/value on merge endpoint payload.
  - [ ] Refuse requests lacking valid confirmation with stable refusal code.
- [ ] Implement transactional merge operation (AC: 3, 4)
  - [ ] Merge duplicate identity records into canonical neighbor record with transaction boundaries.
  - [ ] Repoint dependent records (thread/communication associations) atomically.
  - [ ] Prevent partial writes on any failure path.
- [ ] Implement audit/outbox emission for merge (AC: 3)
  - [ ] Emit before/after neighbor IDs, actor, orgUnit context, and reason metadata.
  - [ ] Ensure audit/outbox persists with merge transaction semantics.
- [ ] Add UI merge flow and automated coverage (AC: 1, 2, 3, 4)
  - [ ] Add irreversible confirmation modal with explicit impact copy.
  - [ ] API tests for canonical role matrix (`TENANT_ADMIN` + `ORGUNIT_IDENTITY_LEAD` allowed, `ORGUNIT_MEMBER` refused) and atomicity.
  - [ ] E2E tests for confirmation, refusal, and success path integrity.

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

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story b.4 context with merge-governance, irreversible confirmation, and transactional safety guardrails.

### File List

- _bmad-output/implementation-artifacts/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.md

## Change Log

- 2026-02-24: Created Story b.4 ready-for-dev context document.
