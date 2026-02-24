1️⃣ Full View Flow (Authoritative Behavioral Map)

This is the canonical user flow for ConnectShyft MVP.

⸻

A. Primary Daily Flow (Volunteer)

Entry → Inbox
	1.	User opens app
	2.	Lands on Inbox
	3.	Sees:
	•	“Needs attention soon” threads auto-sorted to top
	•	“New” threads
	•	Recently active threads
	4.	Tap thread → Thread View

⸻

B. Thread Flow

Thread States

UNCLAIMED
CLAIMED
CLOSED

⸻

Thread View – UNCLAIMED

Header:
	•	Neighbor Name
	•	Conference Name
	•	Claimed by: (if claimed, otherwise blank)

Bottom Actions:
	•	Call
	•	Text
	•	Claim

Behavior:
	•	Call → Bridge call initiates
	•	On CONNECTED → auto-claim
	•	Text → Send SMS (does NOT auto-claim unless spec changed)
	•	Claim → sets CLAIMED

⸻

Thread View – CLAIMED

Header:
	•	Neighbor Name
	•	Claimed by Lucas P.

Bottom Actions:
	•	Call
	•	Text
	•	Close

Inbound voicemail:
	•	Does NOT move thread back to Inbox
	•	Adds blue dot indicator in Mine tab

⸻

Thread View – CLOSED

Bottom Actions:
	•	Call
	•	Send Message

Tap Call or Send Message:
	•	CLOSED → UNCLAIMED
	•	thread_reopened_by_user event
	•	escalation_stage = 0
	•	inactivity resets
	•	outbound executes

Inbound to CLOSED:
	•	Goes to intake
	•	Does NOT reopen

⸻

C. Mine Flow

Mine tab shows:
	•	All CLAIMED threads by current user
	•	Blue dot if new voicemail

Sorted by:
	•	Most recent activity

No escalation reordering.

⸻

D. Floating + Flow

Available on:
	•	Inbox
	•	Mine
	•	Thread (if neighbor not yet in directory)

Tap + → Modal Sheet:

Fields:
	•	First Name
	•	Last Name
	•	Phone (required)
	•	Add another phone
	•	Email (optional)
	•	Address (optional)
	•	Prefers Texting (toggle)
	•	Shared Phone (toggle)
	•	Save

After Save:
	•	If launched from Inbox → Start new thread
	•	If launched from Thread → Attach to current thread

⸻

E. Directory Flow (Secondary)

Accessed from:
More → Neighbor Directory

Search neighbors

Tap neighbor:
	•	View profile
	•	Start conversation
	•	Edit

⸻

F. Close Flow

Tap Close:
Modal:

Title: Close conversation?
Optional note field
Buttons:
	•	Close
	•	Cancel

Note not required.

⸻

G. OrgUnit Selector (Conditional)

If user has multiple orgUnits:
	•	Dropdown in Inbox header
	•	Modal list selection

⸻

2️⃣ Component States (Explicit)

This prevents ambiguity during implementation.

⸻

Thread Card States

1. Default
	•	Name
	•	Preview
	•	Time
	•	Subtle label

2. Needs Attention Soon
	•	Soft amber pill
	•	No red

3. New
	•	Blue pill

4. Voicemail in Claimed Thread
	•	Blue dot indicator
	•	Small voicemail icon

5. Closed
	•	Muted styling
	•	No labels

⸻

Thread Header States

UNCLAIMED

Shows:
Conference Name

CLAIMED

Shows:
Claimed by Lucas P.

CLOSED

Shows:
Closed on [date]

⸻

Call Flow States

INITIATED
VOLUNTEER_RINGING
VOLUNTEER_NO_ANSWER
NEIGHBOR_RINGING
CONNECTED
COMPLETED

UI behavior:
	•	INITIATED → Full screen “Calling you…”
	•	CONNECTED → Overlay dismisses
	•	VOLUNTEER_NO_ANSWER → Show retry button
	•	No automatic redial

⸻

Escalation States (UI abstraction)

Engine internal:
Stage 0
Stage 1
Stage 2

UI displays:
Nothing
Needs attention soon
Needs urgent attention (rare)

Escalation resets on:
	•	Claim
	•	Auto-claim
	•	Reopen tap

Does NOT reset on:
	•	Voicemail-only inbound
	•	Missed inbound
	•	Intake fallback

⸻

Prefers Texting States

UNKNOWN (default)
YES
NO

UI:
Toggle:
	•	Green = YES
	•	Gray = UNKNOWN
	•	Explicit “Does not prefer texting” = NO

If NO:
Outbound SMS requires override reason.

⸻

3️⃣ Final Screen Map (MVP)

Mobile:

Core:
	•	Inbox
	•	Mine
	•	More

More:
	•	Closed Conversations
	•	Neighbor Directory
	•	Settings

Modal Flows:
	•	Add Neighbor
	•	Close Conversation
	•	OrgUnit Selector
	•	Call Status Overlay

Thread:
	•	Thread View
	•	Voicemail Playback
	•	Edit Neighbor

Settings:
	•	Notifications
	•	Display (text size)
	•	Sign Out

No additional dashboards.
No analytics.
No metrics page.

⸻

4️⃣ Developer-Ready UX Spec Delta

This is the delta required relative to current planning documents.

⸻

1. Closed Thread Behavior Canonicalization

Update PRD + Architecture:

Replace any reference to:
“New thread created after close”

With:

Outbound from CLOSED:
	•	Reopens same thread
	•	Emits thread_reopened_by_user
	•	Resets escalation
	•	Resets inactivity

Inbound to CLOSED:
	•	Routes to intake
	•	Logs audit
	•	Does NOT reopen

⸻

2. UI Labeling Model

Replace stage exposure with:

UI Label Mapping:
Stage 0 → none
Stage 1 → Needs attention soon
Stage 2 → Needs urgent attention

Escalation engine invisible to user.

⸻

3. Voicemail Behavior Clarification

Inbound voicemail:
If thread CLAIMED:
	•	Do not move to Inbox
	•	Add Mine badge indicator

If UNCLAIMED:
	•	Thread remains in Inbox
	•	Label: Voicemail received

⸻

4. Floating + Behavior

Define:

FloatingActionButton:
Visible on:
	•	Inbox
	•	Mine

Opens:
CreateNeighborModal

If modal saves and no active thread exists:
Call POST /threads ensure endpoint.

⸻

5. Component Tokenization

All buttons:
Minimum 48px height

Typography:
Base body: 18px
Name: 20px
Pill text: 14–16px

Spacing:
16px grid system

⸻

6. Error Handling UX

All API responses follow:
success
refusal
error

UI Mapping:

success → proceed
refusal → inline field message
error → non-technical alert:
“Something went wrong. Please try again.”

Never expose systemError.

⸻

7. Mobile-First Constraint

All layouts:
Single column
No tables
No multi-pane
Desktop mirrors mobile with split view only.