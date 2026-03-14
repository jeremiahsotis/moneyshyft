# Implementation Plan: Migration Authority Convergence

**Branch**: `006-migration-authority-convergence` | **Date**: 2026-03-13 | **Spec**: `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/spec.md`
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/spec.md`

## Summary

Move production migration ownership to `shared/database/migrations`, promote the current 60 unique migration files into that shared authority, add reconciliation tooling that can compare API-local sources plus shared authority against `public.knex_migrations`, and repoint the existing `admin-api` production runner to the shared authority while keeping `admin-api` as the sole authorized production executor.

Locked decisions for implementation:
- reconciliation compares migrations by `logicalId` only, where `logicalId` is the basename without extension
- override manifests are keyed by canonical production `.js` filenames and resolved to `logicalId`
- inspection-only hotfixes must be modeled explicitly and must not be auto-verified
- promotion into shared authority must pass ordered-basename and content-hash verification
- `admin-api` production must package runnable JavaScript shared migrations into `dist/shared/database/migrations`; repointing `knexfile.js` alone is invalid
- production migration execution must stop if reconciliation reports any `blocked`, `duplicate_across_apis`, `ready_to_promote_to_shared`, or `recorded_but_missing_from_source` rows
- FR-6 is satisfied only by machine-enforced reconciliation gating; documentation-only reminders are insufficient
- existing convergence scaffolding must be extended in place and may not be overwritten without before/after diff review

## Technical Context

**Language/Version**: TypeScript and JavaScript on Node.js >=20, plus Bash for deploy and agent-update scripts  
**Primary Dependencies**: Knex 3.x, `pg`, Node `fs/path`, existing npm package scripts, Docker Compose deployment flow  
**Storage**: Shared PostgreSQL ledger in `public.knex_migrations`, shared filesystem manifests under `shared/database`  
**Testing**: Jest migration tests already in lane repos, plus source-only and optional DB-backed reconciliation script verification  
**Target Platform**: Linux-hosted Docker deployment with `admin-api` as the single production migration runner  
**Project Type**: Monorepo web application with internal CLI-style reconciliation tooling  
**Performance Goals**: Deterministic inventory and classification across the current 60 unique migrations with negligible added deploy latency outside a single manifest comparison pass  
**Constraints**: Must not run production migrations, must not modify `public.knex_migrations`, must not apply production SQL, must preserve migration filenames and ordering, must keep API-local folders temporarily as non-authoritative convergence inputs  
**Scale/Scope**: Three API migration sources, one shared authority, one authorized runner, 60 unique migrations, and two current manual-hotfix candidates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. The change touches migration ownership and runner configuration only; `admin-api` remains the platform shell and auth authority.
- Lane isolation preserved: PASS. API-local folders remain present, and no lane gains implicit runtime access to another lane's service surface.
- Routing delegation preserved: PASS. No route ownership or Nginx delegation changes are introduced.
- Deployment topology preserved: PASS. Host Nginx, Dockerized APIs, and shared Postgres remain unchanged.
- Database ownership preserved: PASS. `admin-api` remains the only authorized production runner during this phase; only its migration source changes.
- Security boundaries preserved: PASS. No API port exposure or ingress changes are required.
- Workflow compliance: PASS. Work traces to the generated feature workspace and the existing migration-authority convergence spec.
- Acceptance criteria present: PASS. The plan includes reconciliation output, runner alignment, and deploy/PR guardrails that are verifiable before production execution.

## Project Structure

### Documentation (this feature)

```text
specs/006-migration-authority-convergence/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
apps/
├── admin-api/
│   ├── knexfile.js
│   ├── src/migrations/
│   └── scripts/enforceProdMigrationAuthority.js
├── moneyshyft-api/
│   ├── knexfile.js
│   └── src/migrations/
└── connectshyft-api/
    ├── knexfile.js
    └── src/migrations/

shared/
└── database/
    ├── migrations/
    └── reconciliation/

scripts/
└── reconcile-shared-migrations.js

docs/
├── DEPLOYMENT_CHECKLIST.md
└── PRODUCTION_DEPLOYMENT_GUIDE.md

.github/
└── pull_request_template/
```

**Structure Decision**: Use the existing monorepo layout. Shared authority and reconciliation metadata live under `shared/database`, the runner change is isolated to `apps/admin-api`, and deploy/PR guardrails remain documentation and template updates rather than runtime redesign.

**Packaging Decision**: Shared authority remains TypeScript in git, but `admin-api` production MUST package runnable JavaScript copies into `apps/admin-api/dist/shared/database/migrations` before the production image is considered valid. The production `knexfile.js` MUST point at that packaged path and MUST NOT rely on lane-local `dist/migrations`.

**Runtime Artifact Validation Rule**: Packaging validation MUST prove both the local `apps/admin-api/dist/shared/database/migrations` artifact and the runtime image/container filesystem contain the runnable shared migration set before production use is approved.

**Scaffolding Preservation Rule**: Existing convergence scaffolding under `shared/database`, `scripts/reconcile-shared-migrations.js`, and migration-authority documentation/template files MUST be extended in place. Overwrite-by-replacement is prohibited unless the before/after diff and retained behavior are documented in `quickstart.md`.

## Complexity Tracking

No constitution violations are required for this plan.
