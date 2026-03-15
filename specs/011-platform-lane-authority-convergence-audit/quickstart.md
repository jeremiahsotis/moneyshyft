# Quickstart

## Goal

Reproduce the platform lane authority audit and generate a decision-grade classification set for:

- `money-api` (`apps/moneyshyft-api`)
- `moneyshyft-web`
- `connect-api` (`apps/connectshyft-api`)
- `admin-api`
- `migration-runner`
- RouteShyft artifacts embedded in `money-api` and `moneyshyft-web`

## Inputs

- Feature spec: [`specs/011-platform-lane-authority-convergence-audit/spec.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/spec.md)
- Governing contracts in:
  - [`architecture/platform/runtime-authority-audit-contract.md`](/Users/jeremiahotis/projects/connectshyft/architecture/platform/runtime-authority-audit-contract.md)
  - [`architecture/platform/convergence-classification-model.md`](/Users/jeremiahotis/projects/connectshyft/architecture/platform/convergence-classification-model.md)
  - [`architecture/platform/migration-authority-and-runner-audit-note.md`](/Users/jeremiahotis/projects/connectshyft/architecture/platform/migration-authority-and-runner-audit-note.md)
  - [`architecture/platform/routeshyft-audit-note.md`](/Users/jeremiahotis/projects/connectshyft/architecture/platform/routeshyft-audit-note.md)
  - [`architecture/platform/non-goals-and-boundaries.md`](/Users/jeremiahotis/projects/connectshyft/architecture/platform/non-goals-and-boundaries.md)

## Output Set

- [`audit-scope.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-scope.md)
- [`evidence-index.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/evidence-index.md)
- [`classification-glossary.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/classification-glossary.md)
- [`runtime-authority-map.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/runtime-authority-map.md)
- [`duplication-divergence-map.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/duplication-divergence-map.md)
- [`file-surface-inventory.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/file-surface-inventory.md)
- [`classification-matrix.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/classification-matrix.md)
- [`intended-vs-actual-authority.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/intended-vs-actual-authority.md)
- [`remediation-priority-map.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/remediation-priority-map.md)
- [`migration-authority-map.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/migration-authority-map.md)
- [`routeshyft-artifact-classification.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/routeshyft-artifact-classification.md)
- [`safe-delete-candidates.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/safe-delete-candidates.md)
- [`blocked-areas.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/blocked-areas.md)
- [`audit-summary.md`](/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md)

## Audit Workflow

1. Read the feature spec and governing contracts.
2. Confirm production ingress and route delegation from deployment docs and nginx examples.
3. Inspect each lane’s app bootstrap, server entrypoint, route registration, router configuration, and build/package path.
4. Compare overlapping trees to distinguish mirrored-identical from mirrored-diverged code.
5. Inspect migration authority, current runner, future runner, and lane-local migration assumptions.
6. Inventory RouteShyft artifacts and classify them with runtime status, dependency status, and removal recommendation.
7. Record normalized scope labels, evidence references, and classification rules before writing per-output decisions.
8. End in explicit decisions about:
   - actual runtime authority
   - intended authority
   - safe bug-fix landing now
   - convergence-first areas
   - safe-delete-after-convergence candidates

## Suggested Evidence Commands

```bash
cd /Users/jeremiahotis/projects/connectshyft

sed -n '1,220p' specs/011-platform-lane-authority-convergence-audit/spec.md
sed -n '1,220p' architecture/platform/runtime-authority-audit-contract.md
sed -n '1,220p' architecture/platform/convergence-classification-model.md
sed -n '1,220p' architecture/platform/migration-authority-and-runner-audit-note.md
sed -n '1,220p' architecture/platform/routeshyft-audit-note.md
sed -n '1,220p' architecture/platform/non-goals-and-boundaries.md

sed -n '1,260p' apps/moneyshyft-api/src/api/registerRoutes.ts
sed -n '1,220p' apps/admin-api/src/api/registerRoutes.ts
sed -n '1,220p' apps/connectshyft-api/src/app.ts
sed -n '1,240p' apps/moneyshyft-web/src/router/index.ts

sed -n '1,220p' apps/moneyshyft-api/knexfile.js
sed -n '1,220p' apps/admin-api/knexfile.js
sed -n '1,220p' apps/connectshyft-api/knexfile.js
sed -n '1,220p' apps/migration-runner/knexfile.js

diff -qr apps/moneyshyft-api/src apps/admin-api/src
diff -qr apps/moneyshyft-api/src apps/connectshyft-api/src
diff -qr apps/moneyshyft-web/src apps/admin-web/src

rg -n "RouteShyft|routeshyft|route-bridge|/app/route/requests|/api/v1/route" apps/moneyshyft-api apps/moneyshyft-web

sed -n '1,260p' nginx/host-managed-subdomains.example.conf
sed -n '1,220p' specs/platform/contracts/docker-compose.production.shared.yml
sed -n '1,260p' docs/PRODUCTION_DEPLOYMENT_GUIDE.md
sed -n '1,260p' docs/DEPLOYMENT_CHECKLIST.md
```

## Completion Criteria

The audit is complete only when:

- every covered subsystem is classified
- every RouteShyft artifact in scope is classified
- `admin-api` vs `migration-runner` authority is explicitly decided
- safe patch targets are explicit
- convergence-first areas are explicit
- the output contains decisions, not vague observations

## Validation Checklist

- Confirm nginx delegation sends money/connect auth and platform-admin paths to `admin-api`.
- Confirm `admin-api`, `money-api`, and `connect-api` bind to canonical loopback ports `3100`, `3000`, and `3002`.
- Confirm shared Postgres remains the database target for all production APIs and that production migrations run from `admin-api` only.
- Confirm the deployment runbook and checklist still describe a reproducible three-API, host-nginx, shared-Postgres deployment.

## Validation Recording Targets

- Record nginx and lane-owned route validation results in `audit-summary.md` and `runtime-authority-map.md`.
- Record canonical port validation results in `runtime-authority-map.md`.
- Record shared Postgres and migration-runner validation results in `migration-authority-map.md`.
- Record runbook reproducibility validation results in `audit-summary.md`.

## Non-Goals

- Do not move code between lanes.
- Do not remediate duplication.
- Do not delete RouteShyft artifacts.
- Do not change runtime authority.
- Do not implement feature fixes.
