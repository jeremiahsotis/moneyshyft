
# ShyftUnity SpecKit Run Order

This file tracks the execution order and status of all SpecKit packages in `/spec-input`.

Update this file as packages move from **planned → running → completed → implemented**.

---

# Package Execution Order

| Order | Package | Purpose | Status | Owner | Spec Output | Notes |
|------|--------|--------|--------|------|-------------|------|
| 01 | MoneyShyft PWA | Installable budgeting app and PWA foundation | planned | | | |
| 02 | ConnectShyft Omnichannel + Triage | Intake layer (voice, SMS, web, chat) | planned | | | |
| 03 | PeopleCore + Identity Resolution | Person, household, identity clustering | planned | | | |
| 04 | CaseShyft MVP | Case workspace and service tracking | planned | | | |
| 05 | Documents + Evidence | Document storage + verification layer | planned | | | |
| 06 | Eligibility Engine | Rules engine for eligibility and verification | planned | | | |
| 07 | ResourceShyft | Service/resource discovery and referrals | planned | | | |
| 08 | ProgramShyft MVP | Program operations and service delivery | planned | | | |
| 09 | FinanceCore v1 | Financial commitments, disbursements, vouchers | planned | | | |
| 10 | Future Module Hooks | Platform seams for future modules | planned | | | |

---

# Status Definitions

Use one of these values in the **Status** column.

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

```
08-speckit-spec.md
09-speckit-task-plan.md
10-speckit-pr-slices.md
11-speckit-followups.md
12-implementation-notes.md
```

Example:

```
/spec-input/01-moneyshyft-pwa/
  08-speckit-spec.md
  09-speckit-task-plan.md
  10-speckit-pr-slices.md
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

1. **MoneyShyft PWA** — fastest visible win
2. **ConnectShyft Omnichannel** — intake infrastructure
3. **PeopleCore + Identity** — foundational data model
4. **CaseShyft MVP** — operational workspace

These four establish the operational platform spine.

---

# Notes

Keep this file updated whenever:

- a SpecKit run completes
- outputs are revised
- implementation begins
- a package is blocked or reprioritized

This file acts as the **execution control sheet** for the ShyftUnity platform build.
