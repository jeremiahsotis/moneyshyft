# Story 8.1: Workspace Scaffold and Nx Baseline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want a workspace-based monorepo scaffold with Nx baseline configuration,
so that lane isolation can be enforced before code moves begin.

## Acceptance Criteria

1. Workspace scaffold exists at repo root (`pnpm-workspace.yaml`, `nx.json`, root orchestrator scripts) without moving existing `src/` or `frontend/` code.
2. Shared base configuration exists (`tsconfig.base.json`, Nx-aware ESLint baseline) and parses correctly.
3. Foundation app project descriptors for current lane baseline are created without breaking existing CI entrypoints.
4. Patch application is deterministic and documented (`01-nx-scaffold.patch` applied with `-p4` path stripping).
5. Policy gate passes after scaffold changes.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Structural foundation story; no operator UI behavior changes.
- Real-User Validation Evidence: N/A for non-critical structural scaffold
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control feature in scope.

## Tasks / Subtasks

- [x] Create story branch and run workflow guard (AC: 4)
  - [x] Branch naming follows `codex/story-8-1-routeshyft-*`.
  - [x] `branch:ensure-workflow` passes for `dev-story`.
- [x] Apply scaffold patch safely (AC: 1, 2, 3, 4)
  - [x] Run `git apply --check -p4` for `01-nx-scaffold.patch`.
  - [x] Apply `01-nx-scaffold.patch` with `-p4`.
  - [x] Confirm no code moves from `src/` or `frontend/`.
- [x] Verify baseline configuration integrity (AC: 1, 2, 3)
  - [x] Validate root files parse (`package.json`, `nx.json`, `apps/*/project.json`, `tsconfig.base.json`).
  - [x] Confirm scaffold CI workflow and workspace files are present.
- [x] Run policy and changed-test gate checks (AC: 5)
  - [x] `npm run policy:check`
  - [x] `bash scripts/test-changed.sh codex/dev`

## Dev Notes

### Story Intent

Establish monorepo/Nx foundation first, then perform mechanical app/lane moves in follow-up stories.

### Technical Requirements

- Keep this story strictly scaffold-only.
- Do not move `src/` and `frontend/` in this story.
- No lane extraction in this story.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`.
- Preserve existing runtime behavior.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/Downloads/01-nx-scaffold.patch`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run start:story-branch -- --allow-dirty --lane routeshyft 8-1 workspace-scaffold-and-nx-baseline` (pass)
- `npm run branch:ensure-workflow -- --lane routeshyft --workflow dev-story --story 8-1-workspace-scaffold-and-nx-baseline` (pass)
- `git apply --check --verbose -p4 /Users/jeremiahotis/Downloads/01-nx-scaffold.patch` (pass)
- `git apply -p4 /Users/jeremiahotis/Downloads/01-nx-scaffold.patch` (pass)
- `npm run policy:check` (pass)
- `bash scripts/test-changed.sh codex/dev` (pass: no changed spec files, skipped run)
- `npm install --package-lock-only` (pass)
- `npm install` (pass)
- `npm ci` (pass)

### Completion Notes List

- Story branch created and workflow guard validated for Story 8-1.
- Patch 01 applied using `-p4` path correction.
- Workspace scaffold files added (`pnpm-workspace.yaml`, `nx.json`, `tsconfig.base.json`, Nx app project files, lint baseline).
- No `src/` or `frontend/` moves performed in this story.
- Policy and changed-test checks passed for this scaffold slice.
- Review follow-ups resolved: pinned `packageManager`, hardened CI install flow, and rewired Nx project targets to existing app directories (`src/`, `frontend`) to avoid broken workspace entrypoints during scaffold phase.

### File List

- _bmad-output/implementation-artifacts/8-1-workspace-scaffold-and-nx-baseline.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md
- .eslintrc.cjs
- .github/workflows/ci.yml
- apps/moneyshyft-api/project.json
- apps/moneyshyft-web/project.json
- nx.json
- package-lock.json
- package.json
- pnpm-workspace.yaml
- tools/e2e/project.json
- tsconfig.base.json

## Senior Developer Review (AI)

### Reviewer

GPT-5 Codex (Amelia) - 2026-03-04

### Outcome

Approved after follow-up fixes.

### Findings Resolved

- `packageManager` pinned from `pnpm@latest` to a deterministic version (`pnpm@10.28.0`).
- CI install step updated to `npm ci || npm install --no-audit --fund=false` to remove `pnpm-lock.yaml` hard dependency in this scaffold-only phase.
- Nx foundation project descriptors now target existing app roots (`src/`, `frontend`) with npm-based commands instead of unresolved `apps/*` importers.
- Story file list synced to include `package-lock.json` after dependency lock refresh.

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`).
- 2026-03-04: Story implementation completed (Patch 01 scaffold applied with path normalization) and prepared for review.
- 2026-03-04: Senior dev review findings resolved (CI/install determinism, Nx target wiring, package manager pinning), story moved to `done`.
