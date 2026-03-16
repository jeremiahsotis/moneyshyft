# Research: Slice 8 Stale Admin Leftovers Cleanup

## Decision 1: Treat the named admin-web view groups as unmounted stale cleanup candidates

- **Decision**: Use the seven named `apps/admin-web/src/views/{Accounts,Budget,Dashboard,Debts,Goals,Scenarios,Transactions}` targets as the primary deletion candidates for this slice.
- **Rationale**: `apps/admin-web/src/router/index.ts` mounts only admin auth and `/admin/*` routes, and `specs/012-platform-lane-separation/remediation-map.md` already classifies these admin-web MoneyShyft surfaces as an unmounted stale mirror rather than live admin ownership.
- **Alternatives considered**:
  - Keep the view groups indefinitely because they still exist in the repo. Rejected because current router evidence and remediation mapping already identify them as stale baggage.
  - Expand the slice into all matching stores/components immediately. Rejected because the user explicitly requested a narrow, non-blanket cleanup.

## Decision 2: Include stale navigation reference cleanup only when needed to safely remove stale views

- **Decision**: Allow supporting cleanup in `apps/admin-web/src/components/layout/AppHeader.vue` and `AppMobileNav.vue` if those surfaces still link to the stale MoneyShyft paths.
- **Rationale**: The current admin-web layout still contains MoneyShyft navigation items such as `/accounts`, `/budget`, and `/transactions`, even though the admin router no longer mounts those routes. Removing stale views without cleaning those references would preserve a broken navigation experience and undermine the slice’s safety goal.
- **Alternatives considered**:
  - Delete only the view files and leave navigation untouched. Rejected because it leaves live broken links in admin-web.
  - Treat navigation cleanup as out of scope for this slice. Rejected because it is directly caused by the stale view cleanup and remains lane-local to `admin-web`.

## Decision 3: Retain `apps/moneyshyft-api/src/routes/api/v1/auth.ts` unless its direct test dependency is removed or repointed

- **Decision**: Do not assume `auth.ts` is safe to delete in this slice; require explicit proof of no remaining dependency before removal.
- **Rationale**: `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` directly imports `../routes/api/v1/auth`, so the file is still needed by at least one current test surface even though it is no longer mounted live.
- **Alternatives considered**:
  - Delete `auth.ts` based only on runtime unmount evidence. Rejected because the test dependency makes the file still active in repo behavior.
  - Declare `auth.ts` permanently retained. Rejected because the slice must still verify whether the test dependency can be repointed or whether the file should remain explicitly retained.

## Decision 4: Treat `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` as a proof-before-delete candidate

- **Decision**: Verify `platform-admin.ts` for imports, dynamic references, and test dependency; delete it only if that proof is clean.
- **Rationale**: Inventory already marks it as unmounted in MoneyShyft, and current repo scans show no direct import equivalent to the `auth.ts` test dependency. That makes it a valid deletion candidate, but still not safe for assumption-only cleanup.
- **Alternatives considered**:
  - Delete `platform-admin.ts` immediately. Rejected because the slice requires verification, not assumption.
  - Retain `platform-admin.ts` automatically because it resembles `auth.ts`. Rejected because current evidence does not show the same dependency pattern.

## Decision 5: Keep documentation updates inside the slice

- **Decision**: Update `architecture/LANE_INVENTORY.md` and relevant remediation docs in the same slice as any deletion or retention decision.
- **Rationale**: This cleanup is inventory-backed by definition. A target that is removed or retained without updated classification would immediately recreate ambiguity for the next cleanup pass.
- **Alternatives considered**:
  - Defer documentation updates to a later cleanup pass. Rejected because it breaks the stated proof-based workflow.
