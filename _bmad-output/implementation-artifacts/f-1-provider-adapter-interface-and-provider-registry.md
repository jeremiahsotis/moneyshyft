# Story f.1: Provider Adapter Interface and Provider Registry

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want a provider adapter interface and provider registry,
so that outbound and inbound communication flows can run without provider-specific branching in domain logic.

## Acceptance Criteria

1. Given Comms Core executes outbound or inbound operations, when provider resolution runs, then operations dispatch through a provider adapter interface with deterministic selection for enabled providers.
2. Given a provider is disabled or missing, when a comms operation is attempted, then the system returns a deterministic refusal with no partial writes.
3. Given adapter contracts are consumed by ConnectShyft routes/services, when domain logic is reviewed, then Twilio-specific branching is removed from business handlers and replaced by adapter interface calls.
4. Given provider resolution returns a refusal for an operator-triggered comms action, when ConnectShyft contracts return the result, then refusal metadata is explicit and actionable for operators and confirms no hidden lifecycle mutation occurred.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Provider dispatch must fail closed with actionable refusal metadata so operators are not left in ambiguous comms states.
- Real-User Validation Evidence: Pending API contract run validating provider selection and fail-closed refusal behavior.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story defines backend abstraction boundary; no new role-administration workflow.

## Tasks / Subtasks

- [ ] Define provider adapter interface and shared DTO contracts (AC: 1, 3)
  - [ ] Add adapter methods for outbound call, outbound message, webhook handling, and canonical event translation.
  - [ ] Define deterministic error/refusal contract for unavailable provider scenarios.
- [ ] Implement provider registry and resolution policy (AC: 1, 2)
  - [ ] Add registry for enabled providers with deterministic default selection.
  - [ ] Return refusal on disabled/unregistered provider requests with no side effects.
- [ ] Integrate registry with ConnectShyft comms entry points (AC: 1, 3)
  - [ ] Replace provider-specific branching in route/service layer with registry-dispatched adapter calls.
  - [ ] Preserve shared envelope semantics (`success`, `refusal`, `error`).
- [ ] Preserve operator-usable refusal outcomes in action contracts (AC: 4)
  - [ ] Ensure refusal payloads include deterministic reason codes/messages consumed by existing ConnectShyft action clients.
  - [ ] Ensure refusal paths do not introduce hidden state transitions in thread lifecycle fields.
- [ ] Add contract and regression tests (AC: 1, 2, 3, 4)
  - [ ] Unit tests for registry selection and unavailable-provider refusal handling.
  - [ ] API tests ensuring no partial writes when provider resolution fails.
  - [ ] Contract tests asserting refusal metadata remains explicit and operator-actionable.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-021, FR-CS-021a, FR-CS-025.
- NFR alignment: NFR-CS-003, NFR-CS-007, NFR-CS-012.
- Story dependency root for Epic F and prerequisite for `f-2`, `f-3`, `f-4`.

### Architecture Compliance

- Keep provider abstraction in ConnectShyft bounded context with no direct cross-module mutation paths.
- Preserve deterministic refusal behavior and audit/outbox integrity on provider resolution failures.
- Keep provider-specific logic encapsulated behind adapter interface.

### File Structure Requirements

- Adapter interface and registry module: `src/src/modules/connectshyft/` (new comms core submodule recommended).
- Route/service integration path: `src/src/routes/api/v1/connectshyft.ts` and related application services.
- Tests under `src/src/modules/connectshyft/__tests__/` and `tests/api/platform/`.

### Testing Requirements

- Validate deterministic provider selection for enabled providers.
- Validate refusal with no partial writes when provider is unavailable/disabled.
- Validate route/service layer no longer branches on provider-specific types directly.
- Validate refusal envelopes contain operator-usable reason metadata and no hidden lifecycle mutation.

### Project Structure Notes

- Do not add hardcoded provider constants in domain handlers.
- Keep adapter registration configuration-driven and environment-safe.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story f-1-provider-adapter-interface-and-provider-registry`.

### References

- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic f, Story f.1)
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`
- `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
- `/Users/jeremiahotis/projects/connectshyft/openapi.yaml`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story f.1 context defining provider adapter and registry contracts.

### File List

- _bmad-output/implementation-artifacts/f-1-provider-adapter-interface-and-provider-registry.md

## Change Log

- 2026-02-27: Created Story f.1 ready-for-dev context document.
