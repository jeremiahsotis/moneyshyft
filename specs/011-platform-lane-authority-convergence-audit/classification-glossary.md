# Classification Glossary

## Runtime Authority Precedence

Use evidence in this order when actual runtime authority and intent disagree:

1. Public ingress and host Nginx delegation
2. Mounted runtime surfaces and app/router registration
3. Build and packaging paths
4. Deployment runbooks and supporting contracts
5. Folder names or historical assumptions

## Surface Classification Values

| Value | Meaning |
| --- | --- |
| `canonical` | Actual runtime authority and intended authority align. |
| `mirrored_identical` | Duplicate implementations exist, but only one is authoritative and the shared files are materially identical. |
| `mirrored_diverged` | Duplicate implementations differ and more than one copy is still live or patch-relevant. |
| `dead_stale` | No runtime mount, build path, or current dependency remains. |
| `transitional` | Still live or dependency-bearing, but not the intended long-term authority. |
| `unknown` | Evidence remains insufficient after ingress, mount, imports, and packaging checks. |

## RouteShyft Classification Values

| Value | Meaning |
| --- | --- |
| `transitional_keep_for_now` | Still mounted, called, imported, or required by live behavior. |
| `safe_delete_after_convergence` | No live mounts or dependencies remain and a canonical replacement is confirmed. |
| `unknown_requires_followup` | Runtime or dependency status could not be verified from current evidence. |

## Remediation Recommendation Values

| Value | Meaning |
| --- | --- |
| `fix_now_before_feature_work` | Shared or foundational issue should be corrected before feature work proceeds. |
| `safe_to_patch_live_authority_now` | Fixes can safely land in the live authority immediately. |
| `converge_first` | Feature work should stop until authority is clarified or converged. |
| `documentation_only_for_now` | No production patch target should change yet; record state only. |

## Safe Patch Rules

- Patch the live canonical authority when actual runtime authority and intended authority align.
- For `mirrored_identical`, patch only the authority copy, not every mirror.
- For `mirrored_diverged`, default to `converge_first` unless the issue is explicitly scoped to one live host.
- For transitional RouteShyft artifacts, patch the live artifact only for narrowly scoped behavior and do not delete.

## Known Platform-Specific Decisions

- `admin-api` is canonical for `/api/v1/auth/*` and `/api/v1/platform/admin/*`.
- `shared/database/migrations` is canonical production migration authority.
- `admin-api` is the current production migration runner.
- `migration-runner` is implemented but not yet authoritative.
- ConnectShyft backend authority is split between `money-api` and `connect-api` when the change affects both live hosts.
- RouteShyft artifacts inside the money lane must stay classified explicitly; they are never assumed dead from location alone.
