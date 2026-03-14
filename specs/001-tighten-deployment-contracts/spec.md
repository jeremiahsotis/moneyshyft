# Feature Specification: Deployment Tightening Round

**Feature Branch**: `001-tighten-deployment-contracts`  
**Created**: 2026-03-08  
**Status**: Finalized  
**Input**: User description: "Specification Name: deployment-tightening-round"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reproducible Three-Lane Production Deploy (Priority: P1)

As a platform operator, I can deploy Admin, MoneyShyft, and ConnectShyft on one
small production server using one runbook and get the same outcome each time.

**Why this priority**: Reproducible deployment is the primary value of this
specification and blocks all runtime reliability goals.

**Independent Test**: Execute the runbook from a clean server profile and verify
all in-scope lanes are reachable and healthy without ad hoc fixes.

**Acceptance Scenarios**:

1. **Given** a clean production server with required prerequisites, **When** the
   deployment runbook is executed, **Then** Admin, MoneyShyft, and ConnectShyft
   are deployed successfully with their intended domain entry points and
   canonical API bindings (`3100`, `3000`, `3002`) behind host Nginx.
2. **Given** an existing deployment, **When** the same runbook is re-run for an
   update, **Then** deployment completes without manual path, port, or route
   corrections and yields the same three-lane service topology.

---

### User Story 2 - Correct Cross-Lane Routing Delegation (Priority: P1)

As a platform operator, I can enforce lane routing contracts so shared
authentication and platform-admin traffic is always handled by the admin lane
authority, while lane-specific traffic stays lane-local.

**Why this priority**: Incorrect routing breaks authentication, platform control,
and lane isolation.

**Independent Test**: Validate route behavior for each lane domain using the
acceptance test matrix and confirm upstream ownership for delegated and
lane-local paths.

**Acceptance Scenarios**:

1. **Given** traffic to `money.shyftunity.com` or `connect.shyftunity.com`,
   **When** the request path is `/api/v1/auth/*` or `/api/v1/platform/admin/*`,
   **Then** traffic resolves to the admin authority API (`admin-api` via
   `admin_api` upstream on loopback `127.0.0.1:3100`).
2. **Given** traffic to `money.shyftunity.com` or `connect.shyftunity.com`,
   **When** the request path is another lane API path under `/api/*`, **Then**
   traffic resolves to the corresponding lane API (`money_api` or
   `connect_api`) using lane-owned upstreams only.
3. **Given** traffic to `admin.shyftunity.com`, **When** the request path is
   `/api/*`, **Then** traffic resolves to the admin API (`admin_api`) as
   documented in the lane routing contract and verification matrix.

---

### User Story 3 - Shared Database and Security Boundary Enforcement (Priority: P2)

As a platform operator, I can enforce one shared production database authority
and secure ingress boundaries so runtime behavior is consistent and safe.

**Why this priority**: Database drift and exposed API ports are high-impact
operational risks.

**Independent Test**: Validate that all APIs use the shared production database,
only the authorized migration owner runs production migrations, and no API is
publicly exposed outside the reverse proxy boundary.

**Acceptance Scenarios**:

1. **Given** production deployment, **When** database connectivity and migration
   operations are reviewed, **Then** all in-scope APIs connect to one shared
   Postgres instance and production migrations are run only by the admin
   authority service (`admin-api`), with money/connect APIs excluded from
   production migration execution.
2. **Given** deployed API services, **When** external network exposure is
   evaluated, **Then** API ports are loopback-bound and not publicly reachable,
   PostgreSQL is not publicly exposed for lane ingress, and all external API
   traffic enters through host Nginx only.

### Acceptance Evidence Alignment

- Reproducible three-lane deployment validation is captured in:
  `/specs/001-tighten-deployment-contracts/evidence/runbook-reproducibility.md`
  and `/specs/001-tighten-deployment-contracts/evidence/final-validation-report.md`.
- Routing delegation and lane-local ownership validation is captured in:
  `/specs/001-tighten-deployment-contracts/evidence/routing-verification-matrix.md`.
- Shared database authority validation is captured in:
  `/specs/001-tighten-deployment-contracts/evidence/database-authority-verification.md`.
- Ingress and security boundary validation is captured in:
  `/specs/001-tighten-deployment-contracts/evidence/security-boundary-verification.md`.

---

### Edge Cases

- A lane is deployed but route delegation for shared auth/platform-admin paths is
  missing or misordered, causing requests to resolve to the wrong lane API.
- Canonical API port assignments drift from agreed values, causing broken proxy
  mappings and service collisions.
- A lane attempts to run independent production migrations against the shared
  database, creating schema drift risk.
- A runbook step depends on undocumented manual edits, making redeploys
  non-reproducible.
- Shared session behavior fails across lanes, causing cross-lane auth breaks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Purpose)**: The specification MUST define a normalized production
  deployment contract for Admin, MoneyShyft, and ConnectShyft only.
- **FR-002 (Scope Boundaries)**: The specification MUST explicitly exclude future
  domain rollout work for People, Household, Address, Finance, Event Bus,
  Product Shell expansion, and other out-of-scope lanes.
- **FR-003 (Architecture Overview)**: The specification MUST preserve the
  existing platform architecture where host Nginx is shared reverse proxy and
  static asset server, APIs run as localhost-bound containers, and frontends are
  static assets served by host Nginx.
- **FR-004 (Deployment Topology)**: The specification MUST define a single-server
  production posture that supports a small server profile and reproducible
  deployment behavior.
- **FR-005 (Routing Contracts)**: The specification MUST define routing ownership
  for each in-scope lane domain, including delegation of `/api/v1/auth/*` and
  `/api/v1/platform/admin/*` from money/connect lanes to the admin API authority.
- **FR-006 (Container Responsibilities)**: The specification MUST define
  responsibilities for each API and frontend runtime unit, including health
  verification expectations and lane ownership boundaries.
- **FR-007 (Canonical Ports)**: The specification MUST lock canonical API ports:
  admin-api `3100`, money-api `3000`, connect-api `3002`.
- **FR-008 (Database Ownership)**: The specification MUST define one shared
  Postgres production database and temporary migration authority ownership by
  admin-api only for this phase.
- **FR-009 (Migration Guardrail)**: The specification MUST prohibit independent
  production migration execution from MoneyShyft and ConnectShyft in this phase.
- **FR-010 (Environment Configuration Requirements)**: The specification MUST
  define required environment configuration artifacts and externalized secret
  handling needed for reproducible deployment.
- **FR-011 (Deployment Workflow)**: The specification MUST define an ordered
  deployment workflow that can be executed from runbook instructions without
  manual interpretation.
- **FR-012 (Operational Guardrails)**: The specification MUST define operational
  controls including localhost-only API exposure, Nginx-only external ingress,
  and shared-session compatibility across lanes.
- **FR-013 (Acceptance Criteria Coverage)**: The specification MUST include
  acceptance criteria for deploy success, routing delegation correctness,
  lane-local routing correctness, shared database connectivity, and no public API
  exposure.
- **FR-014 (Contract Source Alignment)**: The specification MUST normalize and
  align terms, naming, and constraints from source contract documents without
  introducing new architectural patterns.

### Contract Sections to Include

- **CR-001**: Purpose
- **CR-002**: Architecture Overview
- **CR-003**: Deployment Topology
- **CR-004**: Routing Contracts
- **CR-005**: Container Responsibilities
- **CR-006**: Database Ownership
- **CR-007**: Environment Configuration Requirements
- **CR-008**: Deployment Workflow
- **CR-009**: Operational Guardrails
- **CR-010**: Acceptance Criteria

### Assumptions

- The temporary platform shell and authentication authority remain with
  `admin-web` and `admin-api` for this round.
- Production deployment continues to use one shared host-managed Postgres
  instance for the three in-scope lanes.
- Contract tightening prioritizes runtime consistency and repeatability over
  future-state platform expansion.
- Existing contract documents listed in the request are authoritative inputs for
  normalization in this specification.

### Key Entities *(include if feature involves data)*

- **Lane Deployment Contract**: Defines domain, route ownership, API ownership,
  and frontend ownership for a lane in production.
- **Routing Delegation Rule**: Defines which request paths are delegated to
  admin-api versus lane APIs.
- **Service Endpoint Binding**: Defines canonical port and ingress constraints for
  each API service.
- **Database Authority Policy**: Defines shared database ownership and who may run
  production migrations/seeds.
- **Deployment Runbook Step**: A required operational step that must be
  executable without implicit knowledge.
- **Acceptance Verification Record**: Evidence that deployment and runtime
  contracts were validated for all in-scope lanes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new production deployment for Admin, MoneyShyft, and ConnectShyft
  can be completed by following the runbook with zero undocumented manual steps.
- **SC-002**: For each lane domain, 100% of sampled requests for delegated auth
  and platform-admin paths resolve to the admin authority API.
- **SC-003**: For each lane domain, 100% of sampled lane-specific API requests
  resolve to the correct lane API.
- **SC-004**: All in-scope API services show active connectivity to the same
  shared production Postgres database instance during validation.
- **SC-005**: External scans and runtime checks confirm that API services are not
  publicly exposed and all external API traffic enters through Nginx.
- **SC-006**: Production migration execution records show a single migration
  authority path for this phase, with no independent money/connect production
  migration executions.
