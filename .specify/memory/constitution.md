<!--
Sync Impact Report
- Version change: template (unversioned) -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Platform Shell Authority
  - Template Principle 2 -> II. Lane Isolation and Contract Boundaries
  - Template Principle 3 -> III. Routing Delegation Contract
  - Template Principle 4 -> IV. Production Deployment Topology
  - Template Principle 5 -> V. Shared Database Ownership
- Added principles:
  - VI. Security Boundary Enforcement
  - VII. Spec-Driven Delivery Workflow
  - VIII. Code Generation Workflow Discipline
  - IX. Deployment Acceptance Criteria
- Added sections:
  - Operational Constraints
  - Delivery Workflow and Quality Gates
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ⚠ pending (directory not present): .specify/templates/commands/*.md
  - ✅ CLAUDE.md
- Follow-up TODOs: None
-->
# ShyftUnity Platform Constitution

## Core Principles

### I. Platform Shell Authority
`admin-web` and `admin-api` MUST remain the active platform shell and
authentication authority. Future shell evolution MUST preserve compatibility with
this deployment model so existing lane deployments continue to operate.
Rationale: platform-level auth and administration must remain stable across lanes.

### II. Lane Isolation and Contract Boundaries
Each lane MUST deploy independently with its own frontend SPA, API service, and
subdomain (for example `admin.shyftunity.com`, `money.shyftunity.com`,
`connect.shyftunity.com`). Lane APIs MUST NOT assume direct internal access to
other lane services outside explicit contracts.
Rationale: independent deployability prevents cross-lane coupling and regressions.

### III. Routing Delegation Contract
Authentication and platform-admin APIs are owned by `admin-api`. Lane frontends
MUST delegate `/api/v1/auth/*` and `/api/v1/platform/admin/*` to `admin-api`.
All other lane `/api` routes MUST resolve to that lane's API service.
Rationale: routing ownership must be deterministic to avoid auth and admin drift.

### IV. Production Deployment Topology
Production MUST use host Nginx as the shared reverse proxy. Node APIs MUST run in
Docker containers and bind only to localhost. Frontends MUST be static builds
served by Nginx. Postgres MUST be a shared host-managed service. Canonical API
ports are `admin-api:3100`, `money-api:3000`, and `connect-api:3002`.
Rationale: this topology is the baseline for secure, reproducible deployments.

### V. Shared Database Ownership
A single shared Postgres instance MUST be used in the current platform phase.
`admin-api` MUST own production migrations. Lane APIs MUST NOT run independent
production migrations. Any future domain-separated schema strategy MUST maintain
compatibility with the shared model during migration periods.
Rationale: migration authority must be singular to prevent schema divergence.

### VI. Security Boundary Enforcement
No API service MAY expose a public port. External API access MUST flow through
Nginx only. Session cookies MUST support cross-lane authentication on the shared
domain boundary.
Rationale: unified ingress and cookie scope are required for platform security.

### VII. Spec-Driven Delivery Workflow
Major platform changes MUST follow this sequence: constitution, specification,
implementation plan, task generation, and implementation. GitHub Issues MUST be
derived from generated tasks and tracked as the execution source of truth.
Rationale: formal sequencing preserves traceability from intent to delivery.

### VIII. Code Generation Workflow Discipline
Delivery workflows MUST use Spec Kit, GitHub Issues, BMAD module decomposition,
and Codex LLM agents. Agents MUST implement only within approved specifications
and contracts and MUST NOT invent new architecture.
Rationale: bounded generation improves consistency and reduces architectural drift.

### IX. Deployment Acceptance Criteria
Deployment work is complete only when Admin, MoneyShyft, and ConnectShyft deploy
successfully; auth routes delegate to `admin-api`; lane routes resolve to lane
APIs; all services connect to shared Postgres; and production deployment is
reproducible from the runbook without manual adjustments.
Rationale: completion criteria must be verifiable and operations-ready.

## Operational Constraints

- Lane hostnames and routes MUST preserve lane isolation and delegation contracts.
- Infrastructure changes MUST keep compatibility with host-managed Nginx and
  shared Postgres during the current platform phase.
- Any deviation from canonical ports or routing ownership requires a documented
  amendment to this constitution before implementation.

## Delivery Workflow and Quality Gates

- Every plan MUST include a constitution check covering shell authority, routing
  delegation, topology, migration ownership, and security boundaries.
- Every specification MUST define routing ownership, lane/API boundaries, and
  acceptance scenarios proving delegation and shared-database compatibility.
- Every tasks document MUST include explicit tasks for Nginx routing validation,
  API binding/port checks, shared Postgres connectivity, and reproducible
  deployment runbook verification.
- Pull requests that alter deployment, routing, auth, or migrations MUST include
  evidence of end-to-end validation for Admin, MoneyShyft, and ConnectShyft.

## Governance

This constitution supersedes conflicting guidance files for platform architecture
and delivery policy. Amendments require: (1) a documented proposal, (2) explicit
impact analysis across lanes and runbooks, and (3) approval by platform owners.

Semantic versioning policy for this constitution is mandatory:
- MAJOR: backward-incompatible governance changes or principle removals/rewrites.
- MINOR: new principle/section or materially expanded mandatory guidance.
- PATCH: clarifications, wording improvements, and non-semantic edits.

Compliance review is required at plan review, PR review, and pre-production
deployment review. Violations MUST be corrected before merge or explicitly
approved as a time-bound exception with a remediation date.

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08
