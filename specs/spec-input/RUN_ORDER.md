# ShyftUnity SpecKit Run Order

This file tracks the execution order and status of all SpecKit packages in `/spec-input`.

Update this file as packages move from planned → running → spec-complete → implementation-started → implemented.

---

# Package Execution Order

| Order | Package | Purpose | Status | Owner | Spec Output | Testing Obligations | CI Impact | Notes |
|------|--------|--------|--------|------|-------------|---------------------|-----------|------|
| 00 | Testing + CI Architecture | Shared testing spine, contract validation, integration harness, CI split | planned | | | shared Vitest, contract harness, backend integration harness, feature-flag helpers | repo-guard, affected-quality, affected-integration, contract-tests, frontend-smoke, release-validation, nightly-burn-in | Build before MoneyShyft PWA so the rest of the roadmap lands on consistent quality rails |
| 01 | MoneyShyft PWA | Installable budgeting app and PWA foundation | planned | | | PWA/mobile helpers, smoke path, state persistence tests | affected-quality, frontend-smoke, release-validation | Live-user retention priority |
| 02 | ConnectShyft Omnichannel + Triage | Intake layer for phone, SMS, MMS, email, webchat, and website forms | planned | | | channel/triage fixtures, contract tests, integration tests, selective smoke | affected-quality, affected-integration, contract-tests, frontend-smoke, release-validation, nightly-burn-in | High operational pain, regression-sensitive |
| 03 | PeopleCore + Identity Resolution | Person, household, address, relationship, identity clustering | planned | | | PeopleCore fixtures, identity contract tests, integration coverage | affected-quality, affected-integration, contract-tests, release-validation | Foundation for subject linkage |
| 04 | CaseShyft MVP | Case workspace and durable operational case flow | planned | | | case fixtures, triage-to-case tests, communication linkage coverage | affected-quality, affected-integration, contract-tests, frontend-smoke, release-validation, nightly-burn-in | First durable operational workspace |
| 05 | Documents + Evidence | Document management, evidence reuse, verification foundation | planned | | | document/evidence fixtures, upload/verify/reuse tests | affected-quality, affected-integration, contract-tests, release-validation, nightly-burn-in | Preserve Document vs Evidence boundary |
| 06 | Eligibility Engine | Shared rules engine using evidence/doc-backed support | planned | | | policy/screening fixtures, override tests, explanation tests | affected-quality, affected-integration, contract-tests, release-validation | Good future mutation-testing candidate |
| 07 | ResourceShyft | Service discovery, availability, requirements visibility | planned | | | resource/search fixtures, availability/ranking tests, smoke path | affected-quality, affected-integration, contract-tests, frontend-smoke, release-validation | Open-now and freshness logic matter |
| 08 | ProgramShyft MVP | Program operations, enrollment, attendance, milestones | planned | | | program/session/cohort fixtures, enrollment/attendance tests | affected-quality, affected-integration, contract-tests, frontend-smoke, release-validation | Structured program operations |
| 09 | FinanceCore v1 | Commitments, disbursements, collaborative funding, vouchers | planned | | | finance fixtures, voucher/commitment tests, hook contracts | affected-quality, affected-integration, contract-tests, release-validation | Workflow finance only, not accounting |
| 10 | Future Module Hooks | Stable extension seams for ThriftShyft, RouteShyft, CapacityShyft, DonorShyft | planned | | | hook factories/helpers, contract tests | contract-tests, affected-integration, release-validation | Contract stability over speculative logic |

---

# Status Definitions

| Status | Meaning |
|------|------|
| planned | Package exists but SpecKit not run yet |
| running | SpecKit generation currently in progress |
| spec-complete | SpecKit spec + tasks + PR slices generated |
| implementation-started | Engineering work underway |
| implemented | Feature merged and operational |

---

# SpecKit Output Locations

Each package folder should contain the generated outputs:

```text
08-speckit-spec.md
09-speckit-task-plan.md
10-speckit-pr-slices.md
11-speckit-followups.md
12-implementation-notes.md
```

---

# Running SpecKit

For each package:

1. Attach `_shared/`
2. Attach the numbered package folder
3. Run Bootstrap Prompt 1
4. Run Bootstrap Prompt 2
5. Run `/speckit.specify` using `07-specify-context.md`
6. Save output files into the same package folder

---

# Current Priority Guidance

The recommended start order is:

1. **Testing + CI Architecture**
2. **MoneyShyft PWA**
3. **ConnectShyft Omnichannel**
4. **PeopleCore + Identity**
5. **CaseShyft MVP**

These establish the quality spine and operational platform core.

---

# Notes

Keep this file updated whenever:
- a SpecKit run completes
- outputs are revised
- implementation begins
- a package is blocked or reprioritized

This file acts as the execution control sheet for the ShyftUnity platform build.
