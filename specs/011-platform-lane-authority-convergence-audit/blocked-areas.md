# Blocked Areas

## Blocked Areas Requiring Convergence Before Feature Fixes

| Affected subsystem | Why blocked | Conflicting authorities | Required decision before fix | Allowed interim patch scope |
| --- | --- | --- | --- | --- |
| Cross-host ConnectShyft backend behavior | Both `money-api` and `connect-api` host live ConnectShyft behavior and the files diverge materially | Public connect ingress points to `connect-api`; runtime-host contract still names `money-api` | Resolve or narrow backend authority for shared ConnectShyft behavior | Patch only the explicitly failing live host if the issue is host-local |
| Money-hosted auth and platform-admin mirrors | Public ingress delegates away from money lane, but mirrored routes remain mounted and shipped there | `money-api` mounted mirrors vs `admin-api` public authority | Confirm mirrors are non-authoritative for feature work | Patch `admin-api` for shared auth/admin fixes |
| Money-web embedded admin UI | Canonical admin UI is `admin-web`, but money lane still mounts admin pages | `moneyshyft-web` alternate entry vs `admin-web` shell authority | Decide whether money-lane admin entrypoints remain supported or only transitional | Patch only mirror-specific regressions in money web |
| RouteShyft removal or relocation | RouteShyft remains mounted in backend and frontend money-lane surfaces | Transitional RouteShyft paths vs future converged replacement | Define a canonical replacement and remove live dependencies first | Patch the live money-lane RouteShyft artifact only when necessary |
| Lane-local-only migration changes | Shared authority is canonical, but lane-local trees remain present and can attract incorrect edits | Shared migration authority vs lane-local mirror trees | Route schema work through shared authority first | Shared migration edits only, plus current runner packaging if needed |

## Blocker Decisions

- Cross-host ConnectShyft backend work is the main convergence-first blocker.
- Money-hosted admin/auth mirrors are not valid primary patch targets.
- RouteShyft can be patched surgically where live, but it cannot be removed or relocated in ordinary feature work.
