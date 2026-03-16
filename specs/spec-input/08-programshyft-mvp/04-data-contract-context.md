# Data Contract Context

## Domain objects involved

### Program
Core record describing a structured initiative.

Important fields:
- program_id
- tenant_id
- program_name
- program_summary
- program_type
- program_status
- enrollment_model
- active
- created_at
- updated_at

### ProgramSession
Scheduled instance or session within a program.

Important fields:
- program_session_id
- program_id
- session_name optional
- starts_at
- ends_at optional
- location_reference optional
- session_status
- created_at

### ProgramCohort
Cohort record where applicable.

Important fields:
- program_cohort_id
- program_id
- cohort_name
- starts_at optional
- ends_at optional
- cohort_status
- created_at

### ProgramParticipant
Participant linkage to a program.

Important fields:
- program_participant_id
- program_id
- person_id optional
- household_id optional
- enrollment_status
- enrolled_at optional
- exited_at optional
- created_at

### ProgramAttendance
Attendance tracking for session-based participation.

Important fields:
- program_attendance_id
- program_session_id
- program_participant_id
- attendance_status
- recorded_at
- recorded_by

### ProgramMilestone
Milestone or progress marker configuration or instance.

Important fields:
- program_milestone_id
- program_id
- program_participant_id optional
- milestone_type
- milestone_status
- completed_at optional
- notes optional

### ProgramCommunicationLink
Reference linking a program to ConnectShyft communication context.

Important fields:
- program_communication_link_id
- program_id
- communication_id optional
- conversation_id optional
- linked_at
- linked_by

### ProgramRequirementProfile
Visible requirement summary for enrollment support.

Important fields:
- program_requirement_profile_id
- program_id
- eligibility_policy_id optional
- required_evidence_profile_id optional
- notes optional
- active

## Important states

### program_status
- draft
- active
- paused
- completed
- archived

### enrollment_status
- pending
- enrolled
- waitlisted
- declined
- exited
- completed

### session_status
- scheduled
- active
- completed
- canceled

### cohort_status
- planned
- active
- completed
- archived

### attendance_status
- present
- absent
- excused
- unknown

### milestone_status
- not_started
- in_progress
- completed
- waived

## API / event touchpoints

Potential events:
- program_created
- program_updated
- participant_enrolled
- participant_waitlisted
- participant_exited
- session_created
- attendance_recorded
- milestone_completed
- communication_linked_to_program