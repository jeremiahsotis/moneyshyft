# SpecKit → GitHub Issue Conversion Checklist

Use this every time you convert SpecKit output into issues.

## Before creating issues
- [ ] Package folder is complete
- [ ] `08-speckit-spec.md` exists
- [ ] `09-speckit-task-plan.md` exists
- [ ] `10-speckit-pr-slices.md` exists
- [ ] `11-speckit-followups.md` reviewed if present

## For each issue
- [ ] package code is in the title
- [ ] issue maps to one clear outcome
- [ ] ownership boundary is explicit
- [ ] acceptance criteria are observable
- [ ] labels are assigned
- [ ] dependencies are listed
- [ ] issue is small enough to implement/review

## For each PR slice issue
- [ ] slice is actually reviewable in one PR
- [ ] no unrelated scope is mixed in
- [ ] migration needs are called out
- [ ] test expectations are listed

## Before starting implementation
- [ ] issues are ordered according to dependency
- [ ] migration issues come before dependent code issues
- [ ] rollout/hardening issues are not forgotten
- [ ] `/spec-input/RUN_ORDER.md` is updated
