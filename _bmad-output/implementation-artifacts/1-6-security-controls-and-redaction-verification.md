# Story 1.6: Security Controls and Redaction Verification

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security engineer,
I want tenant isolation, CSRF/cookie posture, and log redaction verified by automated checks,
so that core security controls are continuously enforced in implementation and CI.

## Acceptance Criteria

1. Given protected API and auth paths, when security regression tests run, then cross-tenant access attempts fail and CSRF protection is enforced on state-changing routes.
2. Logs and event payloads exclude prohibited secret/plaintext sensitive fields.

## Tasks / Subtasks

- [ ] Implement acceptance criterion 1 (AC: 1)
  - [ ] Build or extend security regression suite for cross-tenant isolation and CSRF-required state-changing operations.
  - [ ] Include cookie posture assertions relevant to app/api domain model.
- [ ] Implement acceptance criterion 2 (AC: 2)
  - [ ] Add centralized log/event payload redaction rules for secrets and sensitive fields.
  - [ ] Verify audit/event payloads remain minimal and policy-compliant.
- [ ] Add verification coverage
  - [ ] Add deterministic tests for redaction behavior (allow-list or deny-list based policy).
  - [ ] Ensure CI lane includes this security verification suite as a required gate.

## Dev Notes

### Story Intent

This story operationalizes continuous security verification for the platform controls introduced in Epic 1.

### Technical Requirements

- Security regression must validate tenant isolation and CSRF enforcement continuously.
- Sensitive fields (tokens, secrets, plaintext credentials) must be redacted from logs/events.
- Redaction behavior should be centralized and testable.
- Security checks should be suitable for CI repeatability and low flake risk.

### Architecture Compliance

- Preserve platform kernel guardrails and enforce them via tests rather than ad hoc manual verification.
- Keep redaction and logging behavior centralized in platform/audit/event utilities.

### Library / Framework Requirements

- Use existing backend stack and test tooling (`jest`, existing API/E2E suites).
- Avoid introducing heavy new security tooling unless required for deterministic test coverage.

### File Structure Requirements

- Redaction logic in shared audit/event/logging utilities.
- Security tests in platform API/E2E test suites with clear tagging and deterministic fixtures.
- CI integration updates in existing workflow/policy/quality scripts as needed.

### Testing Requirements

- Must cover:
  - cross-tenant rejection checks,
  - CSRF enforcement checks,
  - cookie posture checks,
  - redaction checks for logs and event payloads.
- Must assert prohibited fields are absent from emitted payloads.
- Must run in CI with explicit pass/fail reporting.

### Previous Story Intelligence

- This story is a verification capstone on top of Stories 1.1 through 1.5; reuse existing guardrail tests and extend coverage instead of creating parallel suites.

### Git Intelligence Summary

- Recent work shows strong emphasis on deterministic API/E2E evidence and policy gates; apply same standards to security verification.

### Latest Tech Information

- Current dependency versions and policy constraints are already captured in project artifacts; no dependency-version changes are required to complete this story.

### Project Context Reference

- Follow project-context security rules: tenant isolation, CSRF on state changes, secure cookie handling, and minimal/redacted audit payloads.

### Project Structure Notes

- Keep security controls test-backed and centralized to prevent drift across modules and future epics.

### References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-5-policy-gate-and-branch-workflow-guard-enforcement.md
- /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story preparation only; implementation logs pending.

### Completion Notes List

- Story context prepared with security regression and redaction verification guardrails.

### File List

- _bmad-output/implementation-artifacts/1-6-security-controls-and-redaction-verification.md
