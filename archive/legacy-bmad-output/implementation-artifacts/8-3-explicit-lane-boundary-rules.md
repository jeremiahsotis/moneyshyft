# Story 8.3: Explicit Lane Boundary Rules

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want explicit lane boundary rules enforced in workspace tooling,
so that cross-lane coupling is blocked by default and shared dependencies stay controlled.

## Acceptance Criteria

1. Lane taxonomy and tags are explicitly defined for workspace projects, including shared package classification.
2. Cross-lane imports are forbidden by default and only allowed through approved shared package boundaries (for example `packages/shared-*`).
3. Package public API constraints are enforced (`src/index.ts` entrypoint), and deep imports across package boundaries are blocked.
4. Policy and CI enforcement detect and fail boundary violations with actionable diagnostics.
5. Existing MoneyShyft app runtime/build/test entrypoints remain operational after boundary enforcement changes.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Structural boundary-enforcement story; no operator UX behavior changes.
- Real-User Validation Evidence: N/A for non-critical structural policy story
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control feature in scope.

## Tasks / Subtasks

- [x] Define lane boundary model (AC: 1, 2)
  - [x] Inventory projects and assign lane/shared tags across Nx descriptors.
  - [x] Document allowed dependency directions between lane and shared tags.
- [x] Enforce workspace boundary rules (AC: 2, 3)
  - [x] Implement Nx/ESLint dependency constraints for lane isolation.
  - [x] Add deep-import guardrails for package public API boundaries.
- [x] Add policy and CI validation hooks (AC: 4)
  - [x] Wire boundary checks into existing policy/CI gates.
  - [x] Ensure failure output includes remediation guidance.
- [x] Validate no regression for existing lane entrypoints (AC: 5)
  - [x] Verify canonical and compatibility app targets still build/test as expected.
  - [x] Confirm branch/workflow and policy gates pass.

## Dev Notes

### Story Intent

Establish enforceable lane boundaries as a mandatory control before lane extraction progresses.

### Technical Requirements

- Enforce lane isolation in tooling, not by convention.
- Keep shared package usage explicit and constrained.
- Preserve current app behavior while adding boundary governance.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change B1.
- Keep this story focused on rules and enforcement, not lane code moves.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/project-context.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run start:story-branch -- --lane routeshyft 8-3 explicit-lane-boundary-rules` (pass)
- `npm run branch:ensure-workflow -- --lane routeshyft --workflow dev-story --story 8-3-explicit-lane-boundary-rules.md` (pass)
- `bash scripts/story-status-transition.sh --lane routeshyft --story-key 8-3-explicit-lane-boundary-rules --status in-progress` (pass)
- `node scripts/enforce-workspace-boundaries.js` (pass)
- `npm run policy:check` (pass)
- `npx playwright test tests/api/platform/8-3-explicit-lane-boundary-rules.api.spec.ts` (pass)
- `npx playwright test tests/api/platform/ci-policy-gate-as-blocking-first-stage.api.spec.ts` (pass)
- `npx nx run moneyshyft-api:build` (pass)
- `npx nx run moneyshyft-web:build` (pass)
- `npx nx run moneyshyft-api:lint` (pass)
- `npx nx run moneyshyft-web:lint` (pass)
- `npx nx run moneyshyft-api:test` (pass)
- `npm run build --prefix src` (pass)
- `npm run build --prefix frontend` (pass)
- `bash scripts/test-changed.sh codex/dev` (pass: no changed spec files detected)

### Completion Notes List

- Normalized Nx lane tagging to explicit workspace taxonomy (`lane:routeshyft`, `lane:connectshyft`, `lane:signshyft`, `scope:shared`) for current project descriptors.
- Added explicit dependency-direction policy documentation for lane/shared boundaries.
- Tightened `.eslintrc.cjs` boundary constraints and deep-import guardrails for shared package boundaries.
- Hardened `scripts/enforce-workspace-boundaries.js` to reject cross-lane imports, ambiguous lane/shared classification, and non-shared `scope:shared` usage.
- Added Story 8.3 policy tests validating cross-lane import rejection, legacy lane-tag rejection, shared-classification constraints, deep-import rejection (including `src` root), and valid baseline pass.
- Regression validation is complete: canonical lane build/test/lint/policy entrypoints pass.

### File List

- _bmad-output/implementation-artifacts/8-3-explicit-lane-boundary-rules.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .eslintrc.cjs
- apps/routeshyft-api/project.json
- apps/routeshyft-web/project.json
- docs/policies/git_policy.md
- docs/policies/workspace_boundary_rules.md
- package.json
- scripts/enforce-git-policy.sh
- scripts/enforce-workspace-boundaries.js
- tests/api/platform/8-3-explicit-lane-boundary-rules.api.spec.ts
- tests/support/utils/policyScriptTestHarness.ts
Legacy file-list references reconciled: `apps/moneyshyft-api/project.json`, `apps/moneyshyft-web/project.json` (retired after lane extraction).
## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change B1).
- 2026-03-04: Implemented explicit lane-boundary taxonomy, Nx/ESLint constraints, deep-import guardrails, and policy-gate enforcement hooks with Story 8.3 API coverage tests.
- 2026-03-04: Hardened workspace boundary guardrails for cross-lane import detection and strict shared-classification rules; added coverage tests and lint targets for lane apps.
