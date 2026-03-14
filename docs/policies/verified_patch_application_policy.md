# Verified Patch Application Policy (RouteShyft)

This policy is mandatory for all patch intake in this repository.

## Purpose

Patch files are untrusted input until validated. Patches must never be applied blindly.

## Required Workflow

1. Classify incoming patch into a remediation class (`01`..`08`).
2. Run verified preflight checks with:
   - `bash scripts/verified-patch-apply.sh --patch <path> --class <class-id> --mode check`
3. If preflight passes and class is eligible for clean apply, run:
   - `bash scripts/verified-patch-apply.sh --patch <path> --class <class-id> --mode apply`
4. If class is not eligible for clean apply, follow remediation path (do not force blind apply).
5. Complete post-apply verification gates and capture outcomes in story artifacts.

## Required Preflight Checks

The verified pathway performs all of the following before apply:

1. Patch file existence and parse shape validation (diff/hunk detection).
2. Target existence checks for patched files/directories.
3. `git apply --check` dry-run with class-aware strip level.
4. JSON payload validation for shell payload lines inside patch hunks.

## Required Post-Apply Verification Gates

1. `git status --short` (change visibility)
2. `npm run policy:check` (policy and workflow guardrails)

Recommended additional gates when patch scope touches runtime code:

1. `npm run test`
2. `npm run build`

## Remediation Classes

- `apply-clean`: eligible for verified apply after preflight passes.
- `repair-stale`: patch intent is valid but hunks/content are stale; repair manually, then re-check.
- `rebuild-malformed`: patch file is malformed; rebuild from intent, then re-check.
- `defer-structural`: patch depends on repository structure that does not exist yet; defer until structure is ready.

## Patch-Class Handling Matrix

| Class | Classification | Verified Path Rules | Required Action |
| --- | --- | --- | --- |
| `01` | `apply-clean` | Must use strip normalization `-p4` | Apply through verified script only |
| `02` | `repair-stale` | Not eligible for direct apply | Repair against current files; re-run preflight |
| `03` | `rebuild-malformed` | Not eligible for direct apply | Rebuild from intent; generate clean patch; re-run preflight |
| `04` | `repair-stale` | Not eligible for direct apply | Repair against current files; re-run preflight |
| `05` | `defer-structural` | Blocked until target structure exists | Defer and track dependency |
| `06` | `defer-structural` | Blocked until target structure exists | Defer and track dependency |
| `07` | `apply-clean` | Standard strip level (`-p1` default) | Apply through verified script only |
| `08` | `repair-stale` | JSON payload must be valid before any eligibility | Fix malformed JSON quoting, then re-run preflight |

## Invalid JSON Patch Content Rule

Patch content that introduces malformed JSON payloads is blocked.

- Example failure pattern: shell payload lines like `-d '{"key": "value",}'` (invalid trailing comma).
- Required remediation: correct JSON payload content in the patch file, then re-run verified preflight.

## Enforcement Hooks

Patch governance is enforced in policy checks by:

1. `scripts/enforce-verified-patch-intake-guard.sh`
2. `scripts/enforce-git-policy.sh` (invokes the guard in `npm run policy:check`)

The guard blocks new ad hoc `git apply` usage outside the verified script pathway and provides remediation diagnostics.
