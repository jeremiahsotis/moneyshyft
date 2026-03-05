# Story 8.5: Shared-Contact-Safe Dedupe Contract

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want shared-contact-safe dedupe rules for identity matching,
so that auto-merge behavior avoids identity corruption and escalates ambiguous cases for manual resolution.

## Acceptance Criteria

1. Auto-merge is allowed only for verified, non-shared exact contact-point matches.
2. Shared or unverified contact points never auto-merge identities.
3. Ambiguous matches return deterministic refusal/error code `IDENTITY_MATCH_AMBIGUOUS` with manual-resolution context.
4. Identity dedupe decision paths are audited and test-covered for shared/unverified edge cases.
5. Existing explicit/manual merge workflows remain intact and compatible with the new dedupe contract.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Operator workflows require explicit ambiguity outcomes and manual-resolution guidance.
- Real-User Validation Evidence: Manual validation notes required before closeout
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Identity governance scope, but no role-admin UI path change in this story.

## Tasks / Subtasks

- [ ] Define and codify dedupe decision matrix (AC: 1, 2, 3)
  - [ ] Implement verified/non-shared auto-merge eligibility rules.
  - [ ] Implement explicit ambiguous/no-auto-merge outcomes for shared or unverified points.
- [ ] Wire deterministic refusal/error contract (AC: 3)
  - [ ] Return `IDENTITY_MATCH_AMBIGUOUS` with actionable metadata for manual handling.
  - [ ] Preserve existing manual-merge paths.
- [ ] Add observability and audit hooks (AC: 4)
  - [ ] Persist audit/event records for dedupe decisions and ambiguous outcomes.
  - [ ] Ensure logs avoid leaking sensitive identity data.
- [ ] Add automated and manual validation (AC: 4, 5)
  - [ ] Add tests for shared/unverified/verified contact-point permutations.
  - [ ] Document operator manual test steps for ambiguity resolution flow.

## Dev Notes

### Story Intent

Introduce a safe dedupe contract that supports real-world shared-contact scenarios without unsafe auto-merges.

### Technical Requirements

- Keep dedupe deterministic and idempotent.
- Avoid implicit merge side effects on ambiguous signals.
- Keep existing explicit merge workflow as the authoritative conflict-resolution path.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change C1.
- Respect existing neighbor/shared-phone governance in ConnectShyft implementation.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/b-2-shared-tenant-identity-and-shared-phone-indicators.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.md`]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change C1).
