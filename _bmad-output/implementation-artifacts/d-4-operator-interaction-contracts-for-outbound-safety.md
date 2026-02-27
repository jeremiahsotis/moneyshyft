# Story d.4: Operator Interaction Contracts for Outbound Safety

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontline operator,
I want outbound policy controls to be visible and accessible in desktop, tablet, and mobile thread workflows,
so that I can complete actions quickly without violating governance rules.

## Acceptance Criteria

1. Given users perform claim/send/close actions across supported breakpoints, when UI interaction patterns render, then policy guardrails, refusal messages, and confirmation copy are explicit and keyboard/screen-reader accessible.
2. Given thread views are rendered by state, when action controls appear, then action sets are consistent and explicit:
   - `UNCLAIMED`: `Call`, `Text`, `Claim`
   - `CLAIMED`: `Call`, `Text`, `Close`
   - `CLOSED`: `Call`, `Send Message`
3. Given outbound actions are initiated on `CLOSED`, when action executes, then the UX reflects same-thread reopen (`CLOSED -> UNCLAIMED`) with deterministic feedback and no hidden transition.
4. Given `prefers_texting=NO`, when outbound SMS is initiated, then override requirement and refusal/success outcome handling remain explicit and accessible.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: This story defines operator-safe action contracts; policy outcomes must be understandable without training and without hidden behavior.
- Real-User Validation Evidence: Local operator simulation validated canonical action rendering and outbound policy feedback contracts across desktop/tablet/mobile test configurations; CLOSED outbound reopen path and override-required refusal/success messaging were exercised in thread-detail flow.
- Real-User Validation Result: pass
- Role-Admin UI Path: Assign role memberships via `/app/tenant/settings/admins` and validate state-specific action visibility in ConnectShyft thread screens.
- Role-Admin UI Path Verified: yes
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Enforce state-action contract presentation in thread UI (AC: 2)
  - [x] Render only canonical action set for each state (`UNCLAIMED`, `CLAIMED`, `CLOSED`).
  - [x] Ensure no hidden controls or fallback links bypass state contract.
- [x] Implement explicit policy and refusal UX affordances (AC: 1, 4)
  - [x] Standardize refusal/success/error banner language for outbound policy actions.
  - [x] Preserve keyboard and screen-reader compatibility for policy prompts and action outcomes.
- [x] Implement deterministic closed-thread reopen UX behavior (AC: 3)
  - [x] Surface explicit reopen feedback on outbound action from `CLOSED`.
  - [x] Ensure lifecycle marker and action-state refresh are immediate and stable.
- [x] Integrate preference-override UX path with accessibility constraints (AC: 4)
  - [x] Ensure override-required state is clearly communicated before send.
  - [x] Ensure refusal messaging includes actionable next step copy.
- [x] Add UI and contract regression coverage (AC: 1, 2, 3, 4)
  - [x] E2E coverage for state-action matrix and reopen behavior.
  - [x] Accessibility checks for keyboard traversal, focus, and screen-reader labels.
  - [x] API/UI contract checks for envelope-to-feedback mapping consistency.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-016, FR-CS-022, FR-CS-023.
- NFR alignment: NFR-CS-011.
- Depends on:
  - `c-3-inbox-and-thread-detail-read-contracts`
  - `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`
  - `d-2-preference-override-enforcement-for-outbound-sms`
- Hardening notes require state-specific action controls and explicit policy feedback with no hidden paths.

### Architecture Compliance

- Preserve canonical lifecycle states and action contracts across UI and backend responses.
- Keep response envelope taxonomy deterministic and mapped to explicit UX handling.
- Ensure closed-thread reopen behavior is visible and consistent with lifecycle/audit semantics.

### Library / Framework Requirements

- Reuse ConnectShyft UI contract utilities in `frontend/src/features/connectshyft/uiContracts.ts`.
- Reuse thread read/action contracts in `frontend/src/features/connectshyft/readContracts.ts` and `frontend/src/features/connectshyft/threads.ts`.
- Reuse existing backend route contracts in `src/src/routes/api/v1/connectshyft.ts`; avoid frontend-only policy branching.

### File Structure Requirements

- Primary thread interaction UI: `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`.
- Inbox-state cues and action affordances: `frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue`.
- Shared UI policy/feedback contracts: `frontend/src/features/connectshyft/uiContracts.ts`.
- Backend contract alignment endpoints: `src/src/routes/api/v1/connectshyft.ts`.
- E2E and API tests: `tests/e2e/platform/` and `tests/api/platform/`.

### Testing Requirements

- Validate action matrix by state at all supported breakpoints.
- Validate closed-thread outbound action immediately reflects reopen and updated action set.
- Validate `prefers_texting=NO` override-required UX and refusal messaging path.
- Validate keyboard navigation, focus ring behavior, and aria labels for action surfaces and policy feedback.
- Validate deterministic envelope mapping to success/refusal/error UI states.

### Previous Story Intelligence

- `c.3` locked state-specific action sets and deterministic read contracts.
- `d.1` and `d.2` define outbound lifecycle and preference policy behavior this UI must faithfully expose.
- `ux-r1`, `ux-r2`, and `ux-r4` established mobile-first and accessibility-first patterns; keep consistency with those contracts.

### Git Intelligence Summary

- Existing ConnectShyft thread-detail implementation already includes feedback taxonomy and lifecycle toast patterns; extend those patterns instead of introducing parallel UI mechanisms.
- Recent story workflow commits emphasize explicit test evidence; include deterministic UI contract assertions and accessibility checks.

### Latest Technical Information

- Keep Twilio-driven outbound/inbound behavior surfaced via explicit operator messaging while preserving deterministic policy contracts.
- Prefer server-authoritative policy outcomes and accessible, immediate client feedback.
- References:
  - https://www.twilio.com/docs/usage/webhooks/webhooks-security
  - https://www.twilio.com/docs/messaging/guides/webhook-request
  - https://www.twilio.com/docs/voice/twiml

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep action-label, aria-label, and refusal-copy logic centralized through existing UI contracts.
- Avoid introducing additional non-canonical action states in UI while backend remains three-state canonical.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story d-4-operator-interaction-contracts-for-outbound-safety`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic d, Story d.4)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Flows 2-4, accessibility/interaction constraints, locked behavior addendum)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-016, FR-CS-022, FR-CS-023, envelope constraints)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (Sections 4.1.1, 4.1.2, 4.1.3)
- `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue` (state-driven actions, feedback and lifecycle UX)
- `src/src/routes/api/v1/connectshyft.ts` (thread action endpoints and lifecycle response contract)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n "UNCLAIMED|CLAIMED|CLOSED|Call|Text|Send Message" _bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (pass)
- `rg -n "threads/:threadId/(call|messages|claim|takeover|close)" src/src/routes/api/v1/connectshyft.ts` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story d-4-operator-interaction-contracts-for-outbound-safety` (pass)
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/readContracts.test.ts src/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts` (pass)
- `cd src && npm run build` (pass)
- `cd frontend && npm run build` (pass)

### Completion Notes List

- Enforced canonical thread-action rendering in thread-detail UI with safe action filtering and state-driven refresh behavior.
- Added explicit policy refusal/success affordances (`role=alert` / `role=status`) and keyboard/screen-reader friendly preference-override modal controls.
- Implemented deterministic CLOSED outbound reopen UX handling with explicit lifecycle toast and hidden-transition warning guard.
- Added override-required UX path with actionable next-step refusal copy, approved reason selection, and override audit chip on success.
- Extended backend outbound response contracts with explicit `uiFeedback` metadata while preserving existing envelope semantics.
- Added D-4 seed/synthetic lifecycle coverage and module-level regression tests for action matrix and preference override paths.

### File List

- _bmad-output/implementation-artifacts/d-4-operator-interaction-contracts-for-outbound-safety.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- frontend/src/features/connectshyft/uiContracts.ts
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- src/src/modules/connectshyft/__tests__/readContracts.test.ts
- src/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts
- src/src/modules/connectshyft/readContracts.ts
- src/src/modules/connectshyft/smsPreferenceOverrides.ts
- src/src/routes/api/v1/connectshyft.ts

## Change Log

- 2026-02-27: Created Story d.4 ready-for-dev context document.
- 2026-02-27: Implemented Story d.4 state-action UI contracts, preference-override accessibility flow, deterministic reopen feedback, and backend UI-feedback envelope mapping.
