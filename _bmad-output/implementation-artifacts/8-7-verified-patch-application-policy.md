# Story 8.7: Verified Patch Application Policy

Status: ready-for-dev

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

- [ ] Define patch intake workflow and controls (AC: 1, 3)
  - [ ] Document preflight checks (`git apply --check`, target existence, parse validation).
  - [ ] Define remediation classes: apply-clean, repair-stale, rebuild-malformed, defer-structural.
- [ ] Implement tooling/automation support (AC: 2, 5)
  - [ ] Add scripts/checks to enforce verified apply pathways and diagnostics.
  - [ ] Add policy/CI hooks to prevent blind patch application workflows.
- [ ] Address known patch quality cases from proposal evidence (AC: 2, 3, 4)
  - [ ] Encode handling guidance for `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08` patch classes.
  - [ ] Ensure invalid JSON patch content is fixed prior to eligible application.
- [ ] Validate governance workflow (AC: 5)
  - [ ] Run policy/workflow guard checks against positive and negative patch-intake scenarios.
  - [ ] Document expected operator/developer remediation actions.

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

TBD

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change D1).
