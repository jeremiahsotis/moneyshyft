# CHECKPOINT 6 — NOTIFICATION + UNREAD/SEEN/REVIEWED BEHAVIOR
**Slice:** Prep Step 1  
**Objective:** Implement correct inbound vs outbound voicemail notification and acknowledgment behavior with consistent unread/seen/reviewed state

---

## 1. Goal

- Inbound voicemail:
  - triggers notification
  - appears as unread/new activity
  - can be marked seen/reviewed

- Outbound voicemail:
  - never triggers inbound-style notification
  - never appears unread
  - exists only as documented activity

- Thread-level and voicemail-level acknowledgment behavior is deterministic and consistent

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts
apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts
apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
```

---

## 3. Required Changes

### 3.1 Add acknowledgment fields to voicemail artifact

Voicemail must support:

```text
seen_at_utc
reviewed_at_utc
```

If equivalent fields already exist, reuse them.

---

### 3.2 Inbound voicemail notification rule

When inbound voicemail is created:

- trigger notification using existing inbound activity mechanism
- mark voicemail as:
  - unseen
  - unreviewed

### 3.3 Outbound voicemail rule

When outbound voicemail is created:

- do NOT trigger notification
- set:
  - seen_at_utc = created_at
  - reviewed_at_utc = created_at

Outbound voicemail must never appear as unread.

---

### 3.4 Thread open behavior

When thread is opened:

- all inbound voicemails in that thread:
  - set seen_at_utc if not already set

This must be idempotent.

---

### 3.5 Mark reviewed action (optional but preferred)

Provide service-layer method:

```ts
markVoicemailReviewed(voicemailId, actorId)
```

Behavior:

- sets reviewed_at_utc
- does not modify recording or transcription data

If not implemented, fallback behavior:

- seen = reviewed

---

### 3.6 Timeline rendering inputs

ThreadTimeline must receive:

- direction
- seen/reviewed status

Rendering layer should be able to distinguish:

- unread (no seen_at_utc)
- seen but not reviewed
- reviewed

No UI implementation required here, only data availability.

---

### 3.7 Notification idempotency

Inbound voicemail notification must be:

- triggered once per voicemail artifact
- not retriggered by:
  - webhook replay
  - transcription callback
  - timeline rebuild

---

### 3.8 Backfill safety

If existing voicemail artifacts lack seen/reviewed fields:

- default:
  - inbound → unseen/unreviewed
  - outbound → seen/reviewed

---

## 4. Explicit Non-Changes

Do not:

- redesign notification system
- add new notification channels
- modify UI rendering components
- change voicemail persistence model
- change webhook handling
- add queue/dashboard features

---

## 5. Tests Required

### Unit

- inbound voicemail starts unseen/unreviewed
- outbound voicemail starts seen/reviewed
- mark reviewed sets reviewed_at_utc
- thread open sets seen_at_utc

### Integration

- inbound voicemail triggers notification once
- outbound voicemail does not trigger notification
- duplicate webhook does not retrigger notification
- thread open idempotently marks seen

### Characterization

- existing inbound SMS/call notifications unaffected
- timeline correctly reflects seen/reviewed state

---

## 6. Stop Condition

Complete only when:

- inbound voicemail triggers notification exactly once
- outbound voicemail never appears unread
- thread open marks inbound voicemail as seen
- reviewed state can be set or fallback applied
- no duplicate notifications occur from replay events

---

## 7. Commit Boundary

```text
feat(connectshyft): implement voicemail notification and acknowledgment behavior
```

---

## 8. Verification Commands

```bash
rg "seen_at_utc|reviewed_at_utc" apps/connectshyft-api
```

```bash
rg "notifyInboundVoicemail|notification" apps/connectshyft-api
```

---

## 9. Outcome

- inbound voicemail behaves like true inbound communication
- outbound voicemail is documented but never noisy
- thread acknowledgment is consistent
- system is now MVP-complete for telephony + voicemail
