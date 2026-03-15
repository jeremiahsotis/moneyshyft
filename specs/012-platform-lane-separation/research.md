# Research: Platform Lane Separation and Canonical Authority Remediation

## Decision: Lock runtime authority from mounted entrypoints, not file existence

**Rationale**: The repo contains many mirrored trees that are not mounted. The correct remediation target must be based on live route registration and router mounts:
- `moneyshyft-api` still mounts admin, auth, ConnectShyft, RouteShyft, and Money routes from one app.
- `admin-api` mounts only platform/admin/auth routes.
- `connectshyft-api` mounts only `/api/v1/connectshyft`.
- `moneyshyft-web` still mounts admin pages and a RouteShyft page.
- `admin-web` and `connectshyft-web` already mount only their canonical surfaces.

**Alternatives considered**

- Use file presence as ownership evidence: rejected because `admin-api`, `admin-web`, and `connectshyft-api` contain large stale mirror trees that are not live entrypoints.

## Decision: Extract platform infrastructure into `libs/` before route or module relocation

**Rationale**: ConnectShyft and Admin convergence is blocked by app-local copies of platform envelopes, middleware, RBAC, tenancy, auth helpers, validators, and DB bootstrap code. Moving routes first would just re-create the same duplication in a new folder and risk hidden app-to-app imports.

**Alternatives considered**

- Move feature modules first and backfill shared code later: rejected because route/module relocation would either duplicate infrastructure again or force prohibited app-to-app feature imports.
- Move all duplicated code into `libs/`: rejected because the spec forbids using `libs/` to avoid feature ownership decisions.

## Decision: Normalize `domains/communication` and `infrastructure/communications` as shared-lib dependencies before final ConnectShyft boundary tightening

**Rationale**: `connectshyft-api` currently widens TypeScript compilation to include repo-root shared code directly. That is already shared in concept, but not yet normalized into a lane-safe shared boundary. Tightening ConnectShyft ownership without first normalizing this dependency would leave the canonical app dependent on special-case workspace reach-through.

**Alternatives considered**

- Leave root-level shared imports in place and proceed with route cutover: rejected because it preserves a non-canonical build boundary and weakens the final independent-build guarantee.

## Decision: Treat migration-runner cutover as a gated phase with a governance precondition

**Rationale**: The remediation spec requires migration execution isolation to `migration-runner`, but the current constitution still says `admin-api` owns production migrations. The correct plan is not to ignore the conflict; it is to make it explicit, keep it out of silent implementation drift, and require amendment or approved exception before Phase 3 execution.

**Alternatives considered**

- Keep `admin-api` as canonical migration runner forever: rejected because it contradicts the requested target state.
- Quietly cut production migration authority over during implementation: rejected because it would violate the constitution and hide a material operational change.

## Decision: Correct ConnectShyft route ownership before stale cleanup

**Rationale**: The highest runtime risk is that ConnectShyft behavior may still execute from MoneyShyft-owned paths. Runtime ingress must be corrected before duplicate cleanup so that parity can be verified against the canonical owner. Only after `connectshyft-api` is the sole live owner should divergent Money/Admin mirrors be shrunk or deleted.

**Alternatives considered**

- Delete MoneyShyft ConnectShyft trees early and rely on the existing `connectshyft-api` copy: rejected because the trees have diverged and the canonical copy contains newer behavior that still needs selective reconciliation.
- Clean admin stale mirrors first: rejected because it lowers repo noise but does not address the highest-risk live ownership issue.

## Decision: Repoint admin route ownership before ConnectShyft module relocation

**Rationale**: Admin/auth already have clear canonical owners in both API and web, and removing MoneyShyft-hosted admin entrypoints lowers ambiguity before the higher-risk ConnectShyft merge. This phase is safer because canonical Admin owners already exist and are already mounted.

**Alternatives considered**

- Move ConnectShyft first and leave MoneyShyft-hosted admin/auth entrypoints in place: rejected because it leaves dual ownership of core platform surfaces longer than necessary.

## Decision: Keep RouteShyft explicitly transitional in MoneyShyft surfaces

**Rationale**: RouteShyft is still mounted and backed by live schema/runtime behavior in MoneyShyft. The spec explicitly forbids silent removal. The safest approach is to inventory it, keep it live, mark non-Money mirrors as stale, and postpone extraction/removal until after lane convergence.

**Alternatives considered**

- Fold RouteShyft into `libs/` as a neutral temporary home: rejected because that would move feature business logic into shared space just to defer ownership.
- Remove RouteShyft while converging ConnectShyft/Admin: rejected because it exceeds scope and increases runtime risk.

## Decision: Verify builds in dependency order, not app alphabetically

**Rationale**: Shared libs and migration-runner are prerequisites, Admin owns auth/platform-admin dependencies, ConnectShyft is the highest-priority runtime correction, and MoneyShyft should be verified after the other lane boundaries are stable. This order surfaces dependency breakage earlier and matches the safe move order.

**Alternatives considered**

- Build every app after every patch in arbitrary order: rejected because it slows convergence and hides causal dependency failures.
