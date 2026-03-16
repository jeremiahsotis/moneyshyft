# Implementation Plan: Slice 8 Stale Admin Leftovers Cleanup

**Branch**: `013-admin-leftovers-cleanup` | **Date**: 2026-03-16 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/013-admin-leftovers-cleanup/spec.md)
**Input**: Feature specification from `/specs/013-admin-leftovers-cleanup/spec.md`

## Summary

Remove only the clearly stale, unmounted MoneyShyft-era view groups still retained in `admin-web`, verify whether the leftover MoneyShyft admin route mirrors `auth.ts` and `platform-admin.ts` are still required, and update inventory/classification evidence without changing lane ownership, migration behavior, or RouteShyft transitional handling.

## Technical Context

**Language/Version**: TypeScript (ES2022) for Vue 3 and Express monorepo surfaces  
**Primary Dependencies**: Vue 3, Vue Router, Pinia, Express, Jest, ripgrep-based reference verification  
**Storage**: N/A for new persisted data; existing inventory and planning docs only  
**Testing**: `npm run build` for `apps/admin-web`, explicit admin route smoke verification for `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden`, targeted Jest boundary tests for `apps/admin-api` and `apps/moneyshyft-api`, static import/reference scans, and deployment-topology checks covering Nginx delegation, localhost API bindings, shared PostgreSQL invariants, and runbook reproducibility  
**Target Platform**: Linux-hosted Dockerized APIs and static frontends behind host Nginx  
**Project Type**: Monorepo web application with separate frontend and API lanes  
**Performance Goals**: No regression to current admin route availability for `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden`; no added runtime hops or new route ownership  
**Constraints**: Cleanup must be proof-based, limited to stale admin-web leftovers and verified likely-stale admin leftovers, and must not alter ConnectShyft ownership, migration authority, or RouteShyft transitional keepers  
**Scale/Scope**: Seven stale admin-web view groups, two likely stale MoneyShyft admin route mirrors, and inventory/classification documentation updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

- Platform shell authority preserved: **PASS**. `admin-web` and `admin-api` remain the active shell and auth authority; this slice only removes stale leftovers around them.
- Lane isolation preserved: **PASS**. No new cross-lane coupling is introduced; the slice only verifies or removes unmounted leftovers.
- Routing delegation preserved: **PASS**. `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api`; no lane route ownership changes are proposed.
- Deployment topology preserved: **PASS**. Host Nginx, Dockerized APIs, and static frontend serving are unchanged.
- Database ownership preserved: **PASS**. Shared Postgres usage and current production migration authority remain unchanged.
- Security boundaries preserved: **PASS**. No public port or cookie-scope changes are introduced.
- Workflow compliance: **PASS**. Plan is derived directly from the generated Slice 8 spec and bounded to task-ready cleanup work.
- Acceptance criteria present: **PASS**. Build, route, reference-proof, and inventory verification requirements are defined.

### Post-Design Check

- Platform shell authority preserved: **PASS**
- Lane isolation preserved: **PASS**
- Routing delegation preserved: **PASS**
- Deployment topology preserved: **PASS**
- Database ownership preserved: **PASS**
- Security boundaries preserved: **PASS**
- Workflow compliance: **PASS**
- Acceptance criteria present: **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/013-admin-leftovers-cleanup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── stale-admin-cleanup-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── admin-web/
│   └── src/
│       ├── router/
│       ├── views/
│       │   ├── Admin/
│       │   ├── Accounts/
│       │   ├── Budget/
│       │   ├── DashboardView.vue
│       │   ├── Debts/
│       │   ├── Goals/
│       │   ├── Scenarios/
│       │   └── Transactions/
│       └── components/layout/
├── admin-api/
│   └── src/
│       ├── api/
│       ├── routes/api/v1/
│       └── __tests__/
└── moneyshyft-api/
    └── src/
        ├── routes/api/v1/
        └── __tests__/

architecture/
├── LANE_AUTHORITY.md
└── LANE_INVENTORY.md

specs/012-platform-lane-separation/
└── remediation-map.md
```

**Structure Decision**: Use the existing multi-lane monorepo layout. Cleanup work will touch `apps/admin-web` for stale unmounted view groups and supporting admin navigation references, may verify a narrow set of leftover MoneyShyft admin route files in `apps/moneyshyft-api`, and must keep `architecture/LANE_INVENTORY.md` plus remediation documentation synchronized with the reviewed outcomes.

## Phase 0: Research Outcomes Feeding Design

- Confirmed `apps/admin-web/src/router/index.ts` mounts only admin routes under `/admin/*` plus auth flows; the candidate MoneyShyft view groups are not router-mounted.
- Confirmed `apps/admin-web/src/components/layout/AppHeader.vue` and `AppMobileNav.vue` still contain MoneyShyft navigation paths, so safe cleanup may require removing dead navigation references in addition to deleting stale view groups.
- Confirmed `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` directly imports `../routes/api/v1/auth`, so `auth.ts` is not yet safe to delete without repointing or retiring that test dependency.
- Confirmed `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` is no longer mounted live and currently has no equivalent direct test import evidence, making it a valid proof-before-delete candidate.

## Phase 1: Design Focus

- Treat each stale view group and likely stale leftover as an individual cleanup target with its own evidence record.
- Require proof across four dimensions before deletion: router mount, static imports, dynamic references, and test dependency.
- Allow minimal supporting cleanup in `admin-web` layout/navigation surfaces when required to remove live references to already-unmounted stale paths.
- Classify `auth.ts` and `platform-admin.ts` independently; do not assume they share the same deletion outcome.
- Update inventory and remediation docs as part of the same slice so retained targets are explicitly marked as still-needed and removed targets become confirmed stale deletions.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
