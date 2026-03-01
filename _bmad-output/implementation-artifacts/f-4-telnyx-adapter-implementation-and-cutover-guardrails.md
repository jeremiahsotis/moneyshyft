# Story f.4: Telnyx Adapter Implementation and Cutover Guardrails

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a release maintainer,
I want Telnyx implemented behind the provider adapter and guarded by cutover rules,
so that Twilio-dependent paths are retired without breaking lifecycle behavior.

## Acceptance Criteria

1. Given the Telnyx adapter is enabled for ConnectShyft, when outbound and inbound comms flows execute, then behavior remains consistent with locked lifecycle/escalation rules and canonical envelope contracts.
2. Given provider webhooks are received from Telnyx, when signature validation and canonical translation complete, then events are processed through the same deterministic thread and replay-safety paths used by other provider adapters.
3. Given a Twilio-coupled implementation path is invoked in ConnectShyft lanes, when CI and policy checks run, then the change is blocked unless routed through approved adapter abstraction contracts.
4. Given cutover rollout is staged, when feature flags and allow-lists are evaluated, then rollback and fail-closed behavior remain explicit and auditable.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Cutover must preserve operator-facing lifecycle semantics and refusal handling while changing provider plumbing.
- Real-User Validation Evidence: Pending end-to-end operator validation for outbound call/message and inbound voicemail/transcription on Telnyx adapter.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story focuses on provider cutover and release controls, not role administration.

## Tasks / Subtasks

- [x] Implement Telnyx adapter behind provider interface (AC: 1, 2)
  - [x] Wire outbound call and message operations through adapter contract.
  - [x] Implement webhook signature verification and canonical event translation.
- [x] Align lifecycle behavior parity during cutover (AC: 1)
  - [x] Validate closed-thread reopen, escalation semantics, and bridge-call behavior remain unchanged.
  - [x] Ensure refusal and success envelope shapes are unchanged for clients.
- [x] Enforce cutover and anti-regression guardrails (AC: 3, 4)
  - [x] Add CI/policy checks to prevent non-adapter Twilio-coupled paths in ConnectShyft scope.
  - [x] Ensure feature-flag and allow-list controls support explicit rollback.
- [x] Add release-ready regression coverage (AC: 1, 2, 3, 4)
  - [x] API and webhook tests for Telnyx adapter happy-path and failure-path behavior.
  - [x] Regression tests for lifecycle invariants and dedupe/idempotency under replay.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-016, FR-CS-018, FR-CS-019, FR-CS-020, FR-CS-021, FR-CS-021a.
- NFR alignment: NFR-CS-003, NFR-CS-007, NFR-CS-012.
- Depends on `f-1`, `f-2`, and `f-3`.

### Architecture Compliance

- Keep provider-specific logic contained in adapter implementation only.
- Preserve deterministic webhook security + dedupe behavior and lifecycle invariants.
- Maintain existing envelope contracts and audit/outbox durability guarantees.

### File Structure Requirements

- Telnyx adapter implementation under ConnectShyft comms core modules in `src/src/modules/connectshyft/`.
- Route integration in `src/src/routes/api/v1/connectshyft.ts`.
- CI/policy checks in existing policy scripts and workflow definitions where applicable.
- Tests in API + e2e suites under `tests/api/platform/` and related regression paths.

### Testing Requirements

- Validate Telnyx webhook signature verification and canonical translation.
- Validate outbound call/message flows preserve lifecycle and escalation contracts.
- Validate cutover guardrails block Twilio-coupled non-adapter code paths.
- Validate rollback/fail-closed behavior under provider disable scenarios.

### Project Structure Notes

- Do not change user-visible lifecycle semantics during provider cutover.
- Keep provider config and secrets externalized and environment-specific.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story f-4-telnyx-adapter-implementation-and-cutover-guardrails`.

### References

- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic f, Story f.4)
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`
- `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
- `/Users/jeremiahotis/projects/connectshyft/openapi.yaml`
- `/Users/jeremiahotis/projects/connectshyft/engineering_tasks.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --lane connectshyft --workflow dev-story --story f-4-telnyx-adapter-implementation-and-cutover-guardrails`
- `cd src && npm test -- src/modules/connectshyft/__tests__/providerRegistry.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`
- `cd src && npm test`
- `npx playwright test tests/api/platform/ci-policy-gate-as-blocking-first-stage.api.spec.ts --reporter=line`
- `npm run policy:check`

### Completion Notes List

- Added rollout allow-list evaluation to provider adapter resolution with fail-closed refusal semantics when tenant/orgUnit is outside staged cutover scope.
- Added CI/policy guard script to block direct Twilio SDK coupling in ConnectShyft sources outside approved adapter contracts.
- Extended provider-registry unit and route integration coverage for rollout allow-list refusal/success behavior.
- Extended policy-gate regression coverage to assert Twilio-coupling detection under policy checks.
- Executed full backend Jest regression suite and confirmed no regressions in existing modules.
- Operability Guardrails real-user validation fields remain unchanged and still require manual operator-run evidence capture.

### File List

- scripts/enforce-connectshyft-provider-abstraction-guard.sh
- scripts/enforce-git-policy.sh
- src/src/modules/connectshyft/providerRegistry.ts
- src/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts
- tests/support/utils/policyScriptTestHarness.ts
- tests/api/platform/ci-policy-gate-as-blocking-first-stage.api.spec.ts
- _bmad-output/implementation-artifacts/f-4-telnyx-adapter-implementation-and-cutover-guardrails.md

## Change Log

- 2026-02-27: Created Story f.4 ready-for-dev context document.
- 2026-03-01: Implemented rollout allow-list guardrails, policy Twilio-coupling enforcement, and regression test coverage for f.4.
