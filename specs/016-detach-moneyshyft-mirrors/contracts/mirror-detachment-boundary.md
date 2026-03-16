# Slice 10b Mirror Detachment Boundary Contract

## Purpose

Define the exact dependency and deletion boundary for removing the last retained MoneyShyft route and service mirrors without widening into unrelated cleanup.

## Canonical Owners That Must Remain

- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/auth.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts`
- `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/tenantModuleEntitlements.ts`

## MoneyShyft Mirror Targets

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`

## Blocking Files That Must Be Reviewed

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`

## Allowed Mutations

- Rewrite a MoneyShyft test so it validates the canonical owner instead of a MoneyShyft mirror.
- Move still-legitimate assertions from a MoneyShyft mirror test into canonical admin or ConnectShyft tests.
- Delete a MoneyShyft mirror target only after all known direct and indirect blocker edges are resolved.
- Add exact file-level inventory rows when a broad inventory row is too coarse to capture proof.
- Update existing inventory rows to reflect deleted stale posture or retained exact blockers.

## Forbidden Mutations

- Deleting any target because it is merely unmounted or looks unused.
- Deleting any broad directory tree or glob family without exact file proof.
- Performing RouteShyft cleanup.
- Performing migration-runner cutover work.
- Redesigning auth, platform-admin, or ConnectShyft feature behavior.
- Introducing cross-lane feature imports to avoid finishing detachment proof.

## Deletion Preconditions

- A target file may be deleted only when every reviewed blocker edge pointing at it is resolved.
- A provider file must outlive every dependent file that still imports or path-references it.
- The final repo state must route surviving auth coverage through the canonical admin auth owner and surviving ConnectShyft coverage through the canonical ConnectShyft route owner.
- `architecture/LANE_INVENTORY.md` must be updated from the final post-delete state for every reviewed exact file.

## Required Final States

- Every target MoneyShyft mirror is either deleted or retained with an exact blocker named.
- Every reviewed blocker file is either deleted, rewritten, or retained with an exact blocker named.
- No deleted MoneyShyft mirror remains referenced by import, helper chain, or path-based contract evidence.
- No out-of-scope RouteShyft, migration-runner, or broad-cleanup changes are required to satisfy the contract.
