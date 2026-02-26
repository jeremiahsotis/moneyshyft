# Story ux-r4: Outbound Policy Guardrail UI

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a volunteer sending messages,
I want policy constraints to be enforced with clear UX feedback,
so that I can complete actions safely and correctly.

## Acceptance Criteria

1. Given outbound actions are triggered, when lifecycle and policy rules apply, then UI control states remain explicit by thread state and avoid hidden policy paths.
2. Given `prefers_texting = NO`, when outbound SMS is attempted, then UI requires explicit override reason and blocks send until valid override input is provided.
3. Given outbound action starts from `CLOSED` state (`Call` or `Send Message`), when action executes, then same thread reopens to `UNCLAIMED` and UI reflects reopened state without creating a new thread.
4. Given API outcome envelopes return `success`, `refusal`, or `error`, when responses are handled, then UX feedback is deterministic, accessible, and policy-specific with no ambiguous fallback copy.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Outbound actions are safety-critical and must present policy outcomes clearly before and after action.
- Real-User Validation Evidence: Pending implementation. Validate override reason flow, closed-thread reopen UX, and refusal handling with volunteer operators.
- Real-User Validation Result: pending
- Role-Admin UI Path: Assign roles/memberships via `/app/tenant/settings/admins`, then validate outbound action affordances in ConnectShyft thread views.
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement state-explicit outbound action presentation (AC: 1)
  - [ ] Preserve explicit action controls by lifecycle state in thread detail.
  - [ ] Prevent hidden or indirect controls that bypass policy-safe flows.
- [ ] Implement override-reason UX for texting preference guardrails (AC: 2)
  - [ ] Require explicit override reason for `prefers_texting = NO`.
  - [ ] Block outbound send until validation passes and refusal semantics are clear.
- [ ] Implement closed-thread outbound reopen UX handling (AC: 3)
  - [ ] Reflect `CLOSED -> UNCLAIMED` on same thread for outbound taps.
  - [ ] Surface deterministic user feedback for reopened thread actions.
- [ ] Implement canonical envelope-to-feedback mapping (AC: 4)
  - [ ] Map `success|refusal|error` to stable, accessible UX feedback patterns.
  - [ ] Remove ambiguous or non-canonical outcome handling paths.
- [ ] Add contract and interaction coverage (AC: 1, 2, 3, 4)
  - [ ] API tests for override refusal/success behavior and reopen side effects.
  - [ ] E2E tests for outbound guardrail flows across lifecycle states.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-016, FR-CS-022, FR-CS-023, FR-CS-024.
- NFR alignment: NFR-CS-011.
- Story dependencies:
  - `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`
  - `d-2-preference-override-enforcement-for-outbound-sms`
  - `d-4-operator-interaction-contracts-for-outbound-safety`
- Ensure behavior remains consistent with locked closed-thread reopen semantics.

### Architecture Compliance

- Preserve canonical lifecycle transition semantics for outbound-from-closed behavior.
- Keep envelope taxonomy canonical (`success`, `refusal`, `error`) and centrally mapped.
- Ensure policy-safe access and refusal feedback remain explicit and auditable.

### Library / Framework Requirements

- Reuse ConnectShyft thread and read-contract clients in `frontend/src/features/connectshyft/`.
- Reuse route/service policy helpers and refusal envelope utilities in backend ConnectShyft module.
- Avoid per-view one-off response parsing that diverges from shared envelope handlers.

### File Structure Requirements

- Thread interaction UI updates in `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`.
- Shared outbound handling updates in `frontend/src/features/connectshyft/threads.ts`.
- Backend contract alignment in `src/src/routes/api/v1/connectshyft.ts` and `src/src/modules/connectshyft/`.
- Regression coverage in `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Validate override-required flow for `prefers_texting = NO` including refusal and success branches.
- Validate closed-thread outbound tap causes same-thread reopen UX and state refresh.
- Validate state-action control matrix remains explicit and consistent by lifecycle state.
- Validate envelope outcome rendering for `success|refusal|error` with accessible messaging.

### Previous Story Intelligence

- `d.1`, `d.2`, and `d.4` define outbound policy and lifecycle behavior; this story applies those rules in operator-facing UI.
- `c.4` and locked remediation requirements govern closed-thread reopen behavior and cannot be softened in UI.

### Git Intelligence Summary

- Existing hardening and contract stories favor deterministic policy-safe behavior; avoid adding hidden retries, silent fallbacks, or non-canonical outcomes.

### Latest Technical Information

- Treat sprint remediation and production-locked specification as the active behavioral source of truth.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep guardrail UI and backend policy contracts tightly coupled through shared envelope semantics.
- Ensure policy states are visible to operators before action commits, not only after refusals.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story ux-r4-outbound-policy-guardrail-ui`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic UX, Story ux-r4)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (sections 4.1.1, 4.1.2, 4.1.3)
- `_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-implementation-locked-production-specification.normalized.md` (sections 0, 2, 7, 9)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git branch --show-current` (pass)
- `rg -n "^Status: ready-for-dev$" _bmad-output/implementation-artifacts/ux-r4-outbound-policy-guardrail-ui.md` (pass)

### Completion Notes List

- Created implementation-ready Story ux-r4 context document with outbound guardrail UX, override constraints, and canonical envelope feedback mapping.

### File List

- _bmad-output/implementation-artifacts/ux-r4-outbound-policy-guardrail-ui.md

## Change Log

- 2026-02-25: Created Story ux-r4 ready-for-dev context document.
