# Two-Part Brief: Deploy Now vs Defer

## Part A: Include Now In This Deployment Contract Round

This round is for deployment tightening only.

### 1. Runtime topology contract
Lock this now.

- Host Nginx is the shared reverse proxy and static file server.
- Host Postgres is the shared production database.
- Node APIs run in Docker containers, bound to loopback only.
- Frontends are built to static `dist/` output and served by host Nginx.
- One subdomain per lane.
- `admin.shyftunity.com` is the temporary shell host and platform admin surface.

### 2. Shell and auth authority contract
Lock this now.

- `admin-web` is the temporary Shyft shell host.
- `admin-api` is the temporary auth and platform-admin authority.
- MoneyShyft and ConnectShyft must delegate shared auth and platform-admin traffic to `admin-api`.
- Deployment must preserve shared session behavior across lanes.

### 3. Routing contract
Lock this now.

#### Admin domain
- `admin.shyftunity.com` serves `admin-web`
- `/api/*` routes to `admin-api`

#### Money domain
- `money.shyftunity.com` serves `moneyshyft-web`
- `/api/v1/auth/*` routes to `admin-api`
- `/api/v1/platform/admin/*` routes to `admin-api`
- all other `/api/*` routes to `moneyshyft-api`

#### Connect domain
- `connect.shyftunity.com` serves `connectshyft-web`
- `/api/v1/auth/*` routes to `admin-api`
- `/api/v1/platform/admin/*` routes to `admin-api`
- all other `/api/*` routes to `connectshyft-api`

### 4. Port and path contract
Lock this now.

Canonical ports:
- `admin-api` -> `3100`
- `moneyshyft-api` -> `3000`
- `connectshyft-api` -> `3002`

Canonical frontend paths:
- `/home/jeremiahotis/projects/shyftunity/apps/admin-web/dist`
- `/home/jeremiahotis/projects/shyftunity/apps/moneyshyft-web/dist`
- `/home/jeremiahotis/projects/shyftunity/apps/connectshyft-web/dist`

Repo names, env file names, Docker service names, and Nginx roots must match this naming.

### 5. Database ownership contract
Lock this now.

- One shared Postgres database for Admin, MoneyShyft, and ConnectShyft.
- One authoritative migration history.
- One authoritative seed history.
- Production migrations run once from one source only.
- Temporary migration runner is `admin-api` until DB ownership is centralized.
- App containers connect to host Postgres through Docker host-gateway mapping.

### 6. Capability and access contract
Lock this now.

- Lane access is capability-based and tenant-enablement-based.
- Top-level visibility depends on both lane enablement and read capability.
- Deployment acceptance tests must verify entitlement-aware visibility and route behavior.
- `admin-api` remains the authority for platform capabilities and lane enablement.

### 7. Standardized production packaging contract
Lock this now.

Every deployable API must have:
- `Dockerfile.production`
- deterministic dependency install
- explicit port
- `/health` endpoint
- production env file support
- memory cap: `NODE_OPTIONS=--max-old-space-size=384`
- no dependency on containerized Postgres

Every deployable frontend must:
- build to `dist/`
- behave as a SPA behind `try_files ... /index.html`
- not require a Node runtime in production

### 8. Product Shell posture that matters now
Include only the posture, not the full implementation.

- Shyft is one product shell with many lane applications.
- Shared auth, tenant context, module visibility, and global navigation are shell concerns.
- This deployment round must not harden a topology that fights future shell evolution.
- Current deployment should preserve the temporary shell role of `admin-web` and `admin-api`.

### 9. Frontend architecture posture that matters now
Include only the boundary rules.

- Shell concerns and lane concerns must remain separate.
- Shared concerns belong in packages, not copied into each lane.
- Routing and API client ownership must be explicit.
- The deployment contract must not assume each lane owns its own auth or platform admin stack.

### 10. Minimal platform ownership rules that matter now
Include only the runtime-safe parts.

- `admin-api` is the temporary platform and auth authority.
- ConnectShyft is not the source of truth for platform identity or contact ownership.
- Lane deployment must not imply that MoneyShyft or ConnectShyft own system-wide auth or platform state.

---

## Part B: Defer To The Next Contract Update Round

These are important, but they are not required to tighten deployment right now.

### 1. Full Product Shell implementation
Defer:
- dedicated permanent shell app decision
- full shell feature set
- global search implementation
- unified notification center implementation
- full cross-lane activity feed

### 2. Full domain architecture rollout
Defer:
- People Core domain rollout
- Household domain rollout
- Address domain rollout
- Finance domain rollout
- full cross-domain ownership enforcement
- canonical DTO/event alignment across all future domains

### 3. Event bus architecture and lane event catalog implementation
Defer:
- broker choice
- outbox pattern implementation
- subscriber contracts
- event envelope standard
- lane-by-lane event execution wiring

### 4. Full reusable UI and token system rollout
Defer:
- full shared component package extraction
- full token package enforcement
- design token governance beyond deployment-safe constraints
- shell-wide theming implementation details

### 5. Full unified person profile implementation
Defer:
- global person summary experience
- lane-level profile composition rules
- people search and duplicate detection implementation

### 6. Future platform rollout contracts for commented-out lanes
Defer:
- RouteShyft deployment contracts
n- ResourceShyft deployment contracts
- FriendShyft deployment contracts
- SignShyft production rollout contracts
- all remaining lane-specific production contracts unless they directly block this round

---

## Bottom line

For this round:
- lock topology
- lock routing
- lock ports and paths
- lock DB authority
- lock container standards
- lock acceptance tests

Do not mix deployment tightening with full platform evolution.
