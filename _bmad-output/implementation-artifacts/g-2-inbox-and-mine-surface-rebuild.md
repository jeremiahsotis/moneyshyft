# Story g.2: Inbox and Mine Surface Rebuild

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontline volunteer,
I want Inbox and Mine to feel like calm messaging queues,
so that I can triage quickly without parsing system internals.

## Acceptance Criteria

1. Given Inbox or Mine is rendered, when thread rows are displayed, then each row is a card-level tap target with human-readable summary, preview, timestamp, and context pills.
2. Given volunteer-primary queue surfaces are rendered, when content is mapped from backend contracts, then raw state chips, priority integers, number IDs, and webhook/system metadata are not primary UI copy.
3. Given queue ordering is evaluated, when records are returned, then ordering remains deterministic and maps to human urgency language; queue search remains persistent in Inbox and Mine.
4. Given responsive behavior is exercised, when users move between queue and thread, then mobile opens thread full-screen, tablet defaults to split queue/thread, and desktop supports three-column workflow.
5. Given voicemail events are present, when queue cards are rendered, then claimed-thread voicemail remains in Mine and indicators are visible without ownership churn.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Queue triage is workflow-critical; interface must preserve deterministic behavior while removing backend-centric cognitive load.
- Real-User Validation Evidence: N/A - ready-for-dev planning artifact.
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story addresses volunteer queue UX and does not introduce role-admin management features.

## Tasks / Subtasks

- [ ] Rebuild Inbox and Mine queue layouts on shared primitives from g.1 (AC: 1, 4)
  - [ ] Replace current mixed card/chip rendering with conversation-card rows and consistent summary metadata placement.
  - [ ] Implement responsive interaction model for mobile full-screen thread, tablet split view, and desktop three-column behavior.
- [ ] Implement display-safe queue contract mapping (AC: 2)
  - [ ] Ensure volunteer surfaces use friendly urgency and context fields only.
  - [ ] Remove primary exposure of raw thread id, number id, priority rank, and backend metadata labels.
- [ ] Preserve deterministic ordering and persistent search behavior (AC: 3)
  - [ ] Keep server-driven ordering contract and map to plain-language urgency pills.
  - [ ] Persist query state between Inbox/Mine navigation and refresh actions.
- [ ] Lock voicemail indicator behavior for queue ownership semantics (AC: 5)
  - [ ] Keep claimed voicemail threads in Mine with visible voicemail indicators.
  - [ ] Ensure voicemail events do not force Mine-owned cards back to Inbox.

## Dev Notes

### Technical Requirements

- Tracking ID: CS-S7.2.
- FR alignment: FR-CS-005, FR-CS-014.
- Depends on `g-1-design-tokens-and-shared-conversation-primitives`.

### Architecture Compliance

- Maintain deterministic inbox ordering contract from architecture and existing read-model policies.
- Keep volunteer display contract separate from raw operational truth.
- Preserve canonical thread states and do not alter lifecycle semantics in queue rendering.

### Library / Framework Requirements

- Use Vue composition patterns currently used in ConnectShyft views.
- Keep token and action-copy wiring through `uiContracts.ts`.
- Reuse `readContracts.ts` mapping layer; do not bypass it with direct envelope reads in templates.

### File Structure Requirements

- Primary files:
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue`
  - `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`
  - `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`
- Add new queue primitives under `apps/moneyshyft-web/src/components/connectshyft/` as needed.

### Testing Requirements

- Add/extend e2e tests for Inbox/Mine rendering and navigation behavior by breakpoint.
- Add regression assertions that volunteer-primary queue cards do not render forbidden internal-field tokens.
- Validate voicemail indicator behavior for claimed vs unclaimed queue placement.

### Previous Story Intelligence

- `ux-r1` and `ux-r3` delivered mobile-first and voicemail behavior improvements but user testing still reported operations-heavy queue presentation.
- Existing `ConnectShyftInboxView.vue` currently exposes internal identifiers and technical chips as first-order content.

### Git Intelligence Summary

- Current queue implementation already has availability, capability, and refusal patterns that should remain intact.
- Refactor should focus on presentational composition and adapter output, not capability enforcement logic.

### Latest Technical Information

- Frontend stack in workspace remains:
  - Vue 3.5.13
  - Tailwind 3.4.1
  - Vite 5.0.11

### Project Context Reference

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic g / Story g.2)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep volunteer IA aligned with bottom-nav posture (`Inbox`, `Mine`, `More`) and avoid reintroducing operations-first table framing.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-2-inbox-and-mine-surface-rebuild`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cat _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `rg -n "Inbox|Mine|contract boundary|volunteer" _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `cat apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
- `cat apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`

### Completion Notes List

- Created Story g.2 ready-for-dev context with queue rebuild scope, deterministic ordering constraints, and volunteer-safe rendering guardrails.

### File List

- _bmad-output/implementation-artifacts/g-2-inbox-and-mine-surface-rebuild.md

## Change Log

- 2026-03-06: Created Story g.2 ready-for-dev context document.
