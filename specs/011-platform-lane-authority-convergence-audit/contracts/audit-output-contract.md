# Audit Output Contract

## Purpose

Define the minimum contract for a decision-grade platform lane authority audit so future planning, remediation, and bug-fix work can consume the same fields consistently.

## Required Record Shape

Each classified subsystem entry must include:

- `surfaceKey`
- `scopeLabel`
- `repoPaths`
- `actualRuntimeAuthority`
- `intendedAuthority`
- `classification`
- `runtimeStatus`
- `safePatchLocation`
- `remediationRecommendation`
- `evidence`
- `decision`

## Allowed Classification Values

- `canonical`
- `mirrored_identical`
- `mirrored_diverged`
- `dead_stale`
- `transitional`
- `unknown`

## Allowed Remediation Recommendation Values

- `fix_now_before_feature_work`
- `safe_to_patch_live_authority_now`
- `converge_first`
- `documentation_only_for_now`

## Decision Rules

- `canonical`
  - Use when actual runtime authority and intended authority align.
  - Must name a single safe patch target.
- `mirrored_identical`
  - Use when duplicate copies exist and are materially identical, but only one is authoritative.
  - Safe patch target must still identify the authority copy.
- `mirrored_diverged`
  - Use when duplicate copies differ and more than one copy is live or patch-relevant.
  - If divergence affects cross-surface behavior, recommendation defaults to `converge_first`.
- `dead_stale`
  - Use only when no runtime mount, build path, or current dependency remains.
- `transitional`
  - Use when the surface is still live or dependency-bearing but is not the intended long-term authority.
- `unknown`
  - Use only when evidence is insufficient after checking ingress, runtime mount, imports, and packaging.

## Safe Patch Contract

- Every entry must state where fixes can land safely now.
- Allowed safe patch statements:
  - concrete repo path
  - `do not patch here; patch canonical authority`
  - `legacy-only patch allowed for explicitly scoped host behavior`
- A record must never say both `safe_to_patch_live_authority_now` and `converge_first`.

## Blocked Area Contract

A blocked area record must include:

- `affectedSubsystem`
- `whyBlocked`
- `conflictingAuthorities`
- `requiredDecisionBeforeFix`
- `allowedInterimPatchScope`

Blocked areas must be actionable and specific enough to stop unsafe feature work.
