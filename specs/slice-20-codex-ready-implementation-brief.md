# Slice 20 — ConnectShyft Outbound Voicemail Fallback (Repo-Snapped, Structured-Diff, Non-Skippable)

## Status
LOCKED

## Authoritative execution source
This file is the authoritative execution source for Slice 20.

## Objective
Extend the existing outbound bridge-call runtime so that when the neighbor leg does not answer within **30 seconds**, the system performs a **blind voicemail fallback** using the existing Telnyx/provider orchestration seams, captures the resulting **recording artifact**, and surfaces that artifact in the **existing thread detail/timeline read model**.

This slice must preserve the current thin-handler ownership model:
- `POST /api/v1/connectshyft/threads/:threadId/call` remains mounted on the existing route surface in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` fileciteturn47file1
- inbound voice / voicemail / transcription processing remains owned by the current inbound core in `connectshyft.ts`, `inboundWebhookContext.ts`, `inboundVoice.ts`, `providerCorrelationMappings.ts`, and `bridgeSessions.ts`, not moved into thin outbound handlers fileciteturn46file1turn46file2

---

# Locked product / architecture decisions

## Policy: Neighbor no-answer path
Locked behavior:
- Neighbor leg rings for **30 seconds**
- If neighbor does not answer, system transitions to **blind voicemail fallback**
- No voicemail detection is implemented in v1
- Neighbor receives voicemail through carrier / provider path, not in-app delivery
- Platform stores only the resulting recording artifact and associated timeline state

## Policy: Single bridge session, multi-leg provider tracking
Locked behavior:
- One outbound interaction remains one persisted **bridge session aggregate**
- Provider identifiers are stored **per leg** inside the existing bridge session / bridge legs persistence model, not as one generic call-session row
- The three relevant legs are:
  - operator
  - neighbor
  - voicemail

This aligns with the existing persisted bridge session architecture and test surface:
- bridge persistence already exists in `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- schema already exists in `apps/connectshyft-api/src/migrations/20260311110000_create_connectshyft_bridge_sessions.ts` fileciteturn47file0turn47file1

## Policy: Reuse existing voicemail artifact model
Locked behavior:
- Do **not** invent a second voicemail model for outbound fallback
- Reuse the current voicemail artifact projection conventions already used by inbound voice processing and thread detail / timeline rendering:
  - `voicemailArtifact`
  - `recordingUrl`
  - `voicemailArtifacts`
  - timeline item type/channel = `voicemail` fileciteturn46file2turn46file3

## Policy: No transcription in Slice 20
Locked behavior:
- Slice 20 stores the recording artifact only
- Leave explicit room for later transcription reuse through the existing transcription callback model
- Do not implement outbound voicemail transcription in this slice

---

# Existing repo seams this slice MUST extend

## Route and handler seams
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/threadOutboundContext.ts`

## Telephony / provider seams
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- `apps/connectshyft-api/src/modules/connectshyft/operatorDestinationResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`

## Read-model seams
- `apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadDetail.ts`

## Existing test seams to preserve / extend
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

---

# Required data model changes

## Migration file
Create exactly this file:

`apps/connectshyft-api/src/migrations/20260322193000_add_connectshyft_bridge_session_voicemail_fallback.ts`

## Migration scope
Extend the existing ConnectShyft bridge schema rather than creating a second call-session table.

### Table 1: `connectshyft.cs_bridge_sessions`
Add:
- `neighbor_ring_started_at_utc TIMESTAMPTZ NULL`
- `neighbor_timeout_at_utc TIMESTAMPTZ NULL`
- `voicemail_fallback_started_at_utc TIMESTAMPTZ NULL`
- `voicemail_artifact_id TEXT NULL`
- `voicemail_recording_url TEXT NULL`
- `voicemail_recording_status TEXT NULL`
- `voicemail_provider_event_id TEXT NULL`
- `voicemail_provider_leg_id TEXT NULL`

Add check constraint:
- `voicemail_recording_status IN ('pending', 'completed', 'failed')`

### Table 2: `connectshyft.cs_bridge_legs`
Add:
- `provider_call_control_id TEXT NULL`

Add index:
- `(bridge_session_id, provider_call_control_id)`

Reason:
- provider correlation already distinguishes `call_leg` vs `message` and bridge sessions already persist legs; voicemail fallback should attach to the persisted bridge aggregate instead of inventing a new runtime store fileciteturn46file13turn47file1

---

# Required new and changed function signatures

## File: `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`

Add these exact exported types and functions:

```ts
export type ConnectShyftBridgeLegRole = 'operator' | 'neighbor' | 'voicemail';

export type ConnectShyftVoicemailRecordingStatus = 'pending' | 'completed' | 'failed';

export interface ConnectShyftBridgeSessionVoicemailFallbackUpdateInput {
  bridgeSessionId: string;
  tenantId: string;
  orgUnitId: string;
  neighborRingStartedAtUtc?: string | null;
  neighborTimeoutAtUtc?: string | null;
  voicemailFallbackStartedAtUtc?: string | null;
  voicemailArtifactId?: string | null;
  voicemailRecordingUrl?: string | null;
  voicemailRecordingStatus?: ConnectShyftVoicemailRecordingStatus | null;
  voicemailProviderEventId?: string | null;
  voicemailProviderLegId?: string | null;
}

export interface ConnectShyftBridgeLegProviderControlUpdateInput {
  bridgeSessionId: string;
  tenantId: string;
  orgUnitId: string;
  legRole: ConnectShyftBridgeLegRole;
  providerCallControlId: string;
}

export async function updateConnectShyftBridgeSessionVoicemailFallbackAsync(
  input: ConnectShyftBridgeSessionVoicemailFallbackUpdateInput
): Promise<ConnectShyftBridgeSessionAggregate | null>;

export async function setConnectShyftBridgeLegProviderCallControlIdAsync(
  input: ConnectShyftBridgeLegProviderControlUpdateInput
): Promise<ConnectShyftBridgeSessionAggregate | null>;

export async function findConnectShyftBridgeSessionByProviderCallControlIdAsync(
  input: {
    tenantId: string;
    orgUnitId: string;
    providerCallControlId: string;
  }
): Promise<ConnectShyftBridgeSessionAggregate | null>;
```

## File: `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`

Add these exact exports:

```ts
export interface ConnectShyftOutboundVoicemailArtifactInput {
  threadId: string;
  providerEventId: string;
  providerLegId: string | null;
  recordingUrl: string;
}

export function buildConnectShyftOutboundVoicemailArtifact(
  input: ConnectShyftOutboundVoicemailArtifactInput
): {
  artifactId: string;
  recordingUrl: string;
};
```

Use the same artifact-id naming pattern as inbound voicemail artifacts:
- `vm-${threadId}-${providerEventId}`

## File: `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

Add these exact non-exported helper signatures inside the route module:

```ts
async function scheduleConnectShyftNeighborRingTimeoutAsync(input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  bridgeSessionId: string;
  neighborProviderLegId: string | null;
  timeoutMs: number;
}): Promise<void>;

async function executeConnectShyftNeighborRingTimeoutAsync(input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  bridgeSessionId: string;
  neighborProviderLegId: string | null;
}): Promise<{
  handled: boolean;
  aggregate: ConnectShyftBridgeSessionAggregate | null;
}>;

async function attachConnectShyftOutboundVoicemailRecordingAsync(input: {
  tenantId: string;
  orgUnitId: string;
  providerEventId: string;
  providerLegId: string | null;
  recordingUrl: string;
}): Promise<{
  handled: boolean;
  bridgeSession: ConnectShyftBridgeSessionAggregate | null;
  voicemailArtifactId: string | null;
}>;
```

---

# Structured diff expectations

## Diff block A — migration
```diff
+ // apps/connectshyft-api/src/migrations/20260322193000_add_connectshyft_bridge_session_voicemail_fallback.ts
+ await knex.schema.withSchema('connectshyft').alterTable('cs_bridge_sessions', (table) => {
+   table.timestamp('neighbor_ring_started_at_utc', { useTz: true }).nullable();
+   table.timestamp('neighbor_timeout_at_utc', { useTz: true }).nullable();
+   table.timestamp('voicemail_fallback_started_at_utc', { useTz: true }).nullable();
+   table.text('voicemail_artifact_id').nullable();
+   table.text('voicemail_recording_url').nullable();
+   table.text('voicemail_recording_status').nullable();
+   table.text('voicemail_provider_event_id').nullable();
+   table.text('voicemail_provider_leg_id').nullable();
+ });
+
+ await knex.schema.withSchema('connectshyft').alterTable('cs_bridge_legs', (table) => {
+   table.text('provider_call_control_id').nullable();
+ });
```

## Diff block B — bridge session persistence
```diff
+ export async function setConnectShyftBridgeLegProviderCallControlIdAsync(...)
+ export async function updateConnectShyftBridgeSessionVoicemailFallbackAsync(...)
+ export async function findConnectShyftBridgeSessionByProviderCallControlIdAsync(...)
```

## Diff block C — outbound call dispatch persistence
```diff
+ await setConnectShyftBridgeLegProviderCallControlIdAsync({
+   bridgeSessionId,
+   tenantId,
+   orgUnitId,
+   legRole: 'operator',
+   providerCallControlId: operatorProviderLegId,
+ })
+
+ await setConnectShyftBridgeLegProviderCallControlIdAsync({
+   bridgeSessionId,
+   tenantId,
+   orgUnitId,
+   legRole: 'neighbor',
+   providerCallControlId: neighborProviderLegId,
+ })
+
+ await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
+   bridgeSessionId,
+   tenantId,
+   orgUnitId,
+   neighborRingStartedAtUtc: nowIsoUtc(),
+ })
```

## Diff block D — timeout execution
```diff
+ await scheduleConnectShyftNeighborRingTimeoutAsync({
+   tenantId,
+   orgUnitId,
+   threadId,
+   bridgeSessionId,
+   neighborProviderLegId,
+   timeoutMs: 30000,
+ })
```

## Diff block E — voicemail fallback trigger
```diff
+ await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
+   bridgeSessionId,
+   tenantId,
+   orgUnitId,
+   neighborTimeoutAtUtc: nowIsoUtc(),
+   voicemailFallbackStartedAtUtc: nowIsoUtc(),
+   voicemailRecordingStatus: 'pending',
+ })
```

## Diff block F — inbound webhook recording attach
```diff
+ const outboundVoicemailRecording = await attachConnectShyftOutboundVoicemailRecordingAsync({
+   tenantId,
+   orgUnitId,
+   providerEventId,
+   providerLegId,
+   recordingUrl,
+ })
+
+ if (outboundVoicemailRecording.handled) {
+   // include bridgeSession + voicemailArtifact in existing response payload shape
+ }
```

## Diff block G — thread read / timeline projection
```diff
+ // existing thread detail / timeline response now includes outbound voicemail artifact
+ // through the same voicemailArtifact / voicemailArtifacts / timeline item projection seams
```

---

# Checkpoints

## CHECKPOINT 0 — Migration and persistence seam extension (BLOCKING)

### Files
- `apps/connectshyft-api/src/migrations/20260322193000_add_connectshyft_bridge_session_voicemail_fallback.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftBridgeSessionVoicemailFallbackMigration.test.ts`

### Required changes
1. Create the migration file exactly as named above
2. Extend `cs_bridge_sessions` and `cs_bridge_legs`
3. Add the three new bridge-session functions to `bridgeSessions.ts`
4. Preserve existing aggregate load functions and existing bridge-session test helpers

### Data mutations
- write nullable voicemail fallback fields on `cs_bridge_sessions`
- write per-leg `provider_call_control_id` on `cs_bridge_legs`

### Guards
- `findConnectShyftBridgeSessionByProviderCallControlIdAsync` must return one aggregate or null
- do not mutate unrelated bridge-session status logic in this checkpoint

### Stop condition
- migration test passes
- bridgeSessions unit tests compile
- `git diff -- apps/connectshyft-api/src/migrations/20260322193000_add_connectshyft_bridge_session_voicemail_fallback.ts apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts` shows only schema/persistence additions

### Commit point
```bash
git add apps/connectshyft-api/src/migrations/20260322193000_add_connectshyft_bridge_session_voicemail_fallback.ts \
        apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts \
        apps/connectshyft-api/src/migrations/__tests__/connectShyftBridgeSessionVoicemailFallbackMigration.test.ts
git commit -m "feat(connectshyft): extend bridge sessions for voicemail fallback persistence"
```

---

## CHECKPOINT 1 — Persist operator and neighbor leg provider call-control IDs

### Files
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts`

### Required changes
1. In the existing outbound call path inside `connectshyft.ts`, after bridge session creation and provider dispatch result resolution, persist:
   - operator leg provider call-control ID
   - neighbor leg provider call-control ID
2. Persist `neighbor_ring_started_at_utc` when the neighbor leg begins ringing
3. Do not change route path, response envelope, or existing readiness refusal behavior

### Data mutations
- update `cs_bridge_legs.provider_call_control_id`
- update `cs_bridge_sessions.neighbor_ring_started_at_utc`

### Guards
- persist only when outbound call dispatch succeeds
- do not overwrite existing provider call-control IDs with blank values
- do not regress current success envelope asserting `bridgeSession` payload shape fileciteturn47file0

### Stop condition
- outbound dispatch test still proves persisted bridge session exists for outbound call
- characterization test still returns success envelope with `bridgeSession`
- no readiness or sender-alignment refusal tests regress

### Commit point
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts
git commit -m "feat(connectshyft): persist provider call control IDs for outbound bridge legs"
```

---

## CHECKPOINT 2 — Neighbor ring timeout scheduling and execution

### Files
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`

### Required changes
1. Add `scheduleConnectShyftNeighborRingTimeoutAsync(...)`
2. Add `executeConnectShyftNeighborRingTimeoutAsync(...)`
3. Schedule timeout with `timeoutMs: 30000` immediately after neighbor leg dispatch persistence
4. On timeout:
   - reload bridge aggregate
   - verify neighbor leg is still unresolved / ringing
   - mark `neighbor_timeout_at_utc`
   - mark `voicemail_fallback_started_at_utc`
   - set `voicemail_recording_status = 'pending'`
5. Preserve the existing bridge runtime for answered-leg success

### Data mutations
- update `cs_bridge_sessions.neighbor_timeout_at_utc`
- update `cs_bridge_sessions.voicemail_fallback_started_at_utc`
- update `cs_bridge_sessions.voicemail_recording_status = 'pending'`

### Guards
- if bridge already established, timeout handler returns `{ handled: false }`
- if voicemail fallback already started, do nothing
- if neighbor leg has terminal failure already, do nothing

### Stop condition
- new timeout-focused bridge-flow test proves timeout path mutates bridge aggregate exactly once
- existing bridge success tests continue to pass

### Commit point
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts
git commit -m "feat(connectshyft): add deterministic neighbor ring timeout execution"
```

---

## CHECKPOINT 3 — Blind voicemail fallback provider dispatch

### Files
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

### Required changes
1. In `executeConnectShyftNeighborRingTimeoutAsync(...)`, invoke existing provider outbound call dispatch for the voicemail leg
2. Reuse existing provider selection (`telnyx`) and bridge transport rules; do not add new provider families fileciteturn47file0turn47file2
3. Persist voicemail-leg `provider_call_control_id` into `cs_bridge_legs` using `legRole: 'voicemail'`
4. Do **not** invent a new top-level route
5. Add support for a voicemail leg role in persistence and aggregate serialization

### Data mutations
- update `cs_bridge_legs.provider_call_control_id` for voicemail leg
- leave `voicemail_recording_status = 'pending'`

### Guards
- timeout execution must not create multiple voicemail legs
- voicemail fallback dispatch must fail closed if provider selection is unavailable
- preserve current provider rollout and allow-list refusal behavior

### Stop condition
- bridge-flow test proves voicemail leg persisted
- provider-registry / canonical event tests still pass with call-leg correlation semantics intact

### Commit point
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
        apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts
git commit -m "feat(connectshyft): dispatch blind voicemail fallback leg after neighbor timeout"
```

---

## CHECKPOINT 4 — Outbound voicemail recording correlation and artifact creation

### Files
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`

### Required changes
1. Add `buildConnectShyftOutboundVoicemailArtifact(...)` to `inboundVoice.ts`
2. In the existing inbound webhook core inside `connectshyft.ts`, when a voice webhook contains:
   - `recordingUrl`
   - `providerEventId`
   - `providerLegId`
3. Resolve bridge aggregate by `provider_call_control_id` first using `findConnectShyftBridgeSessionByProviderCallControlIdAsync(...)`
4. If a matching bridge aggregate is found and the matching leg role is `voicemail`:
   - build outbound voicemail artifact ID as `vm-${threadId}-${providerEventId}`
   - persist voicemail recording metadata on bridge session
   - include voicemail artifact in the existing webhook success payload shape
5. Do not alter the existing inbound voicemail success envelope for non-outbound / inbound voicemail routing cases fileciteturn47file2turn46file5

### Data mutations
- update `cs_bridge_sessions.voicemail_artifact_id`
- update `cs_bridge_sessions.voicemail_recording_url`
- update `cs_bridge_sessions.voicemail_recording_status = 'completed'`
- update `cs_bridge_sessions.voicemail_provider_event_id`
- update `cs_bridge_sessions.voicemail_provider_leg_id`

### Guards
- only attach when matched leg role is `voicemail`
- ignore operator-leg and neighbor-leg recordings
- duplicate provider event IDs must remain deduped via existing provider correlation / webhook receipt behavior

### Stop condition
- new characterization proves outbound voicemail recording yields `voicemailArtifact`
- existing inbound voicemail tests still pass
- wrong-leg recording test proves no artifact attached

### Commit point
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
        apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts
git commit -m "feat(connectshyft): correlate voicemail fallback recordings to bridge sessions"
```

---

## CHECKPOINT 5 — Thread detail and timeline projection

### Files
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadDetail.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts`

### Required changes
1. Surface outbound voicemail artifact through the existing thread detail payload:
   - `voicemailArtifacts`
   - `bridgeSession`
2. Surface outbound voicemail as a first-class timeline item with:
   - `type: 'voicemail'`
   - `channel: 'voicemail'`
   - `recordingUrl`
3. Reuse existing DTO projection semantics already used for inbound voicemail timeline items fileciteturn46file3turn47file2
4. Do not redesign the read contract shape

### Data mutations
- none; read-model only

### Guards
- read-model must not synthesize duplicate voicemail items when both canonical payload and bridge fallback data exist
- preserve current thread detail `actions`, `bridgeSession`, and `voicemailArtifacts` envelope

### Stop condition
- thread detail characterization now returns outbound voicemail artifact on timed-out outbound call thread
- thread timeline characterization now shows outbound voicemail item with `recording_url`

### Commit point
```bash
git add apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadDetail.ts \
        apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts \
        apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts
git commit -m "feat(connectshyft): project outbound voicemail artifacts into thread detail and timeline"
```

---

## CHECKPOINT 6 — Idempotency and failure-path hardening

### Files
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`

### Required changes
1. Prevent duplicate timeout execution when:
   - bridge already complete
   - voicemail fallback already started
2. Prevent duplicate recording attach when:
   - `voicemail_artifact_id` already set
   - webhook receipt dedupe indicates replay
3. On voicemail fallback provider dispatch failure:
   - mark `voicemail_recording_status = 'failed'`
   - preserve bridge aggregate failure message without breaking existing successful answered-call path

### Data mutations
- `voicemail_recording_status = 'failed'` on fallback-dispatch failure
- no duplicate second write of artifact / recording URL

### Guards
```ts
if (aggregate.session.voicemailArtifactId) return handledFalse;
if (aggregate.session.voicemailRecordingStatus === 'completed') return handledFalse;
```

### Stop condition
- duplicate webhook test remains green
- bridge timeout test shows single voicemail fallback execution
- failure test shows bridge aggregate reflects failed voicemail fallback cleanly

### Commit point
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts \
        apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts
git commit -m "fix(connectshyft): harden voicemail fallback idempotency and failure paths"
```

---

## CHECKPOINT 7 — Full validation pass

### Files / suites
Run exactly:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.thread-detail.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.thread-timeline.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts
```

Then:

```bash
pnpm nx run connectshyft-api:test
```

### Stop condition
- all targeted suites pass
- broader `connectshyft-api:test` passes or any unrelated existing blocker is explicitly documented
- `git diff --stat` shows only Slice 20 files

### Commit point
```bash
git add .
git commit -m "test(connectshyft): validate outbound voicemail fallback end to end"
```

---

# Definition of done

Slice 20 is done only when all of the following are true:

1. Outbound `POST /threads/:threadId/call` still returns the existing call-dispatched envelope and persisted `bridgeSession` shape on answered-success paths fileciteturn47file0
2. Neighbor leg timeout is persisted after 30 seconds
3. Blind voicemail fallback is dispatched exactly once
4. Voicemail-leg provider call-control ID is persisted on the bridge aggregate
5. A later recording webhook resolves that voicemail leg back to the bridge aggregate
6. The resulting recording is surfaced as a voicemail artifact in thread detail and thread timeline using the existing voicemail projection model fileciteturn46file3turn47file2
7. Duplicate or wrong-leg recording events do not create duplicate or incorrect voicemail artifacts
8. No new route family, no new top-level outbound-call service family, and no redesign of inbound webhook response envelopes has been introduced

---

# Non-goals
Do not:
- introduce voicemail detection
- introduce transcription for outbound voicemail
- redesign `postConnectThreadCall` / `threadOutboundContext` thin-handler ownership
- replace `bridgeSessions.ts` with a second runtime persistence module
- redesign provider verification / webhook signature behavior
- redesign current inbound voicemail or transcription callback semantics

---

# Future extension point (explicit)
This slice must leave room for a future strategy selector without implementing it now.

When adding internal helper naming, reserve this pattern:

```ts
type ConnectShyftVoicemailFallbackStrategy = 'operator_live';
```

Future allowed extension:
- `'operator_live'` (current)
- `'prerecorded_drop'`
- `'tts_drop'`

Do not implement any strategy except `'operator_live'` in Slice 20.
