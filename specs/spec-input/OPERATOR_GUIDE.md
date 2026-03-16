# Operator Guide: How to Run the Master /spec-input Folder

## 1. Copy this folder into the repo

Recommended destination:

```text
/spec-input/
```

## 2. Start with package 01

Run MoneyShyft PWA first because it is the live-user retention priority.

## 3. Always include `_shared`

The `_shared` folder contains the global ShyftUnity rules and bootstrap prompts. Use it every time.

## 4. Run one package at a time

Do not feed SpecKit multiple major packages in one pass unless you explicitly want a cross-module architecture result.

## 5. Save SpecKit output back into the same package folder

Recommended filenames:
- `08-speckit-spec.md`
- `09-speckit-task-plan.md`
- `10-speckit-pr-slices.md`
- `11-speckit-followups.md`

## 6. Move to the next numbered package only after the previous one is stable

That keeps decisions from drifting between modules.
