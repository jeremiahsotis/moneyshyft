CONNECTSHYFT

PRODUCTION-LOCKED SPECIFICATION

Version: 1.0-PROD-LOCK
Date: 2026-02-24
Status: Implementation Authoritative

⸻

0. AUTHORITATIVE LOCKS

The following behaviors are non-negotiable:
	1.	CLOSED → outbound tap reopens same thread (never creates new thread).
	2.	Bridge call is the only outbound call method.
	3.	No auto-retry loops.
	4.	Escalation resets only on:
	•	Explicit claim
	•	Auto-claim on successful bridge connect
	•	Reopen from CLOSED
	5.	Inactivity resets on:
	•	Claim
	•	Outbound SMS send
	•	Call tap
	6.	Voicemail does NOT reset escalation or inactivity.
	7.	Voicemail does NOT move thread from Mine to Inbox.
	8.	Canonical API envelope = success | refusal | error
	9.	Exactly one active thread per (tenant_id, org_unit_id, neighbor_id).
	10.	Deterministic ordering required (no jitter).

⸻

1. DOMAIN MODEL (PERSISTENCE)

1.1 Thread

thread_id (uuid)
tenant_id (uuid)
org_unit_id (uuid)
neighbor_id (uuid)
state ENUM (UNCLAIMED | CLAIMED | CLOSED)
claimed_by_user_id (uuid nullable)
escalation_stage (int 0-3)
escalation_count (int)
next_evaluation_at_utc (timestamp)
last_engagement_at_utc (timestamp)
last_activity_at_utc (timestamp)
last_inbound_cs_number_id (uuid nullable)
preferred_outbound_cs_number_id (uuid nullable)
created_at
updated_at

Unique constraint:

UNIQUE (tenant_id, org_unit_id, neighbor_id)
WHERE state IN (UNCLAIMED, CLAIMED)


⸻

1.2 Neighbor

neighbor_id
tenant_id
first_name
last_name
prefers_texting ENUM (UNKNOWN | YES | NO)
created_at
updated_at


⸻

1.3 NeighborPhone

neighbor_phone_id
neighbor_id
phone_e164
is_primary boolean
is_shared boolean


⸻

1.4 Message

message_id
thread_id
direction ENUM (INBOUND | OUTBOUND)
body
twilio_sid (nullable)
created_at

Unique index:

UNIQUE (twilio_sid)


⸻

1.5 Voicemail

voicemail_id
thread_id
twilio_call_sid
transcription_sid
recording_url
transcript_text
created_at

Unique:

UNIQUE (twilio_call_sid)


⸻

2. LIFECYCLE TABLES

⸻

2.1 Thread State Transitions

Current	Event	New State	Esc Reset	Inactivity Reset
UNCLAIMED	Claim	CLAIMED	YES	YES
UNCLAIMED	Bridge CONNECTED	CLAIMED	YES	YES
UNCLAIMED	Close	CLOSED	NO	NO
CLAIMED	Close	CLOSED	NO	NO
CLOSED	Call Tap	UNCLAIMED	YES	YES
CLOSED	SMS Tap	UNCLAIMED	YES	YES
CLOSED	Inbound SMS	CLOSED	NO	NO
CLOSED	Inbound Call	CLOSED	NO	NO

CLOSED outbound always reopens same thread.
Never creates new thread.

⸻

3. ESCALATION ENGINE

⸻

3.1 Configuration

X = orgUnit baseline (1–24 hours, integer only)
Default = 24 hours

Progression:
Stage 1 = X
Stage 2 = 2X
Stage 3 = 3X

⸻

3.2 Escalation Evaluation Rule

Scheduler runs every minute:

SELECT threads
WHERE state IN (UNCLAIMED, CLAIMED)
AND now >= next_evaluation_at_utc

On evaluation:

If state == UNCLAIMED:
	•	escalation_stage += 1
	•	escalation_count += 1
	•	next_evaluation_at_utc = now + X
	•	emit escalation event

If state == CLAIMED:
	•	do nothing

If state == CLOSED:
	•	ignore

⸻

3.3 What DOES NOT reset escalation
	•	Voicemail-only inbound
	•	Missed inbound call
	•	Intake forward
	•	Reading thread
	•	Viewing thread

⸻

4. BRIDGE CALL STATE MACHINE

⸻

4.1 Internal Call State

INITIATED
VOLUNTEER_RINGING
VOLUNTEER_NO_ANSWER
NEIGHBOR_RINGING
CONNECTED
COMPLETED
FAILED


⸻

4.2 Sequence Diagram (Simplified)
	1.	Volunteer taps Call
	2.	CLOSED? If yes → reopen thread
	3.	System initiates Twilio call leg to volunteer
	4.	If volunteer answers:
	•	initiate second leg to neighbor
	5.	If neighbor answers:
	•	CONNECTED
	•	auto-claim if UNCLAIMED
	6.	If volunteer misses:
	•	VOLUNTEER_NO_ANSWER
	•	show Retry
	7.	No auto-retry

⸻

5. INBOUND ROUTING MATRIX

Condition	Behavior
No active thread	Forward to intake
UNCLAIMED thread exists	Attach inbound SMS or voicemail
CLAIMED thread exists	Attach inbound
CLOSED thread exists (SMS)	Attach to CLOSED
CLOSED thread exists (Voice)	Forward to intake

Inbound voice NEVER reopens CLOSED.

⸻

6. DETERMINISTIC ORDERING

Server returns:

priority_rank (int)
last_activity_at_utc
thread_id

Sorting:

ORDER BY priority_rank ASC,
         last_activity_at_utc DESC,
         thread_id ASC

priority_rank mapping:

Condition	Rank
escalation_stage >= 3	1
escalation_stage == 2	2
escalation_stage == 1	3
new_unread	4
other	5

This prevents jitter.

⸻

7. API CONTRACTS

⸻

7.1 Thread List

GET /api/v1/connectshyft/threads?scope=inbox|mine

Response:

{
  "success": true,
  "data": [
    {
      "thread_id": "...",
      "neighbor": {
         "neighbor_id": "...",
         "first_name": "",
         "last_name": "",
         "prefers_texting": "YES"
      },
      "state": "UNCLAIMED",
      "claimed_by": {
         "user_id": "...",
         "display_name": "Jane Smith"
      },
      "priority_rank": 2,
      "last_activity_at_utc": "...",
      "voicemail_waiting": true
    }
  ]
}


⸻

7.2 Claim

POST /threads/:id/claim

⸻

7.3 Close

POST /threads/:id/close

Body:

{
  "closing_note": "optional"
}


⸻

7.4 Reopen

No explicit endpoint.
Reopen occurs automatically inside:

POST /threads/:id/call
POST /threads/:id/messages

⸻

7.5 Envelope

Always:

{
  "success": true|false,
  "data": {},
  "refusal": {},
  "error": {}
}

No systemError.

⸻

8. AUDIT EVENTS (EXPLICIT)
	•	thread_claimed
	•	thread_auto_claimed_on_connect
	•	thread_closed
	•	thread_reopened_by_user
	•	escalation_triggered
	•	inbound_forwarded_to_intake
	•	prefers_texting_override_used

Each event must include:

tenant_id
org_unit_id
thread_id
actor_user_id (nullable for system)
timestamp


⸻

9. UI ↔ STATE BINDING MATRIX

UI Action	Backend Mutation
Tap Call (CLOSED)	Reopen + call
Tap Send Message (CLOSED)	Reopen + send
Tap Claim	Claim
Tap Close	Close
Receive voicemail	Create voicemail artifact only
Successful connect	Auto-claim


⸻

10. ACCESSIBILITY LOCKS
	•	Minimum 16px body
	•	44px tap targets
	•	No RBAC terminology
	•	No UUID exposure
	•	Verbs on buttons
	•	Labels > icons