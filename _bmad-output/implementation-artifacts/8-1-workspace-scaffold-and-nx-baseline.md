# Story 8.1: Workspace Scaffold and Nx Baseline

Status: ready-for-dev

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
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Structural foundation story; no operator UI behavior changes.
- Real-User Validation Evidence: N/A for structural scaffold
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control feature in scope.

## Tasks / Subtasks

- [ ] Create story branch and run workflow guard (AC: 4)
  - [ ] Branch naming follows `codex/story-8-1-routeshyft-*`.
  - [ ] `branch:ensure-workflow` passes for `dev-story`.
- [ ] Apply scaffold patch safely (AC: 1, 2, 3, 4)
  - [ ] Run `git apply --check -p4` for `01-nx-scaffold.patch`.
  - [ ] Apply `01-nx-scaffold.patch` with `-p4`.
  - [ ] Confirm no code moves from `src/` or `frontend/`.
- [ ] Verify baseline configuration integrity (AC: 1, 2, 3)
  - [ ] Validate root files parse (`package.json`, `nx.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`).
  - [ ] Confirm existing primary CI workflow file remains intact unless intentionally extended.
- [ ] Run policy and changed-test gate checks (AC: 5)
  - [ ] `npm run policy:check`
  - [ ] `bash scripts/test-changed.sh origin/main` (or documented equivalent)

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

- Pending implementation.

### Completion Notes List

- Pending implementation.

### File List

- _bmad-output/implementation-artifacts/8-1-workspace-scaffold-and-nx-baseline.md

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`).
