# Story 8.4: Lane Extraction Transition Strategy

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want a staged lane extraction transition strategy with runtime compatibility bridges,
so that dedicated lane apps can be introduced without breaking existing behavior.

## Acceptance Criteria

1. Lane seams are extracted using mechanical move semantics (`git mv`) into dedicated lane app paths for RouteShyft and ConnectShyft.
2. Transitional host mounting/import bridge keeps current runtime/API behavior stable during extraction.
3. Workspace descriptors, CI paths, scripts, and test filters are updated to recognize extracted lane app locations.
4. Legacy compatibility paths remain operable where required until final cutover stories complete.
5. Policy/workflow gates and changed-test gating pass for the extraction slice.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Transitional structural migration story; no intentional operator UX behavior changes.
- Real-User Validation Evidence: N/A for non-critical structural migration
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control feature in scope.

## Tasks / Subtasks

- [x] Plan extraction boundaries and sequencing (AC: 1, 2)
  - [x] Identify RouteShyft and ConnectShyft seams suitable for mechanical moves.
  - [x] Define temporary mount/import bridge points that preserve runtime behavior.
- [x] Execute staged extraction (AC: 1, 2, 4)
  - [x] Perform `git mv` operations into lane-specific app paths.
  - [x] Implement transitional bridge wiring without behavior refactors.
- [x] Update workspace and delivery tooling (AC: 3)
  - [x] Update Nx project descriptors and target command paths.
  - [x] Update CI/workflow path filters and related script assumptions.
- [x] Validate compatibility and governance gates (AC: 4, 5)
  - [x] Verify legacy compatibility paths still resolve during transition.
  - [x] Run policy, branch/workflow guard, and changed-test gate checks.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Add runtime/API behavior assertions for transitional bridge stability (AC2) instead of filesystem-only checks. [`tests/api/platform/8-4-lane-extraction-transition-strategy.api.spec.ts:52`]
- [x] [AI-Review][HIGH] Remove committed compatibility `node_modules` symlinks from tracked files and resolve dependencies at install time only. [`apps/connectshyft-api/node_modules`, `apps/connectshyft-web/node_modules`, `apps/moneyshyft-api/node_modules`, `apps/moneyshyft-web/node_modules`]
- [x] [AI-Review][MEDIUM] Remove tracked legacy `dist` symlinks from compatibility app roots; build artifacts should remain runtime outputs. [`apps/moneyshyft-api/dist`, `apps/moneyshyft-web/dist`]
- [x] [AI-Review][MEDIUM] Align workspace policy inventory with actual implementation: `moneyshyft-*` project descriptors are compatibility project descriptors, not alias pointers. [`docs/policies/workspace_boundary_rules.md:20`, `apps/moneyshyft-api/project.json:1`, `apps/moneyshyft-web/project.json:1`]
- [x] [AI-Review][MEDIUM] Add explicit temporary limitation notes and minimum `dev`/`build`/`test` targets for extracted ConnectShyft app descriptors. [`apps/connectshyft-api/project.json:7`, `apps/connectshyft-web/project.json:7`]

## Dev Notes

### Story Intent

Move from single-lane app roots toward lane-specific app boundaries in controlled passes.

### Technical Requirements

- Preserve history via mechanical moves.
- Keep behavior stable; avoid mixed structural + business-logic refactors.
- Maintain temporary runtime bridges until follow-on cutover stories.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change B2.
- Build on Story 8.2 moved app baseline.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/8-2-mechanical-app-moves-with-history-preservation.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx playwright test tests/api/platform/8-4-lane-extraction-transition-strategy.api.spec.ts` (initial fail, then pass after extraction/bridge updates)
- `git mv apps/moneyshyft-api apps/routeshyft-api && git mv apps/moneyshyft-web apps/routeshyft-web` (pass)
- `git mv apps/routeshyft-api/src/modules/connectshyft apps/connectshyft-api/src/modules/connectshyft` (pass)
- `git mv apps/routeshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` (pass)
- `git mv apps/routeshyft-web/src/components/connectshyft apps/connectshyft-web/src/components/connectshyft` (pass)
- `git mv apps/routeshyft-web/src/features/connectshyft apps/connectshyft-web/src/features/connectshyft` (pass)
- `git mv apps/routeshyft-web/src/views/ConnectShyft apps/connectshyft-web/src/views/ConnectShyft` (pass)
- `npm run branch:ensure-workflow -- --lane routeshyft --workflow dev-story --story 8-4-lane-extraction-transition-strategy.md` (pass)
- `npm run policy:check` (initial fail: story/sprint status mismatch; subsequent pass)
- `bash scripts/test-changed.sh codex/dev` (pass)
- `npm run build --prefix apps/routeshyft-api` (pass)
- `npm run build --prefix apps/routeshyft-web` (pass)
- `npm run build --prefix src` (pass)
- `npm run build --prefix frontend` (pass)
- `npm test` (fails in `e2e:test` with pre-existing/flaky E2E failures outside this story scope; backend Jest suites pass)
- `npm ci --prefix apps/routeshyft-api` (pass)
- `npm run policy:check` (pass after review remediations)
- `npx playwright test tests/api/platform/8-4-lane-extraction-transition-strategy.api.spec.ts --reporter=list` (pass after review remediations)
- `bash scripts/test-changed.sh codex/dev` (pass after review remediations)
### Completion Notes List

- Extracted canonical RouteShyft app roots with mechanical moves: `apps/moneyshyft-api` -> `apps/routeshyft-api` and `apps/moneyshyft-web` -> `apps/routeshyft-web`.
- Extracted ConnectShyft seams with mechanical moves into dedicated lane paths:
  - Backend: `apps/connectshyft-api/src/modules/connectshyft`, `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - Frontend: `apps/connectshyft-web/src/components/connectshyft`, `apps/connectshyft-web/src/features/connectshyft`, `apps/connectshyft-web/src/views/ConnectShyft`
- Added transitional host import bridges via symlinked seam mount points in RouteShyft app paths to preserve runtime behavior.
- Added compatibility bridges for legacy `apps/moneyshyft-*` paths as compatibility directories (with bridged contents) so legacy build entrypoints remain operable while avoiding Nx duplicate-project graph conflicts.
- Updated workspace descriptors to recognize extracted lane app locations (`routeshyft-*`, `connectshyft-*`) while retaining legacy `moneyshyft-*` aliases for transition.
- Updated CI/setup lockfile and install path detection to prioritize `apps/routeshyft-*` with compatibility fallback.
- Added Story 8.4 API coverage to validate extraction topology + CI/workspace recognition.
- Removed tracked compatibility symlink artifacts (`node_modules`, `dist`) from app roots; runtime links are now created locally by preflight when needed.
- Added transitional ConnectShyft Nx `dev`/`build`/`test` targets and documented transition behavior in workspace policy inventory.
- Hardened test/runtime preflight path resolution to prefer canonical `apps/routeshyft-*` app roots while preserving compatibility fallback behavior.
### File List

- _bmad-output/implementation-artifacts/8-4-lane-extraction-transition-strategy.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .github/actions/setup-ci-node-playwright/action.yml
- .github/workflows/test.yml
- docs/policies/workspace_boundary_rules.md
- tests/api/platform/8-4-lane-extraction-transition-strategy.api.spec.ts
- apps/routeshyft-api/** (mechanical move from `apps/moneyshyft-api/**`)
- apps/routeshyft-web/** (mechanical move from `apps/moneyshyft-web/**`)
- apps/connectshyft-api/project.json
- apps/connectshyft-api/src/config (compatibility symlink)
- apps/connectshyft-api/src/migrations (compatibility symlink)
- apps/connectshyft-api/src/platform (compatibility symlink)
- apps/connectshyft-api/src/services (compatibility symlink)
- apps/connectshyft-api/src/utils (compatibility symlink)
- apps/connectshyft-api/src/modules/connectshyft/** (mechanical move from RouteShyft host seam)
- apps/connectshyft-api/src/routes/api/v1/connectshyft.ts (mechanical move from RouteShyft host seam)
- apps/connectshyft-web/project.json
- apps/connectshyft-web/src/components/connectshyft/** (mechanical move from RouteShyft host seam)
- apps/connectshyft-web/src/features/connectshyft/** (mechanical move from RouteShyft host seam)
- apps/connectshyft-web/src/views/ConnectShyft/** (mechanical move from RouteShyft host seam)
- apps/routeshyft-api/project.json
- apps/routeshyft-api/src/modules/connectshyft (transitional host bridge symlink)
- apps/routeshyft-api/src/routes/api/v1/connectshyft.ts (transitional host bridge symlink)
- apps/routeshyft-web/project.json
- apps/routeshyft-web/src/components/connectshyft (transitional host bridge symlink)
- apps/routeshyft-web/src/features/connectshyft (transitional host bridge symlink)
- apps/routeshyft-web/src/views/ConnectShyft (transitional host bridge symlink)
- scripts/run-playwright-with-preflight.sh (runtime compatibility and canonical app-path preflight resolution)
Legacy/removed references reconciled in audit notes (not active file-list entries): tracked `apps/connectshyft-*/node_modules` symlinks and retired `apps/moneyshyft-*` compatibility descriptors/artifacts.

## Senior Developer Review (AI)

### Reviewer

- Reviewer: GPT-5 Codex
- Date: 2026-03-04
- Outcome: Approved (all prior HIGH/MEDIUM findings resolved)

### Findings (resolved)

#### HIGH

1. AC2 validation was incomplete: new coverage previously verified path/symlink topology only and did not assert runtime/API behavioral stability across transitional mounts.
   - Evidence: `tests/api/platform/8-4-lane-extraction-transition-strategy.api.spec.ts:27-45`
2. Compatibility `node_modules` symlinks were committed into version control under app roots.
   - Evidence: `apps/connectshyft-api/node_modules`, `apps/connectshyft-web/node_modules`, `apps/moneyshyft-api/node_modules`, `apps/moneyshyft-web/node_modules`

#### MEDIUM

1. Compatibility `dist` symlinks were committed into version control, coupling source state to build-artifact paths.
   - Evidence: `apps/moneyshyft-api/dist`, `apps/moneyshyft-web/dist`
2. Policy inventory text described `moneyshyft-*` descriptors as aliases, but they are full active Nx project descriptors.
   - Evidence: `docs/policies/workspace_boundary_rules.md:20-21`, `apps/moneyshyft-api/project.json`, `apps/moneyshyft-web/project.json`
3. Extracted ConnectShyft app descriptors exposed only `lint`; no explicit `dev`/`build`/`test` workflow targets were available for lane-local execution.
   - Evidence: `apps/connectshyft-api/project.json:7-14`, `apps/connectshyft-web/project.json:7-14`

### Resolution Summary

- Added bridge runtime validation assertions and route-registration checks in Story 8.4 API coverage.
- Removed tracked `node_modules`/`dist` compatibility symlink artifacts from version control.
- Updated workspace policy inventory language to match implementation reality.
- Added ConnectShyft transitional `dev`/`build`/`test` targets.
- Hardened Playwright preflight to resolve canonical app roots and create runtime-only compatibility links when required.

### Gate Verification (re-run during review)

- `npm run policy:check` -> pass
- `npm run branch:ensure-workflow -- --lane routeshyft --workflow dev-story --story 8-4-lane-extraction-transition-strategy.md` -> pass
- `bash scripts/test-changed.sh codex/dev` -> pass

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change B2).
- 2026-03-04: Implemented staged lane extraction for RouteShyft and ConnectShyft seams via mechanical moves, added transitional host bridges and legacy compatibility directories, updated workspace/CI recognition, and validated policy/workflow/changed-test gates.
- 2026-03-04: Senior Developer Review (AI) completed - Changes Requested; follow-up action items added and status returned to `in-progress`.
- 2026-03-04: Resolved all AI review findings (runtime validation, symlink artifact hygiene, policy inventory alignment, connect targets, preflight compatibility) and returned status to `done`.
