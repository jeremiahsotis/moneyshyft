# Story 8.2: Mechanical App Moves with History Preservation

Status: done

## Story

As a platform maintainer,
I want to move the legacy root applications into workspace app paths using mechanical git moves,
so that the monorepo layout advances without breaking existing runtime and CI entrypoints.

## Acceptance Criteria

1. Backend app files are moved from root `src/` to `apps/moneyshyft-api/` using mechanical move semantics that preserve git history.
2. Frontend app files are moved from root `frontend/` to `apps/moneyshyft-web/` using mechanical move semantics that preserve git history.
3. Existing root entrypoints remain operational during transition (legacy `src/` and `frontend/` compatibility paths still resolve).
4. Nx project descriptors point to canonical app locations and run commands target valid app manifests.
5. Policy and workflow gates pass after move (`branch:ensure-workflow`, `policy:check`, changed-test gate).

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Structural migration story with no operator UX behavior changes.
- Real-User Validation Evidence: N/A for non-critical structural migration
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control feature in scope.

## Tasks / Subtasks

- [x] Confirm story workflow guard and baseline checks (AC: 5)
  - [x] `npm run branch:ensure-workflow -- --lane routeshyft --workflow dev-story --story 8-2-mechanical-app-moves-with-history-preservation`
  - [x] Captured current tree and target move plan before edits.
- [x] Execute mechanical app moves (AC: 1, 2)
  - [x] Moved backend app from `src/` to `apps/moneyshyft-api/` with `git mv` history-preserving operations.
  - [x] Moved frontend app from `frontend/` to `apps/moneyshyft-web/` with `git mv` history-preserving operations.
- [x] Preserve transition compatibility (AC: 3)
  - [x] Added root compatibility symlinks (`src` and `frontend`) so existing scripts/tooling continue to resolve.
  - [x] Verified compatibility path resolution using legacy-root build entrypoints.
- [x] Update workspace descriptors and CI-sensitive references (AC: 4)
  - [x] Updated Nx project descriptors to canonical moved app roots.
  - [x] Updated CI/workflow change filters and setup references for apps-based paths with transition fallback.
- [x] Run gates and verification checks (AC: 5)
  - [x] `npm run policy:check`
  - [x] `bash scripts/test-changed.sh codex/dev`
  - [x] Backend and frontend build checks from both canonical and compatibility paths.

## Dev Notes

### Story Intent

Perform a pure structural move (`src/`, `frontend/` -> `apps/*`) with transitional compatibility, no business logic refactor.

### Technical Requirements

- Use move operations that preserve git history (`git mv` semantics).
- Keep behavior stable; no API or UX functional changes in this story.
- Maintain policy and CI operability during transition.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change A2.
- Keep lane extraction and deeper boundary work for subsequent stories.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run start:story-branch -- --lane routeshyft 8-2 mechanical-app-moves-with-history-preservation` (pass)
- `npm run branch:ensure-workflow -- --lane routeshyft --workflow dev-story --story 8-2-mechanical-app-moves-with-history-preservation` (pass)
- `git cherry-pick db321cd e1476c3 75f188e` (pass; brought 8-1 scaffold baseline into 8-2 branch)
- `git mv src apps/moneyshyft-api && git mv frontend apps/moneyshyft-web` (pass; executed with permission escalation for `.git` lock access)
- `npm run build --prefix apps/moneyshyft-api` (pass)
- `npm run build --prefix apps/moneyshyft-web` (pass)
- `npm run build --prefix src && npm run build --prefix frontend` (pass via compatibility paths)
- `npm run policy:check` (pass)
- `bash scripts/test-changed.sh codex/dev` (pass: no changed spec files, skipped run)

### Completion Notes List

- Mechanical application moves completed with `git mv` preserving history for backend and frontend app trees.
- Canonical app roots now live at `apps/moneyshyft-api` and `apps/moneyshyft-web`.
- Transition compatibility retained through root symlinks (`src` -> `apps/moneyshyft-api`, `frontend` -> `apps/moneyshyft-web`) to keep existing script and CI entrypoint behavior stable.
- Nx project descriptors updated to canonical app paths and valid `cwd` targets.
- CI setup and PR-change filter logic updated to detect and install from `apps/*` paths while preserving fallback compatibility.
- Policy and workflow guard checks pass on the migrated structure.

### File List

- _bmad-output/implementation-artifacts/8-2-mechanical-app-moves-with-history-preservation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .github/actions/setup-ci-node-playwright/action.yml
- .github/workflows/test.yml
- .gitignore
- apps/routeshyft-api/** (successor path after 8.4 lane extraction)
- apps/routeshyft-web/** (successor path after 8.4 lane extraction)
Legacy transition references retained for audit context (retired in later cutover work): `apps/moneyshyft-api/**`, `apps/moneyshyft-web/**`, `src` compatibility symlink, `frontend` compatibility symlink.

## Senior Developer Review (AI)

- Date: 2026-03-04
- Reviewer: Jeremiah (AI-assisted code review workflow)
- Outcome: Approved
- Findings:
  - No HIGH or MEDIUM issues found in the moved app paths, compatibility symlinks, Nx descriptors, or CI path updates.
- Validation Evidence:
  - `git log --follow --name-status -- apps/moneyshyft-api/package.json` (shows `R100` from `src/package.json`)
  - `git log --follow --name-status -- apps/moneyshyft-web/package.json` (shows `R100` from `frontend/package.json`)
  - `npm run branch:ensure-workflow -- --lane routeshyft --workflow dev-story --story 8-2-mechanical-app-moves-with-history-preservation` (pass)
  - `npm run policy:check` (pass)
  - `bash scripts/test-changed.sh codex/dev` (pass: no changed spec files, skipped as designed)
  - `npx nx run moneyshyft-api:build && npx nx run moneyshyft-web:build` (pass)
  - `npm run build --prefix src && npm run build --prefix frontend` (pass via compatibility symlinks)

## Change Log

- 2026-03-04: Story drafted for mechanical app moves with history preservation.
- 2026-03-04: Story implemented with git-history-preserving app moves, transitional compatibility symlinks, and CI/path updates; status set to `review`.
- 2026-03-04: Senior Developer Review (AI) completed; no blocking findings, status set to `done`.
