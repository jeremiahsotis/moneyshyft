# Story ux-r3: Voicemail and Indicator Behavior

Status: ready-for-dev

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
- Real-User Validation Evidence: Pending implementation. Validate claimed/unclaimed voicemail behavior and closed-thread inbound voice fallback with operator scenarios.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story is lifecycle/UX behavior hardening, not role-administration.

## Tasks / Subtasks

- [ ] Implement claimed/unclaimed voicemail list behavior (AC: 1, 2)
  - [ ] Preserve Mine placement for claimed-thread voicemail events.
  - [ ] Preserve Inbox placement and labeling for unclaimed-thread voicemail events.
- [ ] Implement voicemail lifecycle invariants (AC: 3)
  - [ ] Ensure voicemail-only events do not reset escalation or inactivity counters.
  - [ ] Keep evaluation timestamps and stage progression semantics intact.
- [ ] Implement closed-thread inbound voice fallback behavior (AC: 4)
  - [ ] Ensure inbound voice on `CLOSED` does not reopen the thread.
  - [ ] Route voice events to fallback/intake as specified by locked behavior.
- [ ] Add regression and contract coverage (AC: 1, 2, 3, 4)
  - [ ] API tests for voicemail placement, labels, and timer non-reset semantics.
  - [ ] E2E tests for Mine/Inbox indicator behavior and closed-thread inbound flow.

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

### Completion Notes List

- Created implementation-ready Story ux-r3 context document with voicemail-state behavior matrix, indicator rules, and lifecycle invariants.

### File List

- _bmad-output/implementation-artifacts/ux-r3-voicemail-and-indicator-behavior.md

## Change Log

- 2026-02-25: Created Story ux-r3 ready-for-dev context document.
