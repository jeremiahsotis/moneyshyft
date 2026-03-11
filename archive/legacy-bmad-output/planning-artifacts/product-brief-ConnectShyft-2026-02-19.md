---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - /Users/jeremiahotis/Downloads/ConnectShyft_Updated_Tasks.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_Updated_Schema.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_Updated_NFRs.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_Updated_Functional_Requirements.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_Updated_Full_Spec.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_Updated_Architecture.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_Proposed_Schema_vNext.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_API_Endpoint_Contracts.pdf
  - /Users/jeremiahotis/Downloads/09_Additional_Developer_Inputs.pdf
  - /Users/jeremiahotis/Downloads/06_Risk_Map_Legal_Operational.pdf
  - /Users/jeremiahotis/Downloads/05_Risk_and_Threat_Model.pdf
  - /Users/jeremiahotis/Downloads/02_Build_Phases.pdf
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
date: 2026-02-19
author: Jeremiah
---

# Product Brief: ConnectShyft

## Executive Summary

ConnectShyft is the communication operations module in the Shyft monolith, focused on structured SMS/voice workflows for volunteer and district teams. The module must run in parallel with RouteShyft development without destabilizing the platform, routing domain, or release flow. The core product objective is reliable, auditable communication execution within strict Tenant isolation and explicit OrgUnit scoping, using explicit orgUnit context, strict scoping enforcement, and durable escalation controls.

ConnectShyft will ship as a bounded, flag-gated module with explicit API contracts, tenancy-safe schema, and staged rollout controls to avoid regressions in RouteShyft or shared kernel behavior.

---

## Core Vision

### Problem Statement

Current communication operations are fragmented across ad hoc SMS, calls, and manual escalation processes. Teams lack a canonical, scoped thread model tied to the platform's tenant/orgUnit model, resulting in missed follow-up, unclear ownership, and weak auditability.

### Problem Impact

- Communication handoffs are inconsistent and hard to trace.
- Escalation ownership is ambiguous and brittle.
- Cross-org leakage risk increases when scope boundaries are not explicit.
- Operational trust declines when claim state and escalation behavior are inconsistent.

### Why Existing Solutions Fall Short

- Generic messaging tools are not tenancy- and orgUnit-aware by default.
- Existing workflows do not enforce claim-driven escalation resets.
- SMS preference governance and override auditability are often policy-only, not enforced by system behavior.
- Manual inbox and routing patterns break under multi-org operational scale.

### Proposed Solution

Deliver ConnectShyft as a platform-aligned module with:

- Tenant-scoped neighbor registry and orgUnit-scoped threads/messages/voicemail.
- Explicit active orgUnit context requirement for operational actions.
- `prefers_texting` enforcement (`UNKNOWN | YES | NO`) with mandatory override logging when `NO`.
- Escalation model `X -> 2X -> 3X`, clearing only on explicit claim.
- Single active thread per neighbor per orgUnit to prevent fragmented conversation state.
- Twilio webhook signature validation and deterministic inbound routing via number mapping.
- Shared envelope/refusal semantics and outbox-backed audit/event integrity.

### Key Differentiators

- Native fit with hierarchical tenancy (Tenant hard boundary, OrgUnit soft boundary).
- Contract-first API design with explicit context semantics.
- Governance encoded in behavior (preference overrides, immutable audit paths).
- Parallel-safe release model (feature flags + branch/CI policy lock) for coexistence with RouteShyft.

## Target Users

### Primary Users

1. Conference volunteers and operators handling inbound/outbound communication.
2. OrgUnit admins configuring escalation and number mappings.
3. District staff handling escalation takeovers and cross-team continuity.

### Secondary Users

1. Platform administrators managing tenant/orgUnit membership and context controls.
2. Compliance/risk stakeholders requiring retention, auditability, and scope guarantees.
3. Engineering teams maintaining shared kernel and module boundaries.
4. System administrators responsible for tenant provisioning and cross-tenant governance.

### User Journey

1. User enters authenticated session with active tenant and explicit orgUnit context.
2. User opens ConnectShyft inbox filtered to orgUnit-scoped thread states.
3. User claims/takes thread, sends SMS/call actions under preference rules.
4. System tracks escalation clocks (`X/2X/3X`) and only resets on claim.
5. Twilio inbound events resolve number-to-(tenant, orgUnit), append thread artifacts, and preserve audit trail.
6. User closes thread with complete message/voicemail traceability.

## Success Metrics

### User Success Outcomes

- `>= 95%` of communication actions execute with valid tenant+orgUnit context.
- `>= 99%` of inbound webhook events pass signature validation and deterministic routing.
- `100%` of outbound SMS to `prefers_texting=NO` include override reason + audit event.
- `100%` of escalation resets occur only after claim events.
- Reduction in unclaimed-thread aging beyond `X` window over first 60 days.

### Business Objectives

- Enable production-ready communication operations without introducing RouteShyft regressions.
- Preserve monolith integrity via bounded context and explicit module interfaces.
- Deliver MVP capability in phased releases that can be paused or rolled back by feature flag.

### Key Performance Indicators

- Inbox throughput: median time from inbound event to first claim.
- Escalation performance: count of threads reaching `2X`/`3X` by orgUnit.
- Policy conformance: override-log completeness and scope-enforcement refusal rates.
- Reliability: webhook processing success rate and retry exhaustion count.
- Regression safety: RouteShyft smoke suite pass rate on ConnectShyft PRs.
- Escalation integrity: outbound attempts without claim do not suppress escalation progression.

## MVP Scope

### Core Features

1. Platform context endpoints and explicit orgUnit switching integration.
2. ConnectShyft number mapping and orgUnit escalation config endpoints.
3. Tenant-scoped neighbors and phone records with required phone-at-create enforcement.
4. OrgUnit-scoped inbox, thread lifecycle, claim/takeover, close flows.
5. Outbound SMS/call actions with `prefers_texting` enforcement and override logs.
6. Twilio SMS/voice/transcription webhook ingestion with signature verification.
7. Escalation timers for `X/2X/3X` and claim-only reset behavior.
8. Neighbor governance enforcement:
   - Neighbor edits are restricted to users with an active thread relationship in the current orgUnit or tenant-privileged roles.
   - Merge operations are role-restricted and audited.
   - Shared-phone handling is enforced via explicit phone flags and audited mutation paths.
9. Thread identity and routing rules:
   - Unique active thread constraint is `(tenant_id, org_unit_id, neighbor_id)` (partial unique where state != `CLOSED`).
   - Multiple Twilio numbers per orgUnit remain supported; number is routing metadata, not uniqueness dimension.
   - Thread creation endpoint returns existing active thread if present; otherwise creates a new one.

### Out of Scope for MVP

1. Cross-tenant delegation models.
2. Advanced analytics dashboards beyond core operational KPIs.
3. Billing/checkout implementation (billing account structure only).
4. Non-Twilio channel expansion.

### MVP Success Criteria

- Contract tests pass for all MVP endpoints and context rules.
- Scoping negative tests pass (cross-tenant, cross-orgUnit, spoofed orgUnit).
- RouteShyft regression checks remain green across ConnectShyft merge windows.
- Pilot orgUnits can operate inbox + escalation + preference governance end-to-end.
- Single-active-thread rule is enforced in DB constraint, service logic, and endpoint contract.

### Future Vision

1. Identity merge and advanced governance controls.
2. Deeper admin tooling and policy automation.
3. Broader omnichannel communication orchestration.
4. Expanded district-level operational insights and planning signals.

## Build Phases

### Phase 1: Core Infrastructure

- Auth/role alignment to tenant+orgUnit context.
- Twilio integration baseline (SMS + call bridge).
- Inbox/thread UI primitives.
- Neighbor registry CRUD.

### Phase 2: Escalation and Voicemail

- Escalation timer jobs (`X/2X/3X`).
- Notification integrations.
- Voicemail recording and transcription flow.
- Auto-close job behavior.

### Phase 3: Identity and Governance

- Identity merge and stronger admin controls.
- Audit hardening and security pass.
- Production hardening and resilience improvements.

## RouteShyft-Safe Parallel Delivery Constraints (LOCKED)

### 1) Branch and Workflow Policy Lock

- Story branches must follow `codex/story-<story-id>-<short-slug>` and base from `codex/dev`.
- One PR per story; merge target remains `codex/dev`.
- Story-scoped BMAD workflows (`create-story`, `dev-story`, `code-review`, `atdd`, `automate`) require:
  - `npm run branch:ensure-workflow -- --workflow <name-or-path> --story <story-key-or-story-file>`
- No story-scoped execution on `master` or mismatched story branches.

### 2) Module Boundary Lock

- ConnectShyft and RouteShyft remain separate bounded contexts.
- No direct cross-module table coupling; integration only through explicit APIs/events.
- Shared kernel changes are delivered as dedicated platform stories before module adoption.

### 3) Feature Flag Lock

- All ConnectShyft runtime entry points must be guarded by module flags (`connectshyft_enabled`, plus sub-flags for inbox, escalation, webhook ingestion as needed).
- Default flags are OFF in production until validation gates pass.
- Kill-switch required for inbound processing and outbound send paths.

### 4) Data Migration and Schema Safety Lock

- Additive-first migrations only during parallel RouteShyft work.
- Backfill + dual-write (if needed) before any contract/removal step.
- Scope and uniqueness constraints are enforced at DB level (tenant/orgUnit, active-thread uniqueness, number mapping uniqueness).

### 5) Testing and CI Lock

- Policy gate (`npm run policy:check`) is first blocking CI stage.
- ConnectShyft PRs must run targeted module tests plus RouteShyft regression suite.
- Required negative tests: cross-tenant access, cross-orgUnit access, orgUnit spoofing.
- Webhook security tests (signature validation and replay-handling) are mandatory.

### 6) Release and Rollout Lock

- Phased rollout by tenant/orgUnit allow-list.
- Observability includes escalation lag, webhook failures, refusal rates, and override frequency.
- Any RouteShyft-impacting regression triggers immediate flag rollback and issue quarantine.

## Escalation Behavior Semantics (LOCKED)

- Outbound communication attempts do not stop escalation; only explicit claim changes escalation state.
- Escalation clocks continue running on unclaimed threads even when outbound attempts exist.

## Architectural Freeze Decisions (Required Before PRD Sign-off)

1. Thread uniqueness in orgUnit with multiple numbers:
   - Frozen decision: enforce one active thread per `(tenant_id, org_unit_id, neighbor_id)`.
   - `cs_number_id` is metadata, not part of active-thread uniqueness.
   - Add `last_inbound_cs_number_id` (nullable FK) for most recent inbound number.
   - Add `preferred_outbound_cs_number_id` (nullable FK) or derive outbound number from orgUnit config.
   - DB enforces partial unique on `(tenant_id, org_unit_id, neighbor_id)` where `state != 'CLOSED'`.
   - `POST /api/v1/connectshyft/threads` must return existing active thread when present; otherwise create.
2. Outbound-without-claim behavior:
   - Locked behavior: outbound attempts do not reset escalation; only claim resets escalation.

## Non-Goals (Explicit)

- ConnectShyft is not a CRM.
- ConnectShyft is not case management.
- ConnectShyft is not cross-tenant federation.
- ConnectShyft is not a general-purpose messaging platform.

## Open Inputs Required Before PRD

- Final UI wireframes.
- Email template content and delivery policy.
- Definitive conference list and district escalation recipient list.
- Twilio account/environment credentials and deployment target decisions.
