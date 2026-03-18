# Spec - Platform Lane Authority and Convergence Audit

Status: Ready for SpecKit

## Governing contracts
- `architecture/platform/runtime-authority-audit-contract.md`
- `architecture/platform/convergence-classification-model.md`
- `architecture/platform/migration-authority-and-runner-audit-note.md`
- `architecture/platform/routeshyft-audit-note.md`
- `architecture/platform/non-goals-and-boundaries.md`

## Supporting files required
- `specs/platform-lane-authority-convergence-audit/bootstrap-prompts.md`
- `specs/platform-lane-authority-convergence-audit/implementation-checklist.md`
- `.github/pull_request_template/platform-lane-authority-convergence-audit.md`

## Problem statement
There is unresolved ambiguity across platform lanes and execution surfaces about:
- what is actually live
- what is intended to be canonical
- what is duplicated or diverged
- where bug fixes should land safely
- what RouteShyft artifacts inside money-api and moneyshyft-web are transitional and removable later

## Scope
In scope:
- money-api
- moneyshyft-web
- connect-api
- admin-api
- migration-runner
- RouteShyft artifacts embedded in money-api and moneyshyft-web
- runtime routes
- module/service overlap
- validators
- scripts
- packaging/build logic
- migration execution authority

Out of scope:
- performing convergence remediation
- deleting code
- changing runtime authority
- fixing feature bugs directly

## Required outputs
1. runtime authority map
2. duplication/divergence map
3. intended-vs-actual authority map
4. remediation priority map
5. safe-delete candidate list
6. blocked areas requiring convergence before feature fixes
7. RouteShyft artifact classification list

## Acceptance criteria
- every covered surface is classified
- RouteShyft artifacts in money-api and moneyshyft-web are explicitly classified
- migration authority and runner relationship is explicitly mapped
- audit ends in decisions, not vague observations
