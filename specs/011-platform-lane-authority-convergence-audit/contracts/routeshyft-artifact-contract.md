# RouteShyft Artifact Contract

## Purpose

Define the classification contract for RouteShyft artifacts embedded inside `money-api` and `moneyshyft-web`.

## Required Record Shape

Each RouteShyft artifact record must include:

- `artifactKey`
- `repoPath`
- `artifactType`
- `actualRuntimeStatus`
- `dependencyStatus`
- `classification`
- `removalGate`
- `safePatchLocation`
- `evidence`
- `decision`

## Allowed Classification Values

- `transitional_keep_for_now`
- `safe_delete_after_convergence`
- `unknown_requires_followup`

## Classification Rules

- `transitional_keep_for_now`
  - Use when the artifact is still mounted, still called, still imported, or still required by live schema/runtime behavior.
  - Safe patching is allowed only for the live artifact itself; deletion is not allowed.
- `safe_delete_after_convergence`
  - Use only when the artifact has no live mounts, no active callers, no build/package dependency, and a confirmed canonical replacement.
  - The removal gate must name the completed convergence conditions.
- `unknown_requires_followup`
  - Use only when dependency or runtime status cannot be verified from current evidence.

## Removal Gate Rules

An artifact may be recommended for later deletion only if all of the following are true:

1. No runtime route mount remains.
2. No frontend route or direct service dependency remains.
3. No build, packaging, or test harness depends on the artifact for live behavior verification.
4. A canonical replacement has already been identified and is the only approved patch target.

## Safe Patch Rules

- If the artifact is live, the contract must explicitly say that fixes land in the live host only.
- If the artifact is non-authoritative, the contract must explicitly say to patch the canonical authority instead.
