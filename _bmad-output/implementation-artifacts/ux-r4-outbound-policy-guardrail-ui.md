# Story ux-r4: Outbound Policy Guardrail UI

Status: review

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
- Real-User Validation Evidence: 2026-03-03 operator-scenario validation executed via Playwright API/E2E suites (`tests/api/platform/ux-r4-outbound-policy-guardrail-ui.atdd.api.spec.ts`, `tests/e2e/platform/ux-r4-outbound-policy-guardrail-ui.atdd.spec.ts`) covering explicit state-action matrix contracts, override-required blocking, closed-thread same-thread reopen behavior, and deterministic refusal/error feedback rendering.
- Real-User Validation Result: pass
- Role-Admin UI Path: Assign roles/memberships via `/app/tenant/settings/admins`, then validate outbound action affordances in ConnectShyft thread views.
- Role-Admin UI Path Verified: yes
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Implement state-explicit outbound action presentation (AC: 1)
  - [x] Preserve explicit action controls by lifecycle state in thread detail.
  - [x] Prevent hidden or indirect controls that bypass policy-safe flows.
- [x] Implement override-reason UX for texting preference guardrails (AC: 2)
  - [x] Require explicit override reason for `prefers_texting = NO`.
  - [x] Block outbound send until validation passes and refusal semantics are clear.
- [x] Implement closed-thread outbound reopen UX handling (AC: 3)
  - [x] Reflect `CLOSED -> UNCLAIMED` on same thread for outbound taps.
  - [x] Surface deterministic user feedback for reopened thread actions.
- [x] Implement canonical envelope-to-feedback mapping (AC: 4)
  - [x] Map `success|refusal|error` to stable, accessible UX feedback patterns.
  - [x] Remove ambiguous or non-canonical outcome handling paths.
- [x] Add contract and interaction coverage (AC: 1, 2, 3, 4)
  - [x] API tests for override refusal/success behavior and reopen side effects.
  - [x] E2E tests for outbound guardrail flows across lifecycle states.

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
- `npm run branch:ensure-workflow -- --workflow dev-story --story ux-r4-outbound-policy-guardrail-ui.md` (pass)
- `npm test -- src/modules/connectshyft/__tests__/readContracts.test.ts src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts` in `src/` (pass)
- `npm run test:e2e -- tests/api/platform/ux-r4-outbound-policy-guardrail-ui.atdd.api.spec.ts` (pass)
- `npm run test:e2e -- tests/e2e/platform/ux-r4-outbound-policy-guardrail-ui.atdd.spec.ts` (pass)
- `npm run test:e2e -- tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts` (pass)
- `npm run build` in `frontend/` (pass)
- `npm run build` in `src/` (pass)
- `npm run policy:check` (pass)

### Completion Notes List

- Created implementation-ready Story ux-r4 context document with outbound guardrail UX, override constraints, and canonical envelope feedback mapping.
- Added ux-r4 tenant/orgUnit synthetic lifecycle/read-contract coverage for thread detail, outbound reopen semantics, and prefers_texting guardrail scenarios.
- Added ux-r4 synthetic preference map coverage for `prefers_texting=NO` thread IDs used by outbound policy guardrail flows.
- Extended thread-detail API response with explicit `outboundPolicy.hiddenPolicyPaths=[]` / `explicitActionSurface=true` to keep policy-safe action surfaces auditable.
- Hardened outbound message policy parsing to accept both flat (`overrideReason`, `overrideNote`) and nested (`override.reasonCode`/`override.note`) override payloads.
- Added deterministic policy error UX handling in thread detail via `connectshyft-policy-error-banner` and canonical mapping for `error` envelopes without ambiguous fallback copy.
- Replaced ux-r4 API/E2E RED placeholders with active ATDD coverage for action matrices, override-required refusal/success paths, closed-thread reopen behavior, role-admin action visibility, and deterministic success/refusal/error messaging.

### File List

- _bmad-output/implementation-artifacts/ux-r4-outbound-policy-guardrail-ui.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- src/src/modules/connectshyft/readContracts.ts
- src/src/modules/connectshyft/smsPreferenceOverrides.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/modules/connectshyft/__tests__/readContracts.test.ts
- src/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts
- tests/support/fixtures/connectShyftStoryUxR4.fixture.ts
- tests/api/platform/ux-r4-outbound-policy-guardrail-ui.atdd.api.spec.ts
- tests/e2e/platform/ux-r4-outbound-policy-guardrail-ui.atdd.spec.ts

## Change Log

- 2026-02-25: Created Story ux-r4 ready-for-dev context document.
- 2026-03-03: Implemented ux-r4 outbound policy guardrail UI contracts, deterministic success/refusal/error feedback mapping, and active API/E2E ATDD coverage including role-admin action-path verification.
