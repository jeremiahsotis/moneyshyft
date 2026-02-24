project_lane: connectshyft

{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 ---\
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]\
inputDocuments:\
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md\
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md\
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/product-brief-ConnectShyft-2026-02-19.md\
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md\
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md\
workflowType: 'architecture'\
project_name: 'ConnectShyft'\
user_name: 'Jeremiah'\
date: '2026-02-19'\
lastStep: 8\
status: 'complete'\
completedAt: '2026-02-19'\
---\
\
# Architecture Decision Document - ConnectShyft (v2)\
\
_This document locks implementation architecture for ConnectShyft and is intended to prevent agent/team drift during parallel RouteShyft + ConnectShyft delivery._\
\
**Author:** Jeremiah  \
**Date:** 2026-02-19  \
**Status:** Complete (v2 edits: DB schema + migration path normalization)\
\
---\
\
## 1. Context and Scope\
\
### 1.1 Problem Context\
\
ConnectShyft adds communication operations (SMS/voice/thread/escalation) inside the existing Shyft modular monolith. The module must coexist with active RouteShyft development and cannot introduce cross-module regressions, boundary leaks, or policy violations.\
\
### 1.2 Scope Boundary\
\
In scope:\
1. ConnectShyft domain model and APIs.\
2. Twilio webhook ingestion and replay-safe idempotency.\
3. Escalation scheduling and claim semantics.\
4. Tenant/orgUnit enforcement and governance controls.\
5. Feature-flagged rollout with CI and policy gates.\
\
Out of scope:\
1. CRM expansion.\
2. Cross-tenant federation.\
3. Generic messaging platform features.\
4. Service decomposition/microservice split.\
\
---\
\
## 2. Fixed Architecture Constraints\
\
1. Runtime remains monolithic Node/Express TypeScript app in current repository layout.\
2. Shared envelope contracts remain platform-standard (`success`, `refusal`, `error`).\
3. Hard isolation boundary is `tenant_id`; soft operational boundary is `org_unit_id`.\
4. ConnectShyft and RouteShyft are bounded contexts with no direct cross-module imports.\
5. Delivery must comply with `docs/policies/git_policy.md` branch/workflow/CI rules.\
\
---\
\
## 3. Canonical Decisions (Frozen)\
\
### AD-01: Module Boundary and Code Ownership\
\
Decision:\
1. Introduce ConnectShyft under dedicated module paths:\
   1. `src/src/modules/connectshyft/domain`\
   2. `src/src/modules/connectshyft/application`\
   3. `src/src/modules/connectshyft/infrastructure`\
2. API surface remains routed from `src/src/routes/api/v1/connectshyft.ts`.\
3. RouteShyft integration only through API contracts or domain events; no direct imports from RouteShyft internals.\
\
Rationale:\
- Enforces independent evolution and limits regression blast radius.\
\
### AD-02: Canonical Thread State Model\
\
Decision:\
1. Canonical thread enum is exactly: `UNCLAIMED | CLAIMED | CLOSED`.\
2. No additional operational states are permitted in persistence or API without PRD revision.\
\
Rationale:\
- Prevents state drift (`ACTIVE`, `ON_HOLD`, etc.) and keeps UX/logic aligned.\
\
### AD-03: Active Thread Identity\
\
Decision:\
1. Single active thread uniqueness is `(tenant_id, org_unit_id, neighbor_id)` where state is not `CLOSED`.\
2. `POST /api/v1/connectshyft/threads` performs ensure semantics:\
   1. Attempt insert under the partial uniqueness constraint.\
   2. On uniqueness conflict, fetch and return the existing active thread.\
   3. Do not use check-then-insert logic.\
3. `cs_number_id` is metadata only, not a uniqueness dimension.\
\
Rationale:\
- Eliminates split-context threads and ambiguous escalation ownership.\
\
### AD-04: Neighbor Identity and Governance\
\
Decision:\
1. Neighbor identity is tenant-scoped and shared across orgUnits in same tenant.\
2. Neighbor edits require:\
   1. Active-thread relationship in current orgUnit, or\
   2. Tenant-privileged role.\
3. All neighbor edits must include originating orgUnit metadata in audit events.\
4. Merge operations are role-restricted and audited.\
\
Rationale:\
- Supports canonical identity while preserving provenance and governance.\
\
### AD-05: Escalation Engine Semantics\
\
Decision:\
1. Escalation progression is `X -> 2X -> 3X`.\
2. `X` is measured in integer hours with default `X = 24` and allowed configuration range `1-24`.\
3. Outbound communication attempts do not reset escalation.\
4. Claim resets escalation and cancels pending escalation notifications.\
5. Escalation evaluation is event-scheduled per thread via persisted `next_evaluation_at_utc`.\
6. No in-memory timers are allowed for authoritative escalation decisions.\
\
Rationale:\
- Ensures restart-safe deterministic behavior and operational clarity.\
\
### AD-06: Webhook Security and Dedupe\
\
Decision:\
1. All Twilio webhooks must pass signature validation before processing.\
2. Handlers must be replay-safe/idempotent using Twilio SID keys.\
3. Duplicate webhook events must not create duplicate domain timeline entries.\
\
Rationale:\
- Protects against spoofing/replay and avoids duplicate operational artifacts.\
\
### AD-07: ConnectShyft Schema Namespace and Naming\
\
Decision:\
1. Postgres schema for ConnectShyft is `connectshyft`.\
2. ConnectShyft table naming convention remains `cs_*`.\
3. ConnectShyft migrations are located at `src/db/migrations/connectshyft/*`.\
4. Knex `search_path` includes `connectshyft` for ConnectShyft repositories only.\
\
Rationale:\
- Preserves modular schema boundaries while minimizing rename churn from existing specs.\
\
### AD-08: Webhook Idempotency Storage\
\
Decision:\
1. Webhook idempotency uses `connectshyft.cs_webhook_receipts`.\
2. Unique key shape is `(tenant_id, provider, sid, event_type)`.\
3. Receipt ledger records are retained for 180 days.\
\
Rationale:\
- Provides deterministic replay safety with bounded storage growth.\
\
\
### AD-09: Inbound Voice Routing via Active-Thread + Intake Fallback (LOCKED)\
\
Decision:\
1. The central intake number `(260) 456-3561` remains in Teams (not ported to Twilio).\
2. Conferences use ConnectShyft (Twilio) for outbound voice/SMS and for inbound routing on Conference Twilio numbers.\
3. Inbound calls to a **Conference Twilio number** are routed by **caller ID match** and **active-thread state**:\
   1. If no active thread exists for `(tenant_id, org_unit_id, neighbor_id)` -> **intake fallback transfer** to `(260) 456-3561`.\
   2. If active thread state is `UNCLAIMED` -> **voicemail only** (no ring to an individual).\
   3. If active thread state is `CLAIMED` -> route per orgUnit configuration: `voicemail_only | ring_group | bridge`.\
4. Intake fallback transfers must be recorded as audit events and appear as system timeline events on the most recent related thread when a neighbor is identified.\
5. Webhook handlers return **HTTP 403** on invalid Twilio signatures (fail closed). (Plan exists to switch to `200` only if Twilio retry storms become a problem.)\
\
Rationale:\
- Preserves call center control while allowing Conferences to execute follow-up and continuity.\
- Avoids IVR/vendor change costs in Teams.\
- Keeps inbound routing deterministic without requiring ServWare integration.\
\
### AD-10: Inactivity Auto-Close Window (LOCKED)\
\
Decision:\
1. Threads auto-close after an inactivity window that is **configurable per orgUnit**, default **14 days**.\
2. Window is integer days only.\
3. Auto-close transitions a thread to `CLOSED`, emits audit/outbox records, and does **not** send an SMS.\
4. A new outbound after close creates a new active thread under the existing single-active-thread constraint.\
\
Rationale:\
- Ensures threads naturally decay without requiring strict office hours or manual close discipline.\
- Prevents old threads from capturing new needs indefinitely.\
\
---\
\
## 4. Data Architecture\
\
### 4.1 Database Schema Namespace (LOCKED)\
\
Decision:\
1. All ConnectShyft tables live in the **Postgres schema**: `connectshyft`.\
2. Table names **retain** the `cs_` prefix for consistency with existing specs and to reduce rename churn.\
\
Implications:\
- ConnectShyft migrations are located at: `src/db/migrations/connectshyft/*`\
- Knex `search_path` includes `connectshyft` for ConnectShyft repositories only.\
\
### 4.2 Primary Tables (ConnectShyft)\
\
Schema: `connectshyft`\
\
1. `connectshyft.cs_numbers`\
2. `connectshyft.cs_org_unit_config`\
3. `connectshyft.cs_neighbors`\
4. `connectshyft.cs_neighbor_phones`\
5. `connectshyft.cs_threads`\
6. `connectshyft.cs_messages`\
7. `connectshyft.cs_voicemails`\
8. `connectshyft.cs_sms_preference_overrides`\
9. `connectshyft.cs_webhook_receipts` (receipt ledger for idempotency)\
\
### 4.3 Required `cs_threads` Fields\
\
Minimum contract fields:\
1. `tenant_id`, `org_unit_id`, `neighbor_id`\
2. `state` (`UNCLAIMED|CLAIMED|CLOSED`)\
3. `claimed_by_user_id` (nullable)\
4. `escalation_stage`, `escalation_count`\
5. `next_evaluation_at_utc` (nullable; authoritative scheduler field)\
6. `last_inbound_cs_number_id` (nullable FK)\
7. `preferred_outbound_cs_number_id` (nullable FK or derived by config)\
8. `last_activity_at_utc`, `created_at_utc`, `updated_at_utc`\
\
### 4.4 Required Indexes and Constraints\
\
1. Partial unique active-thread index:\
   1. `(tenant_id, org_unit_id, neighbor_id)` where `state != 'CLOSED'`.\
2. Inbound number uniqueness:\
   1. `(tenant_id, twilio_number_e164)` on `cs_numbers`.\
3. Scheduler index:\
   1. `(state, next_evaluation_at_utc, org_unit_id)` for due-thread scans.\
4. Webhook receipt dedupe unique index:\
   1. `(tenant_id, provider, sid, event_type)` on `cs_webhook_receipts`.\
\
### 4.5 Retention and Audit\
\
1. SMS and voicemail artifacts follow locked retention baseline (24 months).\
2. Governance and lifecycle mutations must write platform events + outbox atomically via existing mutation wrapper patterns.\
3. Webhook receipt ledger records are retained for 180 days.\
4. Relationship-gated neighbor edit permission is an architectural risk control to reduce unintended tenant-wide identity changes.\
\
---\
\
## 5. API Architecture\
\
### 5.1 Route Groups\
\
1. Platform context:\
   1. `GET /api/v1/platform/context`\
   2. `POST /api/v1/platform/context/org-unit`\
2. ConnectShyft config:\
   1. `GET/POST /api/v1/connectshyft/numbers`\
   2. `GET/PUT /api/v1/connectshyft/config`\
   3. `GET/POST /api/v1/connectshyft/ring-groups`\
   4. `GET/PUT /api/v1/connectshyft/ring-groups/:ringGroupId`\
   5. `POST /api/v1/connectshyft/ring-groups/:ringGroupId/members`\
   6. `DELETE /api/v1/connectshyft/ring-groups/:ringGroupId/members/:userId`\
3. Neighbors:\
   1. `GET/POST /api/v1/connectshyft/neighbors`\
   2. `GET/PUT /api/v1/connectshyft/neighbors/:neighborId`\
4. Threads:\
   1. `GET /api/v1/connectshyft/inbox`\
   2. `POST /api/v1/connectshyft/threads`\
   3. `GET /api/v1/connectshyft/threads/:threadId`\
   4. `POST /api/v1/connectshyft/threads/:threadId/claim`\
   5. `POST /api/v1/connectshyft/threads/:threadId/takeover`\
   6. `POST /api/v1/connectshyft/threads/:threadId/sms`\
   7. `POST /api/v1/connectshyft/threads/:threadId/call`\
   8. `POST /api/v1/connectshyft/threads/:threadId/close`\
5. Webhooks:\
   1. `POST /api/v1/connectshyft/webhooks/sms`\
   2. `POST /api/v1/connectshyft/webhooks/voice`\
   3. `POST /api/v1/connectshyft/webhooks/voicemail-transcription`\
\
### 5.2 API Contract Rules\
\
1. Thread responses only emit canonical state enum values.\
2. Thread ensure endpoint is idempotent and safe under concurrent requests via insert-under-constraint then conflict-fetch strategy.\
3. Refusal semantics use shared envelope contract.\
4. OrgUnit-scoped endpoints reject absent/invalid orgUnit context.\
\
---\
\
## 6. Escalation Scheduler Design\
\
### 6.1 Execution Model\
\
Decision:\
1. A deterministic job loop evaluates due threads based on persisted `next_evaluation_at_utc`.\
2. Job claims work in small batches with row-level locking:\
   - Postgres: `SELECT ... FOR UPDATE SKIP LOCKED`\
3. Each evaluation runs in a transaction:\
   1. Re-read thread state/owner.\
   2. Exit if not `UNCLAIMED`.\
   3. Advance escalation stage when due.\
   4. Enqueue notifications/events.\
   5. Persist next evaluation timestamp or null when terminal.\
4. Escalation intervals are computed from configured integer-hour baseline `X` (default 24, range 1-24).\
\
### 6.2 Claim Interaction\
\
1. Claim action transaction updates:\
   1. state to `CLAIMED`\
   2. owner assignment\
   3. escalation stage reset\
   4. `next_evaluation_at_utc = NULL`\
2. Pending escalation notifications are suppressed by design:\
   - No pre-scheduled notifications are persisted.\
   - Notifications are only enqueued during evaluation transactions after re-validating current thread state.\
\
---\
\
## 7. Webhook Ingestion Design\
\
### 7.1 Pipeline\
\
1. Verify Twilio signature.\
2. Extract canonical event identity (`MessageSid`, `CallSid`, transcription SID).\
3. Deduplicate by SID key using `connectshyft.cs_webhook_receipts`.\
4. Resolve `(tenant, orgUnit)` through number mapping.\
5. Ensure active thread.\
6. Persist message/voicemail artifacts.\
7. Emit audit/event records.\
\
\
\
#### Inbound voice call routing (Conference Twilio numbers)\
\
After signature validation + idempotency receipt insert:\
1. Resolve `(tenant_id, org_unit_id)` by number mapping.\
2. Identify neighbor by caller ID match within tenant (phone record) and validate orgUnit scope.\
3. Apply routing decision:\
   - No active thread -> transfer to intake fallback `(260) 456-3561`.\
   - Active thread `UNCLAIMED` -> voicemail only.\
   - Active thread `CLAIMED` -> orgUnit-configured mode (`voicemail_only | ring_group | bridge`).\
4. Record audit + timeline system events for fallback transfers and routing decisions.\
\
### 7.2 Dedupe Strategy\
\
Selected default:\
- Dedicated receipt ledger table `connectshyft.cs_webhook_receipts` with unique `(tenant_id, provider, sid, event_type)`.\
\
---\
\
## 8. Authorization and Role Enforcement\
\
1. `SYSTEM_ADMIN` defaults to provisioning surfaces; no operational inbox by default.\
2. `TENANT_STAFF` may handle stage-3 escalation within tenant scope.\
3. `ORGUNIT_MEMBER` limited to orgUnit-scoped operational actions.\
4. `ORGUNIT_IDENTITY_LEAD` required for sensitive identity merge operations.\
5. Authorization checks are enforced server-side at endpoint and service layers.\
6. Authorization is capability-based; role-to-capability mapping source of truth is `src/src/platform/rbac/capabilities.ts` and is enforced server-side.\
\
---\
\
## 9. Frontend Architecture Contracts\
\
1. Context bar must always show active tenant and orgUnit.\
2. Thread header must always show orgUnit name to prevent cross-context mistakes.\
3. Inbox sort contract is deterministic:\
   1. Stage 3 -> Stage 2 -> Stage 1 -> Unescalated.\
   2. Within same stage: oldest `UNCLAIMED` first.\
   3. For `CLAIMED`: most recent activity first.\
4. If user attempts new thread for neighbor with active thread, route to existing thread and show non-disruptive notice.\
5. Escalation countdown in UI is informational; backend scheduler is authoritative.\
\
---\
\
## 10. Feature Flags and Rollout\
\
1. Required flags:\
   1. `connectshyft_enabled`\
   2. Optional sub-flags: `connectshyft_inbox_enabled`, `connectshyft_escalation_enabled`, `connectshyft_webhooks_enabled`\
2. Production defaults are OFF until validation gates pass.\
3. Kill-switch required for inbound processing and outbound actions.\
4. Rollout by tenant/orgUnit allow-list.\
\
---\
\
## 11. Test Architecture and Quality Gates\
\
### 11.1 Test Layers\
\
1. Unit tests:\
   1. Thread state machine\
   2. escalation calculation\
   3. preference enforcement\
2. Integration/API tests:\
   1. orgUnit/tenant scoping refusals\
   2. ensure endpoint idempotency\
   3. claim/takeover/close transitions\
3. Webhook tests:\
   1. signature validation\
   2. replay-safe dedupe\
4. Scheduler tests:\
   1. due-evaluation progression\
   2. claim suppression semantics\
5. Performance budget tests:\
   1. inbox/thread endpoint latency budgets (`p95 <= 750ms`, `p99 <= 1500ms`)\
   2. webhook ingestion budgets (`p95 <= 1000ms`, `p99 <= 2000ms`)\
   3. end-to-end timeline visibility budget (`p95 <= 5000ms`)\
6. Regression tests:\
   1. RouteShyft smoke/regression suite runs on ConnectShyft PRs\
\
### 11.2 Mandatory CI Gates\
\
1. `npm run policy:check` first blocking stage.\
2. ConnectShyft-targeted tests pass.\
3. RouteShyft regression gates pass.\
4. Module boundary lint rule blocks imports from `modules/route` into `modules/connectshyft` (and vice versa).\
\
---\
\
## 12. Implementation Sequence (Recommended)\
\
1. Establish module scaffolding and route registration.\
2. Add core schema/migrations with frozen constraints (schema: `connectshyft`, tables: `cs_*`).\
3. Implement context + role guards for ConnectShyft routes.\
4. Implement neighbor and thread ensure/claim lifecycle.\
5. Implement outbound preference enforcement and audit writes.\
6. Implement webhook pipeline with receipt ledger dedupe.\
7. Implement deterministic escalation scheduler.\
8. Add UX-linked API fields and sort contracts.\
9. Complete test matrix and CI gate enforcement.\
10. Roll out by feature flags and allow-list.\
\
---\
\
## 13. Architecture Acceptance Checklist\
\
1. Canonical state enum locked end-to-end.\
2. Single active thread partial unique constraint in place.\
3. Ensure endpoint idempotency validated under concurrency.\
4. Escalation scheduling uses persisted `next_evaluation_at_utc` with no in-memory timers.\
5. Twilio signature + SID dedupe enforced via `connectshyft.cs_webhook_receipts`.\
6. No direct ConnectShyft-to-RouteShyft imports (and vice versa), enforced in CI.\
7. Feature flags + rollout + rollback controls implemented.\
8. PRD and UX frozen constraints trace to tests and code paths.\
}