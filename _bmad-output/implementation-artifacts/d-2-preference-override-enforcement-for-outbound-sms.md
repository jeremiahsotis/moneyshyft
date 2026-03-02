# Story d.2: Preference Override Enforcement for Outbound SMS

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want outbound SMS to require override reasoning when `prefers_texting=NO`,
so that policy exceptions are explicit, justified, and traceable.

## Acceptance Criteria

1. Given a thread where neighbor `prefers_texting=NO`, when the user attempts to send outbound SMS, then send is blocked until a required override reason is provided and approved sends persist override data with audit metadata.
2. Given an override reason is missing or invalid, when outbound SMS is submitted, then the action is refused with explicit refusal messaging and no partial send, audit, or state-transition side effects are persisted.
3. Given outbound SMS is initiated from `CLOSED`, when reopen-on-outbound executes, then the same thread reopens before send and preference override checks still execute prior to message dispatch.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Preference controls must remain visible and enforced in workflow context so operators do not unknowingly violate communication preferences.
- Real-User Validation Evidence: 2026-03-02 operator-journey validation executed via Playwright ATDD using desktop/tablet/mobile breakpoints and outbound policy override flows (`npm run test:e2e -- tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts`); refusal/success accessibility feedback and closed-thread reopen transition all passed.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story enforces outbound policy gating, not role-administration workflows.

## Tasks / Subtasks

- [x] Add outbound SMS preference policy evaluation (AC: 1, 2)
  - [x] Resolve canonical `prefers_texting` value (`UNKNOWN | YES | NO`) for target neighbor/thread context.
  - [x] Block outbound SMS for `NO` unless valid override reason is supplied.
- [x] Persist override and audit metadata on approved sends (AC: 1)
  - [x] Store structured override reason and optional note in durable preference-override records.
  - [x] Emit auditable metadata linking actor, thread, reason, and message event.
- [x] Enforce no-side-effect refusal semantics (AC: 2)
  - [x] Return refusal envelopes for missing/invalid override data.
  - [x] Guarantee refusal path does not persist outbound message, audit entry, or lifecycle mutation.
- [x] Integrate with closed-thread outbound reopen path (AC: 3)
  - [x] Ensure reopen-on-outbound happens before message send attempt.
  - [x] Ensure override checks still execute after reopen and before dispatch.
- [x] Add test coverage for override and refusal paths (AC: 1, 2, 3)
  - [x] Contract tests for refusal messaging and no partial writes.
  - [x] Positive-path tests for persisted override + audit linkage.
  - [x] Reopen + override interaction tests for `CLOSED` outbound SMS.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Replaced synthetic `neighbor-${threadId}` fallback with canonical resolver trigger (`neighborId: null` for non-synthetic contexts) so FR-CS-023 enforcement applies to DB-backed threads. [src/src/routes/api/v1/connectshyft.ts:3838]
- [x] [AI-Review][MEDIUM] Added API coverage for UUID-backed thread/neighbor preference paths validating refusal and success behavior through real `cs_threads -> cs_neighbors` lookup. [tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts:153]
- [x] [AI-Review][MEDIUM] Added persistence-level override reason canonical-value constraint and upgrade-safe migration coverage. [src/src/migrations/20260227123000_create_connectshyft_sms_preference_overrides.ts:36]

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-022, FR-CS-023.
- Depends on `c-3-inbox-and-thread-detail-read-contracts`.
- Locked hardening requirements:
  - Override reason required when `prefers_texting=NO`.
  - Missing override must refuse with no side effects.
  - Outbound-from-closed reopen behavior still applies before outbound handling.

### Architecture Compliance

- Keep canonical response envelopes for refusal outcomes (`success/refusal/error` taxonomy).
- Ensure audit/outbox semantics remain deterministic and scoped to successful policy-compliant sends.
- Preserve canonical lifecycle transitions (`CLOSED -> UNCLAIMED`) when outbound is initiated from closed state.

### Library / Framework Requirements

- Reuse existing ConnectShyft route and envelope helpers in `src/src/routes/api/v1/connectshyft.ts`.
- Reuse platform mutation wrapper for atomic persistence and refusal-safe rollback behavior.
- Keep frontend action feedback integrated with existing thread detail feedback contract utilities.

### File Structure Requirements

- Outbound policy enforcement entry point: `src/src/routes/api/v1/connectshyft.ts`.
- Preference and override domain/persistence logic under `src/src/modules/connectshyft/`.
- Frontend override UX in `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue` and related `frontend/src/features/connectshyft/` contracts.
- Tests in `src/src/modules/connectshyft/__tests__/` plus API/e2e suites under `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Validate `prefers_texting=NO` blocks send without override.
- Validate valid override enables send and records override + audit metadata.
- Validate invalid/missing override returns refusal envelope and no partial write side effects.
- Validate `CLOSED` outbound SMS reopens same thread and still enforces override before dispatch.
- Validate accessibility-safe operator feedback for override requirements and refusal reasons.

### Previous Story Intelligence

- `d.1` establishes outbound/reopen lifecycle contract and must remain source-of-truth for closed-thread outbound semantics.
- `c.3` defines explicit action contracts and state-driven UI behavior that override UX must fit into.
- UX remediation lock requires plain-language policy messaging with deterministic refusal behavior.

### Git Intelligence Summary

- Current branch history reflects strict status/test hygiene for story artifacts; carry same discipline for policy-side-effect checks.
- Existing thread detail view already exposes refusal banner taxonomy; extend rather than creating divergent UX channels.

### Latest Technical Information

- Continue webhook/event security posture aligned to Twilio signature validation and replay-safe event semantics.
- Ensure SMS action policy logic keeps provider handoff deterministic and auditable.
- References:
  - https://www.twilio.com/docs/usage/webhooks/webhooks-security
  - https://www.twilio.com/docs/messaging/guides/webhook-request
  - https://www.twilio.com/docs/events/event-delivery-and-duplication

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep policy checks server-authoritative; do not rely on frontend-only gating for `prefers_texting=NO`.
- Ensure refusal envelopes stay deterministic and consumable by current thread-detail feedback parser.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story d-2-preference-override-enforcement-for-outbound-sms`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic d, Story d.2)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-022, FR-CS-023, envelope and locked lifecycle additions)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-02, AD-05, Section 4.5 and API contract rules)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Flow 3, policy guardrails, locked closed-thread outbound behavior)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (Sections 4.1.2 and 4.2)
- `src/src/routes/api/v1/connectshyft.ts` (outbound message route contract)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n "FR-CS-022|FR-CS-023" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (pass)
- `rg -n "prefers_texting|override" _bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story d-2-preference-override-enforcement-for-outbound-sms` (pass)
- `npm run test:e2e -- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts` (pass)
- `npm run test:e2e -- tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts` (pass)
- `cd src && npm test -- src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts` (pass)
- `cd src && npm run build` (pass)
- `npm run policy:check` (pass)
- `cd src && npm test -- --runInBand` (pass)
- `npm run test:e2e -- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts` (pass)
- `npm run test:e2e -- tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts` (pass)
- `npm run test:e2e -- tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts` (pass)

### Completion Notes List

- Implemented server-authoritative SMS preference enforcement for outbound message actions with canonical `prefers_texting` resolution (`UNKNOWN | YES | NO`).
- Added required/invalid override refusal envelopes for `prefers_texting=NO` with explicit no-side-effect indicators (`messageDispatched=false`, `lifecycleMutationApplied=false`, `auditPersisted=false`).
- Added approved override persistence path with structured override reason/note plus audit-linked metadata payloads.
- Preserved closed-thread reopen behavior for approved outbound SMS and ensured override policy enforcement runs before dispatch.
- Added migration for durable override records and neighbor `prefers_texting` canonical values.
- Added automated API and module-level tests covering refusal, success, and CLOSED reopen + override interaction paths.
- Fixed DB-backed outbound preference enforcement to resolve neighbor preference from canonical thread data for non-synthetic thread contexts.
- Added upgrade-safe override-reason CHECK constraint enforcement for `connectshyft.cs_sms_preference_overrides`.
- Added DB-backed UUID thread/neighbor API regression coverage to prevent preference-override enforcement bypass regressions.
- Revalidated story quality gates on 2026-03-02 (policy check, full backend Jest run, d.2+d.1 API suites, backend TypeScript build).
- Completed Critical Capability operability closeout with passing desktop/tablet/mobile operator-journey coverage and accessibility assertions.

### File List

- _bmad-output/implementation-artifacts/d-2-preference-override-enforcement-for-outbound-sms.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/routes/api/v1/connectshyft.ts
- src/src/migrations/20260227123000_create_connectshyft_sms_preference_overrides.ts
- src/src/migrations/20260227150000_add_connectshyft_sms_override_reason_constraint.ts
- src/src/modules/connectshyft/smsPreferenceOverrides.ts
- src/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts
- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts
- tests/support/factories/connectShyftStoryDFactory.ts

## Senior Developer Review (AI)

- 2026-02-27: Completed adversarial code review. Outcome: **Changes Requested** (1 HIGH, 2 MEDIUM).
- Key findings:
  - HIGH: SMS preference enforcement can be bypassed for non-synthetic thread detail contexts because outbound policy resolution passes `neighbor-${threadId}` instead of allowing canonical DB neighbor lookup.
  - MEDIUM: Story d.2 API tests only target seeded synthetic thread IDs and do not cover UUID-backed production lookup paths.
  - MEDIUM: Override reason canonical values are enforced in service logic but not at DB constraint level.
- Guardrail blocker: `Critical Capability: yes` with `Real-User Validation Evidence` still pending and `Real-User Validation Result: pending`; closure remains blocked.
- Verification rerun during review:
  - `cd src && npm test -- src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts` (pass)
  - `npm run test:e2e -- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts` (pass)
- 2026-02-27: Implemented all review-requested fixes (1 HIGH, 2 MEDIUM) and resolved story/git discrepancy tracking.
- Verification after fixes:
  - `cd src && npm test -- src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts` (pass)
  - `cd src && npm run build` (pass)
  - `npm run test:e2e -- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts` (pass)

## Change Log

- 2026-02-27: Created Story d.2 ready-for-dev context document.
- 2026-02-27: Implemented outbound SMS `prefers_texting=NO` override enforcement, durable override metadata persistence, refusal no-side-effect semantics, and d.2 API/module automated tests.
- 2026-02-27: Senior Developer Review (AI) completed; status moved to in-progress with review follow-up tasks added.
- 2026-02-27: Resolved all AI review findings, added DB-backed regression coverage, and synced story file list with git changes.
- 2026-03-02: Re-ran regression + operability evidence suite, closed Critical Capability guardrail evidence, and moved story to review.
