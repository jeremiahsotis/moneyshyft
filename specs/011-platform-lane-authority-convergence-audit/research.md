# Phase 0 Research

## Decision: Treat runtime authority as an evidence stack, not a single signal

- Decision: Determine authority in this order: public ingress and deploy routing, mounted runtime surfaces, build/package path, then legacy contracts and feature docs.
- Rationale: The governing audit contract requires evidence-based authority. In this repo, folder names alone are misleading because mirrored code exists in multiple lanes.
- Alternatives considered:
  - Folder-name ownership only: rejected because `money-api` and `connect-api` both contain live ConnectShyft code.
  - Route-mount inspection only: rejected because public ingress still matters for deciding the safe patch target.

## Decision: Map requested lane labels to on-disk repo paths explicitly

- Decision: Use `money-api -> apps/moneyshyft-api` and `connect-api -> apps/connectshyft-api` throughout the planning artifacts.
- Rationale: Deployment contracts, server messages, and docs use `money-api`/`connect-api`, while the repo uses `moneyshyft-api`/`connectshyft-api`. The audit must normalize that mismatch up front to avoid ambiguous decisions.
- Alternatives considered:
  - Rewrite all planning docs to repo names only: rejected because deployment and runtime contracts still use `money-api` and `connect-api`.
  - Preserve both names without mapping: rejected because the resulting audit would remain ambiguous.

## Decision: Classify ConnectShyft backend authority as split and decision-blocking

- Decision: Treat ConnectShyft backend authority as `mirrored_diverged` whenever a change would affect both `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- Rationale: Deployment topology points connect ingress to `connect-api`, but the runtime-host contract still states current runtime lives under `money-api`. Both codepaths are mounted and differ materially. That is not a dead mirror; it is unresolved live duplication.
- Alternatives considered:
  - Declare `connect-api` canonical immediately: rejected because the legacy runtime-host contract and mounted money host remain active evidence.
  - Declare `money-api` canonical immediately: rejected because public connect ingress and current connect-lane app wiring point to `connect-api`.

## Decision: Treat admin/auth as canonical in admin-api even when mirrored elsewhere

- Decision: Classify `admin-api` auth and platform-admin routes as `canonical` and classify embedded money-lane/admin-lane mirrors as non-authoritative.
- Rationale: Public ingress, delegation contracts, and `admin-api` route registration all align on `admin-api` as the active auth and platform-admin authority.
- Alternatives considered:
  - Keep money-lane mirrors equally authoritative: rejected because nginx delegation and admin-web topology already define a single authority.

## Decision: Treat shared migrations as canonical authority and admin-api as current runner

- Decision: Classify `shared/database/migrations` as canonical production migration authority, `admin-api` as the current authorized production runner, and `migration-runner` as implemented but transitional.
- Rationale: Shared migration convergence docs explicitly moved production authority to `shared/database/migrations`, while deploy/runbook docs still require production execution from `admin-api`. `migration-runner` is validated for later cutover only.
- Alternatives considered:
  - Keep lane-local migration trees authoritative: rejected because shared authority and reconciliation tooling already supersede them for production.
  - Treat `migration-runner` as active runner now: rejected because no deploy contract authorizes the cutover yet.

## Decision: RouteShyft artifacts are removable only after dependency and authority convergence

- Decision: A RouteShyft artifact can be marked `safe_delete_after_convergence` only if it has no live route mount, no frontend entry, no active dependencies, and a confirmed canonical replacement.
- Rationale: The RouteShyft audit note requires explicit classification and removal recommendations. Current RouteShyft backend and frontend artifacts remain live in the money lane.
- Alternatives considered:
  - Mark embedded RouteShyft code as stale because it is transitional: rejected because the route and page are still mounted.
  - Defer all deletion judgments as unknown: rejected because the audit must end in decisions.

## Decision: Safe bug-fix locations must track live authority, not code similarity

- Decision: Safe patch targets are the canonical live authorities plus narrowly scoped live transitional hosts for legacy-only issues.
- Rationale: Large mirrored-identical and mirrored-diverged trees exist. Fixes landing in non-authoritative mirrors create drift without protecting production behavior.
- Alternatives considered:
  - Patch every mirrored copy: rejected because that is remediation, not audit, and it increases coordination risk.
  - Patch whichever copy is easiest to reach: rejected because the audit is specifically intended to eliminate unsafe patch ambiguity.
