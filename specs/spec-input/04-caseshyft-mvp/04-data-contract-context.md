# Data Contract Context

## Domain objects involved

### Case
Primary operational record for ongoing support work.

Important fields:
- case_id
- tenant_id
- person_id optional
- household_id optional
- case_type
- case_status
- assigned_user_id optional
- assigned_team_id optional
- opened_at
- closed_at optional
- created_by
- created_at
- updated_at

### CaseNote
Timestamped authored note attached to a case.

Important fields:
- case_note_id
- case_id
- author_user_id
- body
- note_type optional
- created_at

### CaseTask
Follow-up task attached to a case.

Important fields:
- case_task_id
- case_id
- title
- description optional
- task_status
- assigned_user_id optional
- due_at optional
- created_at
- updated_at

### CaseServiceItem
Structured service/support action record for MVP.

Important fields:
- case_service_item_id
- case_id
- service_item_type
- title
- item_status
- notes optional
- created_at
- updated_at

### CaseCommunicationLink
Reference linking a case to ConnectShyft conversation/thread/communication context.

Important fields:
- case_communication_link_id
- case_id
- communication_id optional
- conversation_id optional
- linked_at
- linked_by

### CaseTimelineEvent
Optional projection or composed timeline concept.

Can include:
- case created
- note added
- task created
- task completed
- communication linked
- communication replied
- service item updated
- assignment changed

## Important states

### case_status
- open
- active
- pending_follow_up
- on_hold
- closed

### task_status
- open
- in_progress
- completed
- canceled

### item_status
- planned
- in_progress
- completed
- canceled

## API / event touchpoints

Potential events:
- case_created
- case_assigned
- case_note_added
- case_task_created
- case_task_completed
- case_service_item_added
- communication_linked_to_case
- case_closed