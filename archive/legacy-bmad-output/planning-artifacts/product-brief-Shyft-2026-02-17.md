---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
  - /Users/jeremiahotis/moneyshyft/docs/architecture-backend.md
  - /Users/jeremiahotis/moneyshyft/docs/architecture-frontend.md
  - /Users/jeremiahotis/moneyshyft/docs/integration-architecture.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Architecture_Document.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Epics_and_Stories.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Monolith_PRD.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Non_Functional_Requirements.md
  - /Users/jeremiahotis/moneyshyft/ROADMAP.md
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
date: 2026-02-17
author: Jeremiah
---

# Product Brief: Shyft

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Shyft addresses a systemic execution failure in the support ecosystem: people and teams fall through fragmented workflows across intake, scheduling, delivery, and completion. Instead of adding another abstract coordination layer, Shyft builds execution-grade modules first (OperationsShyft, RouteShyft, ResourceShyft), then composes coordination on top. The core design principle is dignity as architecture: human agency, consent, refusal handling, and non-extractive data practices are encoded as technical constraints, not policy slogans. Success is measured by predictable follow-through, reduced frontline cognitive load, visible organizational capacity, and structured outcomes without commodifying people.

---

## Core Vision

### Problem Statement

The support ecosystem is structurally fragmented, causing operational drop-offs and human harm:
- Execution fracture: intake -> scheduling -> delivery -> completion is not a continuous system.
- Coordination fracture: organizations cannot share structured handoff and capacity signals.
- Dignity fracture: systems optimize for compliance/reporting over agency and consent.

### Problem Impact

- Neighbors face repeated retelling, missed follow-through, and instability.
- Frontline workers absorb manual coordination burden, moral injury, and burnout.
- Nonprofit leadership lacks real-time capacity and outcome visibility across siloed tools.
- Funders receive inconsistent, low-signal reporting, reinforcing fragmented incentives.

### Why Existing Solutions Fall Short

- Current tools are either compliance-heavy (extractive, surveillance-oriented) or operationally weak (spreadsheet/whiteboard/text-message dependence).
- Coordination today depends on individual heroics rather than durable workflow infrastructure.
- Data models are often built for reporting audiences, not execution reliability and human sovereignty.
- Cross-org interoperability is poor, creating duplicate effort and hidden capacity.

### Proposed Solution

Shyft implements a modular monolith with platform-kernel guarantees and execution-first modules:
- Platform kernel enforces tenancy, auth/CSRF, refusal envelope semantics, events/outbox, and policy constraints.
- OperationsShyft standardizes work execution.
- RouteShyft standardizes logistics execution.
- ResourceShyft standardizes structured discovery and referral pathways.
- WordPress remains thin UI where required; core execution logic remains in monolith services.
- Consent, crisis, and policy layers are sequenced intentionally after execution signal exists.

### Key Differentiators

- Execution-first architecture: operational continuity before coordination abstraction.
- Governance-by-design: dignity constraints encoded in system behavior (consent, refusal, anti-extractive data patterns).
- Ethical monolith strategy: shared kernel conventions prevent module drift into extractive behaviors.
- Cross-org coordination without power centralization: structured signals, not ownership capture.
- Outcome signal quality: completion/timeliness/capacity strain visibility without invasive personal narrative extraction.

## Target Users

### Primary Users

#### 1) Frontline Operators (Execution Core)

Primary surfaces:
- OperationsShyft
- RouteShyft

Representative roles:
- Dispatchers
- Program coordinators
- Woodshop leads
- Repair leads
- Intake coordinators
- Case workers handling scheduling

Core daily jobs:
- Accept or refuse work
- Schedule without breaking capacity
- Assign vehicles/teams
- Prevent over-promising
- Monitor same-day execution status
- Handle edge cases
- Record outcomes without narrative overload

Success definition:
- No whiteboards/text-thread coordination
- No duplicate scheduling
- No ownership ambiguity
- No capacity guesswork

Primary success metric:
- Predictable execution without heroics

#### 2) Field Executors (Drivers / Repair Teams / Woodshop Volunteers)

Primary surfaces:
- RouteShyft driver flow
- OperationsShyft completion flow

Core daily jobs:
- View current assignments
- Understand location and scope
- Capture completion proof
- Execute tasks without escalation loops

Success definition:
- Clear work list and order
- Minimal UI friction
- Single completion capture
- Reduced blame from system ambiguity

Primary success metric:
- Clarity with minimal cognitive load

#### 3) Neighbors (Public Intake Users)

Primary surfaces:
- RouteShyft public pickup request
- OperationsShyft intake
- Future ResourceShyft surfaces

Core jobs-to-be-done:
- Request help
- Receive realistic date/time expectations
- Trust follow-through
- Avoid repeated retelling

Success definition:
- Clear next steps
- Honest availability
- No false promises
- Respectful process

Primary success metric:
- Reliability plus dignity

### Secondary Users

#### 4) Program Leadership

Primary outcomes sought:
- Capacity visibility
- Completion and timeliness visibility
- Bottleneck identification
- Cross-program operational insight

Constraint:
- Leadership reporting needs must not distort frontline workflow design.

#### 5) Funders

Primary role:
- Consume aggregated outcome signals, not operate workflows.

Constraint:
- Funder requirements must not drive extractive architecture or intrusive data collection.

### User Journey

#### Frontline Operator Journey (Primary Execution Path)

1. Receive intake/work request
2. Assess eligibility and constraints
3. Accept/refuse with explicit refusal handling
4. Schedule against visible capacity
5. Assign route/team
6. Monitor same-day execution
7. Resolve exceptions (cancellations/conflicts)
8. Close with structured completion record

Aha moment:
- The system prevents overcommitment and makes handoffs explicit without manual coordination overhead.

#### Field Executor Journey (Delivery Path)

1. Open day view
2. Review assignment details and order
3. Execute stops/tasks
4. Capture immutable completion proof
5. Submit completion once

Aha moment:
- Work is unambiguous and completion is trusted without extra calls/texts.

#### Neighbor Journey (Intake Path)

1. Submit request
2. Receive clear status and realistic expectation
3. Experience predictable follow-through
4. Completion occurs without repeated retelling

Aha moment:
- The process feels reliable and respectful, not bureaucratic or opaque.

#### RouteShyft-Specific Journey Emphasis

Dispatcher pain replaced:
- Manual run building -> structured run creation with capacity enforcement
- Head-based capacity math -> visible capacity constraints
- Ad-hoc cancellation handling -> controlled workflow transitions
- Weak auditability -> immutable completion proof and traceable state changes

Driver pain replaced:
- Paper/text instructions -> clear ordered assignments
- Missing confirmation artifacts -> durable completion capture

## Success Metrics

### User Success Outcomes

#### Frontline Operators (Dispatchers / Program Leads)

- **Execution reliability:** % of scheduled commitments completed
- **Capacity clarity:** % of days where capacity status is visible before scheduling
- **Overbooking reduction:** number of over-capacity incidents per month
- **Drop-off reduction:** % of submitted requests without resolution
- **Decision speed:** median time from request submitted -> triaged

Success condition:
- High completion rate, near-zero accidental overbooking, terminal-state coverage on every request, and no lost requests.

#### Field Executors (Drivers / Repair Teams)

- **Assignment clarity:** % of stops/work orders with required fields complete before assignment
- **On-time start rate:** % of runs starting within planned window
- **Completion capture integrity:** % of completed work with required proof attached
- **Mid-run interruption rate:** % of reassignments after publish

Success condition:
- Fewer clarification calls, low rework, durable proof trail, and predictable workload.

#### Neighbors

- **Follow-through rate:** % of scheduled commitments completed as promised
- **Refusal clarity:** % of refusals that include alternatives
- **Timeliness:** median days from request -> scheduled date
- **No silent failure:** % of requests resolved within defined SLA
- **Optional:** post-completion satisfaction (1–5), aggregated only

Success condition:
- Reliable delivery when scheduled, explicit alternatives on refusal, and no ghosting.

### Business Objectives

#### 3-Month Operational Reality Check (Adoption + Discipline)

- 100% of RouteShyft scheduling executed in-system
- No whiteboard fallback for core scheduling
- 100% of requests reach a terminal state
- >=95% completion-proof capture for completed stops
- No manual texting required for baseline run coordination

Interpretation:
- At 3 months, success is operational discipline, not scale.

#### 12-Month Structural Validation (Scale + Integration)

- At least two modules (Route + Operations) fully integrated
- Capacity visibility used proactively (not only reactively)
- Overbooking incidents reduced by >=75% from baseline
- Drop-offs reduced measurably from baseline
- Leadership dashboards replace spreadsheet aggregation
- POS integrated with fulfillment and inventory tracking

Interpretation:
- At 12 months, success is measurable chaos reduction at scale.

### Key Performance Indicators

#### RouteShyft KPI Targets

- >=92% completion rate for scheduled stops
- <=2% accidental overbook rate
- 100% terminal-state coverage
- <=48h median triage time
- >=95% completion-proof capture rate

#### OperationsShyft KPI Targets

- >=95% of WorkOrders completed within scheduled window
- <=5% reassignment after publish
- 100% completion record append for completed work

#### Neighbor-Facing KPI Targets

- >=90% of refusals include structured alternatives
- 0% silent failures
- >=80% satisfaction (if measured)

### Non-Negotiable Integrity Thresholds

- 0 silent drop-offs
- 100% terminal-state coverage
- Explicit business refusals required
- No scheduling without visible capacity state
- No over-capacity public booking

Failure posture:
- Repeated threshold breaches are treated as trust degradation, not normal variance.

### Metric Boundaries (Dignity Constraints)

#### Out of Bounds (Do Not Collect)

- Detailed personal narratives for reporting
- Income tracking beyond eligibility logic
- Behavioral scoring / risk scoring of individuals
- Volunteer productivity gamification metrics
- Cross-org personal linkage without explicit consent
- Predictive modeling on individuals
- AI training on ecosystem data

#### Acceptable Funder Reporting (Aggregate Signal Only)

Allowed:
- Request volume
- Completion rate
- Median time to fulfillment
- Capacity utilization
- Drop-off reduction
- Completion integrity
- Aggregate satisfaction

Not allowed:
- Individual-level case tracking
- Cross-org person tracking without explicit consent
- Personal financial breakdowns
- Behavioral compliance scoring
- “Efficiency per neighbor” framing

### Measurement Philosophy

Measure:
- System reliability
- Capacity integrity
- Completion discipline
- Drop-off reduction

Do not measure:
- Individual worthiness
- Behavioral compliance
- Human productivity value

## MVP Scope

### Core Features

MVP is defined as:
- Platform hardening (Phase 0 spine)
- RouteShyft minimal execution closure
- Minimal bridge structure to avoid migration rework

#### Phase 0 Platform Spine (Non-Negotiable)

1. Canonical tenancy context
2. First-party auth with sessions table and refresh rotation
3. CSRF enforcement
4. Shared refusal-envelope helpers
5. Event table for audit baseline (outbox full usage can mature later)

Rationale:
- Without this spine, module behavior diverges and trust/consistency degrades.

#### RouteShyft MVP (Execution Fracture Closure)

Must remove:
- Whiteboard scheduling
- Text-thread coordination
- Capacity guessing
- Lost requests

##### 1) Public Intake (Minimal, Disciplined)

- ZIP eligibility
- Date + day-part selection
- Real-time capacity check
- Explicit refusal with alternatives
- Confirmation email

Note:
- Waitlist automation is optional post-MVP.

##### 2) Dispatcher Console (Core Engine)

- Requests inbox
- Triage fields (size, stairs, disassembly)
- Schedule request into run
- Create/edit runs
- Reorder stops
- Publish run
- Explicit refusal flow

Hard enforcement:
- No public overbooking
- Capacity-aware scheduling
- Locked state transitions

##### 3) Driver View (Mobile-First)

- Today’s runs
- Stop order
- Status updates (`en_route`, `arrived`, `completed`)
- Completion proof:
  - Notes
  - Photo(s)
  - Signature
  - GPS (best effort)
- Immutable completion record

Constraint:
- Minimal offline tolerance acceptable if submission is idempotent.

##### 4) Audit + Event Recording

- All state changes logged
- Completion immutable
- Refusals logged

##### 5) Basic Operational Reporting

- Completion rate
- Capacity utilization
- Run status
- Terminal-state coverage

Constraint:
- No full leadership analytics layer in MVP.

#### MVP Closure Bar

Execution fracture is considered closed when:
- Every request is tracked
- Every scheduled commitment is visible
- Every completion is captured
- No operational work lives outside the system

### Out of Scope for MVP

- Full OperationsShyft module
- ResourceShyft
- Cross-org handoff layer
- Cross-org CapacityShyft
- FriendShyft volunteer sync integration
- POS module
- Advanced automation (AI suggestions, auto-assign, predictive modeling)
- Rich board-ready dashboards
- Neighbor login portal
- SMS notifications (email only in MVP)

### MVP Success Criteria

#### Gate 1: Adoption Gate

- 100% of scheduling inside RouteShyft
- Whiteboards retired
- No shadow scheduling

Failure signal:
- If teams revert to text scheduling, MVP is not successful.

#### Gate 2: Integrity Gate

- 100% terminal-state coverage
- >=92% completion rate
- <=2% accidental overbook rate
- >=95% completion-proof capture

Stability rule:
- Must hold for 60 consecutive days before scale progression.

#### Gate 3: Capacity Discipline Gate

- Dispatchers consult capacity before scheduling
- Capacity state accuracy >=98%
- Zero public overbooking incidents

#### Gate 4: Trust Gate

- Zero silent drop-offs
- >=90% refusals include structured alternatives

Interpretation:
- Gates are binary readiness checks, not aspirational KPIs.

### Future Vision

#### Phase 1: OperationsShyft

Add:
- WorkSite
- WorkOrder
- Completion template
- Asset tracking
- Fulfillment emission to Route

Outcome:
- Route evolves from reactive intake to structured execution pipeline.

#### Phase 2: Route Bridge / Migration

- Bridge WordPress to monolith fully
- Move scheduling logic fully into monolith
- Retire WP state storage

#### Phase 3: ResourceShyft

Prerequisites:
- Capacity discipline proven
- Refusal structure stable
- Alternatives become meaningful

#### Phase 4: POS

Trigger conditions:
- Woodshop production + Route delivery + inventory relevance

Integrations:
- Voucher redemption
- Inventory tracking
- Financial integrity
- Delivery linkage

#### Phase 5+ Coordination

- Handoff
- Capacity sharing
- Consent layer
- Impact reporting

Constraint:
- Coordination scales only after execution discipline is stable.

### MVP Definition

MVP is not “feature complete.”

MVP is:
- “Execution discipline enforced by software instead of memory.”
