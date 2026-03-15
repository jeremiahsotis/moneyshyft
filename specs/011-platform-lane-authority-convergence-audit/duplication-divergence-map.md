# Duplication and Divergence Map

## Comparison Sets

| Comparison set | Common relative paths | Identical files | Diverged files | Live overlap | Decision |
| --- | --- | --- | --- | --- | --- |
| `money-api` vs `admin-api` `src/` | 246 | 220 | 26 | Auth/platform-admin mirrors are live; large money/connect/route trees also exist inside `admin-api` but are not mounted there | Treat `admin-api` auth/platform-admin as canonical. Treat unmounted duplicate money/connect/route trees inside `admin-api` as runtime-dead baggage until proven otherwise. |
| `money-api` vs `connect-api` `src/` | 177 | 155 | 22 | Both lanes contain live ConnectShyft backend behavior; public ingress points connect traffic to `connect-api`, but runtime-host contract still names `money-api` | Treat cross-host ConnectShyft backend overlap as `mirrored_diverged` and `converge_first` for shared behavior changes. |
| `moneyshyft-web` vs `admin-web` `src/` | 99 | 88 | 11 | `moneyshyft-web` mounts live admin entrypoints that overlap with `admin-web` | Treat `admin-web` as canonical admin UI and `moneyshyft-web` admin pages as mirrored transitional UI. |
| Shared migrations vs `connect-api` lane-local migrations | 60 shared vs 60 lane-local | 60 | 0 | Exact file mirror, but production authority is shared only | Keep shared migrations canonical; lane-local copy is a packaging mirror, not a separate authority. |
| Shared migrations vs `money-api` lane-local migrations | 60 shared vs 56 lane-local | 56 | 0 | Subset mirror only; production execution is blocked in lane | Treat lane-local tree as transitional build baggage, not production authority. |
| Shared migrations vs `admin-api` lane-local migrations | 60 shared vs 56 lane-local | 56 | 0 | `admin-api` packages shared migrations into `dist/shared/database/migrations` | Treat lane-local source subset as transitional because packaged shared migrations are the production source. |

## Validators

The same validator set exists in all three API lanes:

- `account.validators.ts`
- `assignment.validators.ts`
- `auth.validators.ts`
- `budget.validators.ts`
- `category.validators.ts`
- `debt.validators.ts`
- `extra-money.validators.ts`
- `goal.validators.ts`
- `income.validators.ts`
- `recurring.validators.ts`
- `split.validators.ts`
- `tag.validators.ts`
- `transaction.validators.ts`

Decision: validator duplication is real and should remain visible in the audit, but only validator paths attached to the live authority should receive bug fixes unless the issue is a planned convergence task.

## Scripts and Packaging Overlap

| Path | Overlap type | Decision |
| --- | --- | --- |
| `apps/admin-api/scripts/packageSharedMigrations.js` | Admin-only packaging logic | Canonical shared-migration packaging path for current production authority. |
| `apps/connectshyft-api/scripts/writeDistServerEntrypoint.js` | Connect-only packaging logic | Transitional packaging step needed for the current connect build layout. |
| `apps/*/scripts/enforceProdMigrationAuthority.js` | Mirrored enforcement scripts | Treat as lane-local guardrails; do not assume they imply separate production migration authority. |

## Patch-Risk Summary

- `money-api` vs `admin-api`: mostly mirrored-identical baggage with a smaller set of divergent auth/admin/connect files.
- `money-api` vs `connect-api`: live split authority and the highest patch risk in scope.
- `moneyshyft-web` vs `admin-web`: UI mirror risk, especially for admin flows embedded in the money lane.
- Shared migrations vs lane-local trees: exact or subset mirrors that must not be treated as separate production authority.
