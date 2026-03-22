# Slice 18 — Telephony Runtime Stabilization (Thread-Centric)

## Status
Locked

## Decision
Slice 18 implements backend-only telephony stabilization on the existing thread-based ConnectShyft surface.

This slice does **not** add new public telephony endpoints, ops endpoints, or UI settings screens.

This slice **does** establish a canonical operator destination-number seam and wires it into the existing thread-centric outbound and inbound voice runtime.

## Locked policy

### Policy: Telephony runtime dependency (LOCKED)

Decision:
- Thread-centric calling requires a canonical operator destination number.
- Operator destination resolution must be deterministic and backend-owned.
- The canonical operator destination source is the user table, with orgUnit default fallback.

Rules:
- No new `/calls/start`, `/calls/bridge`, `/messages/send`, or `/ops/telephony/readiness` routes.
- No second competing storage path for operator destination.
- No UI work in this slice.
- Sender-number alignment remains thread-bound and must not be overridden by operator destination resolution.
- If no operator destination can be resolved, the system must refuse outbound call initiation and must fall back safely for inbound voice.

Enforcement:
- Outbound thread call path must resolve operator destination before provider dispatch.
- Inbound voice path must resolve operator destination before bridge attempt.
- Missing or invalid operator destination returns deterministic refusal or fallback behavior.
- All operator destination numbers must normalize to canonical E.164.

Telemetry:
- Emit structured logs for operator destination resolution source and call outcome.

## Repo-snapped ground truth

### Existing production-aligned surface
- `POST /api/v1/connectshyft/threads/:threadId/call`
- `POST /api/v1/connectshyft/webhooks/inbound`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`

### Confirmed absent and out of scope for this slice
- `/api/v1/ops/telephony/readiness`
- `/api/v1/connectshyft/calls/start`
- `/api/v1/connectshyft/calls/bridge`
- `/api/v1/connectshyft/messages/send`

### Architectural model to preserve
Current telephony behavior is thread-centric:

`thread -> sender alignment -> mapped provider number -> provider dispatch -> bridge session progression`

This slice must preserve that model.

## Objective
Make the existing thread-based telephony runtime actually executable end-to-end by introducing one canonical operator destination-number seam and wiring it into:
- outbound thread calls
- inbound voice bridge attempts
- deterministic refusal/fallback paths
- structured logging

## Canonical operator destination model

### Source of truth (LOCKED)
Use the **user table** as the primary storage location.

Add a canonical phone column to the user record:
- `users.phone_e164`

Use **orgUnit default operator fallback number** when the active/assigned operator does not have a configured phone.

### Resolution order (LOCKED)
Operator destination resolution must use this exact order:
1. thread-assigned operator user phone (`users.phone_e164` for claimed owner if applicable)
2. actor user phone (`users.phone_e164`)
3. orgUnit default operator fallback number
4. no destination resolved

No alternative ordering is allowed in this slice.

## Required implementation

### 1) Add canonical operator destination resolver
Create a new module:

`apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`

This module owns a single responsibility: resolve the staff/operator destination number for a telephony action.

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

Rules:
- normalize all candidate phone values to E.164 before returning
- return `source: 'none'` and `phoneNumber: null` when unresolved
- do not embed provider logic in this resolver
- do not embed sender-number alignment logic in this resolver
- this module may read user and orgUnit config state, but may not mutate them

### 2) Add canonical user phone storage
Add a migration to support canonical user phone storage.

Preferred shape:
- add `phone_e164` to the canonical user table already used by this application

Requirements:
- nullable column
- canonical E.164 storage only
- no freeform unnormalized persistence in this column
- migration must be idempotent and follow repo migration conventions

Also add any read-model/store updates necessary so app code can retrieve `phone_e164` for:
- claimed thread operator
- current actor user

### 3) Add orgUnit default operator fallback number
Add a persistence path for a single orgUnit-level fallback operator phone.

Use the existing ConnectShyft/platform configuration boundary that best fits current repo structure. Do **not** invent an unrelated settings subsystem.

Requirements:
- orgUnit-scoped
- canonical E.164 storage
- exactly one default fallback number per orgUnit in v1
- if a current config object/table already exists for ConnectShyft orgUnit settings, extend it there
- otherwise add the smallest repo-consistent config persistence needed for this single setting

Name the stored field clearly, such as:
- `default_operator_phone_e164`

### 4) Add phone normalization utility seam if needed
If a reusable canonical phone normalization helper is not already available in the exact place this flow needs it, add or extract one repo-consistent utility.

Requirements:
- accept 10-digit US local input and normalize to `+1...`
- accept already-valid E.164
- reject invalid values deterministically
- do not duplicate multiple normalization implementations across telephony modules

### 5) Patch outbound thread call flow
Modify:
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- any downstream thread outbound context module(s) that already own call dispatch prerequisites

Behavior changes:
- before provider dispatch, resolve operator destination using the locked resolver
- if `phoneNumber` is null, return deterministic refusal
- if resolved phone is invalid after normalization, return deterministic refusal
- pass the resolved operator destination into the existing provider/bridge path without altering sender-number alignment logic

Required refusal codes:
- `CONNECTSHYFT_OPERATOR_DESTINATION_MISSING`
- `CONNECTSHYFT_OPERATOR_INVALID_PHONE`

Required message behavior:
- human-readable operational message
- do not leak implementation details
- do not pretend provider dispatch happened when it did not

### 6) Patch inbound voice flow
Modify:
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- any adjacent runtime orchestration seam that owns bridge-vs-voicemail behavior

Behavior changes:
- before attempting bridge/call-forward behavior, resolve operator destination using the locked resolver
- if resolved destination exists, continue current bridge path
- if missing or invalid, do **not** attempt bridge
- instead continue safe fallback behavior already consistent with inbound voice handling, including voicemail/transcription flow where applicable

Locked fallback behavior:
1. do not attempt bridge
2. continue inbound voice fallback path
3. preserve voicemail/transcription behavior
4. preserve thread/timeline/provider-event logging

### 7) Preserve sender number alignment exactly
Do **not** change the sender-number resolution model.

Rules:
- sender/from number stays resolved from thread/provider mapping via existing sender alignment logic
- operator destination number is the target second-leg destination, not the sender identity
- no fallback in this slice may silently switch sender resolution behavior

### 8) Preserve bridge session architecture
Do not redesign bridge sessions.

Requirements:
- continue using existing `bridgeSessions.ts` ownership
- ensure resolved operator destination feeds into the current bridge session startup path
- preserve provider call-id/session-id correlation behavior
- preserve current bridge/session persistence model

### 9) Add structured logging
Add structured logs for both outbound and inbound voice resolution decisions.

Minimum fields:

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

Allowed outcome values:
- `bridged`
- `fallback`
- `refused`

Rules:
- mask or avoid exposing raw destination number in logs if current logging policy requires masking
- keep logs consistent with existing ConnectShyft logging conventions

## File targets

### Create
- `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`
- migration file for `users.phone_e164`
- migration or config extension for orgUnit default operator phone if not already present
- focused tests for new resolver and telephony runtime behavior

### Modify
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- any existing store/service/config modules required to read:
  - user `phone_e164`
  - orgUnit default operator phone
- any repo-consistent phone normalization seam used by telephony runtime
- any relevant exports/index files required by repo conventions

## Tests required

### Unit tests
Add unit coverage for `operatorDestinationResolver.ts`:
- resolves claimed thread operator phone first
- falls back to actor user phone
- falls back to orgUnit default phone
- returns `none` when no phone exists
- rejects invalid phone values deterministically
- normalizes valid input to E.164

### Characterization/integration tests
Add or extend tests covering existing telephony runtime surfaces:

#### Outbound thread call
Target existing route behavior for:
- `POST /api/v1/connectshyft/threads/:threadId/call`

Must cover:
- operator phone resolved from claimed operator
- operator phone resolved from actor user
- operator phone resolved from orgUnit fallback
- refusal when no operator destination exists
- refusal when operator phone is invalid
- sender alignment behavior preserved
- provider dispatch not attempted on refusal

#### Inbound voice
Target existing inbound webhook voice behavior:
- bridge attempted when operator destination exists
- fallback/voicemail path used when no operator destination exists
- fallback/voicemail path used when operator destination is invalid
- transcription and timeline behavior preserved where already expected

#### Bridge/session behavior
Add coverage ensuring:
- operator destination becomes second leg input
- bridge session creation/progression remains intact
- no regression to existing provider call correlation behavior

## Validation commands
Run the most targeted telephony/runtime suites first, then the full app test suite used by this repo.

At minimum, run the relevant Jest path suites covering:
- thread call characterization
- webhook voice characterization
- provider registry guardrails/dispatch events if touched
- any new operator destination resolver tests

Then run the broader ConnectShyft test command already used in this repo.

## Non-goals (enforced)
Do not:
- add `/api/v1/ops/telephony/readiness`
- add `/api/v1/connectshyft/calls/start`
- add `/api/v1/connectshyft/calls/bridge`
- add `/api/v1/connectshyft/messages/send`
- add UI/profile/settings screens
- redesign Telnyx provider architecture
- redesign bridge session persistence
- change webhook payload shapes unless strictly required by existing tests
- introduce a second competing operator phone storage model

## Implementation order (exact)
1. inspect current user persistence seam and add `phone_e164` migration
2. inspect current orgUnit/ConnectShyft config seam and add default operator phone field in the smallest consistent place
3. create `operatorDestinationResolver.ts`
4. add/centralize canonical phone normalization used by this resolver
5. patch outbound thread call flow to require operator destination
6. patch inbound voice flow to resolve operator destination before bridge attempt
7. add deterministic refusal codes/messages
8. add structured logging
9. add/extend tests
10. run targeted suites
11. run broader ConnectShyft suite

## Definition of done
Slice 18 is done only when all of the following are true:
- outbound thread call path resolves operator destination deterministically
- inbound voice path resolves operator destination deterministically
- missing operator destination no longer causes ambiguous runtime failure
- missing destination yields refusal for outbound and safe fallback for inbound
- sender alignment remains unchanged
- bridge/session architecture remains intact
- tests cover claimed-user, actor-user, orgUnit-fallback, and unresolved cases
- no ghost direct-call routes or UI work were added

## Codex execution notes
- Stay inside existing repo boundaries and naming conventions.
- Prefer extending existing config/store seams over inventing new subsystems.
- Preserve current response envelopes unless this brief explicitly requires new refusal codes.
- Do not drift into frontend work.
- Do not create speculative telephony endpoints that the repo does not already own.
