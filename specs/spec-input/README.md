# /spec-input Master Structure for ShyftUnity

## Purpose

This folder gives you a clean, ordered `/spec-input` structure you can drop into the repo so SpecKit work can start immediately.

The folders are sequenced in implementation order:

1. MoneyShyft PWA
2. ConnectShyft Omnichannel + Triage
3. PeopleCore + Identity Resolution
4. CaseShyft MVP
5. Documents + Evidence
6. Eligibility Engine
7. ResourceShyft
8. ProgramShyft MVP
9. FinanceCore v1
10. Future Module Hooks

## Folder layout

```text
/spec-input/
  _shared/
    shyftunity_speckit_input_package_v1.md
    shyftunity_speckit_bootstrap_prompts_v1.md
    shyftunity_speckit_specify_context_template_v1.md
    shyftunity_speckit_packaging_guide_v1.md

  01-moneyshyft-pwa/
    01-feature-summary.md
    02-architecture-context.md
    03-workflow-context.md
    04-data-contract-context.md
    05-repo-constraints.md
    06-acceptance-criteria.md
    07-specify-context.md

  02-connectshyft-omnichannel-triage/
    ...
```

## How to place this in the repo

Recommended top-level location:

```text
/spec-input/
```

If you want it nested, the next-best location is:

```text
/docs/spec-input/
```

Do not bury it too deeply. SpecKit inputs should be obvious and easy to browse.

## How to use each package

Inside each numbered folder:

- `01-feature-summary.md` explains what is being built and why now
- `02-architecture-context.md` locks ownership and integration boundaries
- `03-workflow-context.md` describes the real user flows
- `04-data-contract-context.md` defines objects, states, and events
- `05-repo-constraints.md` records runtime and migration constraints
- `06-acceptance-criteria.md` defines done
- `07-specify-context.md` is the block you paste into `/speckit.specify`

## Recommended run order

Run packages in numeric order unless an emergency reprioritization happens.

That order matches the implementation sequence you already locked.

## Important rule

Do not give SpecKit the whole platform at once unless you are explicitly asking for a cross-module plan.

For normal implementation work:
- give it one numbered package
- add the `_shared` docs
- run the two bootstrap prompts
- then run `/speckit.specify`
