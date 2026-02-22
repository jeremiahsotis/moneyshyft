---
stepsCompleted: ['step-01-detect-mode','step-02-load-context','step-03-risk-and-testability','step-04-coverage-plan','step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-22'
---

# Test Design Workflow Progress

## Mode
- Epic-Level Mode

## Scope
- Target: Shyft Epic 1 (`Platform Kernel and Tenant Access Foundations`)
- User input: `testarch-test-design epic 1`

## Inputs Loaded
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md`
- Knowledge fragments: adr-quality-readiness-checklist, risk-governance, probability-impact, test-levels-framework, test-priorities-matrix, test-quality

## Step 1 Output - Detect Mode & Prerequisites
- User intent explicitly requested epic scope (`epic 1`), so **Epic-Level Mode** was selected.
- Prerequisites validated from project artifacts:
  - Epic and acceptance criteria: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md`
  - Story artifacts: `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-1-tenant-context-resolution-and-isolation-guardrails.md` through `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-6-security-controls-and-redaction-verification.md`
  - Architecture context: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md`
  - PRD context: `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md`
- Ambiguity note: two Epic-1 tracks exist in planning artifacts (Shyft + ConnectShyft). This run was anchored to Shyft based on active sprint status in `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status.yaml` (`epic-1: in-progress`).

## Step 2 Output - Load Context & Knowledge Base
- Loaded config from `/Users/jeremiahotis/moneyshyft/_bmad/tea/config.yaml`:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
  - `test_artifacts: /Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts`
- Loaded epic-level artifacts:
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-1-tenant-context-resolution-and-isolation-guardrails.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-2-tenant-and-module-entitlement-administration.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-3-first-party-auth-sessions-and-csrf-enforcement.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-4-shared-response-envelope-and-refusal-helpers.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-5-policy-gate-and-branch-workflow-guard-enforcement.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-6-security-controls-and-redaction-verification.md`
- Prior system-level outputs detected (for context only):
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-architecture.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-qa.md`
- Existing test coverage scan summary:
  - Strong Epic 0 contract baseline in `tests/api/platform` and `src/src/platform/**/__tests__`.
  - Partial Epic 1 alignment already present in platform-admin/auth/csrf/rbac suites.
  - Gap: no dedicated Epic 1 story-aligned API/E2E suite group.
  - Deferred signal: multiple `test.skip` entries in platform E2E specs.
- Knowledge fragments loaded:
  - `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/risk-governance.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/probability-impact.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-levels-framework.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-priorities-matrix.md`
  - `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/playwright-cli.md`
- Browser exploration note:
  - `playwright-cli` unavailable in this environment (`NOT_INSTALLED`), so browser CLI exploration was skipped and replaced with code/doc evidence analysis.

## Step 3 Output - Testability & Risk Assessment
- System-level testability subsection was not applicable for this run (epic-level mode).
- Risk matrix (P x I) produced with category mapping (TECH/SEC/PERF/DATA/BUS/OPS).
- High-priority risks (score >=6):
  - R-001 tenant scope leakage from mixed scope columns
  - R-002 orgUnit privilege bypass risk
  - R-003 initial TENANT_ADMIN assignment regression risk
  - R-004 CSRF enforcement depth gap
  - R-005 shared envelope drift from ad-hoc responses
  - R-006 redaction coverage gap for logs/events
  - R-008 missing dedicated Epic 1 suite baseline
  - R-009 default secret fallback exposure risk
- Medium risk:
  - R-007 manual local workflow bypass risk for policy/branch guard commands
- Mitigation priority order set:
  1. tenant/orgUnit invariants
  2. security hardening depth
  3. API contract consistency + suite readiness
  4. governance guardrail enforcement

## Step 4 Output - Coverage Plan & Execution Strategy
- Coverage matrix created with atomic scenarios across Stories 1.1-1.6.
- Test levels assigned using framework guidance (API/Integration/Unit/E2E/CI-Contract) while minimizing duplicate coverage.
- Priority model applied:
  - P0: core + high-risk + no workaround
  - P1: critical/high operational coverage
  - P2: secondary and edge readiness checks
  - P3: exploratory hardening
- Execution strategy defined as simple PR / Nightly / Weekly:
  - PR: functional P0/P1 and fast P2
  - Nightly: expanded P2 and drift checks
  - Weekly: long-running diagnostics and exploratory validations
- Range-based estimates only:
  - P0: ~24-38 hours
  - P1: ~20-34 hours
  - P2: ~10-20 hours
  - P3: ~4-8 hours
  - Total: ~58-100 hours (~1.5-3 weeks)
- Quality gates set:
  - P0 pass rate = 100%
  - P1 pass rate >=95%
  - High-risk mitigations complete before release
  - Coverage target >=80%

## Step 5 Output - Generate Outputs & Validate
- Epic-level output generated:
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-epic-1.md`
- Validation applied against workflow checklist:
  - Risk matrix complete with IDs/categories/P-I-score/owner/timeline
  - Coverage plan includes P0-P3 with level and risk linkage
  - Execution strategy uses PR/Nightly/Weekly simplicity
  - Estimates remain interval-based (no false precision)
  - Quality gates explicit (P0=100, P1>=95, >=80% coverage target)
  - Accountability/logistics sections present (not-in-scope, entry/exit criteria, interworking)
- Browser session hygiene:
  - No CLI sessions created in this run (`playwright-cli` not installed), so no orphan cleanup required.
- Artifact location hygiene:
  - Outputs stored under `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/`.

## Key Risk/Gate Summary
- High risks: active-thread concurrency, escalation determinism, webhook spoof/replay, module coupling, claim-only reset drift, tenant-wide identity side effects.
- Gate thresholds: P0 pass rate 100%, P1 >=95%, high-risk mitigations complete before release, planned automated coverage target >=80%.
- Parallel safety gates: policy check first, import-boundary lint enforced, RouteShyft regression lane required on ConnectShyft PRs.

## Completion Summary
- Mode used: **Epic-Level**
- Status: Complete
- Final output:
  - `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-epic-1.md`
- Open assumptions:
  - Sprint status remains authoritative for Epic 1 story readiness.
  - Security redaction policy details are finalized before Story 1.6 sign-off.
  - Sprint 0 blockers B-001 through B-005 are delivered before P0 implementation begins.
  - Twilio test credentials and signature secrets are available in staging for webhook integrity testing.
  - Feature flags remain default OFF in production until pilot readiness criteria are met.

## 2026-02-22 Run - Step 1 Output - Detect Mode & Prerequisites
- Mode selected: **Epic-Level Mode**.
- Selection reason: user intent explicitly targeted `td ConnectShyft Epic A`, which maps to epic-focused planning.
- Epic-level prerequisite check passed:
  - Epic/story requirements with acceptance criteria found in `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/a-1-connectshyft-feature-flag-and-availability-guardrails.md` through `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/a-5-capability-based-route-access-and-envelope-contract-compliance.md`.
  - Epic scope source found in `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`.
  - Architecture context available in `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`.
  - PRD context available in `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`.
- No blocker found for step progression.

## 2026-02-22 Run - Step 2 Output - Load Context & Knowledge Base
- Loaded config from `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/config.yaml`:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
  - `test_artifacts: /Users/jeremiahotis/projects/connectshyft/_bmad-output/test-artifacts`
- Loaded epic-level source artifacts:
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/a-1-connectshyft-feature-flag-and-availability-guardrails.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/a-3-orgunit-number-mapping-management.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/a-4-escalation-baseline-and-recipient-configuration.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/a-5-capability-based-route-access-and-envelope-contract-compliance.md`
- Loaded prior system-level test design artifacts (context only):
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/test-artifacts/test-design-architecture.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/test-artifacts/test-design-qa.md`
- Existing coverage scan summary:
  - Current automated suites are concentrated under `tests/api/platform/` and `tests/e2e/platform/` for platform/epic-1 foundations.
  - No existing ConnectShyft Epic A-specific specs found yet (no `a-1`..`a-5` suites and no `connectshyft`-named API/E2E suites).
  - Reusable pattern baseline exists: `apiRequest` helper + fixture/factory composition under `tests/support/`.
- Browser exploration (auto mode) executed with Playwright CLI:
  - Session: `tea-explore`
  - Target: `http://127.0.0.1:3000/`
  - Snapshot result: API root only (`{"message":"MoneyShyft API - Family budgeting made simple"}`), no UI interaction surface discovered.
  - Screenshot evidence: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/test-artifacts/exploration/explore-api-root.png`
  - Session closed cleanly via `playwright-cli -s=tea-explore close`.
- Knowledge fragments loaded via index `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/tea-index.csv`:
  - `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/risk-governance.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/probability-impact.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/test-levels-framework.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/test-priorities-matrix.md`
  - `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/playwright-cli.md`
- Missing/limited context noted:
  - No live frontend target detected for browser UX exploration in this step.
  - ConnectShyft implementation modules are not yet present in the backend code tree; this run proceeds as design-first planning against story artifacts.

## 2026-02-22 Run - Step 3 Output - Risk Assessment (Epic-Level)
- System-level testability subsection is not applicable in this run because mode is **Epic-Level**.
- Risk matrix produced using the TEA probability/impact model (`score = probability x impact`, high risk threshold `>= 6`).

| Risk ID | Category | Risk Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | TECH | Feature-flag evaluation is implemented inconsistently across API/UI entry points, causing fail-open behavior for disabled ConnectShyft capabilities. | 2 | 3 | 6 | Centralize guard middleware and route/view gating; enforce fail-closed default and add OFF/partial-flag contract tests. | ConnectShyft Backend + Frontend | Sprint A.1 |
| R-002 | SEC | Tenant/orgUnit context enforcement gaps allow cross-tenant or cross-orgUnit data access on ConnectShyft routes. | 3 | 3 | 9 | Reuse platform tenancy guards at every endpoint and service boundary; add negative matrix tests for missing/spoofed context. | Platform Security + Backend | Sprint A.2 |
| R-003 | DATA | Number mapping uniqueness and validation drift causes ambiguous inbound routing or duplicate `(tenant_id, twilio_number_e164)` records. | 2 | 3 | 6 | Enforce DB uniqueness and service-level normalization for E.164; add create/update collision tests and deterministic refusal payload checks. | ConnectShyft Backend | Sprint A.3 |
| R-004 | OPS | Escalation baseline/recipient configuration accepts invalid values, breaking deterministic escalation behavior downstream. | 2 | 3 | 6 | Validate integer-hour baseline (`1-24`, default `24`) and required recipient set at API/service/UI; add refusal and persistence tests. | ConnectShyft Backend + Frontend | Sprint A.4 |
| R-005 | SEC | Capability checks are not consistently enforced across endpoint and service layers, allowing unauthorized operations. | 3 | 3 | 9 | Deny-by-default capability enforcement in route guards and service entry points; add role/capability matrix API tests. | Platform RBAC + ConnectShyft Backend | Sprint A.5 |
| R-006 | BUS | Response envelope drift (`success/refusal/systemError`) breaks client-side determinism and operator messaging consistency. | 2 | 2 | 4 | Route all ConnectShyft responses through shared envelope helpers; add response-shape compliance tests for success/refusal/systemError. | ConnectShyft Backend | Sprint A.5 |
| R-007 | OPS | No dedicated ConnectShyft Epic A automated suite exists yet, increasing regression escape probability as implementation starts. | 3 | 2 | 6 | Create story-aligned API/E2E suites (`a-1`..`a-5`) and enforce CI lane inclusion before rollout. | QA + Release Engineering | Sprint A.1-A.5 |
| R-008 | TECH | Module-boundary rules between ConnectShyft and RouteShyft are not enforced early, enabling coupling regressions. | 2 | 3 | 6 | Keep `policy:check` first blocker and add/verify import-boundary checks for route/connectshyft isolation in CI and local scripts. | Platform Architecture | Sprint A.0-A.1 |
| R-009 | BUS | Operator-facing refusal/unavailable copy diverges between API and UI, reducing operability and supportability. | 2 | 2 | 4 | Define shared refusal reason catalog and reuse across API + UI display states; add E2E assertion for user-visible copy parity. | Product + Frontend | Sprint A.1 |

- Highest risks (score 9): `R-002` (context leakage) and `R-005` (authorization bypass).
- High-priority risks (score >=6): `R-001`, `R-002`, `R-003`, `R-004`, `R-005`, `R-007`, `R-008`.
- Mitigation priority order:
  1. Security boundaries first: `R-002`, `R-005`
  2. Contract and routing integrity: `R-003`, `R-004`, `R-001`
  3. Delivery safety and detection: `R-008`, `R-007`
  4. Operator-quality consistency: `R-006`, `R-009`

## 2026-02-22 Run - Step 4 Output - Coverage Plan & Execution Strategy
- Priority note: **P0/P1/P2/P3 indicate risk/criticality, not execution timing**.
- Coverage design follows test-level selection guidance:
  - API/Integration for security, tenancy, and contract-critical behavior
  - E2E for operator-visible behavior and access messaging
  - Component/Unit for deterministic validation logic
  - CI-contract tests for boundary and workflow guard enforcement

### Coverage Matrix

| Test ID | Requirement / Scenario | Test Level | Priority | Risk Link | Notes |
| --- | --- | --- | --- | --- | --- |
| A-P0-001 | Missing orgUnit context on protected ConnectShyft routes returns deterministic refusal and no leakage (a.2 AC2). | API | P0 | R-002 | Core tenant/orgUnit boundary control. |
| A-P0-002 | Cross-tenant/cross-orgUnit spoof attempts are refused with secure envelope semantics (a.2 AC2). | API | P0 | R-002 | Negative authorization matrix. |
| A-P0-003 | Capability checks enforced at endpoint and service boundaries for unauthorized users (a.5 AC1). | API | P0 | R-005 | Deny-by-default enforcement path. |
| A-P0-004 | Module flag OFF state fail-closes backend routes (a.1 AC1). | API | P0 | R-001 | Kill-switch and unavailable behavior. |
| A-P0-005 | All response paths use `success/refusal/systemError` envelope shapes (a.5 AC2). | API | P0 | R-006 | Contract stability for clients. |
| A-P0-006 | Duplicate `(tenant_id, twilio_number_e164)` mapping attempts are blocked deterministically (a.3 AC2). | API/Integration | P0 | R-003 | DB constraint + service refusal parity. |
| A-P0-007 | Escalation baseline and recipients reject invalid values (`X` non-integer/out-of-range, missing recipients) (a.4 AC2). | API | P0 | R-004 | Prevents downstream scheduler drift. |
| A-P0-008 | Valid escalation config persists integer-hour baseline (`1-24`, default `24`) and recipients correctly (a.4 AC1). | API/Integration | P0 | R-004 | Deterministic config source of truth. |
| A-P1-001 | Partial sub-flag enablement shows only enabled capabilities with explicit operator messaging (a.1 AC2). | E2E | P1 | R-001, R-009 | UI/API behavior coherence. |
| A-P1-002 | Tenant-privileged role path succeeds where membership-limited path is refused (a.2 AC1). | API | P1 | R-002, R-005 | Privileged exception contract. |
| A-P1-003 | Multi-number mapping create/update/read-back works deterministically for one orgUnit (a.3 AC1). | API | P1 | R-003 | Supports deterministic inbound routing. |
| A-P1-004 | Number mapping admin UI validates E.164 and displays actionable duplicate/format errors (a.3 AC1/AC2). | Component/E2E | P1 | R-003, R-009 | Operator usability + policy correctness. |
| A-P1-005 | Escalation configuration UI enforces integer range and required recipient selections (a.4 AC1/AC2). | Component/E2E | P1 | R-004, R-009 | Human-operability guardrail. |
| A-P1-006 | Unauthorized UI actions map refusal reasons to clear operator copy without data exposure (a.5 AC1). | E2E | P1 | R-005, R-009 | End-user refusal coherence. |
| A-P1-007 | System error branch still emits shared envelope schema (a.5 AC2). | API | P1 | R-006 | Hardens error-path contract. |
| A-P1-008 | Audit metadata includes context provenance for capability-denied and scope-denied operations where required. | API/Integration | P1 | R-002, R-005 | Forensic and governance readiness. |
| A-P2-001 | Runtime sub-flag changes do not expose stale disabled actions across refresh/navigation boundaries. | E2E | P2 | R-001 | Secondary rollout hardening. |
| A-P2-002 | Phone normalization helper consistently canonicalizes E.164 before uniqueness checks. | Unit | P2 | R-003 | Prevents format-driven bypasses. |
| A-P2-003 | Recipient baseline validation helper normalizes/deduplicates recipients deterministically. | Unit | P2 | R-004 | Reduces config edge-case drift. |
| A-P2-004 | Capability matrix permutation checks for less-common role combinations. | API | P2 | R-005 | Broader authorization confidence. |
| A-P2-005 | CI import-boundary and workflow-guard checks enforce RouteShyft/ConnectShyft isolation rules. | CI Contract | P2 | R-008 | Parallel-delivery safeguard. |
| A-P3-001 | Fuzz/refusal contract exploratory tests on malformed admin payloads. | API Exploratory | P3 | R-006, R-009 | Optional resilience depth. |
| A-P3-002 | Long-run flag-toggle burn-in for availability guardrails under repeated transitions. | Integration Burn-in | P3 | R-001, R-007 | Optional confidence enhancement. |

### Execution Strategy (Simple)
- **PR lane**: Run all functional P0/P1 and fast P2 tests with Playwright parallelization (<15 minutes target).
- **Nightly lane**: Run extended P2 suites and exploratory API fuzz checks when runtime extends beyond PR budget.
- **Weekly lane**: Run long-duration burn-in scenarios and additional resilience drills.
- Avoid duplicate listings in lanes; lane membership references the coverage matrix IDs above.

### Resource Estimates (Ranges)
- P0 implementation effort: **~22-34 hours**
- P1 implementation effort: **~18-30 hours**
- P2 implementation effort: **~10-18 hours**
- P3 implementation effort: **~4-8 hours**
- Total effort: **~54-90 hours**
- Timeline estimate: **~1.5-3 weeks** (single QA engineer, assuming prerequisites available)

### Quality Gates
- P0 pass rate: **100%**
- P1 pass rate: **>=95%**
- High-risk mitigations complete (`R-001`, `R-002`, `R-003`, `R-004`, `R-005`, `R-007`, `R-008`) before release sign-off
- Planned automated coverage target: **>=80%** of matrix scenarios

## 2026-02-22 Run - Step 5 Output - Generate Outputs & Validate
- Mode used: **Epic-Level**
- Epic selected: **Epic A** (`Scoped Access and Operational Configuration`)
- Output generated:
  - `/Users/jeremiahotis/projects/connectshyft/_bmad-output/test-artifacts/test-design-epic-A.md`
- Validation summary:
  - Required sections present: risk assessment, coverage plan, execution strategy, estimates, quality gates.
  - Priority sections separate risk priority from execution timing (no execution schedule embedded in P0/P1/P2/P3 headers).
  - Execution strategy uses simplified **PR / Nightly / Weekly** model.
  - Estimates are interval-based only (no false precision).
  - Gate thresholds include `P0=100%`, `P1>=95%`, and coverage target `>=80%`.
  - Cross-check performed against official docs guidance:
    - Playwright parallelism and best practices (`playwright.dev/docs/test-parallel`, `playwright.dev/docs/best-practices`)
    - Cypress isolation guidance (`docs.cypress.io/app/core-concepts/test-isolation`)
    - Pact provider verification guidance (`docs.pact.io/getting_started/provider_verification`)
    - GitHub Actions workflow/job model (`docs.github.com/en/actions/concepts/workflows-and-actions/about-workflows`)
- Browser/session hygiene:
  - Playwright CLI session `tea-explore` closed via `playwright-cli -s=tea-explore close`.
  - Exploration screenshot saved to `/Users/jeremiahotis/projects/connectshyft/_bmad-output/test-artifacts/exploration/explore-api-root.png`.
  - Playwright snapshot/console artifacts relocated to `/Users/jeremiahotis/projects/connectshyft/_bmad-output/test-artifacts/exploration/playwright-cli-artifacts/`.
- Key risks and thresholds carried into final output:
  - Highest risks: `R-002` (context leakage), `R-005` (capability bypass).
  - Release gate: high-risk mitigations complete before sign-off.
- Open assumptions:
  - Epic A acceptance criteria remain stable during implementation.
  - Shared tenancy and envelope platform utilities remain authoritative contracts.
  - Story-aligned suite naming (`a-1`..`a-5`) is accepted for Epic A automation.
