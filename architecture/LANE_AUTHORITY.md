# Lane Authority

Status: authoritative working draft for convergence remediation

## Purpose

This document defines canonical ownership for each lane and prevents convergence work from drifting into guesswork.

## Global rules

1. A lane owns its own runtime routes, feature modules, and frontend surfaces.
2. Apps may import from `libs/`.
3. Apps must not import feature logic directly from other apps.
4. Shared infrastructure belongs in `libs/`, not in another lane’s app folder.
5. Transitional or legacy code must be explicitly marked, not silently tolerated.
6. No code is deleted during convergence until:
   - canonical owner is confirmed
   - runtime authority is confirmed
   - imports are updated
   - builds/tests pass
   - duplicate copy is confirmed dead

---

## Canonical lane ownership

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
- ConnectShyft communication preferences
- admin/system operations
- migration execution

---

### ConnectShyft

Canonical API:

- `apps/connectshyft-api`

Canonical Web:

- `apps/connectshyft-web`

Owns:

- threads
- `/api/v1/connectshyft/*`
- `/app/connectshyft/*`
- SMS
- voice/call flows
- Telnyx integration
- neighbor communication state
- texting/calling preferences
- message dispatch
- refusal behavior specific to communication workflows
- communication inbox and thread UI

Does not own:

- budgeting/finance logic
- admin/system operations
- migration execution

---

### Admin

Canonical API:

- `apps/admin-api`

Canonical Web:

- `apps/admin-web`

Owns:

- tenant management
- org unit management
- platform administration
- `/api/v1/auth/*`
- `/api/v1/platform/admin/*`
- `/admin/*`
- operational settings
- feature/module enablement
- migration operations governance
- admin-only dashboards and maintenance surfaces

Does not own:

- budgeting feature runtime
- communication feature runtime
- end-user messaging flows

---

### Migration Runner

Canonical execution surface:

- `apps/migration-runner`

Owns:

- production migration execution
- one-shot migration runtime
- shared migration authority execution path

Does not own:

- feature runtime routes
- app business logic
- admin UI
- MoneyShyft runtime
- ConnectShyft runtime

---

## Shared ownership

Canonical shared location:

- `libs/`

Allowed shared concerns:

- config
- database access primitives
- auth primitives
- logging/telemetry primitives
- validation primitives
- shared types/contracts
- non-feature-specific utility functions

Not allowed in `libs/` just to avoid choosing a lane:

- MoneyShyft business logic
- ConnectShyft business logic
- Admin business logic

---

## Transitional system: RouteShyft

Status:

- transitional
- may currently exist inside `moneyshyft-api` and `moneyshyft-web`
- not considered canonical inside MoneyShyft long term

Rules:

1. RouteShyft artifacts must be explicitly inventoried.
2. RouteShyft artifacts must be classified as:
   - transitional_keep_for_now
   - safe_delete_after_convergence
   - unknown_requires_followup
3. RouteShyft code must not be silently treated as MoneyShyft ownership just because it currently lives there.
4. RouteShyft extraction/removal is a later step unless the audit proves it blocks current convergence.

Current transitional keepers:

- `apps/moneyshyft-api/src/routes/api/v1/route.ts`
- `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`
- `apps/moneyshyft-api/src/modules/route/**`
- `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`

Current stale mirrors that are not alternate owners:

- `apps/admin-api/src/routes/api/v1/route.ts` removed in Slice 7 after canonical-owner verification
- `apps/admin-api/src/routes/api/v1/route-bridge.ts` removed in Slice 7 after canonical-owner verification
- `apps/admin-api/src/modules/route/**` removed in Slice 7 after canonical-owner verification

Removed dead mirrors after canonical-owner verification:

- `apps/admin-api/src/routes/api/v1/connectshyft.ts`
- `apps/admin-api/src/routes/api/v1/route.ts`
- `apps/admin-api/src/routes/api/v1/route-bridge.ts`
- `apps/admin-api/src/modules/route/**`
- `apps/moneyshyft-web/src/views/Admin/**`

---

## Current convergence priorities

1. Confirm actual runtime authority for each lane.
2. Confirm duplicated vs dead copies.
3. Establish canonical route ownership.
4. Move feature runtime to canonical lanes.
5. Remove stale duplicates only after runtime authority is corrected.

---

## Immediate implication for current work

Before fixing live bugs, convergence remediation must answer:

- where the live runtime actually executes
- whether mirrored code exists in other lanes
- which lane is the canonical owner
- whether bug fixes can safely land in current runtime authority
- whether convergence must happen first
