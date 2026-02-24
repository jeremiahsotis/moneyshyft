project_lane: connectshyft

{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .SFNS-Semibold;\f1\fnil\fcharset0 .SFNS-Regular;\f2\fswiss\fcharset0 Helvetica;
\f3\fnil\fcharset0 HelveticaNeue-Bold;\f4\froman\fcharset0 TimesNewRomanPSMT;\f5\fmodern\fcharset0 Courier;
\f6\fnil\fcharset0 .SFNS-Bold;}
{\colortbl;\red255\green255\blue255;\red14\green14\blue14;\red0\green0\blue0;\red20\green0\blue196;
\red181\green0\blue19;\red151\green0\blue126;}
{\*\expandedcolortbl;;\cssrgb\c6700\c6700\c6700;\csgray\c0;\cssrgb\c10980\c0\c81176;
\cssrgb\c76863\c10196\c8627;\cssrgb\c66667\c5098\c56863;}
\margl1440\margr1440\vieww12260\viewh3240\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 CONNECTSHYFT
\f1\b0\fs28 \
\

\f0\b\fs44 PRODUCTION-LOCKED SPECIFICATION
\f1\b0\fs28 \
\
Version: 1.0-PROD-LOCK\
Date: 2026-02-24\
Status: Implementation Authoritative\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 0. AUTHORITATIVE LOCKS
\f1\b0\fs28 \
\
The following behaviors are 
\f3\b non-negotiable
\f1\b0 :\
\pard\tqr\tx440\tx600\li600\fi-600\sl324\slmult1\sb240\partightenfactor0

\f4 \cf2 	1.	CLOSED \uc0\u8594  outbound tap reopens same thread (never creates new thread).\
	2.	Bridge call is the only outbound call method.\
	3.	No auto-retry loops.\
	4.	Escalation resets only on:\
\pard\tqr\tx500\tx660\li660\fi-660\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Explicit claim\
	\'95	Auto-claim on successful bridge connect\
	\'95	Reopen from CLOSED\
\pard\tqr\tx440\tx600\li600\fi-600\sl324\slmult1\sb240\partightenfactor0
\cf2 	5.	Inactivity resets on:\
\pard\tqr\tx500\tx660\li660\fi-660\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Claim\
	\'95	Outbound SMS send\
	\'95	Call tap\
\pard\tqr\tx440\tx600\li600\fi-600\sl324\slmult1\sb240\partightenfactor0
\cf2 	6.	Voicemail does NOT reset escalation or inactivity.\
	7.	Voicemail does NOT move thread from Mine to Inbox.\
	8.	Canonical API envelope = success | refusal | error\
	9.	Exactly one active thread per (tenant_id, org_unit_id, neighbor_id).\
	10.	Deterministic ordering required (no jitter).\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 1. DOMAIN MODEL (PERSISTENCE)
\f1\b0\fs28 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 1.1 Thread
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 thread_id (uuid)\
tenant_id (uuid)\
org_unit_id (uuid)\
neighbor_id (uuid)\
state ENUM (UNCLAIMED | CLAIMED | CLOSED)\
claimed_by_user_id (uuid nullable)\
escalation_stage (int \cf4 0\cf3 -\cf4 3\cf3 )\
escalation_count (int)\
next_evaluation_at_utc (timestamp)\
last_engagement_at_utc (timestamp)\
last_activity_at_utc (timestamp)\
last_inbound_cs_number_id (uuid nullable)\
preferred_outbound_cs_number_id (uuid nullable)\
created_at\
updated_at
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 Unique constraint:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 UNIQUE (tenant_id, org_unit_id, neighbor_id)\
WHERE state IN (UNCLAIMED, CLAIMED)
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 1.2 Neighbor
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 neighbor_id\
tenant_id\
first_name\
last_name\
prefers_texting ENUM (UNKNOWN | YES | NO)\
created_at\
updated_at
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 1.3 NeighborPhone
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 neighbor_phone_id\
neighbor_id\
phone_e164\
is_primary boolean\
is_shared boolean
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 1.4 Message
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 message_id\
thread_id\
direction ENUM (INBOUND | OUTBOUND)\
body\
twilio_sid (nullable)\
created_at
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 Unique index:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 UNIQUE (twilio_sid)
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 1.5 Voicemail
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 voicemail_id\
thread_id\
twilio_call_sid\
transcription_sid\
recording_url\
transcript_text\
created_at
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 Unique:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 UNIQUE (twilio_call_sid)
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 2. LIFECYCLE TABLES
\f1\b0\fs28 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 2.1 Thread State Transitions
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f6\b\fs26 \cf2 Current
\f2\b0\fs24 \cf0 	
\f6\b\fs26 \cf2 Event
\f2\b0\fs24 \cf0 	
\f6\b\fs26 \cf2 New State
\f2\b0\fs24 \cf0 	
\f6\b\fs26 \cf2 Esc Reset
\f2\b0\fs24 \cf0 	
\f6\b\fs26 \cf2 Inactivity Reset
\f2\b0\fs24 \cf0 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs26 \cf2 UNCLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Claim
\f2\fs24 \cf0 	
\f1\fs26 \cf2 CLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 \

\f1\fs26 \cf2 UNCLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Bridge CONNECTED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 CLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 \

\f1\fs26 \cf2 UNCLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Close
\f2\fs24 \cf0 	
\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Close
\f2\fs24 \cf0 	
\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Call Tap
\f2\fs24 \cf0 	
\f1\fs26 \cf2 UNCLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 SMS Tap
\f2\fs24 \cf0 	
\f1\fs26 \cf2 UNCLAIMED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 	
\f1\fs26 \cf2 YES
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Inbound SMS
\f2\fs24 \cf0 	
\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Inbound Call
\f2\fs24 \cf0 	
\f1\fs26 \cf2 CLOSED
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 	
\f1\fs26 \cf2 NO
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 CLOSED outbound always reopens same thread.\
Never creates new thread.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 3. ESCALATION ENGINE
\f1\b0\fs28 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 3.1 Configuration
\f1\b0\fs28 \
\
X = orgUnit baseline (1\'9624 hours, integer only)\
Default = 24 hours\
\
Progression:\
Stage 1 = X\
Stage 2 = 2X\
Stage 3 = 3X\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 3.2 Escalation Evaluation Rule
\f1\b0\fs28 \
\
Scheduler runs every minute:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 SELECT threads\
WHERE state IN (UNCLAIMED, CLAIMED)\
AND now >= next_evaluation_at_utc
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 On evaluation:\
\
If state == UNCLAIMED:\
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	escalation_stage += 1\
	\'95	escalation_count += 1\
	\'95	next_evaluation_at_utc = now + X\
	\'95	emit escalation event\
\
If state == CLAIMED:\
	\'95	do nothing\
\
If state == CLOSED:\
	\'95	ignore\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 3.3 What DOES NOT reset escalation
\f1\b0\fs28 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Voicemail-only inbound\
	\'95	Missed inbound call\
	\'95	Intake forward\
	\'95	Reading thread\
	\'95	Viewing thread\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 4. BRIDGE CALL STATE MACHINE
\f1\b0\fs28 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 4.1 Internal Call State
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 INITIATED\
VOLUNTEER_RINGING\
VOLUNTEER_NO_ANSWER\
NEIGHBOR_RINGING\
CONNECTED\
COMPLETED\
FAILED
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 4.2 Sequence Diagram (Simplified)
\f1\b0\fs28 \
\pard\tqr\tx260\tx420\li420\fi-420\sl324\slmult1\sb240\partightenfactor0

\f4 \cf2 	1.	Volunteer taps Call\
	2.	CLOSED? If yes \uc0\u8594  reopen thread\
	3.	System initiates Twilio call leg to volunteer\
	4.	If volunteer answers:\
\pard\tqr\tx500\tx660\li660\fi-660\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	initiate second leg to neighbor\
\pard\tqr\tx260\tx420\li420\fi-420\sl324\slmult1\sb240\partightenfactor0
\cf2 	5.	If neighbor answers:\
\pard\tqr\tx500\tx660\li660\fi-660\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	CONNECTED\
	\'95	auto-claim if UNCLAIMED\
\pard\tqr\tx260\tx420\li420\fi-420\sl324\slmult1\sb240\partightenfactor0
\cf2 	6.	If volunteer misses:\
\pard\tqr\tx500\tx660\li660\fi-660\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	VOLUNTEER_NO_ANSWER\
	\'95	show Retry\
\pard\tqr\tx260\tx420\li420\fi-420\sl324\slmult1\sb240\partightenfactor0
\cf2 	7.	No auto-retry\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 5. INBOUND ROUTING MATRIX
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f6\b\fs26 \cf2 Condition
\f2\b0\fs24 \cf0 	
\f6\b\fs26 \cf2 Behavior
\f2\b0\fs24 \cf0 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs26 \cf2 No active thread
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Forward to intake
\f2\fs24 \cf0 \

\f1\fs26 \cf2 UNCLAIMED thread exists
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Attach inbound SMS or voicemail
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLAIMED thread exists
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Attach inbound
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLOSED thread exists (SMS)
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Attach to CLOSED
\f2\fs24 \cf0 \

\f1\fs26 \cf2 CLOSED thread exists (Voice)
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Forward to intake
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 Inbound voice NEVER reopens CLOSED.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 6. DETERMINISTIC ORDERING
\f1\b0\fs28 \
\
Server returns:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 priority_rank (int)\
last_activity_at_utc\
thread_id
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 Sorting:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 ORDER BY priority_rank ASC,\
         last_activity_at_utc DESC,\
         thread_id ASC
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 priority_rank mapping:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f6\b\fs26 \cf2 Condition
\f2\b0\fs24 \cf0 	
\f6\b\fs26 \cf2 Rank
\f2\b0\fs24 \cf0 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs26 \cf2 escalation_stage >= 3
\f2\fs24 \cf0 	
\f1\fs26 \cf2 1
\f2\fs24 \cf0 \

\f1\fs26 \cf2 escalation_stage == 2
\f2\fs24 \cf0 	
\f1\fs26 \cf2 2
\f2\fs24 \cf0 \

\f1\fs26 \cf2 escalation_stage == 1
\f2\fs24 \cf0 	
\f1\fs26 \cf2 3
\f2\fs24 \cf0 \

\f1\fs26 \cf2 new_unread
\f2\fs24 \cf0 	
\f1\fs26 \cf2 4
\f2\fs24 \cf0 \

\f1\fs26 \cf2 other
\f2\fs24 \cf0 	
\f1\fs26 \cf2 5
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 This prevents jitter.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 7. API CONTRACTS
\f1\b0\fs28 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 7.1 Thread List
\f1\b0\fs28 \
\
GET /api/v1/connectshyft/threads?scope=inbox|mine\
\
Response:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 \{\
  \cf5 "success"\cf3 : \cf6 true\cf3 ,\
  \cf5 "data"\cf3 : [\
    \{\
      \cf5 "thread_id"\cf3 : \cf5 "..."\cf3 ,\
      \cf5 "neighbor"\cf3 : \{\
         \cf5 "neighbor_id"\cf3 : \cf5 "..."\cf3 ,\
         \cf5 "first_name"\cf3 : \cf5 ""\cf3 ,\
         \cf5 "last_name"\cf3 : \cf5 ""\cf3 ,\
         \cf5 "prefers_texting"\cf3 : \cf5 "YES"\cf3 \
      \},\
      \cf5 "state"\cf3 : \cf5 "UNCLAIMED"\cf3 ,\
      \cf5 "claimed_by"\cf3 : \{\
         \cf5 "user_id"\cf3 : \cf5 "..."\cf3 ,\
         \cf5 "display_name"\cf3 : \cf5 "Jane Smith"\cf3 \
      \},\
      \cf5 "priority_rank"\cf3 : \cf4 2\cf3 ,\
      \cf5 "last_activity_at_utc"\cf3 : \cf5 "..."\cf3 ,\
      \cf5 "voicemail_waiting"\cf3 : \cf6 true\cf3 \
    \}\
  ]\
\}
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 7.2 Claim
\f1\b0\fs28 \
\
POST /threads/:id/claim\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 7.3 Close
\f1\b0\fs28 \
\
POST /threads/:id/close\
\
Body:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 \{\
  \cf5 "closing_note"\cf3 : \cf5 "optional"\cf3 \
\}
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 7.4 Reopen
\f1\b0\fs28 \
\
No explicit endpoint.\
Reopen occurs automatically inside:\
\
POST /threads/:id/call\
POST /threads/:id/messages\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs34 \cf2 7.5 Envelope
\f1\b0\fs28 \
\
Always:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 \{\
  \cf5 "success"\cf3 : \cf6 true\cf3 |\cf6 false\cf3 ,\
  \cf5 "data"\cf3 : \{\},\
  \cf5 "refusal"\cf3 : \{\},\
  \cf5 "error"\cf3 : \{\}\
\}
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 No systemError.\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f2\fs24 \cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 8. AUDIT EVENTS (EXPLICIT)
\f1\b0\fs28 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	thread_claimed\
	\'95	thread_auto_claimed_on_connect\
	\'95	thread_closed\
	\'95	thread_reopened_by_user\
	\'95	escalation_triggered\
	\'95	inbound_forwarded_to_intake\
	\'95	prefers_texting_override_used\
\
Each event must include:
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f5\fs28 \cf3 tenant_id\
org_unit_id\
thread_id\
actor_user_id (nullable \cf6 for\cf3  system)\
timestamp
\f2\fs24 \cf0 \
\
\
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 9. UI \uc0\u8596  STATE BINDING MATRIX
\f2\b0\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f6\b\fs26 \cf2 UI Action
\f2\b0\fs24 \cf0 	
\f6\b\fs26 \cf2 Backend Mutation
\f2\b0\fs24 \cf0 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs26 \cf2 Tap Call (CLOSED)
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Reopen + call
\f2\fs24 \cf0 \

\f1\fs26 \cf2 Tap Send Message (CLOSED)
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Reopen + send
\f2\fs24 \cf0 \

\f1\fs26 \cf2 Tap Claim
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Claim
\f2\fs24 \cf0 \

\f1\fs26 \cf2 Tap Close
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Close
\f2\fs24 \cf0 \

\f1\fs26 \cf2 Receive voicemail
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Create voicemail artifact only
\f2\fs24 \cf0 \

\f1\fs26 \cf2 Successful connect
\f2\fs24 \cf0 	
\f1\fs26 \cf2 Auto-claim
\f2\fs24 \cf0 \
\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0
\cf0 \
\uc0\u11835 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f1\fs28 \cf2 \
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\sl324\slmult1\pardirnatural\partightenfactor0

\f0\b\fs44 \cf2 10. ACCESSIBILITY LOCKS
\f1\b0\fs28 \
\pard\tqr\tx100\tx260\li260\fi-260\sl324\slmult1\sb240\partightenfactor0
\cf2 	\'95	Minimum 16px body\
	\'95	44px tap targets\
	\'95	No RBAC terminology\
	\'95	No UUID exposure\
	\'95	Verbs on buttons\
	\'95	Labels > icons}