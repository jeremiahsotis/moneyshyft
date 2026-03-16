# How to Package ShyftUnity Work for SpecKit v1

## The short answer

For each feature or module, hand SpecKit four things:

1. a clear feature summary
2. the locked architecture and ownership boundaries
3. the workflow and data contract context
4. the repo/runtime constraints

That is enough to get much stronger specs, task plans, and PR slices.

---

# Recommended folder structure per feature

```text
/spec-input/[feature-name]/
  01-feature-summary.md
  02-architecture-context.md
  03-workflow-context.md
  04-data-contract-context.md
  05-repo-constraints.md
  06-acceptance-criteria.md
  07-specify-context.md
```

---

# What goes in each file

## 01-feature-summary.md
- what is being built
- why now
- who uses it
- in scope / out of scope

## 02-architecture-context.md
- what it owns
- what it integrates with
- what it must not own
- domain boundaries
- extraction-ready constraints

## 03-workflow-context.md
- main user flows
- branching scenarios
- UX expectations
- operational edge cases

## 04-data-contract-context.md
- domain objects
- required fields
- states
- API touchpoints
- event contracts

## 05-repo-constraints.md
- existing apps/apis
- migration constraints
- rollout constraints
- performance/security constraints

## 06-acceptance-criteria.md
- what must be true when done
- user-facing success conditions
- integration success conditions

## 07-specify-context.md
- the final block passed into `/speckit.specify`

---

# Best practice

Do not ask SpecKit to infer platform architecture from the repo alone.
Summarize the locked architecture explicitly in these files.

That is how you get solid output instead of plausible-but-wrong output.
