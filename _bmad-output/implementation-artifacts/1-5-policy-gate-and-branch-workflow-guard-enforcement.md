# Story 1.5: Policy Gate and Branch Workflow Guard Enforcement

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a maintainer,
I want CI and local workflow guards to enforce git policy,
so that branch/workflow discipline is mandatory and auditable.

## Acceptance Criteria

1. Given a pipeline run starts, when policy checks execute, then downstream quality jobs are blocked on policy failure.
2. Branch guard commands validate story/epic workflow branch compliance.

## Tasks / Subtasks

- [ ] Implement acceptance criterion 1 (AC: 1)
  - [ ] Verify CI job graph places `policy` as first blocking stage and prevents downstream execution on failure.
  - [ ] Ensure policy failure output includes actionable remediation guidance.
- [ ] Implement acceptance criterion 2 (AC: 2)
  - [ ] Harden branch/workflow guard command behavior for both story and epic workflows.
  - [ ] Ensure local and CI guard behaviors are consistent and non-bypassable.
- [ ] Add verification coverage
  - [ ] Add/update tests for policy-first job graph and guard command enforcement behavior.
  - [ ] Validate failure modes produce clear diagnostics.

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

- Story preparation only; implementation logs pending.

### Completion Notes List

- Story context prepared with CI policy-first and branch-workflow guard enforcement requirements.

### File List

- _bmad-output/implementation-artifacts/1-5-policy-gate-and-branch-workflow-guard-enforcement.md
