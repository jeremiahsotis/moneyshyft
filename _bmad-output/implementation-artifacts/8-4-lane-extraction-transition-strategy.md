# Story 8.4: Lane Extraction Transition Strategy

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want a staged lane extraction transition strategy with runtime compatibility bridges,
so that dedicated lane apps can be introduced without breaking existing behavior.

## Acceptance Criteria

1. Lane seams are extracted using mechanical move semantics (`git mv`) into dedicated lane app paths for RouteShyft and ConnectShyft.
2. Transitional host mounting/import bridge keeps current runtime/API behavior stable during extraction.
3. Workspace descriptors, CI paths, scripts, and test filters are updated to recognize extracted lane app locations.
4. Legacy compatibility paths remain operable where required until final cutover stories complete.
5. Policy/workflow gates and changed-test gating pass for the extraction slice.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Transitional structural migration story; no intentional operator UX behavior changes.
- Real-User Validation Evidence: N/A for non-critical structural migration
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control feature in scope.

## Tasks / Subtasks

- [ ] Plan extraction boundaries and sequencing (AC: 1, 2)
  - [ ] Identify RouteShyft and ConnectShyft seams suitable for mechanical moves.
  - [ ] Define temporary mount/import bridge points that preserve runtime behavior.
- [ ] Execute staged extraction (AC: 1, 2, 4)
  - [ ] Perform `git mv` operations into lane-specific app paths.
  - [ ] Implement transitional bridge wiring without behavior refactors.
- [ ] Update workspace and delivery tooling (AC: 3)
  - [ ] Update Nx project descriptors and target command paths.
  - [ ] Update CI/workflow path filters and related script assumptions.
- [ ] Validate compatibility and governance gates (AC: 4, 5)
  - [ ] Verify legacy compatibility paths still resolve during transition.
  - [ ] Run policy, branch/workflow guard, and changed-test gate checks.

## Dev Notes

### Story Intent

Move from single-lane app roots toward lane-specific app boundaries in controlled passes.

### Technical Requirements

- Preserve history via mechanical moves.
- Keep behavior stable; avoid mixed structural + business-logic refactors.
- Maintain temporary runtime bridges until follow-on cutover stories.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change B2.
- Build on Story 8.2 moved app baseline.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/8-2-mechanical-app-moves-with-history-preservation.md`]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change B2).
