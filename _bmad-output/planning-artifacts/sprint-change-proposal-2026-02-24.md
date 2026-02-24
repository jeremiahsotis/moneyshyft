# Sprint Change Proposal - ConnectShyft UX/UI Course Correction

**Date:** 2026-02-24  
**Project:** ConnectShyft  
**Change Trigger:** Cross-epic UX remediation trigger  
**Workflow:** Correct Course (`_bmad/bmm/workflows/4-implementation/correct-course`)  
**Mode:** Incremental

## 1. Issue Summary

### Problem Statement
User testing indicates ConnectShyft's current interface is not workable for core users, including seniors and non-technical operators. Users were unable to comfortably navigate or understand the interface well enough to complete primary tasks.

### Discovery Context
- Trigger is cross-epic (not isolated to one story).
- Evidence includes user-test outcomes, attached UI screenshots, and authoritative UX artifacts provided by product leadership.
- The issue is systemic usability and interaction-contract failure, not a localized UI defect.

### Evidence Sources
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-ux.specification.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/UX - UI Redesign/full-view-flow.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/UX - UI Redesign/implementation-locked production specification.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-engineering-task-breakdown.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-openapi.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-db-migration-sql.md`
- Attached reference UI imagery (mobile screens and full-view flow boards)

## 2. Impact Analysis

### Epic Impact

#### Epic A - Scoped Access and Operational Configuration
- **Impact:** Medium
- **Reason:** Context visibility and clarity patterns require UX-level refinement in operational surfaces.

#### Epic B - Neighbor Identity Governance
- **Impact:** Medium
- **Reason:** Add/Edit Neighbor flows need stronger usability and plain-language interaction constraints.

#### Epic C - OrgUnit Inbox and Thread Lifecycle
- **Impact:** Critical
- **Reason:** Core Inbox/Mine/Thread interaction model is the primary failure surface.

#### Epic D - Policy-Safe Outbound Communication
- **Impact:** Critical
- **Reason:** Outbound action semantics (Call/Text/Claim/Close), closed-thread reopen behavior, and preference override UX must be explicit and deterministic.

#### Epic E - Inbound Webhook Reliability and Voicemail Continuity
- **Impact:** Medium-High
- **Reason:** Backend ingestion outcomes must map correctly to UI behavior (voicemail indicators, thread movement rules, timeline markers).

### Story Impact
- Existing stories requiring modification:
  - `c-3-inbox-and-thread-detail-read-contracts`
  - `c-4-claim-takeover-and-close-lifecycle-actions`
  - `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`
  - `d-2-preference-override-enforcement-for-outbound-sms`
  - `d-4-operator-interaction-contracts-for-outbound-safety`
- New story set required for explicit UX remediation:
  - `ux-r1-mobile-first-inbox-mine-thread-redesign`
  - `ux-r2-accessibility-and-language-hardening`
  - `ux-r3-voicemail-and-indicator-behavior`
  - `ux-r4-outbound-policy-guardrail-ui`

### Artifact Conflicts
- Current PRD, architecture, and UX docs contain partial interpretation drift versus locked behavior artifacts.
- Conflicts centered on:
  - CLOSED outbound behavior
  - voicemail handling in Mine vs Inbox
  - escalation stage exposure in UI
  - envelope taxonomy consistency

### Technical Impact
- API read contract changes (explicit sort keys/rank mapping and timeline markers)
- Story AC tightening for deterministic UI behavior
- Potential schema/contract clarifications for priority ranking and voicemail indicators
- Increased frontend implementation scope (mobile-first, accessibility hardening)
- Regression test expansion for UX-state parity and behavior locks

## 3. Recommended Approach

### Selected Approach
**Hybrid:** Direct Adjustment + targeted backlog reorganization

### Rationale
- Existing epics remain valid and should not be discarded.
- The highest-value path is to tighten story acceptance contracts and add a dedicated UX remediation slice.
- This avoids full replanning while still treating UX failure as a first-class correction.

### Option Evaluation Summary
- **Option 1 (Direct Adjustment):** Viable, medium effort, medium risk
- **Option 2 (Rollback):** Not preferred, high effort, high disruption
- **Option 3 (MVP Review):** Partially viable if UX remediation fails, currently unnecessary

### Effort / Risk / Timeline
- **Effort:** Medium-High
- **Risk:** Medium
- **Timeline Impact:** Moderate schedule extension to execute UX remediation before downstream feature expansion

## 4. Detailed Change Proposals (Approved)

## 4.1 Stories

### 4.1.1 Tighten `c-3` read contract into explicit UX behavior contract

**Story:** `c-3-inbox-and-thread-detail-read-contracts`

**OLD:**
- Generic orgUnit-scope and metadata requirements
- Generic deterministic ordering statement

**NEW:**
- Deterministic ordering contract:
  - `ORDER BY priority_rank ASC, last_activity_at_utc DESC, thread_id ASC`
- Priority rank mapping:
  - `stage>=3 -> 1`
  - `stage=2 -> 2`
  - `stage=1 -> 3`
  - `new_unread -> 4`
  - `other -> 5`
- UI label mapping (engine-hidden):
  - `stage 0 -> no label`
  - `stage 1 -> Needs attention soon`
  - `stage 2+ -> Needs urgent attention`
- Voicemail behavior on claimed thread:
  - remains in Mine, indicator appears (dot/icon), no forced inbox move
- Thread state action contract:
  - `UNCLAIMED: Call/Text/Claim`
  - `CLAIMED: Call/Text/Close`
  - `CLOSED: Call/Send Message` (outbound tap reopen semantics)

**Justification:** Aligns implementation to locked UX behavior and removes interpretation drift.

### 4.1.2 Add closed-thread reopen semantics to outbound and lifecycle stories

**Stories:** `d-1`, `d-2`, `c-4`

**OLD:**
- Partial/implicit reopen semantics

**NEW:**
- Outbound from CLOSED (Call or Send Message):
  - `CLOSED -> UNCLAIMED` on same thread
  - emit `thread_reopened_by_user`
  - reset escalation stage/count and recalc `next_evaluation_at_utc`
  - reset `last_engagement_at_utc`
  - execute outbound action
- Inbound to CLOSED:
  - no auto-reopen
  - voice routes to intake fallback
- Bridge call constraints:
  - bridge-call-only outbound voice
  - no auto-retry loops
  - auto-claim only on CONNECTED

**Justification:** Critical usability and behavior consistency requirement from locked spec.

### 4.1.3 Add dedicated cross-epic UX remediation story set

**NEW STORIES:**
- `ux-r1-mobile-first-inbox-mine-thread-redesign`
- `ux-r2-accessibility-and-language-hardening`
- `ux-r3-voicemail-and-indicator-behavior`
- `ux-r4-outbound-policy-guardrail-ui`

**Core requirements:**
- Mobile-first structure with bottom nav (`Inbox`, `Mine`, `More`)
- readability and interaction hierarchy for seniors/non-technical users
- accessibility locks (minimum type sizes, tap targets, plain language)
- deterministic voicemail indicators and policy-safe action messaging

**Justification:** Prevents piecemeal fixes and ensures focused remediation execution.

## 4.2 PRD Modifications

### Harmonize behavior statements across planning artifacts

**OLD:**
- Mixed interpretations on closed-thread behavior, voicemail movement, stage visibility, envelope naming

**NEW:**
- CLOSED outbound reopens same thread
- Voicemail does not reset escalation/inactivity and does not move claimed thread to Inbox
- UI uses plain-language urgency labels, not stage internals
- Canonical envelope taxonomy: `success | refusal | error`
- Bridge-call-only voice with manual retry

**Affected artifacts:**
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`

## 4.3 Architecture and API Contract Adjustments

- Ensure API contracts include explicit deterministic order keys and priority rank semantics.
- Ensure read models expose fields required for new UX indicators.
- Ensure webhook outcomes map correctly to UI state without violating locked behavior.

## 5. Implementation Handoff

### Scope Classification
**Moderate** (Backlog reorganization + contract tightening + UX remediation additions)

### Handoff Recipients
- Product Owner / Scrum Master: backlog and sequencing updates
- Product Manager: artifact harmonization and acceptance lock
- Development Team (frontend + backend): implement AC and UX remediation stories
- QA/Test Engineering: usability + behavior lock regression coverage

### Responsibilities

#### Product Owner / Scrum Master
- Insert new UX remediation stories into active plan.
- Reorder sequence to prioritize usability recovery.
- Maintain dependency integrity in sprint-status tracking.

#### Product Manager
- Approve and lock harmonized behavior language across PRD/architecture/UX spec.
- Prevent reopening of resolved behavior decisions.

#### Development Team
- Implement approved story AC changes.
- Deliver mobile-first UI and locked behavior parity.
- Update API/UI contracts where required.

#### QA/Test Engineering
- Add regression coverage for:
  - CLOSED reopen behavior
  - Mine/inbox voicemail rules
  - deterministic ordering and label mapping
  - accessibility locks and interaction clarity

### Recommended Execution Sequence
1. `c-3` contract hardening
2. `ux-r1` + `ux-r2`
3. `d-1` + `d-2` + `d-4`
4. `ux-r3` + `ux-r4`
5. `e`-lane webhook parity checks
6. run usability and behavior-lock regression gate before expansion stories

### Success Criteria for Handoff Completion
- Core volunteer flows are understandable and executable without coaching.
- Locked behavior rules are fully represented in UI and API contracts.
- Regression suite demonstrates no drift on lifecycle, escalation, voicemail, and envelope semantics.

---

## Workflow Execution Summary

- Issue addressed: Cross-epic UX remediation trigger due to broad usability failure
- Scope: Moderate
- Artifacts modified/proposed: Epics/stories, PRD, Architecture, UX spec, sprint sequencing
- Routed to: PO/SM + PM + Dev + QA

