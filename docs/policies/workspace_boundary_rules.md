# Workspace Boundary Rules

## Purpose

Define enforceable workspace lane boundaries so cross-lane coupling is blocked by default and shared packages stay controlled.

## Lane Taxonomy

- `lane:routeshyft` - RouteShyft-owned projects.
- `lane:connectshyft` - ConnectShyft-owned projects.
- `lane:signshyft` - SignShyft-owned projects.
- `scope:shared` - approved shared package surface (`packages/shared-*`).

Every Nx project must have exactly one lane tag or `scope:shared`.

## Current Project Inventory

- `apps/moneyshyft-api/project.json`: `lane:routeshyft`, `type:app`, `runtime:node`
- `apps/moneyshyft-web/project.json`: `lane:routeshyft`, `type:app`, `runtime:web`
- `tools/e2e/project.json`: `lane:routeshyft`, `type:tool`, `scope:test`

## Allowed Dependency Directions

- `lane:routeshyft` -> `lane:routeshyft`, `scope:shared`
- `lane:connectshyft` -> `lane:connectshyft`, `scope:shared`
- `lane:signshyft` -> `lane:signshyft`, `scope:shared`
- `scope:shared` -> `scope:shared`

No direct lane-to-lane imports are allowed.

## Shared Package Boundary Contract

- Shared packages must live under `packages/shared-*`.
- Shared packages must expose a public entrypoint at `src/index.ts`.
- Deep imports are forbidden across package boundaries.
- Import shared packages from package root only (never `.../src/*`).

## Enforcement

- Nx/ESLint lane dependency constraints in `.eslintrc.cjs`.
- Deep-import restriction in `.eslintrc.cjs` (`no-restricted-imports`).
- Policy guard script: `scripts/enforce-workspace-boundaries.js`.
- CI and local policy gate: `npm run policy:check`.

## Failure Remediation

1. Add the correct lane/shared tags to `project.json`.
2. Route shared behavior through `packages/shared-*/src/index.ts`.
3. Remove deep imports and import only package roots.
4. Re-run `npm run boundary:check` and `npm run policy:check`.
