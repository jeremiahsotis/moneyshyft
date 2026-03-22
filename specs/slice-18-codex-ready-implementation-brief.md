# Slice 18 — Codex-Ready Execution Brief (Hard Stop Checkpoints)

## Slice
Slice 18 — Telephony Runtime Stabilization (Thread-Centric)

## Status
Locked

## Purpose
Stabilize the existing ConnectShyft telephony runtime on the real thread-centric surface already present in the repo.

This slice must make outbound thread calling and inbound voice bridge/fallback behavior operationally deterministic by introducing one canonical operator destination-number seam.

## Authoritative execution source
This file is the authoritative execution source for Slice 18.

## Locked policy embedded in this slice

### Policy: Telephony Runtime Dependency (LOCKED)

Decision:
- Thread-centric calling requires a canonical operator destination number.
- Operator destination resolution is backend-owned and deterministic.
- Operator destination source of truth is the user table, with orgUnit default fallback.

Rules:
- No new `/api/v1/connectshyft/calls/start`
- No new `/api/v1/connectshyft/calls/bridge`
- No new `/api/v1/connectshyft/messages/send`
- No new `/api/v1/ops/telephony/readiness`
- No UI work in this slice
- No second competing operator phone storage path
- Sender alignment remains thread-bound and must not be overridden by operator destination logic
- Outbound call initiation must refuse when operator destination is unresolved or invalid
- Inbound voice must fall back safely when operator destination is unresolved or invalid

Enforcement:
- Resolve operator destination before outbound provider dispatch
- Resolve operator destination before inbound bridge attempt
- Normalize all candidate operator numbers to canonical E.164
- Preserve current bridge/session architecture
- Preserve current sender-number alignment rules

Telemetry:
- Structured logs must capture operator destination resolution source and runtime outcome

## Repo-snapped ground truth

### Existing runtime surface
- `POST /api/v1/connectshyft/threads/:threadId/call`
- `POST /api/v1/connectshyft/webhooks/inbound`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`

### Confirmed absent and out of scope
- `/api/v1/ops/telephony/readiness`
- `/api/v1/connectshyft/calls/start`
- `/api/v1/connectshyft/calls/bridge`
- `/api/v1/connectshyft/messages/send`

### Architectural model to preserve
`thread -> sender alignment -> mapped provider number -> provider dispatch -> bridge session progression`

## Objective
Introduce a canonical operator destination-number seam and wire it into:
- outbound thread calls
- inbound voice bridge attempts
- deterministic refusal and fallback paths
- structured logging

## Canonical operator destination model

### Source of truth
Primary:
- `users.phone_e164`

Fallback:
- orgUnit default operator phone

### Locked resolution order
1. claimed thread operator user phone
2. actor user phone
3. orgUnit default operator phone
4. unresolved

No alternate ordering is allowed.

## Required implementation targets

### Create
- `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`

### Modify
- user persistence seam to support `users.phone_e164`
- orgUnit or ConnectShyft config seam to support `default_operator_phone_e164`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- any existing store/service/config modules required to read user phone and orgUnit fallback phone
- any repo-consistent phone normalization seam needed by telephony runtime
- relevant exports if required by repo structure

## Required refusal codes
- `CONNECTSHYFT_OPERATOR_DESTINATION_MISSING`
- `CONNECTSHYFT_OPERATOR_INVALID_PHONE`

## Hard Stop Checkpoint 1 — Data + Resolver Foundation

### Scope
Implement only:
1. user-table support for `phone_e164`
2. orgUnit fallback operator phone persistence using the smallest existing repo-consistent config seam
3. `operatorDestinationResolver.ts`
4. canonical phone normalization required by this resolver
5. resolver unit tests

### Resolver contract
Expected API:

```ts
export type ConnectShyftOperatorDestinationResolution = {
  phoneNumber: string | null;
  source: 'thread_assignee' | 'actor_user' | 'org_unit_default' | 'none';
  userId: string | null;
  orgUnitId: string;
};

export async function resolveOperatorDestination(input: {
  tenantId: string;
  orgUnitId: string;
  actorUserId?: string | null;
  claimedByUserId?: string | null;
}): Promise<ConnectShyftOperatorDestinationResolution>
```

### Rules
- normalize every candidate number to E.164 before returning
- return `source: 'none'` with `phoneNumber: null` if unresolved
- resolver may read only, not mutate
- resolver must not embed provider logic
- resolver must not embed sender-number alignment logic
- do not patch outbound or inbound runtime in this checkpoint

### Tests required in Checkpoint 1
Add unit coverage for:
- claimed thread operator resolves first
- actor user fallback resolves second
- orgUnit default fallback resolves third
- unresolved returns `none`
- invalid values are rejected deterministically
- valid values normalize to E.164

### Validation commands for Checkpoint 1
Use repo-consistent targeted Jest commands for the new resolver and any touched config/store tests.

### Hard stop
Stop after Checkpoint 1 and report:
- files created/modified
- migrations added
- resolver test results
- blockers only if real

Do not proceed to Checkpoint 2 in the same run.

## Hard Stop Checkpoint 2 — Runtime Wiring

### Preconditions
Begin only after Checkpoint 1 is complete and passing.

### Scope
Implement only:
1. patch outbound thread call flow
2. patch inbound voice flow
3. wire deterministic refusal codes
4. preserve sender alignment and bridge/session architecture
5. add focused runtime tests for outbound/inbound behavior

### Outbound requirements
Patch:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- any already-existing downstream outbound context seam needed for call prerequisites

Behavior:
- resolve operator destination before provider dispatch
- refuse if operator destination is missing
- refuse if operator destination is invalid
- pass resolved operator destination into existing provider/bridge path
- do not alter sender-number alignment behavior
- do not pretend provider dispatch occurred when refusal happened

### Inbound requirements
Patch:
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- any adjacent runtime orchestration seam that already owns bridge-vs-voicemail behavior

Behavior:
- resolve operator destination before bridge attempt
- if destination exists, continue bridge path
- if destination missing or invalid, do not bridge
- continue current safe fallback path
- preserve voicemail and transcription behavior already expected
- preserve thread/timeline/provider-event behavior already expected

### Tests required in Checkpoint 2
Outbound:
- operator resolved from claimed user
- operator resolved from actor user
- operator resolved from orgUnit fallback
- refusal when missing
- refusal when invalid
- provider dispatch not attempted on refusal
- sender alignment unchanged

Inbound:
- bridge attempted when operator destination exists
- fallback path used when destination missing
- fallback path used when destination invalid
- voicemail/transcription behavior preserved where currently expected

### Validation commands for Checkpoint 2
Run targeted Jest suites covering:
- thread call characterization
- webhook voice characterization
- any new runtime tests added

### Hard stop
Stop after Checkpoint 2 and report:
- exact runtime seams changed
- targeted test results
- whether provider dispatch/refusal behavior is now deterministic
- blockers only if real

Do not proceed to Checkpoint 3 in the same run.

## Hard Stop Checkpoint 3 — Observability + Stability

### Preconditions
Begin only after Checkpoint 2 is complete and passing.

### Scope
Implement only:
1. structured logging for resolution and outcome
2. any final integration coverage needed for bridge/session stability
3. broader regression validation
4. cleanup limited to this slice only

### Required logging
Add structured logs with at least:

```ts
{
  threadId,
  tenantId,
  orgUnitId,
  actorUserId,
  claimedByUserId,
  senderNumber,
  operatorDestinationSource,
  operatorDestinationResolved,
  outcome
}
```

Allowed outcomes:
- `bridged`
- `fallback`
- `refused`

Rules:
- mask or omit raw phone where current logging policy requires
- keep log shape consistent with existing ConnectShyft conventions

### Bridge/session stability requirements
Ensure:
- operator destination feeds current second-leg behavior
- bridge session progression remains intact
- provider correlation behavior does not regress

### Validation commands for Checkpoint 3
Run:
1. targeted telephony/runtime suites touched by this slice
2. broader ConnectShyft suite used by this repo

### Hard stop
Stop after Checkpoint 3 and report:
- structured logging added
- targeted and broad suite results
- any remaining non-blocking follow-up candidates
- ready/not-ready recommendation for next slice

## Non-goals
Do not:
- add new public telephony endpoints
- add ops readiness routes
- add UI/profile/settings screens
- redesign Telnyx provider architecture
- redesign bridge session persistence
- change webhook payload shapes unless required by existing tests
- introduce a second operator phone store
- drift into general telephony feature expansion

## Definition of done
Slice 18 is done only when:
- operator destination resolves deterministically from user table and orgUnit fallback
- outbound thread call refuses cleanly when unresolved/invalid
- inbound voice falls back cleanly when unresolved/invalid
- sender alignment remains unchanged
- bridge/session architecture remains intact
- structured logs exist for resolution source and outcome
- targeted suites pass
- broader ConnectShyft suite passes
- no ghost endpoints or UI work were added

## Codex execution rule
Execute exactly one checkpoint at a time.
Stop at each checkpoint boundary.
Do not continue automatically.
Do not expand scope.
Do not invent routes or UI surfaces not present in the repo.
