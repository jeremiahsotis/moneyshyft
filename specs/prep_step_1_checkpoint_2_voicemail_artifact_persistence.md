# CHECKPOINT 2 — VOICEMAIL ARTIFACT PERSISTENCE, IDEMPOTENCY, AND TRANSCRIPTION PERSISTENCE
**Slice:** Prep Step 1  
**Objective:** Finalize voicemail as a single durable artifact with idempotent creation, stable provider-event correlation, completed transcription persistence, and artifact-first thread rendering inputs

## 1. Goal

Lock voicemail as a **single persisted communication artifact** so that:

- each real voicemail recording results in **one and only one** voicemail artifact
- duplicate or replayed provider events cannot create duplicate voicemail rows
- recording and transcription data are persisted on the voicemail artifact, not scattered across projections
- BridgeSession voicemail fallback fields can support runtime recovery, but **Voicemail** is the persistence truth
- thread/timeline rendering can reliably read from the artifact first and avoid duplicate visible voicemail items later

This checkpoint does **not** finish timeline deduplication UI behavior. It finishes the persistence layer and the data contracts that make deduplication possible.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts
apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts
apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts
```

If the repo already stores schema or migration changes in a separate package/location, include the exact migration/schema files required for voicemail transcription persistence. Do not modify unrelated schema files.

---

## 3. Required Changes

### 3.1 Lock Voicemail as the persistence truth

In `voicemails.ts`, make the Voicemail artifact the authoritative persisted record for:

- recording identity
- recording lifecycle status
- transcription lifecycle status
- transcription text
- direction (`inbound | outbound`)
- thread linkage
- bridge session linkage
- contact point linkage

BridgeSession voicemail fields may remain for runtime recovery and fallback projection, but they are not the durable source of truth once a voicemail artifact exists.

### 3.2 Define or finalize required voicemail fields

The voicemail persistence layer must support, at minimum:

```text
id
thread_id
bridge_session_id
call_id
contact_point_id
direction
recording_url
recording_status
provider_event_id
provider_leg_id
provider_recording_id
transcription_status
transcription_text
transcription_provider
transcription_requested_at_utc
transcription_completed_at_utc
transcription_failed_at_utc
created_at_utc
updated_at_utc
```

If some fields already exist under different names, preserve current repo naming where practical. Do not introduce duplicate semantic fields.

### 3.3 Add one idempotent artifact-upsert path

In `voicemails.ts`, add or finalize a single service entry point that all voicemail persistence flows must use.

Required shape:

```ts
upsertVoicemailArtifact(input): Voicemail
```

The function must:

1. locate an existing voicemail artifact using stable provider correlation keys
2. create the artifact only if no matching artifact exists
3. update existing artifact fields when recording or transcription data arrives later
4. be safe to call repeatedly with the same provider payload

### 3.4 Define correlation priority (mandatory)

Voicemail artifact lookup and dedupe must use this priority order:

1. `provider_recording_id`
2. `provider_event_id`
3. `(bridge_session_id + provider_leg_id + direction)`
4. `recording_url` only as a last-resort fallback if the provider surfaces no stronger identifier

The implementation must not create a second artifact if one of the stronger identifiers already resolves to an existing artifact.

### 3.5 Persist transcription on the voicemail artifact

Transcription is required in MVP. The callback/update path must write to the voicemail artifact itself, not to timeline projection or transient event payload only.

Required behavior:

- recording completion can create artifact with `transcription_status = pending`
- transcription callback updates:
  - `transcription_status`
  - `transcription_text`
  - `transcription_provider`
  - relevant timestamps
- transcription failure must leave the voicemail artifact valid and playable

### 3.6 Inbound and outbound voicemail direction must be explicit

Do not infer direction at render time from unrelated call metadata if it can be persisted at artifact creation time.

Required persisted values:

- inbound voicemail from neighbor → `direction = inbound`
- outbound voicemail left by operator → `direction = outbound`

### 3.7 Artifact creation must be wired from both inbound and outbound flows

Ensure the same voicemail artifact persistence path is used by:

- inbound operator-missed voicemail flow
- outbound operator-left voicemail flow

No separate persistence model for outbound voicemail is allowed.

### 3.8 Route/webhook handlers must not persist voicemail ad hoc

In `connectshyft.ts` and any provider callback handlers:

- remove or avoid inline voicemail row creation logic
- route all voicemail persistence through the voicemail service entry point
- keep webhook handlers thin: validate, map, delegate

### 3.9 Thread timeline reads must be artifact-compatible

In `threadTimeline.ts`, do not finalize dedupe behavior yet, but make sure the projection layer can read these persisted voicemail artifact fields without requiring bridge-session-only fallback fields for transcript or direction.

This checkpoint is complete only if the thread timeline layer is capable of rendering from the persisted artifact once the later dedupe checkpoint locks artifact-first behavior.

### 3.10 Failure-state rules

The voicemail artifact must support these valid partial states:

- recording pending, transcription pending
- recording completed, transcription pending
- recording completed, transcription completed
- recording completed, transcription failed
- recording failed, transcription not requested

Invalid combinations should be blocked or normalized in the service layer.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- redesign BridgeSession state machine
- add SIP logic
- change retry policy
- finalize unread/seen/reviewed UI behavior
- add queue/dashboard voicemail surfaces
- change rebind policy beyond preserving current compatibility
- introduce new user-facing screens
- add AI summarization or prioritization

---

## 5. Tests Required

### Unit

- artifact create when no existing voicemail found
- artifact update when matching voicemail already exists
- duplicate provider event does not create second voicemail
- stronger correlation keys beat weaker fallback keys
- transcription update writes onto existing artifact
- transcription failure does not invalidate playable voicemail
- direction persists correctly for inbound and outbound

### Integration

- inbound voicemail recording flow produces one artifact after replayed provider events
- outbound voicemail recording flow produces one artifact after replayed provider events
- recording event followed by transcription callback updates same artifact
- out-of-order transcription callback before repeated recording callback still results in one artifact
- thread timeline query can consume persisted voicemail artifact fields for direction, recording status, and transcript text

### Characterization / Regression

- existing bridge-session voicemail fallback behavior remains intact for runtime recovery
- no second artifact is created when bridge-session fields and persisted voicemail row both exist for the same voicemail

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- there is one service path for voicemail artifact create/update
- inbound and outbound voicemail both use that path
- replayed or duplicate provider events do not create duplicate voicemail artifacts
- transcription data is persisted on the voicemail artifact itself
- persisted voicemail records carry explicit direction
- timeline projection can read artifact-backed voicemail fields without requiring bridge-session-only transcript data

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft): lock voicemail artifact persistence and transcription correlation
```

---

## 8. Verification Commands

Run:

```bash
rg "insert into cs_voicemails|insertInto\(['\"]cs_voicemails['\"]\)|createVoicemail|upsertVoicemailArtifact" apps/connectshyft-api
```

Verify that voicemail persistence is funneled through one service path.

Run:

```bash
rg "transcription_status|transcription_text|transcription_provider" apps/connectshyft-api
```

Verify persistence and read-path coverage.

Run:

```bash
rg "provider_event_id|provider_recording_id|provider_leg_id|recording_url" apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
```

Verify correlation logic exists in the voicemail service.

---

## 9. Outcome

After this checkpoint:

- voicemail persistence is deterministic and idempotent
- transcription has a durable home
- inbound and outbound voicemail use one artifact model
- the codebase is ready for artifact-first timeline deduplication and notification/read-state completion in later checkpoints
