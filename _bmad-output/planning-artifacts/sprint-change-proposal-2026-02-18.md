# Sprint Change Proposal - Hierarchical Tenancy Course Correction

- Date: 2026-02-18
- Owner: PM Workflow (Correct Course)
- Mode: Incremental
- Trigger: First rollout design review + stakeholder discovery

## 1. Issue Summary

### Problem Statement
The current planning baseline is too narrow in tenancy modeling and implicitly treats tenant boundaries as equivalent to chapter/conference structure. This does not support validated deployment scenarios discovered before execution scale-up.

### Discovery Context
The issue was discovered during first rollout preparation and partner/foundation conversations. The product must support three valid structures:
1. Tenant with users only.
2. Tenant with internal OrgUnits (chapter-like structure) and users scoped within those OrgUnits.
3. Sponsor-funded independent tenants (financial sponsorship only, no inherited data visibility).

### Evidence
This proposal is grounded in course-correction artifacts extracted on 2026-02-18:
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/Phase0_Course_Correction_Spec.txt`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/Phase0_Proposed_Schema.txt`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/ConnectShyft_Proposed_Schema_vNext.txt`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/Phase0_Architecture_and_Boundaries.txt`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/Phase0_Functional_Requirements.txt`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/Phase0_Nonfunctional_Requirements.txt`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/Phase0_Technical_Task_Breakdown.txt`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/course-correction-review/Phase0_Additional_Developer_Notes.txt`

## 2. Impact Analysis

### Epic Impact
- Existing epics remain usable but require foundational scope expansion in kernel stories for tenant + OrgUnit context and enforcement.
- `Epic 0` and `Epic 1` require explicit acceptance criteria for OrgUnit-aware context, membership checks, and scoped repository enforcement.

### Story Impact
- Storys currently proving tenant isolation are insufficient for OrgUnit isolation and orgUnit spoof prevention.
- Story-level tests must include deterministic negative cases for cross-tenant, cross-orgUnit, and spoofed orgUnit context.

### Artifact Conflicts
Artifacts requiring updates:
1. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md`
2. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md`
3. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epic-0-phase-0-kernel-story-set.md`
4. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md`
5. `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification.md`
6. `/Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_API_Spec.md`
7. `/Users/jeremiahotis/moneyshyft/docs/routeshyft/route_schema.sql`
8. `/Users/jeremiahotis/moneyshyft/docs/routeshyft/001_create_route_schema.ts`

### Technical Impact
- Introduce hard/soft scope model:
  - Hard boundary: Tenant
  - Soft boundary: OrgUnit (inside Tenant)
- Extend request context contract to `{ tenantId, orgUnitId|null, scopeMode }`.
- Extend data model for `org_units`, `tenant_memberships`, `org_unit_memberships`, and sponsor billing linkage.
- Update repo helpers and route contracts for tenant-scoped and OrgUnit-scoped access paths.
- Add deterministic negative security tests and membership validation checks.

## 3. Recommended Approach

### Selected Path
Hybrid approach:
1. Direct Adjustment (primary)
2. MVP Guardrails Review (secondary)

### Why This Path
- Lowest-cost correction window is now, before broad implementation locks in wrong assumptions.
- Problem is foundational scoping, not isolated feature behavior.
- Full rollback provides little value and high churn.
- Guardrails keep scope contained while implementing the correction.

### Option Comparison
| Option | Viability | Effort | Risk | Timeline Impact |
|---|---|---|---|---|
| Direct Adjustment | Viable | Medium | Medium-Low | Medium |
| Potential Rollback | Not Viable | High | High | High |
| PRD MVP Review | Viable (as guardrail) | Medium | Medium | Medium |

### Guardrails (Locked)
- No cross-tenant delegation/admin in this phase.
- Billing account is structural-only; no checkout/billing behavior.
- No module feature expansion beyond adapting to corrected scoping helpers.

## 4. Detailed Change Proposals (Approved)

### A. PRD Changes

#### Proposal CC-PRD-01
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md`

OLD:
- Tenant model is top-level and tenant-centric.
- FR1..FR8 focus on tenant/module entitlement only.

NEW:
- Explicit tenancy archetypes:
  1. Tenant-only with users
  2. Tenant + OrgUnits + users
  3. Sponsor-funded independent tenants
- Explicit hard/soft boundaries (Tenant hard, OrgUnit soft).
- FR1..FR8 expanded to cover tenant/orgUnit management, membership validation, context contract, and scoped enforcement.

Justification:
Aligns core product contract with validated real-world structures and prevents `tenant == chapter` drift.

### B. Epic and Story Contract Changes

#### Proposal CC-EPICS-01
Artifacts:
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epic-0-phase-0-kernel-story-set.md`

OLD:
- Tenant context + tenant filter enforcement only.

NEW:
- Story acceptance criteria require:
  1. `{tenantId, orgUnitId|null, scopeMode}` resolution
  2. OrgUnit membership validation
  3. Scoped repo enforcement by mode
  4. deterministic negative tests for cross-tenant, cross-orgUnit, spoofing

Justification:
Makes implementation and test contracts unambiguous for corrected scoping model.

### C. Architecture Changes

#### Proposal CC-ARCH-01
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md`

OLD:
- Tenant isolation architecture is explicit.
- No formal orgUnit boundary model or scopeMode contract.

NEW:
- Hard/soft boundary model formalized.
- Canonical context contract formalized.
- Data-scoping patterns formalized:
  1. tenant-scoped
  2. orgUnit-scoped
  3. tenant-privileged cross-orgUnit (never cross-tenant)

Justification:
Prevents architectural ambiguity and enforcement drift.

### D. UX Contract Changes

#### Proposal CC-UX-01
Artifact: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification.md`

OLD:
- Role/entitlement-aware UX is generic.
- No explicit orgUnit context selector/session contract.

NEW:
- Explicit OrgUnit switch in authenticated staff surfaces.
- Active orgUnit persisted in session/context.
- OrgUnit-scoped views require valid context.
- No blended cross-orgUnit inbox by default.

Justification:
Operational separation and safe scoping must be explicit in user workflow, not implied.

### E. Route Schema Changes

#### Proposal CC-ROUTE-SCHEMA-01
Artifacts:
- `/Users/jeremiahotis/moneyshyft/docs/routeshyft/route_schema.sql`
- `/Users/jeremiahotis/moneyshyft/docs/routeshyft/001_create_route_schema.ts`

OLD:
- Core route tables are tenant-scoped only.

NEW:
- Keep tenant hard boundary on all route tables.
- Add `org_unit_id` to orgUnit-scoped operational tables (minimum: runs, stops; requests evaluated by lifecycle policy).
- Add tenant+orgUnit composite query indexes and consistency constraints.

Justification:
Current schema cannot enforce chapter/orgUnit operational boundaries.

### F. Route API Contract Changes

#### Proposal CC-API-01
Artifact: `/Users/jeremiahotis/moneyshyft/docs/routeshyft/RouteShyft_API_Spec.md`

OLD:
- Tenant context contract only.
- DB filter requirement only for `tenant_id`.

NEW:
- Endpoint scope classification (tenant-scoped vs orgUnit-scoped).
- Required context contract and orgUnit validation/membership checks.
- New refusal codes for orgUnit scoping failures.
- Deterministic negative tests specified.

Justification:
Contract must encode corrected scoping behavior to avoid inconsistent handler implementations.

## 5. Implementation Handoff

### Scope Classification
Major

Reason:
This change modifies foundational tenancy semantics and requires coordinated updates across planning artifacts, architecture contracts, API contracts, and schema strategy before feature expansion.

### Handoff Recipients and Responsibilities

1. Product Manager + Architect
- Finalize canonical model definitions and approve artifact revisions.
- Ensure locked role model and identity policies are reflected in PRD/epics/architecture/API contracts.
- Approve SYSTEM_ADMIN operational controls (internal-only assignment, strong auth, full audit).

2. Product Owner + Scrum Master
- Re-sequence backlog to gate Route feature work behind corrected kernel story completion.
- Ensure branch/workflow guard alignment for changed stories.

3. Development Team
- Implement schema, context, and strict three-layer RBAC (System/Tenant/OrgUnit) with capability checks.
- Implement repo enforcement, admin APIs, and tests per approved proposals.
- Preserve mutation wrapper event/outbox contract.

4. QA
- Add deterministic negative suites for cross-tenant/cross-orgUnit/spoofing.
- Validate orgUnit context-switch contract behavior in API + UI.

### Success Criteria for Implementation
1. All ACs from the course-correction spec pass.
2. Tenant and OrgUnit isolation tests are deterministic and green.
3. OrgUnit-scoped requests refuse missing/invalid/spoofed context.
4. Admin APIs and mutations emit mandatory audit/events/outbox records atomically.
5. Feature stories proceed only after corrected kernel acceptance gates are met.
6. SYSTEM_ADMIN is internal-only, strongly authenticated, and fully audited (including impersonation).
7. Multi-tenant membership is supported with explicit `activeTenantId` in session/context and no implicit tenant selection.
8. Global email uniqueness is enforced for a single identity across multiple tenant memberships.

## Locked Decisions (2026-02-18)
1. Canonical role stack:
- System: `SYSTEM_ADMIN` (platform-wide, internal-only, auditable, strong-auth required).
- Tenant: `TENANT_ADMIN`, `TENANT_STAFF`, `TENANT_VIEWER`.
- OrgUnit: `ORGUNIT_ADMIN`, `ORGUNIT_MEMBER`, `ORGUNIT_IDENTITY_LEAD`.
2. Multi-tenant user membership: allowed.
- Session/context requires explicit `activeTenantId`.
- UI must clearly indicate current active tenant context.
3. Identity uniqueness policy: global email uniqueness (single user identity; multi-tenant memberships via RBAC).
4. RBAC direction: strict capability-gated authorization across all three layers with deny-by-default enforcement.

## Proposed Execution Sequence
1. Update planning artifacts (PRD, epics, architecture, UX, Route contracts/schema docs).
2. Implement locked role/capability matrix and identity policy in contracts and migrations.
3. Implement schema/migrations and request-context contract.
4. Implement RBAC + repository enforcement + admin APIs.
5. Add deterministic negative/security tests and validate policy gates.
