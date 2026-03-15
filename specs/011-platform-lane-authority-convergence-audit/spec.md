# Spec - Platform Lane Authority and Convergence Audit

Status: Ready for SpecKit

## Governing contracts
- `architecture/platform/runtime-authority-audit-contract.md`
- `architecture/platform/convergence-classification-model.md`
- `architecture/platform/migration-authority-and-runner-audit-note.md`
- `architecture/platform/routeshyft-audit-note.md`
- `architecture/platform/non-goals-and-boundaries.md`

## Supporting files required
- `specs/platform-lane-authority-convergence-audit/bootstrap-prompts.md`
- `specs/platform-lane-authority-convergence-audit/implementation-checklist.md`
- `.github/pull_request_template/platform-lane-authority-convergence-audit.md`

## Problem statement
There is unresolved ambiguity across platform lanes and execution surfaces about:
- what is actually live
- what is intended to be canonical
- what is duplicated or diverged
- where bug fixes should land safely
- what RouteShyft artifacts inside money-api and moneyshyft-web are transitional and removable later

## Scope
In scope:
- money-api
- moneyshyft-web
- connect-api
- admin-api
- migration-runner
- RouteShyft artifacts embedded in money-api and moneyshyft-web
- runtime routes
- module/service overlap
- validators
- scripts
- packaging/build logic
- migration execution authority

Out of scope:
- performing convergence remediation
- deleting code
- changing runtime authority
- fixing feature bugs directly

## Routing ownership and lane/API boundaries
- `admin-web` and `admin-api` are the platform shell and authentication authority.
- `admin-api` owns `/api/v1/auth/*` and `/api/v1/platform/admin/*`.
- Lane frontends delegate auth and platform-admin requests to `admin-api`.
- All other lane `/api` routes are lane-owned unless audit evidence proves a live legacy exception.
- `money-api` maps to `apps/moneyshyft-api`; `connect-api` maps to `apps/connectshyft-api`.
- `migration-runner` has no public HTTP surface and is audited as an execution-only surface.

## User stories

### US1 - Discover live surfaces
As a platform auditor, I want a complete discovery map of live routes, serving surfaces, overlaps, and file paths so I can identify what actually runs today.

### US2 - Classify authority and patch targets
As a platform auditor, I want each subsystem classified with actual authority, intended authority, and safe bug-fix landing guidance so teams know where fixes can land now.

### US3 - Decide migration and RouteShyft blockers
As a platform auditor, I want migration authority, RouteShyft status, safe-delete gates, and blocked areas documented so convergence work is sequenced correctly.

## Required outputs
1. runtime authority map
2. duplication/divergence map
3. intended-vs-actual authority map
4. remediation priority map
5. migration authority and runner map
6. safe-delete candidate list
7. blocked areas requiring convergence before feature fixes
8. RouteShyft artifact classification list

## Definitions
- Covered surface: any in-scope runtime route, serving surface, module/service area, validator, script, packaging/build path, migration path, or RouteShyft artifact.
- Classified: assigned one of `canonical`, `mirrored_identical`, `mirrored_diverged`, `dead_stale`, `transitional`, or `unknown`.
- Decision-grade: includes actual authority, intended authority, evidence reference, remediation priority, and safe bug-fix landing guidance.

## Acceptance scenarios
1. A reviewer can trace `/api/v1/auth/*` and `/api/v1/platform/admin/*` delegation from lane frontend, proxy, and nginx evidence to `admin-api`.
2. A reviewer can trace lane-owned `/api` routes for MoneyShyft and ConnectShyft to the correct lane API or identify a documented live exception.
3. A reviewer can verify shared-Postgres compatibility and current production migration ownership from runbook, knex, and packaging evidence.
4. A reviewer can distinguish canonical, mirrored, dead/stale, transitional, and unknown classifications, and can separately identify blocked areas requiring convergence before feature fixes.

## Edge cases
- Deployment docs, mounted routes, and runtime contracts may disagree; the audit must record the precedence rule used for final classification.
- `connect-api` may be intended as canonical while `money-api` still hosts live ConnectShyft routes; the audit must distinguish live authority from intended authority.
- `migration-runner` may be implemented but not yet production-active; the audit must record both current and future runner status.
- RouteShyft artifacts may be live yet non-canonical; the audit must classify them as transitional rather than assuming they are safe to delete.

## Acceptance criteria
- every covered surface appears in the audit outputs and has a classification
- RouteShyft artifacts in money-api and moneyshyft-web are explicitly classified with runtime and dependency status
- migration authority mapping identifies the current production runner, future runner, and any remaining lane-local assumptions
- remediation and blocked-area outputs end in explicit patch-now, converge-first, keep-for-now, or safe-delete-later decisions
