# Spec - ConnectShyft SMS Target Resolution from Thread and Neighbor Context

Status: Ready for SpecKit

## Governing contracts

- `architecture/connectshyft/runtime-host-reality-contract.md`
- `architecture/connectshyft/sms-target-resolution-architecture.md`
- `architecture/connectshyft/refusal-and-dispatch-requirements.md`
- `architecture/connectshyft/neighbor-texting-preference-contract.md`

## Supporting files required

- `specs/connectshyft-sms-target-resolution/bootstrap-prompts.md`
- `specs/connectshyft-sms-target-resolution/implementation-checklist.md`
- `.github/pull_request_template/connectshyft-sms-target-resolution.md`

## Problem statement

Outbound SMS fails when sending from VOICE-origin threads because provider dispatch requires `targetPhone`, but the send path does not derive a deterministic SMS target from linked neighbor phone state.

Observed failure:
- thread source = `VOICE`
- linked neighbor has a valid active primary phone
- provider dispatch still fails with missing target phone

## Runtime host reality

The current runtime host is:

- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/...`

This issue must patch the current runtime host surgically.

## Outcome

When sending SMS from a thread:

1. use explicit thread SMS target metadata if present
2. otherwise resolve deterministically from linked neighbor phone records
3. require `prefers_texting = YES`
4. if multiple possible phones exist, refuse explicitly
5. if no valid phone exists, refuse explicitly
6. avoid collapsing known pre-provider failures into generic provider dispatch failure

## Scope

In scope:
- current ConnectShyft runtime under `apps/moneyshyft-api`
- outbound thread message route
- target phone resolution logic
- neighbor phone lookup usage
- texting preference gate
- refusal classification/message improvements
- tests
- PR guardrails

Out of scope:
- lane-convergence refactor
- moving runtime into `apps/connectshyft-api`
- provider adapter redesign
- automatic thread-source redesign
- unrelated UI redesign

## Functional requirements

### FR-1 Resolution order
For `channel = sms`, resolve target phone in this order:
1. explicit thread SMS target metadata
2. neighbor primary active valid phone
3. neighbor only active valid phone if exactly one exists
4. otherwise refuse

### FR-2 Determinism
Automatic target resolution is allowed only when exactly one deterministic target can be selected.

### FR-3 Texting gate
SMS send is allowed only when `prefers_texting = YES`.

### FR-4 Explicit refusals
Known pre-provider failures must produce explicit refusal behavior instead of generic provider dispatch failure.

### FR-5 Runtime host scope
All work must remain within the current ConnectShyft runtime host unless explicitly justified.

## Acceptance criteria

- SMS send succeeds from a VOICE-origin thread when linked neighbor has one valid active primary phone and `prefers_texting = YES`
- SMS send refuses explicitly when no valid phone exists
- SMS send refuses explicitly when multiple valid phones exist
- SMS send refuses explicitly when texting preference does not allow SMS
- known pre-provider validation failures are no longer surfaced only as generic provider dispatch failure
