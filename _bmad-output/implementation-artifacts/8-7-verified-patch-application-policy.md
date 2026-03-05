# Story 8.7: Verified Patch Application Policy

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want a verified patch application policy and workflow,
so that stale or malformed patch bundles cannot be applied blindly and destabilize the repository.

## Acceptance Criteria

1. Patch intake governance is documented as a required workflow with preflight checks and post-apply verification gates.
2. Clean patches are applied only through verified paths, including required path normalization flags where needed.
3. Stale or malformed patches are handled through explicit remediation modes (manual repair, rebuild from intent, or defer-until-structure-ready).
4. Invalid patch content issues (for example malformed JSON payloads) are corrected before apply attempts.
5. Policy/workflow checks incorporate patch-governance expectations and provide actionable diagnostics.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Process/governance story; no direct operator UX behavior change.
- Real-User Validation Evidence: N/A for non-critical process hardening
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control feature in scope.

## Tasks / Subtasks

- [x] Define patch intake workflow and controls (AC: 1, 3)
  - [x] Document preflight checks (`git apply --check`, target existence, parse validation).
  - [x] Define remediation classes: apply-clean, repair-stale, rebuild-malformed, defer-structural.
- [x] Implement tooling/automation support (AC: 2, 5)
  - [x] Add scripts/checks to enforce verified apply pathways and diagnostics.
  - [x] Add policy/CI hooks to prevent blind patch application workflows.
- [x] Address known patch quality cases from proposal evidence (AC: 2, 3, 4)
  - [x] Encode handling guidance for `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08` patch classes.
  - [x] Ensure invalid JSON patch content is fixed prior to eligible application.
- [x] Validate governance workflow (AC: 5)
  - [x] Run policy/workflow guard checks against positive and negative patch-intake scenarios.
  - [x] Document expected operator/developer remediation actions.

## Dev Notes

### Story Intent

Convert patch intake from ad hoc/manual behavior into a deterministic and auditable governance workflow.

### Technical Requirements

- Treat patch files as untrusted input until validated.
- Require explicit verification before application.
- Provide clear fallback/remediation paths for stale and malformed patch content.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change D1.
- Keep process controls compatible with required git policy and CI gate ordering.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/project-context.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (CLI)

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story _bmad-output/implementation-artifacts/8-7-verified-patch-application-policy.md` (pass)
- `npm run story:status:set -- --story-key 8-7-verified-patch-application-policy --status in-progress` (pass)
- `bash scripts/test-verified-patch-intake.sh` (pass; 14 scenario checks including `--mode apply` post-verify coverage)
- `npm run policy:check` (pass)
- `npm test` (partial fail at `e2e:test`: missing `../../../src/node_modules/knex` in Playwright ConnectShyft helper imports)

### Completion Notes List

- Added mandatory governance workflow at `docs/policies/verified_patch_application_policy.md` with preflight and post-apply gates.
- Added `scripts/verified-patch-apply.sh` as the verified intake path with class-aware strip handling, target checks, parse checks, and JSON payload validation.
- Added `scripts/enforce-verified-patch-intake-guard.sh` to block ad hoc `git apply` usage and enforce policy expectations with actionable diagnostics.
- Wired patch-intake governance into policy and CI hooks via `scripts/enforce-git-policy.sh` and new package scripts.
- Updated `scripts/enforce-verified-patch-intake-guard.sh` to exempt test harness scripts (`scripts/test-*.sh`) so PR diff scans do not self-block valid guard tests.
- Updated `scripts/test-verified-patch-intake.sh` to use isolated fixture repositories, removing brittle coupling to `docs/ci.md` repository content.
- Added apply-mode test coverage for verified patch application post-verify gates (`git status --short`, `npm run policy:check`).
- Updated policy/CI documentation to reflect mandatory verified patch intake and developer/operator remediation flow.

### Git/Story Discrepancy Reconciliation

- Story-scope file changes are captured in `File List` below.
- File list includes all git deltas present in this branch during Story 8.7 implementation, including generated evidence artifacts and dependency symlink entries.

### File List

- _bmad-output/implementation-artifacts/8-7-verified-patch-application-policy.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/test-artifacts/epic-f-performance-evidence.json
- _bmad-output/test-artifacts/epic-f-performance-evidence.md
- _bmad-output/test-artifacts/epic-f-reliability-evidence.json
- _bmad-output/test-artifacts/epic-f-reliability-evidence.md
- _bmad-output/test-artifacts/epic-f-stress-resource-evidence.json
- _bmad-output/test-artifacts/epic-f-stress-resource-evidence.md
- apps/connectshyft-api/node_modules
- apps/connectshyft-web/node_modules
- apps/moneyshyft-api/project.json
- docs/policies/verified_patch_application_policy.md
- docs/policies/git_policy.md
- docs/ci.md
- scripts/verified-patch-apply.sh
- scripts/enforce-verified-patch-intake-guard.sh
- scripts/test-verified-patch-intake.sh
- scripts/enforce-git-policy.sh
- package.json
- tests/api/platform/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.api.spec.ts
- tests/api/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.api.spec.ts
- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts
- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts
- tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.automate.api.spec.ts
- tests/e2e/platform/c-2-thread-ensure-endpoint-with-conflict-safe-idempotency.spec.ts
- tests/support/helpers/connectShyftDbActor.ts

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change D1).
- 2026-03-05: Implemented verified patch governance policy, verified apply tooling, enforcement guardrails, and scenario validation tests.
- 2026-03-05: Fixed review findings: guard self-blocking in PR diff mode, apply-mode test coverage gap, brittle fixture coupling, and explicit git/story discrepancy reconciliation notes.
