# Story c.4: Claim, Takeover, and Close Lifecycle Actions

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit operator,
I want claim/takeover/close actions to enforce canonical transitions and ownership governance,
so that lifecycle actions remain predictable and auditable.

## Acceptance Criteria

1. Given an authorized lifecycle action request (`claim`, `takeover`, `close`), when transition rules execute, then only valid canonical state transitions are allowed and ownership changes are enforced by policy.
2. Given successful lifecycle transitions, when side effects persist, then audit/outbox records include actor, orgUnit, prior state, and new state.
3. Given a thread is `CLOSED`, when outbound call tap or outbound message tap is initiated, then the same thread reopens as `UNCLAIMED` (no new thread creation), emits `thread_reopened_by_user`, and applies locked escalation/inactivity reset behavior.
4. Given a thread is `CLOSED`, when inbound voice or fallback intake events arrive, then the thread does not auto-reopen and fallback routing/timeline behavior follows locked rules.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Lifecycle actions are operator-critical and must present explicit action-state feedback without silent transition failure.
- Real-User Validation Evidence: Pending implementation. Validate claim/takeover/close transitions, reopen behavior, and refusal handling with real operator workflows.
- Real-User Validation Result: pending
- Role-Admin UI Path: Role assignment path must validate claim/takeover permissions for tenant-privileged and orgUnit-scoped operators.
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement canonical claim/takeover/close transitions (AC: 1, 2)
  - [ ] Enforce transition matrix and ownership policy in service layer.
  - [ ] Refuse invalid transitions with deterministic refusal envelopes.
- [ ] Implement lifecycle audit/outbox side effects (AC: 2)
  - [ ] Emit transition audit/outbox events with actor and orgUnit provenance.
  - [ ] Ensure mutation + outbox writes are transactionally coupled.
- [ ] Implement `CLOSED` outbound reopen semantics (AC: 3)
  - [ ] Reopen same thread id as `UNCLAIMED` before outbound execution.
  - [ ] Emit `thread_reopened_by_user` and reset escalation/inactivity fields per locked behavior.
- [ ] Enforce inbound-to-closed no-auto-reopen rules (AC: 4)
  - [ ] Keep inbound voice/fallback handling from auto-reopening closed threads.
  - [ ] Ensure timeline/audit events are still captured for fallback outcomes.
- [ ] Add lifecycle and policy matrix coverage (AC: 1, 2, 3, 4)
  - [ ] API tests for valid/invalid transition matrix and ownership gating.
  - [ ] API tests for reopen-on-outbound + no-reopen-on-inbound behavior.
  - [ ] E2E tests for state-specific action behavior and operator messaging.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-013, FR-CS-015, FR-CS-024.
- NFR alignment: NFR-CS-004, NFR-CS-010.
- Story dependencies: `c.2`, `c.3`.
- Locked behavior priority: follow approved cross-epic UX remediation semantics for closed-thread outbound reopen behavior.

### Architecture Compliance

- Canonical lifecycle states and transitions must remain explicit and auditable.
- Keep policy checks at endpoint and service boundaries.
- Where historical architecture text conflicts with approved hardening (closed-thread outbound behavior), follow the approved sprint change proposal and Epic C story lock.

### Library / Framework Requirements

- Reuse capability policy helpers and existing ConnectShyft transition service patterns.
- Reuse transaction wrapper + outbox mutation patterns.
- Reuse shared refusal envelope helpers; avoid endpoint-local response contracts.

### File Structure Requirements

- Lifecycle routes in `src/src/routes/api/v1/connectshyft.ts`.
- Transition logic in `src/src/modules/connectshyft/`.
- Inbound/fallback interaction updates where webhook and routing services touch closed-thread logic.
- Tests in `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Transition matrix tests for claim/takeover/close validity and permission-gated behavior.
- Reopen tests for `POST /threads/:id/call` and `POST /threads/:id/messages` from `CLOSED` state.
- Negative tests ensuring inbound voice/fallback does not reopen `CLOSED`.
- Audit/outbox verification for all successful state transitions.

### Previous Story Intelligence

- `c.3` read/action contracts must remain aligned with lifecycle state behavior introduced here.
- Downstream outbound stories (`d.1`, `d.2`, `d.4`) depend on these transitions and reopen semantics.

### Git Intelligence Summary

- Existing governance stories reinforce deterministic refusal behavior and auditable transitions; this story must not introduce silent state mutation paths.

### Latest Technical Information

- Use locked UX behavior and sprint change proposal as authoritative for closed-thread action semantics.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep lifecycle transitions centralized to avoid drift between API routes and webhook side effects.
- Explicitly encode and test reopened-thread semantics before outbound execution.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story c-4-claim-takeover-and-close-lifecycle-actions`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic c, Story c.4)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (section 4.1.2 hardening)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (canonical lifecycle, audit/outbox, endpoint map)
- `_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-implementation-locked-production-specification.normalized.md` (closed-state action semantics)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-013, FR-CS-015, FR-CS-024)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story c.4 context with transition governance, auditable lifecycle actions, and locked reopen behavior.

### File List

- _bmad-output/implementation-artifacts/c-4-claim-takeover-and-close-lifecycle-actions.md

## Change Log

- 2026-02-24: Created Story c.4 ready-for-dev context document.

