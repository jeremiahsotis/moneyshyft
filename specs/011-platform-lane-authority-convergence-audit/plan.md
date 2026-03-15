# Implementation Plan: Platform Lane Authority Convergence Audit

**Branch**: `011-platform-lane-authority-convergence-audit` | **Date**: 2026-03-14 | **Spec**: [`specs/011-platform-lane-authority-convergence-audit/spec.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/spec.md)
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/spec.md`

## Summary

Produce a decision-grade platform audit that classifies runtime authority, duplication, migration authority, RouteShyft artifacts, safe patch locations, and convergence blockers across `money-api`, `moneyshyft-web`, `connect-api`, `admin-api`, and `migration-runner`.

## Technical Context

**Language/Version**: Markdown planning artifacts for a TypeScript monorepo (Node.js >=20, Vue 3, Express)  
**Primary Dependencies**: Repository source evidence from Express route registration, Vue router registration, Vite proxy config, Knex config, Dockerfiles, nginx contracts, and deployment runbooks  
**Storage**: Planning artifacts stored in `specs/011-platform-lane-authority-convergence-audit`; audited production storage is shared PostgreSQL  
**Testing**: Evidence-based repository inspection using `sed`, `rg`, `diff`, and existing architectural/runbook contracts, plus explicit validation tasks for Nginx routing, API binding/port checks, shared Postgres connectivity, and reproducible deployment runbook verification; no new executable test suite is introduced in this planning pass  
**Target Platform**: Monorepo documentation for Linux production deployment with host-managed nginx and Dockerized Node APIs  
**Project Type**: Internal architecture audit and planning documentation  
**Performance Goals**: Complete covered-surface classification with explicit decisions and no unresolved authority ambiguity in the planning output  
**Constraints**: No code modification outside planning docs, no convergence remediation, no RouteShyft deletion, no runtime authority change, and no feature-bug fixes  
**Scale/Scope**: Five covered surfaces (`money-api`, `moneyshyft-web`, `connect-api`, `admin-api`, `migration-runner`) plus embedded RouteShyft artifacts, runtime routes, module overlap, validators, scripts, packaging/build logic, and migration execution authority

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. The audit documents `admin-web`/`admin-api` authority and does not alter shell ownership.
- Lane isolation preserved: PASS. The audit maps cross-lane overlap without introducing new service coupling.
- Routing delegation preserved: PASS. The planning artifacts keep `/api/v1/auth/*` and `/api/v1/platform/admin/*` delegated to `admin-api` and treat all other lane `/api` routes as lane-owned unless evidence shows conflicting live mounts.
- Deployment topology preserved: PASS. Host nginx, Dockerized APIs, localhost bindings, and static frontends remain audit inputs, not change targets.
- Database ownership preserved: PASS. The audit records `admin-api` as the current production migration runner and `shared/database/migrations` as shared authority.
- Security boundaries preserved: PASS. No ingress, cookie, or port exposure changes are proposed.
- Workflow compliance: PASS. This plan traces directly to the source spec and produces research, data model, contracts, and quickstart artifacts.
- Acceptance criteria present: PASS. The artifacts define verifiable classification, patch-location, migration-authority, RouteShyft, and blocked-area outputs.

## Project Structure

### Documentation (this feature)

```text
specs/011-platform-lane-authority-convergence-audit/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── audit-output-contract.md
    └── routeshyft-artifact-contract.md
```

### Source Code (repository root)

```text
apps/
├── admin-api/
├── admin-web/
├── connectshyft-api/
├── connectshyft-web/
├── migration-runner/
├── moneyshyft-api/
└── moneyshyft-web/

shared/
└── database/

docs/
nginx/
architecture/
specs/
```

**Structure Decision**: `specs/011-platform-lane-authority-convergence-audit/spec.md` is the execution source of truth for this feature. If it originated from `specs/platform-lane-authority-convergence-audit/spec.md`, it must remain synchronized before further planning or implementation. Audit evidence is drawn from `apps/*`, `shared/database`, `docs`, `nginx`, and `architecture`.

## Phase 0 Research

- Resolve scope-name mapping between requested labels (`money-api`, `connect-api`) and repository paths (`apps/moneyshyft-api`, `apps/connectshyft-api`).
- Resolve runtime-authority precedence rules when deployment docs, mounted routes, and legacy runtime contracts disagree.
- Resolve how migration authority should be classified when shared authority is canonical but runner cutover is incomplete.
- Resolve RouteShyft classification and removal-gating criteria for live embedded artifacts.

## Phase 1 Design

- Model the audit entities needed to classify surfaces, RouteShyft artifacts, duplication sets, validator/script/build-path ownership, migration authority, safe-delete candidates, and blocked areas.
- Define the contract for decision-grade audit outputs so later work can consume the classifications consistently.
- Produce a quickstart that reproduces the audit workflow and evidence collection path from the repo.

## Post-Design Constitution Check

- Platform shell authority preserved: PASS
- Lane isolation preserved: PASS
- Routing delegation preserved: PASS
- Deployment topology preserved: PASS
- Database ownership preserved: PASS
- Security boundaries preserved: PASS
- Workflow compliance: PASS
- Acceptance criteria present: PASS

## Complexity Tracking

No constitution violations are required for this planning pass.
