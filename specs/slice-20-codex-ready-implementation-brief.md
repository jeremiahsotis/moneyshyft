# Slice 20 — ConnectShyft Voicemail Fallback (STRICT Codex Execution Brief)

## Status
LOCKED (Non-skippable, repo-verifiable checkpoints)

---

# OBJECTIVE
Implement voicemail fallback with deterministic execution and verifiable persistence.

---

# CHECKPOINT SPEC APPLIED
Each checkpoint MUST:
- Define exact files
- Define exact functions
- Define exact DB mutations
- Define exact success criteria (STOP CONDITION)

---

# CHECKPOINT 0 — DB + SCHEMA (BLOCKING)

FILES:
- shared/database/migrations/*

REQUIRED:
- Add columns to call_sessions:
  telnyx_operator_call_control_id TEXT
  telnyx_neighbor_call_control_id TEXT
  telnyx_voicemail_call_control_id TEXT
  neighbor_ring_started_at TIMESTAMP
  neighbor_timeout_at TIMESTAMP
  voicemail_fallback_started_at TIMESTAMP
  voicemail_recording_url TEXT
  voicemail_recording_status TEXT

STOP CONDITION:
- Migration runs successfully
- Columns exist in DB (verified via select)

---

# CHECKPOINT 1 — SERVICE LAYER FUNCTIONS

FILES:
- apps/connectshyft-api/src/modules/connectshyft/calls.service.ts

REQUIRED:
Implement:
- handleNeighborTimeout(sessionId)
- triggerVoicemailFallback(sessionId)

STOP CONDITION:
- Functions exist
- Functions callable from test harness

---

# CHECKPOINT 2 — TIMEOUT LOGIC

FILES:
- calls.service.ts

REQUIRED:
- Add setTimeout(30000) after neighbor ringing
- Must call handleNeighborTimeout

STOP CONDITION:
- Timeout fires in test
- State transitions to neighbor_timeout

---

# CHECKPOINT 3 — VOICEMAIL FALLBACK CALL

FILES:
- calls.service.ts

REQUIRED:
- Call Telnyx API
- Persist telnyx_voicemail_call_control_id
- Update state

STOP CONDITION:
- DB updated with control ID
- No duplicate calls

---

# CHECKPOINT 4 — WEBHOOK HANDLER

FILES:
- apps/connectshyft-api/src/modules/connectshyft/webhooks/telnyx.webhook.ts

REQUIRED:
- Implement handler for call.recording.saved
- Lookup session by ANY control ID
- Only attach if voicemail leg

STOP CONDITION:
- Recording attaches correctly
- Non-voicemail ignored

---

# CHECKPOINT 5 — THREAD ATTACHMENT

FILES:
- thread.service.ts

REQUIRED:
- attachVoicemailToThread()

STOP CONDITION:
- Thread contains voicemail record

---

# CHECKPOINT 6 — IDEMPOTENCY

FILES:
- calls.service.ts
- webhook handler

REQUIRED:
- Guards against duplicate fallback
- Guards against duplicate recording

STOP CONDITION:
- Duplicate events produce no duplicate rows

---

# CHECKPOINT 7 — TESTS

FILES:
- __tests__/calls.voicemail.test.ts

REQUIRED:
- 5 test scenarios

STOP CONDITION:
- All tests pass

---

# CHECKPOINT 8 — MANUAL VALIDATION

REQUIRED:
- Place real call
- Let timeout trigger
- Leave voicemail
- Confirm recording attached

STOP CONDITION:
- End-to-end success confirmed

---

# DEFINITION OF DONE
- Deterministic fallback
- Recording reliably attached
- No duplicate behavior
