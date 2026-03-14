# Spec - ConnectShyft SMS Target Resolution from Thread and Neighbor Context

Status: Ready for SpecKit

## Governing contracts

- `architecture/connectshyft/runtime-host-reality-contract.md`
- `architecture/connectshyft/sms-target-resolution-architecture.md`
- `architecture/connectshyft/refusal-and-dispatch-requirements.md`
- `architecture/connectshyft/neighbor-texting-preference-contract.md`

## Supporting files required

Canonical shared inputs for this feature:
- `specs/connectshyft-sms-target-resolution/bootstrap-prompts.md`
- `specs/connectshyft-sms-target-resolution/implementation-checklist.md`

Feature-local planning and execution artifacts for this workflow:
- `specs/009-connectshyft-sms-target-resolution/plan.md`
- `specs/009-connectshyft-sms-target-resolution/research.md`
- `specs/009-connectshyft-sms-target-resolution/data-model.md`
- `specs/009-connectshyft-sms-target-resolution/contracts/thread-message-dispatch.md`
- `specs/009-connectshyft-sms-target-resolution/quickstart.md`
- `specs/009-connectshyft-sms-target-resolution/tasks.md`

PR review surface:
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

## Routing ownership and platform boundaries

Route and runtime ownership for this feature remain in the current host:

- `POST /api/v1/connectshyft/threads/:threadId/messages` remains owned by `apps/moneyshyft-api`
- no `/api/v1/auth/*` or `/api/v1/platform/admin/*` ownership changes are in scope
- no lane delegation or cross-lane API ownership changes are allowed

Shared platform compatibility requirements:

- preserve current host Nginx routing behavior
- preserve shared PostgreSQL compatibility
- preserve localhost-only API binding and port expectations
- do not introduce new public ingress, host, or deployment topology changes

## Outcome

The current runtime host must:

1. resolve outbound SMS targets deterministically
2. require `prefers_texting = YES`
3. return explicit pre-provider refusals
4. preserve current runtime-host, routing, and provider-boundary constraints

## Scope

In scope:
- current ConnectShyft runtime under `apps/moneyshyft-api`
- outbound thread message route
- target phone resolution logic
- neighbor phone lookup usage
- texting preference gate
- refusal classification/message improvements
- narrow source-fidelity correction so reconstructed outbound thread state reflects the outbound communication method used by the runtime host
- tests
- PR guardrails

Out of scope:
- lane-convergence refactor
- moving runtime into `apps/connectshyft-api`
- provider adapter redesign
- broad thread-source model redesign outside the current outbound dispatch fix
- unrelated UI redesign

## User stories

### US1 - Dispatch with a deterministic SMS target (P1)

As a ConnectShyft operator,
I want outbound SMS sends to resolve a deterministic target from the current runtime host,
so that valid thread-message sends succeed without manual provider failure.

Acceptance checks:
- explicit outbound SMS target supplied by the current runtime host request surface wins when provided
- otherwise a single deterministic neighbor phone is selected
- successful outbound message responses return the resolved target phone
- successful outbound message responses reflect `source = SMS`

### US2 - Refuse non-deterministic or non-permitted sends explicitly (P2)

As a ConnectShyft operator,
I want known SMS dispatch preconditions to refuse explicitly before provider dispatch,
so that I receive actionable feedback instead of generic provider failure.

Acceptance checks:
- no valid phone returns an explicit refusal
- multiple candidate phones return an explicit refusal
- `prefers_texting != YES` returns an explicit refusal
- these failures do not return only `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`

## Current-host phone candidate definition

For the current runtime host only:

- `active` phone means an in-scope persisted `connectshyft.cs_neighbor_phones` row available for the linked neighbor
- `valid` phone means a non-empty canonical E.164 value stored in `value_e164`
- `is_primary = true` affects deterministic selection priority only
- `verification_status` does not gate SMS dispatch in this feature unless explicitly added by a future spec

## Non-functional requirements

- preserve the current route-to-provider dispatch shape
- do not add cross-service hops
- do not redesign provider adapters
- keep all behavior inside `apps/moneyshyft-api`

## Functional requirements

### FR-1 Resolution order
For `channel = sms`, resolve target phone in this order:
1. explicit outbound SMS target supplied by the current runtime host request surface
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
- ConnectShyft route ownership remains confined to the existing `/api/v1/connectshyft/*` surface with no auth or platform-admin delegation changes
- shared PostgreSQL compatibility is preserved for the current runtime host
- localhost-only API binding and port expectations remain unchanged
- reproducible deployment validation steps are captured for this feature
