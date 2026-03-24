# CHECKPOINT 3 — WEBHOOK IDEMPOTENCY AND REPLAY SAFETY AT THE PROVIDER BOUNDARY
**Slice:** Prep Step 1  
**Objective:** Finalize provider-boundary webhook handling so duplicate, replayed, delayed, and out-of-order provider events cannot corrupt ConnectShyft telephony runtime or voicemail artifact state

## 1. Goal

Lock the provider-boundary event handling layer so that:

- every provider webhook is processed **at most once** for side effects
- duplicate deliveries cannot create duplicate bridge transitions, duplicate voicemail artifacts, or duplicate transcription updates
- delayed or out-of-order provider events cannot regress BridgeSession state
- webhook processing remains thin, deterministic, auditable, and retry-safe
- receipt tracking becomes the authoritative replay/idempotency barrier before domain mutation occurs

This checkpoint does **not** redesign provider abstractions or add new runtime features. It hardens the existing webhook boundary.

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts
apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts
```

Include the exact schema/migration files for `cs_webhook_receipts` only if the current repo state is missing fields required to enforce replay safety. Do not modify unrelated schema files.

---

## 3. Required Changes

### 3.1 Lock `cs_webhook_receipts` as the provider-boundary replay barrier

Webhook processing must treat the receipt record as the first authoritative gate before any domain-side mutation occurs.

Required persisted receipt fields must support, at minimum:

```text
provider
event_id
event_type
payload_hash
received_at_utc
processing_status
processed_at_utc
error_code
error_message
```

If some fields already exist under different names, preserve existing repo naming where practical. Do not create duplicate semantic fields.

### 3.2 Define receipt statuses explicitly

The webhook layer must use a clear lifecycle such as:

```text
received
processing
processed
ignored_duplicate
failed
```

The exact string names may follow existing repo conventions, but the semantic distinction must exist.

### 3.3 Process webhooks in this exact order

1. authenticate/validate provider request
2. extract stable event identity
3. compute/store payload hash
4. acquire/create webhook receipt record
5. determine duplicate/replay status
6. if duplicate/replayed and already processed, stop with no domain mutation
7. if first-time or recoverable retry, delegate to domain handler
8. update receipt status based on success/failure

Webhook handlers must not mutate BridgeSession, Voicemail, or timeline-related state before crossing this replay barrier.

### 3.4 Stable provider event identity is mandatory

For every webhook path, normalize and use a stable event identifier.

Priority:

1. provider-native event id
2. provider-native webhook delivery id
3. deterministic hash-derived fallback only if provider id is unavailable

If the provider supplies a true event identifier, do not downgrade to hash-only idempotency.

### 3.5 Duplicate deliveries must be side-effect free

If the same processed event is delivered again:

- do not transition BridgeSession again
- do not create or update a second voicemail artifact
- do not request transcription a second time unless current artifact state explicitly requires recovery
- do not emit duplicate timeline-driving domain events

Return success/acknowledgment to provider where appropriate so the provider stops retrying.

### 3.6 Recoverable retries must be safe

If a receipt exists in `failed` or partially processed state and the same event is replayed:

- the handler may attempt processing again
- the retry must remain safe because domain services are idempotent
- the final receipt must resolve to `processed` or remain `failed` with updated error info

### 3.7 Out-of-order event handling must not cause state regression

Webhook processing must delegate to domain logic that respects Checkpoint 1 monotonic transitions.

Examples:

- delayed `ringing` after `bridged` must not regress BridgeSession
- delayed `recording.saved` replay after voicemail artifact already exists must not duplicate artifact
- delayed transcription callback after transcription already completed must not corrupt the artifact

### 3.8 Route handlers must stay thin

In `connectshyft.ts`:

- validate provider request
- build normalized provider event envelope
- call receipt/idempotency gate
- delegate to the appropriate lifecycle/voicemail/inbound handler
- update receipt status
- return provider acknowledgment

Do not inline domain mutation logic directly in route handlers.

### 3.9 Error handling must be audit-safe and non-leaky

On processing failure:

- update receipt record with failed status and machine-useful error detail
- do not leak internal stack traces or engineering notes in provider response
- do not mark receipt processed if domain mutation failed before commit

### 3.10 Logging requirements

Add or preserve logs for:

- webhook received
- duplicate ignored
- processing succeeded
- processing failed
- invalid provider signature / validation failure

Logs must be operator-safe and not user-facing.

---

## 4. Explicit Non-Changes (Guard Against Drift)

Do not:

- redesign Telnyx provider integration architecture
- add SIP logic
- redesign BridgeSession state machine
- redesign voicemail artifact model
- change unread/seen/reviewed UX behavior
- add new user-facing screens
- add queue/dashboard voicemail surfaces
- add retry logic for live calls
- change CaseShyft/resolver scope

---

## 5. Tests Required

### Unit

- new webhook receipt is created for first-time event
- already-processed duplicate event is ignored
- failed receipt can be retried safely
- stable event identity extraction works for supported event shapes
- payload hash is recorded
- duplicate replay does not re-run side effects

### Integration

- duplicate provider webhook delivery does not create duplicate BridgeSession transitions
- duplicate provider webhook delivery does not create duplicate voicemail artifacts
- duplicate transcription callback does not create duplicate updates or duplicate downstream domain effects
- out-of-order provider events do not regress BridgeSession state
- failed first attempt followed by replay can succeed and mark receipt processed
- invalid provider signature/request is rejected before domain mutation

### Characterization / Regression

- current inbound voice webhook handling still works through the receipt barrier
- current voicemail recording + transcription callbacks still work through the receipt barrier
- provider acknowledgment behavior remains compatible with current integration expectations

---

## 6. Stop Condition (MANDATORY)

This checkpoint is complete only when:

- every telephony/voicemail provider webhook crosses the receipt/idempotency barrier before domain mutation
- already-processed duplicate events are side-effect free
- recoverable failed receipts can be retried safely
- out-of-order provider events cannot corrupt runtime or voicemail artifact state
- route handlers are thin and delegate domain work
- receipt records contain enough data to audit what happened and why

---

## 7. Commit Boundary

Single commit:

```text
feat(connectshyft): harden provider webhook idempotency and replay safety
```

---

## 8. Verification Commands

Run:

```bash
rg "cs_webhook_receipts|webhook_receipts|processing_status|ignored_duplicate|payload_hash" apps/connectshyft-api
```

Verify receipt persistence and statuses exist.

Run:

```bash
rg "handleProviderEvent|processWebhook|processTelnyx|validate.*signature|signature.*validate" apps/connectshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-api/src/modules/connectshyft
```

Verify route-layer validation and delegated processing.

Run:

```bash
rg "insertInto\(['\"]cs_webhook_receipts['\"]\)|updateTable\(['\"]cs_webhook_receipts['\"]\)|ignored_duplicate|processed_at" apps/connectshyft-api
```

Verify receipt creation/update flow is implemented.

---

## 9. Outcome

After this checkpoint:

- provider webhook delivery becomes replay-safe and auditable
- duplicate and delayed events cannot corrupt telephony runtime
- webhook processing is thin, deterministic, and compatible with later voicemail/timeline completion checkpoints
