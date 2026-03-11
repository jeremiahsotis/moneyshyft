---
stepsCompleted: ["phase-0-scope", "phase-0-stories", "phase-0-gates"]
inputDocuments:
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
  - /Users/jeremiahotis/moneyshyft/ROADMAP.md
epicId: 0
epicName: "Platform Kernel Hardening"
branch: "codex/epic-0-ops"
---

# Epic 0 - Strict Phase-0 Kernel Story Set

## Goal

Harden the shared monolith kernel before any Route/Operations feature delivery so that tenancy, auth, CSRF, refusal semantics, event/outbox discipline, and timezone behavior are enforced platform-wide.

## Strict Scope (Phase 0 Only)

Included:
- Canonical tenancy context and tenant isolation controls
- First-party auth session model and refresh rotation
- CSRF and secure parent-domain cookie posture
- Shared response/refusal envelope standardization
- Event and outbox write discipline for all mutations
- Centralized timezone processing (`UTC at rest, local timezone at display`)
- Policy gate and branch guard enforcement paths

Explicitly excluded:
- Route intake, dispatch, driver, bridge workflows
- Operations module behaviors
- Resource/POS functional workflows
- Any module-level business feature not required for kernel invariants

## Story Set

### Story 0.1: Canonical App Entrypoint and Platform Middleware Chain

As a platform engineer,
I want one canonical app bootstrap with ordered platform middleware,
So that all modules inherit the same kernel guarantees.

**Acceptance Criteria:**

**Given** the server starts
**When** routes are registered
**Then** middleware order enforces correlation, tenancy resolution, auth context, and envelope handling
**And** all module routes are mounted through shared route registration.

### Story 0.2: Tenancy Context Resolution and Repository Enforcement

As a platform engineer,
I want tenant + orgUnit context resolution and mandatory scoped data access,
So that cross-tenant or cross-orgUnit reads/writes cannot occur by omission.

**Acceptance Criteria:**

**Given** any request reaches protected data paths
**When** data queries execute
**Then** request context includes `{tenantId, orgUnitId|null, scopeMode}`
**And** required filters are applied by scope mode
**And** orgUnit-scoped reads/writes validate orgUnit membership unless tenant-privileged role
**And** deterministic negative tests fail for cross-tenant, cross-orgUnit, and orgUnit spoofing attempts.

### Story 0.3: Platform Session Store and Refresh Rotation

As a security engineer,
I want first-party session persistence with refresh rotation,
So that token lifecycle and revocation are auditable and safe.

**Acceptance Criteria:**

**Given** authentication succeeds
**When** refresh operations occur
**Then** `platform.sessions` stores hashed refresh state, expiry, and revocation metadata
**And** replayed/revoked refresh tokens are rejected.

### Story 0.4: CSRF and Parent-Domain Cookie Enforcement

As a security engineer,
I want CSRF and cookie policy enforced for `app.*` / `api.*` topology,
So that state-changing routes are protected across domain boundaries.

**Acceptance Criteria:**

**Given** a state-changing authenticated request
**When** CSRF token is missing or invalid
**Then** request is rejected
**And** cookie flags/domain/same-site behavior follows environment-safe policy matrix.

### Story 0.5: Shared API Envelope and Business Refusal Contract

As an API consumer,
I want a consistent success/refusal/systemError contract,
So that clients handle business outcomes predictably.

**Acceptance Criteria:**

**Given** platform and module endpoints return responses
**When** responses are serialized
**Then** they use shared envelope helpers
**And** business refusals return HTTP 200 with `ok=false` and structured code/message.

### Story 0.6: Platform Events and Outbox Schema Foundations

As a platform architect,
I want canonical `platform.events` and `platform.outbox_events` schemas,
So that all write paths can emit integration-safe records.

**Acceptance Criteria:**

**Given** migration set runs
**When** platform schemas are provisioned
**Then** events and outbox tables exist with required lineage and delivery fields
**And** indexes support operational and replay queries.

### Story 0.7: Mutation Transaction Wrapper with Mandatory Event/Outbox Writes

As a backend developer,
I want a shared mutation execution wrapper,
So that handlers cannot persist state without corresponding event/outbox records.

**Acceptance Criteria:**

**Given** a mutation handler executes
**When** transaction commits
**Then** domain write + event + outbox are atomic
**And** missing event/outbox writes fail contract tests.

### Story 0.8: Centralized Time Service and UTC/Local Rendering Contract

As a product operator,
I want a unified date-time pipeline,
So that users/admin always see local timezone while storage remains UTC.

**Acceptance Criteria:**

**Given** date/time values are persisted and rendered
**When** formatting/parsing occurs
**Then** UTC storage and local display are enforced with fallback (`user -> tenant -> system`)
**And** contract tests confirm raw UTC is not displayed in operational UI responses.

### Story 0.9: CI Policy Gate as Blocking First Stage

As a maintainer,
I want policy checks to run before downstream quality jobs,
So that non-compliant workflow/branch operations are blocked immediately.

**Acceptance Criteria:**

**Given** CI starts
**When** policy stage fails
**Then** lint/test/burn-in/gates do not proceed
**And** failure output includes actionable policy violation context.

### Story 0.10: Kernel Readiness Verification Suite

As a release manager,
I want explicit kernel hardening checks,
So that Phase 1 Route work starts only when kernel controls are proven.

**Acceptance Criteria:**

**Given** Phase-0 verification runs
**When** checks complete
**Then** tenancy/auth/csrf/envelope/event-outbox/timezone gates all pass
**And** three-layer RBAC contracts are validated (`SYSTEM_ADMIN`, tenant roles, orgUnit roles)
**And** multi-tenant membership with explicit `activeTenantId` is validated
**And** global email uniqueness contract for platform identities is validated
**And** readiness status is recorded as Phase-0 complete before Route story execution.

## Phase-0 Exit Gates

All must pass before Route implementation stories begin:

1. Tenant isolation negative tests green.
2. Session rotation + revocation tests green.
3. CSRF/cookie policy matrix tests green.
4. Envelope/refusal contract tests green.
5. Mutation event/outbox contract tests green.
6. UTC storage + local timezone display tests green.
7. Policy gate blocks downstream jobs on violations.
8. Tenant + orgUnit scope enforcement tests green (including spoofing negatives).
9. RBAC capability matrix tests green for system/tenant/orgUnit layers.
10. Active tenant context enforcement and global identity uniqueness checks green.

## Implementation Order (Small PR Sequence)

1. Story 0.1
2. Story 0.2
3. Story 0.3 + 0.4
4. Story 0.5
5. Story 0.6 + 0.7
6. Story 0.8
7. Story 0.9
8. Story 0.10

## Handoff Rule

No Route story may move to `in-progress` until Story 0.10 acceptance criteria pass and the phase-0 exit gates are explicitly checked.
