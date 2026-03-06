---
project_lane: connectshyft
---

# Sprint Change Proposal - 2026-03-06

## 1. Issue Summary

### Trigger
Cross-epic usability failure discovered in user testing (not a single triggering story).

### Problem Statement
ConnectShyft volunteer-facing UX is still exposing engineering and operations internals in primary surfaces, which conflicts with the locked messaging-first product posture and is causing user-comprehension and task-execution breakdowns.

### Discovery Context
- User testing identified systemic UX friction for core volunteer users.
- Trigger is cross-epic and implementation-wide.
- Existing remediation stories are marked complete, but current implementation and testing feedback show unresolved gaps.

### Evidence
1. Locked design direction and interaction posture:
   - `/Users/jeremiahotis/Downloads/connectshyft_design_system_v1.md`
   - `/Users/jeremiahotis/Downloads/connectshyft_engineering_delta.md`
   - `/Users/jeremiahotis/Downloads/connectshyft_engineering_execution_plan.md`
   - `/Users/jeremiahotis/Downloads/connectshyft_locked_routing_thread_model_spec.md`
2. Current implementation drift in volunteer surfaces:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
3. Existing planning artifacts with mixed posture:
   - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
   - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
   - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
   - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`

## 2. Impact Analysis

### Epic Impact
1. **Epic c (OrgUnit Inbox and Thread Lifecycle)** - Critical impact
   - Read contracts and primary interaction model still leak operational internals.
2. **Epic d (Policy-Safe Outbound Communication)** - Critical impact
   - Policy and lifecycle constraints are valid, but primary UX surfacing is too technical.
3. **Epic UX remediation (historical)** - Critical gap against expected outcomes
   - Marked done, but user outcomes show unresolved deficiencies.
4. **Epic a/b/e/f** - Medium impact
   - Core platform and backend constraints remain useful; response-shaping and presentation boundaries require tightening.

### Story Impact
Stories requiring explicit updates/hardening:
- `c-3-inbox-and-thread-detail-read-contracts`
- `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`
- `d-2-preference-override-enforcement-for-outbound-sms`
- `d-4-operator-interaction-contracts-for-outbound-safety`
- `ux-r1-mobile-first-inbox-mine-thread-redesign`
- `ux-r2-accessibility-and-language-hardening`
- `ux-r3-voicemail-and-indicator-behavior`
- `ux-r4-outbound-policy-guardrail-ui`

New story set required under new epic:
- `CS-S7.1` Tokens + reusable primitives
- `CS-S7.2` Inbox/Mine rebuild
- `CS-S7.3` Thread detail rebuild
- `CS-S7.4` Add Neighbor + Directory rebuild
- `CS-S7.5` More/Settings volunteer IA + admin separation
- `CS-S7.6` Volunteer contract boundary + regression hardening

### Artifact Conflicts
1. PRD and architecture still allow internal metadata exposure in volunteer-primary surfaces.
2. UX spec still carries operations-first screen contracts that conflict with locked messaging-first posture.
3. Sprint status signals UX remediation complete while user-testing evidence indicates unresolved failures.

### Technical Impact
1. Frontend: major surface rebuild across Inbox/Mine/Thread/More/Directory/Add Neighbor.
2. Contracting: split raw operational truth from volunteer display adapters.
3. Backend: preserve routing/thread invariants; tighten response shaping.
4. QA: add regression gates specifically for UX behavior lock, accessibility, and internal-field suppression.

## 3. Recommended Approach

### Selected Path
**Direct Adjustment with new epic creation and strict sequencing (Batch execution).**

### Option Evaluation
1. Option 1 - Direct Adjustment: **Viable (selected)**
   - Effort: High
   - Risk: Medium
   - Timeline impact: Moderate
2. Option 2 - Potential Rollback: **Not viable**
   - Effort: High
   - Risk: High
   - Timeline impact: High
3. Option 3 - MVP Review/Scope Reduction: **Viable as fallback guardrail only**
   - Effort: Medium
   - Risk: Medium
   - Timeline impact: Low to Moderate

### Recommendation Rationale
1. Backend domain/routing rules are largely aligned and should be preserved.
2. The primary failure is presentation-layer abstraction and IA drift, not core routing model viability.
3. A new epic (`CS-E7`) gives traceability, avoids false-complete reporting, and enables clean ownership.

### Effort, Risk, Timeline
- Effort: High
- Risk: Medium
- Timeline impact: Moderate (requires prioritized rebuild lane before additional expansion)

## 4. Detailed Change Proposals

### 4.1 Story Changes (Old -> New)

#### Story: `c-3-inbox-and-thread-detail-read-contracts`
Section: Acceptance Criteria / Read model contract

OLD:
- Requires deterministic ordering and metadata including `last_inbound_cs_number_id` and preferred outbound context in read contract outputs.

NEW:
- Introduce two-tier contract boundary:
  1. Raw operational contract (internal/admin contexts)
  2. Volunteer presentation contract (user-facing)
- Volunteer contract must not expose raw number IDs, routing metadata, raw lifecycle internals, or priority integers in primary UI surfaces.
- Volunteer contract must include human-facing fields only: display name, preview, friendly urgency label, timestamp, claim context, voicemail indicator.

Rationale:
Prevents backend truth leakage into volunteer UX while preserving operational correctness.

#### Story: `d-4-operator-interaction-contracts-for-outbound-safety`
Section: Acceptance Criteria / Policy visibility behavior

OLD:
- Policy guardrails and responsive behavior are explicit but allow persistent operations-heavy emphasis in thread surfaces.

NEW:
- Policy constraints must be contextual and action-bound:
  - show blocking notices only when needed
  - keep primary thread chrome conversation-first
- Persistent technical banners/chips cannot dominate default thread layout.

Rationale:
Preserves safety while restoring usability and message-first focus.

#### Story: `ux-r1-mobile-first-inbox-mine-thread-redesign`
Section: Acceptance Criteria / Surface behavior

OLD:
- General mobile-first navigation and large-card requirements.

NEW:
- Lock specific interaction model:
  - card is primary tap target
  - mobile opens thread full-screen
  - tablet defaults to split queue/thread
  - desktop uses three-column workspace
  - persistent queue search
  - urgency banner and pill system
  - FAB for add/start actions

Rationale:
Removes interpretation drift and enforces tested interaction posture.

#### Story: `ux-r2-accessibility-and-language-hardening`
Section: Acceptance Criteria / Accessibility specifics

OLD:
- High-level accessibility and plain-language constraints.

NEW:
- Lock measurable constraints:
  - minimum 48px touch targets
  - plain-language labels only in primary action surfaces
  - no internal RBAC/ID/state jargon in volunteer-primary content
  - readability for seniors and low-precision touch use

Rationale:
Directly targets observed testing failures.

#### Story: `ux-r3-voicemail-and-indicator-behavior`
Section: Acceptance Criteria / Voicemail treatment

OLD:
- Focuses on Mine vs Inbox classification behavior.

NEW:
- Add timeline rendering contract:
  - voicemail is first-class inline content in thread timeline
  - claimed-thread voicemail remains in Mine
  - voicemail must not create queue churn that breaks ownership mental model

Rationale:
Aligns behavior and surface semantics.

#### Story: `ux-r4-outbound-policy-guardrail-ui`
Section: Acceptance Criteria / Outcome handling

OLD:
- Enforces override/reopen/refusal handling generally.

NEW:
- Lock deterministic UX outcomes for each action/state path:
  - `success`, `refusal`, `error` copy and behavior are consistent and testable
  - no ambiguous or conflicting feedback patterns across breakpoints

Rationale:
Improves action confidence and reduces operator error.

### 4.2 New Epic Proposal

Epic ID: **CS-E7**
Epic title: **ConnectShyft UX Rebuild**

Proposed scope stories:
1. `CS-S7.1` Token layer + reusable primitives
2. `CS-S7.2` Inbox/Mine rebuild
3. `CS-S7.3` Thread detail rebuild
4. `CS-S7.4` Add Neighbor + Directory rebuild
5. `CS-S7.5` More/Settings IA cleanup + admin separation
6. `CS-S7.6` Volunteer contract boundary and regression hardening

Rationale:
Current UX remediation is marked complete but does not satisfy observed user outcomes; a new epic is required for traceable execution and acceptance.

### 4.3 PRD Modifications

Artifact: `prd-ConnectShyft-2026-02-19.md`

1. Add explicit volunteer-surface abstraction requirement:
   - Volunteer primary UI must not expose routing internals, raw identifiers, or operational state internals by default.
2. Add presentation-boundary functional requirement:
   - display-safe adapter contract is mandatory for volunteer-facing read models.
3. Add implementation gate:
   - user-flow validation against locked messaging-first UX behavior before closure of UX stories.

### 4.4 Architecture Modifications

Artifact: `architecture-ConnectShyft-2026-02-19.md`

1. Add new architecture decision for volunteer adapter boundary (raw vs presentation contract separation).
2. Update frontend architecture contract to messaging-first primitives and responsive interaction model.
3. Add rule for volunteer/admin IA separation with role-gated admin controls.
4. Add QA/CI architecture gate for internal-field suppression in volunteer-primary surfaces.

### 4.5 UX Specification Modifications

Artifact: `ux-design-specification-ConnectShyft-2026-02-19.md`

1. Replace operations-first inbox/table framing with conversation-card triage model.
2. Replace technical thread header contract with neighbor/conference/claim-first hierarchy.
3. Recast More/Settings IA to volunteer tools first; move admin controls out of primary volunteer path.
4. Update responsive strategy from desktop-first language to mobile-first canonical behavior.
5. Update content guidelines to prioritize human-centered communication in primary surfaces.

## 5. Implementation Handoff

### Scope Classification
**Major**

### Handoff Recipients
1. Product Manager
2. Product Owner / Scrum Master
3. Frontend Engineering
4. Backend Engineering
5. QA / Test Engineering

### Responsibilities
1. Product Manager
   - lock `CS-E7` scope and acceptance outcomes
   - approve PRD/Architecture/UX harmonization updates
2. Product Owner / Scrum Master
   - insert `CS-E7` into sprint planning and dependency graph
   - resequence feature expansion behind UX recovery priority
3. Frontend Engineering
   - rebuild volunteer-facing surfaces according to locked interaction model
   - implement reusable primitives and responsive shell
4. Backend Engineering
   - preserve routing/thread invariants
   - implement volunteer-safe response shaping boundary
5. QA / Test Engineering
   - add regression suite for:
     - internal-field suppression in volunteer surfaces
     - queue/thread interaction behavior
     - voicemail behavior lock
     - action outcome consistency
     - accessibility constraints

### Success Criteria
1. Volunteers can triage and act in Inbox/Mine/Thread without coaching.
2. No raw IDs/state/routing internals appear in volunteer-primary UI.
3. Messaging-first visual/interaction model holds across mobile/tablet/desktop.
4. Locked thread/routing semantics remain intact behind the scenes.
5. `CS-E7` closes with user-test validation, not implementation-only completion.

## Workflow Execution Snapshot

- Trigger: user-testing discovered cross-epic UX failure
- Mode: Batch
- Proposed scope: Major
- New epic tracking decision: Approved (`CS-E7`)
