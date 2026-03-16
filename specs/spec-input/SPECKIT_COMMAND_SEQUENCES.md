# Ready-to-Paste SpecKit Command Sequences

## Standard run pattern

For every package, use the same four-step sequence:

1. attach the package folder files plus `_shared` docs
2. paste Bootstrap Prompt 1
3. paste Bootstrap Prompt 2
4. paste the package's `07-specify-context.md` into `/speckit.specify`

---

## 01 — MoneyShyft PWA

### Step 1
Attach:
- `/spec-input/_shared/*`
- `/spec-input/01-moneyshyft-pwa/*`

### Step 2 — Bootstrap Prompt 1
Use the full text from:
`/spec-input/_shared/shyftunity_speckit_bootstrap_prompts_v1.md`
section:
`Bootstrap Prompt 1 — Architecture + Boundary Lock`

### Step 3 — Bootstrap Prompt 2
Use the full text from:
`/spec-input/_shared/shyftunity_speckit_bootstrap_prompts_v1.md`
section:
`Bootstrap Prompt 2 — Delivery + Sequencing Lock`

### Step 4 — /speckit.specify
Paste the full contents of:
`/spec-input/01-moneyshyft-pwa/07-specify-context.md`

---

## 02 — ConnectShyft Omnichannel + Triage

Attach:
- `/spec-input/_shared/*`
- `/spec-input/02-connectshyft-omnichannel-triage/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/02-connectshyft-omnichannel-triage/07-specify-context.md`

---

## 03 — PeopleCore + Identity Resolution

Attach:
- `/spec-input/_shared/*`
- `/spec-input/03-peoplecore-identity-resolution/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/03-peoplecore-identity-resolution/07-specify-context.md`

---

## 04 — CaseShyft MVP

Attach:
- `/spec-input/_shared/*`
- `/spec-input/04-caseshyft-mvp/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/04-caseshyft-mvp/07-specify-context.md`

---

## 05 — Documents + Evidence

Attach:
- `/spec-input/_shared/*`
- `/spec-input/05-documents-evidence/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/05-documents-evidence/07-specify-context.md`

---

## 06 — Eligibility Engine

Attach:
- `/spec-input/_shared/*`
- `/spec-input/06-eligibility-engine/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/06-eligibility-engine/07-specify-context.md`

---

## 07 — ResourceShyft

Attach:
- `/spec-input/_shared/*`
- `/spec-input/07-resourceshyft/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/07-resourceshyft/07-specify-context.md`

---

## 08 — ProgramShyft MVP

Attach:
- `/spec-input/_shared/*`
- `/spec-input/08-programshyft-mvp/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/08-programshyft-mvp/07-specify-context.md`

---

## 09 — FinanceCore v1

Attach:
- `/spec-input/_shared/*`
- `/spec-input/09-financecore-v1/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/09-financecore-v1/07-specify-context.md`

---

## 10 — Future Module Hooks

Attach:
- `/spec-input/_shared/*`
- `/spec-input/10-future-module-hooks/*`

Then run Bootstrap Prompt 1, Bootstrap Prompt 2, then paste:
`/spec-input/10-future-module-hooks/07-specify-context.md`

---

## Fast operator checklist

For each package:

- confirm package number and folder
- attach `_shared`
- attach package folder
- run Bootstrap Prompt 1
- run Bootstrap Prompt 2
- run `/speckit.specify` with the package context
- save output into the same package folder as:
  - `08-speckit-spec.md`
  - `09-speckit-tasks.md`
  - `10-speckit-pr-slices.md`

## Recommended output file convention

Inside each package folder, save SpecKit outputs as:

```text
08-speckit-spec.md
09-speckit-task-plan.md
10-speckit-pr-slices.md
11-speckit-followups.md
```

This keeps the repo clean and makes it easy to compare what SpecKit produced versus the original input package.
