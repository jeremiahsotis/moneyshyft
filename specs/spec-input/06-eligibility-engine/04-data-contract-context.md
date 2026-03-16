# Data Contract Context

## Domain objects involved

### ScreeningSubject
Flexible abstraction for what is being screened.

Important fields:
- screening_subject_id
- subject_type
- subject_id
- tenant_id
- created_at

Examples:
- person
- household
- case
- program_participation
- volunteer_profile optional future

### EligibilityPolicy
Screening policy definition.

Important fields:
- eligibility_policy_id
- tenant_id optional
- policy_code
- policy_name
- policy_scope
- active
- override_allowed
- created_at
- updated_at

### PolicyRequirement
A required rule or requirement inside a policy.

Important fields:
- policy_requirement_id
- eligibility_policy_id
- evidence_type_id or requirement_code
- operator
- expected_value
- requirement_type
- active

### ScreeningRequest
A request to evaluate a subject against a policy.

Important fields:
- screening_request_id
- tenant_id
- screening_subject_id
- eligibility_policy_id
- initiated_by
- requested_at
- screening_status

### ScreeningResult
Stored outcome of a screening run.

Important fields:
- screening_result_id
- screening_request_id
- result_status
- explanation_summary
- valid_until optional
- reviewed_by optional
- reviewed_at optional
- created_at

### ScreeningExplanationItem
Structured explanation element.

Important fields:
- screening_explanation_item_id
- screening_result_id
- requirement_reference
- outcome
- message
- missing_evidence_type_id optional
- linked_document_type_id optional

### ScreeningOverride
Authorized override of a screening result.

Important fields:
- screening_override_id
- screening_result_id
- override_outcome
- reason
- overridden_by
- overridden_at

## Important states

### screening_status
- draft
- evaluating
- completed
- failed

### result_status
- eligible
- ineligible
- potentially_eligible
- missing_information
- requires_manual_review
- overridden

### explanation outcome
- passed
- failed
- missing
- stale
- needs_confirmation
- manual_review

## API / event touchpoints

Potential events:
- screening_requested
- screening_completed
- screening_failed
- screening_overridden
- screening_result_consumed