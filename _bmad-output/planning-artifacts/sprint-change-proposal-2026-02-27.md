project_lane: connectshyft

# Sprint Change Proposal - ConnectShyft Comms Provider Abstraction

**Date:** 2026-02-27  
**Project:** ConnectShyft  
**Change Trigger:** Twilio is no longer viable as provider; migrate to provider-agnostic Comms Core with Telnyx as V1 provider  
**Workflow:** Correct Course (`_bmad/bmm/workflows/4-implementation/correct-course`)  
**Mode:** Batch

## 1. Issue Summary

### Problem Statement
ConnectShyft planning artifacts and active stories are currently Twilio-bound for SMS, voice, and webhooks. Twilio is no longer an option. If implementation continues on current contracts, we will incur avoidable refactor cost, delay, and vendor lock-in risk.

### Discovery Context
- Trigger is cross-epic and strategic (vendor viability change), not a single bug.
- The issue was identified during active implementation in outbound and webhook lanes.
- Telnyx is selected as replacement for V1, but this correction intentionally introduces a provider abstraction layer to avoid repeating this class of disruption.

### Triggering Story Context
- Primary impact surfaced in `d-1` (outbound call/SMS orchestration) and `e-1` (webhook ingress and routing).
- Scope is broader than those stories and affects Epic A/D/E contracts plus architecture decisions.

### Evidence
- Twilio-coupled language in PRD (`prd-ConnectShyft-2026-02-19.md`) and epics (`epics-ConnectShyft-2026-02-19.md`).
- Twilio-specific architecture decisions and webhook design in `architecture-ConnectShyft-2026-02-19.md`.
- User-approved replacement provider direction: Telnyx.
- Proposed technical artifacts prepared for execution package:
  - `/Users/jeremiahotis/projects/connectshyft/db_schema.sql`
  - `/Users/jeremiahotis/projects/connectshyft/openapi.yaml`
  - `/Users/jeremiahotis/projects/connectshyft/event_schema.md`
  - `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
  - `/Users/jeremiahotis/projects/connectshyft/engineering_tasks.md`

## 2. Impact Analysis

### Epic Impact

#### Epic A - Scoped Access and Operational Configuration
- **Impact:** Medium
- **Why:** Number mapping language is Twilio-specific (`twilio_number_e164`); must become provider-neutral while preserving deterministic routing and tenant uniqueness constraints.

#### Epic C - OrgUnit Inbox and Thread Lifecycle
- **Impact:** Low-Medium
- **Why:** Thread lifecycle remains valid. Minor contract touchpoints needed where call/message states reference provider metadata.

#### Epic D - Policy-Safe Outbound Communication
- **Impact:** High
- **Why:** Outbound call/SMS orchestration currently assumes Twilio integration path. Must route through adapter interface and canonical event model.

#### Epic E - Inbound Webhook Reliability and Voicemail Continuity
- **Impact:** Critical
- **Why:** Entire epic language and AC currently describe Twilio-specific webhook validation and SID dedupe behavior. Must be refactored to provider-agnostic ingress with provider-specific adapters.

#### Epic UX Remediation
- **Impact:** Low
- **Why:** User-facing behavior remains mostly unchanged; copy/telemetry references must not expose vendor-coupled terminology.

### Story Impact (Current Stories Requiring Changes)
- `a-3-orgunit-number-mapping-management`
- `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`
- `d-3-outbound-audit-outbox-and-refusal-envelope-integration`
- `e-1-verified-webhook-ingress-and-deterministic-context-routing`
- `e-2-inbound-sms-processing-with-active-thread-ensure`
- `e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline`
- `e-4-transcription-webhook-attachment-to-voicemail-records`
- `e-5-replay-safe-webhook-receipt-ledger-and-retention-controls`

### New Story Set Required
Add a focused Comms Core abstraction slice:
- `f-1-provider-adapter-interface-and-provider-registry`
- `f-2-canonical-comms-event-model-and-event-store`
- `f-3-provider-leg-message-correlation-fallback-mapping`
- `f-4-telnyx-adapter-implementation-and-cutover-guardrails`

### Artifact Conflicts
- PRD language explicitly ties MVP to Twilio integration and Twilio-only webhooks.
- Epics/FR/NFR clauses are Twilio-SID centric.
- Architecture AD-06, AD-08, AD-09, and webhook pipeline sections are Twilio-specific.
- Existing number mapping schema references `twilio_number_e164` naming.

### Technical Impact
- Data model updates for provider-neutral correlation IDs and provider mappings.
- API contract updates for provider-specific webhook ingress endpoint(s) behind common canonical processing.
- Adapter layer introduction for outbound + inbound event translation.
- Test suite expansion for provider abstraction parity and replay safety across adapters.

## 3. Recommended Approach

### Selected Path
**Hybrid (Direct Adjustment + Cross-Epic Augmentation)**

### Option Evaluation
- **Option 1: Direct Adjustment**
  - Viable: **Yes**
  - Effort: **Medium-High**
  - Risk: **Medium**
  - Notes: Preserve existing epics, modify contracts, insert adapter layer and new stories.

- **Option 2: Potential Rollback**
  - Viable: **No (except targeted rollback if Twilio-specific code lands before guardrails)**
  - Effort: **High**
  - Risk: **High**
  - Notes: Broad rollback would burn velocity and does not improve long-term architecture.

- **Option 3: PRD MVP Review**
  - Viable: **Partially**
  - Effort: **Medium**
  - Risk: **Medium**
  - Notes: MVP can remain intact if provider abstraction is introduced now; no need to cut core scope.

### Rationale
This approach preserves current product outcomes (inbox, thread, escalation, outbound/inbound continuity), replaces provider coupling with a stable abstraction boundary, and prevents a second rewrite when providers change again.

### Estimated Timeline Impact
- **+1 sprint equivalent** for abstraction + migration hardening if executed now.
- **Higher than +1 sprint** if delayed until after more Twilio-specific implementation merges.

## 4. Detailed Change Proposals

## 4.1 Story Changes (Old -> New)

### 4.1.1 Story `a-3-orgunit-number-mapping-management`

**Section:** Story statement + AC

**OLD:**
- "manage multiple Twilio numbers per orgUnit"
- "save valid Twilio E.164 numbers"
- duplicate key wording uses `twilio_number_e164`

**NEW:**
- "manage multiple communication endpoints per orgUnit"
- AC requires `(provider_name, provider_number_e164)` validation and deterministic tenant-safe uniqueness
- keep E.164 validation but remove Twilio-coupled field names

**Rationale:** Decouples routing contracts from vendor-specific schema names.

### 4.1.2 Story `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`

**Section:** Acceptance Criteria

**OLD:**
- Implicit provider-specific call path assumptions

**NEW:**
- Outbound actions call Comms Core provider adapter (`createOutboundCall`, `sendOutboundMessage`)
- Canonical event generation required (`CallAttemptStarted`, `MessageQueued`) before adapter dispatch
- Existing lifecycle rules remain locked (CLOSED reopen, escalation semantics, bridge call behavior)

**Rationale:** Keeps business behavior stable while isolating provider integrations.

### 4.1.3 Story `d-3-outbound-audit-outbox-and-refusal-envelope-integration`

**Section:** Acceptance Criteria

**OLD:**
- Audit/outbox conditions focused on outbound/governance outcomes without provider abstraction requirements

**NEW:**
- AC requires provider operation metadata (provider name, provider IDs) recorded in canonical payloads
- Refusal behavior remains canonical and provider-neutral

**Rationale:** Preserves compliance while adding operational traceability across providers.

### 4.1.4 Story `e-1-verified-webhook-ingress-and-deterministic-context-routing`

**Section:** Story statement + AC

**OLD:**
- "Twilio webhook requests"
- Twilio signature validation wording

**NEW:**
- "Provider webhook requests for active provider adapters"
- AC requires adapter-specific signature verification and canonical normalization before domain handling

**Rationale:** Future-proofs ingress path and keeps security controls explicit per provider.

### 4.1.5 Story `e-2`, `e-3`, `e-4`

**Section:** Acceptance Criteria

**OLD:**
- Inbound SMS/voice/transcription flows are Twilio-webhook phrased

**NEW:**
- Inbound flows operate from canonical events produced by provider adapter
- Domain behavior remains unchanged (active-thread ensure, voicemail artifact creation, transcription attachment)

**Rationale:** Event normalization stabilizes downstream logic and test coverage.

### 4.1.6 Story `e-5-replay-safe-webhook-receipt-ledger-and-retention-controls`

**Section:** Acceptance Criteria

**OLD:**
- Twilio SID-based dedupe only

**NEW:**
- Dedupe key remains `(tenant_id, provider, sid_or_message_id, event_type)` with provider abstraction
- Must support provider-specific identifiers and canonical event IDs

**Rationale:** Maintains replay safety while enabling multi-provider compatibility.

### 4.1.7 New Stories (Epic F - Comms Core Abstraction)

**NEW:**
- `f-1-provider-adapter-interface-and-provider-registry`
- `f-2-canonical-comms-event-model-and-event-store`
- `f-3-provider-leg-message-correlation-fallback-mapping`
- `f-4-telnyx-adapter-implementation-and-cutover-guardrails`

**Rationale:** Contains abstraction implementation work without destabilizing existing epics.

## 4.2 PRD Modifications (Old -> New)

### 4.2.1 Executive Summary / Scope

**OLD:**
- "Twilio-integrated SMS/voice workflows"

**NEW:**
- "provider-agnostic Comms Core workflows with Telnyx as initial provider adapter"

### 4.2.2 FR-CS-021 / FR-CS-021a

**OLD:**
- "All Twilio webhooks must validate signatures..."
- "idempotency using Twilio SID keys..."

**NEW:**
- "All provider webhooks for enabled adapters must validate signatures..."
- "idempotency must use provider event identifiers (SID/message/call/transcription equivalents)"

### 4.2.3 FR-CS-025 and Data Constraints

**OLD:**
- "multiple mapped Twilio numbers"
- `cs_numbers` uniqueness `(tenant_id, twilio_number_e164)`

**NEW:**
- "multiple mapped provider numbers/endpoints"
- uniqueness `(tenant_id, provider_name, provider_number_e164)`

### 4.2.4 Post-MVP Language

**OLD:**
- "Broader channel orchestration beyond Twilio"

**NEW:**
- "Additional provider adapters and routing policies beyond initial Telnyx adapter"

## 4.3 Architecture Changes (Old -> New)

### 4.3.1 Scope Boundary (Section 1.2)

**OLD:**
- "Twilio webhook ingestion and replay-safe idempotency"

**NEW:**
- "Provider webhook ingestion through adapter layer and replay-safe idempotency"

### 4.3.2 AD-06 Webhook Security and Dedupe

**OLD:**
- Twilio-specific signature + SID wording

**NEW:**
- Adapter-specific signature verification contract
- Canonical dedupe strategy across providers

### 4.3.3 AD-08 Idempotency Storage

**OLD:**
- provider key implied Twilio-centric usage

**NEW:**
- provider key becomes first-class abstraction contract; supports Telnyx now, additional providers later

### 4.3.4 AD-09 Inbound Voice Routing

**OLD:**
- "Conference Twilio number" language

**NEW:**
- "Conference provider number" language
- Routing behavior unchanged (active-thread + intake fallback)

### 4.3.5 Webhook Ingestion Pipeline

**OLD:**
1. Verify Twilio signature
2. Extract Twilio SIDs

**NEW:**
1. Resolve provider adapter
2. Verify provider signature
3. Normalize to canonical event
4. Apply idempotency receipt key
5. Continue existing domain flow

## 4.4 UI/UX Specification Updates

- Remove vendor-specific terminology from operator-facing copy.
- Keep existing action semantics and escalation behavior unchanged.
- Ensure any admin/provider configuration UI labels are provider-neutral (with Telnyx as selected default provider in current deployment).

## 4.5 Implementation Evidence Package (Prepared)

The following draft implementation artifacts are attached to this course correction package:
- `/Users/jeremiahotis/projects/connectshyft/db_schema.sql`
- `/Users/jeremiahotis/projects/connectshyft/openapi.yaml`
- `/Users/jeremiahotis/projects/connectshyft/event_schema.md`
- `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
- `/Users/jeremiahotis/projects/connectshyft/engineering_tasks.md`

## 5. Implementation Handoff

### Scope Classification
**Major** (cross-epic contract shifts + architecture abstraction + migration impacts)

### Handoff Recipients
- Product Manager + Architect
- Product Owner / Scrum Master
- Backend Development Team
- Frontend Development Team
- QA / Test Engineering

### Responsibilities

#### Product Manager + Architect
- Approve provider-agnostic language lock across PRD/epics/architecture.
- Approve Epic F insertion and dependency sequencing.
- Lock canonical event and adapter contracts.

#### Product Owner / Scrum Master
- Update backlog ordering to prioritize abstraction before further webhook/outbound story completion.
- Prevent new Twilio-coupled implementation work from entering review.
- Maintain sprint status and dependency graph updates.

#### Backend Development Team
- Implement adapter interface and Telnyx adapter.
- Migrate webhook and outbound orchestration to canonical event pipeline.
- Apply schema and API contract updates.

#### Frontend Development Team
- Align UI contracts with provider-neutral state/labels.
- Keep locked lifecycle behavior and policy guardrails unchanged.

#### QA / Test Engineering
- Add regression coverage for:
  - Provider signature validation and spoof rejection
  - Dedupe behavior across provider identifiers
  - Outbound/inbound lifecycle parity after abstraction
  - Existing locked UX behavior parity

### Execution Sequence (Recommended)
1. Lock artifact language updates (PRD/epics/architecture/UX).
2. Add Epic F and story dependencies in sprint status.
3. Implement `f-1` and `f-2` (adapter contract + canonical events).
4. Implement `f-3` and `f-4` (mapping fallback + Telnyx adapter).
5. Refactor `e-1..e-5` and `d-1/d-3` onto adapter contracts.
6. Run full quality gates and webhook replay/security test pass.

### Success Criteria
- No new Twilio-coupled code paths enter production lane.
- Telnyx works via adapter without changing domain-level lifecycle behavior.
- Contracts and story AC are provider-neutral and testable.
- Future provider addition can occur without domain or UX rewrite.

---

## Workflow Checklist Status Snapshot

### Section 1: Trigger and Context
- `1.1` Trigger story identification: `[x] Done` (cross-epic trigger centered on `d-1` + `e-1`)
- `1.2` Core problem definition: `[x] Done` (strategic vendor viability change)
- `1.3` Evidence collection: `[x] Done`

### Section 2: Epic Impact Assessment
- `2.1` Current epic impact: `[x] Done`
- `2.2` Epic-level changes required: `[x] Done`
- `2.3` Remaining epics reviewed: `[x] Done`
- `2.4` Future epic invalidation/new epic need: `[x] Done` (new Epic F required)
- `2.5` Priority/order adjustments: `[x] Done`

### Section 3: Artifact Conflict Analysis
- `3.1` PRD conflicts: `[x] Done`
- `3.2` Architecture conflicts: `[x] Done`
- `3.3` UI/UX conflicts: `[x] Done`
- `3.4` Other artifacts impact: `[x] Done`

### Section 4: Path Forward
- `4.1` Direct adjustment: `[x] Viable`
- `4.2` Rollback: `[x] Not viable`
- `4.3` MVP review: `[x] Viable (partial)`
- `4.4` Recommendation selected: `[x] Done (Hybrid)`

### Section 5: Proposal Components
- `5.1` Issue summary: `[x] Done`
- `5.2` Impact summary: `[x] Done`
- `5.3` Path rationale: `[x] Done`
- `5.4` MVP/action plan: `[x] Done`
- `5.5` Handoff plan: `[x] Done`

### Section 6 (Finalized)
- `6.1` Final completion review: `[x] Done`
- `6.2` Proposal accuracy review: `[x] Done`
- `6.3` Explicit user approval: `[x] Done` (approved by Jeremiah on 2026-02-27)
- `6.4` Sprint status update: `[x] Done` (`sprint-status-connectshyft.yaml` updated with Epic F and major-scope correction)
- `6.5` Final next-step confirmation: `[x] Done` (handoff routed to PM/Architect, PO/SM, Dev, QA)
