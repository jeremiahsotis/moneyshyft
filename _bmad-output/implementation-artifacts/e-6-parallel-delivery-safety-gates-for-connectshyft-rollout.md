# Story e.6: Parallel Delivery Safety Gates for ConnectShyft Rollout

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a release maintainer,
I want policy and regression gates enforced for ConnectShyft pull requests,
so that ConnectShyft can ship in parallel with RouteShyft without cross-module regressions.

## Acceptance Criteria

1. Given a ConnectShyft branch or pull request pipeline, when CI executes, then `npm run policy:check` runs as the first blocking gate.
2. Given ConnectShyft code changes introduce route/connectshyft direct import-boundary violations or provider-coupled bypass paths, when policy checks run, then CI blocks the change deterministically.
3. Given ConnectShyft pull requests are evaluated, when CI completes, then RouteShyft regression lanes and ConnectShyft-targeted quality gates both pass before merge.
4. Given rollout controls are evaluated for production enablement, when release criteria are applied, then feature-flag/allow-list controls and explicit rollback path documentation remain current and testable.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Release gates are operator safety controls; failures must be explicit, actionable, and prevent unsafe merges.
- Real-User Validation Evidence: Validated via Story e.6 ATDD/API/E2E policy-gate assertions plus rollout/rollback contract checks on 2026-03-04.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story governs CI/release controls, not role-admin capabilities.

## Tasks / Subtasks

- [x] Enforce policy gate as first blocking stage (AC: 1)
  - [x] Confirm `npm run policy:check` is first required CI job in workflow definitions.
  - [x] Fail pipeline immediately on policy gate failure.
- [x] Enforce module boundary and provider-abstraction guardrails (AC: 2)
  - [x] Block direct `modules/route` <-> `modules/connectshyft` boundary violations.
  - [x] Block ConnectShyft provider-coupled bypass paths outside approved adapter contracts.
- [x] Enforce regression and quality gate completion before merge (AC: 3)
  - [x] Require ConnectShyft targeted tests and RouteShyft regression lane completion.
  - [x] Verify quality gate thresholds and report-stage aggregation are present.
- [x] Codify rollout + rollback operational controls (AC: 4)
  - [x] Keep feature-flag/allow-list rollout controls explicit and verified.
  - [x] Ensure rollback path documentation is current and referenced by release workflow.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-021, FR-CS-021a.
- NFR alignment: NFR-CS-001, NFR-CS-004, NFR-CS-010.
- Story dependencies:
  - `a-5-capability-based-route-access-and-envelope-contract-compliance`
  - `e-1-verified-webhook-ingress-and-deterministic-context-routing`
  - `e-5-replay-safe-webhook-receipt-ledger-and-retention-controls`
  - `f-4-telnyx-adapter-implementation-and-cutover-guardrails`

### Architecture Compliance

- Align CI controls with mandatory architecture acceptance checklist and module-boundary policy.
- Preserve cross-lane safety for parallel ConnectShyft and RouteShyft delivery.
- Keep rollout and rollback controls auditable and deterministic.

### Library / Framework Requirements

- Reuse existing policy scripts and CI workflow scaffolding; extend rather than fork.
- Reuse story hygiene and quality-gate scripts already established in repo workflow.
- Avoid ad-hoc lane-specific CI logic that duplicates existing gate behavior.

### File Structure Requirements

- CI workflow definitions under `.github/workflows/`.
- Policy gate scripts under `scripts/` and root npm task mappings.
- Quality gate and regression orchestration scripts under `scripts/` and test framework configs.
- Story and release tracking in `_bmad-output/implementation-artifacts/` and planning artifacts.

### Testing Requirements

- Validate policy gate ordering and required status checks in CI.
- Validate boundary/provider guard scripts fail on intentional violation fixtures.
- Validate RouteShyft regression lane is required for ConnectShyft PR completion.
- Validate rollout/rollback documentation references and feature-flag checks are present.

### Previous Story Intelligence

- `f.4` introduced provider cutover guardrails and anti-Twilio-coupling checks that this story formalizes as release gates.
- Existing CI policy requirements in repository guidance define blocking order and quality gate expectations.

### Git Intelligence Summary

- Recent commits and merges show policy and contract hardening work; this story operationalizes that rigor as enforceable merge criteria.

### Latest Technical Information

- Use current repository policy docs and CI scripts as authoritative source for gate ordering and threshold requirements.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep CI gate definitions centralized and deterministic to avoid drift across workflows.
- Treat policy-first ordering as immutable unless explicitly re-approved via correct-course.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story e-6-parallel-delivery-safety-gates-for-connectshyft-rollout`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic e, Story e.6)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (mandatory CI gates, testing strategy)
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md` (Epic E/F impact and migration strategy)
- `docs/policies/git_policy.md`
- `scripts/enforce-connectshyft-provider-abstraction-guard.sh`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n -i "epic\\s*e|e-6-" _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (pass)
- `rg -n "NFR-CS-001|NFR-CS-004|NFR-CS-010" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (pass)
- `rg -n "policy:check|webhook ingestion budgets|mandatory CI gates|module boundary" _bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md docs/policies/git_policy.md` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story e-6-parallel-delivery-safety-gates-for-connectshyft-rollout` (pass)
- `npm run story:status:set -- --story-file _bmad-output/implementation-artifacts/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.md --status in-progress --lane connectshyft` (pass)
- `npx playwright test tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts` (pass)
- `npm run test:e2e -- tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts` (pass)
- `npx playwright test tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts tests/e2e/platform/ci-policy-gate-as-blocking-first-stage.spec.ts` (pass)
- `tmpdir=$(mktemp -d /tmp/e6guardtest.XXXXXX) ... /scripts/enforce-connectshyft-provider-abstraction-guard.sh` (pass)
- `npm run policy:check` (pass)
- `bash scripts/lint-or-discovery.sh` (pass)

### Completion Notes List

- Created implementation-ready Story e.6 context document with policy-first CI gates, boundary enforcement, and release safety guardrails.
- Activated Story e.6 ATDD coverage by converting API/E2E tests from `test.skip` to executable tests and validated green.
- Added blocking `burn-in` stage to `.github/workflows/test.yml` between `test` and `quality-gates`, and updated release-readiness aggregation to block on burn-in failures.
- Extended `scripts/enforce-connectshyft-provider-abstraction-guard.sh` to fail deterministically on direct `modules/route` <-> `modules/connectshyft` cross-module import-boundary violations while retaining Twilio-coupling guard enforcement.
- Verified rollout allow-list + rollback reference contracts remain explicit via passing Story e.6 ATDD assertions.
- Renamed CI burn-in check contexts to avoid ambiguity across split workflows (`ci-burn-in` vs `scheduled-burn-in`) and aligned policy documentation with required check naming.
- Hardened burn-in execution to require real test execution via `BURN_IN_REQUIRE_TESTS` and deterministic fallback spec suite when no changed specs are detected.
- Added dynamic-import boundary violation coverage and guard detection so `import('../route/...')`/`import('../connectshyft/...')` bypasses now fail policy checks deterministically.

### File List

- .github/workflows/burn-in.yml
- .github/workflows/test.yml
- docs/policies/git_policy.md
- scripts/enforce-connectshyft-provider-abstraction-guard.sh
- scripts/test-changed.sh
- tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts
- tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.automate.api.spec.ts
- tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts
- tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.automate.spec.ts
- tests/e2e/platform/ci-policy-gate-as-blocking-first-stage.spec.ts
- tests/support/factories/connectShyftStoryE6Factory.ts
- tests/support/fixtures/connectShyftStoryE6.fixture.ts
- tests/support/utils/workflowGraphParser.ts
- _bmad-output/implementation-artifacts/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.md

## Change Log

- 2026-03-03: Created Story e.6 ready-for-dev context document.
- 2026-03-04: Implemented CI burn-in merge blocking, module boundary/provider guard hardening, and activated Story e.6 ATDD coverage.
- 2026-03-04: Resolved code-review findings by disambiguating burn-in check contexts, enforcing non-empty burn-in execution with fallback specs, and hardening boundary guard coverage for dynamic imports.
