---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/product-brief-ConnectShyft-2026-02-19.md
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
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
workflowType: 'prd'
classification:
  projectType: modular monolith module expansion
  domain: nonprofit communication operations
  complexity: high
  projectContext: brownfield parallel development
---

# Product Requirements Document - ConnectShyft

**Author:** Jeremiah  
**Date:** 2026-02-19

## Executive Summary

ConnectShyft is the communication operations module for the Shyft monolith. It provides orgUnit-scoped inbox, thread, escalation, and Twilio-integrated SMS/voice workflows while preserving strict tenant isolation and platform-kernel guarantees. ConnectShyft must be implemented in parallel with RouteShyft development without introducing cross-module regressions, scope leaks, or policy violations.

The delivery strategy is bounded-context, contract-first, and feature-flagged. The module is governed by explicit workflow/branch rules, additive-first schema changes, and mandatory regression gates against RouteShyft.

## Objectives

1. Deliver reliable, auditable communication execution for volunteers and district staff.
2. Enforce explicit tenancy and orgUnit scoping in every operational action.
3. Provide deterministic escalation and thread ownership behavior.
4. Prevent module interference with RouteShyft through locked delivery constraints.

## Non-Goals

1. ConnectShyft is not a CRM.
2. ConnectShyft is not case management.
3. ConnectShyft is not cross-tenant federation.
4. ConnectShyft is not a general-purpose messaging platform.

## Success Criteria

### User Success

1. `>=95%` communication actions execute with valid tenant + orgUnit context.
2. `>=99%` inbound webhooks validate signature and route deterministically.
3. `100%` outbound SMS to `prefers_texting=NO` includes override reason and audit event.
4. `100%` escalation resets occur only after explicit claim.
5. Unclaimed-thread aging beyond `X` decreases over first 60 days.

### Business/Operational Success

1. ConnectShyft production pilot runs with no RouteShyft regression incidents.
2. Core inbox/escalation workflows are in-system (no shadow spreadsheets or ad hoc thread ownership).
3. Rollout can be safely paused or reversed using module kill-switch flags.

### Technical Success

1. Single active thread rule enforced in DB + service + endpoint contract.
2. Negative scoping tests pass: cross-tenant, cross-orgUnit, orgUnit spoofing.
3. Policy gate remains first blocking CI stage for ConnectShyft stories.

## Product Scope

### MVP In Scope

1. Platform context endpoints integration (active tenant + orgUnit switch).
2. ConnectShyft number mapping and orgUnit escalation configuration.
3. Tenant-scoped neighbor registry and phone records.
4. OrgUnit-scoped inbox and thread lifecycle (ensure, claim, takeover, close).
5. Outbound SMS/call actions with preference enforcement.
6. Twilio SMS/voice/transcription webhook handling with signature validation.
7. Escalation timers (`X -> 2X -> 3X`) with claim-only reset; default `X` is 24 hours and orgUnit-configurable range is 1-24 hours (integer hours only).

### Post-MVP

1. Identity merge enhancements.
2. Additional governance/admin controls.
3. Broader channel orchestration beyond Twilio.

## Users and Roles

### Primary Users

1. Volunteers/operators managing inbound/outbound communications.
2. OrgUnit admins managing number mappings and escalation configuration.
3. Tenant staff handling escalation takeover continuity.

### Secondary Users

1. Platform admins managing tenant/orgUnit context and membership.
2. System admins responsible for tenant provisioning and cross-tenant governance.
3. Compliance/risk stakeholders requiring retention and audit evidence.

### Canonical Role Set (Locked)

1. `SYSTEM_ADMIN`
2. `TENANT_ADMIN`
3. `TENANT_STAFF`
4. `ORGUNIT_ADMIN`
5. `ORGUNIT_MEMBER`
6. `ORGUNIT_IDENTITY_LEAD`

## User Journeys

### Journey A: Inbound to Owned Thread

1. Twilio inbound webhook arrives.
2. System validates signature and resolves `(tenant, orgUnit)` from number mapping.
3. System ensures single active thread for `(tenant_id, org_unit_id, neighbor_id)`.
4. Operator claims thread.
5. Messages/voicemail updates append under same thread.

### Journey B: Outbound Under Preference Rules

1. Operator opens active thread in orgUnit inbox.
2. Operator sends outbound SMS.
3. If `prefers_texting=NO`, system requires override reason and writes override/audit records.
4. Escalation state continues unless thread is explicitly claimed.

### Journey C: Escalation Path

1. Thread remains unclaimed beyond baseline `X` (default `X = 24 hours`; allowed range 1-24 hours, integer hours only).
2. Escalates to Primary at `X`, Secondary at `2X`, Tenant staff at `3X` using hour-based increments.
3. Outbound attempts without claim do not reset escalation.
4. Claim action resets escalation state and cancels pending escalation notifications.

## Functional Requirements

### Context, Access, and Scoping

1. **FR-CS-001**: Every authenticated ConnectShyft request must resolve a valid tenant context.
2. **FR-CS-002**: OrgUnit context is mandatory for orgUnit-scoped endpoints.
3. **FR-CS-003**: OrgUnit context must be validated against tenant and caller membership unless tenant-privileged.
4. **FR-CS-004**: Neighbor registry is tenant-scoped.
5. **FR-CS-004a**: Neighbor identity fields are tenant-scoped and shared across orgUnits; updates are immediately visible across orgUnits within the same tenant.
6. **FR-CS-005**: Threads/messages/voicemails are orgUnit-scoped.

### Neighbor and Phone Governance

6. **FR-CS-006**: Neighbor create/update must persist tenant scope.
7. **FR-CS-007**: Neighbor create requires at least one phone.
8. **FR-CS-008**: Neighbor edits are allowed only for users with active thread relationship in current orgUnit or tenant-privileged role.
9. **FR-CS-008a**: Neighbor edits must be performed under explicit orgUnit context and must include originating `org_unit_id` in audit event metadata.
10. **FR-CS-009**: Neighbor merge operations are role-restricted and audited.
11. **FR-CS-010**: Shared-phone flags are explicit and persisted per phone entry.

### Thread Identity, Lifecycle, and Escalation

11. **FR-CS-011**: Exactly one active thread may exist per `(tenant_id, org_unit_id, neighbor_id)`.
12. **FR-CS-012**: `POST /api/v1/connectshyft/threads` must return existing active thread when present; otherwise create.
13. **FR-CS-013**: Canonical thread state enum is `UNCLAIMED | CLAIMED | CLOSED`.
14. **FR-CS-014**: Escalation progression follows `X -> 2X -> 3X`, where default `X = 24 hours` and orgUnit-configurable range is `1-24 hours` (integer hours only).
15. **FR-CS-015**: Escalation resets only on explicit claim and cancels pending escalation notifications.
16. **FR-CS-016**: Outbound attempts without claim must not reset escalation.
17. **FR-CS-017**: Thread supports metadata fields `last_inbound_cs_number_id` and `preferred_outbound_cs_number_id` (or derived outbound selection from orgUnit config).

### Messaging, Voice, and Webhooks

18. **FR-CS-018**: Inbound SMS webhook appends message and ensures active thread.
19. **FR-CS-019**: Inbound voice webhook creates voicemail artifact and transcription request.
20. **FR-CS-020**: Transcription webhook attaches transcript to voicemail record.
21. **FR-CS-021**: All Twilio webhooks must validate signatures before processing.
22. **FR-CS-021a**: Webhook handlers must implement replay-safe idempotency using Twilio SID keys (message/call/transcription) to prevent duplicate processing.

### Preference and Audit Enforcement

23. **FR-CS-022**: `prefers_texting` enum values must be `UNKNOWN | YES | NO`.
24. **FR-CS-023**: Outbound SMS when `NO` requires override reason; override is persisted and audited.
25. **FR-CS-024**: Critical state transitions and governance actions emit audit/outbox records.

### Number Mapping and Configuration

26. **FR-CS-025**: OrgUnit supports multiple mapped Twilio numbers.
27. **FR-CS-026**: Number mapping uniqueness is enforced per tenant for phone number.
28. **FR-CS-027**: OrgUnit escalation config supports `X` baseline in integer hours (default 24, allowed 1-24) and recipient targets.

## API Contract Requirements

1. All API responses follow shared envelope semantics: success/refusal/error.
2. Platform context endpoints provide active tenant and orgUnit.
3. ConnectShyft endpoints cover numbers/config, neighbors, inbox/threads, and webhooks.
4. Thread ensure endpoint must be idempotent against active-thread uniqueness.
5. Thread state values in API responses must use canonical enum `UNCLAIMED | CLAIMED | CLOSED`.

## Data and Schema Requirements

### Locked Schema Constraints

1. `cs_threads` uniqueness: partial unique on `(tenant_id, org_unit_id, neighbor_id)` where `state != 'CLOSED'`.
2. `cs_number_id` is metadata, not uniqueness dimension for active thread identity.
3. `cs_threads` includes `last_inbound_cs_number_id` (nullable FK).
4. `cs_threads` includes `preferred_outbound_cs_number_id` (nullable FK) or equivalent derived policy.
5. `cs_numbers` unique mapping `(tenant_id, twilio_number_e164)`.
6. Canonical thread state enum in persistence and API is `UNCLAIMED | CLAIMED | CLOSED`.

### Retention

1. SMS and voicemail artifacts follow locked retention policy (24-month baseline from schema spec).

## Non-Functional Requirements

### Security

1. Strict tenant isolation on all data access paths.
2. OrgUnit-scoped enforcement for operational records.
3. Twilio webhook signature validation is mandatory.
4. Immutable audit trail for critical actions.

### Reliability and Integrity

5. Deterministic inbound routing from number mapping.
6. Idempotent thread ensure behavior.
7. Webhook replay protection must ensure duplicate Twilio SID events do not create duplicate messages, voicemails, or thread transitions.
8. Escalation evaluation must be event-scheduled per thread using persisted `next_evaluation_at_utc`; no in-memory timers.
9. Escalation engine behavior must remain consistent across retries and process restarts.
10. No silent state transitions outside audited paths.

### Performance

11. Inbox list and thread detail endpoint responses must meet `p95 <= 750ms` and `p99 <= 1500ms` under expected operational load.
12. Webhook ingestion (signature validation, dedupe, and durable write acceptance) must meet `p95 <= 1000ms` and `p99 <= 2000ms`; end-to-end thread timeline visibility target is `p95 <= 5000ms`.

### Compliance and Governance

13. Retention compliance for communication artifacts.
14. Unauthorized cross-conference sharing is technically blocked.

## Risks and Mitigations

1. **Webhook spoofing** -> enforce signature validation, reject unsigned/invalid payloads.
2. **Scope leakage across orgUnits/tenants** -> repository-level scoping + negative tests.
3. **Escalation misconfiguration** -> validated orgUnit config + admin safeguards.
4. **Thread fragmentation** -> single active thread constraint + ensure endpoint contract.
5. **RouteShyft regression** -> mandatory RouteShyft regression suite on ConnectShyft PRs.

## Parallel Delivery Constraints (Locked)

1. Story branches: `codex/story-<story-id>-<short-slug>`, based from and merged to `codex/dev`.
2. Guard command required for story-scoped workflows:
   - `npm run branch:ensure-workflow -- --workflow <name-or-path> --story <story-key-or-story-file>`
3. Feature flags default OFF in production with kill-switch support.
4. Additive-first migrations; no destructive schema changes during active parallel development.
5. CI policy gate (`npm run policy:check`) is first blocking stage.
6. No direct cross-module imports between ConnectShyft and RouteShyft; integration only via API contracts or domain events.

## Release Strategy

1. Phase 1: Core infrastructure and thread/inbox primitives.
2. Phase 2: Escalation, voicemail, transcription, and hardening.
3. Phase 3: Governance/admin enhancement and production hardening.
4. Rollout by tenant/orgUnit allow-list with monitored KPIs and rollback triggers.

## Dependencies

1. Final UI wireframes.
2. Email templates.
3. Conference list and district escalation recipient list.
4. Twilio credentials and deployment environment decisions.

## Acceptance Gates for Implementation Start

1. PRD approved with frozen thread uniqueness model.
2. Architecture update reflects the same data/contract locks.
3. Epics/stories generated from this PRD include scoping and regression gates.
4. Test strategy includes negative scoping and webhook security coverage.

## Traceability Summary

- Product brief constraints and freeze decisions are treated as non-negotiable implementation requirements.
- API, schema, and escalation semantics are aligned with updated ConnectShyft specifications.
- Parallel-safety requirements are explicit to protect RouteShyft during concurrent delivery.

\
Escalation Reset vs Inactivity Reset (do not conflate)\
Escalation resets ONLY on:\
• Claim\
• Auto-claim created by successful bridge CONNECTED event\
• Reopen tap from CLOSED (Call tap or Send SMS tap) resets escalation_stage to 0 and clears escalation_count\
\
Inactivity (engagement) timer resets ONLY on:\
• Claim\
• Outbound SMS send\
• Call tap (including reopen tap from CLOSED)\
\
Inactivity does NOT reset on:\
• Voicemail-only inbound\
• Missed inbound calls\
• Intake fallback transfer\
\
\
Thread Lifecycle Transitions (locked)\
• CLOSED → UNCLAIMED on outbound tap (Call tap OR Send SMS tap)\
  • Audit/system event: thread_reopened_by_user\
  • escalation_stage resets to 0; escalation_count resets to 0; next_evaluation_at_utc recalculated from now\
  • Inactivity timer resets immediately\
\
Inbound Voice Routing Matrix (locked)\
Condition | Behavior\
---|---\
No active thread | Forward to intake + log intake_fallback_* audit events\
Active UNCLAIMED | Voicemail only (no direct connect)\
Active CLAIMED | Configurable (default allow connect)\
CLOSED | Forward to intake (no auto-reopen)\
\
Bridge Call (primary outbound; no WebRTC / SIP / softphone)\
• Leg 1: system calls volunteer\
• If volunteer answers, Leg 2: system calls neighbor\
• CONNECTED triggers auto-claim (implicit claim)\
• Manual retry only. No automatic redial or retry loops.\
\
Intake Fallback Logging (locked)\
• If inbound call has no active thread: forward to intake and log audit event(s).\
• If a historical thread exists: write a timeline system event on the historical thread (not inbox-visible).\
• Intake fallback does NOT reopen a CLOSED thread and does NOT reset escalation.\
\