# Story 1.5: Policy Gate and Branch Workflow Guard Enforcement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a maintainer,
I want CI and local workflow guards to enforce git policy,
so that branch/workflow discipline is mandatory and auditable.

## Acceptance Criteria

1. Given a pipeline run starts, when policy checks execute, then downstream quality jobs are blocked on policy failure.
2. Branch guard commands validate story/epic workflow branch compliance.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: N/A
- Real-User Validation Evidence: N/A
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Implement acceptance criterion 1 (AC: 1)
  - [x] Verify CI job graph places `policy` as first blocking stage and prevents downstream execution on failure.
  - [x] Ensure policy failure output includes actionable remediation guidance.
- [x] Implement acceptance criterion 2 (AC: 2)
  - [x] Harden branch/workflow guard command behavior for both story and epic workflows.
  - [x] Ensure local and CI guard behaviors are consistent and non-bypassable.
- [x] Add verification coverage
  - [x] Add/update tests for policy-first job graph and guard command enforcement behavior.
  - [x] Validate failure modes produce clear diagnostics.

## Dev Notes

### Story Intent

This story codifies policy enforcement as an operational control, ensuring workflow discipline is enforced automatically rather than by convention.

### Technical Requirements

- `npm run policy:check` must remain the first blocking gate in CI.
- Guard command validation must enforce workflow alignment for story/epic operations.
- Failure messaging must provide concrete, immediate remediation commands.

### Architecture Compliance

- Treat policy and branch/workflow gates as platform delivery invariants.
- Keep guard logic centralized in scripts/workflow definitions to avoid drift.

### Library / Framework Requirements

- No new framework dependencies required; enforce with existing scripts and CI workflow tooling.

### File Structure Requirements

- CI workflow definitions under `.github/workflows/*`.
- Guard scripts under `scripts/*`.
- Tests under existing API/E2E/policy harness conventions.

### Testing Requirements

- Validate CI graph order and dependency structure (`policy` before lint/test/burn-in/gates lanes).
- Validate local guard command rejects non-compliant branch/workflow combinations.
- Validate policy guard output includes path to policy and actionable remediation.

### Previous Story Intelligence

- Epic 0 stories 0.9 and 0.10 already established policy-first foundations; this story should generalize and enforce those rules for Epic 1 progression.

### Git Intelligence Summary

- Recent commits demonstrate strict policy/guard hardening and regression test enforcement; maintain that baseline.

### Latest Tech Information

- Existing CI/scripts stack in repo is sufficient; focus on correctness and guard hardening over tooling changes.

### Project Context Reference

- Mandatory policy source: `docs/policies/git_policy.md`.
- Required guard commands:
  - `npm run branch:ensure-workflow -- --workflow <name-or-path> --story <story-key-or-story-file>`
  - `npm run branch:ensure-workflow -- --workflow <name-or-path> --epic <epic-number>`

### Project Structure Notes

- Keep policy enforcement implementation centralized and test-backed to prevent silent regressions.

### References

- /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-9-ci-policy-gate-as-blocking-first-stage.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-10-kernel-readiness-verification-suite.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Verified existing implementation and coverage in:
  - `.github/workflows/test.yml`
  - `scripts/enforce-git-policy.sh`
  - `scripts/branch-ensure-workflow.sh`
  - `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts`
  - `tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.spec.ts`
- Validation commands run:
  - `npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.spec.ts` (pass: 11/11)
  - `npm run policy:check` (pass)
  - `bash scripts/branch-ensure-workflow.sh --workflow atdd --story` (fails with explicit `Missing value for --story`)

### Completion Notes List

- AC1 satisfied: CI workflow enforces policy-first blocking chain (`policy -> lint -> test -> burn-in -> quality-gates`) with downstream dependency gating.
- AC1 hardened: `backend-contracts` now depends on `quality-gates` to preserve target-state pipeline ordering.
- AC1 satisfied: policy guard diagnostics include policy file reference and actionable remediation commands.
- AC1 hardened: pull-request policy checks now validate commit subject from PR head (`HEAD^2`) when running on synthetic merge commits.
- AC2 satisfied: branch workflow guard enforces story and epic branch patterns, validates required args, and rejects non-compliant inputs with explicit diagnostics.
- AC2 hardened: branch guard now rejects `--workflow/--story/--epic` flags when values are missing, with explicit diagnostics.
- Verification coverage updated for backend-contract dependency gating, PR merge-subject bypass prevention, and missing-value diagnostics.

### File List

- .github/workflows/test.yml
- scripts/branch-ensure-workflow.sh
- scripts/enforce-git-policy.sh
- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts
- tests/support/utils/policyScriptTestHarness.ts
- _bmad-output/implementation-artifacts/1-5-policy-gate-and-branch-workflow-guard-enforcement.md

## Change Log

- 2026-02-20: Validated Story 1.5 enforcement implementation and test coverage; advanced status to `review`.
- 2026-02-20: Addressed senior code-review findings (PR merge-subject bypass, CLI arg robustness, backend-contract dependency ordering, and gap coverage) and reconciled story file list with actual git changes.
- 2026-02-21: Confirmed completion after remediation and synchronized story/sprint tracking status to `done`.
