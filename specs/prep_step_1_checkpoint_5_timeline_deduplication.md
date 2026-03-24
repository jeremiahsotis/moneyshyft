# CHECKPOINT 5 — TIMELINE DEDUPLICATION AND ARTIFACT-FIRST RENDERING
**Slice:** Prep Step 1  
**Objective:** Ensure thread timeline renders voicemail exactly once using artifact-first logic with correct inbound/outbound behavior

## 1. Goal

- Each voicemail appears **once and only once** in thread timeline
- Persisted Voicemail artifact is the **primary render source**
- BridgeSession fallback is used only when artifact not yet present
- Inbound vs outbound rendering is correct and consistent
- Timeline contains no duplicate or conflicting voicemail entries

---

## 2. Files in Scope (REQUIRED)

```text
apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts
apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts
apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
```

---

## 3. Required Changes

### 3.1 Artifact-first rendering rule (MANDATORY)

In `threadTimeline.ts`:

- When a Voicemail artifact exists:
  - render from artifact ONLY
  - ignore bridge-session voicemail projection

### 3.2 Fallback rendering rule

- Only render bridge-session voicemail if:
  - artifact does not yet exist
  - recording is known but artifact not persisted

### 3.3 Deduplication key

Define stable key:

```text
voicemail_dedupe_key = provider_recording_id || provider_event_id || (bridge_session_id + provider_leg_id + direction)
```

Timeline must not render two items with same dedupe key.

### 3.4 Merge behavior

If both exist:

- artifact replaces bridge-projected item
- never show both

### 3.5 Directional rendering

- inbound:
  - marked as inbound
  - eligible for unread (handled next checkpoint)
- outbound:
  - marked as outbound
  - never unread

### 3.6 Rendering data source

Timeline must read:

- recording_url
- recording_status
- transcription_text
- transcription_status
- direction

From Voicemail artifact when available.

### 3.7 Sorting stability

- voicemail must appear in correct chronological order
- fallback → artifact transition must not reorder incorrectly

---

## 4. Explicit Non-Changes

Do not:

- change unread logic (next checkpoint)
- modify persistence layer
- modify webhook handling
- add UI features beyond correctness

---

## 5. Tests Required

### Unit

- artifact replaces fallback projection
- duplicate keys suppressed
- inbound/outbound correctly labeled

### Integration

- fallback appears before artifact exists
- artifact replaces fallback after persistence
- no duplicate entries after replay events

### Characterization

- existing timeline entries unaffected
- no regression in message ordering

---

## 6. Stop Condition

Complete only when:

- no duplicate voicemail entries in timeline
- artifact always preferred over fallback
- inbound/outbound rendering correct
- timeline reads from artifact fields

---

## 7. Commit Boundary

```text
feat(connectshyft): enforce artifact-first voicemail rendering and timeline deduplication
```

---

## 8. Verification Commands

```bash
rg "voicemail" apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts
```

```bash
rg "dedupe|duplicate|voicemail" apps/connectshyft-api
```

---

## 9. Outcome

- timeline is clean and deterministic
- no duplicate voicemail entries
- ready for notification/read-state logic
