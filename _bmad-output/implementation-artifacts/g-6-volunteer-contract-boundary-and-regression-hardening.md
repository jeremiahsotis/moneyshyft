# Story g.6: Volunteer Contract Boundary and Regression Hardening

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a release maintainer,
I want explicit volunteer display contracts and regression gates,
so that UX drift back to admin/system-first surfaces is prevented.

## Acceptance Criteria

1. Given read models are consumed by volunteer UI, when adapters map backend truth to display contracts, then volunteer surfaces consume display-safe fields and suppress raw internal metadata by default.
2. Given CI and QA gates run for CS-E7 stories, when validations execute, then regression coverage verifies:
   - internal-field suppression in volunteer-primary surfaces
   - voicemail behavior lock (Mine/Inbox/thread timeline)
   - responsive behavior (mobile full-screen thread, tablet split view, desktop three-column)
   - accessibility constraints and action feedback consistency
3. Given lifecycle and policy contracts are exercised in volunteer surfaces, when outbound actions occur on `CLOSED` threads, then same-thread reopen semantics remain locked and observable through deterministic feedback.
4. Given inbound events are processed, when `CLOSED` threads receive inbound webhook activity, then volunteer UI does not auto-reopen threads and reflects locked routing behavior without contradictory messaging.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: This story is the enforcement boundary that prevents regressions in volunteer safety, readability, and lifecycle correctness.
- Real-User Validation Evidence: N/A - ready-for-dev planning artifact.
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story enforces contract/test boundaries and regression gates rather than role-admin workflow implementation.

## Tasks / Subtasks

- [ ] Establish explicit volunteer display-adapter boundary (AC: 1)
  - [ ] Separate raw operational read-contract payloads from volunteer display-safe contract objects.
  - [ ] Block volunteer-primary rendering of forbidden internal fields by contract and helper enforcement.
- [ ] Harden lifecycle and policy behavior locks in contract adapters (AC: 3, 4)
  - [ ] Preserve same-thread reopen semantics for outbound actions on `CLOSED`.
  - [ ] Preserve inbound no-auto-reopen behavior for `CLOSED` thread states.
- [ ] Add regression gates for CS-E7 behavior lock (AC: 2)
  - [ ] Add API/e2e assertions for internal-field suppression, voicemail lock behavior, and responsive interaction model.
  - [ ] Add accessibility and feedback-taxonomy coverage for volunteer action paths.
- [ ] Wire CI quality-gate checks for CS-E7 boundary compliance (AC: 2)
  - [ ] Ensure regression suite is integrated into existing policy/test/burn-in/quality-gates workflow.
  - [ ] Keep failures blocking for merge readiness.

## Dev Notes

### Technical Requirements

- Tracking ID: CS-S7.6.
- FR alignment: FR-CS-005, FR-CS-017, FR-CS-024.
- NFR alignment: NFR-CS-011.
- Depends on `g-2`, `g-3`, `g-4`, and `g-5`.

### Architecture Compliance

- Enforce volunteer adapter boundary aligned to sprint change proposal architecture modifications.
- Keep backend route and lifecycle invariants intact; this story hardens presentation contracts and gate coverage rather than changing canonical domain semantics.
- Preserve event/replay/lifecycle integrity across contract mapping and UI feedback pathways.

### Library / Framework Requirements

- Reuse existing backend read-contract module and frontend feature adapters.
- Reuse existing Playwright/CI orchestration and policy gate scripts; extend rather than fork.
- Maintain TypeScript strictness for display-contract typing and envelope parsing.

### File Structure Requirements

- Primary files:
  - `apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts`
  - `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
  - `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`
  - `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
  - `tests/api/platform/` and `tests/e2e/platform/` ConnectShyft regression specs
  - `.github/workflows/test.yml` (if additional gate wiring is required)

### Testing Requirements

- Add explicit automated checks for internal-field suppression in volunteer-primary UI.
- Add regression checks for voicemail ownership behavior and thread timeline locks.
- Add responsive behavior checks (mobile/tablet/desktop) and accessibility checks for core volunteer action paths.
- Verify feedback taxonomy consistency (`success`, `refusal`, `error`) for action outcomes.

### Previous Story Intelligence

- User testing on 2026-03-06 proved prior UX remediation closure was false-complete; this story is the explicit anti-regression closeout gate for CS-E7.
- Current read-contract and view layers still expose raw operational fields in volunteer surfaces.

### Git Intelligence Summary

- Backend and frontend already contain contract/helper structure (`readContracts`, `uiContracts`) that can host the boundary cleanly.
- Existing CI already has policy-first and quality-gate lanes; add CS-E7 assertions into those lanes instead of adding separate pipelines.

### Latest Technical Information

- Continue with current workspace toolchain and CI architecture; no external framework upgrades are required to complete this story.

### Project Context Reference

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic g / Story g.6)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- This story is the CS-E7 closure safety net: contract boundaries and regression gates must be merge-blocking and deterministic.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-6-volunteer-contract-boundary-and-regression-hardening`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`
- `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cat _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `cat _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `cat apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts`
- `cat apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `cat apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`
- `cat apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`

### Completion Notes List

- Created Story g.6 ready-for-dev context with volunteer contract boundary requirements and CI/QA regression hardening gates for CS-E7 closeout.

### File List

- _bmad-output/implementation-artifacts/g-6-volunteer-contract-boundary-and-regression-hardening.md

## Change Log

- 2026-03-06: Created Story g.6 ready-for-dev context document.
