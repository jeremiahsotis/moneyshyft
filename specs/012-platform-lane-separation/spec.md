# Spec: Platform Lane Separation and Canonical Authority Remediation

Status: Proposed  
Type: Convergence remediation  
Depends on: Platform Lane Authority and Convergence Audit

## Summary

Separate platform lanes so that each app owns only its canonical runtime concerns, shared infrastructure is moved into `libs/`, migration execution is isolated to `migration-runner`, and transitional RouteShyft artifacts are explicitly classified without being silently treated as MoneyShyft ownership.

This work converts the completed lane audit into ordered convergence remediation.

## Problem

The current monorepo has unresolved lane ambiguity across:

- `apps/moneyshyft-api`
- `apps/moneyshyft-web`
- `apps/connectshyft-api`
- `apps/connectshyft-web`
- `apps/admin-api`
- `apps/admin-web`
- `apps/migration-runner`

The audit established that:

1. actual runtime authority does not always match intended lane ownership
2. some feature logic is mirrored, transitional, or misplaced
3. ConnectShyft runtime concerns may still execute from MoneyShyft-owned paths
4. migration authority must be isolated from feature runtimes
5. RouteShyft artifacts still exist inside MoneyShyft surfaces and must be explicitly tracked as transitional

Without convergence remediation:

- fixes may land in the wrong lane
- stale mirrored code may survive indefinitely
- imports may continue crossing app boundaries
- future cleanup becomes harder and riskier

## Goals

1. Establish canonical lane ownership in code structure and runtime entrypoints.
2. Ensure apps do not own feature logic belonging to other lanes.
3. Move shared infrastructure to `libs/`.
4. Isolate migration execution authority to `migration-runner`.
5. Repoint misplaced runtime routes to canonical lanes.
6. Classify and preserve RouteShyft as transitional until later extraction/removal.
7. Make future feature fixes land in the correct lane with minimal ambiguity.

## Non-Goals

This spec does not:

- fully remove RouteShyft
- redesign business logic
- redesign provider abstractions
- merge all duplicated code blindly into shared libs
- rewrite APIs for aesthetic consistency
- perform unrelated UI redesign
- delete transitional code before authority is confirmed
- change product behavior except where required for lane ownership correctness

## Canonical Ownership

### MoneyShyft

Canonical API:

- `apps/moneyshyft-api`

Canonical Web:

- `apps/moneyshyft-web`

Owns:

- budgeting
- accounts
- transactions
- tags/categories
- recurring finance logic
- debt/income/financial planning
- MoneyShyft-specific reporting

Does not own:

- SMS
- telephony
- messaging threads
- neighbor communication
- ConnectShyft preferences
- migration execution
- admin runtime

### ConnectShyft

Canonical API:

- `apps/connectshyft-api`

Canonical Web:

- `apps/connectshyft-web`

Owns:

- threads
- SMS
- voice/call flows
- Telnyx integration
- neighbor communication state
- texting/calling preferences
- communication inbox/thread UI
- communication refusal behaviors
- communication target resolution

Does not own:

- budgeting/finance logic
- migration execution
- admin runtime

### Admin

Canonical API:

- `apps/admin-api`

Canonical Web:

- `apps/admin-web`

Owns:

- tenant management
- org unit management
- feature/module controls
- operational/admin settings
- admin-only dashboards
- platform maintenance tools

Does not own:

- MoneyShyft runtime logic
- ConnectShyft runtime logic
- migration execution runtime after cutover

### Migration Runner

Canonical execution surface:

- `apps/migration-runner`

Owns:

- production migration execution
- one-shot migration runtime
- shared migration authority execution

Does not own:

- feature runtime routes
- business logic
- admin UI/runtime concerns beyond migration execution

### Shared

Canonical shared location:

- `libs/`

Allowed shared concerns:

- config
- db primitives
- auth primitives
- logging/telemetry
- validation primitives
- shared types/contracts
- non-feature-specific utilities

Not allowed in `libs/` merely to avoid ownership decisions:

- MoneyShyft business logic
- ConnectShyft business logic
- Admin business logic

### RouteShyft

Status:

- transitional
- may still exist inside `moneyshyft-api` and `moneyshyft-web`
- not canonical inside MoneyShyft long term

Required classification:

- `transitional_keep_for_now`
- `safe_delete_after_convergence`
- `unknown_requires_followup`

## Rules

1. Apps may import from `libs/`.
2. Apps must not import feature logic directly from other apps.
3. No code deletion is allowed until:
   - canonical owner is confirmed
   - runtime authority is confirmed
   - imports are updated
   - builds pass
   - duplicate copy is confirmed dead
4. Shared logic must be moved before app-to-app imports are removed, when necessary.
5. Transitional RouteShyft code must be marked and inventoried, not silently retained.
6. Migration execution authority must be separated from feature runtime apps.
7. Convergence must happen in ordered phases, not as a repo-wide big bang move.

## Functional Requirements

### FR-1 Lane authority document

The repo must contain an authoritative lane ownership document and lane inventory that reflect the convergence decision.

### FR-2 Lane inventory

Relevant modules, routes, web surfaces, build paths, and execution paths must be classified by lane.

### FR-3 Shared infrastructure extraction

True shared infrastructure used across lanes must be moved into `libs/`.

### FR-4 No app-to-app feature imports

App feature logic must no longer depend on feature code imported directly from another app.

### FR-5 Canonical route ownership

Runtime route entrypoints must live in the canonical lane that owns the feature.

### FR-6 ConnectShyft runtime separation

ConnectShyft runtime routes and feature modules must live in ConnectShyft-owned apps, not inside MoneyShyft-owned apps.

### FR-7 Admin boundary

Admin-only concerns must remain inside Admin-owned apps.

### FR-8 Migration execution boundary

Migration execution must be owned by `migration-runner`, with feature runtimes blocked from production migration execution.

Implementation of migration-runner cutover is blocked until one of the following exists:

1. a constitution amendment replacing `admin-api` production migration ownership with `migration-runner`, or
2. a documented time-bound exception approved by platform owners.

Until then, `admin-api` remains the active production runner as a transitional exception only.

### FR-9 RouteShyft transitional handling

RouteShyft artifacts inside MoneyShyft surfaces must be explicitly classified and preserved or deferred according to audit guidance.

### FR-10 Independent build integrity

Each canonical app must be able to build without depending on misplaced feature logic in another app.

`connectshyft-api` must not depend on widened repo-root compilation or repo-root feature reach-through after shared-domain normalization is complete.

## Required Phases

### Phase 1: governance and inventory

- add/update `architecture/LANE_AUTHORITY.md`
- add/update `architecture/LANE_INVENTORY.md`
- lock canonical lane ownership
- confirm safe patch locations

### Phase 2: shared boundary extraction

- create or refine `libs/` for true shared primitives
- move only infrastructure/shared primitives first
- do not move feature business logic into libs just to avoid choosing ownership

### Phase 2b: shared domain and infrastructure normalization

- normalize `domains/communication` and `infrastructure/communications` as canonical shared dependencies
- tighten `apps/connectshyft-api/tsconfig.json` so ConnectShyft no longer depends on widened repo-root compilation
- remove repo-root feature reach-through before ConnectShyft route cutover

### Phase 3: migration authority separation

- confirm `migration-runner` as canonical migration execution surface
- remove remaining feature-runtime migration execution assumptions
- keep shared migrations authoritative

### Phase 4: canonical route ownership

- repoint route entrypoints so each feature runtime is served from its canonical app
- highest priority: ConnectShyft route ownership
- any temporary MoneyShyft compatibility shim for `/api/v1/connectshyft/*` must remain transport-only and must not retain feature ownership

### Phase 5: feature module relocation

- move misplaced feature module trees into canonical apps
- highest priority: ConnectShyft feature runtime moved out of MoneyShyft-owned paths
- preserve behavior while moving ownership

### Phase 6: RouteShyft transitional isolation

- classify RouteShyft artifacts
- keep transitional RouteShyft paths explicit
- do not remove RouteShyft in this spec unless audit proves safe and in-scope

### Phase 7: stale duplicate cleanup

- remove dead/stale mirrored code only after canonical paths are live and verified

## Acceptance Criteria

### AC-1

A clear canonical owner exists for each lane and is documented in repo.

### AC-2

`LANE_INVENTORY.md` is updated with remediation-relevant paths and decisions.

### AC-3

Shared infrastructure is available from `libs/` where needed.

### AC-4

Feature apps do not rely on app-to-app feature imports for canonical runtime behavior.

### AC-5

ConnectShyft runtime routes/modules are no longer owned by MoneyShyft runtime paths.

### AC-6

Migration execution authority is isolated to `migration-runner`.

### AC-7

RouteShyft artifacts are explicitly classified as transitional and not silently treated as MoneyShyft ownership.

### AC-8

Each canonical app builds independently after convergence changes.

### AC-9

Dead/stale duplicates are not removed until canonical authority is verified.

## Risks

1. Moving route ownership before shared primitives are extracted may break imports.
2. Overusing `libs/` for business logic will create a new ambiguity layer instead of fixing lanes.
3. RouteShyft may have hidden dependencies inside MoneyShyft surfaces.
4. ConnectShyft runtime relocation may affect currently live bugfix locations.
5. Migration-runner cutover may expose remaining lane-local migration assumptions.

## Locked Decisions

1. Migration-runner cutover remains governance-gated until constitution amendment or approved exception exists.
2. Shared-domain normalization is required before ConnectShyft route cutover.
3. `PlatformAdminService` extraction is limited to lane-neutral entitlement/authz helpers.
4. Any MoneyShyft ConnectShyft shim is transport-only and temporary.
5. Production migration cutover requires one authoritative artifact format and one packaging owner.
6. Stale cleanup is inventory-driven and may remove only `dead_stale` copies after proof.
7. `libs/ui-shell` is limited to lane-neutral shell, session, bootstrap, layout, and shared API-client primitives.
8. One build/test order applies across all planning artifacts.

## Suggested Work Breakdown

1. authority + inventory lock
2. shared libs extraction
3. migration execution separation
4. ConnectShyft route ownership move
5. ConnectShyft module relocation
6. admin boundary cleanup
7. RouteShyft transitional isolation
8. dead/stale duplicate cleanup
