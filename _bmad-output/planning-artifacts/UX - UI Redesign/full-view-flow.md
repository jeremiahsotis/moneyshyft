{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .SFNS-Semibold;\f1\fnil\fcharset0 .SFNS-Regular;\f2\fswiss\fcharset0 Helvetica;
\f3\froman\fcharset0 TimesNewRomanPSMT;\f4\fnil\fcharset0 HelveticaNeue-Bold;}
{\colortbl;\red255\green255\blue255;\red14\green14\blue14;}
{\*\expandedcolortbl;;\cssrgb\c6700\c6700\c6700;}
\margl1440\margr1440\vieww12260\viewh13100\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 1\uc0\u65039 \u8419  Full View Flow (Authoritative Behavioral Map)
\f1\b0\fs28 \
\
This is the canonical user flow for ConnectShyft MVP.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 A. Primary Daily Flow (Volunteer)
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Entry \uc0\u8594  Inbox
\f1\b0\fs28 \cf2 \
\pard\tqr\tx260\tx420\li420\fi-420\sl324\slmult1\sb240\partightenfactor0

\f3 \cf2 	1.	User opens app\
	2.	Lands on 
\f4\b \cf2 Inbox
\f1\b0 \

\f3 \cf2 	3.	Sees:\
\pard\tqr\tx500\tx660\li660\fi-660\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	\'93Needs attention soon\'94 threads auto-sorted to top\
	\'95	\'93New\'94 threads\
	\'95	Recently active threads\
\pard\tqr\tx260\tx420\li420\fi-420\sl324\slmult1\sb240\partightenfactor0
\cf2 	4.	Tap thread \uc0\u8594  Thread View\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 B. Thread Flow
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Thread States
\f1\b0\fs28 \cf2 \
\
UNCLAIMED\
CLAIMED\
CLOSED\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Thread View \'96 UNCLAIMED
\f1\b0\fs28 \cf2 \
\
Header:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Neighbor Name\
	\'95	Conference Name\
	\'95	Claimed by: (if claimed, otherwise blank)\
\
Bottom Actions:\
	\'95	Call\
	\'95	Text\
	\'95	Claim\
\
Behavior:\
	\'95	Call \uc0\u8594  Bridge call initiates\
	\'95	On CONNECTED \uc0\u8594  auto-claim\
	\'95	Text \uc0\u8594  Send SMS (does NOT auto-claim unless spec changed)\
	\'95	Claim \uc0\u8594  sets CLAIMED\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Thread View \'96 CLAIMED
\f1\b0\fs28 \cf2 \
\
Header:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Neighbor Name\
	\'95	Claimed by Lucas P.\
\
Bottom Actions:\
	\'95	Call\
	\'95	Text\
	\'95	Close\
\
Inbound voicemail:\
	\'95	Does NOT move thread back to Inbox\
	\'95	Adds blue dot indicator in Mine tab\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 Thread View \'96 CLOSED
\f1\b0\fs28 \cf2 \
\
Bottom Actions:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Call\
	\'95	Send Message\
\
Tap Call or Send Message:\
	\'95	CLOSED \uc0\u8594  UNCLAIMED\
	\'95	thread_reopened_by_user event\
	\'95	escalation_stage = 0\
	\'95	inactivity resets\
	\'95	outbound executes\
\
Inbound to CLOSED:\
	\'95	Goes to intake\
	\'95	Does NOT reopen\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 C. Mine Flow
\f1\b0\fs28 \
\
Mine tab shows:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	All CLAIMED threads by current user\
	\'95	Blue dot if new voicemail\
\
Sorted by:\
	\'95	Most recent activity\
\
No escalation reordering.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 D. Floating + Flow
\f1\b0\fs28 \
\
Available on:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Inbox\
	\'95	Mine\
	\'95	Thread (if neighbor not yet in directory)\
\
Tap + \uc0\u8594  Modal Sheet:\
\
Fields:\
	\'95	First Name\
	\'95	Last Name\
	\'95	Phone (required)\
	\'95	Add another phone\
	\'95	Email (optional)\
	\'95	Address (optional)\
	\'95	Prefers Texting (toggle)\
	\'95	Shared Phone (toggle)\
	\'95	Save\
\
After Save:\
	\'95	If launched from Inbox \uc0\u8594  Start new thread\
	\'95	If launched from Thread \uc0\u8594  Attach to current thread\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 E. Directory Flow (Secondary)
\f1\b0\fs28 \
\
Accessed from:\
More \uc0\u8594  Neighbor Directory\
\
Search neighbors\
\
Tap neighbor:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	View profile\
	\'95	Start conversation\
	\'95	Edit\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 F. Close Flow
\f1\b0\fs28 \
\
Tap Close:\
Modal:\
\
Title: Close conversation?\
Optional note field\
Buttons:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Close\
	\'95	Cancel\
\
Note not required.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 G. OrgUnit Selector (Conditional)
\f1\b0\fs28 \
\
If user has multiple orgUnits:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Dropdown in Inbox header\
	\'95	Modal list selection\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 2\uc0\u65039 \u8419  Component States (Explicit)
\f1\b0\fs28 \
\
This prevents ambiguity during implementation.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 Thread Card States
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 1. Default
\f1\b0\fs28 \cf2 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Name\
	\'95	Preview\
	\'95	Time\
	\'95	Subtle label\
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 2. Needs Attention Soon
\f1\b0\fs28 \cf2 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Soft amber pill\
	\'95	No red\
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 3. New
\f1\b0\fs28 \cf2 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Blue pill\
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 4. Voicemail in Claimed Thread
\f1\b0\fs28 \cf2 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Blue dot indicator\
	\'95	Small voicemail icon\
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 5. Closed
\f1\b0\fs28 \cf2 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Muted styling\
	\'95	No labels\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 Thread Header States
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs30 \cf2 UNCLAIMED
\f1\b0\fs28 \cf2 \
\
Shows:\
Conference Name\
\

\f0\b\fs30 \cf2 CLAIMED
\f1\b0\fs28 \cf2 \
\
Shows:\
Claimed by Lucas P.\
\

\f0\b\fs30 \cf2 CLOSED
\f1\b0\fs28 \cf2 \
\
Shows:\
Closed on [date]\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 Call Flow States
\f1\b0\fs28 \
\
INITIATED\
VOLUNTEER_RINGING\
VOLUNTEER_NO_ANSWER\
NEIGHBOR_RINGING\
CONNECTED\
COMPLETED\
\
UI behavior:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	INITIATED \uc0\u8594  Full screen \'93Calling you\'85\'94\
	\'95	CONNECTED \uc0\u8594  Overlay dismisses\
	\'95	VOLUNTEER_NO_ANSWER \uc0\u8594  Show retry button\
	\'95	No automatic redial\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 Escalation States (UI abstraction)
\f1\b0\fs28 \
\
Engine internal:\
Stage 0\
Stage 1\
Stage 2\
\
UI displays:\
Nothing\
Needs attention soon\
Needs urgent attention (rare)\
\
Escalation resets on:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Claim\
	\'95	Auto-claim\
	\'95	Reopen tap\
\
Does NOT reset on:\
	\'95	Voicemail-only inbound\
	\'95	Missed inbound\
	\'95	Intake fallback\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 Prefers Texting States
\f1\b0\fs28 \
\
UNKNOWN (default)\
YES\
NO\
\
UI:\
Toggle:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Green = YES\
	\'95	Gray = UNKNOWN\
	\'95	Explicit \'93Does not prefer texting\'94 = NO\
\
If NO:\
Outbound SMS requires override reason.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 3\uc0\u65039 \u8419  Final Screen Map (MVP)
\f1\b0\fs28 \
\
Mobile:\
\
Core:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Inbox\
	\'95	Mine\
	\'95	More\
\
More:\
	\'95	Closed Conversations\
	\'95	Neighbor Directory\
	\'95	Settings\
\
Modal Flows:\
	\'95	Add Neighbor\
	\'95	Close Conversation\
	\'95	OrgUnit Selector\
	\'95	Call Status Overlay\
\
Thread:\
	\'95	Thread View\
	\'95	Voicemail Playback\
	\'95	Edit Neighbor\
\
Settings:\
	\'95	Notifications\
	\'95	Display (text size)\
	\'95	Sign Out\
\
No additional dashboards.\
No analytics.\
No metrics page.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 4\uc0\u65039 \u8419  Developer-Ready UX Spec Delta
\f1\b0\fs28 \
\
This is the delta required relative to current planning documents.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 1. Closed Thread Behavior Canonicalization
\f1\b0\fs28 \
\
Update PRD + Architecture:\
\
Replace any reference to:\
\'93New thread created after close\'94\
\
With:\
\
Outbound from CLOSED:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Reopens same thread\
	\'95	Emits thread_reopened_by_user\
	\'95	Resets escalation\
	\'95	Resets inactivity\
\
Inbound to CLOSED:\
	\'95	Routes to intake\
	\'95	Logs audit\
	\'95	Does NOT reopen\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2. UI Labeling Model
\f1\b0\fs28 \
\
Replace stage exposure with:\
\
UI Label Mapping:\
Stage 0 \uc0\u8594  none\
Stage 1 \uc0\u8594  Needs attention soon\
Stage 2 \uc0\u8594  Needs urgent attention\
\
Escalation engine invisible to user.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 3. Voicemail Behavior Clarification
\f1\b0\fs28 \
\
Inbound voicemail:\
If thread CLAIMED:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Do not move to Inbox\
	\'95	Add Mine badge indicator\
\
If UNCLAIMED:\
	\'95	Thread remains in Inbox\
	\'95	Label: Voicemail received\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 4. Floating + Behavior
\f1\b0\fs28 \
\
Define:\
\
FloatingActionButton:\
Visible on:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Inbox\
	\'95	Mine\
\
Opens:\
CreateNeighborModal\
\
If modal saves and no active thread exists:\
Call POST /threads ensure endpoint.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 5. Component Tokenization
\f1\b0\fs28 \
\
All buttons:\
Minimum 48px height\
\
Typography:\
Base body: 18px\
Name: 20px\
Pill text: 14\'9616px\
\
Spacing:\
16px grid system\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 6. Error Handling UX
\f1\b0\fs28 \
\
All API responses follow:\
success\
refusal\
error\
\
UI Mapping:\
\
success \uc0\u8594  proceed\
refusal \uc0\u8594  inline field message\
error \uc0\u8594  non-technical alert:\
\'93Something went wrong. Please try again.\'94\
\
Never expose systemError.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 7. Mobile-First Constraint
\f1\b0\fs28 \
\
All layouts:\
Single column\
No tables\
No multi-pane\
Desktop mirrors mobile with split view only.}