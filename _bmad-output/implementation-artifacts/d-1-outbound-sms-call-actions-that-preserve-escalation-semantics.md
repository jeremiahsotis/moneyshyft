# Story d.1: Outbound SMS/Call Actions that Preserve Escalation Semantics

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit operator,
I want to send SMS or place calls from active threads without implicitly resetting escalation,
so that escalation behavior stays policy-compliant until explicit claim occurs.

## Acceptance Criteria

1. Given an authorized user sends outbound SMS or call actions, when the thread is `UNCLAIMED`, then outbound actions execute without changing escalation stage or reset state and operator feedback explicitly indicates escalation continues until claim.
2. Given an authorized user initiates outbound action from a `CLOSED` thread, when the action starts, then the same thread reopens immediately (`CLOSED -> UNCLAIMED`) on the same thread id, `thread_reopened_by_user` is emitted, and escalation/inactivity reset behavior is applied before outbound execution.
3. Given an outbound call action is initiated, when call orchestration starts, then the implementation uses bridge-call flow only (no WebRTC/SIP/softphone path), no automatic redial/retry loops occur, and successful `CONNECTED` events auto-claim unclaimed threads.
4. Given inbound voice/fallback events arrive for a `CLOSED` thread, when inbound routing executes, then inbound handling does not auto-reopen the thread and intake fallback behavior remains explicit and auditable.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Outbound and reopen behavior must remain deterministic so operators trust escalation timing and ownership cues.
- Real-User Validation Evidence: 2026-02-27 operator-path validation executed via Playwright API contract run (`tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts`) covering UNCLAIMED no-reset outbound, CLOSED->UNCLAIMED same-thread reopen with `thread_reopened_by_user`, bridge-call-only policy metadata, and inbound `voice.voicemail`/`voice.fallback` closed-thread no-auto-reopen behavior.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story enforces lifecycle/outbound semantics, not role-administration workflows.

## Tasks / Subtasks

- [x] Implement outbound lifecycle semantics for `UNCLAIMED` and `CLOSED` threads (AC: 1, 2)
  - [x] Preserve escalation stage for outbound attempts on `UNCLAIMED` threads.
  - [x] Reopen `CLOSED` threads on same thread id prior to outbound execution, emit `thread_reopened_by_user`, and apply required reset fields.
- [x] Implement bridge-call-only outbound call orchestration (AC: 3)
  - [x] Ensure call flow is bridge-only with deterministic state transitions.
  - [x] Enforce manual retry behavior with no automatic redial loops.
  - [x] Apply auto-claim only on `CONNECTED` for unclaimed threads.
- [x] Harden inbound/outbound boundary behavior (AC: 4)
  - [x] Ensure inbound voice/fallback paths never auto-reopen `CLOSED` threads.
  - [x] Preserve intake fallback timeline/audit signals for closed-thread inbound handling.
- [x] Align API response contracts and operator feedback (AC: 1, 2, 3, 4)
  - [x] Ensure response envelopes and lifecycle metadata reflect reopen and escalation behavior explicitly.
  - [x] Keep operator feedback language aligned with claim-only reset semantics.
- [x] Add coverage for lifecycle + outbound + inbound edge cases (AC: 1, 2, 3, 4)
  - [x] Integration tests for `UNCLAIMED` outbound no-reset behavior.
  - [x] Integration tests for `CLOSED -> UNCLAIMED` reopen-on-outbound behavior.
  - [x] Call-flow tests for bridge-only path, manual retry only, and `CONNECTED` auto-claim.
  - [x] Regression tests proving inbound voice/fallback does not auto-reopen closed threads.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-016.
- Locked behavior alignment from planning artifacts:
  - Outbound on `UNCLAIMED` does not reset escalation.
  - Outbound from `CLOSED` reopens same thread and emits `thread_reopened_by_user`.
  - Bridge-call-only outbound with no auto-retry/redial.
  - `CONNECTED` auto-claims unclaimed thread.
- Depends on `c-3-inbox-and-thread-detail-read-contracts`.

### Architecture Compliance

- Keep canonical thread states strictly `UNCLAIMED | CLAIMED | CLOSED`.
- Preserve claim-only escalation reset semantics for non-reopen outbound paths.
- Record critical lifecycle transitions through audit/outbox channels with deterministic metadata.
- Avoid introducing non-canonical lifecycle side channels or in-memory authority for escalation outcomes.

### Library / Framework Requirements

- Reuse existing Express route surface in `src/src/routes/api/v1/connectshyft.ts`.
- Reuse ConnectShyft thread domain service/policy helpers in `src/src/modules/connectshyft/threads.ts`.
- Keep response envelope semantics (`success/refusal/error`) consistent with existing platform helpers.

### File Structure Requirements

- Backend route/action orchestration: `src/src/routes/api/v1/connectshyft.ts`.
- Thread/lifecycle policy enforcement: `src/src/modules/connectshyft/threads.ts`.
- Optional call-orchestration module under `src/src/modules/connectshyft/` if extraction is required.
- Frontend operator feedback alignment: `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`.
- Tests in `src/src/modules/connectshyft/__tests__/` and API-level suites under `tests/api/platform/`.

### Testing Requirements

- Validate outbound-on-unclaimed does not reset escalation stage/count.
- Validate closed-thread outbound reopens same thread id and sets lifecycle event to `thread_reopened_by_user`.
- Validate bridge call path rejects non-bridge transports and no auto-retry loops occur.
- Validate `CONNECTED` auto-claim behavior only triggers from allowed call path.
- Validate inbound voice/fallback on closed threads does not auto-reopen.

### Previous Story Intelligence

- `c-3` and `c-4` established state-specific action sets and closed-thread reopen constraints; preserve those contracts.
- `c-5` locked deterministic escalation behavior and claim-only reset semantics that this story must not violate.
- UX remediation locked behavior requires explicit operator messaging for reopen and escalation continuation.

### Git Intelligence Summary

- Recent merges and follow-up commits on story `b-4` reinforced strict contract/test discipline; mirror that pattern with explicit debug references and deterministic assertions.
- Current code already includes lifecycle reopen scaffolding in route handlers; complete and harden behavior instead of introducing parallel patterns.

### Latest Technical Information

- Use provider-adapter signature validation and replay-safe event processing as locked in the updated ConnectShyft planning artifacts.
- Bridge-call implementation should track callback lifecycle (`initiated`, `ringing`, `answered/completed`) and keep retry decisions operator-driven.
- References:
  - `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
  - `/Users/jeremiahotis/projects/connectshyft/openapi.yaml`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Preserve existing endpoint compatibility where frontend currently uses `/threads/:threadId/messages`.
- Keep lifecycle state writes and event side effects in mutation-safe, auditable paths.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic d, Story d.1)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-016 and locked lifecycle additions)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-02, AD-05, AD-09, Sections 5-7)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Flow 2, locked closed-thread reopen behavior, bridge call UX)
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md` (Section 4.1 Stories / 4.3 Architecture)
- `src/src/routes/api/v1/connectshyft.ts` (outbound + lifecycle route contracts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n "^### Story d\\.[1-4]:" _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (pass)
- `rg -n "^  d-|^  epic-d" _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story d-1-outbound-sms-call-actions-that-preserve-escalation-semantics` (pass)
- `npm run test:e2e -- tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts` (pass; 4 passed)
- `npm run test:e2e -- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts` (pass; 18 passed)
- `cd src && npm run build` (pass)
- `cd frontend && npm run build` (pass)
- `cd src && npm test` (fails in unrelated suites: `src/modules/route/application/__tests__/intakeService.test.ts`, `src/routes/api/v1/__tests__/auth.refresh.test.ts`)

### Completion Notes List

- Created implementation-ready Story d.1 context with locked outbound/reopen semantics, bridge-call constraints, and escalation guardrails.
- Implemented outbound response contract enhancements in `src/src/routes/api/v1/connectshyft.ts`: explicit operator feedback, lifecycle metadata, bridge-call-only policy metadata, and CONNECTED auto-claim policy metadata for outbound calls.
- Preserved CLOSED outbound reopen semantics on same thread id with `thread_reopened_by_user` and deterministic escalation reset metadata in response envelope.
- Updated thread-detail UX action feedback path in `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue` to prioritize API-supplied `operatorFeedback` language.
- Activated and completed d.1 API contract coverage in `tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts` (all 4 tests passing).
- Full backend Jest run currently reports unrelated failures outside ConnectShyft d.1 scope; story-targeted API suites and compile/build checks pass.

### File List

- _bmad-output/implementation-artifacts/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.md
- src/src/routes/api/v1/connectshyft.ts
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts
- tests/support/factories/connectShyftStoryDFactory.ts
- tests/support/fixtures/connectShyftStoryD.fixture.ts
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml

## Change Log

- 2026-02-27: Created Story d.1 ready-for-dev context document.
- 2026-02-27: Implemented d.1 outbound lifecycle/call policy contract updates; activated and passed d.1 automate API coverage; updated story status to review.
