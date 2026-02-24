# Story 2.2: Donor Self-Service Pickup Intake with Capacity Check

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a furniture donor,
I want to submit a pickup request and see real scheduling availability,
so that I get a definitive commitment or refusal outcome.

## Acceptance Criteria

1. Given a donor submits eligibility and item details, when capacity is evaluated, then the system returns schedulable slots or explicit refusal with alternatives.
2. Accepted requests create linked commitments.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Donor-facing outcomes must be understandable and final for each submission attempt.
- Real-User Validation Evidence: Donor can submit details and receive slot/refusal response without hidden intermediate state.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No role-admin flows in scope.

## Tasks / Subtasks

- [ ] Implement donor pickup intake endpoint and validation (AC: 1)
  - [ ] Validate eligibility, address/serviceability, and required item metadata.
  - [ ] Normalize intake payload and persist request lifecycle start.
- [ ] Implement capacity evaluation and outcome engine (AC: 1)
  - [ ] Return schedulable slots when capacity constraints pass.
  - [ ] Return refusal with structured alternatives when capacity fails.
- [ ] Link accepted requests to commitments (AC: 2)
  - [ ] Create commitment record atomically with accepted request outcome.
  - [ ] Preserve request-to-commitment lineage ids.
- [ ] Add deterministic test coverage (AC: 1, 2)
  - [ ] API tests for slot path, refusal path, and linked commitment creation.

## Dev Notes

### Story Intent

Enable donor self-service intake that always resolves to a schedulable path or explicit refusal.

### Technical Requirements

- Use unified refusal envelope behavior (`HTTP 200`, `ok=false`) for business outcomes.
- Intake flow must integrate with commitment lifecycle created in Story 2.1.
- No overbooking behavior; capacity checks must be deterministic.

### Architecture Compliance

- Implement within route module boundaries and existing API mount strategy.
- Keep capacity logic centralized for reuse by cashier-assisted intake.

### Library / Framework Requirements

- Existing Node/Express/TypeScript/Knex stack only.

### File Structure Requirements

- Intake service/use case in `src/modules/route/application`.
- Capacity policy logic in `src/modules/route/domain`.
- Persistence adapters in `src/modules/route/infrastructure`.
- Donor intake route/controller in `src/modules/route/api`.

### Testing Requirements

- Validation coverage for required fields and refusal reason formation.
- Contract coverage for slot results and refusal alternatives payload shape.
- Lineage coverage proving accepted requests create linked commitments.

### Project Context Reference

- Pickup workflow is primary Route operating model.
- Route lane only (`project_lane: routeshyft`).

### Project Structure Notes

- Ensure response shape is reusable by cashier-assisted flow to avoid forked logic.

### References

- /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md
- /Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.

### Completion Notes List

- Story created and set to `ready-for-dev`.

### File List

- _bmad-output/implementation-artifacts/2-2-donor-self-service-pickup-intake-with-capacity-check.md

