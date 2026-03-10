# Quickstart: CS-001 Lane Convergence

## 1. Baseline inventory

1. Capture current ConnectShyft artifacts in both apps:
   - `find apps/connectshyft-web/src -type f | rg 'ConnectShyft|connectshyft'`
   - `find apps/moneyshyft-web/src -type f | rg 'ConnectShyft|connectshyft'`
2. Capture current route ownership:
   - `rg -n "path:\s*'/app/connectshyft" apps/*/src/router/index.ts`

## 2. Migrate required UI primitives to connect lane

1. Move/copy required components from money lane to `apps/connectshyft-web/src/components/connectshyft/`.
2. Migrate `ConnectShyftDirectoryView.vue` and related helper(s) if directory workflow remains in route set.
3. Rewire imports in connect lane views to use local connect lane component paths.

## 3. Remove duplicate money lane ConnectShyft UI

1. Delete `apps/moneyshyft-web/src/views/ConnectShyft/*` after parity confirmation.
2. Delete `apps/moneyshyft-web/src/components/connectshyft/*`.
3. Delete `apps/moneyshyft-web/src/features/connectshyft/*` after extraction/migration.

## 4. Converge routes

1. Remove `/app/connectshyft/*` route entries from `apps/moneyshyft-web/src/router/index.ts`.
2. Ensure canonical routes exist in `apps/connectshyft-web/src/router/index.ts`.

## 5. Converge build/test targets

1. Retarget Playwright stack frontend startup to `apps/connectshyft-web`.
2. Verify CI workflow calls converged stack behavior.
3. Add/enable guard check that fails if ConnectShyft UI paths exist in money lane.

## 6. Verification

1. Run build:
   - `nx run connectshyft-web:build`
2. Run policy/guard:
   - `npm run policy:check`
3. Run Playwright (ConnectShyft-focused shard or subset):
   - `bash scripts/ci-run-playwright-stack.sh npx playwright test tests/e2e/platform`
4. Validate acceptance:
   - Inbox parity, thread parity, desktop 3-column layout, single frontend ownership.

