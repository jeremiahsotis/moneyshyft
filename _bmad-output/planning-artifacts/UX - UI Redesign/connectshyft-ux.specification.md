{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .SFNS-Semibold;\f1\fnil\fcharset0 .SFNS-Regular;\f2\fswiss\fcharset0 Helvetica;
\f3\froman\fcharset0 TimesNewRomanPSMT;}
{\colortbl;\red255\green255\blue255;\red14\green14\blue14;}
{\*\expandedcolortbl;;\cssrgb\c6700\c6700\c6700;}
\margl1440\margr1440\vieww12260\viewh5700\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 PART 1
\f1\b0\fs28 \
\

\f0\b\fs44 ConnectShyft UX Specification (Developer-Ready)
\f1\b0\fs28 \
\
Version: MVP-UX-1.0\
Scope: Volunteer-facing ConnectShyft interface\
Platform: Mobile-first (responsive web or hybrid app)\
\
This spec is authoritative for UI behavior. If backend behavior conflicts, this spec governs volunteer experience.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 1. Navigation Model
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 Bottom Navigation (Persistent)
\f1\b0\fs28 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Inbox\
	\'95	Mine\
	\'95	More\
\
Maximum three items. No fourth tab.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 2. Screen Specifications
\f1\b0\fs28 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.1 Inbox
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Purpose
\f1\b0\fs28 \cf2 \
\
Primary working queue for unclaimed and urgent threads.\
\

\f0\b\fs30 \cf2 Layout
\f1\b0\fs28 \cf2 \
\
Header:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	OrgUnit selector (if multi-org)\
	\'95	Subtle summary text: \'933 neighbors need follow-up\'94\
	\'95	Search field: \'93Search neighbors\'94\
\
Thread List:\
Large card layout (minimum 96px height)\
\
Floating + button (bottom right)\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Sorting (Silent Engine Behavior)
\f1\b0\fs28 \cf2 \
\
Ordered by:\
\pard\tqr\tx260\tx420\li420\fi-420\sl324\slmult1\sb240\partightenfactor0

\f3 \cf2 	1.	Needs urgent attention\
	2.	Needs attention soon\
	3.	New\
	4.	Recently active\
	5.	All others\
\
User never sees stage numbers.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Thread Card Contents
\f1\b0\fs28 \cf2 \
\
Required:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Neighbor Name (20px)\
	\'95	Preview snippet (16px)\
	\'95	Time (muted)\
	\'95	Status pill (optional)\
\
Optional pills:\
	\'95	New\
	\'95	Needs attention soon\
	\'95	Needs urgent attention\
	\'95	Voicemail received\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Tap Behavior
\f1\b0\fs28 \cf2 \
\
Tap thread \uc0\u8594  Thread View\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.2 Mine
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Purpose
\f1\b0\fs28 \cf2 \
\
Threads claimed by current volunteer.\
\

\f0\b\fs30 \cf2 Layout
\f1\b0\fs28 \cf2 \
\
Same visual structure as Inbox.\
\
Sorting:\
Most recent activity.\
\

\f0\b\fs30 \cf2 Special Behavior
\f1\b0\fs28 \cf2 \
\
If voicemail received on claimed thread:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Do NOT move thread to Inbox\
	\'95	Add blue dot indicator on card\
	\'95	Add small voicemail icon\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.3 Thread View
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Header
\f1\b0\fs28 \cf2 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Neighbor Name (replace \'93ConnectShyft\'94)\
	\'95	Conference name\
	\'95	Claimed by Lucas P. (if claimed)\
	\'95	Closed on [date] (if closed)\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Timeline
\f1\b0\fs28 \cf2 \
\
Ordered chronologically.\
\
Message Types:\
\
Inbound SMS \uc0\u8594  Gray bubble\
Outbound SMS \uc0\u8594  Brand light bubble\
Voicemail \uc0\u8594  Card with transcript preview\
System event \uc0\u8594  Centered separator\
\
Examples:\
\'97 Conversation reopened \'97\
\'97 Connected via phone call \'97\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Bottom Action Bar
\f1\b0\fs28 \cf2 \
\
State: UNCLAIMED\
Buttons:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Call\
	\'95	Text\
	\'95	Claim\
\
State: CLAIMED\
Buttons:\
	\'95	Call\
	\'95	Text\
	\'95	Close\
\
State: CLOSED\
Buttons:\
	\'95	Call\
	\'95	Send Message\
\
Outbound from CLOSED:\
Reopen immediately.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.4 Floating + Modal (Add Neighbor)
\f1\b0\fs28 \
\
Accessible from:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Inbox\
	\'95	Mine\
\
Modal Fields:\
	\'95	First Name (required)\
	\'95	Last Name (required)\
	\'95	Phone (required)\
	\'95	Add another phone\
	\'95	Email (optional)\
	\'95	Address (optional)\
	\'95	Prefers Texting (toggle: UNKNOWN/YES/NO)\
	\'95	Shared Phone (toggle)\
\
Buttons:\
Cancel\
Save\
\
Save Behavior:\
If no thread exists \uc0\u8594  create thread.\
If thread context present \uc0\u8594  attach neighbor.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.5 Neighbor Directory
\f1\b0\fs28 \
\
Access: More \uc0\u8594  Neighbor Directory\
\
Features:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Search\
	\'95	Alphabetical list\
	\'95	Tap to open profile\
\
Profile View:\
	\'95	Contact info\
	\'95	Prefers texting indicator\
	\'95	Shared phone indicator\
	\'95	Edit\
	\'95	Start conversation\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.6 Close Modal
\f1\b0\fs28 \
\
Optional note field.\
\
Never required.\
\
Close immediately updates state to CLOSED.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.7 Settings
\f1\b0\fs28 \
\
Sections:\
\
Notifications:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Push on new thread\
	\'95	Push on voicemail (claimed)\
	\'95	Escalation reminders\
\
Display:\
	\'95	Text size (Normal / Larger)\
\
Account:\
	\'95	Sign out\
\
No RBAC display.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 3. Behavioral Rules (Authoritative)
\f1\b0\fs28 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 3.1 Closed Reopen Rule
\f1\b0\fs28 \
\
Outbound call or SMS from CLOSED:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	CLOSED \uc0\u8594  UNCLAIMED\
	\'95	Emit thread_reopened_by_user\
	\'95	Reset escalation_stage = 0\
	\'95	Reset escalation_count = 0\
	\'95	Reset inactivity timer\
	\'95	Execute outbound\
	\'95	If bridge connect succeeds \uc0\u8594  auto-claim\
\
Inbound to CLOSED:\
	\'95	Intake fallback\
	\'95	Does not reopen\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 3.2 Escalation UI Mapping
\f1\b0\fs28 \
\
Internal stage \uc0\u8594  UI label\
\
Stage 0 \uc0\u8594  none\
Stage 1 \uc0\u8594  Needs attention soon\
Stage 2 \uc0\u8594  Needs urgent attention\
\
Escalation resets on:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Claim\
	\'95	Auto-claim\
	\'95	Reopen tap\
\
Does not reset on:\
	\'95	Voicemail-only inbound\
	\'95	Missed inbound\
	\'95	Intake fallback\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 3.3 Prefers Texting
\f1\b0\fs28 \
\
Enum:\
UNKNOWN\
YES\
NO\
\
If NO:\
Outbound SMS requires override reason.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 PART 2
\f1\b0\fs28 \
\

\f0\b\fs44 UI Interaction Contract (API + UI Binding)
\f1\b0\fs28 \
\
This ties each screen to backend endpoints.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 1. Inbox
\f1\b0\fs28 \
\
GET /api/v1/connectshyft/threads?scope=inbox\
\
Returns:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	thread_id\
	\'95	state\
	\'95	escalation_stage\
	\'95	last_activity_at\
	\'95	voicemail_flag\
	\'95	claimed_by_user_id\
	\'95	neighbor summary\
\
UI transforms:\
	\'95	escalation_stage \uc0\u8594  pill label\
	\'95	voicemail_flag + claimed_by=current \uc0\u8594  blue dot\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 2. Mine
\f1\b0\fs28 \
\
GET /threads?scope=mine\
\
Filtered server-side:\
claimed_by_user_id = current_user\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 3. Ensure Thread
\f1\b0\fs28 \
\
POST /threads\
\
Input:\
neighbor_id\
org_unit_id\
\
Behavior:\
If active thread exists \uc0\u8594  return existing.\
Else create new.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 4. Add Neighbor
\f1\b0\fs28 \
\
POST /neighbors\
\
Input:\
tenant_id\
org_unit_id\
first_name\
last_name\
phones[]\
prefers_texting\
shared_phone\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 5. Update Neighbor
\f1\b0\fs28 \
\
PATCH /neighbors/\{id\}\
\
Must enforce:\
FR-CS-008\
FR-CS-008a\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 6. Outbound SMS
\f1\b0\fs28 \
\
POST /threads/\{id\}/messages\
\
If state=CLOSED:\
Server must:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Transition to UNCLAIMED\
	\'95	Emit reopen event\
	\'95	Reset escalation\
	\'95	Then send message\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 7. Bridge Call
\f1\b0\fs28 \
\
POST /threads/\{id\}/call\
\
State Machine:\
\
INITIATED\
VOLUNTEER_RINGING\
VOLUNTEER_NO_ANSWER\
NEIGHBOR_RINGING\
CONNECTED\
COMPLETED\
\
On CONNECTED:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	If UNCLAIMED \uc0\u8594  auto-claim\
\
No auto-retry.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 8. Voicemail Webhook
\f1\b0\fs28 \
\
POST /webhooks/twilio/voice\
\
If thread CLAIMED:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Append voicemail\
	\'95	Set voicemail_flag=true\
	\'95	Do NOT alter escalation\
	\'95	Do NOT alter thread state\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 9. Close Thread
\f1\b0\fs28 \
\
POST /threads/\{id\}/close\
\
Optional note\
\
Server:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	state=CLOSED\
	\'95	record closed_at\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 10. Error Envelope
\f1\b0\fs28 \
\
Canonical envelope:\
success\
refusal\
error\
\
UI behavior:\
\
success \uc0\u8594  update view\
refusal \uc0\u8594  inline message\
error \uc0\u8594  non-technical alert\
\
Never expose internal error codes.}