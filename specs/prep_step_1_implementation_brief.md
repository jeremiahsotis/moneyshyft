# PREP STEP 1 — IMPLEMENTATION BRIEF
**Title:** Complete and Harden ConnectShyft Telephony Runtime, Voicemail (Inbound + Outbound), Transcription, and Timeline Projection

## 1. Objective

Deliver a **deterministic, end-to-end telephony runtime** where:

- Calls execute reliably using **Telnyx Programmable Voice (no SIP)**
- Missed inbound calls produce **voicemail artifacts with transcription**
- Outbound calls where operator leaves voicemail produce **recorded + transcribed outbound voicemail artifacts**
- All voicemail artifacts appear in the **thread timeline with playback + transcript**
- Inbound voicemail triggers **user notification and unread state**
- Outbound voicemail is **never unread**
- State transitions are **monotonic and idempotent**
- Timeline rendering is **deduplicated and artifact-first**

**Done =** A user can make and receive calls, leave and receive voicemails, see transcripts, and trust the thread as the complete interaction record.

---

## 2. Architecture (Authoritative)

### Core Entities

```text
BridgeSession (runtime truth)
- id
- thread_id (nullable for path-2 until bound)
- org_unit_id
- status
- voicemail_fallback_started_at_utc
- voicemail_artifact_id
- voicemail_recording_url
- voicemail_recording_status
- voicemail_provider_event_id
- voicemail_provider_leg_id

CallLeg
- id
- session_id
- role (operator | neighbor)
- contact_point_id
- provider_call_id
- provider_call_control_id
- status

Voicemail (durable artifact)
- id
- thread_id
- call_id (nullable if path-2 pre-bind)
- bridge_session_id
- contact_point_id
- recording_url
- recording_status (pending | completed | failed)
- transcription_status (pending | completed | failed)
- transcription_text
- transcription_provider
- transcription_requested_at_utc
- transcription_completed_at_utc
- transcription_failed_at_utc
- direction (inbound | outbound)
- created_at_utc
```

### Ownership Model (LOCKED)

- Runtime authority: **BridgeSession**
- Persistence authority: **Voicemail row**
- User workflow: **Thread**
- Communication anchor: **ContactPoint**
- Person: **resolved view only**

---

## 3. State Machine (Bridge Session)

### Canonical States

```text
initiated
operator_dialing
operator_answered
neighbor_dialing
neighbor_answered
bridged
voicemail
completed
failed
canceled
expired
```

### Transition Rules (Monotonic)

- No backward transitions are allowed.
- No terminal-to-active transitions are allowed.
- `voicemail` is terminal for unanswered neighbor-leg or inbound operator-miss flows.
- `completed` is only allowed after `bridged`.
- `failed` is only allowed before `bridged`.
- Provider event order does not define state authority.

### Authority Rule

> Provider events are signals.  
> BridgeSession state machine is authoritative.

---

## 4. Execution Flows

## 4A. Inbound Call → Voicemail

1. Inbound call is received.
2. Operator does not answer within the configured timeout.
3. Session transitions to `voicemail`.
4. System plays greeting and records the caller message.
5. Provider emits recording-saved event.
6. System:
   - updates BridgeSession voicemail fields
   - creates Voicemail row with `direction = inbound`
   - sets `recording_status = completed`
   - requests transcription
7. Transcription callback updates the Voicemail row.
8. Thread timeline renders voicemail card with playback and transcript.
9. Inbound voicemail is marked as new inbound activity and triggers operator notification.

## 4B. Outbound Call → Operator Leaves Voicemail

1. Operator initiates outbound call.
2. Neighbor does not answer or machine/voicemail path is reached.
3. Operator enters voicemail flow and leaves message.
4. System records operator voicemail.
5. Provider emits recording-saved event.
6. System:
   - creates Voicemail row with `direction = outbound`
   - stores recording metadata
   - requests transcription
7. Transcription callback updates the Voicemail row.
8. Thread timeline renders an outbound voicemail card with playback and transcript.
9. Outbound voicemail is **never** unread and does **not** generate inbound-style notification.

---

## 5. Webhook Handling

### Idempotency (Required)

Table: `cs_webhook_receipts`

```text
event_id
payload_hash
processed_at
status
```

### Required Rule

```text
IF event already processed:
  ignore
ELSE:
  process exactly once
```

### Additional Requirements

- Duplicate events must not create duplicate voicemail artifacts.
- Out-of-order events must not regress BridgeSession state.
- Invalid state transitions caused by delayed or replayed provider events must be ignored and logged.

---

## 6. Voicemail Persistence Rules

### Creation

- Voicemail row must be created once per actual voicemail artifact.
- Artifact creation must be idempotent.
- A unique constraint or equivalent guard must prevent duplicate voicemail rows for the same provider artifact.

### Update Order

1. Create voicemail row in pending state if needed.
2. Update recording fields when recording is confirmed.
3. Update transcription fields when transcript is available.

### Failure Handling

- Recording failure marks voicemail artifact as failed.
- Transcription failure marks transcription as failed without invalidating the voicemail artifact.
- Thread still renders playable voicemail even if transcript is unavailable.

---

## 7. Timeline Projection Rules (Critical)

### Canonical Display Rule

> Always render from Voicemail row if present.

### Fallback Rule

> BridgeSession voicemail fields may be projected only when Voicemail row does not yet exist.

### Deduplication Rule

- Never display both:
  - bridge-session-derived voicemail projection
  - persisted voicemail artifact projection
- Persisted voicemail artifact always wins.

### Directional Rendering Rule

- `direction = inbound` renders as inbound voicemail card and participates in unread/new activity behavior.
- `direction = outbound` renders as outbound voicemail card and never participates in unread/new activity behavior.

---

## 8. Notification and Read Model

### Inbound Voicemail

- Triggers operator notification.
- Appears as new inbound activity.
- Displays unread/new state until acknowledged.

### Outbound Voicemail

- Never triggers inbound-style notification.
- Never appears unread.

### MVP Acknowledgment Model

**Preferred**
- Opening thread marks voicemail as **seen**.
- Operator can explicitly mark voicemail as **reviewed** to clear unread/new indicator.

**Acceptable fallback**
- Opening thread marks voicemail as read.

Implementation may use fallback if needed to reduce scope, but preferred model should be attempted first.

---

## 9. Transcription (Required MVP)

### Requirements

- Every inbound voicemail must request transcription.
- Every outbound operator-left voicemail must request transcription.
- Transcription status must be persisted on the Voicemail row.
- Transcript text must be rendered in-thread when available.
- Missing transcript must never block playback controls.

### Required Fields

```text
transcription_status
transcription_text
transcription_provider
transcription_requested_at_utc
transcription_completed_at_utc
transcription_failed_at_utc
```

### Rendering Rules

- Transcript is displayed inline on voicemail card.
- Playback controls are independent of transcript completion.
- Failed transcription may show a non-technical user message, but must not leak provider or engineering language.

---

## 10. Service Layer Contracts

### Bridge Session Service

```ts
startCallSession(input): BridgeSession
transitionState(sessionId, event): void
startVoicemailFallback(sessionId): void
completeVoicemail(sessionId, recording): void
```

### Voicemail Service

```ts
createVoicemail(input): Voicemail
updateRecording(voicemailId, data): void
updateTranscription(voicemailId, data): void
markSeen(voicemailId, actorId): void
markReviewed(voicemailId, actorId): void
```

### Webhook Handler

```ts
handleProviderEvent(event): void
```

### Notification Integration

```ts
notifyInboundVoicemail(threadId, voicemailId): void
```

---

## 11. Failure Modes

| Scenario | Required behavior |
|---|---|
| Duplicate webhook | Ignore as duplicate, do not create second artifact |
| Out-of-order event | Ignore invalid state regression, log receipt |
| Recording missing or unavailable | Mark recording failed or retry-safe pending state |
| Transcription failure | Keep voicemail valid, mark transcription failed |
| Partial write | Remain retry-safe and idempotent |
| Duplicate timeline projection | Suppress duplicate, artifact wins |
| Outbound voicemail with missing transcript | Render playable voicemail and pending/failed transcript state without unread flag |

---

## 12. Tests (Required)

### Unit Tests

- Valid and invalid BridgeSession state transitions
- Voicemail artifact uniqueness and idempotent creation
- Transcription update handling
- Read/seen/reviewed state rules by direction
- Deduplication selection logic

### Integration Tests

- Inbound call → missed operator → voicemail → transcription → thread projection
- Outbound call → operator leaves voicemail → transcription → thread projection
- Duplicate webhook replay handling
- Out-of-order provider event handling
- Notification behavior for inbound voicemail only
- Outbound voicemail never unread

### E2E / Characterization

- Operator can open thread and see inbound voicemail card with playback and transcript
- Operator can see outbound voicemail card with playback and transcript
- No duplicate voicemail cards appear
- No engineering-only strings appear in the UI

---

## 13. Checkpoints (Codex-aligned)

### Checkpoint 1 — State Machine Lock

- Enforce and verify monotonic transitions in BridgeSession lifecycle.
- Establish BridgeSession as runtime source of truth.

### Checkpoint 2 — Voicemail Artifact Persistence

- Ensure single artifact creation.
- Add or finalize required voicemail and transcription fields.
- Lock idempotent provider-event correlation.

### Checkpoint 3 — Webhook Idempotency and Replay Safety

- Verify receipt-table enforcement.
- Prevent duplicate artifact creation and invalid state regression.

### Checkpoint 4 — Transcription Completion

- Finalize request and callback wiring.
- Persist transcript fields on voicemail artifact.
- Ensure thread reads from artifact.

### Checkpoint 5 — Timeline Deduplication and Directional Rendering

- Artifact-first voicemail rendering.
- No duplicate voicemail cards.
- Correct inbound vs outbound display behavior.

### Checkpoint 6 — Notification and Acknowledgment Behavior

- Inbound voicemail = notification + unread/new behavior
- Outbound voicemail = never unread
- Preferred seen/reviewed model if feasible; fallback thread-open-read model allowed if explicitly implemented

---

## 14. Done Criteria

This slice is done only when all of the following are true:

- Inbound voicemail appears in-thread with playback controls.
- Inbound voicemail transcript appears in-thread when available.
- Inbound voicemail triggers operator notification.
- Inbound voicemail participates in unread/new behavior.
- Outbound operator-left voicemail appears in-thread with playback controls.
- Outbound voicemail transcript appears in-thread when available.
- Outbound voicemail never participates in unread/new behavior.
- No duplicate voicemail items appear in thread timeline.
- Webhook replay is safe.
- BridgeSession state does not regress due to delayed or duplicate provider events.
- UI contains no tenant IDs, thread IDs, provider jargon, debug notes, or engineering artifacts.

---

## 15. Non-Goals

The following are explicitly out of scope for Prep Step 1:

- SIP integration
- Telnyx SIP voicemail feature
- Dedicated voicemail queue or dashboard
- Dashboard playback for voicemails
- Automatic call retries
- Multi-call operator concurrency
- Resolver UI completion
- CaseShyft integration
- AI summarization or prioritization of voicemail content

---

## 16. Extension Points (Post-MVP)

- Dedicated voicemail queue/dashboard
- Multi-call operator handling
- Advanced retry policy by failure class
- Automatic machine-detection optimization
- AI summarization or sentiment scoring
- Supervisor monitoring and audit playback surfaces

---

## 17. Locked Decisions Summary

The following decisions are locked for this slice:

- **Provider:** Telnyx Programmable Voice
- **SIP in MVP:** none
- **Telephony runtime truth:** BridgeSession
- **Voicemail persistence truth:** Voicemail row
- **User workflow surface:** Thread timeline
- **Inbound voicemail in MVP:** yes
- **Outbound operator-left voicemail in MVP:** yes
- **Voicemail transcription in MVP:** yes
- **Inbound voicemail notification/unread:** yes
- **Outbound voicemail unread:** never
- **Playback surface in MVP:** thread only
- **Retry behavior in MVP:** manual only
- **Operator concurrency in MVP:** one active call at a time

---

## 18. Implementation Intent

This is a **completion and hardening slice**, not a redesign slice.

The repo already contains bridge-session, voicemail, transcription-event, timeline, and rebind scaffolding. This slice finishes and stabilizes that architecture rather than replacing it.

Any implementation that introduces a parallel voicemail model, a second runtime source of truth, or a new user-facing voicemail surface outside the thread violates this brief.
