# Two-Step Bootstrap Prompts - Platform Lane Authority and Convergence Audit

## Bootstrap Prompt A - discovery

```text
Build a platform-wide lane authority discovery map.

Read first:
- specs/platform-lane-authority-convergence-audit/spec.md
- architecture/platform/runtime-authority-audit-contract.md
- architecture/platform/convergence-classification-model.md
- architecture/platform/migration-authority-and-runner-audit-note.md
- architecture/platform/routeshyft-audit-note.md
- architecture/platform/non-goals-and-boundaries.md

Scope:
- money-api
- moneyshyft-web
- connect-api
- admin-api
- migration-runner

Also audit RouteShyft artifacts inside money-api and moneyshyft-web.

Identify:
1. actual runtime routes and serving surfaces
2. duplicated or mirrored modules/services
3. build/package paths
4. migration authority and runner paths
5. RouteShyft artifacts and current dependencies
6. likely canonical vs transitional areas

Constraints:
- do not modify code yet
- do not perform convergence remediation
- do not delete RouteShyft artifacts

Output:
- discovery map
- overlap map
- file/surface inventory
```

## Bootstrap Prompt B - classification and remediation design

```text
Design the classification and remediation-priority framework for the platform lane audit.

Read first:
- specs/platform-lane-authority-convergence-audit/spec.md
- architecture/platform/runtime-authority-audit-contract.md
- architecture/platform/convergence-classification-model.md
- architecture/platform/migration-authority-and-runner-audit-note.md
- architecture/platform/routeshyft-audit-note.md
- architecture/platform/non-goals-and-boundaries.md

Requirements:
- classify each subsystem as canonical, mirrored_identical, mirrored_diverged, dead_stale, transitional, or unknown
- include RouteShyft artifact classification
- explicitly identify where bug fixes can safely land now
- explicitly identify where convergence must happen first
- end in decisions, not vague observations

Output:
- classification model applied to repo surfaces
- remediation priority framework
- safe-delete candidate framework
- blocked areas
```
