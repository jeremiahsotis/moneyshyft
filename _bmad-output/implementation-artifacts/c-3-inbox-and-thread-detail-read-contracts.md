# Story c.3: Inbox and Thread Detail Read Contracts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit member,
I want inbox and thread detail endpoints to return orgUnit-scoped communication records with deterministic ordering and metadata,
so that I can triage and act without ambiguity.

## Acceptance Criteria

1. Given a user fetches inbox or thread detail in an active orgUnit context, when records are returned, then results are scoped to that orgUnit and include required metadata (`last_inbound_cs_number_id`, preferred outbound number context).
2. Given inbox results are returned, when sorting executes, then deterministic ordering is enforced with:
   - `ORDER BY priority_rank ASC, last_activity_at_utc DESC, thread_id ASC`
   - `priority_rank` mapping: `stage>=3 -> 1`, `stage=2 -> 2`, `stage=1 -> 3`, `new_unread -> 4`, `other -> 5`
3. Given urgency is rendered to operators, when list items are displayed, then labels map to user language (not raw stage internals):
   - stage 0 -> no label
   - stage 1 -> Needs attention soon
   - stage 2+ -> Needs urgent attention
4. Given voicemail is received on a CLAIMED thread, when Mine/Inbox refresh, then thread remains in Mine, voicemail indicator appears on the Mine card, and voicemail does not force Inbox movement.
5. Given thread detail actions are rendered, when state-specific controls are shown, then action sets are:
   - `UNCLAIMED`: Call, Text, Claim
   - `CLAIMED`: Call, Text, Close
   - `CLOSED`: Call, Send Message

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: This is the primary operator triage contract; ordering and labels must remain deterministic and plain-language.
- Real-User Validation Evidence: Pending implementation. Validate inbox ordering, urgency labels, Mine/Inbox voicemail behavior, and action-set rendering with volunteer operators.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story enforces read/action contract semantics, not role-administration workflows.

## Tasks / Subtasks

- [ ] Implement inbox read model contract and sorting semantics (AC: 1, 2)
  - [ ] Implement orgUnit-scoped query model for inbox and thread detail.
  - [ ] Apply canonical server-side ordering with explicit `priority_rank` mapping.
- [ ] Implement urgency label mapping contract (AC: 3)
  - [ ] Expose deterministic urgency label outputs without leaking raw escalation engine internals to operators.
  - [ ] Ensure label mapping behavior is stable across API and UI paths.
- [ ] Implement voicemail indicator behavior for claimed threads (AC: 4)
  - [ ] Keep claimed threads in Mine on voicemail events.
  - [ ] Surface voicemail indicator in Mine and prevent forced Inbox movement.
- [ ] Implement state-specific action control contract (AC: 5)
  - [ ] Ensure read/detail payload includes or supports rendering exact action sets per state.
  - [ ] Keep action availability aligned with lifecycle and policy constraints.
- [ ] Add deterministic contract coverage (AC: 1, 2, 3, 4, 5)
  - [ ] API tests for ordering, rank mapping, and metadata presence.
  - [ ] API/E2E tests for voicemail indicator placement and action set rendering behavior.
  - [ ] Performance assertions for inbox/thread read latency budgets where test harness supports it.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-005, FR-CS-017.
- NFR alignment: NFR-CS-011.
- Story dependency: `c.2`.
- Hardening lock: this story is explicitly hardened by sprint change proposal (`connectshyft-sprint-change-proposal-2026-02-24.md`) and must be treated as authoritative behavior.

### Architecture Compliance

- Align with canonical thread state model and lifecycle action semantics from architecture + approved hardening updates.
- Preserve strict orgUnit scoping on all read models.
- Keep envelope semantics and deterministic refusal behavior aligned to shared API contract.

### Library / Framework Requirements

- Reuse existing query/service patterns in ConnectShyft module.
- Reuse shared response envelope helpers and avoid endpoint-specific response formats.
- Keep UI action/label behavior mapped from server contract without duplicating ranking logic in multiple places.

### File Structure Requirements

- Read route updates in `src/src/routes/api/v1/connectshyft.ts`.
- Query/read model logic in `src/src/modules/connectshyft/`.
- Frontend consumption updates in `frontend/src/` views/stores for Inbox/Mine/Thread detail.
- Tests in `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- API tests for deterministic ordering with tie-break by `thread_id`.
- API tests for rank mapping and urgency label mapping.
- E2E coverage for Mine vs Inbox voicemail behavior and action availability by state.
- Add latency instrumentation/assertion hooks for inbox/detail endpoint budget verification (`p95 <= 750ms`, `p99 <= 1500ms`) where existing test tooling supports it.

### Previous Story Intelligence

- `c.2` ensure behavior is upstream and must be stable before read-model correctness is validated.
- `b.3` and `b.4` are dependency-gated on this story; keep action and state semantics explicit to unblock governance lane safely.

### Git Intelligence Summary

- Existing ConnectShyft artifacts show stricter contract wording after UX remediation; avoid interpretation drift by implementing exactly the hardened read contract.

### Latest Technical Information

- Treat approved UX/UI locked behavior artifacts and sprint change proposal as current source of truth where older planning language conflicts.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep ranking and urgency mapping deterministic and centrally defined.
- Enforce state-specific action sets from canonical lifecycle state, not client-inferred heuristics.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story c-3-inbox-and-thread-detail-read-contracts`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic c, Story c.3)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (section 4.1.1 hardening)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (state model, read ordering guidance, endpoint map)
- `_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-implementation-locked-production-specification.normalized.md` (Inbox/Mine behavior and action semantics)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-005, FR-CS-017)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story c.3 context with deterministic read contracts, hardened UX semantics, and dependency-unblock requirements.

### File List

- _bmad-output/implementation-artifacts/c-3-inbox-and-thread-detail-read-contracts.md

## Change Log

- 2026-02-24: Created Story c.3 ready-for-dev context document.

