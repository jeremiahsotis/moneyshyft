# Story ux-r3: Voicemail and Indicator Behavior

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a claimed thread owner,
I want voicemail events to be reflected clearly without losing my thread context,
so that I can follow up without inbox churn.

## Acceptance Criteria

1. Given voicemail is received on a `CLAIMED` thread, when Mine and Inbox lists refresh, then the thread remains in Mine and shows voicemail indicators without reclassification into Inbox.
2. Given voicemail is received on an `UNCLAIMED` thread, when lists refresh, then the thread remains in Inbox with voicemail-received labeling per UX contract.
3. Given voicemail or missed inbound call events are processed, when lifecycle/evaluation fields are considered, then escalation and inactivity timers are not reset by voicemail-only events.
4. Given inbound voice/webhook events arrive for a `CLOSED` thread, when routing executes, then the thread does not auto-reopen and voice intake follows locked fallback behavior.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Voicemail cues must reduce confusion, never hide ownership context, and never silently change lifecycle state.
- Real-User Validation Evidence: 2026-03-03 operator-scenario validation executed via Playwright API/E2E suites (`tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts`, `tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts`) covering claimed/unclaimed voicemail ingestion + list retention, explicit voicemail label contract, timer non-reset invariants, and closed-thread inbound fallback routing.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story is lifecycle/UX behavior hardening, not role-administration.

## Tasks / Subtasks

- [x] Implement claimed/unclaimed voicemail list behavior (AC: 1, 2)
  - [x] Preserve Mine placement for claimed-thread voicemail events.
  - [x] Preserve Inbox placement and labeling for unclaimed-thread voicemail events.
- [x] Implement voicemail lifecycle invariants (AC: 3)
  - [x] Ensure voicemail-only events do not reset escalation or inactivity counters.
  - [x] Keep evaluation timestamps and stage progression semantics intact.
- [x] Implement closed-thread inbound voice fallback behavior (AC: 4)
  - [x] Ensure inbound voice on `CLOSED` does not reopen the thread.
  - [x] Route voice events to fallback/intake as specified by locked behavior.
- [x] Add regression and contract coverage (AC: 1, 2, 3, 4)
  - [x] API tests for voicemail placement, labels, and timer non-reset semantics.
  - [x] E2E tests for Mine/Inbox indicator behavior and closed-thread inbound flow.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-005, FR-CS-019, FR-CS-020.
- NFR alignment: NFR-CS-011.
- Story dependencies:
  - `c-3-inbox-and-thread-detail-read-contracts`
  - `e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline`
  - `e-4-transcription-webhook-attachment-to-voicemail-records`
- Preserve deterministic list/read contract semantics from `c.3` while integrating webhook outputs.

### Architecture Compliance

- Respect locked state invariants: voicemail does not trigger state migration or timer reset.
- Preserve one-active-thread and deterministic ordering behavior while enriching voicemail indicators.
- Ensure inbound voice handling for `CLOSED` aligns with fallback routing policy.

### Library / Framework Requirements

- Reuse ConnectShyft thread/read-contract modules in `src/src/modules/connectshyft/`.
- Reuse webhook contract handling from inbound stories (`e.3`, `e.4`) once merged.
- Reuse frontend ConnectShyft read client and indicator rendering patterns.

### File Structure Requirements

- Backend route and webhook contract integration in `src/src/routes/api/v1/connectshyft.ts`.
- Lifecycle/read updates in `src/src/modules/connectshyft/`.
- Frontend indicator rendering in `frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue`.
- API and E2E coverage in `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Matrix tests for voicemail behavior by thread state (`UNCLAIMED`, `CLAIMED`, `CLOSED`).
- Assertions that voicemail events do not reset escalation/inactivity fields.
- Assertions that closed-thread inbound voice does not reopen thread state.
- E2E validation of indicator placement and list retention behavior after webhook ingestion.

### Previous Story Intelligence

- `c.3` already locked Mine vs Inbox voicemail display semantics; this story expands and hardens them with inbound pipeline behavior.
- `e.3` and `e.4` provide voicemail/transcription artifact continuity and must be dependency-complete before merge.

### Git Intelligence Summary

- Existing hardening artifacts emphasize deterministic and auditable lifecycle outcomes; avoid implicit list reshuffling or hidden state changes.

### Latest Technical Information

- Use production-locked specification and approved sprint remediation update as authoritative behavior source.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep voicemail indicator semantics consistent between backend read contracts and UI rendering.
- Avoid introducing heuristics that move threads between Mine and Inbox outside locked rules.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story ux-r3-voicemail-and-indicator-behavior`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic UX, Story ux-r3)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (sections 4.1.3, 4.2)
- `_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-implementation-locked-production-specification.normalized.md` (sections 0, 5, 9)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git branch --show-current` (pass)
- `rg -n "^Status: ready-for-dev$" _bmad-output/implementation-artifacts/ux-r3-voicemail-and-indicator-behavior.md` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story ux-r3-voicemail-and-indicator-behavior` (pass)
- `npm test -- src/modules/connectshyft/__tests__/readContracts.test.ts src/modules/connectshyft/__tests__/inboundVoice.test.ts` (pass)
- `npm run test:e2e -- tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts` (pass)
- `npm run test:e2e -- tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts` (pass)
- `npm run test:e2e -- tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts` (pass)
- `npm run build` in `frontend/` (pass)
- `npm run build` in `src/` (pass)

### Completion Notes List

- Created implementation-ready Story ux-r3 context document with voicemail-state behavior matrix, indicator rules, and lifecycle invariants.
- Added `ux-r3` read-contract seed scope with deterministic claimed/unclaimed voicemail threads and a closed-thread fallback case.
- Added explicit voicemail labeling (`Voicemail`, `Voicemail received`) to backend and frontend read contracts, plus Inbox UI rendering.
- Updated synthetic thread-detail typing in the ConnectShyft API route to include the new voicemail label contract field.
- Activated and modernized ux-r3 API and E2E ATDD suites to assert claimed/mine retention, unclaimed/inbox labeling, timer non-reset semantics, and closed-thread fallback routing.
- Tightened ux-r3 regression quality by requiring webhook-driven voicemail ingestion in AC1/AC2 API tests, exact E2E voicemail label text assertions, and pre-ingestion timer baseline checks for voicemail + missed-call invariants.

### File List

- _bmad-output/implementation-artifacts/ux-r3-voicemail-and-indicator-behavior.md
- src/src/modules/connectshyft/readContracts.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/modules/connectshyft/__tests__/readContracts.test.ts
- frontend/src/features/connectshyft/readContracts.ts
- frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue
- tests/support/factories/connectShyftStoryUxR3Factory.ts
- tests/api/platform/ux-r3-voicemail-and-indicator-behavior.atdd.api.spec.ts
- tests/e2e/platform/ux-r3-voicemail-and-indicator-behavior.atdd.spec.ts
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml

## Change Log

- 2026-02-25: Created Story ux-r3 ready-for-dev context document.
- 2026-03-03: Implemented voicemail bucket/label hardening, closed-thread fallback invariants, and activated ux-r3 API/E2E regression coverage.
- 2026-03-03: Resolved AI code-review findings by hardening webhook-ingestion test setup, strengthening E2E label assertions, adding pre-ingestion timer baseline checks, and recording operator-scenario validation evidence.
