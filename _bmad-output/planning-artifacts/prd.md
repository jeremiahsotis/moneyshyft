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
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/product-brief-Shyft-2026-02-17.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
  - /Users/jeremiahotis/moneyshyft/docs/architecture-backend.md
  - /Users/jeremiahotis/moneyshyft/docs/architecture-frontend.md
  - /Users/jeremiahotis/moneyshyft/docs/integration-architecture.md
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Architecture_Document.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Epics_and_Stories.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Monolith_PRD.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Non_Functional_Requirements.md
  - /Users/jeremiahotis/moneyshyft/ROADMAP.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 11
  projectContext: 1
classification:
  projectType: multi-part web platform (modular monolith backend + web/thin WP clients)
  domain: nonprofit service operations and logistics orchestration
  complexity: high
  projectContext: brownfield
---

# Product Requirements Document - Shyft

**Author:** Jeremiah
**Date:** 2026-02-17

## Executive Summary

Shyft is a commitment-management platform for nonprofit execution workflows. It replaces whiteboards, text threads, and memory-based coordination with explicit, auditable commitment lifecycles across donor pickup intake, cashier-assisted scheduling, dispatcher run planning, and driver completion proof. The platform is a modular monolith with a hardened platform kernel (tenancy, first-party auth, CSRF, refusal envelope, event/outbox readiness) and policy-gated delivery practices. The MVP priority is RouteShyft execution discipline, where donation pickups are the primary workload and limited voucher-recipient deliveries are scheduled at checkout under capacity constraints. Success is defined by terminal-state coverage, low overbooking, high completion integrity, and dignity-preserving aggregate reporting.

## Success Criteria

### User Success

Frontline Operators (Dispatchers / Program Leads):
- Execution reliability: high % of scheduled commitments completed.
- Capacity clarity: capacity state visible before scheduling decisions.
- Overbooking reduction: accidental over-capacity incidents near zero.
- Drop-off elimination: no requests disappear without resolution.
- Decision speed: reduced median request-submitted -> triage time.

Field Executors (Drivers / Teams):
- Assignment clarity: all required fields complete before assignment.
- On-time start: runs start within planned windows.
- Completion integrity: completed work includes required proof.
- Low interruption: minimal post-publish reassignment.

Neighbors:
- Follow-through: scheduled commitments completed as promised.
- Refusal clarity: refusals include alternatives.
- Timeliness: lower median request -> scheduled date.
- No ghosting: requests resolved within defined SLA.
- Optional aggregated satisfaction signal.

### Business Success

3-Month Operational Adoption:
- 100% of RouteShyft scheduling occurs in-system.
- Whiteboard/text fallback retired for core scheduling.
- 100% of requests reach terminal states.
- Completion proof attached for >=95% of completed stops.
- Core run coordination handled through platform workflow.

12-Month Structural Validation:
- Route + Operations integrated in production workflows.
- Capacity visibility used proactively.
- Overbooking incidents reduced by >=75% vs baseline.
- Drop-offs reduced measurably vs baseline.
- Leadership dashboarding replaces spreadsheet aggregation.
- POS integration available for fulfillment/inventory linkage.

### Technical Success

Platform Spine Integrity:
- Canonical tenancy context enforced across requests and data access.
- First-party auth sessions + refresh rotation active.
- CSRF enforced on state-changing routes.
- Shared refusal envelope used consistently.
- Audit/event recording active for state transitions and refusals.

Execution Integrity:
- No scheduling without visible capacity state.
- No public over-capacity booking.
- Immutable completion records retained.
- Terminal-state coverage enforced as system invariant.
- Policy gates block non-compliant workflow execution (`docs/policies/git_policy.md` + CI policy check).

### Measurable Outcomes

RouteShyft:
- >=92% completion rate for scheduled stops.
- <=2% accidental overbook rate.
- 100% terminal-state coverage.
- <=48h median triage time.
- >=95% completion-proof capture.

Operations (as it lands):
- >=95% WorkOrders completed in scheduled windows.
- <=5% post-publish reassignment.
- 100% completion-record append for completed work.

Trust & Dignity:
- 0 silent failures/drop-offs.
- >=90% refusals include structured alternatives.

Measurement boundaries:
- No behavioral/risk scoring of individuals.
- No AI training on ecosystem data.
- No cross-org personal linkage without explicit consent.
- Funder reporting remains aggregate and non-extractive.

## Product Scope

### MVP - Minimum Viable Product

Platform (Phase 0, non-negotiable):
- tenancy context
- first-party auth/session rotation
- CSRF
- refusal envelope helpers
- event/audit baseline

RouteShyft MVP:
- Public intake with eligibility, date/day-part, real-time capacity check, explicit refusal with alternatives, email confirmation.
- Dispatcher console with triage, run planning, stop ordering, publish flow, refusal flow.
- Driver mobile view with statuses and immutable completion proof.
- Basic operational reporting: completion, capacity, run status, terminal coverage.

MVP bar:
- Execution discipline is enforced by software, not memory.
- No work lives outside the system for in-scope workflows.

### Growth Features (Post-MVP)

- OperationsShyft full module rollout (WorkSite/WorkOrder templates and fulfillment pipeline).
- WP bridge completion and monolith-first scheduling state.
- ResourceShyft once refusal/capacity signal quality is stable.
- POS integration for voucher + inventory + delivery linkage.
- Cross-module command/event orchestration maturation.

### Vision (Future)

- Coordinated multi-module execution across Route, Operations, Resource, and POS.
- Cross-org handoff/capacity with consent and policy controls.
- High-trust reporting with strong dignity guarantees.
- Systemic reduction of coordination heroics across nonprofit ecosystems.

## User Journeys

### Journey 1: Furniture Donor - Public Pickup Request (Primary External Path)

Opening scene:
A donor has large items to contribute but cannot transport them to the thrift store.

Rising action:
1. Donor uses public online pickup form.
2. Enters location/contact/item details.
3. System checks eligibility and available pickup windows.
4. Donor receives either schedulable options or explicit refusal with alternatives.

Climax:
- Pickup is scheduled into a real run with capacity constraints enforced.

Resolution:
- Item is collected, completion is captured, and request reaches terminal state.

Edge scenarios:
- Out-of-area address, no available capacity, incomplete item details.
- All requests still end in explicit terminal outcomes (no silent loss).

### Journey 2: Cashier / Front-End Staff - Assisted Intake + Voucher Delivery Scheduling

Opening scene:
Front-end staff receive phone calls from low-tech users and assist voucher recipients at checkout.

Rising action:
1. Staff enters donor request on caller’s behalf.
2. Staff validates required fields and triage attributes.
3. Staff schedules voucher-recipient delivery at checkout.
4. Staff confirms slot or executes refusal-with-alternatives.

Climax:
- Scheduling is completed in-system without whiteboards/text side channels.

Resolution:
- Request is capacity-checked, visible, and tracked through terminal state.

### Journey 3: Frontline Operator / Dispatcher - Daily Run Construction

Opening scene:
Dispatcher starts with mixed queue where donation pickups are primary workload.

Rising action:
1. Reviews inbox and triage attributes.
2. Builds pickup-first runs.
3. Inserts limited morning deliveries.
4. Reorders stops and publishes.
5. Monitors exceptions (cancellations/no-answer/capacity conflicts).

Climax:
- Published run reflects true capacity and operational priorities.

Resolution:
- State transitions and refusals are logged with no shadow process.

### Journey 4: Driver / Field Executor - Pickup-Dominant Execution Day

Opening scene:
Driver opens day run where donation pickups dominate and deliveries are occasional.

Rising action:
1. Opens assigned run.
2. Follows stop order.
3. Updates statuses (`en_route`, `arrived`, `completed`).
4. Captures completion proof (notes/photo/signature/GPS best effort).

Climax:
- Completion evidence is captured once and immutably stored.

Resolution:
- Stops close with minimal ambiguity and low clarification loops.

### Journey 5: Program Leadership / Support Oversight

Opening scene:
Leadership/support requires operational signal without managing run-by-run execution.

Rising action:
1. Reviews completion, terminal-state coverage, and capacity utilization.
2. Identifies bottlenecks and refusal patterns.
3. Uses audit traces for incident follow-up.

Climax:
- Decisions are made from structured system signal instead of spreadsheet reconstruction.

Resolution:
- Capacity and process improvements are made without violating dignity constraints.

### Journey Requirements Summary

Capabilities revealed by journeys:
- Public donor intake with eligibility + capacity-aware scheduling/refusal
- Assisted intake and checkout-based delivery scheduling
- Pickup-first run planning with controlled publish flow
- Mobile driver execution with immutable completion proof
- Terminal-state enforcement and explicit refusal alternatives
- Audit/event traceability for state changes and exceptions
- Operational reporting focused on reliability, capacity, and completion integrity

## Domain-Specific Requirements

### Compliance & Regulatory
- Enforce consent-aware data handling before cross-org coordination expansion.
- Preserve explicit refusal semantics as first-class business outcomes (`ok=false` with HTTP 200 where contract requires).
- Maintain auditable, immutable completion records for operational integrity.
- Ensure policy-gated workflow execution (`docs/policies/git_policy.md`) in delivery process.

### Technical Constraints
- Multi-tenant isolation is mandatory (`tenant_id` resolution + filtered persistence/query paths).
- First-party auth hardening required (session table, refresh rotation, secure cookie controls).
- CSRF required for state-changing routes.
- Parent-domain cookie model must support app.* + api.* topology.
- Idempotency required for mobile/field completion submissions.
- Terminal-state enforcement required for all request lifecycles.

### Integration Requirements
- WordPress remains thin UI where specified; scheduling/execution state must move to monolith.
- Route bridge APIs must support staged cutover without dual-write corruption.
- Platform event logging must exist before deeper module coupling.
- Outbox/event spine should be present for future module-to-module choreography.
- Future POS integration must connect fulfillment, inventory, and delivery linkage.
- Multi-tenant module access model:
  - Tenant can be entitled to any combination of modules.
  - Tenant admins can manage tenant-scoped users and module roles.
  - Module route access is deny-by-default unless module entitlement + role checks pass.
  - Entitlement and role changes are audit logged.

### Risk Mitigations
- Risk: shadow workflows (whiteboards/texts) reappear.
- Mitigation: adoption gate requiring 100% in-system scheduling.

- Risk: silent request failures.
- Mitigation: hard terminal-state coverage and explicit refusal pathways.

- Risk: overbooking and trust erosion.
- Mitigation: pre-schedule capacity visibility and no public over-capacity booking.

- Risk: extractive reporting drift.
- Mitigation: enforce aggregate-only funder reporting and prohibit individual scoring/surveillance metrics.

- Risk: migration instability during brownfield conversion.
- Mitigation: strict small-PR phase sequencing (A-H), no behavior refactor mixed with large structural moves.

## Innovation & Novel Patterns

### Detected Innovation Areas

- Governance-by-design: dignity and refusal semantics encoded as technical constraints.
- Execution-first architecture: solve operational fracture before adding coordination abstraction.
- Ethical modular monolith: shared kernel guarantees prevent module-level policy drift.
- Trust invariants: terminal-state coverage plus immutable completion proof as product primitives.
- Tenant capability governance: module entitlements and role-scoped access in a shared platform.

### Market Context & Competitive Landscape

- Existing tools tend toward either compliance-heavy data extraction or low-discipline operational tooling.
- Shyft differentiates by coupling reliability metrics with explicit anti-extractive boundaries.
- Competitive edge is consistency of trust constraints across modules, not feature novelty alone.

### Validation Approach

- Validate through staged gates:
  - Adoption gate (100% in-system scheduling)
  - Integrity gate (terminal-state coverage, completion/overbook targets)
  - Capacity discipline gate (pre-schedule capacity use, no public overbooking)
  - Trust gate (no silent failures, refusal alternatives)
- Validate innovation through operational outcomes, not narrative claims.

### Risk Mitigation

- Risk: innovation theater without execution discipline.
- Mitigation: gate progression strictly on measurable invariants.

- Risk: policy drift across modules.
- Mitigation: platform-kernel enforcement plus deny-by-default module access checks.

- Risk: novelty claims with weak migration feasibility.
- Mitigation: A-H phased migration with no mixed structural/behavioral refactor PRs.

## SaaS B2B Specific Requirements

### Project-Type Overview

Shyft is a multi-tenant operations platform delivered as a modular monolith with controlled module entitlements per tenant. The product serves nonprofit operational teams with execution-critical workflows, requiring strong tenancy isolation, role-governed access, and auditable state transitions.

### Technical Architecture Considerations

- Platform-level request context resolution is mandatory for every request path using `{ tenantId, orgUnitId|null, scopeMode }`.
- `tenant` is the hard isolation boundary; `orgUnit` is a soft boundary within tenant.
- `scopeMode` drives repository enforcement:
  - `TENANT` mode requires `tenant_id`.
  - `ORG_UNIT` mode requires `tenant_id` + `org_unit_id`.
- Module access is entitlement-driven (tenant may enable any subset of modules).
- Authorization is role-based across system, tenant, and orgUnit layers.
- Route/module handlers must enforce deny-by-default when entitlement or role checks fail.
- Immutable completion records and terminal-state invariants are core system guarantees.
- Cookie/auth/CSRF controls must remain consistent across app.* and api.* surfaces.
- Billing sponsorship relationships must not imply cross-tenant data visibility.

### Tenant Model

- `tenant` is the top-level boundary for data and access.
- Tenant lifecycle states: `active`, `suspended`, `archived`.
- Tenant may enable module combinations (Route, Operations, Resource, POS, etc.) independently.
- Tenant-owned users exist within tenant scope and can belong to multiple tenants using explicit active tenant context selection.
- Tenant archetypes supported:
  - tenant with users only
  - tenant with internal orgUnits and orgUnit-scoped users
  - sponsor-funded independent tenants (financial sponsorship only, no inherited data visibility)
- OrgUnits are optional soft boundaries inside tenants and never cross tenant boundaries.
- UI/API require explicit active tenant and (where required) active orgUnit context.
- Tenant administration APIs/UI required for:
  - user invite/remove
  - orgUnit create/update
  - module enable/disable
  - role assignment and revocation

### RBAC Matrix

Core role layers:
- System roles:
  - `SYSTEM_ADMIN` (internal-only; platform-wide governance)
- Tenant roles:
  - `TENANT_ADMIN`
  - `TENANT_STAFF`
  - `TENANT_VIEWER`
- OrgUnit roles:
  - `ORGUNIT_ADMIN`
  - `ORGUNIT_MEMBER`
  - `ORGUNIT_IDENTITY_LEAD`

Access principles:
- deny by default
- least privilege
- explicit capability grants by scope layer
- auditable entitlement and role changes

### Subscription Tiers

Current assumption:
- MVP does not require monetization tiers; operational enablement is tenant-policy driven.

Future-ready requirement:
- entitlement model should support tiered packaging later without schema redesign.

### Integration List

- WordPress thin UI bridge (staged cutover)
- Internal module event/audit integration (Route -> Operations -> Resource -> POS progression)
- Future POS integration for fulfillment and inventory linkage
- Optional external notifications (email baseline; SMS deferred)

### Compliance Requirements

- Consent-aware data handling before cross-org coordination expansion
- Non-extractive reporting boundaries (aggregate signal, no individual scoring/surveillance)
- CSRF on state-changing routes
- Auditability of refusals, state transitions, and completion records
- Policy gating via `docs/policies/git_policy.md` and CI `policy:check`

### Implementation Considerations

- Route registration should be module-aware and entitlement-gated.
- Shared platform kernel must provide tenancy, auth, refusal envelope, audit/event, and policy utilities.
- Migration sequence must preserve brownfield stability (small PR phases, no mixed move+logic refactors).
- Idempotency required for field/mobile completion submission paths.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Execution-discipline MVP (infrastructure reliability over feature breadth)  
**Resource Requirements:** Lean core team with backend/platform ownership, dispatcher-facing UX support, and migration-safe QA gates.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Furniture donor public pickup request flow
- Cashier-assisted intake + voucher checkout delivery scheduling
- Dispatcher pickup-first run construction/publish
- Driver pickup-dominant execution with immutable completion proof
- Leadership/support oversight via operational signal

**Must-Have Capabilities:**
- Phase 0 platform spine: tenancy, first-party auth/session rotation, CSRF, refusal envelope, event/audit baseline
- RouteShyft MVP: intake eligibility + capacity checks, dispatcher console, driver view, terminal-state enforcement
- Completion integrity: immutable completion records + proof capture
- Trust controls: explicit refusals with alternatives, zero silent drop paths
- Policy controls: mandatory policy gate and branch/workflow guard compliance

### Post-MVP Features

**Phase 2 (Post-MVP):**
- OperationsShyft full rollout (WorkSite/WorkOrder template execution)
- WP bridge completion and monolith-first state authority
- Capacity and execution signal hardening for cross-module handoff readiness

**Phase 3 (Expansion):**
- ResourceShyft activation after refusal/capacity signal maturity
- POS integration for fulfillment + inventory + delivery linkage
- Cross-org coordination layers with consent and policy guardrails

### Risk Mitigation Strategy

**Technical Risks:**
- Brownfield migration instability and module drift  
Mitigation: strict A-H sequencing, small PRs, no mixed structural+behavioral refactor changes.

**Market Risks:**
- Adoption without operational behavior change  
Mitigation: binary adoption gate (100% in-system scheduling, no shadow process).

**Resource Risks:**
- Team bandwidth constraints during phased migration  
Mitigation: pickup-first scope discipline, defer non-essential analytics/automation, enforce must-have gate criteria.

## Functional Requirements

### Commitment Management (Core Spine)

- FR-C1: Authorized users can create a Commitment from an approved source (request, work order, POS transaction, manual entry).
- FR-C2: The system can represent each Commitment in a traceable lifecycle from creation to terminal state.
- FR-C3: The system can enforce terminal-state completion for every Commitment.
- FR-C4: The system can group Commitments into execution containers (Run, Work Session, Delivery Batch) and preserve ordering where applicable.
- FR-C5: The system can record immutable, append-only completion proof against a Commitment.
- FR-C6: The system can prevent silent drop-offs by requiring explicit Commitment state transitions (`scheduled`, `in_progress`, `completed`, `canceled`, `refused`).
- FR-C7: The system can compute and persist Commitment capacity impact used for slotting and publish constraints.
- FR-C8: The system can link a Request to zero-or-one resulting Commitment (or refusal outcome) without duplicating lifecycle logic.

### Tenant & Access Management

- FR1: `SYSTEM_ADMIN` can create, activate, suspend, and archive tenants and assign initial `TENANT_ADMIN`.
- FR2: `TENANT_ADMIN` can create/update orgUnits within tenant and assign orgUnit administrators.
- FR3: The platform can assign users to tenants and to multiple orgUnits within tenant using explicit active tenant context.
- FR4: Every authenticated request resolves `{tenantId, orgUnitId|null, scopeMode}`; orgUnit-scoped routes reject missing/invalid orgUnit context.
- FR5: OrgUnit context is validated against tenant membership and orgUnit membership unless tenant-privileged role is present.
- FR6: Repository enforcement prevents omitted tenant filters and, for orgUnit-scoped access, omitted orgUnit filters.
- FR7: Authorization is deny-by-default and capability-gated across system/tenant/orgUnit role layers.
- FR8: All tenant/orgUnit/membership/entitlement mutations emit auditable events and outbox records atomically.

### Intake & Request Lifecycle (Input Layer)

- FR9: Furniture donors can submit pickup requests through a public form.
- FR10: Cashier/front-end staff can create pickup requests on behalf of callers.
- FR11: Cashier/front-end staff can schedule voucher-recipient deliveries at checkout.
- FR12: The system can validate service eligibility before scheduling.
- FR13: The system can perform capacity-aware sloting before confirming schedule.
- FR14: The system can issue explicit refusals with structured alternatives when requests cannot be scheduled.
- FR15: The system can send confirmation notifications for accepted schedules.
- FR16: The system can keep each request in a traceable lifecycle ending in either refusal/cancellation OR linked Commitment creation.
- FR17: The system can enforce terminal-state handling for requests and enforce terminal-state completion for linked Commitments.

### Dispatch & Run Planning (Commitment Containers)

- FR18: Dispatchers can view and triage incoming requests in a single queue.
- FR19: Dispatchers can capture required triage attributes (`item_volume_class`, `stairs_required`, `disassembly_required`, `crew_size_hint`, `pickup_or_delivery`) before scheduling or refusal decisions.
- FR20: Dispatchers can create and edit runs as execution containers of Commitments.
- FR21: Dispatchers can add, remove, and reorder Commitment stops in runs.
- FR22: Dispatchers can publish runs for driver execution.
- FR23: Dispatchers can process explicit refusal workflows from dispatch context.
- FR24: The system can prevent publishing schedules that violate capacity constraints derived from Commitment impacts.
- FR25: The system can support pickup-first run composition with limited delivery insertion.

### Field Execution & Completion Proof

- FR26: Drivers can view assigned runs and ordered Commitment stops for the current day.
- FR27: Drivers can update Commitment status through execution states.
- FR28: Drivers can submit completion proof (notes, photos, signature, GPS best effort).
- FR29: The system can create immutable completion records attached to Commitments.
- FR30: The system can prevent duplicate completion side effects through idempotent submission behavior.
- FR31: The system can support exception handling for execution-day disruptions by requiring explicit exception type (`no_answer`, `donor_unavailable`, `unsafe_access`, `vehicle_issue`, `weather_delay`, `item_mismatch`) and operator action (`reschedule`, `refuse_with_alternative`, `return_to_queue`, `cancel_with_reason`).

### Refusal, Trust & Dignity Controls

- FR32: The system can represent refusals as explicit first-class outcomes.
- FR33: The system can support refusal before commitment creation (request-level) and refusal/cancellation after commitment creation (commitment-level).
- FR33a: The system can attach structured alternatives to refusals before commitment and after commitment.
- FR34: The system can prevent silent drop-offs by requiring explicit state transitions.
- FR35: The system can enforce non-extractive reporting boundaries on operational data usage.
- FR36: Authorized stakeholders can view aggregate outcomes without individual surveillance profiling.

### Audit, Events & Policy Governance

- FR37: The system can record auditable state transitions for requests, commitments, runs, and completions.
- FR38: The system can record refusal events for traceability and analysis.
- FR39: The platform can expose event records needed for downstream module integration.
- FR40: The platform can support outbox-driven integration readiness for future module choreography.
- FR41: The development workflow can enforce policy gate validation prior to downstream CI execution.
- FR42: The development workflow can enforce branch/workflow guard compliance for story/epic operations.

### Operational Reporting & Oversight

- FR43: Leadership/support users can view completion, capacity utilization, run status, and terminal-state coverage.
- FR44: Leadership/support users can identify bottlenecks and refusal pattern trends by day/week, reason code, route type (pickup/delivery), and service zone.
- FR45: Leadership/support users can trace incidents through audit history.
- FR46: The system can surface gate metrics with explicit thresholds: adoption (`100%` scheduling in-system), integrity (`100%` terminal-state coverage, `>=92%` completion rate, `<=2%` accidental overbook rate, `>=95%` completion-proof capture), capacity discipline (`>=98%` accurate capacity state visibility, `0` public overbooking incidents), and trust (`0` silent drop-offs, `>=90%` refusals with structured alternatives).
- FR47: The system can support aggregate funder-oriented reporting without individual-level case tracking.

### Phased Expansion Enablement

- FR48: The platform can accept Operations commitments and coordinate downstream fulfillment.
- FR49: The platform can transition WordPress scheduling/state responsibilities into monolith services while preserving commitment linkage.
- FR50: The platform can accept POS-origin commitments and support inventory/fulfillment updates on commitment completion.

## Non-Functional Requirements

### Performance

- NFR1: Dispatcher console interactions for triage, run composition, and publish actions shall return user-visible confirmation within 2 seconds under normal operating load.
- NFR2: Donor public intake submission shall complete with confirmation or explicit refusal response within 3 seconds under normal operating load.
- NFR3: Driver status updates and completion submissions shall acknowledge within 2 seconds when connected.
- NFR4: Capacity checks used for scheduling decisions shall return within 1 second under normal operating load.
- NFR5: Operational dashboards for completion/capacity/terminal-state views shall load summary views within 3 seconds for current-day and current-week windows.
- NFR5a: All latency targets are measured at P95 unless explicitly stated otherwise.
- NFR5b: Normal operating load baseline shall be defined as tenant/session/throughput baselines (tenants, concurrent staff, concurrent drivers, requests/day, stops/day) and reviewed quarterly.

### Security

- NFR6: All authenticated state-changing routes shall enforce CSRF validation.
- NFR7: Authentication shall use first-party session management with refresh-token rotation and revocation support.
- NFR8: Sensitive tokens and session identifiers shall be stored/transmitted using secure, HttpOnly cookie practices for app.* and api.* topology.
- NFR9: Tenant isolation shall be enforced on every data access path; cross-tenant reads/writes are prohibited unless explicitly authorized for platform-admin workflows.
- NFR9a: Tenant isolation enforcement shall include mandatory tenant_id repository filters, tenant-scoped composite keys/indexes, and test coverage that verifies cross-tenant access failure.
- NFR10: Module access shall be deny-by-default and require explicit entitlement + role authorization.
- NFR11: All refusal, state-transition, entitlement, and role-change events shall be audit logged with actor, timestamp, and reason metadata.
- NFR11a: Audit/event payloads shall be minimal and redacted; no passwords/tokens and no unnecessary PII in logs.
- NFR12: Data in transit shall be encrypted; sensitive stored credentials/secrets shall not be persisted in plaintext.
- NFR12a: Secrets shall be stored in environment/secret manager; refresh tokens in persistence are stored only as salted hashes.

### Reliability & Integrity

- NFR13: The system shall guarantee terminal-state handling for all commitments and requests according to lifecycle rules.
- NFR13a: Commitments shall never exist in undefined states; each must have valid enumerated status and valid transition history.
- NFR14: Completion records shall be immutable once finalized (append-only corrections only).
- NFR15: Completion and status submissions from field clients shall be idempotent to prevent duplicate side effects.
- NFR15a: Driver clients shall queue status/completion submissions offline and retry with idempotency keys, exposing explicit queued/sync states to users.
- NFR16: The system shall prevent silent drop-offs by rejecting ambiguous/implicit state transitions.
- NFR17: Publish operations shall fail safely when capacity constraints are violated.
- NFR18: Core workflow failures shall surface explicit operator-facing error states with recoverable next actions.

### Scalability

- NFR19: The platform shall support incremental tenant/module growth without changing tenancy, entitlement, or lifecycle invariants.
- NFR20: Route and Operations module load growth shall not require redefinition of commitment lifecycle contracts.
- NFR21: Reporting and operational query patterns shall support 12-month trend windows.
- NFR21a: Event/audit retention shall support at least 12 months online; reporting shall use indexed aggregates/materialized views where needed (no ad hoc full scans in production paths).

### Accessibility

- NFR22: Dispatcher and cashier operational interfaces shall be usable at minimum 800x600 viewport.
- NFR23: Public donor intake and staff workflows shall meet WCAG 2.2 AA baseline for keyboard navigation, contrast, labels, and error messaging.
- NFR23a: Core workflows shall remain fully functional at 200% text zoom without loss of content/function.
- NFR23b: Reduced-motion preferences shall be respected; no required animations for task completion.

### Integration

- NFR25: WordPress bridge integration shall preserve consistent request/commitment linkage across staged cutover.
- NFR26: Module integration events shall be persisted in a form compatible with outbox-driven delivery.
- NFR27: Route/Operations/POS integration shall preserve commitment lineage across source and fulfillment updates.
- NFR27a: Every commitment shall carry immutable lineage fields: source_type, source_id, and optional external_ref for bridge systems.
- NFR28: External integration failures (email/bridge/downstream handlers) shall not leave commitments in undefined states.

### Compliance & Policy Governance

- NFR29: Policy gate validation (`npm run policy:check`) shall be a blocking CI prerequisite for downstream quality jobs.
- NFR30: Branch/workflow guard compliance shall be required for story/epic workflow execution paths.
- NFR31: Funder reporting exports shall be aggregate-only and exclude prohibited individual surveillance fields.
- NFR31a: Row-level person-linked operational exports for funder reporting are disallowed unless consent layer gates explicitly permit purpose-limited access.
- NFR32: Cross-org sharing capabilities shall remain disabled by default until consent-layer readiness criteria are met.
- NFR32a: Cross-org sharing features shall be feature-flagged OFF by default and require explicit consent-module readiness and policy checks.

### Lifecycle Expiry Policy (Operational Guardrails)

- NFR33: Submitted requests shall auto-expire after `7` calendar days without triage activity and record `auto_expired_untriaged` reason code.
- NFR34: Waitlisted records shall auto-expire after `30` calendar days without renewal and record `auto_expired_waitlist` reason code.
- NFR35: Commitments shall auto-escalate after `24` hours of inactivity while in `scheduled` or `in_progress`; unresolved escalations shall auto-close after `72` hours with auditable reason code.
