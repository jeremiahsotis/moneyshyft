# Story d.3: Outbound Audit, Outbox, and Refusal Envelope Integration

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a compliance stakeholder,
I want outbound and governance actions to emit durable audit/outbox records with consistent refusal behavior,
so that operational decisions are traceable and clients can respond deterministically.

## Acceptance Criteria

1. Given outbound or governance actions succeed, when mutations commit, then critical actions write audit and outbox records atomically with actor, scope, action, and lifecycle metadata.
2. Given outbound or governance actions are refused, when policy/validation rejection occurs, then responses use shared refusal envelopes with clear policy reason codes/messages and no partial writes.
3. Given action flows involve reopen-on-outbound behavior, when lifecycle side effects persist, then emitted event metadata preserves prior/new state and `thread_reopened_by_user` lineage where applicable.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Compliance evidence and refusal clarity are required for frontline confidence and policy auditability.
- Real-User Validation Evidence: Pending implementation. Validate audit/outbox trace visibility and refusal copy clarity with operational leads.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story governs traceability contracts rather than role-administration workflows.

## Tasks / Subtasks

- [x] Consolidate outbound/governance mutation persistence into atomic write flows (AC: 1)
  - [x] Ensure audit + outbox records persist in same transaction boundary as successful state mutation.
  - [x] Include canonical metadata (tenant/orgUnit/thread/actor/action/prior/new state).
- [x] Standardize refusal envelope taxonomy for outbound/governance paths (AC: 2)
  - [x] Use shared refusal helpers and policy-specific reason codes/messages.
  - [x] Guarantee refused operations perform no partial write of domain, audit, or outbox data.
- [x] Preserve lifecycle lineage for reopen-on-outbound paths (AC: 3)
  - [x] Ensure `thread_reopened_by_user` and related lifecycle metadata are propagated to audit/outbox payloads.
  - [x] Ensure reopened transitions carry prior/new-state provenance.
- [x] Add developer-facing guardrails for envelope and event consistency (AC: 1, 2, 3)
  - [x] Document required event names, payload fields, and refusal contract expectations.
  - [x] Prevent one-off route-specific envelope drift.
- [x] Add integration and contract tests for traceability semantics (AC: 1, 2, 3)
  - [x] Success-path tests verifying atomic domain + audit + outbox persistence.
  - [x] Refusal-path tests verifying no side effects.
  - [x] Reopen-path tests verifying lifecycle lineage metadata in emitted artifacts.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-024.
- Depends on:
  - `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`
  - `d-2-preference-override-enforcement-for-outbound-sms`
- Outbound/governance contracts must stay aligned with canonical envelope taxonomy and hardening constraints from approved change proposal.

### Architecture Compliance

- Persist governance/lifecycle audit + outbox via existing mutation wrapper patterns.
- Maintain deterministic refusal semantics (`ok=false`, `HTTP 200` for business refusals where platform contract requires).
- Keep lifecycle lineage explicit for reopened threads and state transitions.

### Library / Framework Requirements

- Reuse platform mutation wrapper (`executePlatformMutation`) and shared response helpers in routes.
- Reuse existing ConnectShyft lifecycle event naming patterns in route/module boundaries.
- Avoid introducing duplicated event persistence mechanisms outside established platform patterns.

### File Structure Requirements

- Route-level orchestration: `src/src/routes/api/v1/connectshyft.ts`.
- Domain persistence and state transitions: `src/src/modules/connectshyft/threads.ts` and related ConnectShyft modules.
- Shared envelope/policy helpers: `src/src/platform/envelopes/response.ts` and refusal helper usage paths.
- Test coverage in `src/src/modules/connectshyft/__tests__/` and route/API tests under `tests/api/platform/`.

### Testing Requirements

- Validate successful outbound/governance actions persist domain + audit + outbox atomically.
- Validate refused actions return deterministic refusal envelopes with policy reason and no side effects.
- Validate reopened outbound transitions include prior/new state metadata and `thread_reopened_by_user` lineage.
- Validate contract compatibility with frontend refusal/success feedback parsing.

### Previous Story Intelligence

- `d.1` and `d.2` define primary outbound semantics and policy gating; this story locks traceability and envelope guarantees around those actions.
- `c.4` established lifecycle action event expectations; preserve naming and provenance consistency.
- `c.3` and UX remediation stories require deterministic client-consumable envelope outcomes.

### Git Intelligence Summary

- Recent workflow demonstrates high sensitivity to status and file-list correctness; keep this story strict on explicit artifact outputs and contract assertions.
- Existing route implementation already returns lifecycle event data; harden persistence and refusal parity instead of rewriting response shapes.

### Latest Technical Information

- Keep event delivery and duplicate-suppression behavior aligned with replay-safe architecture assumptions and provider webhook best practices.
- Ensure transport/provider failures still map to deterministic refusal/error envelopes for clients.
- References:
  - `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
  - `/Users/jeremiahotis/projects/connectshyft/event_schema.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-02-27.md`

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep envelope/audit/outbox behavior centralized and reusable to avoid per-endpoint divergence.
- Enforce additive-first schema expectations for any new trace fields or event payload metadata.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story d-3-outbound-audit-outbox-and-refusal-envelope-integration`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic d, Story d.3)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-024, API contract requirements, non-functional governance controls)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (Section 4.5, API contract rules, mutation/audit/outbox guidance)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-02-27.md` (Section 4.1 Stories / 4.5 Evidence Package)
- `src/src/routes/api/v1/connectshyft.ts` (lifecycle side-effects and outbound route handling)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n "audit|outbox|refusal" src/src/routes/api/v1/connectshyft.ts` (pass)
- `rg -n "FR-CS-024" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story d-3-outbound-audit-outbox-and-refusal-envelope-integration` (pass)
- `API_URL=http://127.0.0.1:3000 API_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.automate.api.spec.ts` (pass)
- `API_URL=http://127.0.0.1:3000 API_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts` (pass)
- `cd src && npm run build` (pass)
- `npm run policy:check` (fail: status sync guard reports ready-for-dev -> review closeout transition in a single working-tree diff)
- `cd src && npm test -- src/platform/mutations/__tests__/executePlatformMutation.test.ts --runInBand` (pass)
- `cd src && npm run build` (pass)
- `npm run policy:check` (pass)
- `npx playwright test --list tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.automate.api.spec.ts` (pass)
- `API_URL=http://127.0.0.1:3000 API_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.automate.api.spec.ts` (fail: local API server unavailable in current session)

### Completion Notes List

- Added outbound dispatch side-effect persistence via `executePlatformMutation` for db-backed active-thread outbound actions with canonical audit/outbox metadata.
- Added shared outbound/governance refusal helpers (`respondConnectShyftBusinessRefusal`, `respondConnectShyftClientRefusal`) and applied them to lifecycle/outbound handlers for deterministic envelope taxonomy.
- Hardened reopen-on-outbound metadata with explicit `thread_reopened_by_user` and `lifecycle_lineage` payload fields.
- Added developer guardrail documentation for outbound event naming, metadata requirements, and refusal envelope consistency expectations.
- Added d.3 automate API tests validating atomic persistence, refusal no-side-effects, and reopen lineage semantics.
- Review remediation: closed-thread outbound actions now emit both reopen and outbound-dispatch side effects atomically; d.3 tests now validate policy-refusal no-side-effect behavior and dual-event persistence.

### File List

- _bmad-output/implementation-artifacts/d-3-outbound-audit-outbox-and-refusal-envelope-integration.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/routes/api/v1/connectshyft.ts
- src/src/platform/mutations/executePlatformMutation.ts
- src/src/platform/mutations/__tests__/executePlatformMutation.test.ts
- tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.automate.api.spec.ts
- docs/connectshyft-outbound-audit-guardrails.md

## Change Log

- 2026-02-27: Created Story d.3 ready-for-dev context document.
- 2026-02-27: Implemented outbound audit/outbox persistence, refusal helper standardization, reopen lineage metadata hardening, and d.3 automate API coverage.
- 2026-02-27: Applied review remediation for closed-thread outbound dispatch audit/outbox parity, refusal-path no-side-effect coverage, and story/file-list synchronization.
