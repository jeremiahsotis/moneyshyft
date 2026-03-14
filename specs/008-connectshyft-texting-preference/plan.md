# Implementation Plan: ConnectShyft Texting Preference Persistence and Display

**Branch**: `008-connectshyft-texting-preference` | **Date**: 2026-03-14 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/008-connectshyft-texting-preference/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/008-connectshyft-texting-preference/spec.md)
**Input**: Feature specification from `/specs/008-connectshyft-texting-preference/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Patch the current ConnectShyft runtime host in `apps/moneyshyft-api` so neighbor create/update flows preserve canonical `prefers_texting` values, treat omitted or invalid incoming preference values according to the current runtime contract, default new-neighbor create behavior to `YES` at the runtime write path, return the stored enum unchanged through existing neighbor responses, and render the exact contract labels in the current `apps/connectshyft-web` display surfaces without any lane-convergence or module-relocation work.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20, Vue 3 SFCs with TypeScript  
**Primary Dependencies**: Express, Knex, pg, Jest, Supertest, Vue 3, Axios-based API client  
**Storage**: Shared PostgreSQL, primarily `connectshyft.cs_neighbors` and `connectshyft.cs_neighbor_phones`  
**Testing**: Jest module tests, Supertest route tests, manual ConnectShyft web verification  
**Target Platform**: Dockerized Node API behind host-managed Nginx plus ConnectShyft Vue SPA  
**Project Type**: Full-stack web application with lane-specific frontend and backend  
**Performance Goals**: Preserve existing neighbor CRUD latency and query shape; no additional cross-service hops  
**Constraints**: Surgical patch in `apps/moneyshyft-api`, no lane-convergence refactor, no code movement into `apps/connectshyft-api`, canonical enum limited to `YES | NO | UNKNOWN`, UI labels must match contract text exactly  
**Scale/Scope**: One neighbor preference field across current create/update/read/display flows in the existing ConnectShyft runtime and web UI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. No auth, shell, or platform-admin ownership changes are introduced.
- Lane isolation preserved: PASS. The fix stays inside the existing MoneyShyft-hosted ConnectShyft runtime plus the current ConnectShyft web UI surface; no new cross-lane service coupling is added.
- Routing delegation preserved: PASS. No route ownership or delegation behavior changes are required outside the existing `/api/v1/connectshyft/*` lane surface.
- Deployment topology preserved: PASS. No Docker, Nginx, port, or binding changes are involved.
- Database ownership preserved: PASS. The design keeps the existing shared Postgres schema compatible and avoids migration-authority expansion; the runtime will write explicit canonical values without requiring lane-convergence work.
- Security boundaries preserved: PASS. No public ingress, cookie, or session-boundary behavior changes are introduced.
- Workflow compliance: PASS. This plan derives directly from the copied feature spec and produces research, data model, contracts, and quickstart artifacts for later task generation.
- Acceptance criteria present: PASS. The plan covers create defaulting, update omission behavior, API response integrity, exact UI labels, routing ownership, shared-database compatibility, and regression checks in automated backend tests plus manual UI verification.

Post-design constitution re-check: PASS. Phase 1 design remains within the current runtime host, preserves shared-database compatibility, and introduces no routing, topology, or shell-authority changes.

## Project Structure

### Documentation (this feature)

```text
specs/008-connectshyft-texting-preference/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── neighbor-texting-preference.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── moneyshyft-api/
│   └── src/
│       ├── routes/api/v1/connectshyft.ts
│       ├── modules/connectshyft/neighbors.ts
│       ├── modules/connectshyft/__tests__/neighbors.test.ts
│       └── routes/api/v1/__tests__/
└── connectshyft-web/
    └── src/
        ├── features/connectshyft/neighbors.ts
        ├── features/connectshyft/presentation.ts
        ├── views/ConnectShyft/ConnectShyftNeighborCreateView.vue
        ├── views/ConnectShyft/ConnectShyftNeighborProfileView.vue
        ├── views/ConnectShyft/ConnectShyftInboxView.vue
        ├── views/ConnectShyft/ConnectShyftThreadDetailView.vue
        └── components/connectshyft/ConnectShyftNeighborSnapshot.vue

architecture/
├── connectshyft/runtime-host-reality-contract.md
└── connectshyft/neighbor-texting-preference-contract.md
```

**Structure Decision**: Keep the runtime fix in `apps/moneyshyft-api` per the governing runtime-host contract, update only the current ConnectShyft web surfaces that submit or render the field, and avoid any work in `apps/connectshyft-api`.

## Implementation Phases

1. Establish shared request/DTO boundaries for canonical `prefersTexting` handling across the current frontend and runtime route surface.
2. Implement and test backend persistence and API round-trip behavior for create/update defaulting, omission handling, and canonical enum reads.
3. Implement current ConnectShyft UI submission and exact-label display behavior on the existing create, profile, inbox, and thread-detail surfaces.
4. Validate constitution-required routing, topology, shared-database, and runbook regression checks alongside feature-specific quickstart verification.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
