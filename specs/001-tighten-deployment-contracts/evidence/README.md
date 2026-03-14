# Evidence Index: Spec 001 Deployment Tightening

## Purpose

This index consolidates the acceptance evidence artifacts for
`001-tighten-deployment-contracts` and maps each artifact to its verification
scope.

## Evidence Artifacts

| Artifact | File path | Purpose | Verification scope |
|---|---|---|---|
| Routing verification matrix | `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/routing-verification-matrix.md` | Defines executable routing probes and pass criteria for delegated and lane-local ownership. | Domain/path routing delegation for admin, money, and connect lanes; upstream ownership checks (`admin_api`, `money_api`, `connect_api`). |
| Database authority verification | `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/database-authority-verification.md` | Verifies shared database governance and migration authority boundaries. | Shared Postgres authority model, admin-only migration/seed ownership, lane API shared DB connectivity contract. |
| Security boundary verification | `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/security-boundary-verification.md` | Verifies ingress boundary and port exposure controls. | Nginx-only public ingress, localhost-only API bindings, non-public Postgres/API exposure, no direct API ingress bypass. |
| Runbook reproducibility evidence | `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/runbook-reproducibility.md` | Captures execution template and acceptance evidence mapping for deterministic deploy/redeploy. | End-to-end reproducibility of three-lane deployment flow, rerun determinism, and operator execution record consistency. |
| Final validation report | `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/final-validation-report.md` | Summarizes final quickstart validation outcomes across deployment, routing, DB authority, and security boundaries. | Consolidated pass/fail outcome summary aligned to quickstart and acceptance contract checks for release readiness. |

## Usage

Use this index as the entry point for release-readiness review and acceptance
traceability from the feature spec to executable evidence artifacts.
