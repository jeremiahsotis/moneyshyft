# Data Contract Context

## Domain objects involved

### Communication
A single inbound or outbound communication record.

Examples:
- one inbound call
- one SMS/MMS message
- one email message

### Conversation
A channel-aware thread/session object.

Examples:
- SMS thread
- email thread
- webchat session/thread

### Submission
A structured inbound record representing a website form or contact form submission.

### TriageItem
The queueable intake object staff act on.

May reference:
- communication
- conversation
- submission

### Assignment
Represents triage ownership or routing state.

### PersonRef / HouseholdRef
References into PeopleCore.

### CaseRef
Reference to a case record in CaseShyft.

### ProgramRef
Reference to a program participation/inquiry context in ProgramShyft.

## Important fields

### Communication
- communication_id
- tenant_id
- channel_type
- direction
- received_at
- sender identifiers
- body / content reference
- attachment metadata if any
- conversation_id optional
- triage_state
- person_id optional
- household_id optional
- case_id optional
- program_id optional

### Conversation
- conversation_id
- channel_type
- external_thread_key optional
- participants
- last_activity_at
- assignment_state
- triage_state

### Submission
- submission_id
- form_type
- source_page
- payload
- attachment metadata
- received_at
- triage_state
- assigned_to optional
- person_id optional
- case_id optional
- program_id optional

### TriageItem
- triage_item_id
- source_type (communication / conversation / submission)
- source_id
- triage_status
- assigned_user_id optional
- assigned_team_id optional
- priority optional
- linked_person_id optional
- linked_household_id optional
- linked_case_id optional
- linked_program_id optional
- created_at
- updated_at

## State model

### triage_status values
- new
- unassigned
- in_review
- assigned
- attached
- converted
- escalated
- resolved
- spam_or_invalid

### assignment_state values
- unassigned
- assigned_user
- assigned_team
- transferred
- escalated

## API / event touchpoints

Potential events:
- communication_received
- conversation_updated
- form_submission_received
- triage_item_created
- triage_item_assigned
- triage_item_escalated
- triage_item_attached_to_case
- triage_item_attached_to_program
- triage_item_linked_to_person