# Convergence Classification Model

Status: Governing model

Each overlapping subsystem must be classified as one of:

- `canonical`
- `mirrored_identical`
- `mirrored_diverged`
- `dead_stale`
- `transitional`
- `unknown`

Each subsystem must also receive:
- actual runtime authority
- intended authority
- remediation recommendation

## Remediation recommendation values
- `fix_now_before_feature_work`
- `safe_to_patch_live_authority_now`
- `converge_first`
- `documentation_only_for_now`

## RouteShyft rule
RouteShyft artifacts embedded in money-api or moneyshyft-web must receive one of:
- `transitional_keep_for_now`
- `safe_delete_after_convergence`
- `unknown_requires_followup`
