# Implementation Plan: Deployment Tightening Round

**Branch**: `001-tighten-deployment-contracts` | **Date**: 2026-03-08 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/spec.md)
**Input**: Feature specification from `/specs/001-tighten-deployment-contracts/spec.md`

## Summary

Normalize and lock production deployment/runtime contracts for Admin, MoneyShyft,
and ConnectShyft so deployment is reproducible on a small server, route
ownership is deterministic, security boundaries are enforced, and shared DB
authority remains singular for this phase.

## Delivery Status Snapshot

### Completed phases

- Phase 1 (Setup): Completed (`T001`-`T004`)
- Phase 2 (Foundational): Completed (`T005`-`T010`)
- Phase 3 (US1): Completed (`T011`-`T018`)
- Phase 4 (US2): Completed (`T019`-`T024`)
- Phase 5 (US3): Completed (`T025`-`T032`)
- Phase 6 (Polish): Finalization tasks tracked in `T033`-`T036`

### User story to implementation task traceability

| User Story | Scope | Implemented tasks |
|---|---|---|
| US1 | Reproducible three-lane deploy | `T011`-`T018` |
| US2 | Cross-lane routing delegation | `T019`-`T024` |
| US3 | Shared DB authority and security boundaries | `T025`-`T032` |

### Key contract and evidence artifact links

- Production deployment contract: [/Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_deployment_contract.md](/Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_deployment_contract.md)
- Routing authority contract: [/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/contracts/lane-routing-contract.md](/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/contracts/lane-routing-contract.md)
- Shared DB authority contract: [/Users/jeremiahotis/projects/connectshyft/architecture/contracts/database_ownership_and_migration_authority.md](/Users/jeremiahotis/projects/connectshyft/architecture/contracts/database_ownership_and_migration_authority.md)
- Deployment runbook contract: [/Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_runbook.md](/Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_runbook.md)
- Acceptance matrix: [/Users/jeremiahotis/projects/connectshyft/architecture/contracts/acceptance_test_matrix.md](/Users/jeremiahotis/projects/connectshyft/architecture/contracts/acceptance_test_matrix.md)
- Evidence index: [/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/README.md](/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/README.md)

## Technical Context

**Language/Version**: TypeScript (Node.js APIs), Vue 3 TypeScript frontends  
**Primary Dependencies**: Express APIs, host Nginx reverse proxy, Docker Compose  
**Storage**: Shared host-managed PostgreSQL (single instance)  
**Testing**: Acceptance matrix HTTP route checks, `nginx -t`, `/health` checks, DB connectivity verification  
**Target Platform**: Single Linux production server (2 GB RAM class)  
**Project Type**: Multi-lane web platform (frontend SPA + backend API per lane)  
**Performance Goals**: Reliable deployment and restart on small server profile; deterministic lane routing behavior  
**Constraints**: Host Nginx as shared ingress, API containers localhost-only, canonical ports (3100/3000/3002), no public API exposure, no lane-owned prod migrations  
**Scale/Scope**: Admin + MoneyShyft + ConnectShyft lanes only; future domains explicitly out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate Review

- Platform shell authority preserved: PASS
- Lane isolation preserved: PASS
- Routing delegation preserved: PASS
- Deployment topology preserved: PASS
- Database ownership preserved: PASS
- Security boundaries preserved: PASS
- Workflow compliance preserved: PASS
- Acceptance criteria coverage preserved: PASS

No constitutional violations identified; Phase 0 approved.

### Post-Design Gate Review

- Platform shell authority preserved: PASS
- Lane isolation preserved: PASS
- Routing delegation preserved: PASS
- Deployment topology preserved: PASS
- Database ownership preserved: PASS
- Security boundaries preserved: PASS
- Workflow compliance preserved: PASS
- Acceptance criteria coverage preserved: PASS

Design artifacts remain constitution-compliant; Phase 1 approved.

## Project Structure

### Documentation (this feature)

```text
specs/001-tighten-deployment-contracts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── lane-routing-contract.md
│   └── deployment-verification-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── admin-api/
├── admin-web/
├── moneyshyft-api/
├── moneyshyft-web/
├── connectshyft-api/
└── connectshyft-web/

architecture/contracts/
├── production_deployment_contract.md
├── database_ownership_and_migration_authority.md
├── acceptance_test_matrix.md
└── two_part_brief.md

nginx/
└── [production lane routing config targets]
```

**Structure Decision**: Existing multi-app web platform structure is retained.
This plan produces contract and execution artifacts only; it does not introduce
new runtime architecture.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
