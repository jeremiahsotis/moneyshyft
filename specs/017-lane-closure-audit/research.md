# Research: Final Lane Convergence Closure Audit

## Decision: Lane convergence is not yet complete for ConnectShyft, MoneyShyft, and Admin

- Decision: The closure audit result is `one tiny final cleanup slice needed`, not `lane convergence complete`.
- Rationale:
  - MoneyShyft still retains a divergent ConnectShyft mirror tree at `apps/moneyshyft-api/src/modules/connectshyft`.
  - Admin still retains a divergent ConnectShyft support mirror tree at `apps/admin-api/src/modules/connectshyft`.
  - Both trees still have active importer anchors in tests or unmounted route files.
  - Live runtime ownership is already correct, so the remaining work is narrow rather than blocked.
- Alternatives considered:
  - declare convergence complete because runtime ownership is correct: rejected because stale divergent mirror trees still preserve ownership ambiguity
  - declare the audit blocked: rejected because the remaining work appears removable in one bounded cleanup slice

## Decision: ConnectShyft is `small final cleanup still needed`

- Decision: Record ConnectShyft as open for one tiny final cleanup slice.
- Rationale:
  - Canonical runtime ownership is correct in `apps/connectshyft-api/src/app.ts`.
  - `bash scripts/verify-connectshyft-route-ownership.sh` passed.
  - The remaining ambiguity is outside the lane, in stale MoneyShyft/Admin mirror trees that still duplicate ConnectShyft module behavior.
- Alternatives considered:
  - mark ConnectShyft closed immediately: rejected because the mirror trees still exist and are still imported

## Decision: MoneyShyft is `small final cleanup still needed`

- Decision: Record MoneyShyft as needing one tiny final cleanup slice.
- Rationale:
  - `apps/moneyshyft-api/src/modules/connectshyft` still exists and diverges from the canonical ConnectShyft module tree.
  - Active importer anchors remain in:
    - `apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
    - `apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`
  - The broad inventory row for `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts except route-ownership` no longer matches live files and was reconciled to historical documentation only.
- Alternatives considered:
  - mark MoneyShyft blocked: rejected because no live runtime route crossing remains
  - mark MoneyShyft closed: rejected because the divergent mirror tree and importer anchors still exist

## Decision: Admin is `small final cleanup still needed`

- Decision: Record Admin as needing one tiny final cleanup slice.
- Rationale:
  - `apps/admin-api/src/modules/connectshyft` still exists and diverges from the canonical ConnectShyft module tree.
  - Active importer anchors remain in:
    - `apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
    - `apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
    - `apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
    - `apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`
  - Admin runtime ownership is otherwise correct for `/api/v1/auth` and `/api/v1/platform/admin`.
- Alternatives considered:
  - mark Admin blocked: rejected because the remaining issue is stale mirror cleanup, not live runtime drift
  - mark Admin closed: rejected because the divergent mirror tree and importer anchors still exist

## Decision: MoneyShyft web `/admin/*` is already resolved as redirect-only delegation

- Decision: Reconcile the MoneyShyft web `/admin/*` inventory row to a documentation-only resolved handoff.
- Rationale:
  - `apps/moneyshyft-web/src/router/index.ts` redirects `/admin/*` requests rather than mounting local Admin views.
  - `apps/moneyshyft-web/src/utils/adminAppUrl.ts` generates the Admin target path.
  - `apps/moneyshyft-web/src/views/Admin` is absent.
- Alternatives considered:
  - leave the row transitional: rejected because the repo no longer contains a local admin mirror runtime or local admin view tree

## Decision: Route-level MoneyShyft ConnectShyft test-glob row is stale documentation, not an active blocker

- Decision: Reconcile `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts except route-ownership` to historical documentation only.
- Rationale:
  - `rg --files apps/moneyshyft-api/src/routes/api/v1/__tests__ | rg 'connectshyft.*test\\.ts$'` returns only `connectshyft.route-ownership.test.ts`.
  - Slice 10 removed the remaining MoneyShyft route-test mirrors in that family.
- Alternatives considered:
  - keep the row open as unknown follow-up: rejected because the matched files are gone

## Decision: Runtime ownership is correct; remaining ambiguity is import/test based

- Decision: Treat the closure gap as stale mirror-tree cleanup, not live runtime boundary drift.
- Rationale:
  - `node scripts/enforce-workspace-boundaries.js` passed.
  - `bash scripts/verify-connectshyft-route-ownership.sh` passed.
  - Current route registration evidence shows:
    - `apps/connectshyft-api/src/app.ts` mounts `/api/v1/connectshyft`
    - `apps/admin-api/src/api/registerRoutes.ts` mounts Admin-owned auth and platform routes
    - `apps/moneyshyft-api/src/api/registerRoutes.ts` does not remount ConnectShyft or Admin runtime mirrors
- Alternatives considered:
  - treat the remaining import anchors as live runtime blockers: rejected because they do not currently mount the wrong lane runtime

## Decision: Migration-runner cutover is not yet the only major remaining item

- Decision: Do not treat migration-runner cutover as the sole remaining major item yet.
- Rationale:
  - The MoneyShyft/Admin ConnectShyft mirror-tree cleanup remains open inside the lane-convergence scope.
  - `apps/admin-api migration execution paths` remains explicitly out of scope for this audit and was not started.
- Alternatives considered:
  - declare migration-runner cutover the only remaining major item now: rejected because the mirror-tree cleanup is still unresolved

## Commands run

```bash
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
rg -n "converge_first|transitional|unknown|mirrored_identical|mirrored_diverged" architecture/LANE_INVENTORY.md
rg -n "modules/connectshyft" apps/moneyshyft-api/src apps/admin-api/src --glob '!**/node_modules/**'
test -d apps/moneyshyft-web/src/views/Admin && echo exists || echo missing
diff -rq apps/moneyshyft-api/src/modules/connectshyft apps/connectshyft-api/src/modules/connectshyft | head -n 40
diff -rq apps/admin-api/src/modules/connectshyft apps/connectshyft-api/src/modules/connectshyft | head -n 40
node scripts/enforce-workspace-boundaries.js
bash scripts/verify-connectshyft-route-ownership.sh
rg -n "use\\('/api/v1/auth|use\\('/api/v1/connectshyft|use\\('/api/v1/platform|use\\('/api/v1/platform/admin" apps/moneyshyft-api/src apps/admin-api/src apps/connectshyft-api/src
rg -n "path:\\s*'/admin|redirect.*'/admin|/app/connectshyft" apps/moneyshyft-web/src apps/admin-web/src apps/connectshyft-web/src
npm run build
```
