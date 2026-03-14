# Implementation Plan: CS-002 Phone Identity

**Branch**: `002-phone-identity` | **Date**: 2026-03-11 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/spec.md)  
**Input**: Feature specification from `/specs/002-phone-identity/spec.md`

## Summary

Implement CS-002 by replacing ConnectShyft-local phone parsing with a shared communication-domain phone identity module under `domains/communication/phone`, then adopt that module in ConnectShyft API neighbor and identity-boundary flows so users can enter natural phone numbers while the system stores canonical E.164 values internally. The design keeps telephony out of scope, preserves the monolithic monorepo structure, and treats the current ConnectShyft phone table as a temporary equivalent persistence adapter that must be shaped toward the canonical `communication_contact_point` model rather than left as a permanent local fork. Constitution-required no-regression validation for routing ownership, port and binding expectations, shared Postgres compatibility, and runbook-style reproducibility is part of this feature's delivery evidence even though CS-002 does not change deployment topology.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, pg, Jest/ts-jest, root-level shared communication domain source under `domains/communication`  
**Storage**: Shared PostgreSQL; current ConnectShyft phone persistence in `connectshyft.cs_neighbor_phones` must evolve toward `communication_contact_point`-equivalent canonical fields  
**Testing**: Jest unit/integration coverage in `apps/connectshyft-api/src/**/__tests__`, plus shared-domain tests executed through the lane API Jest harness and TypeScript build validation  
**Target Platform**: Linux-hosted monolithic monorepo with lane APIs and SPAs, shared Postgres, and host-managed Nginx  
**Project Type**: Monolithic monorepo web application with a shared domain module and lane API consumers  
**Performance Goals**: Synchronous parse/normalize/format operations with no network calls, negligible request-path overhead for neighbor create/update/identity-match flows, and indexed lookup on canonical E.164 values  
**Constraints**: No E.164 awareness in UI, no ConnectShyft-local normalization forks, configurable seven-digit fallback only when context is supplied, no CS-003/CS-004/CS-005 scope creep, no routing/deployment changes, and no schema choice that blocks future People-safe reuse  
**Scale/Scope**: CS-002 only; root shared phone domain plus ConnectShyft API consumer adoption, persistence shaping for canonical phone identity, and reusable contracts for later modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Gate Review**

- Platform shell authority preserved: PASS. CS-002 changes are limited to shared domain logic and ConnectShyft API/domain consumers; `admin-web`/`admin-api` shell and auth authority remain untouched.
- Lane isolation preserved: PASS. The feature introduces a root shared domain consumed by lane code but does not add implicit lane-to-lane service calls or new frontend drift.
- Routing delegation preserved: PASS. No auth/admin route ownership changes are required; ConnectShyft API remains the lane owner for ConnectShyft routes.
- Deployment topology preserved: PASS. No Nginx, container topology, port, or static-serving changes are required for phone identity.
- Database ownership preserved: PASS. Any schema evolution remains compatible with shared Postgres and must still respect that production migration execution is owned by `admin-api`, even if development/test migrations live with `connectshyft-api`.
- Security boundaries preserved: PASS. No public ports, cookie, or ingress behavior changes are introduced.
- Workflow compliance: CONDITIONAL. This plan is derived directly from CS-002 and produces the required design artifacts, but `spec.md` and `tasks.md` must explicitly carry the constitution-required routing, lane-boundary, shared-database, and validation content.
- Acceptance criteria present: CONDITIONAL. Core phone-identity acceptance is defined, but constitution-required no-regression scenarios for routing ownership, deployment topology, shared-database compatibility, and runbook evidence must remain explicit in the feature artifacts.

**Post-Design Re-check**

- Platform shell authority preserved: PASS. Shared phone identity stays below shell/auth boundaries.
- Lane isolation preserved: PASS. The design uses `domains/communication` as a monorepo shared source boundary instead of cross-lane API coupling.
- Routing delegation preserved: PASS. The design does not add or move any HTTP routes.
- Deployment topology preserved: PASS. The design requires only code and schema changes inside existing services.
- Database ownership preserved: PASS. The design treats canonical phone persistence as shared-Postgres-compatible and documents production migration authority as unchanged.
- Security boundaries preserved: PASS. No ingress, session, or public-port behavior changes are introduced.
- Workflow compliance: CONDITIONAL. Generated artifacts remain traceable to CS-002, but the final spec and task list must keep constitution-required platform validation tasks and scenarios intact.
- Acceptance criteria present: CONDITIONAL. Validation is concrete for phone identity, but the feature still depends on explicit artifact coverage for routing, shared Postgres, and runbook-style no-regression evidence.

## Project Structure

### Documentation (this feature)

```text
specs/002-phone-identity/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── phone-domain-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
domains/
└── communication/
    ├── index.ts
    └── phone/
        └── index.ts

apps/
└── connectshyft-api/
    ├── src/
    │   ├── migrations/
    │   ├── modules/
    │   │   └── connectshyft/
    │   │       ├── identityBoundary.ts
    │   │       └── neighbors.ts
    │   └── routes/
    │       └── api/
    │           └── v1/
    │               └── connectshyft.ts
    ├── jest.config.js
    ├── package.json
    └── tsconfig.json

apps/
└── connectshyft-web/
    └── src/
        └── [consumer-only surfaces; no redesign planned]
```

**Structure Decision**: Implement canonical phone identity in the root shared communication domain at `domains/communication/phone`, adapt `apps/connectshyft-api` as the authoritative CS-002 consumer, and only touch frontend code if a consumer must stop redefining canonical phone behavior. The key technical integration work is enabling the lane API build/test tooling to consume a root-level shared domain path without moving the domain into a faux package or recreating ConnectShyft-local logic.

## Complexity Tracking

No constitution violations are required for CS-002. This section is intentionally empty.
