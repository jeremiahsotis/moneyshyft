PART 1

ConnectShyft UX Specification (Developer-Ready)

Version: MVP-UX-1.0
Scope: Volunteer-facing ConnectShyft interface
Platform: Mobile-first (responsive web or hybrid app)

This spec is authoritative for UI behavior. If backend behavior conflicts, this spec governs volunteer experience.

⸻

1. Navigation Model

Bottom Navigation (Persistent)
	•	Inbox
	•	Mine
	•	More

Maximum three items. No fourth tab.

⸻

2. Screen Specifications

⸻

2.1 Inbox

Purpose

Primary working queue for unclaimed and urgent threads.

Layout

Header:
	•	OrgUnit selector (if multi-org)
	•	Subtle summary text: “3 neighbors need follow-up”
	•	Search field: “Search neighbors”

Thread List:
Large card layout (minimum 96px height)

Floating + button (bottom right)

⸻

Sorting (Silent Engine Behavior)

Ordered by:
	1.	Needs urgent attention
	2.	Needs attention soon
	3.	New
	4.	Recently active
	5.	All others

User never sees stage numbers.

⸻

Thread Card Contents

Required:
	•	Neighbor Name (20px)
	•	Preview snippet (16px)
	•	Time (muted)
	•	Status pill (optional)

Optional pills:
	•	New
	•	Needs attention soon
	•	Needs urgent attention
	•	Voicemail received

⸻

Tap Behavior

Tap thread → Thread View

⸻

2.2 Mine

Purpose

Threads claimed by current volunteer.

Layout

Same visual structure as Inbox.

Sorting:
Most recent activity.

Special Behavior

If voicemail received on claimed thread:
	•	Do NOT move thread to Inbox
	•	Add blue dot indicator on card
	•	Add small voicemail icon

⸻

2.3 Thread View

Header
	•	Neighbor Name (replace “ConnectShyft”)
	•	Conference name
	•	Claimed by Lucas P. (if claimed)
	•	Closed on [date] (if closed)

⸻

Timeline

Ordered chronologically.

Message Types:

Inbound SMS → Gray bubble
Outbound SMS → Brand light bubble
Voicemail → Card with transcript preview
System event → Centered separator

Examples:
— Conversation reopened —
— Connected via phone call —

⸻

Bottom Action Bar

State: UNCLAIMED
Buttons:
	•	Call
	•	Text
	•	Claim

State: CLAIMED
Buttons:
	•	Call
	•	Text
	•	Close

State: CLOSED
Buttons:
	•	Call
	•	Send Message

Outbound from CLOSED:
Reopen immediately.

⸻

2.4 Floating + Modal (Add Neighbor)

Accessible from:
	•	Inbox
	•	Mine

Modal Fields:
	•	First Name (required)
	•	Last Name (required)
	•	Phone (required)
	•	Add another phone
	•	Email (optional)
	•	Address (optional)
	•	Prefers Texting (toggle: UNKNOWN/YES/NO)
	•	Shared Phone (toggle)

Buttons:
Cancel
Save

Save Behavior:
If no thread exists → create thread.
If thread context present → attach neighbor.

⸻

2.5 Neighbor Directory

Access: More → Neighbor Directory

Features:
	•	Search
	•	Alphabetical list
	•	Tap to open profile

Profile View:
	•	Contact info
	•	Prefers texting indicator
	•	Shared phone indicator
	•	Edit
	•	Start conversation

⸻

2.6 Close Modal

Optional note field.

Never required.

Close immediately updates state to CLOSED.

⸻

2.7 Settings

Sections:

Notifications:
	•	Push on new thread
	•	Push on voicemail (claimed)
	•	Escalation reminders

Display:
	•	Text size (Normal / Larger)

Account:
	•	Sign out

No RBAC display.

⸻

3. Behavioral Rules (Authoritative)

⸻

3.1 Closed Reopen Rule

Outbound call or SMS from CLOSED:
	•	CLOSED → UNCLAIMED
	•	Emit thread_reopened_by_user
	•	Reset escalation_stage = 0
	•	Reset escalation_count = 0
	•	Reset inactivity timer
	•	Execute outbound
	•	If bridge connect succeeds → auto-claim

Inbound to CLOSED:
	•	Intake fallback
	•	Does not reopen

⸻

3.2 Escalation UI Mapping

Internal stage → UI label

Stage 0 → none
Stage 1 → Needs attention soon
Stage 2 → Needs urgent attention

Escalation resets on:
	•	Claim
	•	Auto-claim
	•	Reopen tap

Does not reset on:
	•	Voicemail-only inbound
	•	Missed inbound
	•	Intake fallback

⸻

3.3 Prefers Texting

Enum:
UNKNOWN
YES
NO

If NO:
Outbound SMS requires override reason.

⸻

PART 2

UI Interaction Contract (API + UI Binding)

This ties each screen to backend endpoints.

⸻

1. Inbox

GET /api/v1/connectshyft/threads?scope=inbox

Returns:
	•	thread_id
	•	state
	•	escalation_stage
	•	last_activity_at
	•	voicemail_flag
	•	claimed_by_user_id
	•	neighbor summary

UI transforms:
	•	escalation_stage → pill label
	•	voicemail_flag + claimed_by=current → blue dot

⸻

2. Mine

GET /threads?scope=mine

Filtered server-side:
claimed_by_user_id = current_user

⸻

3. Ensure Thread

POST /threads

Input:
neighbor_id
org_unit_id

Behavior:
If active thread exists → return existing.
Else create new.

⸻

4. Add Neighbor

POST /neighbors

Input:
tenant_id
org_unit_id
first_name
last_name
phones[]
prefers_texting
shared_phone

⸻

5. Update Neighbor

PATCH /neighbors/{id}

Must enforce:
FR-CS-008
FR-CS-008a

⸻

6. Outbound SMS

POST /threads/{id}/messages

If state=CLOSED:
Server must:
	•	Transition to UNCLAIMED
	•	Emit reopen event
	•	Reset escalation
	•	Then send message

⸻

7. Bridge Call

POST /threads/{id}/call

State Machine:

INITIATED
VOLUNTEER_RINGING
VOLUNTEER_NO_ANSWER
NEIGHBOR_RINGING
CONNECTED
COMPLETED

On CONNECTED:
	•	If UNCLAIMED → auto-claim

No auto-retry.

⸻

8. Voicemail Webhook

POST /webhooks/twilio/voice

If thread CLAIMED:
	•	Append voicemail
	•	Set voicemail_flag=true
	•	Do NOT alter escalation
	•	Do NOT alter thread state

⸻

9. Close Thread

POST /threads/{id}/close

Optional note

Server:
	•	state=CLOSED
	•	record closed_at

⸻

10. Error Envelope

Canonical envelope:
success
refusal
error

UI behavior:

success → update view
refusal → inline message
error → non-technical alert

Never expose internal error codes.