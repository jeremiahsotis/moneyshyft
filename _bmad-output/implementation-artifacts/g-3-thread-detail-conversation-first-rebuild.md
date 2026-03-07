# Story g.3: Thread Detail Conversation-First Rebuild

Status: done

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
- Operability Pairing Notes: Thread detail now surfaces neighbor/conference/claim context first, renders voicemail inline in a conversation timeline, and keeps lifecycle/policy feedback contextual at action time with explicit locked action sets by state.
- Real-User Validation Evidence: 2026-03-06 Playwright validations passed for volunteer journey (`npm run test:e2e -- tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts`) and API behavior contract (`npm run test:e2e -- tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts`).
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story is workflow action UX and lifecycle feedback hardening, not role-admin provisioning.

## Tasks / Subtasks

- [x] Rebuild thread header/body hierarchy to conversation-first layout (AC: 1, 2)
  - [x] Prioritize neighbor/conference/claim context above technical metadata.
  - [x] Render voicemail artifacts inline in timeline as first-class conversation events.
- [x] Enforce locked state-action matrix in UI contracts (AC: 3)
  - [x] Ensure visible actions are resolved strictly from canonical state.
  - [x] Keep takeover/close/refusal interactions deterministic and accessible.
- [x] Refactor policy/refusal feedback to contextual action-bound patterns (AC: 4)
  - [x] Show blocking messages only when action requires intervention.
  - [x] Remove persistent technical banners/chips from default thread chrome.
- [x] Preserve and surface closed-thread reopen semantics (AC: 5)
  - [x] Keep same-thread reopen behavior and lifecycle toast patterns explicit.
  - [x] Ensure inbound events do not reopen closed threads and messaging reflects that distinction.

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
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Treat lifecycle policy and contract behavior as immutable; UI rebuild must consume those contracts, not reinterpret them.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-3-thread-detail-conversation-first-rebuild`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story g-3-thread-detail-conversation-first-rebuild`
- `npm run story:status:set -- --story-file _bmad-output/implementation-artifacts/g-3-thread-detail-conversation-first-rebuild.md --status in-progress --lane connectshyft`
- `npm run test:e2e -- tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts`
- `npm run test:e2e -- tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts`
- `npm test -- --runInBand src/modules/connectshyft/__tests__/readContracts.test.ts` (apps/moneyshyft-api)
- `npm run build` (apps/moneyshyft-api)
- `npm run build` (apps/moneyshyft-web)
- `npm run policy:check`

### Completion Notes List

- Rebuilt thread detail hierarchy to a conversation-first surface with explicit primary context panel (`neighbor`, `conference`, `claim`) and inline timeline events for voicemail-first rendering.
- Extended backend and frontend read contracts to include `display.claimContext` plus normalized timeline fields (`conversationType`, `renderMode`, `firstClass`) for deterministic voicemail presentation.
- Added/reused locked action matrix signaling in thread detail responses (`actionMatrix.lockedByState`) and kept action button visibility constrained to canonical lifecycle state.
- Refactored policy/refusal/success feedback to contextual action-bound contracts via `uiFeedback.presentation="contextual-action-feedback"` and `chrome` defaults that disable persistent operations banners.
- Preserved closed-thread reopen semantics with explicit lifecycle invariants in outbound responses (`sameThreadId`, `reopenedByInbound=false`, `noInboundAutoReopenSideEffects=true`) and verified UI lifecycle toast continuity.
- Activated and passed G3 API/E2E ATDD coverage end-to-end for AC1-AC5.
- Enforced strict canonical action matrix on thread detail for all roles (removed `Take Over` action drift from claimed-state response shaping and UI filtering).
- Removed thread-id substring voicemail synthesis fallback so first-class voicemail timeline rendering remains tied to voicemail indicators/artifacts.
- Reduced persistent technical chrome in default thread detail by removing responsive debug banner and always-on inbound/outbound metadata lines.
- Added privileged-role API/E2E regression coverage to ensure claimed-state actions stay canonical and exclude takeover drift.
- Reconciled story-to-git traceability by aligning the story File List to the actual remediation diff.

### File List

- _bmad-output/implementation-artifacts/g-3-thread-detail-conversation-first-rebuild.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts
- apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/api/platform/g-3-thread-detail-conversation-first-rebuild.atdd.api.spec.ts
- tests/e2e/platform/g-3-thread-detail-conversation-first-rebuild.atdd.spec.ts

## Senior Developer Review (AI)

- Reviewer: Amelia (GPT-5 Codex)
- Date: 2026-03-06
- Outcome: Changes Requested findings resolved and revalidated.
- Resolution Summary:
  - Canonical state-action matrix lock now applies consistently across roles in thread detail contracts and UI action rendering.
  - Voicemail timeline fallback no longer infers voicemail from thread-id naming.
  - Default thread chrome no longer includes persistent responsive/debug and metadata lines identified as operations-heavy artifacts.
  - Added regression coverage for privileged-role action matrix behavior to prevent takeover drift.
  - Story file list and review traceability updated to match the remediation diff.

## Change Log

- 2026-03-06: Created Story g.3 ready-for-dev context document.
- 2026-03-06: Implemented conversation-first thread detail rebuild (AC1-AC5), enabled G3 API/E2E ATDD coverage, and validated lifecycle/policy contracts.
- 2026-03-06: Resolved code review findings by enforcing canonical action matrix behavior, removing voicemail-id heuristic fallback, reducing persistent technical chrome, adding privileged-role regression tests, and reconciling story/git traceability.
