# RouteShyft Brownfield -> BMAD Monolith Execution Plan

Date: 2026-02-17

## Goal
Convert the existing brownfield repo into a BMAD-driven monolith program while implementing the Shyft Platform phased plan (0 -> 6) with strict platform-kernel-first sequencing.

## Inputs Ingested
- docs/routeshyft/RouteShyft_Monolith_PRD.md
- docs/routeshyft/RouteShyft_Architecture_Document.md
- docs/routeshyft/RouteShyft_Functional_Requirements.md
- docs/routeshyft/RouteShyft_Non_Functional_Requirements.md
- docs/routeshyft/RouteShyft_API_Spec.md
- docs/routeshyft/RouteShyft_Epics_and_Stories.md
- docs/routeshyft/RouteShyft_Developer_Task_Breakdown.md
- docs/routeshyft/RouteShyft_WP_to_Monolith_Cutover_Plan.md
- docs/routeshyft/RouteShyft_CI_CD_Addendum.md
- docs/routeshyft/RouteShyft_UX_Design_Specification.md
- docs/routeshyft/RouteShyft_Media_Subsystem_Spec.md
- docs/routeshyft/RouteShyft_Implementation_Binder.md
- docs/routeshyft/route_schema.sql
- docs/routeshyft/001_create_route_schema.ts

## BMAD Conversion Approach (Brownfield)
1. Baseline project context from existing code (brownfield reality first).
2. Normalize requirements/architecture docs into BMAD canonical artifacts.
3. Validate implementation readiness before writing migration-heavy code.
4. Execute phased stories with BMAD story workflows and QA gates.

## BMAD Workflow Map
1. `document-project`: scan existing codebase and produce baseline docs.
2. `generate-project-context`: produce concise guardrails for all future stories.
3. `edit-prd` (or `create-prd` if needed): merge RouteShyft docs into one canonical PRD.
4. `create-architecture`: converge on one canonical architecture decision doc.
5. `create-epics-and-stories`: generate execution-ready epics in strict phase order.
6. `check-implementation-readiness`: adversarial pre-implementation gate.
7. `sprint-planning`: generate sprint-status tracking from epics/stories.
8. Per story: `create-story` -> `dev-story` -> `code-review` -> `qa-automate` / `testarch-*` as needed.

## Monolith Kernel Implementation Targets (Phase 0)
Use current backend layout (`src/src`) and add a clear platform kernel boundary:

- `src/src/platform/tenancy/*`:
  - `resolveTenant` middleware
  - tenant query helpers
- `src/src/platform/auth/*`:
  - session model/service (refresh rotation)
  - cookie + csrf helpers
- `src/src/platform/events/*`:
  - event writer
  - outbox writer/dispatcher contract
- `src/src/platform/http/envelope.ts`:
  - `success`, `refusal`, `systemError`
- `src/src/migrations/*`:
  - platform.sessions
  - platform.events
  - platform.outbox
  - tenant_id hardening migrations

## Phase-by-Phase Delivery Contract
1. Phase 0: tenancy, auth hardening, csrf, outbox/events, envelope helpers.
2. Phase 1: OperationShift entities + templates + `operations.fulfillment_requested` event.
3. Phase 2: RouteShift bridge endpoints, WP as thin consumer, no dual-write.
4. Phase 3: ResourceShift backend + public/staff APIs + integration hooks.
5. Phase 4: handoff lifecycle + capacity model.
6. Phase 5: FriendShift connector (integration, not rewrite).
7. Phase 6: consent/crisis/policy/alignment gating for cross-org scale.

## Governance Rules
- No cross-module direct calls; communicate through events/outbox contracts.
- Every mutation emits a domain event.
- Multi-tenant correctness is mandatory (`tenant_id` resolution and filtering on all queries).
- Business refusals return HTTP 200 with `ok=false`.
- WP remains thin UI only where explicitly required.

## Immediate Next Execution Steps
1. Run BMAD `document-project` to capture current-state architecture and constraints.
2. Run BMAD `generate-project-context` to lock coding rules for all stories.
3. Run BMAD `create-architecture` to finalize kernel and module boundaries.
4. Run BMAD `create-epics-and-stories` seeded with this phase plan.
5. Start implementation with Phase 0 story set only.
