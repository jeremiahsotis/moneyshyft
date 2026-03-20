# ConnectShyft Communications Overview

## Purpose

ConnectShyft is the communications substrate for ShyftUnity.

It owns:

- conversations
- messages
- MMS attachments
- calls
- voicemails
- call recordings
- sender number routing
- delivery attempts
- timeline projection
- communication-aware identity handling
- lightweight WorkIntent capture

It does not own:

- long-term case workflow
- PeopleCore identity truth
- long-term program or finance workflow

## Long-term positioning

ConnectShyft should work in two modes:

### 1. Standalone now
Before CaseShyft is fully ready, ConnectShyft can act as the operational front door for volunteers and staff.

### 2. Embedded later
Long-term, CaseShyft should become the main operational workspace, with ConnectShyft surfaces embedded inside it.

That means ConnectShyft should be built as a communication domain, not as a second case-management system.

## Core conversation rule

A conversation is anchored to:

- `orgUnit`
- `ContactPoint`

A conversation is not permanently anchored to a Person.

Why:
- identity can change later
- contact points can be shared or reassigned
- communication history must survive identity correction

## Identity-aware communication rules

- conversations may exist without a resolved person
- volunteers may create new neighbors when appropriate
- duplicate friction increases as confidence rises
- very high confidence duplicate creation requires resolver override
- provisional identities are allowed so work can continue while identity is still being resolved

## Communications model

Current canonical communication objects include:

- Conversation
- Message
- MessageAttachment
- DeliveryAttempt
- Call
- Voicemail
- CallRecording
- SenderNumber
- TimelineEvent
- ProviderEvent

## Timeline rules

The timeline is a projection, not source of truth.

It should support:

- mixed-channel chronological rendering
- cursor-based pagination
- date grouping
- light message grouping
- first-class voice and voicemail events
- inline delivery status
- role-aware visibility

## Sender number architecture

Current V1 policy:

- one dedicated sender number per orgUnit/Conference
- return calls and texts route back to the same orgUnit
- no number pooling in V1
- future pooling remains possible without redoing the object model

## Compliance behavior

If a message is blocked for compliance reasons:

- it must not be sent
- it must be clearly marked as failed
- the user must be told why
- the user must be shown what to do next
- the event must be audited

## WorkIntent relationship

WorkIntent exists as a lightweight bridge while CaseShyft is still emerging.

It should never become a second case-management system.

## Near-term next steps

- stabilize the broader ConnectShyft API lane
- isolate legacy debt from new work
- deepen ConnectShyft integration with PeopleCore
- continue building communication surfaces that can later be embedded in CaseShyft
