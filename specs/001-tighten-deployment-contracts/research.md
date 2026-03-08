# Phase 0 Research: Deployment Tightening Round

## Decision 1: Keep host Nginx as the single external ingress

- Decision: Use host Nginx as shared reverse proxy and static file server for
  admin, money, and connect lanes.
- Rationale: Existing contracts lock this topology and it centralizes TLS,
  routing, and SPA static serving while preventing direct API exposure.
- Alternatives considered:
  - Per-lane Nginx containers: rejected due to operational drift and duplicate
    ingress control.
  - API direct exposure without shared proxy: rejected due to security boundary
    violations.

## Decision 2: Enforce delegated auth/platform-admin routing to admin-api

- Decision: For money/connect domains, route `/api/v1/auth/*` and
  `/api/v1/platform/admin/*` to admin-api; route other `/api/*` paths to lane API.
- Rationale: Preserves temporary shell/auth authority and prevents lane-local auth
  divergence.
- Alternatives considered:
  - Lane-owned auth endpoints: rejected as incompatible with locked platform
    authority.
  - Full shell redesign in this round: rejected as out of scope.

## Decision 3: Keep canonical API ports fixed

- Decision: Keep admin-api `3100`, money-api `3000`, connect-api `3002`.
- Rationale: Contracts and runbooks assume these mappings; stability reduces
  deployment errors and routing ambiguity.
- Alternatives considered:
  - Dynamic port assignment: rejected because it weakens deterministic routing.

## Decision 4: Preserve single shared Postgres with temporary migration authority

- Decision: Use one shared host-managed Postgres instance; admin-api is sole
  production migration/seed runner during this phase.
- Rationale: Prevents migration drift and aligns with current DB authority
  contracts.
- Alternatives considered:
  - Per-lane Postgres ownership now: rejected due to architecture mismatch and
    migration complexity.
  - Multi-runner production migrations: rejected due to schema drift risk.

## Decision 5: Define deployment verification as contract evidence

- Decision: Validate deployment using runbook reproducibility checks, route matrix
  checks, `/health` checks, DB connectivity checks, and public-port exposure checks.
- Rationale: Acceptance criteria require measurable, repeatable proof that
  deployment is correct and secure.
- Alternatives considered:
  - Manual smoke checks without contract matrix: rejected due to low
    repeatability.
  - Unit-only validation: rejected because deployment correctness is operational.

## Decision 6: Preserve small-server operational posture

- Decision: Retain small-server constraints (2 GB RAM class), localhost API
  bindings, and memory-conscious runtime expectations.
- Rationale: Feature goal explicitly targets reproducible deployment on a small
  production server footprint.
- Alternatives considered:
  - Scale-out assumptions: rejected as outside current scope.

## Resolved Clarifications

No unresolved `NEEDS CLARIFICATION` items remain after research.
