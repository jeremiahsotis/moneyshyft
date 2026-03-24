# CHECKPOINT 4 — TRANSCRIPTION COMPLETION AND ARTIFACT-BACKED THREAD INPUTS
**Slice:** Prep Step 1  
**Objective:** Complete voicemail transcription flow end-to-end and ensure thread/timeline reads from persisted voicemail artifacts (not transient or bridge-only fields)

## 1. Goal

- Every voicemail (inbound and outbound) results in:
  - persisted recording metadata
  - persisted transcription (when available)
- Transcription callbacks update the **Voicemail artifact**
- Thread/timeline can render from artifact fields (recording + transcript)
- Transcription is idempotent, replay-safe, and non-blocking for playback

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts
apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

Include migration/schema only if transcription fields are missing.

---

## 3. Required Changes

### 3.1 Transcription fields must exist on Voicemail

Required fields (or mapped equivalents):

```text
transcription_status (pending | completed | failed)
transcription_text
transcription_provider
transcription_requested_at_utc
transcription_completed_at_utc
transcription_failed_at_utc
```

---

### 3.2 Request transcription on recording completion

Where recording is confirmed (provider event):

- ensure voicemail artifact exists (Checkpoint 2)
- set:
  - `recording_status = completed`
  - `transcription_status = pending`
  - `transcription_requested_at_utc = now`
- invoke transcription request (provider or internal service)

This must occur exactly once per artifact (idempotent).

---

### 3.3 Transcription callback must update artifact (single path)

Add/complete handler:

```ts
handleVoicemailTranscriptionCallback(input): void
```

Behavior:

- resolve voicemail artifact using correlation keys
- update:
  - `transcription_status`
  - `transcription_text`
  - `transcription_provider`
  - timestamps
- must be safe for duplicate/replayed callbacks

No direct timeline mutation here.

---

### 3.4 Idempotency rules for transcription

- duplicate callback → no duplicate writes beyond idempotent update
- completed transcription must not be overwritten by older/incomplete payloads
- failed → completed is allowed (retry success)
- completed → failed is NOT allowed

---

### 3.5 Playback must not depend on transcription

Thread rendering must:

- always allow playback if `recording_status = completed`
- show transcript only if `transcription_status = completed`
- show neutral pending state otherwise
- never block playback due to transcription

---

### 3.6 Thread timeline must read from artifact

In `threadTimeline.ts`:

- ensure voicemail rendering uses:
  - `recording_url`
  - `recording_status`
  - `transcription_text`
  - `transcription_status`
  - `direction`

Do not require bridge-session fields for transcript.

---

### 3.7 Direction-aware rendering input

Artifact must provide:

- inbound → eligible for unread behavior (handled later)
- outbound → never unread

This checkpoint ensures direction is available to timeline layer.

---

### 3.8 Error handling

- transcription failure:
  - set `transcription_status = failed`
  - do not invalidate recording
- missing callback:
  - artifact remains pending, still playable
- malformed callback:
  - log + mark failed safely

No user-facing provider errors.

---

## 4. Explicit Non-Changes

Do not:

- change BridgeSession state machine
- redesign voicemail persistence (Checkpoint 2 already locked)
- implement unread/seen UI logic
- add queue/dashboard
- add retry logic beyond idempotent safety
- introduce AI summarization

---

## 5. Tests Required

### Unit

- transcription request sets pending state
- callback updates artifact correctly
- duplicate callback is idempotent
- completed transcription not overwritten by older payload
- playback allowed without transcript

### Integration

- recording → transcription request → callback → artifact updated
- duplicate callback → no duplicate effect
- out-of-order callback → final state correct
- inbound and outbound voicemail both receive transcription

### Characterization

- existing voicemail playback remains functional
- thread can render transcript when present and fallback when absent

---

## 6. Stop Condition

Complete only when:

- every voicemail artifact can persist transcription data
- transcription callbacks update artifact, not timeline directly
- duplicate/replayed callbacks are safe
- playback works independently of transcription
- timeline layer can read artifact-backed transcript + recording fields

---

## 7. Commit Boundary

```text
feat(connectshyft): complete voicemail transcription flow and artifact-backed rendering inputs
```

---

## 8. Verification Commands

```bash
rg "transcription_status|transcription_text|transcription_provider" apps/connectshyft-api
```

```bash
rg "handleVoicemailTranscription|transcriptionCallback" apps/connectshyft-api
```

```bash
rg "recording_url|recording_status" apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts
```

---

## 9. Outcome

- transcription is durable and idempotent
- voicemail playback + transcript are reliable
- thread rendering has stable inputs
- system is ready for final timeline dedupe + notification checkpoint
