# Story 2.2: Donor Self-Service Pickup Intake with Capacity Check

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a furniture donor,
I want to submit a pickup request and see real scheduling availability,
so that I get a definitive commitment or refusal outcome.

## Acceptance Criteria

1. Given a donor submits eligibility and item details, when capacity is evaluated, then the system returns schedulable slots or explicit refusal with alternatives.
2. Accepted requests create linked commitments.
3. Given a donor receives a schedulable or refusal outcome, when they review the result, then next steps and reasons are clearly visible in UI/API payloads.

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

- [x] Implement donor pickup intake endpoint and validation (AC: 1)
  - [x] Validate eligibility, address/serviceability, and required item metadata.
  - [x] Normalize intake payload and persist request lifecycle start.
- [x] Implement capacity evaluation and outcome engine (AC: 1)
  - [x] Return schedulable slots when capacity constraints pass.
  - [x] Return refusal with structured alternatives when capacity fails.
- [x] Link accepted requests to commitments (AC: 2)
  - [x] Create commitment record atomically with accepted request outcome.
  - [x] Preserve request-to-commitment lineage ids.
- [x] Add deterministic test coverage (AC: 1, 2)
  - [x] API tests for slot path, refusal path, and linked commitment creation.

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

- Intake service/use case in `src/src/modules/route/application`.
- Capacity policy logic in `src/src/modules/route/domain`.
- Persistence adapters in `src/src/modules/route/infrastructure`.
- Donor intake route/controller in `src/src/routes/api/v1/*.ts` delegating into route application services.

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

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md` (Epic 2 > Story 2.2)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md` (intake, capacity, refusal requirements)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md` (Stack, Module Layout)]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cd src && npm test -- --runInBand src/src/modules/route/__tests__/capacityPolicy.test.ts src/src/routes/api/v1/__tests__/route.test.ts`
- `cd src && npm test -- --runInBand`

### Completion Notes List

- Implemented RouteShyft donor intake backend in `src/src/modules/route` with separated application/domain/infrastructure/api layers.
- Added deterministic capacity policy with explicit refusal alternatives and no-overbooking slot checks.
- Added donor self-service route controller and v1 route adapter at `/api/v1/route/intake/donor-requests` with unified business refusal envelope behavior.
- Added atomic accepted-path request-to-commitment linkage persistence with lineage IDs and idempotency-key replay support.
- Added backend automated coverage for accepted slot path, refusal path, linked commitment detail retrieval, validation refusal behavior, cross-tenant scope enforcement, and idempotent replay.
- Updated kernel route-registration contract expectation to include the new `/api/v1/route` module mount.

### File List

- src/src/modules/route/domain/capacityPolicy.ts
- src/src/modules/route/infrastructure/inMemoryRouteIntakeStore.ts
- src/src/modules/route/application/donorIntakeService.ts
- src/src/modules/route/api/donorIntakeController.ts
- src/src/routes/api/v1/route.ts
- src/src/routes/api/v1/__tests__/route.test.ts
- src/src/modules/route/__tests__/capacityPolicy.test.ts
- src/src/api/registerRoutes.ts
- src/src/__tests__/app-entrypoint-kernel.test.ts
- _bmad-output/implementation-artifacts/2-2-donor-self-service-pickup-intake-with-capacity-check.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
