# Story g.3: Thread Detail Conversation-First Rebuild

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a volunteer handling a case conversation,
I want thread detail to center on messaging actions and timeline context,
so that I can respond quickly without navigating record-style chrome.

## Acceptance Criteria

1. Given thread detail is open, when header and body render, then neighbor, conference, and claim context are primary and immediately visible.
2. Given voicemail artifacts exist, when timeline renders, then voicemail appears as first-class inline conversation content.
3. Given action controls are shown, when thread state is evaluated, then action sets are explicit and locked by state:
   - `UNCLAIMED`: `Call`, `Text`, `Claim`
   - `CLAIMED`: `Call`, `Text`, `Close`
   - `CLOSED`: `Call`, `Send Message`
4. Given policy/refusal conditions occur, when an action is attempted, then contextual feedback appears at action time without persistent operations-heavy chrome dominating default layout.
5. Given outbound action is initiated from `CLOSED`, when volunteer taps `Call` or `Send Message`, then thread reopens immediately (`CLOSED -> UNCLAIMED`) on same thread id with deterministic lifecycle messaging and no inbound auto-reopen side effects.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Thread detail is the highest-frequency volunteer action surface and must preserve locked lifecycle semantics while reducing cognitive overhead.
- Real-User Validation Evidence: N/A - ready-for-dev planning artifact.
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story is workflow action UX and lifecycle feedback hardening, not role-admin provisioning.

## Tasks / Subtasks

- [ ] Rebuild thread header/body hierarchy to conversation-first layout (AC: 1, 2)
  - [ ] Prioritize neighbor/conference/claim context above technical metadata.
  - [ ] Render voicemail artifacts inline in timeline as first-class conversation events.
- [ ] Enforce locked state-action matrix in UI contracts (AC: 3)
  - [ ] Ensure visible actions are resolved strictly from canonical state.
  - [ ] Keep takeover/close/refusal interactions deterministic and accessible.
- [ ] Refactor policy/refusal feedback to contextual action-bound patterns (AC: 4)
  - [ ] Show blocking messages only when action requires intervention.
  - [ ] Remove persistent technical banners/chips from default thread chrome.
- [ ] Preserve and surface closed-thread reopen semantics (AC: 5)
  - [ ] Keep same-thread reopen behavior and lifecycle toast patterns explicit.
  - [ ] Ensure inbound events do not reopen closed threads and messaging reflects that distinction.

## Dev Notes

### Technical Requirements

- Tracking ID: CS-S7.3.
- FR alignment: FR-CS-013, FR-CS-016, FR-CS-024.
- Depends on `g-1-design-tokens-and-shared-conversation-primitives`.

### Architecture Compliance

- Preserve canonical thread state contract and lifecycle transitions from backend route handlers.
- Keep claim-only escalation reset semantics and closed-thread outbound reopen behavior consistent with locked policy rules.
- Maintain shared envelope taxonomy (`success`, `refusal`, `error`) in thread-level feedback mapping.

### Library / Framework Requirements

- Reuse `resolveSafeVisibleThreadActions` and feedback taxonomy in `uiContracts.ts`.
- Keep API orchestration in current feature modules (`readContracts.ts`, action handlers in thread view).
- Avoid bypassing existing route endpoints under `/api/v1/connectshyft/threads/:threadId/*`.

### File Structure Requirements

- Primary files:
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
  - `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`
  - `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`
  - `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` (only if response-shaping feedback keys require extension)
- Add timeline/header/action primitives under `apps/moneyshyft-web/src/components/connectshyft/` as needed.

### Testing Requirements

- Add/extend UI and API regression coverage for state-action matrix and closed-thread reopen behavior.
- Verify contextual feedback consistency for success/refusal/error across mobile/tablet/desktop thread detail.
- Validate voicemail inline timeline rendering and Mine ownership behavior consistency.

### Previous Story Intelligence

- `d-4` and `ux-r4` already hardened outbound safety feedback, but user testing still flagged operations-heavy thread chrome and context overload.
- Current thread view renders raw thread-id/state chips and technical metadata as high-salience UI, which this story replaces.

### Git Intelligence Summary

- Existing action executor already contains deterministic lifecycle/refusal handling paths; story scope should prefer presentation-layer restructuring and contract-safe copy.
- Preserve current policy modal behavior for preference override and close confirmation while improving hierarchy and signal clarity.

### Latest Technical Information

- Use current workspace frontend/back-end stack and existing ConnectShyft route contracts; no external dependency upgrade is required for this story.

### Project Context Reference

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic g / Story g.3)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Treat lifecycle policy and contract behavior as immutable; UI rebuild must consume those contracts, not reinterpret them.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-3-thread-detail-conversation-first-rebuild`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cat _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `cat _bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `cat apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- `cat apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`
- `cat apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

### Completion Notes List

- Created Story g.3 ready-for-dev context with conversation-first thread-detail requirements, locked lifecycle action matrix, and contextual feedback guardrails.

### File List

- _bmad-output/implementation-artifacts/g-3-thread-detail-conversation-first-rebuild.md

## Change Log

- 2026-03-06: Created Story g.3 ready-for-dev context document.
