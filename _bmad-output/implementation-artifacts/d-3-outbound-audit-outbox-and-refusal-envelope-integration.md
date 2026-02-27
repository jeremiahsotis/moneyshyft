# Story d.3: Outbound Audit, Outbox, and Refusal Envelope Integration

Status: ready-for-dev

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

- [ ] Consolidate outbound/governance mutation persistence into atomic write flows (AC: 1)
  - [ ] Ensure audit + outbox records persist in same transaction boundary as successful state mutation.
  - [ ] Include canonical metadata (tenant/orgUnit/thread/actor/action/prior/new state).
- [ ] Standardize refusal envelope taxonomy for outbound/governance paths (AC: 2)
  - [ ] Use shared refusal helpers and policy-specific reason codes/messages.
  - [ ] Guarantee refused operations perform no partial write of domain, audit, or outbox data.
- [ ] Preserve lifecycle lineage for reopen-on-outbound paths (AC: 3)
  - [ ] Ensure `thread_reopened_by_user` and related lifecycle metadata are propagated to audit/outbox payloads.
  - [ ] Ensure reopened transitions carry prior/new-state provenance.
- [ ] Add developer-facing guardrails for envelope and event consistency (AC: 1, 2, 3)
  - [ ] Document required event names, payload fields, and refusal contract expectations.
  - [ ] Prevent one-off route-specific envelope drift.
- [ ] Add integration and contract tests for traceability semantics (AC: 1, 2, 3)
  - [ ] Success-path tests verifying atomic domain + audit + outbox persistence.
  - [ ] Refusal-path tests verifying no side effects.
  - [ ] Reopen-path tests verifying lifecycle lineage metadata in emitted artifacts.

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
  - https://www.twilio.com/docs/events/event-delivery-and-duplication
  - https://www.twilio.com/docs/usage/webhooks/webhooks-security
  - https://www.twilio.com/docs/messaging/guides/webhook-request

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

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
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (Sections 4.1.2 and 4.2)
- `src/src/routes/api/v1/connectshyft.ts` (lifecycle side-effects and outbound route handling)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n "audit|outbox|refusal" src/src/routes/api/v1/connectshyft.ts` (pass)
- `rg -n "FR-CS-024" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (pass)

### Completion Notes List

- Created implementation-ready Story d.3 context with atomic audit/outbox persistence requirements and refusal no-side-effect guarantees.

### File List

- _bmad-output/implementation-artifacts/d-3-outbound-audit-outbox-and-refusal-envelope-integration.md

## Change Log

- 2026-02-27: Created Story d.3 ready-for-dev context document.
