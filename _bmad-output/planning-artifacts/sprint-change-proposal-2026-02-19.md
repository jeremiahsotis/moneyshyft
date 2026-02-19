# Sprint Change Proposal - ConnectShyft Readiness Corrections

- Date: 2026-02-19
- Owner: PM Workflow (Correct Course)
- Mode: Batch
- Trigger: Implementation Readiness findings requiring pre-implementation hardening

## Checklist Execution Status

### 1) Understand Trigger and Context
- `1.1` Triggering story identified: `[N/A]` (issue surfaced at readiness gate, pre-story execution)
- `1.2` Core problem defined: `[x] Done`
- `1.3` Evidence gathered: `[x] Done`

### 2) Epic Impact Assessment
- `2.1` Current epic impact: `[x] Done`
- `2.2` Epic-level changes required: `[x] Done`
- `2.3` Future epics reviewed: `[x] Done`
- `2.4` Obsolete/new epics check: `[x] Done` (no new epics required)
- `2.5` Epic order/priority review: `[x] Done` (parallel lane sequencing adjustments required)

### 3) Artifact Conflict and Impact Analysis
- `3.1` PRD conflict check: `[x] Done`
- `3.2` Architecture conflict check: `[x] Done`
- `3.3` UX conflict check: `[x] Done`
- `3.4` Secondary artifact impacts: `[x] Done`

### 4) Path Forward Evaluation
- `4.1` Option 1 Direct Adjustment: `[x] Viable` (Effort: Medium, Risk: Low-Medium)
- `4.2` Option 2 Rollback: `[ ] Not viable` (Effort: High, Risk: High)
- `4.3` Option 3 PRD MVP Review: `[x] Viable` (Effort: Medium, Risk: Medium)
- `4.4` Selected path: `[x] Done` -> Hybrid (Option 1 + Option 3 guardrails)

### 5) Proposal Components
- `5.1` Issue summary: `[x] Done`
- `5.2` Epic/artifact adjustments: `[x] Done`
- `5.3` Path and rationale: `[x] Done`
- `5.4` MVP impact/action plan: `[x] Done`
- `5.5` Agent handoff plan: `[x] Done`

### 6) Final Review and Handoff
- `6.1` Checklist completion review: `[x] Done`
- `6.2` Proposal consistency review: `[x] Done`
- `6.3` User approval: `[x] Done` (approved: yes)
- `6.4` sprint-status update: `[x] Done` (`sprint-status-connectshyft.yaml` updated)
- `6.5` Final handoff confirmation: `[x] Done`

## 1. Issue Summary

### Problem Statement
Pre-implementation artifacts are strong but not yet execution-safe for parallel delivery. Three specific gaps must be corrected before broad implementation:
1. Escalation and performance thresholds are qualitative (`X`, “operational use”, “near-real-time”) rather than numeric and testable.
2. Stories `1.5`, `4.4`, and `5.6` lack explicit FR/NFR trace tags.
3. Stories lack explicit `depends_on` metadata, increasing risk of unsafe parallel starts.

### Discovery Context
Issue surfaced during ConnectShyft Implementation Readiness review before sprint execution scale-up.

### Evidence
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/implementation-readiness-report-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## 2. Impact Analysis

### Epic Impact
- No epic removal required.
- Epic story contracts need additive metadata updates (trace tags + dependencies).
- Epic execution order should be constrained by dependency lanes before any parallel work begins.

### Story Impact
- Direct edits required to stories `1.5`, `4.4`, `5.6`.
- Dependency metadata should be added to all stories used for parallel planning, at minimum for lane gate stories.

### Artifact Conflicts
Artifacts requiring updates:
1. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
2. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
3. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
4. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
5. `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Technical Impact
- Enables objective CI/readiness checks by replacing qualitative thresholds with numeric targets.
- Increases traceability quality for story review and QA mapping.
- Reduces parallel execution risk by requiring dependency declarations before story start.

## 3. Recommended Approach

### Selected Path
Hybrid:
1. **Direct Adjustment** (primary): update PRD/Epics/Architecture/UX and sprint-status metadata.
2. **MVP Guardrail Review** (secondary): ensure updates are additive and do not expand MVP scope.

### Option Comparison
| Option | Viability | Effort | Risk | Timeline Impact |
| --- | --- | --- | --- | --- |
| Direct Adjustment | Viable | Medium | Low-Medium | Low |
| Potential Rollback | Not viable | High | High | High |
| PRD MVP Review | Viable (as guardrail) | Medium | Medium | Low-Medium |

### Guardrails (Locked)
1. Additive-only planning updates (no MVP scope expansion).
2. Keep canonical thread states and uniqueness model unchanged.
3. Keep policy gate and module-boundary restrictions as first-class release constraints.

### Scope Lock (ConnectShyft Only)
1. This correction applies only to ConnectShyft planning and ConnectShyft sprint tracking artifacts.
2. Allowed update targets:
   - `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
   - `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
   - `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
   - `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
   - `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
3. Explicitly out of scope:
   - RouteShyft PRD/epics/architecture/API/schema files
   - Cross-module code changes
   - Non-ConnectShyft sprint tracking files unless explicitly approved

## 4. Detailed Change Proposals

### A) PRD Threshold Locking

#### Proposal CC-PRD-01 (Escalation Baseline Lock)
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`

OLD:
- `FR-CS-014`: Escalation progression follows `X -> 2X -> 3X`.

NEW:
- `FR-CS-014`: Escalation progression follows `X -> 2X -> 3X`, where default `X = 24 hours` and orgUnit-configurable range is `1-24 hours` (integer hours only).

Rationale:
- Converts ambiguous timing into testable contract while preserving configurability.

#### Proposal CC-PRD-02 (Performance Budget Lock)
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`

OLD:
- `NFR11`: Inbox and thread fetch performance supports operational use without manual fallback.
- `NFR12`: Webhook ingestion supports near-real-time processing under expected load.

NEW:
- `NFR11`: Inbox list and thread detail endpoints must meet `p95 <= 750ms` and `p99 <= 1500ms` under normal operational load.
- `NFR12`: Webhook ingestion (signature validation + dedupe + durable write acceptance) must meet `p95 <= 1000ms` and `p99 <= 2000ms`; end-to-end thread timeline visibility target `p95 <= 5000ms`.

Rationale:
- Provides measurable, enforceable performance gates for CI and release decisions.

### B) Story Traceability Tagging

#### Proposal CC-EPIC-01 (Story 1.5 Tags + Dependency)
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`

Story: `1.5 Capability-Based Route Access and Envelope Contract Compliance`  
Section: metadata block

OLD:
- No explicit `FRs` or `NFRs` tag block
- No `depends_on`

NEW:
- `FRs: FR-CS-001, FR-CS-002, FR-CS-003`
- `NFRs: NFR-CS-001, NFR-CS-002, NFR-CS-004`
- `depends_on: 1.2`
- `parallel_lane: lane-a-platform-guards`

Rationale:
- Makes scope and sequencing explicit for authorization/envelope foundation.

#### Proposal CC-EPIC-02 (Story 4.4 Tags + Dependency)
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`

Story: `4.4 Operator Interaction Contracts for Outbound Safety`  
Section: metadata block

OLD:
- No explicit `FRs` or `NFRs` tag block
- No `depends_on`

NEW:
- `FRs: FR-CS-016, FR-CS-022, FR-CS-023`
- `NFRs: NFR-CS-011`
- `depends_on: 3.3, 4.1, 4.2`
- `parallel_lane: lane-d-outbound-ux`

Rationale:
- Ensures UI policy behaviors are traceable and scheduled after required backend contracts.

#### Proposal CC-EPIC-03 (Story 5.6 Tags + Dependency)
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`

Story: `5.6 Parallel Delivery Safety Gates for ConnectShyft Rollout`  
Section: metadata block

OLD:
- No explicit `FRs` or `NFRs` tag block
- No `depends_on`

NEW:
- `FRs: FR-CS-021, FR-CS-021a`
- `NFRs: NFR-CS-001, NFR-CS-004, NFR-CS-010`
- `depends_on: 1.5, 5.1, 5.5`
- `parallel_lane: lane-e-release-safety`

Rationale:
- Explicitly ties release safety gate story to security/reliability contracts and prerequisites.

### C) Dependency Metadata for Parallel Lanes

#### Proposal CC-PLAN-01 (Global depends_on map)
Artifacts:
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

OLD:
- Stories listed without formal dependency map.

NEW:
- Add `depends_on` metadata per story (initial baseline):
  - `1.2 -> [1.1]`
  - `1.3 -> [1.1, 1.2]`
  - `1.4 -> [1.1, 1.2]`
  - `1.5 -> [1.2]`
  - `2.1 -> [1.2]`
  - `2.2 -> [2.1]`
  - `2.3 -> [2.1, 3.3]`
  - `2.4 -> [2.3]`
  - `3.2 -> [3.1]`
  - `3.3 -> [3.2]`
  - `3.4 -> [3.2, 3.3]`
  - `3.5 -> [3.4, 1.4]`
  - `4.1 -> [3.3]`
  - `4.2 -> [3.3]`
  - `4.3 -> [4.1, 4.2]`
  - `4.4 -> [3.3, 4.1, 4.2]`
  - `5.2 -> [5.1, 3.2]`
  - `5.3 -> [5.1, 3.2]`
  - `5.4 -> [5.3]`
  - `5.5 -> [5.1]`
  - `5.6 -> [1.5, 5.1, 5.5]`

Rationale:
- Enables deterministic parallel lanes and prevents forward-start risk.

### D) Architecture Contract Updates

#### Proposal CC-ARCH-01
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`

OLD:
- AD-05 keeps escalation at symbolic `X -> 2X -> 3X`.
- Test architecture defines layers but no numeric perf gate targets.

NEW:
- AD-05 includes locked timing contract: default `X=24h`, valid range `1-24h`.
- Test architecture adds explicit perf gate checks aligned to PRD thresholds (`p95/p99` budgets for inbox/thread/webhooks).

Rationale:
- Aligns architecture with measurable operational targets and reduces interpretation drift.

### E) UX Contract Updates

#### Proposal CC-UX-01
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`

OLD:
- Escalation countdown is described, but numeric baseline and SLO display behavior are unspecified.

NEW:
- Add explicit UX copy/contract:
  - “Escalation baseline is configured in hours (default 24, allowed 1-24).”
  - “Countdown derives from server timestamps and reflects configured baseline.”
  - “Operational latency targets for inbox/thread/webhook status indicators align with published NFR budgets.”

Rationale:
- Keeps UI behavior consistent with backend timing contracts and rollout expectations.

## 5. Implementation Handoff

### Scope Classification
**Moderate**

Reason:
- Changes are planning/contractual and pre-implementation, but they affect multiple core artifacts and sprint execution controls.

### Handoff Recipients and Responsibilities

1. Product Manager + Architect
- Approve numeric thresholds and dependency policy.
- Finalize PRD/architecture/UX wording and lock acceptance criteria.

2. Scrum Master / Planning Owner
- Update epic/story metadata and sprint-status dependency map.
- Gate story kickoff based on `depends_on` completion.

3. Development Team
- Implement against locked numeric and dependency contracts.
- Preserve CI guardrails and boundary checks.

4. QA
- Convert numeric thresholds into automated checks and release criteria.
- Validate dependency order is reflected in execution plan and CI flow.

### Success Criteria
1. PRD and architecture include explicit numeric escalation/performance thresholds.
2. Stories `1.5`, `4.4`, `5.6` include explicit FR/NFR tags.
3. Story dependency map is present and used for parallel lane gating.
4. sprint-status artifact includes dependency metadata used for execution sequencing.
5. No implementation starts on stories with unmet dependencies.

## 6. Approval and Routing

- User approval: `yes` (2026-02-19)
- Final scope: `Moderate`
- Routing:
  1. Product Manager + Architect: finalize PRD/architecture/UX and epics document edits.
  2. Scrum Master: enforce dependency-gated sequencing using `sprint-status-connectshyft.yaml`.
  3. Development + QA: implement and validate only after artifact updates are merged.
- ConnectShyft-only lock confirmed: no RouteShyft or non-ConnectShyft artifact changes included.
