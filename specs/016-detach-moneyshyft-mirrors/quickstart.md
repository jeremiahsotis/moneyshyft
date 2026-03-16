# Quickstart: Slice 10b Execution and Verification

## Goal

Remove the final retained MoneyShyft route and service mirrors only after every direct and indirect blocker is resolved with explicit proof.

## Execution Order

1. Reconfirm inventory rows for:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
2. Run pre-change reference scans for each target and blocker.
3. Close the auth mirror track:
   - repoint `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`
   - repoint `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`
   - delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
4. Confirm `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` has no hidden importer and delete it.
5. Review the five provider-registry tests, move any surviving assertions to canonical ConnectShyft coverage, delete the stale MoneyShyft tests, then delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`.
6. Review `connectshyft.neighbors.test.ts` and `connectshyft.identity-match.test.ts`, move any surviving assertions to canonical ConnectShyft coverage, then delete the MoneyShyft mirror tests.
7. Review `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`, move any surviving assertions to canonical admin coverage, then delete the MoneyShyft mirror service test.
8. Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`.
9. Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`.
10. Update `architecture/LANE_INVENTORY.md` for every reviewed exact file.

## Verification Order

1. Post-edit repo scan confirms no deleted MoneyShyft mirror remains referenced.
2. Build:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api`
   - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api` if auth or admin canonical coverage changed
3. Run the updated canonical auth envelope/contract coverage.
4. Run the updated canonical ConnectShyft provider-registry coverage.
5. Run the updated canonical ConnectShyft neighbors coverage.
6. Run the updated canonical ConnectShyft identity-match coverage.
7. Run the updated canonical admin `PlatformAdminService` coverage if assertions moved there.
8. Confirm `architecture/LANE_INVENTORY.md` matches the final state exactly.

## Expected Outcomes

- The final retained MoneyShyft auth, ConnectShyft, platform-admin-console, and service mirrors are removed if and only if their blocker chains are fully resolved.
- MoneyShyft-only mirror tests and helpers are removed once their surviving assertions are either moved to canonical owners or proven stale.
- Canonical route and service owners remain unchanged.
- No RouteShyft, migration-runner, or broad directory cleanup work is pulled into the slice.

## File-By-File Stop Conditions

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`: retained, but it must not mount or import the MoneyShyft auth router again.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`: retained, but its auth-path contract evidence must continue to point at `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/auth.ts`.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`: deleted after the MoneyShyft envelope test and platform-contracts path probe stop anchoring it.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`: deleted after repo scans confirm no hidden importer remains.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`: deleted after equivalent assertions exist under `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`: deleted after its surviving route-level guardrail assertions moved to `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts` and its DB-backed number-mapping case was dropped in favor of canonical module coverage.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts`: deleted after proof showed canonical module tests already cover its correlation-resolution behavior.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts`: deleted after proof showed canonical module tests already cover its ambiguity and not-found correlation behavior.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts`: deleted after proof showed canonical module tests already cover its replay suppression behavior.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`: deleted after the canonical provider-registry entrypoint retained only the surviving dispatch and guardrail route assertions.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`: deleted after no provider-registry test imports it from MoneyShyft.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`: deleted after proof showed it asserted stale `prefersTexting` passthrough behavior that the canonical ConnectShyft route no longer exposes.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`: deleted after equivalent assertions exist under `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`: deleted after proof confirms it is duplicate coverage of `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts`.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`: deleted after the MoneyShyft-only route-test cluster moves to canonical ConnectShyft test files.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`: deleted after the stale route mirror and duplicate MoneyShyft service test are removed.

## Stop Here

Stop if any reviewed file still has an unresolved blocker that cannot be closed inside the exact target and blocker list for this slice. Record the blocker in `architecture/LANE_INVENTORY.md` and do not widen scope.
