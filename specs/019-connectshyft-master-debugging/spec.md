# Spec - ConnectShyft Master Debugging Sequence

Status: Ready for SpecKit

## Governing contracts

- `architecture/connectshyft/runtime-host-reality-contract.md`
- `architecture/connectshyft/neighbor-texting-preference-contract.md`
- `architecture/connectshyft/refusal-rendering-contract.md`
- `architecture/connectshyft/sms-target-resolution-architecture.md`
- `architecture/connectshyft/response-envelope-note.md`
- `architecture/connectshyft/non-regression-rules.md`
- `architecture/connectshyft/issue-sequencing-note.md`

## Supporting files required

- `specs/connectshyft-master-debugging/bootstrap-prompts.md`
- `specs/connectshyft-master-debugging/implementation-checklist.md`
- `.github/pull_request_template/connectshyft-master-debugging.md`

## Problem statement

ConnectShyft currently has three linked defects:

1. Neighbor texting preference persists/displays incorrectly
2. Frontend refusal rendering is incorrect
3. SMS target resolution is incomplete

## Outcome

Create a master debugging framework that keeps all three issues aligned while preserving separate implementation boundaries and reviewable patches.

## Required issue order

### Phase 1
Fix texting preference persistence/display.

### Phase 2
Fix refusal payload rendering.

### Phase 3
Fix SMS target resolution.

## Cross-issue acceptance criteria

- texting preference state is trustworthy before SMS gating depends on it
- refusal payloads are visible before target-resolution debugging depends on them
- SMS target resolution uses deterministic phone selection and explicit refusals
- no issue regresses a previous phase
