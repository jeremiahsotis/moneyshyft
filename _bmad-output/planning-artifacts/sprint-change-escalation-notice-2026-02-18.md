# Escalation Notice - Major Scope Change

- Date: 2026-02-18
- Change Proposal: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-02-18.md`
- Scope Classification: Major
- Status: Approved for implementation

## Escalation Trigger
A foundational tenancy-model correction is required before broader implementation:
- hard tenant boundary
- soft OrgUnit boundary within tenant
- sponsor-funded independent subtenant support without inherited data visibility

## Why Escalated
This impacts platform semantics across planning artifacts, architecture contracts, schema strategy, API contracts, RBAC, and negative/security test requirements.

## Locked Governance Decisions
1. Role stack:
- System: `SYSTEM_ADMIN`
- Tenant: `TENANT_ADMIN`, `TENANT_STAFF`, `TENANT_VIEWER`
- OrgUnit: `ORGUNIT_ADMIN`, `ORGUNIT_MEMBER`, `ORGUNIT_IDENTITY_LEAD`
2. Multi-tenant user membership is allowed; explicit `activeTenantId` is mandatory.
3. Email uniqueness is global across platform identities.
4. RBAC is deny-by-default and capability-gated at all layers.

## Required Handoff Recipients
1. Product Manager + Architect
2. Product Owner + Scrum Master
3. Development Team
4. QA

## Immediate Next Actions
1. Update PRD, epics, architecture, UX, and Route schema/API contracts per approved proposal.
2. Implement locked role/capability and identity policy into migration and context contracts.
3. Execute schema/context/RBAC/repo/admin-api/test workstream in gated sequence.
