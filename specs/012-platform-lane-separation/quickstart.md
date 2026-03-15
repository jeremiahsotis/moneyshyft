# Quickstart: Platform Lane Separation and Canonical Authority Remediation

This quickstart validates the design intent and safe execution order for the phased remediation. It does not perform the convergence itself.

## Preconditions

- Read:
  - `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/spec.md`
  - `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_AUTHORITY.md`
  - `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`
  - `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/remediation-map.md`
  - `/Users/jeremiahotis/projects/connectshyft/specs/012-platform-lane-separation/implementation-plan.md`
- Treat migration-runner cutover as blocked until constitution alignment is complete.

## Phase execution order

1. Lock authority and inventory.
2. Extract shared libs.
3. Normalize shared domain/infrastructure ownership.
4. Isolate migration execution to `migration-runner` once governance allows it.
5. Repoint canonical route ownership.
6. Relocate feature modules.
7. Isolate RouteShyft as transitional.
8. Remove stale duplicates last.

## Verification checklist by phase

### Phase 0: Authority + Inventory Lock

```bash
rg "apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts|apps/moneyshyft-api/src/modules/connectshyft|apps/admin-api migration execution paths|RouteShyft" architecture/LANE_INVENTORY.md
```

Expected result:
- Inventory rows exist for live wrong-lane ConnectShyft ownership, admin/migration authority, and RouteShyft transitional artifacts.

### Phase 1: Shared Lib Extraction

```bash
rg "from '\\.\\./.*apps/" apps domains infrastructure shared
```

Expected result:
- No canonical runtime path imports feature logic from another app.

Build order:

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api && npm run build
```

### Phase 2: Shared Domain and Infrastructure Normalization

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build
```

Expected result:
- `connectshyft-api` builds without special-case app-to-app feature imports.

### Phase 3: Migration-Runner Separation

Governance gate:
- Constitution amendment or approved exception recorded before cutover.

Build and image checks:

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/migration-runner && npm run migrate:latest -- --help
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api && npm run build
```

Expected result:
- `migration-runner` is the only production execution surface.
- Feature runtimes remain blocked from production migration execution.

### Phase 4: Canonical Route Ownership

Route ownership checks:

```bash
rg "path: '/admin|/app/route/requests'" /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/router/index.ts
rg "app.use\\('/api/v1/connectshyft'" /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts
```

Expected result:
- MoneyShyft no longer owns admin routes.
- Canonical ConnectShyft API is the live owner of `/api/v1/connectshyft`.
- Transitional RouteShyft page may still be present in MoneyShyft.

Build order:

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-web && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-web && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web && npm run build
```

### Phase 5: Feature Module Relocation

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm test
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api && npm run build
```

Expected result:
- ConnectShyft route behavior is sourced only from `connectshyft-api`.

### Phase 6: Transitional RouteShyft Isolation

```bash
rg "/api/v1/route|/api/v1/route-bridge|RouteRequestLifecycleView" /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web
```

Expected result:
- RouteShyft remains mounted and explicitly transitional.

### Phase 7: Stale Duplicate Cleanup

```bash
diff -rq /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft
diff -rq /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/src/views/Admin /Users/jeremiahotis/projects/connectshyft/apps/admin-web/src/views/Admin
```

Expected result:
- Cleanup decisions happen only after canonical owners are live and verified.

## Final verification order

1. Shared libs build and import-boundary check
2. `migration-runner`
3. `admin-api`
4. `connectshyft-api`
5. `moneyshyft-api`
6. `admin-web`
7. `connectshyft-web`
8. `moneyshyft-web`
9. Focused route/module tests
10. Proxy/ingress smoke verification against host-managed subdomain routing contracts
