# Story 2.3: Cashier-Assisted Intake and Voucher Delivery Scheduling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As cashier staff,
I want to create donor requests by phone and schedule voucher deliveries at checkout,
so that low-tech users and recipients get consistent in-system outcomes.

## Acceptance Criteria

1. Given staff enters intake/scheduling details, when they submit, then the same validation, capacity, and refusal rules as public intake apply.
2. Resulting requests link to commitments or refusal outcomes.
3. Given cashier staff submit or correct intake details, when validation/refusal occurs, then operator-facing feedback is immediate, actionable, and parity-aligned with donor flow.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Staff flow must provide clear form feedback and deterministic submit outcomes.
- Real-User Validation Evidence: Cashier can execute phone intake and voucher scheduling with the same policy outcomes as donor flow.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story is operational workflow, not role administration.

## Tasks / Subtasks

- [ ] Build cashier-assisted intake path reusing donor intake domain rules (AC: 1)
  - [ ] Implement operator-oriented input contract for phone intake and checkout scheduling.
  - [ ] Reuse shared validation and refusal helpers from Story 2.2.
- [ ] Support voucher delivery scheduling constraints (AC: 1)
  - [ ] Enforce pickup-first policy while permitting constrained delivery insertion rules.
  - [ ] Return explicit refusal/alternatives when delivery constraints fail.
- [ ] Ensure terminal request outcome linkage (AC: 2)
  - [ ] Create commitment linkage for accepted paths.
  - [ ] Persist refusal outcome when commitment cannot be formed.
- [ ] Add coverage for parity and regressions (AC: 1, 2)
  - [ ] API tests that compare donor vs cashier outcomes under identical inputs.

## Dev Notes

### Story Intent

Provide staff-assisted intake without introducing policy divergence from donor self-service intake.

### Technical Requirements

- Shared rule engine for validation, capacity, and refusal logic across intake channels.
- Voucher delivery path must still resolve to explicit commitment/refusal outcomes.
- Avoid duplicate business logic between donor and cashier channels.

### Architecture Compliance

- Channel-specific API adapters should call shared route application services.
- Keep reusable intake/capacity logic in `domain` + `application`, not controllers.

### Library / Framework Requirements

- Existing stack only; no new framework additions needed.

### File Structure Requirements

- Cashier route/controller in `src/src/routes/api/v1/*.ts` delegating into route services.
- Shared intake services in `src/src/modules/route/application`.
- Policy logic in `src/src/modules/route/domain`.

### Testing Requirements

- Parity tests proving donor and cashier paths produce same acceptance/refusal rules.
- Contract tests for refusal alternatives and commitment linkage behavior.

### Project Context Reference

- Route lane only (`project_lane: routeshyft`).
- Cashier-assisted flow must remain policy-consistent with public intake.

### Project Structure Notes

- Centralize intake orchestration to make future Epic 3 scheduling reuse straightforward.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md` (Epic 2 > Story 2.3)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md` (cashier intake and voucher scheduling requirements)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md` (Stack, Module Layout)]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.

### Completion Notes List

- Story created and set to `ready-for-dev`.

### File List

- _bmad-output/implementation-artifacts/2-3-cashier-assisted-intake-and-voucher-delivery-scheduling.md
