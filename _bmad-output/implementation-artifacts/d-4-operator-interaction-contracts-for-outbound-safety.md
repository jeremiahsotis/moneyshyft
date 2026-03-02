# Story d.4: Operator Interaction Contracts for Outbound Safety

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontline operator,
I want outbound policy controls to be visible and accessible in desktop, tablet, and mobile thread workflows,
so that I can complete actions quickly without violating governance rules.

## Acceptance Criteria

1. Given users perform claim/send/close actions across supported breakpoints, when UI interaction patterns render, then policy guardrails, refusal messages, and confirmation copy are explicit and keyboard/screen-reader accessible.
2. Given thread views are rendered by state, when action controls appear, then action sets are consistent and explicit:
   - `UNCLAIMED`: `Call`, `Text`, `Claim`
   - `CLAIMED` (member baseline): `Call`, `Text`, `Close`
   - `CLAIMED` (tenant-privileged roles): `Call`, `Take Over`, `Text`, `Close`
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

- `git branch --show-current && git status --short` (pass)
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/readContracts.test.ts src/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts` (pass)
- `set -a && source src/.env && set +a && HOST=127.0.0.1 NODE_ENV=test ENABLE_TEST_CONNECTSHYFT_FLAGS=true npm run dev` (pass; local API test-mode server)
- `VITE_ENABLE_TEST_CONNECTSHYFT_FLAGS=true VITE_API_PROXY_TARGET=http://127.0.0.1:3000 npm run dev -- --host 127.0.0.1 --port 5174` (pass; local frontend with ConnectShyft test overrides enabled)
- `npx playwright test tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts` (pass; 6/6)
- `BASE_URL=http://127.0.0.1:5174 API_BASE_URL=http://127.0.0.1:3000/api/v1 npx playwright test tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts` (pass; 6/6)

### Completion Notes List

- Fixed CLOSED outbound behavior to reopen immediately before override validation/provider dispatch and return reopen lifecycle metadata on refusal paths when reopen already applied.
- Added D-4 synthetic/read-contract/override coverage for `thread-d4-closed-prefers-no-1005`.
- Added tenant-privileged `Take Over` coverage and closed `prefers_texting=NO` reopen refusal coverage in D-4 API/E2E suites and supporting fixtures/factories.
- Added dialog accessibility semantics and keyboard focus containment for override/close modals in thread detail.
- Added module-level regressions for D-4 closed-prefers-no action contracts and `prefersTexting` override resolution.
- Updated thread-detail refusal handling to apply lifecycle reopen metadata for business refusals, so CLOSED + `prefers_texting=NO` transitions immediately to `UNCLAIMED` with explicit reopen feedback.

### File List

- _bmad-output/implementation-artifacts/d-4-operator-interaction-contracts-for-outbound-safety.md
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts
- tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts
- tests/support/factories/connectShyftStoryD4Factory.ts
- tests/support/fixtures/connectShyftStoryD4.fixture.ts
- src/src/modules/connectshyft/__tests__/readContracts.test.ts
- src/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts
- src/src/modules/connectshyft/readContracts.ts
- src/src/modules/connectshyft/smsPreferenceOverrides.ts
- src/src/routes/api/v1/connectshyft.ts

## Change Log

- 2026-02-27: Created Story d.4 ready-for-dev context document.
- 2026-02-27: Implemented Story d.4 state-action UI contracts, preference-override accessibility flow, deterministic reopen feedback, and backend UI-feedback envelope mapping.
- 2026-02-27: Hardened D-4 API/E2E contracts (unskipped tests, updated refusal/assertion mappings, corrected override option values) and synced story traceability metadata.
- 2026-03-02: Resolved five review findings spanning CLOSED reopen sequencing, D-4 closed-prefers-no synthetic coverage, tenant-privileged `Take Over` assertions, modal accessibility/focus containment, and module-level regression expansion.
- 2026-03-02: Reconciled story debug evidence and file traceability with current branch state.
- 2026-03-02: Re-ran D-4 API/E2E Playwright suites against local test-mode API and frontend test harness; patched refusal-path UI lifecycle application for CLOSED + `prefers_texting=NO` so E2E contracts pass.
