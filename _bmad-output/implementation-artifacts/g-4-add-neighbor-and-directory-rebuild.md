# Story g.4: Add Neighbor and Directory Rebuild

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a volunteer,
I want Add Neighbor and Directory flows to be clear and mobile-friendly,
so that I can create/find people quickly and start the right conversation.

## Acceptance Criteria

1. Given Add Neighbor is opened, when the form is presented, then the flow supports first name, last name, primary phone, additional phone, email, address, prefers texting, shared phone, and optional notes.
2. Given Add Neighbor validation runs, when required contact constraints fail, then refusal messaging is clear and actionable with no partial writes.
3. Given Directory is used, when users search by name/phone, then results remain conference-scoped for volunteer workflows.
4. Given users select a directory entry, when conversation is started, then the app opens an existing active thread if present or starts a new conversation via deterministic ensure behavior.
5. Given mobile and tablet workflows are used, when users navigate Add Neighbor and Directory flows, then layouts remain touch-friendly and preserve context visibility.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Identity capture and retrieval flows must stay fast and simple while preserving tenant/orgUnit safety constraints.
- Real-User Validation Evidence: N/A - ready-for-dev planning artifact.
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story addresses volunteer intake/directory usability, not role-admin workflow.

## Tasks / Subtasks

- [ ] Rebuild Add Neighbor form flow for conversation-first onboarding (AC: 1, 2, 5)
  - [ ] Expand form model to support complete required field set and optional notes.
  - [ ] Preserve clear refusal messaging for validation failures and policy constraints.
- [ ] Introduce/refresh volunteer Directory surface (AC: 3, 5)
  - [ ] Implement conference-scoped search by name and phone.
  - [ ] Ensure mobile-first list interactions and quick open/start actions.
- [ ] Wire deterministic thread start behavior from directory entries (AC: 4)
  - [ ] Reuse existing thread ensure endpoint semantics.
  - [ ] Show non-disruptive notice when routing to existing active thread.
- [ ] Align Add Neighbor + Directory primitives with g.1 foundation (AC: 1, 3, 5)
  - [ ] Use shared token/primitives and avoid ad hoc UI components.
  - [ ] Keep volunteer-primary copy free of internal identifiers.

## Dev Notes

### Technical Requirements

- Tracking ID: CS-S7.4.
- FR alignment: FR-CS-004, FR-CS-006, FR-CS-007.
- Depends on `g-1-design-tokens-and-shared-conversation-primitives`.

### Architecture Compliance

- Preserve tenant-scoped identity model and orgUnit-scoped operational context.
- Keep deterministic active-thread ensure behavior (`POST /api/v1/connectshyft/threads`) for start/open conversation actions.
- Maintain shared envelope refusal semantics for create/search/start actions.

### Library / Framework Requirements

- Reuse existing ConnectShyft feature services (`neighbors.ts`, `threads.ts`) and avoid direct API calls from templates.
- Keep accessibility locks and feedback sanitization through `uiContracts.ts`.
- Preserve Vue Router route patterns for neighbor create/profile and any new directory route.

### File Structure Requirements

- Primary files:
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
  - `apps/moneyshyft-web/src/features/connectshyft/neighbors.ts`
  - `apps/moneyshyft-web/src/features/connectshyft/threads.ts`
  - `apps/moneyshyft-web/src/router/index.ts` (if new directory route is added)
- Add any directory UI under `apps/moneyshyft-web/src/views/ConnectShyft/` and shared components under `apps/moneyshyft-web/src/components/connectshyft/`.

### Testing Requirements

- Add/extend tests for Add Neighbor validation, refusal messaging, and successful creation flow.
- Add directory search and deterministic thread-open/start behavior coverage.
- Validate conference/orgUnit scoping and absence of cross-scope result leakage.

### Previous Story Intelligence

- Existing neighbor create/profile flows functionally work but remain operations-heavy and not optimized for quick volunteer conversation starts.
- UX rebuild decision requires these flows to align with messaging-first posture and mobile-first touch ergonomics.

### Git Intelligence Summary

- Neighbor profile already includes governance-heavy merge/edit workflows; keep those separated from simplified volunteer Add Neighbor/Directory journey.
- Existing routing and connectshyft feature modules provide stable entry points to extend rather than re-architect.

### Latest Technical Information

- Existing frontend stack and strict TypeScript constraints are sufficient; no new library dependency is required for this story.

### Project Context Reference

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic g / Story g.4)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep identity governance controls intact while simplifying volunteer-first create/search/start pathways.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-4-add-neighbor-and-directory-rebuild`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
- `apps/moneyshyft-web/src/features/connectshyft/neighbors.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cat _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `cat apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
- `rg -n "Directory|Neighbor|search|Add Neighbor" apps/moneyshyft-web/src/views/ConnectShyft/*.vue`
- `cat apps/moneyshyft-web/src/router/index.ts`

### Completion Notes List

- Created Story g.4 ready-for-dev context for volunteer-friendly Add Neighbor/Directory rebuild with deterministic thread-start guardrails.

### File List

- _bmad-output/implementation-artifacts/g-4-add-neighbor-and-directory-rebuild.md

## Change Log

- 2026-03-06: Created Story g.4 ready-for-dev context document.
