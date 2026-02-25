# Story ux-r1: Mobile-First Inbox/Mine/Thread Redesign

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontline volunteer,
I want Inbox, Mine, and Thread surfaces to use a simple mobile-first interaction model,
so that I can triage and act quickly without cognitive overload.

## Acceptance Criteria

1. Given operational navigation is rendered, when users move between primary surfaces, then the app uses persistent bottom navigation (`Inbox`, `Mine`, `More`) with no hidden fourth primary tab.
2. Given Inbox and Mine lists render, when cards are displayed, then thread rows use large-card hierarchy with minimum `16px` body text and `44px` tap targets for primary actions.
3. Given thread detail renders, when context and actions are displayed, then header information prioritizes neighbor and conference context and action sets remain state-explicit:
   - `UNCLAIMED`: Call, Text, Claim
   - `CLAIMED`: Call, Text, Close
   - `CLOSED`: Call, Send Message
4. Given desktop, tablet, and mobile breakpoints, when the same thread is viewed, then responsive layout preserves thread context, voicemail indicators, and action discoverability without hidden policy paths.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: This is a usability-recovery story and must optimize first-time use with explicit controls and low cognitive load.
- Real-User Validation Evidence: Pending implementation. Validate Inbox/Mine/Thread triage on mobile and tablet with volunteer operators.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story targets interaction model and readability, not role administration policy.

## Tasks / Subtasks

- [ ] Implement mobile-first navigation shell (AC: 1, 4)
  - [ ] Implement persistent bottom navigation for `Inbox`, `Mine`, `More`.
  - [ ] Remove hidden fourth-primary-tab behavior from ConnectShyft operational flow.
- [ ] Implement Inbox/Mine large-card contract (AC: 2)
  - [ ] Update thread cards for readable hierarchy and touch-safe action targets.
  - [ ] Preserve plain-language urgency labels and voicemail signal prominence.
- [ ] Implement thread header and action discoverability updates (AC: 3, 4)
  - [ ] Prioritize neighbor and conference context in thread header layout.
  - [ ] Preserve explicit state-based action sets across breakpoints.
- [ ] Add regression coverage for responsive and behavioral parity (AC: 1, 2, 3, 4)
  - [ ] E2E coverage for navigation persistence and primary-surface transitions.
  - [ ] E2E coverage for action discoverability and state-action matrix visibility.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-005, FR-CS-011, FR-CS-013, FR-CS-014.
- NFR alignment: NFR-CS-011.
- Story dependencies: `c-3-inbox-and-thread-detail-read-contracts`.
- Execution sequence guidance: run `ux-r1` before `ux-r2` per approved UX remediation sequence.

### Architecture Compliance

- Keep deterministic ranking and action semantics server-authored; UI must consume contract outputs from read contracts.
- Preserve state/action matrix consistency with locked production specification.
- Do not introduce alternate navigation paths that bypass policy-safe action surfaces.

### Library / Framework Requirements

- Reuse ConnectShyft read contract client in `frontend/src/features/connectshyft/readContracts.ts`.
- Reuse existing ConnectShyft view routing patterns and composition API structure.
- Keep state/action control mapping centralized to avoid divergence across views.

### File Structure Requirements

- Primary view updates in `frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue` and `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`.
- Route and nav updates in `frontend/src/router/index.ts`.
- Shared UI read-contract wiring in `frontend/src/features/connectshyft/readContracts.ts`.
- E2E coverage updates in `tests/e2e/platform/`.

### Testing Requirements

- Validate bottom-nav flow across mobile/tablet/desktop viewport presets.
- Validate list card readability constraints (`>=16px` body text, `>=44px` tap targets) and no hidden primary tab behavior.
- Validate state-action matrix discoverability by lifecycle state in thread detail.
- Validate voicemail indicator remains visible in cards with no layout regressions.

### Previous Story Intelligence

- `c.3` established deterministic list/detail contract and state action sets; this story must preserve those backend-authoritative semantics.
- Any UX drift from locked artifacts must be treated as regression, not interpretation freedom.

### Git Intelligence Summary

- Existing ConnectShyft UX hardening work converges on explicit policy-safe behavior; avoid adding client-side fallbacks that mask missing contract data.

### Latest Technical Information

- Use approved UX remediation lock and production-locked specification as authoritative where older language conflicts.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep mobile-first layout decisions localized to ConnectShyft operational surfaces.
- Preserve deterministic server-driven ordering semantics while redesigning visual hierarchy.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story ux-r1-mobile-first-inbox-mine-thread-redesign`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic UX, Story ux-r1)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (section 4.1.3)
- `_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-implementation-locked-production-specification.normalized.md` (sections 0, 7, 9, 10)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git branch --show-current` (pass)
- `rg -n "^Status: ready-for-dev$" _bmad-output/implementation-artifacts/ux-r1-mobile-first-inbox-mine-thread-redesign.md` (pass)

### Completion Notes List

- Created implementation-ready Story ux-r1 context document with mobile-first structure, readability constraints, and state-action discoverability guardrails.

### File List

- _bmad-output/implementation-artifacts/ux-r1-mobile-first-inbox-mine-thread-redesign.md

## Change Log

- 2026-02-25: Created Story ux-r1 ready-for-dev context document.
