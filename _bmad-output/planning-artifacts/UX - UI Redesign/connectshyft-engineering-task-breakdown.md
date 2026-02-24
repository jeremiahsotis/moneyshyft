---

```md
# FILE: ConnectShyft-Engineering-Task-Breakdown.md

# ConnectShyft Engineering Task Breakdown (Mapped to MVP Spec)
Project: ConnectShyft
Scope: MVP implementation tasks mapped to locked semantics (lifecycle, routing, activity/engagement, bridge call, audit)
Canonical envelope taxonomy: success | refusal | error

---

## 0) Baseline conventions (lock first)

### 0.1 Envelope taxonomy normalization

- Replace any systemError usage in ConnectShyft module code/contracts with error.
- Shared envelope utilities must support:
  - { success: true, data }
  - { success: false, refusal: { code, message, details? } }
  - { success: false, error: { code, message } }

### 0.2 Deterministic ordering guarantee (adversarial review)

- All list endpoints order deterministically:
  - primary: last_activity_at_utc DESC
  - tie-breaker: id DESC (or created_at_utc DESC)
- Confirm DB indexes include tie-breaker field.

### 0.3 x-test-\* headers posture (adversarial review)

- Honor x-test-\* headers only when ENABLE_TEST_CONNECTSHYFT_FLAGS is enabled.
- Otherwise ignore.

---

## 1) Database + migrations

### 1.1 Create tables, enums, indexes

- Implement migration per ConnectShyft-DB-Migration-SQL.md.
- Confirm constraints:
  - exactly one active thread for (tenant, orgUnit, neighbor) where state != CLOSED and not archived
  - tenant-scoped number uniqueness
  - Twilio SID idempotency uniqueness

### 1.2 Seed orgUnit defaults

- Ensure cs_org_unit_config exists per orgUnit (lazy-create on first access):
  - escalation_baseline_hours = 24
  - inbound_voice_claimed_mode = FORWARD_TO_CLAIMANT (default)

---

## 2) Thread lifecycle + state machine

### 2.1 Ensure-thread endpoint (idempotent)

- POST /connectshyft/threads:
  - return existing active thread (200), else create UNCLAIMED (201)
- Emit audit thread_created on create.

### 2.2 Claim

- Allowed only for UNCLAIMED.
- On claim:
  - state -> CLAIMED
  - set claimed_by_user_id, claimed_at_utc
  - reset escalation: stage=0, count=0, next_evaluation_at_utc = now + X
  - cancel pending escalation notifications (if any)
  - update last_engagement_at_utc = now
  - update last_activity_at_utc = now
  - audit: thread_claimed

### 2.3 Close

- On close:
  - state -> CLOSED, closed_at_utc = now
  - optional closing note stored as timeline system event
  - audit: thread_closed

### 2.4 Reopen on outbound tap (locked)

- On outbound tap from CLOSED (call tap or sms send tap):
  - state CLOSED -> UNCLAIMED
  - reset escalation: stage=0, count=0, next_evaluation_at_utc = now + X
  - reset inactivity: last_engagement_at_utc = now
  - update ordering: last_activity_at_utc = now
  - add timeline system event "Thread Reopened"
  - audit: thread_reopened_by_user

---

## 3) Activity vs engagement timestamps (locked)

### 3.1 last_activity_at_utc updates on

- inbound SMS saved
- outbound SMS accepted
- voicemail artifact created
- bridge call lifecycle events (initiate/connect/complete)
- close note saved

### 3.2 last_engagement_at_utc updates on (YES)

- claim
- outbound SMS accepted
- call tap (including reopen tap)
- inbound SMS accepted

### 3.3 last_engagement_at_utc does NOT update on (NO)

- voicemail-only inbound voice
- missed inbound voice
- intake fallback transfer

---

## 4) Escalation engine (persisted scheduling)

### 4.1 Config

- orgUnit baseline X in integer hours, allowed 1..24, default 24
- progression: X -> 2X -> 3X

### 4.2 Persistence

- Use next_evaluation_at_utc persisted per thread.
- A job runner polls due evaluations (no in-memory timers).

### 4.3 Reset rules

- Reset on claim.
- Reset on auto-claim on successful bridge connect.
- Reset immediately on reopen tap from CLOSED.
- Do not reset on voicemail-only inbound.
- Do not reset on intake fallback transfer.

---

## 5) Bridge call (no WebRTC/SIP)

### 5.1 Bridge initiation endpoint

- POST /threads/{id}/calls/bridge
- If thread CLOSED: perform reopen first (2.4).
- Create cs_bridge_calls row.
- Call Leg1 to volunteer.
- On volunteer answer: call Leg2 to neighbor.

### 5.2 Auto-claim on CONNECTED (locked)

- On CONNECTED:
  - thread auto-claims to initiator
  - reset escalation
  - reset engagement: last_engagement_at_utc = now
  - update last_activity_at_utc = now
  - audit: thread_auto_claimed_on_connect

### 5.3 Manual retry only

- No automatic redial loops.
- Retry is explicit (UI button -> new bridge call attempt).

---

## 6) Inbound voice routing matrix (locked)

### 6.1 Deterministic routing

- No active thread: forward to intake. Does not reopen. Audit intake_fallback_forwarded.
- Active UNCLAIMED: voicemail-only. Create voicemail artifact. Update last_activity_at_utc only.
- Active CLAIMED: orgUnit-configurable; default FORWARD_TO_CLAIMANT. Options:
  - FORWARD_TO_CLAIMANT (default)
  - VOICEMAIL_ONLY
  - FORWARD_TO_INTAKE
- CLOSED: forward to intake. Does not reopen.

---

## 7) Webhooks (Twilio): security + idempotency

### 7.1 Signature validation

- Mandatory on all webhook endpoints.

### 7.2 Idempotency

- Dedupe by:
  - MessageSid (SMS)
  - CallSid (Voice/Voicemail)
  - TranscriptionSid (Transcription)
- Backed by DB unique constraints + transactional upserts.

---

## 8) QA and acceptance tasks

- Tests must explicitly cover:
  - reopen-on-call tap from CLOSED
  - reopen-on-sms send tap from CLOSED
  - activity vs engagement timestamp rules
  - inbound voice routing matrix for each state
  - CLAIMED-mode config defaulting to forward-to-claimant
  - voicemail does not update engagement and does not push into inbox ordering
  - deterministic ordering with tie-breakers
  - x-test-\* headers ignored unless ENABLE_TEST_CONNECTSHYFT_FLAGS enabled
