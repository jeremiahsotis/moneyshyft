---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/product-brief-Shyft-2026-02-17.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
  - /Users/jeremiahotis/moneyshyft/ROADMAP.md
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
  - /Users/jeremiahotis/moneyshyft/docs/architecture-backend.md
  - /Users/jeremiahotis/moneyshyft/docs/architecture-frontend.md
  - /Users/jeremiahotis/moneyshyft/docs/integration-architecture.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_Architecture_Document.md
  - /Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_UX_Design_Specification.md
workflowType: 'architecture'
project_name: 'Shyft'
user_name: 'Jeremiah'
date: '2026-02-17'
lastStep: 8
status: 'complete'
completedAt: '2026-02-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Shyft defines a commitment-centric capability contract with 59 functional requirements (FR-C1..FR-C8 plus FR1..FR50 set including FR33a). Architecturally, requirements cluster into:
- Platform kernel hardening: tenancy, auth/session rotation, CSRF, refusal envelope, events/outbox readiness
- Commitment lifecycle operations: creation, explicit transitions, terminal-state guarantees, immutable completion proof
- RouteShyft operational flows: donor self-service intake, cashier-assisted intake/scheduling, dispatcher run composition/publish, driver execution/proof
- Governance and policy enforcement: auditability, policy gate checks, branch/workflow guard alignment
- Multi-tenant module entitlements: tenant-level module enablement + module-scoped RBAC

**Non-Functional Requirements:**
47 NFRs, with architecture-shaping constraints:
- Performance targets by surface (dispatcher, donor form, driver updates, capacity checks, dashboards)
- Security controls: first-party auth, secure cookies across app./api. topology, CSRF on state-changing routes, strict tenant isolation
- Integrity controls: no undefined commitment states, idempotent field submissions, immutable completion records
- Compliance/policy controls: blocking policy checks in CI and workflow-guard rules
- Accessibility baseline: WCAG 2.2 AA across dispatcher/cashier/driver/donor surfaces
- Lifecycle guardrails with explicit auto-expiry/escalation thresholds (NFR33-NFR35)

**Scale & Complexity:**
- Primary domain: nonprofit execution and logistics orchestration (commitment management)
- Complexity level: high
- Estimated architectural components: 12-18 major components/services within a modular monolith boundary (platform kernel + module boundaries + infra interfaces)

### Technical Constraints & Dependencies

- Must remain a modular monolith (no early service split), with module boundaries inside one repo/runtime.
- Multi-tenancy and module entitlements are first-class and mandatory across all data and authorization paths.
- Public donor intake and assisted cashier intake must converge on the same lifecycle model.
- WordPress remains thin UI where specified; authoritative scheduling/execution state must live in monolith services.
- CI policy gate (`docs/policies/git_policy.md`) is mandatory and blocks downstream jobs.
- Capacity-aware scheduling and refusal-with-alternatives are required business behaviors, not optional UX enhancements.
- Parent-domain cookie behavior, CSRF, and session rotation constraints apply to deployment topology.

### Cross-Cutting Concerns Identified

- Tenant resolution and authorization consistency across all modules and endpoints.
- Unified commitment-state model and transition rules to prevent divergence between Route/Ops/POS paths.
- Audit/event lineage and outbox contract for internal module decoupling.
- Idempotency, retry semantics, and offline tolerance for field/mobile execution.
- Accessibility + responsive behavior across distinct role surfaces (dense desktop ops vs mobile field).
- Refusal semantics and dignity boundaries enforced in both domain model and API contract.
- Policy-as-architecture: branch/workflow guard + CI gate integration as an implementation invariant.

## Starter Template Evaluation

### Primary Technology Domain

Modular monolith backend + web clients in an existing brownfield repo (Node/Express/TypeScript/Postgres/Knex).

### Starter Options Considered

1. Express generator baseline (`npx express-generator`)
- Official Express app skeleton, minimal conventions, JS-first scaffolding.
- Useful for greenfield Express bootstraps, but does not align directly with existing strict TS + monolith conversion plan.

2. Nest CLI (`nest new <name>`)
- Strong modular patterns and tooling, but introduces framework-level architectural shifts that conflict with small, deploy-safe PR sequencing and no-rewrite constraints.

3. Fastify generators (`npm init fastify` / `fastify generate`)
- Modern scaffolding option, but implies web framework migration and additional compatibility work vs current Express codebase.

### Selected Starter: Existing Repository as Canonical Starter (No External Scaffold)

**Rationale for Selection:**
- This is explicitly a brownfield conversion with strict phased constraints.
- Project context already defines canonical stack and migration sequence.
- External starter templates would create avoidable framework/structure churn and increase migration risk.

**Initialization Command:**

```bash
# No external scaffold command selected.
# Canonical initialization starts from existing repository structure.
```

**Architectural Decisions Provided by Existing Baseline:**

**Language & Runtime:**
- Node >=20, TypeScript strict mode, Express runtime already integrated.

**Styling Solution:**
- Existing frontend stack remains in place while backend monolith structure is normalized.

**Build Tooling:**
- Existing backend/frontend build pipelines retained; architectural changes applied incrementally.

**Testing Framework:**
- Existing Jest/Playwright ecosystem retained with policy-first CI gate constraints.

**Code Organization:**
- Adopt planned migration target:
  - `src/platform`
  - `src/modules`
  - `src/api`
  - `src/db/migrations`
  - `src/db/seeds`
- Move behavior mechanically before refactors.

**Development Experience:**
- Preserve current dev workflows while introducing canonical app entrypoint + route registration and platform-kernel boundaries.

**Version Verification Notes (Web-Checked):**
- Node.js release schedule and LTS status verified via nodejs.org release pages and Release WG schedule.
- Express major-stream transition and latest tagging context verified via expressjs.com release post.
- TypeScript/Knex/pg package metadata verified via npm package pages for current ecosystem visibility.

**Note:** First implementation story should be structure + aliases only from the approved conversion sequence, not framework replacement.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Canonical modular-monolith boundary with strict internal module contracts.
- Commitment lifecycle as shared domain spine across Route/Ops/POS.
- Tenant resolution and authorization path enforced before any module logic.
- First-party auth + session rotation + parent-domain cookie + CSRF enforcement.
- Mandatory mutation event + outbox write contract.
- Standard response envelope and refusal semantics across all modules.

**Important Decisions (Shape Architecture):**
- PostgreSQL schema partitioning by bounded context.
- Repository/service layering with command-path discipline for writes.
- Route registration conventions and API namespace ownership.
- Structured audit/event model and correlation logging.
- WordPress bridge boundaries with monolith state authority.

**Deferred Decisions (Post-MVP):**
- Cross-org consent-layer sharing implementation.
- Advanced analytics warehouse and BI modeling.
- Service decomposition and distributed orchestration.

### Data Architecture

**Database Engine:**
- PostgreSQL remains canonical OLTP store for all platform modules.

**Schema Strategy:**
- `platform` schema for tenancy/auth/sessions/events/outbox/policy/audit.
- `route` schema for donor/cashier/dispatcher/driver commitment execution.
- Future schemas: `operations`, `resource`, `pos`.

**Modeling Rules:**
- Commitment is first-class execution entity.
- Request is input artifact that ends in refusal/cancel OR linked commitment path.
- Completion proof is append-only and immutable after finalization.

**Migration Strategy:**
- Single migration source: `src/db/migrations`.
- Additive forward migrations only; no historical rewrite.
- Outbox table introduced early to prevent future coupling.

**Caching Strategy:**
- No distributed cache in initial conversion.
- Prioritize query indexing/materialized reporting patterns before cache layer introduction.

### Authentication & Security

**Authentication:**
- First-party auth with refresh rotation and `platform.sessions`.

**Cookie/CSRF Model:**
- Secure HttpOnly cookies with parent-domain strategy for `app.*` and `api.*`.
- CSRF required on all state-changing authenticated endpoints.

**Authorization:**
- Deny-by-default:
  1. tenant entitlement
  2. module enablement
  3. role/action policy

**Tenant Isolation Enforcement:**
- Middleware `resolveTenant()` + repository mandatory tenant filters.
- Tenant-scoped composite keys/indexes.
- Negative tests for cross-tenant access.

### API & Communication Patterns

**API Style:**
- REST `/api/v1` with module ownership boundaries.

**Envelope Contract:**
- `success(data)`
- `refusal(code, message, data?)` with `HTTP 200 + ok=false` for business refusals
- `systemError(code, message)`

**Mutation Communication Rule:**
- No direct cross-module mutation calls.
- All mutation paths emit event + outbox record.

**Bridge Strategy:**
- WP remains thin UI only where specified.
- Monolith is authoritative source for commitment state.

### Frontend Architecture

**Surface Profiles:**
- `desktop-ops` for dispatcher/cashier.
- `mobile-field` for driver.
- `public-intake` for donor self-service.

**State/Interaction Rules:**
- Commitment-state semantics identical across all surfaces.
- Refusal-with-alternatives treated as first-class path.
- Accessibility and responsive requirements built into component contracts.

### Infrastructure & Deployment

**Runtime Topology:**
- Single modular monolith service + Postgres.
- WP as external thin UI bridge where needed.

**CI/CD Guard Model:**
- Policy-first pipeline gate: `policy -> lint -> test -> burn-in -> quality-gates -> backend-contracts(optional) -> report`.
- `docs/policies/git_policy.md` is blocking governance source.

**Observability:**
- Correlation ID in request lifecycle.
- Audit/event consistency for all critical transitions.

### Decision Impact Analysis

**Implementation Sequence (Enforced):**
1. Add structure + aliases
2. Add canonical app entrypoint + registerRoutes
3. Mechanical module moves (no behavior refactor)
4. Extract platform kernel helpers
5. Centralize migrations/seeds
6. Route canary endpoint
7. Minimal command bus + one converted write path
8. Outbox events migration and mutation discipline

**Cross-Component Dependencies:**
- Tenancy/auth/envelope decisions constrain all endpoints.
- Commitment lifecycle constrains Route/Ops/POS interoperability.
- Event/outbox contract constrains all write-path service design.
- Policy gates constrain branch/workflow and CI behavior system-wide.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
12 areas where AI agents could diverge:
- naming (db/api/code)
- layering boundaries
- envelope/error formats
- event/outbox conventions
- tenancy enforcement placement
- auth/csrf middleware order
- validation timing
- idempotency/retry handling
- logging/correlation structure
- migration conventions
- test placement/shape
- role/entitlement enforcement points

### Naming Patterns

**Database Naming Conventions:**
- Schemas: `platform`, `route`, future module schemas in lowercase.
- Tables: plural snake_case (`sessions`, `commitments`, `run_stops`).
- Columns: snake_case (`tenant_id`, `created_at_utc`).
- PK/FK: `id` for primary keys; `<entity>_id` for foreign keys.
- Constraints/indexes: `pk_<table>`, `fk_<table>_<ref_table>`, `idx_<table>_<cols>`.

**API Naming Conventions:**
- Base prefix: `/api/v1`.
- Path segments: kebab-case, plural resources where applicable.
- Bridge namespace: `/api/v1/route-bridge/*`.
- Params: `:id` style route params; query keys snake_case for backend consistency.
- Health endpoints: `/_health` suffix per module.

**Code Naming Conventions:**
- TS files: kebab-case filenames, PascalCase types/classes, camelCase functions/vars.
- Module structure: `api/`, `application/`, `domain/`, `infrastructure/`.
- Handlers thin; services/use-cases hold business logic.

### Structure Patterns

**Project Organization:**
- Platform shared concerns only in `src/platform/*`.
- Feature modules only in `src/modules/<module>/*`.
- Cross-module writes prohibited directly; communicate through events/outbox.
- Route registration centralized in `src/api/registerRoutes.ts`.

**File Structure Patterns:**
- Migrations: `src/db/migrations`.
- Seeds: `src/db/seeds`.
- Validators under module/API boundary; middleware composition standardized at app entry.

### Format Patterns

**API Response Formats:**
- `success(data)`
- `refusal(code, message, data?)` => HTTP 200 + `ok=false`
- `systemError(code, message)`
- No ad hoc response envelopes.

**Data Exchange Formats:**
- JSON keys from backend use snake_case where matching DB/domain terms.
- Timestamps in UTC ISO-8601 for transport.
- Enum-like state fields use explicit controlled vocab (e.g. commitment states).

### Communication Patterns

**Event System Patterns:**
- Event names: dot-delimited lowercase (`operations.fulfillment_requested`).
- Every mutation emits auditable event and outbox record in same transaction boundary.
- Event payload minimums: `event_name`, `tenant_id`, `actor_id`, `entity_type`, `entity_id`, `occurred_at_utc`, `payload`.

**State Management Patterns:**
- Explicit lifecycle transitions only; no implicit state mutation.
- Transition guards centralized in domain/application layer.
- Invalid transitions return refusal, not hidden fallback behavior.

### Process Patterns

**Error Handling Patterns:**
- Business rule failures => refusal envelope.
- System failures => systemError envelope + structured log.
- Never return ambiguous generic errors without actionable reason code.

**Loading/Retry Patterns:**
- Driver write actions must be idempotent and retry-safe.
- Queued/retry states exposed explicitly in field-facing flows.
- Publish/schedule operations fail closed on capacity/guard violations.

### Temporal (Date/Time) Consistency Patterns

**Global Rule:**
- Persist all system timestamps in UTC.
- No user-facing surface (including admin) may display raw UTC.
- Every displayed date/time must be rendered in the user's preferred timezone.

**Canonical Data Rules:**
- Database timestamps stored in UTC (`*_at_utc` naming convention where applicable).
- API/domain payloads carry machine-time values as UTC ISO-8601 for transport consistency.
- User profile stores preferred IANA timezone (e.g. `America/Chicago`).
- Tenant default timezone required as fallback when user preference is absent.

**Centralized Monorepo Time Strategy:**
- Backend shared module: `@platform/time/*` for timezone validation, UTC normalization, timezone-aware range helpers, and scheduler-safe conversion.
- Frontend shared module: `@/platform/time/*` (or shared package) for all formatting and localized rendering.

**Display Rules:**
- All UI date/time labels use preferred timezone rendering by default.
- Timezone abbreviation/name shown where ambiguity matters (scheduling, confirmations, exports).
- Inputs accept local date/time and convert centrally to UTC before persistence.
- Emails/notifications render recipient-local time with timezone label.

**API/Service Contract Rules:**
- No endpoint may return preformatted UTC strings intended for direct display.
- User-facing DTO builders include timezone context for correct client rendering.
- Admin tooling follows same display rule with no UTC bypass.

**Query/Reporting Rules:**
- `today`/`this week`/SLA windows computed using user timezone context, not raw UTC boundaries.
- Aggregations spanning tenants/users apply explicit timezone scope rules.

**Testing & Enforcement:**
- Unit tests for DST transitions, ambiguous times, and boundary crossings.
- Integration tests for profile timezone fallback behavior.
- Block direct raw `Date` formatting outside shared time helpers.
- CI includes timezone snapshot tests for critical scheduling/reporting flows.

### Enforcement Guidelines

**All AI Agents MUST:**
- Apply tenant scoping on every repository read/write path.
- Use shared response envelope helpers for all API outputs.
- Emit event + outbox row for all state-changing mutations.
- Respect refusal-first explicit outcomes (no silent drop-offs).
- Follow module boundary rules (no direct cross-module write coupling).
- Preserve WCAG 2.2 AA constraints in UI component behavior.

**Pattern Enforcement:**
- PR checks include policy gate and workflow guard.
- Lint/tests + targeted architecture checks for envelope/tenancy/event/temporal patterns.
- Violations fixed before merge; no follow-up-later exceptions for critical patterns.

### Pattern Examples

**Good Examples:**
- `POST /api/v1/route-bridge/fulfillment` returns refusal envelope when capacity invalid.
- `commitments` write transaction inserts domain event + outbox row atomically.
- Repository query always includes `where tenant_id = ?`.
- UI renders `scheduled_at_utc` through centralized time formatter using user timezone.

**Anti-Patterns:**
- Returning raw `{ error: "..." }` without envelope helper.
- Creating commitment updates without event/outbox write.
- Cross-module service call that mutates foreign module data directly.
- Unscoped query path without tenant filter.
- Displaying raw UTC timestamps directly in any user-facing view.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
moneyshyft/
├── AGENTS.md
├── ROADMAP.md
├── docs/
│   ├── architecture-backend.md
│   ├── architecture-frontend.md
│   ├── integration-architecture.md
│   ├── policies/
│   │   └── git_policy.md
│   └── routeshyft/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/
│   │   ├── router/
│   │   └── platform/
│   │       └── time/
│   └── package.json
├── src/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── app.ts
│   ├── api/
│   │   └── registerRoutes.ts
│   ├── platform/
│   │   ├── auth/
│   │   │   ├── sessions/
│   │   │   ├── csrf/
│   │   │   └── cookies/
│   │   ├── tenancy/
│   │   │   └── context.ts
│   │   ├── db/
│   │   │   └── knex.ts
│   │   ├── envelopes/
│   │   │   └── response.ts
│   │   ├── events/
│   │   ├── outbox/
│   │   ├── audit/
│   │   │   └── logger.ts
│   │   ├── bus/
│   │   │   └── commandBus.ts
│   │   └── time/
│   │       ├── timezone.ts
│   │       ├── formatting.ts
│   │       └── ranges.ts
│   ├── modules/
│   │   ├── money/
│   │   │   ├── api/
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   └── infrastructure/
│   │   ├── route/
│   │   │   ├── api/
│   │   │   │   ├── registerRouteRoutes.ts
│   │   │   │   └── routeBridgeRoutes.ts
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   └── infrastructure/
│   │   ├── operations/
│   │   ├── resource/
│   │   └── pos/
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── platform/
│   │   │   └── route/
│   │   └── seeds/
│   └── package.json
├── .github/
│   └── workflows/
│       └── test.yml
└── _bmad-output/
    └── planning-artifacts/
```

### Architectural Boundaries

**API Boundaries:**
- Public donor intake separated from authenticated staff endpoints.
- Bridge endpoints isolated under `/api/v1/route-bridge/*`.
- Platform middleware precedes module handlers.

**Component Boundaries:**
- `platform/*` owns shared invariants (tenancy/auth/envelopes/events/time/audit).
- `modules/*` own domain behavior by bounded context.
- UI surfaces separated by role profile (`desktop-ops`, `mobile-field`, `public-intake`).

**Service Boundaries:**
- Writes flow through application services/command handlers.
- Cross-module writes prohibited as direct calls.
- Integration via event + outbox.

**Data Boundaries:**
- Schema-per-context (`platform`, `route`, future module schemas).
- Repository layer enforces tenant scope and transition rules.
- UTC persist + centralized timezone rendering model enforced globally.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- Platform hardening (Phase 0) -> `src/platform/*` + `src/db/migrations/platform/*`
- RouteShyft MVP -> `src/modules/route/*` + `src/db/migrations/route/*`
- Existing Money transition -> `src/modules/money/*`
- Future Ops/Resource/POS -> respective `src/modules/<module>/*`

**Cross-Cutting Concerns:**
- Policy gate workflow -> `.github/workflows/test.yml` + `docs/policies/git_policy.md`
- Envelope consistency -> `src/platform/envelopes/response.ts`
- Tenancy context -> `src/platform/tenancy/context.ts`
- Temporal consistency -> `src/platform/time/*` + `frontend/src/platform/time/*`

### Integration Points

**Internal Communication:**
- `registerRoutes.ts` mounts module route registrars.
- Domain events written to `platform.events` and `platform.outbox_events`.
- Command bus coordinates transactional write discipline.

**External Integrations:**
- WordPress bridge as thin UI consumer of monolith bridge APIs.
- Email/notification adapters.
- Optional backend contract lane against live API in CI dispatch mode.

**Data Flow:**
- Intake -> validation -> commitment linkage/refusal -> dispatch publish -> driver proof completion -> audit/event/outbox -> reporting.

### File Organization Patterns

**Configuration Files:**
- Root policy/governance + CI config.
- Runtime config under backend/frontend roots.

**Source Organization:**
- Shared invariants in `platform`.
- Business capabilities in `modules`.
- API assembly in `api`.

**Test Organization:**
- Service/domain tests near modules.
- Contract and e2e aligned to CI artifact paths.

**Asset Organization:**
- Frontend assets under frontend conventions.
- Planning docs under `_bmad-output/planning-artifacts`.

### Development Workflow Integration

**Development Server Structure:**
- Backend and frontend run independently with shared API contract boundary.
- Central route registration controls module activation.

**Build Process Structure:**
- Existing build pipelines preserved during migration.
- Structural changes before logic refactors per conversion policy.

**Deployment Structure:**
- Monolith backend + Postgres runtime.
- Host-managed web serving and API proxy retained.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Stack, migration strategy, and module-boundary rules are coherent for brownfield conversion.
- Security model (first-party auth/session/csrf/cookies) aligns with tenancy and API envelope rules.
- Event/outbox mutation discipline aligns with no-direct-cross-module-write rule.

**Pattern Consistency:**
- Naming, structure, format, communication, process patterns are internally consistent.
- Temporal policy now centrally enforced (UTC persist + local-time display everywhere).

**Structure Alignment:**
- Project tree supports phased conversion and preserves legacy compatibility during transition.
- Boundaries between `platform` and `modules` are explicit and enforceable.

### Requirements Coverage Validation ✅

**Functional Coverage:**
- Commitment core (FR-C series) fully mapped to domain/state/event/outbox architecture.
- Tenant/module access controls mapped to tenancy/auth/authorization boundaries.
- Route intake/dispatch/driver flows mapped to module structure and API boundaries.
- Refusal semantics and dignity constraints mapped to envelope + process patterns.

**Non-Functional Coverage:**
- Performance strategy addressed via structure/query/index-focused decisions.
- Security and isolation controls fully represented.
- Accessibility mapped to WCAG 2.2 AA constraints in UI/component rules.
- Policy governance and CI gate order explicitly integrated.
- Temporal correctness requirements now explicitly covered in architecture patterns.

### Implementation Readiness Validation ✅

**Decision Completeness:**
- Critical architecture decisions documented and prioritized.
- Conversion-sequence integrity preserved.
- Deferred decisions clearly identified.

**Structure Completeness:**
- Directory structure and module ownership mapped.
- Integration points and data flow defined.
- Cross-cutting concern placement specified.

**Pattern Completeness:**
- Agent conflict points addressed with concrete mandatory rules and anti-patterns.
- Temporal/date-time consistency includes centralized helper strategy and enforcement tests.

### Gap Analysis Results

**Critical Gaps:** None blocking.

**Important Gaps:**
- Need explicit ADR for timezone fallback precedence (`user -> tenant -> system default`) in implementation story.
- Need concrete schema definitions for `platform.events` and `platform.outbox_events` in early migration stories.
- Need explicit contract tests for refusal envelope invariants across all route module endpoints.

**Nice-to-Have:**
- Add architecture decision records per major decision cluster for change tracking.
- Add module-level checklist templates for story handoff quality.

### Validation Issues Addressed

- Added centralized, monorepo-wide temporal consistency policy to prevent UTC leakage in UI/admin views.
- Confirmed refusal/business outcome semantics are consistent across API patterns and UX flows.
- Confirmed policy-gate integration is represented as architecture invariant.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context analyzed
- [x] Scale/complexity assessed
- [x] Constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented
- [x] Security/auth/tenancy model defined
- [x] Integration/event patterns defined
- [x] Temporal strategy defined

**✅ Implementation Patterns**
- [x] Naming/structure/format patterns defined
- [x] Communication/process patterns defined
- [x] Enforcement guidance documented
- [x] Anti-patterns listed

**✅ Project Structure**
- [x] Complete structure defined
- [x] Boundaries and integration points mapped
- [x] Requirements-to-structure mapping completed

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence Level:** High

**Key Strengths:**
- Strong commitment-centric domain spine
- Explicit module and governance boundaries
- Clear anti-conflict implementation patterns for AI agents
- Centralized temporal correctness strategy across monorepo

**Areas for Future Enhancement:**
- Explicit ADR catalog
- Expanded contract testing matrix for bridge/route refusal cases
- Deeper read-model optimization plan after MVP stabilization

### Implementation Handoff

**AI Agent Guidelines:**
- Follow architecture invariants before feature behavior.
- Treat tenancy, envelope, event/outbox, and temporal rules as non-negotiable.
- Preserve phased conversion sequence and avoid mixed move+refactor PRs.

**First Implementation Priority:**
- Execute conversion Phase A/B baseline (structure + aliases + canonical app entrypoint + route registration).
