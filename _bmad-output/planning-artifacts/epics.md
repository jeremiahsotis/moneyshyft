---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification.md
  - /Users/jeremiahotis/moneyshyft/ROADMAP.md
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
---

# Shyft - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Shyft, decomposing PRD, architecture, UX, and roadmap constraints into implementation-ready stories.

## Requirements Inventory

### Functional Requirements

- Commitment spine: FR-C1..FR-C8
- Tenant and access: FR1..FR8
- Intake and request lifecycle: FR9..FR17
- Dispatch and run planning: FR18..FR25
- Field execution and proof: FR26..FR31
- Refusal and dignity: FR32..FR36 (incl. FR33a)
- Audit/events/policy governance: FR37..FR42
- Reporting and oversight: FR43..FR47
- Phased expansion: FR48..FR50

### NonFunctional Requirements

- Performance and latency SLOs: NFR1..NFR5b
- Security and tenancy isolation: NFR6..NFR12a
- Reliability and integrity: NFR13..NFR18
- Scalability and retention: NFR19..NFR21a
- Accessibility and usability baselines: NFR22..NFR23b
- Integration and lineage: NFR25..NFR28
- Policy/compliance governance: NFR29..NFR32a
- Lifecycle expiry guardrails: NFR33..NFR35

### Additional Requirements

- Commitment management is the canonical system spine across Route, Operations, and POS.
- Pickup workflow is primary; delivery is constrained insertion.
- WP remains thin UI during bridge/cutover with monolith as state authority.
- Policy-first workflow enforcement is mandatory (`policy:check`, branch guard).
- UTC persistence with timezone-local display required across all surfaces.

### FR Coverage Map

- Epic 1: FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR41, FR42
- Epic 2: FR-C1, FR-C2, FR-C3, FR-C6, FR-C8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR32, FR33, FR33a, FR34
- Epic 3: FR-C4, FR-C7, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25
- Epic 4: FR-C5, FR26, FR27, FR28, FR29, FR30, FR31
- Epic 5: FR35, FR36, FR37, FR38, FR39, FR40, FR43, FR44, FR45, FR46, FR47
- Epic 6: FR49
- Epic 7: FR48, FR50

## Epic List

### Epic 1: Platform Kernel and Tenant Access Foundations
Deliver secure, multi-tenant, role-governed platform controls and policy-gated workflow enforcement.
**FRs covered:** FR1..FR8, FR41, FR42

### Epic 2: Commitment Core and Intake-to-Commitment Conversion
Implement commitment lifecycle core and unify donor/cashier intake paths into explicit commitment or refusal outcomes.
**FRs covered:** FR-C1, FR-C2, FR-C3, FR-C6, FR-C8, FR9..FR17, FR32, FR33, FR33a, FR34

### Epic 3: Dispatcher Run Planning and Capacity-Constrained Scheduling
Provide queue triage, run management, publish constraints, and pickup-first planning behavior.
**FRs covered:** FR-C4, FR-C7, FR18..FR25

### Epic 4: Driver Execution and Immutable Completion Proof
Deliver driver day execution, idempotent updates, immutable proof capture, and exception handling.
**FRs covered:** FR-C5, FR26..FR31

### Epic 5: Audit, Reporting, and Governance Controls
Expose operational visibility, auditable history, event/outbox readiness, and dignity-safe reporting.
**FRs covered:** FR35..FR40, FR43..FR47

### Epic 6: WordPress Bridge and Monolith State Authority Cutover
Bridge Route workflows from WP to monolith services without dual-write drift.
**FRs covered:** FR49

### Epic 7: Expansion Interfaces for Operations and POS Commitments
Enable downstream Operations and POS commitment interoperability without changing core lifecycle semantics.
**FRs covered:** FR48, FR50

## Epic 1: Platform Kernel and Tenant Access Foundations

Deliver secure, multi-tenant, role-governed platform controls and policy-gated workflow enforcement.

### Story 1.1: Tenant Context Resolution and Isolation Guardrails

As a platform engineer,
I want every request to resolve tenant context and enforce tenant data boundaries,
So that cross-tenant data leakage is structurally prevented.

**Acceptance Criteria:**

**Given** an authenticated or anonymous request reaches the API
**When** middleware resolves tenancy
**Then** a canonical tenant identifier is attached to request context
**And** repository paths reject cross-tenant access attempts.

### Story 1.2: Tenant and Module Entitlement Administration

As a tenant admin,
I want to manage module entitlements and user role assignments,
So that only authorized users can access enabled module actions.

**Acceptance Criteria:**

**Given** a tenant admin opens tenant settings
**When** they enable/disable a module or change user/module roles
**Then** authorization behavior updates immediately for protected actions
**And** every entitlement/role change is audit logged.

### Story 1.3: First-Party Auth, Sessions, and CSRF Enforcement

As a platform operator,
I want first-party session rotation and CSRF protection across app/api domains,
So that authentication is resilient and state-changing routes are protected.

**Acceptance Criteria:**

**Given** a user authenticates
**When** refresh token rotation occurs
**Then** session records are persisted and revocation is supported
**And** state-changing routes fail without valid CSRF token.

### Story 1.4: Shared Response Envelope and Refusal Helpers

As an API consumer,
I want a consistent success/refusal/systemError envelope,
So that clients can handle business refusals deterministically.

**Acceptance Criteria:**

**Given** an API route returns success, refusal, or system error
**When** the response is serialized
**Then** it follows shared envelope helpers
**And** business refusals return `HTTP 200` with `ok=false`.

### Story 1.5: Policy Gate and Branch Workflow Guard Enforcement

As a maintainer,
I want CI and local workflow guards to enforce git policy,
So that branch/workflow discipline is mandatory and auditable.

**Acceptance Criteria:**

**Given** a pipeline run starts
**When** policy checks execute
**Then** downstream quality jobs are blocked on policy failure
**And** branch guard commands validate story/epic workflow branch compliance.

## Epic 2: Commitment Core and Intake-to-Commitment Conversion

Implement commitment lifecycle core and unify donor/cashier intake paths into explicit commitment or refusal outcomes.

### Story 2.1: Commitment Domain Model and Transition Rules

As a dispatcher,
I want commitments represented as first-class entities with explicit transitions,
So that execution promises are traceable and terminal-state enforced.

**Acceptance Criteria:**

**Given** a commitment is created
**When** its status changes
**Then** only valid lifecycle transitions are allowed
**And** terminal state is required by policy.

### Story 2.2: Donor Self-Service Pickup Intake with Capacity Check

As a furniture donor,
I want to submit a pickup request and see real scheduling availability,
So that I get a definitive commitment or refusal outcome.

**Acceptance Criteria:**

**Given** a donor submits eligibility and item details
**When** capacity is evaluated
**Then** the system returns schedulable slots or explicit refusal with alternatives
**And** accepted requests create linked commitments.

### Story 2.3: Cashier-Assisted Intake and Voucher Delivery Scheduling

As cashier staff,
I want to create donor requests by phone and schedule voucher deliveries at checkout,
So that low-tech users and recipients get consistent in-system outcomes.

**Acceptance Criteria:**

**Given** staff enters intake/scheduling details
**When** they submit
**Then** the same validation, capacity, and refusal rules as public intake apply
**And** resulting requests link to commitments or refusal outcomes.

### Story 2.4: Request-to-Commitment Linkage and Terminal Enforcement

As operations staff,
I want each request to end in refusal/cancellation or linked commitment,
So that no request is lost in undefined state.

**Acceptance Criteria:**

**Given** a request lifecycle starts
**When** it is processed
**Then** it reaches an explicit terminal request state
**And** linked commitments independently reach terminal commitment states.

### Story 2.5: Refusal Outcomes with Structured Alternatives

As a requester,
I want refusal outcomes with alternatives before or after commitment creation,
So that refusal is explicit, understandable, and actionable.

**Acceptance Criteria:**

**Given** scheduling or execution cannot proceed
**When** refusal is issued
**Then** refusal reason and structured alternatives are persisted
**And** refusal is visible in lifecycle/audit history.

## Epic 3: Dispatcher Run Planning and Capacity-Constrained Scheduling

Provide queue triage, run management, publish constraints, and pickup-first planning behavior.

### Story 3.1: Unified Dispatcher Queue and Triage Attributes

As a dispatcher,
I want a single queue with required triage fields,
So that I can make scheduling decisions with complete operational context.

**Acceptance Criteria:**

**Given** inbound requests are pending triage
**When** dispatcher captures required attributes
**Then** requests become schedulable or refusible with complete metadata
**And** missing required fields block scheduling actions.

### Story 3.2: Run Creation, Stop Ordering, and Edit Operations

As a dispatcher,
I want to create runs and manage ordered stops,
So that daily commitments are executable in practical route order.

**Acceptance Criteria:**

**Given** a run exists
**When** dispatcher adds/removes/reorders stops
**Then** stop sequence is persisted reliably
**And** edits remain auditable before publish.

### Story 3.3: Publish Constraints from Commitment Capacity Impact

As a dispatcher,
I want publish-time capacity validation,
So that over-capacity schedules cannot be released.

**Acceptance Criteria:**

**Given** a run is ready to publish
**When** publish is attempted
**Then** commitment impact and capacity constraints are revalidated
**And** publish is blocked with explicit reason if constraints fail.

### Story 3.4: Pickup-First Planning with Limited Delivery Insertion

As a dispatcher,
I want pickup work to remain primary while allowing constrained deliveries,
So that truck utilization reflects real operating model.

**Acceptance Criteria:**

**Given** mixed pickup/delivery commitments
**When** run composition occurs
**Then** pickup-first rules are enforced
**And** delivery insertion honors configured limits and constraints.

## Epic 4: Driver Execution and Immutable Completion Proof

Deliver driver day execution, idempotent updates, immutable proof capture, and exception handling.

### Story 4.1: Driver Daily Run View and Ordered Stop Navigation

As a driver,
I want a mobile-first view of today’s ordered stops,
So that I can execute assignments without ambiguity.

**Acceptance Criteria:**

**Given** a run is published for a driver
**When** driver opens daily view
**Then** assigned run and ordered stops are shown clearly
**And** unavailable/changed runs surface explicit status.

### Story 4.2: Execution State Updates with Idempotent Submissions

As a driver,
I want status updates to be safely retryable,
So that poor connectivity does not create duplicate side effects.

**Acceptance Criteria:**

**Given** a driver submits status updates
**When** duplicate or retried submissions occur
**Then** updates are idempotently processed
**And** queued/offline retry state is visible to user.

### Story 4.3: Completion Proof Capture and Immutable Records

As a driver,
I want to submit completion notes/photos/signature/GPS,
So that completion proof is durable and auditable.

**Acceptance Criteria:**

**Given** a stop is ready for completion
**When** driver submits proof package
**Then** immutable completion record is appended
**And** finalized proof cannot be overwritten.

### Story 4.4: Execution-Day Exception Handling

As frontline staff,
I want standardized exception codes and operator actions,
So that disruptions are handled explicitly rather than silently dropped.

**Acceptance Criteria:**

**Given** execution cannot proceed normally
**When** an exception is recorded
**Then** allowed exception type and operator action are required
**And** lifecycle updates remain explicit and auditable.

## Epic 5: Audit, Reporting, and Governance Controls

Expose operational visibility, auditable history, event/outbox readiness, and dignity-safe reporting.

### Story 5.1: State Transition Audit Ledger

As leadership/support,
I want complete audit history for requests, commitments, runs, and completion events,
So that incidents are traceable and governance is enforceable.

**Acceptance Criteria:**

**Given** core entities change state
**When** transitions occur
**Then** actor/timestamp/reason metadata is recorded
**And** history is queryable by authorized roles.

### Story 5.2: Events and Outbox Integration Readiness

As platform engineering,
I want mutation paths to emit events and outbox records,
So that module integration can scale without direct coupling.

**Acceptance Criteria:**

**Given** a domain mutation completes
**When** transaction commits
**Then** corresponding event and outbox records exist
**And** mutation handlers cannot bypass this contract.

### Story 5.3: Operational Dashboards for Execution Integrity

As operations leadership,
I want visibility into completion, utilization, terminal-state coverage, and bottlenecks,
So that we can correct execution drift quickly.

**Acceptance Criteria:**

**Given** authorized staff opens reporting views
**When** they filter by date, reason code, route type, or zone
**Then** metrics and trends render within defined performance targets
**And** incident drill-down links to audit trail.

### Story 5.4: Dignity-Safe Aggregate Reporting Exports

As stakeholder reporting users,
I want aggregate outcomes without person-level surveillance data,
So that reporting aligns with dignity boundaries.

**Acceptance Criteria:**

**Given** a reporting export is requested
**When** funder-facing outputs are generated
**Then** only aggregate signal fields are included
**And** prohibited person-linked fields are excluded unless consent policy explicitly allows.

## Epic 6: WordPress Bridge and Monolith State Authority Cutover

Bridge Route workflows from WP to monolith services without dual-write drift.

### Story 6.1: Bridge Fulfillment and Pending Endpoints

As WP integration clients,
I want bridge APIs for fulfillment creation and pending fetch,
So that WP can remain a thin UI while monolith owns execution state.

**Acceptance Criteria:**

**Given** WP invokes bridge endpoints
**When** fulfillment/pending requests are processed
**Then** monolith responds with canonical lifecycle data
**And** state authority remains monolith-side.

### Story 6.2: Bridge Completion Endpoint and Idempotency

As WP integration clients,
I want completion submissions to be idempotent and traceable,
So that completion state remains consistent under retries.

**Acceptance Criteria:**

**Given** completion payloads arrive from bridge
**When** duplicates or retries occur
**Then** final state is consistent and no duplicate side effects occur
**And** bridge lineage identifiers remain intact.

### Story 6.3: Cutover Controls and Dual-Write Prevention

As platform operators,
I want controlled migration toggles and validation checks,
So that WP storage is retired without split-brain state.

**Acceptance Criteria:**

**Given** cutover stages progress
**When** authority switches to monolith paths
**Then** dual-write patterns are blocked
**And** reconciliation checks confirm single-source-of-truth behavior.

## Epic 7: Expansion Interfaces for Operations and POS Commitments

Enable downstream Operations and POS commitment interoperability without changing core lifecycle semantics.

### Story 7.1: Operations Commitment Intake Contract

As Operations module,
I want to emit fulfillment commitments into the shared commitment system,
So that Route execution can consume structured upstream work.

**Acceptance Criteria:**

**Given** Operations emits fulfillment events
**When** commitments are created in shared spine
**Then** lineage fields and lifecycle contracts are preserved
**And** downstream Route planning can consume them without custom mapping.

### Story 7.2: POS-Origin Commitment and Completion Linkage

As POS workflows,
I want delivery commitments linked to inventory/fulfillment updates,
So that completion events can drive inventory correctness.

**Acceptance Criteria:**

**Given** POS creates a commitment
**When** commitment reaches completion
**Then** fulfillment/inventory update hooks execute through integration contract
**And** audit lineage traces source and completion outcome.

### Story 7.3: Expansion Guardrails and Consent-Readiness Gates

As platform governance,
I want cross-org sharing disabled by default until consent readiness,
So that expansion does not violate policy boundaries.

**Acceptance Criteria:**

**Given** expansion features are present in code
**When** consent readiness is not met
**Then** cross-org sharing remains feature-flagged off
**And** policy checks block unauthorized activation.
